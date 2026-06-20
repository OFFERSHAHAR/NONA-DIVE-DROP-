/**
 * Test Helpers for Photo Rotation System
 * Utilities for testing and debugging the cron job
 */

import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Create test photos for a site
 */
export async function createTestPhotos(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string,
  count: number = 5,
  isApproved: boolean = true
): Promise<any[]> {
  const photos = [];

  for (let i = 0; i < count; i++) {
    const daysOld = Math.floor(Math.random() * 25); // 0-25 days old
    const uploadDate = new Date();
    uploadDate.setDate(uploadDate.getDate() - daysOld);

    const photo = {
      site_id: siteId,
      user_id: crypto.randomUUID(), // Random user
      file_path: `test/photo-${i}.jpg`,
      file_size: Math.random() * 5000000, // Random file size
      file_type: 'image/jpeg',
      title: `Test Photo ${i + 1}`,
      description: `Test photo uploaded ${daysOld} days ago`,
      is_approved: isApproved,
      approved_at: isApproved ? new Date().toISOString() : null,
      approved_by: isApproved ? crypto.randomUUID() : null,
      rating: Math.random() * 5, // 0-5 stars
      comment_count: Math.floor(Math.random() * 50),
      view_count: Math.floor(Math.random() * 500),
      uploaded_at: uploadDate.toISOString(),
    };

    photos.push(photo);
  }

  const { data: inserted, error } = await supabase
    .from('site_photos')
    .insert(photos)
    .select();

  if (error) {
    throw new Error(`Failed to create test photos: ${error.message}`);
  }

  return inserted || [];
}

/**
 * Get test data for a site
 */
