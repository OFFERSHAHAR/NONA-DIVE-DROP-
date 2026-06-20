import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job to check for expiring insurance and disable instructors if needed
 * Configure in vercel.json or use external cron service
 *
 * Example cron service curl:
 * curl -X POST https://yourdomain.com/api/cron/check-insurance-expiry \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const results = {
      expired_disabled: 0,
      alerts_sent: 0,
      errors: 0,
    };

    // 1. Check for expired insurance and disable instructors
    const { data: expiredInsurance, error: expiredError } = await supabase
      .from('instructor_insurance')
      .select('id, provider_id, expiry_date')
      .eq('verification_status', 'approved')
      .eq('is_active', true)
      .lte('expiry_date', now.toISOString());

    if (expiredError) {
      console.error('Error fetching expired insurance:', expiredError);
      results.errors++;
    } else {
      // Disable each expired instructor
      for (const insurance of expiredInsurance || []) {
        try {
          // Mark insurance as inactive
          await supabase
            .from('instructor_insurance')
            .update({ is_active: false })
            .eq('id', insurance.id);

          // Disable instructor
          await supabase
            .from('service_providers')
            .update({ status: 'suspended' })
            .eq('id', insurance.provider_id);

          // Log action
          await supabase
            .from('instructor_verification_logs')
            .insert({
              provider_id: insurance.provider_id,
              insurance_id: insurance.id,
              action_type: 'insurance_expired',
              notes: 'Insurance expired. Instructor automatically suspended.',
            });

          results.expired_disabled++;
        } catch (error) {
          console.error('Error disabling instructor:', error);
          results.errors++;
        }
      }
    }

    // 2. Send alerts for insurance expiring in next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringInsurance, error: expiringError } = await supabase
      .from('instructor_insurance')
      .select('id, provider_id, expiry_date')
      .eq('verification_status', 'approved')
      .eq('is_active', true)
      .eq('expiry_alert_sent', false)
      .gt('expiry_date', now.toISOString())
      .lte('expiry_date', thirtyDaysFromNow.toISOString());

    if (expiringError) {
      console.error('Error fetching expiring insurance:', expiringError);
      results.errors++;
    } else {
      // Mark alerts as sent
      for (const insurance of expiringInsurance || []) {
        try {
          await supabase
            .from('instructor_insurance')
            .update({
              expiry_alert_sent: true,
              expiry_alert_sent_at: now.toISOString(),
            })
            .eq('id', insurance.id);

          results.alerts_sent++;
        } catch (error) {
          console.error('Error marking alert as sent:', error);
          results.errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
      message: `Processed ${results.expired_disabled} expired instructors, sent ${results.alerts_sent} alerts`,
    });
  } catch (error) {
    console.error('Error in insurance expiry cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
