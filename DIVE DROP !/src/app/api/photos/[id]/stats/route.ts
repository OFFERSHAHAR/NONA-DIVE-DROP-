import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Get photo stats
    const { data: stats, error: statsError } = await supabase
      .from('photo_stats')
      .select(
        `
        id,
        photo_id,
        avg_rating,
        rating_count,
        median_rating,
        view_count,
        like_count,
        comment_count,
        share_count,
        quality_score,
        engagement_score,
        recency_score,
        overall_score,
        percentile_rank,
        verified_purchase_count,
        days_old,
        last_calculated_at
      `
      )
      .eq('photo_id', params.id)
      .single();

    if (statsError) {
      if (statsError.code === 'PGRST116') {
        // No stats found, return defaults
        return NextResponse.json({
          photo_id: params.id,
          avg_rating: 0,
          rating_count: 0,
          median_rating: 0,
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
          quality_score: 0,
          engagement_score: 0,
          recency_score: 0,
          overall_score: 0,
          percentile_rank: 0,
          verified_purchase_count: 0,
          days_old: 0,
          last_calculated_at: new Date().toISOString(),
        });
      }

      console.error('Stats fetch error:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (you can extend this with custom claims)
    // For now, we'll allow authenticated users to trigger updates
    // In production, add proper admin verification

    // Call update_photo_stats function
    const { data, error } = await supabase
      .rpc('update_photo_stats', { p_photo_id: params.id });

    if (error) {
      console.error('Update stats error:', error);
      return NextResponse.json(
        { error: 'Failed to update stats' },
        { status: 500 }
      );
    }

    // Get updated stats
    const { data: stats, error: fetchError } = await supabase
      .from('photo_stats')
      .select('*')
      .eq('photo_id', params.id)
      .single();

    if (fetchError) {
      console.error('Fetch updated stats error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stats recalculated',
      stats,
    });
  } catch (error) {
    console.error('Update stats error:', error);
    return NextResponse.json(
      { error: 'Failed to update stats' },
      { status: 500 }
    );
  }
}
