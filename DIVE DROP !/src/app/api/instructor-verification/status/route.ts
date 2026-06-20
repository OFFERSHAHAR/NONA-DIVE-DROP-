import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const provider_id = request.nextUrl.searchParams.get('provider_id');

    if (!provider_id) {
      return NextResponse.json(
        { error: 'Missing provider_id' },
        { status: 400 }
      );
    }

    // Check authorization
    const { data: provider } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', provider_id)
      .single();

    const isAdmin = (user as any).user_metadata?.role === 'admin';
    if (!isAdmin && provider?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get verification status from view
    const { data: statusData, error: statusError } = await supabase
      .from('instructor_verification_status')
      .select('*')
      .eq('provider_id', provider_id)
      .single();

    if (statusError || !statusData) {
      return NextResponse.json(
        { error: 'Verification status not found' },
        { status: 404 }
      );
    }

    // Get pending items
    const { data: pendingCerts } = await supabase
      .from('instructor_certifications')
      .select('*')
      .eq('provider_id', provider_id)
      .eq('verification_status', 'pending');

    const { data: pendingInsurance } = await supabase
      .from('instructor_insurance')
      .select('*')
      .eq('provider_id', provider_id)
      .eq('verification_status', 'pending');

    // Get expiring insurance (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringInsurance } = await supabase
      .from('instructor_insurance')
      .select('*')
      .eq('provider_id', provider_id)
      .eq('verification_status', 'approved')
      .eq('is_active', true)
      .gte('expiry_date', new Date().toISOString())
      .lte('expiry_date', thirtyDaysFromNow.toISOString());

    return NextResponse.json({
      verification_status: statusData.verification_status,
      is_verified: statusData.verification_status === 'verified',
      summary: {
        active_certifications: statusData.active_certifications_count || 0,
        pending_certifications: statusData.pending_certifications_count || 0,
        has_valid_insurance: statusData.active_insurance_id !== null,
        insurance_expires_in_days: statusData.days_until_insurance_expiry,
        insurance_expiry_date: statusData.insurance_expiry_date,
      },
      pending: {
        certifications: pendingCerts || [],
        insurance: pendingInsurance || [],
      },
      alerts: {
        expiring_insurance: expiringInsurance || [],
      },
      certifications: statusData.certifications,
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
