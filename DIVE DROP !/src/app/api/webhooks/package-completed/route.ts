import { NextRequest, NextResponse } from 'next/server';
import { getPackageDetails } from '@/lib/payment/payment-service';
import { sendPackageConfirmationEmail } from '@/lib/payment/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/package-completed
 * Webhook triggered when all providers confirm payment
 * Sends confirmation email to customer
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (optional but recommended)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const signature = request.headers.get('x-webhook-signature');

    if (webhookSecret && (!signature || signature !== webhookSecret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const body = await request.json();
    const { package_id } = body;

    if (!package_id) {
      return NextResponse.json({ error: 'Missing package_id' }, { status: 400 });
    }

    // Get package details
    const packageDetail = await getPackageDetails(package_id);

    // Verify package is completed
    if (packageDetail.status !== 'completed') {
      return NextResponse.json(
        { error: 'Package is not in completed status' },
        { status: 400 }
      );
    }

    // Send email
    const emailResult = await sendPackageConfirmationEmail(packageDetail);

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: emailResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message_id: emailResult.message_id,
        message: `Email sent to ${packageDetail.customer?.email}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in webhook /api/webhooks/package-completed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
