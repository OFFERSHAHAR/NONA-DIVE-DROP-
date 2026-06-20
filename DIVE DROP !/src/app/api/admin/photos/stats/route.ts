import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get stats
    const { data: pendingCount } = await supabase
      .from('photos')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const { data: approvedCount } = await supabase
      .from('photos')
      .select('id', { count: 'exact' })
      .eq('status', 'approved');

    const { data: rejectedCount } = await supabase
      .from('photos')
      .select('id', { count: 'exact' })
      .eq('status', 'rejected');

    // Get today's uploads
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCount } = await supabase
      .from('photos')
      .select('id', { count: 'exact' })
      .gte('uploaded_at', `${today}T00:00:00`)
      .lt('uploaded_at', `${today}T23:59:59`);

    // Get average quality score
    const { data: qualityData } = await supabase
      .from('photos')
      .select('quality_score')
      .eq('status', 'approved')
      .not('quality_score', 'is', null);

    const avgQuality = qualityData && qualityData.length > 0
      ? Math.round(
          qualityData.reduce((sum, p) => sum + (p.quality_score || 0), 0) /
          qualityData.length
        )
      : 0;

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('photo_moderation_audit')
      .select(
        `
        id,
        action,
        created_at,
        admin_id,
        profiles:admin_id(username),
        photo_id,
        photos:photo_id(title)
        `
      )
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats: {
        pendingCount: pendingCount?.length || 0,
        approvedCount: approvedCount?.length || 0,
        rejectedCount: rejectedCount?.length || 0,
        todayUploads: todayCount?.length || 0,
        averageQualityScore: avgQuality,
      },
      recentActivity: recentActivity || [],
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