export async function getTestData(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string
): Promise<{
  site: any;
  photos: any[];
  rotationLogs: any[];
  currentRotation: any;
}> {
  // Get site
  const { data: site, error: siteError } = await supabase
    .from('dive_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (siteError) throw siteError;

  // Get photos
  const { data: photos, error: photosError } = await supabase
    .from('site_photos')
    .select('*')
    .eq('site_id', siteId);

  if (photosError) throw photosError;

  // Get rotation logs
  const { data: rotationLogs, error: logsError } = await supabase
    .from('site_photo_rotation_logs')
    .select('*')
    .eq('site_id', siteId)
    .order('set_at', { ascending: false });

  if (logsError) throw logsError;

  // Get current rotation
  const { data: currentRotation, error: currentError } = await supabase
    .from('site_photo_rotation_current')
    .select('*')
    .eq('site_id', siteId)
    .single();

  if (currentError && currentError.code !== 'PGRST116') {
    throw currentError;
  }

  return {
    site,
    photos: photos || [],
    rotationLogs: rotationLogs || [],
    currentRotation: currentRotation || null,
  };
}

/**
 * Clean up test data for a site
 */
export async function cleanupTestData(
  supabase: ReturnType<typeof createServerClient>,
  siteId: string
): Promise<{
  deletedPhotos: number;
  deletedLogs: number;
}> {
  // Delete photos
  const { error: photosError, count: photosCount } = await supabase
    .from('site_photos')
    .delete()
    .eq('site_id', siteId);

  if (photosError) throw photosError;

  // Delete rotation logs
  const { error: logsError, count: logsCount } = await supabase
    .from('site_photo_rotation_logs')
    .delete()
    .eq('site_id', siteId);

  if (logsError) throw logsError;

  return {
    deletedPhotos: photosCount || 0,
    deletedLogs: logsCount || 0,
  };
}

/**
 * Generate rotation report for debugging
 */
export function generateRotationReport(testData: {
  site: any;
  photos: any[];
  rotationLogs: any[];
  currentRotation: any;
}): string {
  const { site, photos, rotationLogs, currentRotation } = testData;

  let report = `
╔════════════════════════════════════════════════════════════════╗
║           PHOTO ROTATION DIAGNOSTIC REPORT                    ║
╚════════════════════════════════════════════════════════════════╝

SITE INFORMATION
─────────────────────────────────────────────────────────────────
Site ID:          ${site.id}
Site Name:        ${site.name}
Location:         ${site.location}
Current Hero:     ${site.image_url ? site.image_url.split('/').pop() : 'None'}
`;

  // Photo statistics
  const approvedPhotos = photos.filter(p => p.is_approved);
  const unapprovedPhotos = photos.filter(p => !p.is_approved);
  const recentPhotos = photos.filter(p => {
    const daysOld = (new Date().getTime() - new Date(p.uploaded_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysOld <= 30;
  });

  report += `
PHOTO STATISTICS
─────────────────────────────────────────────────────────────────
Total Photos:           ${photos.length}
Approved:               ${approvedPhotos.length}
Pending Approval:       ${unapprovedPhotos.length}
Recent (< 30 days):     ${recentPhotos.length}

Rating Summary:
`;

  if (approvedPhotos.length > 0) {
    const avgRating = approvedPhotos.reduce((sum, p) => sum + (p.rating || 0), 0) / approvedPhotos.length;
    const avgComments = approvedPhotos.reduce((sum, p) => sum + (p.comment_count || 0), 0) / approvedPhotos.length;
    const avgViews = approvedPhotos.reduce((sum, p) => sum + (p.view_count || 0), 0) / approvedPhotos.length;

    report += `  - Average Rating:      ${avgRating.toFixed(2)}/5.0
  - Average Comments:    ${avgComments.toFixed(1)}
  - Average Views:       ${avgViews.toFixed(0)}
`;
  } else {
    report += `  - No approved photos for analysis
`;
  }

  // Rotation history
  report += `
ROTATION HISTORY
─────────────────────────────────────────────────────────────────`;

  if (rotationLogs.length === 0) {
    report += `\nNo rotations yet.\n`;
  } else {
    report += `\nLast 10 rotations:\n`;
    rotationLogs.slice(0, 10).forEach((log, i) => {
      const date = new Date(log.set_at).toLocaleString();
      report += `  ${i + 1}. [${date}] ${log.set_by}\n`;
      report += `     Reason: ${log.reason || 'No reason provided'}\n`;
    });
  }

  // Current rotation
  report += `
CURRENT ROTATION
─────────────────────────────────────────────────────────────────`;

  if (currentRotation) {
    const date = new Date(currentRotation.set_at).toLocaleString();
    report += `
Photo ID:         ${currentRotation.photo_id}
Set At:           ${date}
Set By:           ${currentRotation.set_by}
`;
  } else {
    report += `\nNo current rotation set.\n`;
  }

  // Readiness for rotation
  report += `
ROTATION READINESS
─────────────────────────────────────────────────────────────────
Can Rotate:       ${recentPhotos.length >= 1 ? '✅ Yes' : '❌ No'}
Reason:           ${recentPhotos.length >= 1 ? `${recentPhotos.length} approved photos available` : 'No approved photos in last 30 days'}
`;

  report += `
════════════════════════════════════════════════════════════════
`;

  return report;
}

/**
 * Validate photo scoring
 */
export function validatePhotoScoring(photos: any[]): {
  valid: boolean;
  issues: string[];
  scores: Array<{ photoId: string; score: number }>;
} {
  const issues: string[] = [];
  const scores: Array<{ photoId: string; score: number }> = [];

  photos.forEach(photo => {
    // Validate rating
    if (photo.rating !== null && (photo.rating < 0 || photo.rating > 5)) {
      issues.push(`Photo ${photo.id}: Invalid rating ${photo.rating} (must be 0-5)`);
    }

    // Validate counts
    if (photo.comment_count < 0) {
      issues.push(`Photo ${photo.id}: Negative comment count`);
    }
    if (photo.view_count < 0) {
      issues.push(`Photo ${photo.id}: Negative view count`);
    }

    // Calculate score for debugging
    const now = new Date();
    const uploadDate = new Date(photo.uploaded_at);
    const daysOld = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);

    const recencyScore = Math.max(0, 100 - daysOld);
    const ratingScore = ((photo.rating || 0) / 5) * 100;
    const engagementScore = Math.min(100, (photo.comment_count || 0) * 5 + (photo.view_count || 0) / 10);

    const totalScore = recencyScore * 0.4 + ratingScore * 0.3 + engagementScore * 0.3;

    scores.push({
      photoId: photo.id,
      score: Math.round(totalScore * 100) / 100,
    });
  });

  return {
    valid: issues.length === 0,
    issues,
    scores: scores.sort((a, b) => b.score - a.score),
  };
}

/**
 * Test the selection algorithm
 */
export function testSelectionAlgorithm(
  photos: any[],
  iterations: number = 100
): {
  selectionFrequency: Record<string, number>;
  fairnessScore: number;
} {
  const frequency: Record<string, number> = {};

  // Score all photos
  photos.forEach(photo => {
    frequency[photo.id] = 0;
  });

  // Simulate multiple selections
  for (let i = 0; i < iterations; i++) {
    // Score and sort
    const scored = photos.map(p => {
      const now = new Date();
      const uploadDate = new Date(p.uploaded_at);
      const daysOld = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);

      const recencyScore = Math.max(0, 100 - daysOld);
      const ratingScore = ((p.rating || 0) / 5) * 100;
      const engagementScore = Math.min(100, (p.comment_count || 0) * 5 + (p.view_count || 0) / 10);

      const totalScore = recencyScore * 0.4 + ratingScore * 0.3 + engagementScore * 0.3;

      return { id: p.id, score: totalScore };
    });

    // Get top 10
    const sorted = scored.sort((a, b) => b.score - a.score);
    const top10 = sorted.slice(0, Math.min(10, sorted.length));

    // Random selection
    const selected = top10[Math.floor(Math.random() * top10.length)];
    frequency[selected.id]++;
  }

  // Calculate fairness (ideal is equal distribution)
  const ideal = iterations / Object.keys(frequency).length;
  const variance = Object.values(frequency).reduce((sum, count) => {
    return sum + Math.pow(count - ideal, 2);
  }, 0) / Object.keys(frequency).length;

  const fairnessScore = Math.max(0, 100 - Math.sqrt(variance));

  return {
    selectionFrequency: frequency,
    fairnessScore,
  };
}
