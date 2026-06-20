import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const photoId = id;

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get photo
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('*, profiles:user_id(email)')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Update photo status
    const { error: updateError } = await supabase
      .from('photos')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', photoId);

    if (updateError) throw updateError;

    // Create approval record
    const { error: approvalError } = await supabase
      .from('photo_approvals')
      .insert({
        photo_id: photoId,
        admin_id: user.id,
      });

    if (approvalError) throw approvalError;

    // Log audit
    await supabase.from('photo_moderation_audit').insert({
      photo_id: photoId,
      admin_id: user.id,
      action: 'approved',
      details: { approved_by: user.id },
    });

    // Send email notification (if email service is configured)
    // TODO: Integrate with email service to notify user

    return NextResponse.json({
      success: true,
      message: 'Photo approved successfully',
      photo,
    });
  } catch (error) {
    console.error('Approve photo error:', error);
    return NextResponse.json(
      { error: 'Failed to approve photo' },
      { status: 500 }
    );
  }
}
