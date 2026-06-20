import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface InsuranceUploadBody {
  provider_id: string;
  insurance_provider: string;
  policy_number: string;
  coverage_type?: string;
  coverage_amount_shekel?: number;
  issue_date: string;
  expiry_date: string;
  document_file?: string; // Base64 encoded file
  document_type: 'image' | 'pdf';
}

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

    const body: InsuranceUploadBody = await request.json();

    // Validate required fields
    if (!body.provider_id || !body.insurance_provider || !body.policy_number) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if provider belongs to user
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id, user_id')
      .eq('id', body.provider_id)
      .single();

    if (providerError || !provider || provider.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Provider not found or unauthorized' },
        { status: 403 }
      );
    }

    // Upload document if provided
    let document_url: string | null = null;
    if (body.document_file) {
      const fileName = `insurance/${body.provider_id}/${Date.now()}-${body.policy_number}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('instructor-documents')
        .upload(fileName, Buffer.from(body.document_file, 'base64'), {
          contentType: body.document_type === 'pdf' ? 'application/pdf' : 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      document_url = supabase.storage
        .from('instructor-documents')
        .getPublicUrl(uploadData.path).data.publicUrl;
    }

    // Insert insurance record
    const { data: insurance, error: insError } = await supabase
      .from('instructor_insurance')
      .insert({
        provider_id: body.provider_id,
        insurance_provider: body.insurance_provider,
        policy_number: body.policy_number,
        coverage_type: body.coverage_type,
        coverage_amount_shekel: body.coverage_amount_shekel,
        issue_date: body.issue_date,
        expiry_date: body.expiry_date,
        document_url,
        document_type: body.document_type,
        verification_status: 'pending',
        is_active: true,
      })
      .select()
      .single();

    if (insError) {
      return NextResponse.json(
        { error: `Database error: ${insError.message}` },
        { status: 500 }
      );
    }

    // Log verification action
    await supabase
      .from('instructor_verification_logs')
      .insert({
        provider_id: body.provider_id,
        action_type: 'insurance_uploaded',
        insurance_id: insurance.id,
        admin_user_id: null,
        notes: `Insurance uploaded: ${body.insurance_provider} #${body.policy_number}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      insurance_id: insurance.id,
      verification_status: 'pending',
      expiry_date: insurance.expiry_date,
      message: 'Insurance proof uploaded successfully. Awaiting admin verification.',
    });
  } catch (error) {
    console.error('Error uploading insurance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Get insurance records
    const { data: insurance, error } = await supabase
      .from('instructor_insurance')
      .select('*')
      .eq('provider_id', provider_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ insurance });
  } catch (error) {
    console.error('Error fetching insurance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
