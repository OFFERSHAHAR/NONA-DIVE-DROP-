/**
 * Photo Rotation Service
 * Implements intelligent photo rotation for dive sites
 */

import { createServerClient } from '@supabase/ssr';
import { logger } from '@/utils/logger';
import type { Database } from '@/lib/supabase/database.types';

export interface PhotoScore {
  photoId: string;
  score: number;
  uploadDate: Date;
  rating: number;
  commentCount: number;
  viewCount: number;
}

export interface RotationResult {
  siteId: string;
  previousPhotoId: string | null;
  newPhotoId: string;
  selectedAt: string;
  reason: string;
}

/**
 * Calculate weighted score for a photo based on multiple factors
 */
export function calculatePhotoScore(photo: {
  id: string;
  uploaded_at: string;
  rating?: number | null;
  comment_count?: number | null;
  view_count?: number | null;
}): PhotoScore {
  const now = new Date();
  const uploadDate = new Date(photo.uploaded_at);
  const daysOld = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);

  // Scoring factors (0-100 scale)
  const recencyScore = Math.max(0, 100 - daysOld); // Newer is better
  const ratingScore = ((photo.rating || 0) / 5) * 100; // 0-5 stars to 0-100
  const engagementScore = Math.min(100, (photo.comment_count || 0) * 5 + (photo.view_count || 0) / 10);

  // Weighted average
  // 40% recency, 30% rating, 30% engagement
  const totalScore = recencyScore * 0.4 + ratingScore * 0.3 + engagementScore * 0.3;

  return {
    photoId: photo.id,
    score: totalScore,
    uploadDate,
    rating: photo.rating || 0,
    commentCount: photo.comment_count || 0,
    viewCount: photo.view_count || 0,
  };
}

/**
 * Select best photo from approved photos
 * 1. Filter approved photos from last 30 days
 * 2. Score each photo
 * 3. Pick random from top 10
 * 4. Return single photo
 */
export function selectBestPhoto(photos: PhotoScore[]): PhotoScore | null {
  if (photos.length === 0) return null;

  // Sort by score descending
  const sorted = [...photos].sort((a, b) => b.score - a.score);

  // Take top 10 (or fewer if not enough)
  const topPhotos = sorted.slice(0, Math.min(10, sorted.length));

  // Random selection from top 10
  const randomIndex = Math.floor(Math.random() * topPhotos.length);
  return topPhotos[randomIndex];
}

/**
 * Get approved photos from last 30 days for a site
 */
