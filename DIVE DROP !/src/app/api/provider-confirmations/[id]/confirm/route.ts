import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { confirmPayment, getRemainingConfirmations } from '@/lib/payment/payment-service';
import { ConfirmPaymentRequestSchema } from '@/lib/payment/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/provider-confirmations/[id]/confirm
 * Confirm payment by provider
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: confirmationId } = params;

    // Get confirmation to verify it belongs to this user's provider
    const { data: confirmation, error: getError } = await supabase
      .from('provider_confirmations')
      .select('*, provider:provider_id(id, user_id)')
      .eq('id', confirmationId)
      .single();

    if (getError || !confirmation) {
      return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 });
    }

    // Verify user is the provider
    if (confirmation.provider.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned provider can confirm payment' },
        { status: 403 }
      );
    }

    // Check if already confirmed
    if (confirmation.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Payment already confirmed' },
        { status: 409 }
      );
    }

    // Confirm payment
    const updated = await confirmPayment(confirmationId, user.id);

    // Get remaining confirmations
    const remaining = await getRemainingConfirmations(confirmation.package_id);

    return NextResponse.json(
      {
        success: true,
        confirmation: updated,
        remaining_confirmations: remaining,
        message: remaining === 0
          ? 'All confirmations received! Customer email will be sent.'
          : `Payment confirmed. Waiting for ${remaining} more confirmation(s).`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/provider-confirmations/[id]/confirm:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
