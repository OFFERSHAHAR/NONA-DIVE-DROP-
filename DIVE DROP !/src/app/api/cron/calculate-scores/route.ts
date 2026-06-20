import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || !cronSecret) {
    return false;
  }

  return cronSecret === expectedSecret;
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    console.log('[CRON] Starting photo score calculation...');

    // Step 1: Update stats for all photos
    const { data: updateStats, error: updateError } = await supabase
      .rpc('update_photo_stats');

    if (updateError) {
      console.error('[CRON] Error updating stats:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stats', details: updateError },
        { status: 500 }
      );
    }

    console.log('[CRON] Updated stats:', updateStats);

    // Step 2: Calculate percentile ranks
    const { data: percentileData, error: percentileError } = await supabase
      .rpc('calculate_percentile_ranks');

    if (percentileError) {
      console.error('[CRON] Error calculating percentiles:', percentileError);
      return NextResponse.json(
        { error: 'Failed to calculate percentiles', details: percentileError },
        { status: 500 }
      );
    }

    console.log('[CRON] Calculated percentile ranks:', percentileData);

    // Step 3: Get updated stats for response
    const { data: stats, error: statsError } = await supabase
      .from('photo_stats')
      .select('count')
      .single();

    if (statsError) {
      console.error('[CRON] Error fetching stats count:', statsError);
    }

    // Step 4: Get top photos for monitoring
    const { data: topPhotos, error: topError } = await supabase
      .from('top_scoring_photos')
      .select('photo_id, overall_score, avg_rating')
      .limit(5);

    if (topError) {
      console.error('[CRON] Error fetching top photos:', topError);
    }

    console.log('[CRON] Top 5 photos:', topPhotos);

    return NextResponse.json({
      success: true,
      message: 'Photo scores calculated successfully',
      timestamp: new Date().toISOString(),
      data: {
        statsUpdated: updateStats?.updated_count || 0,
        percentileRanksCalculated: percentileData?.updated_count || 0,
        topPhotos: topPhotos || [],
      },
    });
  } catch (error) {
    console.error('[CRON] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate scores',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Optional: Allow manual trigger with proper authentication
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret or admin token
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delegate to POST handler
    return POST(request);
  } catch (error) {
    console.error('[CRON] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
