import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get total photos count
    const { count: totalPhotos } = await supabase
      .from('user_photos')
      .select('*', { count: 'exact', head: true });

    // Get approved photos count
    const { count: approvedPhotos } = await supabase
      .from('user_photos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    // Get average rating and stats
    const { data: statsData } = await supabase
      .from('photo_stats')
      .select('avg_rating, view_count, like_count, comment_count, overall_score');

    let avgRating = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    if (statsData && statsData.length > 0) {
      avgRating =
        statsData.reduce((sum, s) => sum + (s.avg_rating || 0), 0) /
        statsData.length;
      totalViews = statsData.reduce((sum, s) => sum + (s.view_count || 0), 0);
      totalLikes = statsData.reduce((sum, s) => sum + (s.like_count || 0), 0);
      totalComments = statsData.reduce(
        (sum, s) => sum + (s.comment_count || 0),
        0
      );
    }

    // Get top rated photos
    const { data: topRated } = await supabase
      .from('top_rated_photos')
      .select('photo_id, caption, avg_rating, rating_count')
      .limit(10);

    // Get most viewed photos
    const { data: mostViewed } = await supabase
      .from('most_viewed_photos')
      .select('photo_id, caption, view_count')
      .limit(10);

    // Get top scoring photos
    const { data: topScoring } = await supabase
      .from('top_scoring_photos')
      .select('photo_id, caption, overall_score')
      .limit(10);

    return NextResponse.json({
      totalPhotos: totalPhotos || 0,
      approvedPhotos: approvedPhotos || 0,
      avgRating,
      totalViews,
      totalLikes,
      totalComments,
      topRatedPhotos: topRated || [],
      mostViewedPhotos: mostViewed || [],
      topScoringPhotos: topScoring || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
