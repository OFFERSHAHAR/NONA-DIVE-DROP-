import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, photoIds, reason = null, rejection_notes = null } = body;

    if (!action || !photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
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

    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    let processedCount = 0;
    let errors: string[] = [];

    // Process each photo
    for (const photoId of photoIds) {
      try {
        if (action === 'approve') {
          // Update status
          const { error: updateError } = await supabase
            .from('photos')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', photoId);

          if (updateError) throw updateError;

          // Create approval record
          await supabase.from('photo_approvals').insert({
            photo_id: photoId,
            admin_id: user.id,
          });

          // Log audit
          await supabase.from('photo_moderation_audit').insert({
            photo_id: photoId,
            admin_id: user.id,
            action: 'approved',
          });
        } else {
          // Reject
          const { error: updateError } = await supabase
            .from('photos')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', photoId);

          if (updateError) throw updateError;

          // Create rejection record
          await supabase.from('photo_rejections').insert({
            photo_id: photoId,
            reason,
            admin_id: user.id,
            rejection_notes,
          });

          // Log audit
          await supabase.from('photo_moderation_audit').insert({
            photo_id: photoId,
            admin_id: user.id,
            action: 'rejected',
            details: { reason, rejection_notes },
          });
        }

        processedCount++;
      } catch (error) {
        errors.push(`Failed to process photo ${photoId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      processedCount,
      totalCount: photoIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk action' },
      { status: 500 }
    );
  }
}
