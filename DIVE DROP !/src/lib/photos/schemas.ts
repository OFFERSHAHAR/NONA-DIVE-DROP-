import { z } from 'zod';

/**
 * Photo upload form validation schema
 */
export const photoUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'File type must be JPEG, PNG, or WebP'
    ),
  diveSiteId: z.string().uuid().optional(),
  freeDivingId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  caption: z.string().max(100).optional().default(''),
  description: z.string().max(500).optional().default(''),
  visibility: z
    .enum(['public', 'private', 'friends_only'])
    .optional()
    .default('public'),
  tags: z.string().optional().default(''),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;

/**
 * Photo metadata update schema
 */
export const photoUpdateSchema = z.object({
  caption: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private', 'friends_only']).optional(),
  tags: z.array(z.string()).optional(),
});

export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>;

/**
 * Photo rating schema
 */
export const photoRatingSchema = z.object({
  photoId: z.string().uuid('Invalid photo ID'),
  userId: z.string().uuid('Invalid user ID'),
  rating: z
    .number()
    .min(0, 'Rating must be at least 0')
    .max(5, 'Rating must be at most 5'),
});

export type PhotoRatingInput = z.infer<typeof photoRatingSchema>;

/**
 * Photo record schema (from database)
 */
export const photoRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  dive_site_id: z.string().uuid().nullable(),
  free_diving_id: z.string().uuid().nullable(),
  instructor_id: z.string().uuid().nullable(),
  file_name: z.string(),
  file_url: z.string().url(),
  file_size: z.number().int().positive(),
  file_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  caption: z.string(),
  description: z.string(),
  rating: z.number().min(0).max(5),
  rating_count: z.number().int().nonnegative(),
  status: z.enum(['pending', 'approved', 'rejected']),
  visibility: z.enum(['public', 'private', 'friends_only']),
  tags: z.array(z.string()),
  metadata: z.record(z.any()),
  approved_by: z.string().uuid().nullable(),
  approved_at: z.string().datetime().nullable(),
  rejection_reason: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type PhotoRecord = z.infer<typeof photoRecordSchema>;

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(12),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Photo query response schema
 */
export const photoQueryResponseSchema = z.object({
  success: z.boolean(),
  photos: z.array(photoRecordSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type PhotoQueryResponse = z.infer<typeof photoQueryResponseSchema>;

/**
 * Upload response schema
 */
export const uploadResponseSchema = z.object({
  success: z.boolean(),
  photo: photoRecordSchema,
  url: z.string().url(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
