import { z } from 'zod';

// ============================================================================
// SHARED VALIDATION SCHEMAS
// ============================================================================

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================================================
// USER MANAGEMENT SCHEMAS
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  diving_experience: z.enum(['beginner', 'intermediate', 'advanced', 'instructor']),
  location: z.string().max(255).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const bulkUserImportSchema = z.object({
  users: z.array(createUserSchema).min(1).max(1000),
  skipDuplicates: z.boolean().default(true),
});

export type BulkUserImportInput = z.infer<typeof bulkUserImportSchema>;

// ============================================================================
// DIVE SITE SCHEMAS
// ============================================================================

export const createDiveSiteSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().min(10).max(2000),
  location: z.string().min(3).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  depth: z.number().min(0).max(500),
  difficulty: z.enum(['easy', 'intermediate', 'hard']),
  image_url: z.string().url().optional().nullable(),
});

export type CreateDiveSiteInput = z.infer<typeof createDiveSiteSchema>;

export const updateDiveSiteSchema = createDiveSiteSchema.partial();

export type UpdateDiveSiteInput = z.infer<typeof updateDiveSiteSchema>;

export const bulkDiveSiteImportSchema = z.object({
  sites: z.array(createDiveSiteSchema).min(1).max(500),
  skipDuplicates: z.boolean().default(true),
});

export type BulkDiveSiteImportInput = z.infer<typeof bulkDiveSiteImportSchema>;

// ============================================================================
// SHUTTLE SCHEMAS (Note: Shuttle table needs to be added to DB)
// ============================================================================

export const createShuttleSchema = z.object({
  name: z.string().min(3).max(255),
  registration: z.string().min(1).max(20),
  capacity: z.number().int().min(1).max(100),
  location: z.string().max(255).optional(),
  status: z.enum(['available', 'in-use', 'maintenance', 'archived']).default('available'),
  contact_person: z.string().max(255).optional(),
  phone: z.string().regex(/^\+?[0-9\-\s()]{5,20}$/).optional(),
});

export type CreateShuttleInput = z.infer<typeof createShuttleSchema>;

export const updateShuttleSchema = createShuttleSchema.partial();

export type UpdateShuttleInput = z.infer<typeof updateShuttleSchema>;

// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================

export const auditLogSchema = z.object({
  action: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT']),
  entity_type: z.enum(['users', 'dive_sites', 'shuttles']),
  entity_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  changes: z.record(z.any()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

export type AuditLogInput = z.infer<typeof auditLogSchema>;

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  size: z.number().min(1).max(5 * 1024 * 1024), // 5MB max
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

// ============================================================================
// PHOTO ROTATION SCHEMAS
// ============================================================================

export const uploadPhotoSchema = z.object({
  site_id: z.string().uuid('Invalid site ID'),
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).max(2000).optional(),
  file: z.instanceof(File).optional(),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;

export const approvePhotoSchema = z.object({
  photo_id: z.string().uuid('Invalid photo ID'),
  is_approved: z.boolean(),
  reason: z.string().optional(),
});

export type ApprovePhotoInput = z.infer<typeof approvePhotoSchema>;

export const rotationStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  format: z.enum(['json', 'csv']).default('json'),
});

export type RotationStatsQuery = z.infer<typeof rotationStatsQuerySchema>;

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeArchived: z.boolean().default(false),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
