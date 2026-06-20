import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { reason, duration_days } = await request.json();

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
        status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create suspension record
    const unsuspendedAt = duration_days
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from('provider_suspensions').insert({
      provider_id: id,
      reason,
      severity: duration_days ? 'temporary' : 'permanent',
      duration_days: duration_days || null,
      suspended_by_admin_id: user.id,
      unsuspended_at: unsuspendedAt,
    });

    // Log action
    await supabase.from('provider_moderation_log').insert({
      provider_id: id,
      action: 'Provider suspended',
      reason: reason,
      admin_user_id: user.id,
    });

    return NextResponse.json({
      message: 'Provider suspended successfully',
      provider,
      unsuspended_at: unsuspendedAt,
    });
  } catch (error) {
    console.error('Suspend provider error:', error);
    return NextResponse.json(
      { error: 'Failed to suspend provider' },
      { status: 500 }
    );
  }
}
