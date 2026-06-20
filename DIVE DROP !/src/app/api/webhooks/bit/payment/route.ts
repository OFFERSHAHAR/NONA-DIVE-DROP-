/**
 * Bit Webhook Handler
 * Receives payment confirmation webhooks from Bit
 * POST /api/webhooks/bit/payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getBitApiClient } from '@/lib/payments/bit.api';
import { calculateCommission } from '@/lib/payments/bit.config';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get signature from headers
    const signature = request.headers.get('x-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Get raw body for signature validation
    const body = await request.text();

    // Validate webhook signature
    const bitClient = getBitApiClient();
    if (!bitClient.validateWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook data
    let webhookData: any;
    try {
      webhookData = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse webhook body:', e);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Get Supabase client (using service role for webhook processing)
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

    // Log webhook
    const { error: logError } = await supabase
      .from('bit_webhooks_log')
      .insert({
        event_type: webhookData.event || 'unknown',
        event_data: webhookData,
        status: 'received',
        signature_valid: true,
        ip_address: request.ip || request.headers.get('x-forwarded-for'),
      });

    if (logError) {
      console.error('Failed to log webhook:', logError);
    }

    // Handle different event types
    switch (webhookData.event) {
      case 'payment.completed': {
        return await handlePaymentCompleted(supabase, webhookData);
      }

      case 'refund.completed': {
        return await handleRefundCompleted(supabase, webhookData);
      }

      case 'payout.completed': {
        return await handlePayoutCompleted(supabase, webhookData);
      }

      default: {
        console.log(`Unhandled webhook event: ${webhookData.event}`);
        return NextResponse.json(
          { success: true, message: 'Event received but not processed' },
          { status: 200 }
        );
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle payment.completed event
 */
async function handlePaymentCompleted(supabase: any, event: any) {
  try {
    const {
      request_id,
      booking_id,
      transaction_id,
      amount_cents,
      payer_identifier,
      reference_number,
      paid_at,
      payment_method,
    } = event;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('dive_bookings')
      .select('id, diver_id, service_provider_id, status')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', booking_id);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('dive_bookings')
      .update({
        status: 'confirmed',
        payment_method: 'bit',
        bit_transaction_id: transaction_id,
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Failed to update booking:', updateError);
      throw updateError;
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('bit_transactions')
      .insert({
        bit_transaction_id: transaction_id,
        booking_id,
        service_provider_id: booking.service_provider_id,
        diver_id: booking.diver_id,
        type: 'payment',
        amount_cents,
        status: 'completed',
        payment_method,
        payer_identifier,
        reference_number,
        completed_at: paid_at,
      });

    if (transactionError) {
      console.error('Failed to record transaction:', transactionError);
      throw transactionError;
    }

    // Calculate commission
    const { commission, net } = calculateCommission(amount_cents);

    // Record commission
    const { error: commissionError } = await supabase
      .from('bit_commission_records')
      .insert({
        booking_id,
        commission_cents: commission,
        gross_amount_cents: amount_cents,
        commission_rate: 0.08,
        status: 'collected',
        bit_transaction_id: transaction_id,
        collected_at: new Date().toISOString(),
      });

    if (commissionError) {
      console.error('Failed to record commission:', commissionError);
    }

    // Get payout account
    const { data: account } = await supabase
      .from('bit_accounts')
      .select('bank_code, branch_code, account_number')
      .eq('service_provider_id', booking.service_provider_id)
      .eq('is_payout_account', true)
      .single();

    // Create payout record
    const { error: payoutError } = await supabase
      .from('bit_payouts')
      .insert({
        bit_payout_id: `payout_${transaction_id}`,
        service_provider_id: booking.service_provider_id,
        amount_cents: net,
        schedule: 'daily',
        bank_code: account?.bank_code || '123',
        branch_code: account?.branch_code || '456',
        account_number_masked: account
          ? account.account_number.slice(-4).padStart(account.account_number.length, 'x')
          : 'xxxx1234',
        status: 'pending',
        expected_completion_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      });

    if (payoutError) {
      console.error('Failed to create payout:', payoutError);
    }

    // Update webhook log as processed
    await supabase
      .from('bit_webhooks_log')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('event_data->>request_id', request_id);

    return NextResponse.json(
      { success: true, message: 'Payment processed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling payment.completed:', error);

    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

/**
 * Handle refund.completed event
 */
async function handleRefundCompleted(supabase: any, event: any) {
  try {
    const { refund_id, transaction_id, amount_cents, completed_at } = event;

    // Update refund status
    const { error: updateError } = await supabase
      .from('bit_refunds')
      .update({
        status: 'completed',
        completed_at,
      })
      .eq('bit_refund_id', refund_id);

    if (updateError) {
      console.error('Failed to update refund:', updateError);
      throw updateError;
    }

    // Record transaction
    const { data: originalTransaction } = await supabase
      .from('bit_transactions')
      .select('booking_id, diver_id, service_provider_id')
      .eq('bit_transaction_id', transaction_id)
      .single();

    if (originalTransaction) {
      await supabase.from('bit_transactions').insert({
        bit_transaction_id: `refund_${refund_id}`,
        booking_id: originalTransaction.booking_id,
        service_provider_id: originalTransaction.service_provider_id,
        diver_id: originalTransaction.diver_id,
        type: 'refund',
        amount_cents: -amount_cents, // Negative to indicate refund
        status: 'completed',
        completed_at,
      });
    }

    return NextResponse.json(
      { success: true, message: 'Refund processed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling refund.completed:', error);

    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

/**
 * Handle payout.completed event
 */
async function handlePayoutCompleted(supabase: any, event: any) {
  try {
    const { payout_id, amount_cents, completed_at } = event;

    // Update payout status
    const { error: updateError } = await supabase
      .from('bit_payouts')
      .update({
        status: 'completed',
        completed_at,
      })
      .eq('bit_payout_id', payout_id);

    if (updateError) {
      console.error('Failed to update payout:', updateError);
      throw updateError;
    }

    return NextResponse.json(
      { success: true, message: 'Payout processed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling payout.completed:', error);

    return NextResponse.json(
      { error: 'Failed to process payout' },
      { status: 500 }
    );
  }
}
