/**
 * POST /api/equipment/rentals/payment - Create Bit payment for equipment rental
 * GET /api/equipment/rentals/payment?request_id=... - Verify payment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/actions';
import { getBitApiClient } from '@/lib/payments/bit.api';
import { getEquipmentRental, activateEquipmentRental } from '@/lib/equipment/equipment-client';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuth();
    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rental_id } = body;

    if (!rental_id) {
      return NextResponse.json(
        { success: false, error: 'rental_id is required' },
        { status: 400 }
      );
    }

    // Get rental
    const rental = await getEquipmentRental(rental_id);
    if (!rental) {
      return NextResponse.json(
        { success: false, error: 'Rental not found' },
        { status: 404 }
      );
    }

    // Verify user is the renter
    if (rental.renter_id !== auth.user.id) {
      return NextResponse.json(
        { success: false, error: 'You are not the renter of this rental' },
        { status: 403 }
      );
    }

    // Check rental is approved
    if (rental.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: 'Rental must be approved before payment',
        },
        { status: 400 }
      );
    }

    // Create Bit payment request
    const bitClient = getBitApiClient();

    const paymentRequest = await bitClient.createPaymentRequest({
      booking_id: rental_id,
      amount_cents: rental.renter_total,
      description: `Equipment Rental - ${rental_id.substring(0, 8)}`,
      expiration_seconds: 900, // 15 minutes
      preferred_method: 'bit',
    });

    // Store payment request ID in rental
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    await supabase
      .from('equipment_rentals')
      .update({
        payment_request_id: paymentRequest.request_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rental_id);

    return NextResponse.json({
      success: true,
      data: {
        rental_id,
        payment_request_id: paymentRequest.request_id,
        amount_cents: rental.renter_total,
        payment_link: paymentRequest.payment_link,
        short_url: paymentRequest.short_url,
        qr_code: paymentRequest.qr_code,
        expires_at: paymentRequest.expires_at,
      },
      message: 'Payment request created successfully',
    });
  } catch (error) {
    console.error('[Equipment Rental Payment Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create payment request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuth();
    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestId = request.nextUrl.searchParams.get('request_id');
    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'request_id is required' },
        { status: 400 }
      );
    }

    // Get payment status from Bit
    const bitClient = getBitApiClient();

    const status = await bitClient.getPaymentRequestStatus(requestId);

    return NextResponse.json({
      success: true,
      data: {
        request_id: status.request_id,
        status: status.status,
        amount_cents: status.amount_cents,
        transaction_id: status.transaction_id,
        paid_at: status.paid_at,
        created_at: status.created_at,
        expires_at: status.expires_at,
      },
    });
  } catch (error) {
    console.error('[Equipment Payment Verification Error]', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
