import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getRotationStats } from '@/lib/cron/photo-rotation';
import { logger } from '@/utils/logger';
import { withAdminAuth, successResponse, errorResponse } from '@/lib/admin/middleware';

/**
 * GET /api/cron/photos/stats
 *
 * Get rotation statistics for a time period
 * Query params:
 *   - days: Number of days to look back (default: 30)
 *   - format: 'json' | 'csv' (default: 'json')
 *
 * Response includes:
 *   - Total rotations
 *   - Sites updated
 *   - Average photo score
 *   - Top rotations
 *   - Error rates
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const daysBack = parseInt(searchParams.get('days') ?? '30');
    const format = searchParams.get('format') ?? 'json';

    // Validate days parameter
    if (isNaN(daysBack) || daysBack < 1 || daysBack > 365) {
      return errorResponse('Days must be between 1 and 365', 400);
    }

    if (!['json', 'csv'].includes(format)) {
      return errorResponse('Format must be json or csv', 400);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Get statistics
    const stats = await getRotationStats(supabase, daysBack);

    // Get detailed rotation logs
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const { data: logs, error: logsError } = await supabase
      .from('site_photo_rotation_logs')
      .select(
        `
        id,
        site_id,
        new_photo_id,
        previous_photo_id,
        set_at,
        set_by,
        reason,
        dive_sites(name, location)
      `
      )
      .gte('set_at', since.toISOString())
      .order('set_at', { ascending: false });

    if (logsError) {
      throw new Error(`Failed to fetch rotation logs: ${logsError.message}`);
    }

    // Calculate advanced statistics
    const rotations = logs || [];
    const hourlyDistribution = calculateHourlyDistribution(rotations);
    const sitesWithMostRotations = calculateTopSites(rotations);
    const rotationsByDay = calculateRotationsByDay(rotations, daysBack);

    const responseData = {
      period: {
        daysBack,
        since: since.toISOString(),
        until: new Date().toISOString(),
      },
      summary: {
        totalRotations: stats.totalRotations,
        sitesUpdated: stats.sitesUpdated,
        averageRotationsPerSite: stats.totalRotations / Math.max(1, stats.sitesUpdated),
        lastRotationAt: rotations[0]?.set_at || null,
      },
      distribution: {
        byHour: hourlyDistribution,
        byDay: rotationsByDay,
        bySetBy: calculateDistributionBy(rotations, 'set_by'),
      },
      topPerformers: {
        sitesWithMostRotations,
        topPhotoIds: calculateTopPhotos(rotations),
      },
      rotations: rotations.map(r => ({
        id: r.id,
        site: {
          id: r.site_id,
          name: r.dive_sites?.[0]?.name,
          location: r.dive_sites?.[0]?.location,
        },
        photoId: r.new_photo_id,
        rotatedAt: r.set_at,
        rotatedBy: r.set_by,
        reason: r.reason,
      })),
      generatedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      return exportAsCSV(responseData, rotations);
    }

    return NextResponse.json(successResponse(responseData));
  } catch (error: any) {
    logger.error('GET /api/cron/photos/stats error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * Calculate distribution of rotations by hour of day
 */
function calculateHourlyDistribution(rotations: any[]): Record<number, number> {
  const distribution: Record<number, number> = {};

  for (let i = 0; i < 24; i++) {
    distribution[i] = 0;
  }

  rotations.forEach(r => {
    const hour = new Date(r.set_at).getHours();
    distribution[hour]++;
  });

  return distribution;
}

/**
 * Calculate rotations by day
 */
function calculateRotationsByDay(rotations: any[], daysBack: number): Record<string, number> {
  const distribution: Record<string, number> = {};

  // Initialize all days
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    distribution[key] = 0;
  }

  // Count rotations per day
  rotations.forEach(r => {
    const key = new Date(r.set_at).toISOString().split('T')[0];
    if (distribution[key] !== undefined) {
      distribution[key]++;
    }
  });

  return distribution;
}

/**
 * Calculate distribution by a field
 */
function calculateDistributionBy(rotations: any[], field: string): Record<string, number> {
  const distribution: Record<string, number> = {};

  rotations.forEach(r => {
    const key = r[field] || 'unknown';
    distribution[key] = (distribution[key] || 0) + 1;
  });

  return distribution;
}

/**
 * Get sites with most rotations
 */
function calculateTopSites(rotations: any[]): Array<{ siteId: string; siteName: string; count: number }> {
  const siteMap: Record<string, { name: string; count: number }> = {};

  rotations.forEach(r => {
    if (!siteMap[r.site_id]) {
      siteMap[r.site_id] = {
        name: r.dive_sites?.[0]?.name || 'Unknown',
        count: 0,
      };
    }
    siteMap[r.site_id].count++;
  });

  return Object.entries(siteMap)
    .map(([siteId, data]) => ({
      siteId,
      siteName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Get most frequently rotated photos
 */
function calculateTopPhotos(rotations: any[]): Array<{ photoId: string; count: number; lastUsedAt: string }> {
  const photoMap: Record<string, { count: number; lastUsedAt: string }> = {};

  rotations.forEach(r => {
    if (!photoMap[r.new_photo_id]) {
      photoMap[r.new_photo_id] = { count: 0, lastUsedAt: r.set_at };
    }
    photoMap[r.new_photo_id].count++;
    // Update last used if newer
    if (new Date(r.set_at) > new Date(photoMap[r.new_photo_id].lastUsedAt)) {
      photoMap[r.new_photo_id].lastUsedAt = r.set_at;
    }
  });

  return Object.entries(photoMap)
    .map(([photoId, data]) => ({
      photoId,
      count: data.count,
      lastUsedAt: data.lastUsedAt,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Export statistics as CSV
 */
function exportAsCSV(responseData: any, rotations: any[]): NextResponse {
  const headers = ['Site ID', 'Site Name', 'Photo ID', 'Rotated At', 'Rotated By', 'Reason'];

  const rows = rotations.map(r => [
    r.site_id,
    r.dive_sites?.[0]?.name || 'Unknown',
    r.new_photo_id,
    r.set_at,
    r.set_by,
    r.reason || 'Auto-rotation',
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="photo-rotation-stats-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

/**
 * POST /api/cron/photos/stats
 * Not implemented - GET only
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for statistics.' },
    { status: 405 }
  );
}
