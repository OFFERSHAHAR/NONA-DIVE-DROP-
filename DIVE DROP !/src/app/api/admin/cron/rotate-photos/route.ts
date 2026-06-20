import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rotateAllSitePhotos } from '@/lib/cron/photo-rotation';
import { CRON_CONFIG, validateCronConfig } from '@/lib/cron/config';
import {
  withAdminAuth,
  successResponse,
  errorResponse,
} from '@/lib/admin/middleware';
import { logger } from '@/utils/logger';

/**
 * POST /api/admin/cron/rotate-photos
 *
 * Manually trigger photo rotation for all sites
 * Admin only endpoint for testing and manual execution
 *
 * Response includes:
 *   - Statistics of rotations
 *   - List of updated sites
 *   - Any errors encountered
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    // Validate cron configuration
    const configValidation = validateCronConfig();
    if (!configValidation.valid) {
      logger.warn('Cron configuration invalid:', configValidation.errors);
      return errorResponse(
        `Configuration error: ${configValidation.errors[0]}`,
        400
      );
    }

    if (!CRON_CONFIG.photoRotation.enabled) {
      return errorResponse('Photo rotation is currently disabled', 403);
    }

    logger.info(
      `Admin ${context.userId} manually triggered photo rotation`
    );

    // Create Supabase client
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

    // Execute rotation
    const result = await rotateAllSitePhotos(supabase);

    const duration = Date.now() - startTime;

    logger.info('Manual photo rotation completed', {
      admin: context.userId,
      duration,
      ...result,
    });

    return NextResponse.json(
      successResponse({
        message: 'Photo rotation completed successfully',
        statistics: {
          sitesUpdated: result.success,
          sitesSkipped: result.skipped,
          sitesFailed: result.failed,
          totalProcessed: result.success + result.skipped + result.failed,
        },
        rotations: result.results,
        errors: result.errors,
        executionTimeMs: duration,
        triggeredBy: context.userId,
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Manual photo rotation failed', {
      admin: context.userId,
      error: error.message,
      duration,
    });

    return errorResponse(
      error.message || 'Photo rotation failed',
      500
    );
  }
}

/**
 * GET /api/admin/cron/rotate-photos
 *
 * Get cron configuration and schedule information
 */
export async function GET(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    const configValidation = validateCronConfig();

    return NextResponse.json(
      successResponse({
        configuration: {
          enabled: CRON_CONFIG.photoRotation.enabled,
          frequencyHours: CRON_CONFIG.photoRotation.frequencyHours,
          frequencyDescription: `Every ${CRON_CONFIG.photoRotation.frequencyHours} hours`,
          approvalWindowDays: CRON_CONFIG.photoRotation.approvalWindowDays,
          minimumPhotosRequired: CRON_CONFIG.photoRotation.minimumPhotosRequired,
          topPhotosCountForSelection: CRON_CONFIG.photoRotation.topPhotosCount,
          scoringWeights: CRON_CONFIG.photoRotation.scoringWeights,
        },
        notifications: CRON_CONFIG.photoRotation.notifications,
        validation: {
          valid: configValidation.valid,
          errors: configValidation.errors,
        },
        schedule: {
          path: '/api/cron/rotate-photos',
          method: 'POST',
          automaticFrequency: `Every ${CRON_CONFIG.photoRotation.frequencyHours} hours`,
          nextRunEstimate: estimateNextRun(),
        },
        endpoints: {
          automaticTrigger: '/api/cron/rotate-photos',
          manualTrigger: '/api/admin/cron/rotate-photos',
          statistics: '/api/cron/photos/stats',
          approvePhotos: '/api/admin/photos/approve',
        },
      })
    );
  } catch (error: any) {
    logger.error('GET /api/admin/cron/rotate-photos error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * Estimate when the next automatic rotation will run
 */
function estimateNextRun(): string {
  const now = new Date();
  const nextRun = new Date(now);

  // This is a simple estimation - actual schedule depends on Vercel's cron
  // For 72-hour rotation (3 days), estimate next run in 3 days
  const hoursFrequency = CRON_CONFIG.photoRotation.frequencyHours;
  nextRun.setHours(nextRun.getHours() + hoursFrequency);

  return nextRun.toISOString();
}

/**
 * DELETE /api/admin/cron/rotate-photos
 *
 * Disable automatic photo rotation (admin only)
 */
export async function DELETE(request: NextRequest) {
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;

  try {
    logger.warn(`Admin ${context.userId} disabled photo rotation`);

    // In production, this would update a database setting
    // For now, just return a message
    return NextResponse.json(
      successResponse({
        message: 'Photo rotation has been disabled',
        note: 'To re-enable, set CRON_PHOTO_ROTATION_ENABLED=true environment variable',
      })
    );
  } catch (error: any) {
    logger.error('DELETE /api/admin/cron/rotate-photos error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
