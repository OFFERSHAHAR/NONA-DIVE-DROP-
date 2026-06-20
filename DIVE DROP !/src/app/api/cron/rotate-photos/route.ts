import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rotateAllSitePhotos } from '@/lib/cron/photo-rotation';
import { logger } from '@/utils/logger';

/**
 * POST /api/cron/rotate-photos
 *
 * Automatic cron job to rotate site photos every 72 hours (3 days)
 * Can also be triggered manually via POST request
 *
 * Vercel Cron Configuration (in vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/rotate-photos",
 *     "schedule": "0 0 */3 * * *"  // Every 3 days at midnight UTC
 *   }]
 * }
 *
 * Manual trigger:
 * curl -X POST https://your-domain.com/api/cron/rotate-photos \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   -H "Content-Type: application/json"
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret for manual triggers
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    // Allow both Vercel's automatic calls and manual calls with secret
    const isVercelCron = request.headers.get('user-agent')?.includes('Vercel');
    const isAuthorized = isVercelCron || (expectedSecret && authHeader === `Bearer ${expectedSecret}`);

    if (!isAuthorized) {
      logger.warn('Unauthorized cron request attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting photo rotation cron job');

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for cron jobs
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

    // Execute photo rotation
    const result = await rotateAllSitePhotos(supabase);

    const duration = Date.now() - startTime;

    logger.info('Photo rotation cron completed', {
      duration,
      ...result,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Photo rotation completed successfully',
        data: {
          statistics: {
            sitesUpdated: result.success,
            sitesSkipped: result.skipped,
            sitesFailed: result.failed,
            totalProcessed: result.success + result.skipped + result.failed,
          },
          rotations: result.results,
          errors: result.errors,
          executionTimeMs: duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Photo rotation cron failed', {
      error: error.message,
      duration,
      stack: error.stack,
    });

    // Send admin notification about failure
    try {
      await sendAdminNotification('error', {
        message: 'Photo rotation cron job failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } catch (notificationError) {
      logger.error('Failed to send admin notification', notificationError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Photo rotation failed',
        timestamp: new Date().toISOString(),
        executionTimeMs: duration,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/rotate-photos
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    message: 'Photo rotation cron endpoint is running',
    endpoint: '/api/cron/rotate-photos',
    method: 'POST',
    description: 'Rotates hero images for all dive sites automatically every 72 hours',
    lastCheck: new Date().toISOString(),
  });
}

/**
 * Send admin notification about cron job status
 */
async function sendAdminNotification(
  status: 'success' | 'error' | 'warning',
  data: Record<string, any>
): Promise<void> {
  // This is a placeholder - implement based on your notification system
  // Could use email, Slack webhook, in-app notifications, etc.

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  // Log to database if you have a notifications table
  if (status !== 'success') {
    logger.warn(`[CRON NOTIFICATION] ${status}:`, data);
  }
}
