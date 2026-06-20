import { z } from 'zod';

export const createFreeDivingListingSchema = z.object({
  listing_type: z.enum(['instructor', 'partner', 'group-session']),
  instructor_type: z.enum(['apnea-training', 'courses', 'competition', 'depth']).optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional().default(''),
  location: z.string().min(2, 'Location must be at least 2 characters').max(100, 'Location must be at most 100 characters'),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'professional']),
  max_participants: z.number().int().min(1).max(20).default(4),
  start_date: z.string().datetime().or(z.string().date()),
  end_date: z.string().datetime().or(z.string().date()),
  contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  contact_phone: z.string().regex(/^[0-9+\-().\s]+$/, 'Invalid phone number').optional().or(z.literal('')),
  contact_hidden: z.boolean().default(true),
  language_preference: z.string().default('he'),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional().default(''),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
}).refine((data) => {
  if (data.listing_type === 'instructor' && !data.instructor_type) {
    return false;
  }
  return true;
}, {
  message: 'Instructor type is required when listing type is "instructor"',
  path: ['instructor_type'],
});

export const updateFreeDivingListingSchema = createFreeDivingListingSchema.partial();

export const freeDivingInterestSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  message: z.string().max(500, 'Message must be at most 500 characters').optional().default(''),
});

export const freeDivingFiltersSchema = z.object({
  listing_type: z.enum(['instructor', 'partner', 'group-session']).optional(),
  instructor_type: z.enum(['apnea-training', 'courses', 'competition', 'depth']).optional(),
  location: z.string().optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'professional']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(12),
}).strict();

export type CreateFreeDivingListingInput = z.infer<typeof createFreeDivingListingSchema>;
export type UpdateFreeDivingListingInput = z.infer<typeof updateFreeDivingListingSchema>;
export type FreeDivingInterestInput = z.infer<typeof freeDivingInterestSchema>;
export type FreeDivingFiltersInput = z.infer<typeof freeDivingFiltersSchema>;
