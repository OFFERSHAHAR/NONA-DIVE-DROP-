/**
 * Photo Moderation System - Usage Examples
 *
 * This file contains example code for using the photo moderation system
 * in various scenarios.
 */

// ============================================================================
// EXAMPLE 1: Using the usePhotoModeration Hook in a Component
// ============================================================================

import { usePhotoModeration } from '@/lib/hooks/usePhotoModeration';

export function PhotoModerationExample() {
  const {
    photos,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    fetchPhotos,
    approvePhoto,
    rejectPhoto,
  } = usePhotoModeration();

  // Fetch pending photos on mount
  React.useEffect(() => {
    fetchPhotos('pending');
  }, []);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {photos.map((photo) => (
        <div key={photo.id}>
          <img src={photo.file_url} alt={photo.title} />
          <button
            onClick={() => approvePhoto(photo.id)}
          >
            Approve
          </button>
          <button
            onClick={() =>
              rejectPhoto(photo.id, 'blurry', 'Image is too blurry')
            }
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Direct API Calls for Photo Approval
// ============================================================================

export async function approvePhotoExample(photoId: string) {
  try {
    const response = await fetch(
      `/api/admin/photos/${photoId}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Photo approved:', data.photo);
    return data;
  } catch (error) {
    console.error('Failed to approve photo:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: Rejecting a Photo with Detailed Feedback
// ============================================================================

export async function rejectPhotoExample(
  photoId: string,
  reason: string = 'blurry',
  notes: string = ''
) {
  try {
    const response = await fetch(
      `/api/admin/photos/${photoId}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          rejection_notes: notes,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Photo rejected:', data);
    return data;
  } catch (error) {
    console.error('Failed to reject photo:', error);
    throw error;
  }
}

// Example usage:
// await rejectPhotoExample(
//   'photo-uuid',
//   'poor_lighting',
//   'The lighting in this photo is too dim. Please try again with better lighting.'
// );

// ============================================================================
// EXAMPLE 4: Bulk Approval of Multiple Photos
// ============================================================================

export async function bulkApprovePhotosExample(photoIds: string[]) {
  try {
    const response = await fetch(
      '/api/admin/photos/bulk',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          photoIds,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Approved ${data.processedCount} photos`);
    return data;
  } catch (error) {
    console.error('Failed to bulk approve photos:', error);
    throw error;
  }
}

// Example usage:
// await bulkApprovePhotosExample([
//   'photo-id-1',
//   'photo-id-2',
//   'photo-id-3',
// ]);

// ============================================================================
// EXAMPLE 5: Bulk Rejection with Consistent Reason
// ============================================================================

export async function bulkRejectPhotosExample(
  photoIds: string[],
  reason: string = 'poor_lighting',
  notes: string = ''
) {
  try {
    const response = await fetch(
      '/api/admin/photos/bulk',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          photoIds,
          reason,
          rejection_notes: notes,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Rejected ${data.processedCount} photos`);
    return data;
  } catch (error) {
    console.error('Failed to bulk reject photos:', error);
    throw error;
  }
}

// Example usage:
// await bulkRejectPhotosExample(
//   ['photo-id-1', 'photo-id-2'],
//   'blurry',
//   'All these photos are out of focus. Please retake them.'
// );

// ============================================================================
// EXAMPLE 6: Fetching Moderation Statistics
// ============================================================================

export async function getModerationStatsExample() {
  try {
    const response = await fetch(
      '/api/admin/photos/stats'
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Moderation stats:', data.stats);
    console.log('Recent activity:', data.recentActivity);
    return data;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    throw error;
  }
}

// Example usage and handling:
// const { stats, recentActivity } = await getModerationStatsExample();
// console.log(`Pending: ${stats.pendingCount}, Approved: ${stats.approvedCount}`);
// console.log(`Average quality: ${stats.averageQualityScore}%`);

// ============================================================================
// EXAMPLE 7: Fetching Pending Photos with Pagination
// ============================================================================

export async function getPendingPhotosExample(
  limit: number = 20,
  offset: number = 0,
  filters?: {
    diveSiteId?: string;
    instructorId?: string;
    search?: string;
  }
) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(filters?.diveSiteId && { dive_site_id: filters.diveSiteId }),
      ...(filters?.instructorId && { instructor_id: filters.instructorId }),
      ...(filters?.search && { search: filters.search }),
    });

    const response = await fetch(
      `/api/admin/photos/pending?${params}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.total} pending photos`);
    console.log('Current page:', data.photos);
    return data;
  } catch (error) {
    console.error('Failed to fetch pending photos:', error);
    throw error;
  }
}

// Example usage:
// const page1 = await getPendingPhotosExample(20, 0, {
//   diveSiteId: 'site-uuid',
// });

// ============================================================================
// EXAMPLE 8: Quality Score Calculation
// ============================================================================

import {
  PhotoQualityCriteria,
  calculateQualityScore,
} from '@/lib/admin/photo-moderation';

export function calculatePhotoQualityExample(
  sharpness: number,
  lighting: number,
  composition: number,
  content: number
) {
  const criteria: PhotoQualityCriteria = {
    sharpness,
    lighting,
    composition,
    content,
  };

  const score = calculateQualityScore(criteria);
  console.log(`Quality score: ${score}%`);
  return score;
}

// Example usage:
// const score = calculatePhotoQualityExample(95, 80, 85, 90);
// // Result: Quality score: 87.5%

// ============================================================================
// EXAMPLE 9: Photo Validation Before Approval
// ============================================================================

import {
  PhotoValidationChecklist,
  validatePhoto,
} from '@/lib/admin/photo-moderation';

export function validatePhotoBeforeApprovalExample(
  checklist: PhotoValidationChecklist
) {
  const { isValid, issues } = validatePhoto(checklist);

  if (isValid) {
    console.log('Photo is valid for approval');
    return true;
  } else {
    console.log('Photo has issues:');
    issues.forEach((issue) => console.log(`- ${issue}`));
    return false;
  }
}

// Example usage:
// const checklist: PhotoValidationChecklist = {
//   isSharp: true,
//   hasGoodLighting: true,
//   isAppropriate: true,
//   isRelevant: true,
//   isUnique: true,
//   quality: 85,
// };
// validatePhotoBeforeApprovalExample(checklist);

// ============================================================================
// EXAMPLE 10: Integrating with Notification Service
// ============================================================================

export async function approvePhotoWithNotificationExample(
  photoId: string,
  notificationService: any
) {
  try {
    // Approve photo via API
    const result = await approvePhotoExample(photoId);

    // Send notification to user
    if (result.photo) {
      await notificationService.send({
        userId: result.photo.user_id,
        type: 'photo_approved',
        title: 'Photo Approved!',
        message: `Your photo "${result.photo.title}" has been approved.`,
        photoId: photoId,
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to approve and notify:', error);
    throw error;
  }
}

export async function rejectPhotoWithNotificationExample(
  photoId: string,
  reason: string,
  notes: string,
  notificationService: any
) {
  try {
    // Reject photo via API
    const result = await rejectPhotoExample(photoId, reason, notes);

    // Send notification to user
    if (result.photo) {
      await notificationService.send({
        userId: result.photo.user_id,
        type: 'photo_rejected',
        title: 'Photo Needs Revision',
        message: `Your photo was not approved. Reason: ${reason}. ${notes ? `Notes: ${notes}` : ''}`,
        photoId: photoId,
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to reject and notify:', error);
    throw error;
  }
}

// ============================================================================
// BEST PRACTICES
// ============================================================================

/**
 * BEST PRACTICES FOR PHOTO MODERATION:
 *
 * 1. QUALITY ASSESSMENT
 *    - Always check multiple criteria (sharpness, lighting, composition)
 *    - Use the quality score as a reference, not the only factor
 *    - Consider context (dive conditions, underwater challenges)
 *
 * 2. REJECTION WORKFLOW
 *    - Always provide a specific reason for rejection
 *    - Add helpful notes when possible
 *    - Consider the user experience and actionability
 *
 * 3. BULK OPERATIONS
 *    - Use bulk operations for efficiency when possible
 *    - Double-check selections before confirming bulk actions
 *    - Keep audit trail clear for accountability
 *
 * 4. CONSISTENCY
 *    - Maintain consistent standards across all reviewers
 *    - Document decision criteria in team guidelines
 *    - Regular review meetings to align on standards
 *
 * 5. AUDIT TRAIL
 *    - All actions are automatically logged
 *    - Include meaningful notes for complex decisions
 *    - Use notes for training and quality assurance
 *
 * 6. ERROR HANDLING
 *    - Always wrap API calls in try-catch blocks
 *    - Provide meaningful error messages to users
 *    - Log errors for debugging and monitoring
 *
 * 7. PERFORMANCE
 *    - Paginate results to avoid loading too many photos
 *    - Use filters to narrow down photos before bulk operations
 *    - Monitor API response times
 *
 * 8. USER COMMUNICATION
 *    - Send approval notifications to encourage users
 *    - Provide specific feedback for rejections
 *    - Allow users to resubmit improved photos
 *    - Consider appeal mechanism for disputed rejections
 */

export default {
  approvePhotoExample,
  rejectPhotoExample,
  bulkApprovePhotosExample,
  bulkRejectPhotosExample,
  getModerationStatsExample,
  getPendingPhotosExample,
  calculatePhotoQualityExample,
  validatePhotoBeforeApprovalExample,
  approvePhotoWithNotificationExample,
  rejectPhotoWithNotificationExample,
};
