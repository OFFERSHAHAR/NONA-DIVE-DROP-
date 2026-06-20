/**
 * Request a refund for a payment
 * POST /api/payments/bit/refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getBitApiClient, BitApiError } from '@/lib/payments/bit.api';

export const runtime = 'nodejs';

const refundSchema = z.object({
  booking_id: z.string().uuid(),
  reason: z.enum([
    'requested_by_customer',
    'duplicate',
    'fraudulent',
    'no_show',
    'not_as_described',
    'other',
  ]),
  notes: z.string().max(500).optional(),
  amount_cents: z.number().int().positive().optional(),
});

type RefundBody = z.infer<typeof refundSchema>;

export async function POST(request: NextRequest) {
  try {
    const body: RefundBody = await request.json();

    const validationResult = refundSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { booking_id, reason, notes, amount_cents } = validationResult.data;

    // Get Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('dive_bookings')
      .select(
        'id, diver_id, service_provider_id, amount_cents, status, bit_transaction_id'
      )
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify authorization (must be diver or service provider)
    if (booking.diver_id !== user.id && booking.service_provider_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You cannot request a refund for this booking' },
        { status: 403 }
      );
    }

    // Check booking status
    if (!['confirmed', 'completed'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot refund booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    // Check if booking is within refund window (24 hours)
    const { data: paymentRequest } = await supabase
      .from('bit_payment_requests')
      .select('paid_at')
      .eq('booking_id', booking_id)
      .single();

    if (paymentRequest?.paid_at) {
      const hoursSincePaid =
        (Date.now() - new Date(paymentRequest.paid_at).getTime()) /
        (1000 * 60 * 60);

      if (hoursSincePaid > 24) {
        return NextResponse.json(
          { error: 'Refund window has expired (24 hours)' },
          { status: 400 }
        );
      }
    }

    // Get original transaction
    const { data: originalTransaction } = await supabase
      .from('bit_transactions')
      .select('id, bit_transaction_id, amount_cents')
      .eq('booking_id', booking_id)
      .eq('type', 'payment')
      .single();

    if (!originalTransaction) {
      return NextResponse.json(
        { error: 'No payment transaction found for this booking' },
        { status: 404 }
      );
    }

    const refundAmount = amount_cents || booking.amount_cents;

    // Check refund amount is valid
    if (refundAmount > booking.amount_cents) {
      return NextResponse.json(
        { error: 'Refund amount exceeds booking amount' },
        { status: 400 }
      );
    }

    // Create refund via Bit API
    const bitClient = getBitApiClient();

    const refund = await bitClient.createRefund({
      transaction_id: originalTransaction.bit_transaction_id,
      booking_id,
      amount_cents: refundAmount,
      reason,
      notes,
    });

    // Store refund in database
    const { error: insertError } = await supabase
      .from('bit_refunds')
      .insert({
        bit_refund_id: refund.refund_id,
        bit_transaction_id: originalTransaction.bit_transaction_id,
        booking_id,
        amount_cents: refundAmount,
        reason,
        status: refund.status,
      });

    if (insertError) {
      console.error('Failed to store refund:', insertError);
      return NextResponse.json(
        { error: 'Failed to record refund' },
        { status: 500 }
      );
    }

    // Record refund transaction
    const { error: transactionError } = await supabase
      .from('bit_transactions')
      .insert({
        bit_transaction_id: `refund_${refund.refund_id}`,
        booking_id,
        service_provider_id: booking.service_provider_id,
        diver_id: booking.diver_id,
        type: 'refund',
        amount_cents: -refundAmount, // Negative to indicate refund
        status: refund.status === 'completed' ? 'completed' : 'pending',
        reference_number: refund.refund_id,
        completed_at: refund.completed_at,
        notes: `Refund: ${reason}`,
      });

    if (transactionError) {
      console.error('Failed to record refund transaction:', transactionError);
    }

    return NextResponse.json(
      {
        success: true,
        refund: {
          refund_id: refund.refund_id,
          amount_cents: refundAmount,
          amount_display: `₪${(refundAmount / 100).toFixed(2)}`,
          status: refund.status,
          reason,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Refund request error:', error);

    if (error instanceof BitApiError) {
      return NextResponse.json(
        {
          error: 'Bit API error',
          message: error.message,
          code: error.code,
        },
        { status: error.statusCode || 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
