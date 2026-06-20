import { z } from 'zod';

export const createBuddyListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional().default(''),
  location: z.string().min(2, 'Location must be at least 2 characters').max(100, 'Location must be at most 100 characters'),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'professional']),
  dive_type: z.enum(['reef', 'wreck', 'open_water', 'cave', 'boat', 'shore']),
  max_divers: z.number().int().min(1).max(20).default(4),
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
});

export const updateBuddyListingSchema = createBuddyListingSchema.partial();

export const buddyInterestSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  message: z.string().max(500, 'Message must be at most 500 characters').optional().default(''),
});

export const revealContactSchema = z.object({
  interest_id: z.string().uuid('Invalid interest ID'),
});

export const buddyFiltersSchema = z.object({
  location: z.string().optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'professional']).optional(),
  dive_type: z.enum(['reef', 'wreck', 'open_water', 'cave', 'boat', 'shore']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  max_divers: z.number().int().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(12),
}).strict();

export type CreateBuddyListingInput = z.infer<typeof createBuddyListingSchema>;
export type UpdateBuddyListingInput = z.infer<typeof updateBuddyListingSchema>;
export type BuddyInterestInput = z.infer<typeof buddyInterestSchema>;
export type RevealContactInput = z.infer<typeof revealContactSchema>;
export type BuddyFiltersInput = z.infer<typeof buddyFiltersSchema>;
