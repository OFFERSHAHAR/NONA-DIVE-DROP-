import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Check for insurance expiring in next 30 days and send alerts
 * This can be called as a cron job
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isAdmin = (user as any).user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get insurance records expiring in next 30 days that haven't been alerted
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringInsurance, error: queryError } = await supabase
      .from('instructor_insurance')
      .select(`
        id,
        provider_id,
        insurance_provider,
        policy_number,
        expiry_date,
        service_providers!inner(id, business_name, email)
      `)
      .eq('verification_status', 'approved')
      .eq('is_active', true)
      .eq('expiry_alert_sent', false)
      .gte('expiry_date', new Date().toISOString())
      .lte('expiry_date', thirtyDaysFromNow.toISOString());

    if (queryError) {
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 }
      );
    }

    const alerts = [];
    const failedAlerts = [];

    // Process each expiring insurance
    for (const insurance of expiringInsurance || []) {
      try {
        const daysUntilExpiry = Math.ceil(
          (new Date(insurance.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        // Send email notification (integrate with your email service)
        // For now, just log the alert
        console.log(`Alert: Insurance expiring in ${daysUntilExpiry} days`, {
          provider: (insurance.service_providers as any).business_name,
          email: (insurance.service_providers as any).email,
          policy: insurance.policy_number,
          expiry_date: insurance.expiry_date,
        });

        // Mark alert as sent
        const { error: updateError } = await supabase
          .from('instructor_insurance')
          .update({
            expiry_alert_sent: true,
            expiry_alert_sent_at: new Date().toISOString(),
          })
          .eq('id', insurance.id);

        if (updateError) {
          failedAlerts.push({
            insurance_id: insurance.id,
            error: updateError.message,
          });
        } else {
          // Log the alert action
          await supabase
            .from('instructor_verification_logs')
            .insert({
              provider_id: insurance.provider_id,
              insurance_id: insurance.id,
              action_type: 'insurance_expired',
              admin_user_id: user.id,
              notes: `Expiry alert sent. Insurance expires in ${daysUntilExpiry} days`,
              ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            });

          alerts.push({
            insurance_id: insurance.id,
            provider_id: insurance.provider_id,
            days_until_expiry: daysUntilExpiry,
          });
        }
      } catch (error) {
        console.error('Error processing alert:', error);
        failedAlerts.push({
          insurance_id: insurance.id,
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      alerts_sent: alerts.length,
      alerts,
      failed_alerts: failedAlerts,
    });
  } catch (error) {
    console.error('Error sending expiry alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check expiring insurance without marking as alerted
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isAdmin = (user as any).user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all expiring insurance
    const { data: expiringInsurance, error: queryError } = await supabase
      .from('instructor_insurance')
      .select(`
        id,
        provider_id,
        insurance_provider,
        policy_number,
        coverage_type,
        expiry_date,
        service_providers!inner(id, business_name, email)
      `)
      .eq('verification_status', 'approved')
      .eq('is_active', true)
      .gte('expiry_date', new Date().toISOString())
      .lte('expiry_date', thirtyDaysFromNow.toISOString())
      .order('expiry_date', { ascending: true });

    if (queryError) {
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 }
      );
    }

    const items = (expiringInsurance || []).map((ins) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(ins.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: ins.id,
        provider_id: ins.provider_id,
        provider_name: (ins.service_providers as any).business_name,
        email: (ins.service_providers as any).email,
        insurance_provider: ins.insurance_provider,
        policy_number: ins.policy_number,
        expiry_date: ins.expiry_date,
        days_until_expiry: daysUntilExpiry,
      };
    });

    return NextResponse.json({
      total: items.length,
      expiring_soon: items,
    });
  } catch (error) {
    console.error('Error fetching expiring insurance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
