import { z } from 'zod';

// Validation schemas
export const PhotoApprovalSchema = z.object({
  photo_id: z.string().uuid(),
});

export const PhotoRejectionSchema = z.object({
  photo_id: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required'),
  rejection_notes: z.string().optional(),
});

export const BulkPhotoActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  photoIds: z.array(z.string().uuid()).min(1),
  reason: z.string().optional(),
  rejection_notes: z.string().optional(),
});

// Rejection reasons
export const REJECTION_REASONS = [
  'blurry',
  'poor_lighting',
  'inappropriate',
  'not_relevant',
  'duplicate',
  'watermark',
  'orientation',
  'other',
] as const;

export const REJECTION_REASON_LABELS: Record<string, string> = {
  blurry: 'Blurry or out of focus',
  poor_lighting: 'Poor lighting',
  inappropriate: 'Inappropriate content',
  not_relevant: 'Not relevant to site/instructor',
  duplicate: 'Duplicate photo',
  watermark: 'Watermark or text overlay',
  orientation: 'Wrong orientation',
  other: 'Other',
};

// Quality assessment criteria
export interface PhotoQualityCriteria {
  sharpness: number; // 0-100
  lighting: number; // 0-100
  composition: number; // 0-100
  content: number; // 0-100
}

export function calculateQualityScore(criteria: PhotoQualityCriteria): number {
  const { sharpness, lighting, composition, content } = criteria;
  return Math.round((sharpness + lighting + composition + content) / 4);
}

// Photo validation checklist
export interface PhotoValidationChecklist {
  isSharp: boolean;
  hasGoodLighting: boolean;
  isAppropriate: boolean;
  isRelevant: boolean;
  isUnique: boolean;
  quality: number;
}

export function validatePhoto(checklist: PhotoValidationChecklist): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!checklist.isSharp) issues.push('Photo is not sharp or out of focus');
  if (!checklist.hasGoodLighting) issues.push('Lighting is poor');
  if (!checklist.isAppropriate) issues.push('Photo content is inappropriate');
  if (!checklist.isRelevant) issues.push('Photo is not relevant to site or instructor');
  if (!checklist.isUnique) issues.push('Photo appears to be a duplicate');
  if (checklist.quality < 40) issues.push('Photo quality score is too low');

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Statistics type
export interface PhotoModerationStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  todayUploads: number;
  averageQualityScore: number;
}

// Audit log type
export interface PhotoModerationAudit {
  id: string;
  photoId: string;
  action: 'viewed' | 'approved' | 'rejected' | 'flagged';
  adminId: string;
  timestamp: string;
  details?: Record<string, any>;
}
