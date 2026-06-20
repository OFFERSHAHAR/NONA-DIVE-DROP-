/**
 * Create a Bit payment request for a dive booking
 * POST /api/payments/bit/payment-request
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getBitApiClient, BitApiError } from '@/lib/payments/bit.api';
import { createBitPaymentRequestSchema } from '@/lib/payments/bit.schemas';

export const runtime = 'nodejs';

const requestSchema = z.object({
  booking_id: z.string().uuid(),
  amount_cents: z.number().int().min(100),
});

type RequestBody = z.infer<typeof requestSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RequestBody = await request.json();

    // Validate input
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { booking_id, amount_cents } = validationResult.data;

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

    // Verify booking exists and belongs to current user
    const { data: booking, error: bookingError } = await supabase
      .from('dive_bookings')
      .select('id, diver_id, service_provider_id, amount_cents, status')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (booking.diver_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only create payment requests for your own bookings' },
        { status: 403 }
      );
    }

    // Check booking status
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot create payment request for booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    // Verify amount matches booking
    if (booking.amount_cents !== amount_cents) {
      return NextResponse.json(
        { error: 'Amount mismatch: Payment amount does not match booking amount' },
        { status: 400 }
      );
    }

    // Create payment request via Bit API
    const bitClient = getBitApiClient();

    const paymentRequest = await bitClient.createPaymentRequest({
      booking_id,
      amount_cents,
      description: `DIVE DROP - Dive Booking #${booking_id.substring(0, 8)}`,
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiration_seconds: 300, // 5 minutes
    });

    // Store payment request in database
    const { error: insertError } = await supabase
      .from('bit_payment_requests')
      .insert({
        booking_id,
        amount_cents,
        bit_request_id: paymentRequest.request_id,
        payment_link: paymentRequest.payment_link,
        short_url: paymentRequest.short_url,
        qr_code: paymentRequest.qr_code,
        status: paymentRequest.status,
        expires_at: paymentRequest.expires_at,
      });

    if (insertError) {
      console.error('Failed to store payment request:', insertError);
      return NextResponse.json(
        { error: 'Failed to create payment request' },
        { status: 500 }
      );
    }

    // Update booking with payment request reference
    await supabase
      .from('dive_bookings')
      .update({
        bit_payment_request_id: paymentRequest.request_id,
      })
      .eq('id', booking_id);

    return NextResponse.json(
      {
        success: true,
        payment_request: {
          request_id: paymentRequest.request_id,
          payment_link: paymentRequest.payment_link,
          short_url: paymentRequest.short_url,
          qr_code: paymentRequest.qr_code,
          expires_at: paymentRequest.expires_at,
          amount_cents,
          amount_display: `₪${(amount_cents / 100).toFixed(2)}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Payment request creation error:', error);

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
