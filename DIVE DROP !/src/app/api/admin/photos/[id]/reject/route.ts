import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const photoId = params.id;
    const body = await request.json();
    const { reason, rejection_notes } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

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
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', photoId);

    if (updateError) throw updateError;

    // Create rejection record
    const { error: rejectionError } = await supabase
      .from('photo_rejections')
      .insert({
        photo_id: photoId,
        reason,
        admin_id: user.id,
        rejection_notes: rejection_notes || null,
      });

    if (rejectionError) throw rejectionError;

    // Log audit
    await supabase.from('photo_moderation_audit').insert({
      photo_id: photoId,
      admin_id: user.id,
      action: 'rejected',
      details: { reason, rejection_notes },
    });

    // Send email notification
    // TODO: Integrate with email service to notify user

    return NextResponse.json({
      success: true,
      message: 'Photo rejected successfully',
      photo,
    });
  } catch (error) {
    console.error('Reject photo error:', error);
    return NextResponse.json(
      { error: 'Failed to reject photo' },
      { status: 500 }
    );
  }
}
