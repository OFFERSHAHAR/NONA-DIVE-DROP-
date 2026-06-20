import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RevokeBody {
  verification_type: 'certification' | 'insurance';
  certification_id?: string;
  insurance_id?: string;
  reason: string;
}

async function verifyAdmin(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const isAdmin = (user as any).user_metadata?.role === 'admin';
  return isAdmin ? user : null;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdmin(token);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: RevokeBody = await request.json();

    if (!body.reason || !body.verification_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let provider_id: string;

    if (body.verification_type === 'certification') {
      if (!body.certification_id) {
        return NextResponse.json(
          { error: 'certification_id is required' },
          { status: 400 }
        );
      }

      const { data: cert, error: certError } = await supabase
        .from('instructor_certifications')
        .select('provider_id')
        .eq('id', body.certification_id)
        .single();

      if (certError || !cert) {
        return NextResponse.json(
          { error: 'Certification not found' },
          { status: 404 }
        );
      }

      provider_id = cert.provider_id;

      // Revoke certification
      await supabase
        .from('instructor_certifications')
        .update({
          verification_status: 'revoked',
          verified_by_admin_id: admin.id,
          verified_at: new Date().toISOString(),
          rejection_reason: body.reason,
        })
        .eq('id', body.certification_id);

      // Log action
      await supabase
        .from('instructor_verification_logs')
        .insert({
          provider_id,
          certification_id: body.certification_id,
          action_type: 'certification_revoked',
          admin_user_id: admin.id,
          notes: body.reason,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });
    } else {
      if (!body.insurance_id) {
        return NextResponse.json(
          { error: 'insurance_id is required' },
          { status: 400 }
        );
      }

      const { data: insurance, error: insError } = await supabase
        .from('instructor_insurance')
        .select('provider_id')
        .eq('id', body.insurance_id)
        .single();

      if (insError || !insurance) {
        return NextResponse.json(
          { error: 'Insurance record not found' },
          { status: 404 }
        );
      }

      provider_id = insurance.provider_id;

      // Revoke insurance
      await supabase
        .from('instructor_insurance')
        .update({
          verification_status: 'revoked',
          is_active: false,
          verified_by_admin_id: admin.id,
          verified_at: new Date().toISOString(),
          rejection_reason: body.reason,
        })
        .eq('id', body.insurance_id);

      // Disable instructor if insurance revoked
      await supabase
        .from('service_providers')
        .update({ status: 'suspended' })
        .eq('id', provider_id);

      // Log action
      await supabase
        .from('instructor_verification_logs')
        .insert({
          provider_id,
          insurance_id: body.insurance_id,
          action_type: 'insurance_revoked',
          admin_user_id: admin.id,
          notes: body.reason,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });
    }

    return NextResponse.json({
      success: true,
      message: `${body.verification_type} revoked successfully. Instructor may be disabled.`,
    });
  } catch (error) {
    console.error('Error revoking verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
