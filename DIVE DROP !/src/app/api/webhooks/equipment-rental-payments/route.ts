/**
 * Webhook Handler for Equipment Rental Commission Payments
 * Receives Bit payment confirmations and updates commission status
 * POST /api/webhooks/equipment-rental-payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Webhook signature validation
function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.BIT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('BIT_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Get signature from headers
    const signature = request.headers.get('x-bit-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Get raw body for signature validation
    const rawBody = await request.text();

    // Validate signature
    try {
      if (!validateWebhookSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Signature validation failed' },
        { status: 401 }
      );
    }

    // Parse payload
    const payload = JSON.parse(rawBody);

    // Log webhook receipt
    console.log('Equipment rental payment webhook received:', {
      type: payload.type,
      request_id: payload.request_id,
      timestamp: new Date().toISOString(),
    });

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

    // Handle different webhook events
    switch (payload.type) {
      case 'payment.completed':
        return await handlePaymentCompleted(payload, supabase);

      case 'payment.failed':
        return await handlePaymentFailed(payload, supabase);

      case 'payment.expired':
        return await handlePaymentExpired(payload, supabase);

      case 'payment.cancelled':
        return await handlePaymentCancelled(payload, supabase);

      default:
        console.warn(`Unknown webhook type: ${payload.type}`);
        return NextResponse.json(
          { success: true, message: 'Webhook received but not processed' },
          { status: 200 }
        );
    }
  } catch (error) {
    console.error('Webhook processing error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Webhook processing failed', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentCompleted(
  payload: any,
  supabase: ReturnType<typeof createServerClient>
) {
  try {
    const { request_id, transaction_id, amount, timestamp } = payload;

    // Find payment request
    const { data: paymentRequest, error: findError } = await supabase
      .from('rental_commission_payment_requests')
      .select('id, invoice_id, lister_id, amount_cents')
      .eq('bit_request_id', request_id)
      .single();

    if (findError || !paymentRequest) {
      console.error('Payment request not found:', request_id);
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Verify amount matches
    if (paymentRequest.amount_cents !== amount) {
      console.error('Amount mismatch:', {
        expected: paymentRequest.amount_cents,
        received: amount,
      });
      return NextResponse.json(
        { error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Update payment request
    const { error: updatePaymentError } = await supabase
      .from('rental_commission_payment_requests')
      .update({
        status: 'completed',
        transaction_id,
        paid_at: new Date(timestamp).toISOString(),
      })
      .eq('id', paymentRequest.id);

    if (updatePaymentError) {
      throw updatePaymentError;
    }

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('rental_invoices')
      .select('id, total_commission_cents')
      .eq('id', paymentRequest.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Update invoice
    const { error: updateInvoiceError } = await supabase
      .from('rental_invoices')
      .update({
        status: 'paid',
        payment_received_at: new Date(timestamp).toISOString(),
        payment_amount_cents: invoice.total_commission_cents,
      })
      .eq('id', paymentRequest.invoice_id);

    if (updateInvoiceError) {
      throw updateInvoiceError;
    }

    // Update all commissions in this invoice to paid
    const { error: updateCommissionsError } = await supabase
      .from('rental_commissions')
      .update({
        status: 'paid',
        payment_received_at: new Date(timestamp).toISOString(),
      })
      .eq('invoice_id', paymentRequest.invoice_id);

    if (updateCommissionsError) {
      throw updateCommissionsError;
    }

    // Update lister account balance
    const { error: updateBalanceError } = await supabase
      .from('lister_account_balance')
      .update({
        balance_owed_cents: supabase.rpc('update_balance_on_payment', {
          lister_id: paymentRequest.lister_id,
          payment_amount: invoice.total_commission_cents,
        }),
        paid_to_date_cents: supabase.rpc('update_balance_on_payment', {
          lister_id: paymentRequest.lister_id,
          payment_amount: invoice.total_commission_cents,
        }),
        last_payment_at: new Date(timestamp).toISOString(),
        last_payment_amount_cents: invoice.total_commission_cents,
      })
      .eq('lister_id', paymentRequest.lister_id);

    // Alternative: Manual update (if RPC not available)
    await supabase
      .from('lister_account_balance')
      .update({
        last_payment_at: new Date(timestamp).toISOString(),
        last_payment_amount_cents: invoice.total_commission_cents,
      })
      .eq('lister_id', paymentRequest.lister_id);

    // Manually subtract from balance
    const { data: currentBalance } = await supabase
      .from('lister_account_balance')
      .select('balance_owed_cents, unpaid_commissions_cents')
      .eq('lister_id', paymentRequest.lister_id)
      .single();

    if (currentBalance) {
      await supabase
        .from('lister_account_balance')
        .update({
          balance_owed_cents: Math.max(
            0,
            currentBalance.balance_owed_cents - invoice.total_commission_cents
          ),
          unpaid_commissions_cents: Math.max(
            0,
            currentBalance.unpaid_commissions_cents - invoice.total_commission_cents
          ),
        })
        .eq('lister_id', paymentRequest.lister_id);
    }

    console.log('Payment completed:', {
      request_id,
      transaction_id,
      invoice_id: paymentRequest.invoice_id,
      lister_id: paymentRequest.lister_id,
      amount,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment processed successfully',
        data: {
          request_id,
          transaction_id,
          invoice_id: paymentRequest.invoice_id,
          status: 'completed',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment completion processing error:', error);
    throw error;
  }
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(
  payload: any,
  supabase: ReturnType<typeof createServerClient>
) {
  try {
    const { request_id, reason, timestamp } = payload;

    // Update payment request
    await supabase
      .from('rental_commission_payment_requests')
      .update({
        status: 'failed',
      })
      .eq('bit_request_id', request_id);

    console.log('Payment failed:', {
      request_id,
      reason,
      timestamp,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment failure recorded',
        data: {
          request_id,
          reason,
          status: 'failed',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment failure processing error:', error);
    throw error;
  }
}

/**
 * Handle payment expiration
 */
async function handlePaymentExpired(
  payload: any,
  supabase: ReturnType<typeof createServerClient>
) {
  try {
    const { request_id } = payload;

    // Update payment request
    await supabase
      .from('rental_commission_payment_requests')
      .update({
        status: 'expired',
      })
      .eq('bit_request_id', request_id);

    console.log('Payment expired:', { request_id });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment expiration recorded',
        data: {
          request_id,
          status: 'expired',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment expiration processing error:', error);
    throw error;
  }
}

/**
 * Handle payment cancellation
 */
async function handlePaymentCancelled(
  payload: any,
  supabase: ReturnType<typeof createServerClient>
) {
  try {
    const { request_id } = payload;

    // Update payment request
    await supabase
      .from('rental_commission_payment_requests')
      .update({
        status: 'cancelled',
      })
      .eq('bit_request_id', request_id);

    console.log('Payment cancelled:', { request_id });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment cancellation recorded',
        data: {
          request_id,
          status: 'cancelled',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment cancellation processing error:', error);
    throw error;
  }
}
