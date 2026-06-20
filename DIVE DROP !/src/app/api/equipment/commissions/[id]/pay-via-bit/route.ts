/**
 * Create Bit payment request for commission payment
 * POST /api/equipment/commissions/[id]/pay-via-bit
 *
 * When lister pays their commission via Bit, this endpoint:
 * 1. Creates a Bit payment request for the invoice amount
 * 2. Generates QR code and payment link
 * 3. Tracks the payment request in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getBitApiClient, BitApiError } from '@/lib/payments/bit.api';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

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

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('rental_invoices')
      .select('id, lister_id, invoice_number, total_commission_cents, status')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Verify lister is requesting payment for their own invoice
    if (invoice.lister_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Invoice does not belong to you' },
        { status: 403 }
      );
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    // Check if payment request already exists and is still valid
    const { data: existingPaymentRequest } = await supabase
      .from('rental_commission_payment_requests')
      .select('id, status, expires_at, payment_link')
      .eq('invoice_id', invoiceId)
      .eq('status', 'pending')
      .single();

    if (existingPaymentRequest) {
      // If not expired, return existing link
      if (new Date(existingPaymentRequest.expires_at) > new Date()) {
        return NextResponse.json(
          {
            success: true,
            payment_request: {
              id: existingPaymentRequest.id,
              payment_link: existingPaymentRequest.payment_link,
              status: 'pending',
              message: 'Payment link already generated and still valid',
            },
          },
          { status: 200 }
        );
      }
    }

    // Create payment request via Bit API
    const bitClient = getBitApiClient();

    const paymentRequest = await bitClient.createPaymentRequest({
      invoice_id: invoiceId,
      amount_cents: invoice.total_commission_cents,
      description: `DIVE DROP - Commission Invoice #${invoice.invoice_number}`,
      request_id: `inv_${invoiceId.substring(0, 8)}_${Date.now()}`,
      expiration_seconds: 86400, // 24 hours
    });

    // Store payment request in database
    const { data: storedPaymentRequest, error: storeError } = await supabase
      .from('rental_commission_payment_requests')
      .insert({
        invoice_id: invoiceId,
        lister_id: user.id,
        amount_cents: invoice.total_commission_cents,
        bit_request_id: paymentRequest.request_id,
        payment_link: paymentRequest.payment_link,
        short_url: paymentRequest.short_url,
        qr_code: paymentRequest.qr_code,
        status: 'pending',
        expires_at: paymentRequest.expires_at,
      })
      .select()
      .single();

    if (storeError || !storedPaymentRequest) {
      console.error('Failed to store payment request:', storeError);
      return NextResponse.json(
        { error: 'Failed to create payment request' },
        { status: 500 }
      );
    }

    // Update invoice status to "sent"
    await supabase
      .from('rental_invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    return NextResponse.json(
      {
        success: true,
        payment_request: {
          id: storedPaymentRequest.id,
          invoice_number: invoice.invoice_number,
          amount: {
            cents: invoice.total_commission_cents,
            display: `₪${(invoice.total_commission_cents / 100).toFixed(2)}`,
          },
          payment_link: paymentRequest.payment_link,
          short_url: paymentRequest.short_url,
          qr_code: paymentRequest.qr_code,
          status: 'pending',
          expires_at: paymentRequest.expires_at,
          instructions: {
            text: 'Scan the QR code with your phone and pay via Bit',
            web: 'Or use the payment link to pay online',
          },
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