export async function getApprovedPhotos(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string
): Promise<any[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('site_photos')
    .select('id, uploaded_at, rating, comment_count, view_count, is_approved')
    .eq('site_id', siteId)
    .eq('is_approved', true)
    .gte('uploaded_at', thirtyDaysAgo.toISOString())
    .order('rating', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch photos for site ${siteId}: ${error.message}`);
  }

  return data || [];
}

/**
 * Get current hero image for a site
 */
export async function getCurrentHeroImage(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('dive_sites')
    .select('image_url')
    .eq('id', siteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - that's ok
      return null;
    }
    throw error;
  }

  return data?.image_url || null;
}

/**
 * Update hero image for a site
 */
export async function updateHeroImage(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string,
  photoId: string
): Promise<void> {
  const { error } = await supabase
    .from('dive_sites')
    .update({
      image_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-photos/${photoId}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  if (error) {
    throw new Error(`Failed to update hero image for site ${siteId}: ${error.message}`);
  }
}

/**
 * Log rotation in rotation history
 */
export async function logRotation(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string,
  previousPhotoId: string | null,
  newPhotoId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.from('site_photo_rotation_logs').insert([
    {
      site_id: siteId,
      previous_photo_id: previousPhotoId,
      new_photo_id: newPhotoId,
      set_by: 'system', // Cron job
      set_at: new Date().toISOString(),
      reason,
    },
  ]);

  if (error) {
    logger.warn(`Failed to log rotation for site ${siteId}: ${error.message}`);
  }
}

/**
 * Rotate photo for a single site
 */
export async function rotateSitePhoto(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string
): Promise<RotationResult | null> {
  try {
    // Get approved photos from last 30 days
    const photos = await getApprovedPhotos(supabase, siteId);

    if (photos.length === 0) {
      logger.info(`No approved photos for site ${siteId}, keeping current image`);
      return null;
    }

    // Score and select best photo
    const scoredPhotos = photos.map(calculatePhotoScore);
    const selectedPhoto = selectBestPhoto(scoredPhotos);

    if (!selectedPhoto) {
      logger.warn(`Could not select photo for site ${siteId}`);
      return null;
    }

    // Get current hero image
    const currentHeroId = await getCurrentHeroImage(supabase, siteId);

    // Only update if it's a different photo
    if (currentHeroId && currentHeroId.includes(selectedPhoto.photoId)) {
      logger.info(`Site ${siteId} already has photo ${selectedPhoto.photoId} as hero`);
      return null;
    }

    // Update hero image
    await updateHeroImage(supabase, siteId, selectedPhoto.photoId);

    // Log rotation
    await logRotation(
      supabase,
      siteId,
      currentHeroId ? currentHeroId.split('/').pop() || null : null,
      selectedPhoto.photoId,
      `Auto-rotated based on score: ${selectedPhoto.score.toFixed(2)}`
    );

    const result: RotationResult = {
      siteId,
      previousPhotoId: currentHeroId ? currentHeroId.split('/').pop() || null : null,
      newPhotoId: selectedPhoto.photoId,
      selectedAt: new Date().toISOString(),
      reason: `Scored ${selectedPhoto.score.toFixed(2)} (rating: ${selectedPhoto.rating}, engagement: ${selectedPhoto.commentCount + selectedPhoto.viewCount})`,
    };

    logger.info(`Rotated photo for site ${siteId}:`, result);
    return result;
  } catch (error) {
    logger.error(`Error rotating photo for site ${siteId}:`, error);
    throw error;
  }
}

/**
 * Rotate photos for all sites (main cron job)
 */
export async function rotateAllSitePhotos(
  supabase: ReturnType<typeof createServerClient>
): Promise<{
  success: number;
  failed: number;
  skipped: number;
  results: RotationResult[];
  errors: Array<{ siteId: string; error: string }>;
}> {
  const results: RotationResult[] = [];
  const errors: Array<{ siteId: string; error: string }> = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get all dive sites
    const { data: sites, error: sitesError } = await supabase.from('dive_sites').select('id');

    if (sitesError) {
      throw new Error(`Failed to fetch dive sites: ${sitesError.message}`);
    }

    if (!sites || sites.length === 0) {
      logger.warn('No dive sites found for photo rotation');
      return { success, failed, skipped, results, errors };
    }

    logger.info(`Starting photo rotation for ${sites.length} dive sites`);

    // Rotate photo for each site
    for (const site of sites) {
      try {
        const result = await rotateSitePhoto(supabase, site.id);
        if (result) {
          results.push(result);
          success++;
        } else {
          skipped++;
        }
      } catch (error: any) {
        failed++;
        errors.push({
          siteId: site.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    logger.info(
      `Photo rotation completed: ${success} updated, ${skipped} skipped, ${failed} failed`
    );

    return { success, failed, skipped, results, errors };
  } catch (error) {
    logger.error('Fatal error during photo rotation:', error);
    throw error;
  }
}

/**
 * Get rotation statistics
 */
export async function getRotationStats(
  supabase: ReturnType<typeof createServerClient>,
  daysBack: number = 30
): Promise<{
  totalRotations: number;
  sitesUpdated: number;
  averagePhotoScore: number;
  topRotations: RotationResult[];
}> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data: logs, error } = await supabase
    .from('site_photo_rotation_logs')
    .select('*')
    .gte('set_at', since.toISOString())
    .order('set_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch rotation stats: ${error.message}`);
  }

  const results = logs || [];
  const uniqueSites = new Set(results.map(r => r.site_id));

  return {
    totalRotations: results.length,
    sitesUpdated: uniqueSites.size,
    averagePhotoScore: 75, // Placeholder - would need to calculate from actual scores
    topRotations: results.slice(0, 10) as RotationResult[],
  };
}
