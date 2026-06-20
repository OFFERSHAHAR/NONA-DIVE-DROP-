import { z } from 'zod';

// ============================================================================
// BUDDY LISTING SCHEMAS
// ============================================================================

export const createListingSchema = z.object({
  title: z.string().min(5).max(200, 'Title must be 5-200 characters'),
  description: z.string().min(20).max(2000, 'Description must be 20-2000 characters'),
  dive_site_id: z.string().uuid('Invalid dive site ID').optional().nullable(),
  custom_location: z.string().max(255).optional().nullable(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  number_of_divers: z.number().int().min(1).max(10),
  dive_date: z.string().datetime('Invalid date format'),
  dive_duration: z.number().int().min(30).max(480, 'Duration in minutes, max 8 hours'),
  available_contact_after: z.string().datetime().optional(),
  tags: z.array(z.string()).max(5).optional(),
  is_active: z.boolean().default(true),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema.partial().omit({ dive_date: true });

export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const listingsFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  dive_site_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
  search: z.string().max(255).optional(),
  exclude_user_id: z.string().uuid().optional(),
  sort_by: z.enum(['recent', 'upcoming', 'matching']).default('recent'),
});

export type ListingsFilterInput = z.infer<typeof listingsFilterSchema>;

// ============================================================================
// INTEREST/BUDDY REQUEST SCHEMAS
// ============================================================================

export const createInterestSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  message: z.string().min(10).max(500).optional(),
  status: z.enum(['pending']).default('pending'),
});

export type CreateInterestInput = z.infer<typeof createInterestSchema>;

export const updateInterestSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']),
  response_message: z.string().max(500).optional(),
});

export type UpdateInterestInput = z.infer<typeof updateInterestSchema>;

export const interestFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).optional(),
  type: z.enum(['received', 'sent']).default('received'),
});

export type InterestFilterInput = z.infer<typeof interestFilterSchema>;

// ============================================================================
// CONTACT REVEAL SCHEMAS
// ============================================================================

export const revealContactSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  reveal_reason: z.enum(['mutual_interest', 'admin_request']).default('mutual_interest'),
});

export type RevealContactInput = z.infer<typeof revealContactSchema>;

// ============================================================================
// CONNECTION SCHEMAS
// ============================================================================

export const connectionsFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().max(255).optional(),
});

export type ConnectionsFilterInput = z.infer<typeof connectionsFilterSchema>;

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

export const sendMessageSchema = z.object({
  recipient_id: z.string().uuid('Invalid recipient ID'),
  message: z.string().min(1).max(5000),
  listing_id: z.string().uuid().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messagesFilterSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MessagesFilterInput = z.infer<typeof messagesFilterSchema>;

// ============================================================================
// SAFETY SCHEMAS
// ============================================================================

export const blockUserSchema = z.object({
  blocked_user_id: z.string().uuid('Invalid user ID'),
  reason: z.string().max(255).optional(),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;

export const reportUserSchema = z.object({
  reported_user_id: z.string().uuid('Invalid user ID'),
  reason: z.enum([
    'inappropriate_content',
    'harassment',
    'spam',
    'fake_profile',
    'safety_concern',
    'other'
  ]),
  description: z.string().min(20).max(1000),
  attachment_url: z.string().url().optional(),
});

export type ReportUserInput = z.infer<typeof reportUserSchema>;

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

export const bulkListingsSchema = z.object({
  listing_ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['delete', 'deactivate', 'archive']),
});

export type BulkListingsInput = z.infer<typeof bulkListingsSchema>;

// ============================================================================
// STATISTICS/ANALYTICS SCHEMAS
// ============================================================================

export const statsFilterSchema = z.object({
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  user_id: z.string().uuid().optional(),
});

export type StatsFilterInput = z.infer<typeof statsFilterSchema>;
