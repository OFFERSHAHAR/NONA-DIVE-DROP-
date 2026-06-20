import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { reason } = await request.json();

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update provider status
    const { data: provider, error: updateError } = await supabase
      .from('service_providers')
      .update({
        status: 'approved',
        is_verified: true,
        verification_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log action
    await supabase.from('provider_moderation_log').insert({
      provider_id: params.id,
      action: 'Provider approved',
      reason: reason || 'No reason provided',
      admin_user_id: user.id,
    });

    return NextResponse.json({
      message: 'Provider approved successfully',
      provider,
    });
  } catch (error) {
    console.error('Approve provider error:', error);
    return NextResponse.json(
      { error: 'Failed to approve provider' },
      { status: 500 }
    );
  }
}
