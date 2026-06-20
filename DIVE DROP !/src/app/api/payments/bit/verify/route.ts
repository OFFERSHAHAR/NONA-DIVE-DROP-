/**
 * Verify a Bit payment and update booking status
 * POST /api/payments/bit/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getBitApiClient, BitApiError } from '@/lib/payments/bit.api';
import { calculateCommission } from '@/lib/payments/bit.config';

export const runtime = 'nodejs';

const verifySchema = z.object({
  request_id: z.string().min(1),
  booking_id: z.string().uuid(),
});

type VerifyBody = z.infer<typeof verifySchema>;

export async function POST(request: NextRequest) {
  try {
    const body: VerifyBody = await request.json();

    const validationResult = verifySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { request_id, booking_id } = validationResult.data;

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
        'id, diver_id, service_provider_id, amount_cents, status'
      )
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify authorization
    if (booking.diver_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify payment with Bit API
    const bitClient = getBitApiClient();

    const verification = await bitClient.verifyPayment({
      request_id,
    });

    // Check payment status
    if (verification.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          status: verification.status,
          message: `Payment is ${verification.status}. Please try again later.`,
        },
        { status: 200 } // Not an error, just not completed yet
      );
    }

    // Payment is completed! Update booking status
    const { error: updateError } = await supabase
      .from('dive_bookings')
      .update({
        status: 'confirmed',
        payment_method: 'bit',
        bit_transaction_id: verification.transaction_id,
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Failed to update booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('bit_transactions')
      .insert({
        bit_transaction_id: verification.transaction_id,
        booking_id,
        service_provider_id: booking.service_provider_id,
        diver_id: user.id,
        type: 'payment',
        amount_cents: verification.amount_cents,
        status: 'completed',
        payment_method: verification.payment_method,
        payer_identifier: verification.payer_identifier,
        reference_number: verification.reference_number,
        completed_at: verification.paid_at,
      });

    if (transactionError) {
      console.error('Failed to record transaction:', transactionError);
      // Don't fail the response, payment was successful
    }

    // Calculate and record commission
    const { commission, net } = calculateCommission(
      verification.amount_cents
    );

    const { error: commissionError } = await supabase
      .from('bit_commission_records')
      .insert({
        booking_id,
        commission_cents: commission,
        gross_amount_cents: verification.amount_cents,
        commission_rate: 0.08,
        status: 'collected',
        bit_transaction_id: verification.transaction_id,
        collected_at: new Date().toISOString(),
      });

    if (commissionError) {
      console.error('Failed to record commission:', commissionError);
      // Don't fail the response
    }

    // Create payout record for service provider
    const { error: payoutError } = await supabase
      .from('bit_payouts')
      .insert({
        bit_payout_id: `payout_${verification.transaction_id}`,
        service_provider_id: booking.service_provider_id,
        amount_cents: net,
        schedule: 'daily',
        bank_code: '123', // Placeholder - should fetch from bit_accounts
        branch_code: '456',
        account_number_masked: 'xxxx1234',
        status: 'pending',
        expected_completion_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (payoutError) {
      console.error('Failed to create payout record:', payoutError);
      // Don't fail the response
    }

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: booking_id,
          status: 'confirmed',
          amount_cents: verification.amount_cents,
          amount_display: `₪${(verification.amount_cents / 100).toFixed(2)}`,
          transaction_id: verification.transaction_id,
        },
        commission: {
          amount_cents: commission,
          amount_display: `₪${(commission / 100).toFixed(2)}`,
          rate: '8%',
        },
        payout: {
          amount_cents: net,
          amount_display: `₪${(net / 100).toFixed(2)}`,
          schedule: 'daily',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment verification error:', error);

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
