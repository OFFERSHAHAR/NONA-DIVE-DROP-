import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
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
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log action
    await supabase.from('provider_moderation_log').insert({
      provider_id: id,
      action: 'Provider rejected',
      reason: reason || 'No reason provided',
      admin_user_id: user.id,
    });

    return NextResponse.json({
      message: 'Provider rejected successfully',
      provider,
    });
  } catch (error) {
    console.error('Reject provider error:', error);
    return NextResponse.json(
      { error: 'Failed to reject provider' },
      { status: 500 }
    );
  }
}
