import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VerificationActionBody {
  action: 'approve' | 'reject';
  verification_type: 'certification' | 'insurance';
  certification_id?: string;
  insurance_id?: string;
  notes?: string;
}

// Verify admin status
async function verifyAdmin(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const isAdmin = (user as any).user_metadata?.role === 'admin';
  return isAdmin ? user : null;
}

// Pending verifications list
export async function GET(request: NextRequest) {
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

    const type = request.nextUrl.searchParams.get('type'); // 'certification', 'insurance', or 'all'

    // Get pending certifications
    const certQuery = supabase
      .from('instructor_certifications')
      .select(`
        id,
        provider_id,
        certification_type,
        certification_number,
        issuing_organization,
        expiry_date,
        document_url,
        created_at,
        service_providers!inner(id, business_name)
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });

    // Get pending insurance
    const insQuery = supabase
      .from('instructor_insurance')
      .select(`
        id,
        provider_id,
        insurance_provider,
        policy_number,
        coverage_type,
        expiry_date,
        document_url,
        created_at,
        service_providers!inner(id, business_name)
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });

    const [{ data: certs }, { data: insurance }] = await Promise.all([
      certQuery,
      insQuery,
    ]);

    let pending = {};

    if (type === 'certification' || type === 'all') {
      pending = { ...pending, certifications: certs || [] };
    }

    if (type === 'insurance' || type === 'all') {
      pending = { ...pending, insurance: insurance || [] };
    }

    return NextResponse.json({
      total_pending: (certs?.length || 0) + (insurance?.length || 0),
      pending,
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Approve or reject verification
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

    const body: VerificationActionBody = await request.json();

    if (!body.action || !body.verification_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (body.verification_type === 'certification' && !body.certification_id) {
      return NextResponse.json(
        { error: 'certification_id is required for certification verification' },
        { status: 400 }
      );
    }

    if (body.verification_type === 'insurance' && !body.insurance_id) {
      return NextResponse.json(
        { error: 'insurance_id is required for insurance verification' },
        { status: 400 }
      );
    }

    let result;
    let provider_id: string;

    if (body.verification_type === 'certification') {
      // Get certification details
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

      const status = body.action === 'approve' ? 'approved' : 'rejected';

      // Update certification
      const { data, error } = await supabase
        .from('instructor_certifications')
        .update({
          verification_status: status,
          verified_by_admin_id: admin.id,
          verified_at: new Date().toISOString(),
          rejection_reason: body.action === 'reject' ? body.notes : null,
        })
        .eq('id', body.certification_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      result = data;

      // Log action
      await supabase
        .from('instructor_verification_logs')
        .insert({
          provider_id,
          certification_id: body.certification_id,
          action_type: body.action === 'approve' ? 'certification_approved' : 'certification_rejected',
          admin_user_id: admin.id,
          notes: body.notes,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });
    } else {
      // Get insurance details
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

      const status = body.action === 'approve' ? 'approved' : 'rejected';

      // Update insurance
      const { data, error } = await supabase
        .from('instructor_insurance')
        .update({
          verification_status: status,
          verified_by_admin_id: admin.id,
          verified_at: new Date().toISOString(),
          rejection_reason: body.action === 'reject' ? body.notes : null,
        })
        .eq('id', body.insurance_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      result = data;

      // Log action
      await supabase
        .from('instructor_verification_logs')
        .insert({
          provider_id,
          insurance_id: body.insurance_id,
          action_type: body.action === 'approve' ? 'insurance_approved' : 'insurance_rejected',
          admin_user_id: admin.id,
          notes: body.notes,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });
    }

    return NextResponse.json({
      success: true,
      message: `${body.verification_type} ${body.action}ed successfully`,
      result,
    });
  } catch (error) {
    console.error('Error processing verification action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
