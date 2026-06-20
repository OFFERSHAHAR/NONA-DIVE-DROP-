import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CredentialUploadBody {
  provider_id: string;
  certification_type: 'AIDA' | 'IANTD' | 'PADI' | 'SSI' | 'CMAS' | 'AACR' | 'OTHER';
  certification_number: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date: string;
  document_file?: string; // Base64 encoded file
  document_type: 'image' | 'pdf';
}

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body: CredentialUploadBody = await request.json();

    // Validate input
    if (!body.provider_id || !body.certification_type || !body.certification_number) {
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
      const fileName = `credentials/${body.provider_id}/${Date.now()}-${body.certification_number}`;
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

    // Insert certification record
    const { data: certification, error: certError } = await supabase
      .from('instructor_certifications')
      .insert({
        provider_id: body.provider_id,
        certification_type: body.certification_type,
        certification_number: body.certification_number,
        issuing_organization: body.issuing_organization,
        issue_date: body.issue_date,
        expiry_date: body.expiry_date,
        document_url,
        document_type: body.document_type,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (certError) {
      return NextResponse.json(
        { error: `Database error: ${certError.message}` },
        { status: 500 }
      );
    }

    // Log verification action
    await supabase
      .from('instructor_verification_logs')
      .insert({
        provider_id: body.provider_id,
        action_type: 'certification_uploaded',
        certification_id: certification.id,
        admin_user_id: null,
        notes: `Certification uploaded: ${body.certification_type} #${body.certification_number}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      certification_id: certification.id,
      verification_status: 'pending',
      message: 'Credential uploaded successfully. Awaiting admin verification.',
    });
  } catch (error) {
    console.error('Error uploading credential:', error);
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

    // Get certifications
    const { data: certifications, error } = await supabase
      .from('instructor_certifications')
      .select('*')
      .eq('provider_id', provider_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ certifications });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
