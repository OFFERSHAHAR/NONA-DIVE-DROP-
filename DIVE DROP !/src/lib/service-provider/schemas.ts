import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum ProviderType {
  INSTRUCTOR = 'instructor',
  SHOP = 'shop',
  GUIDE = 'guide',
  BOAT_OPERATOR = 'boat_operator',
  RENTAL = 'rental',
  PHOTOGRAPHY = 'photography',
}

export enum ServiceCategory {
  TRAINING = 'training',
  GUIDING = 'guiding',
  EQUIPMENT = 'equipment',
  BOAT = 'boat',
  PHOTOGRAPHY = 'photography',
  TRANSPORT = 'transport',
}

export enum ProviderStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ============================================================================
// SERVICE PROVIDER PROFILE SCHEMAS
// ============================================================================

export const createProviderProfileSchema = z.object({
  business_name: z.string()
    .min(3, 'Business name must be at least 3 characters')
    .max(200, 'Business name must be less than 200 characters'),

  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters'),

  phone: z.string()
    .regex(/^\d{7,20}$/, 'Phone must be 7-20 digits'),

  email: z.string()
    .email('Invalid email address'),

  website_url: z.string()
    .url('Invalid URL')
    .optional()
    .nullable(),

  provider_type: z.nativeEnum(ProviderType),

  license_number: z.string()
    .max(100)
    .optional()
    .nullable(),

  license_expiry: z.string()
    .datetime()
    .optional()
    .nullable(),

  insurance_provider: z.string()
    .max(100)
    .optional()
    .nullable(),

  insurance_expiry: z.string()
    .datetime()
    .optional()
    .nullable(),

  years_experience: z.number()
    .int()
    .min(0, 'Years of experience cannot be negative')
    .max(100, 'Years of experience seems unrealistic')
    .optional(),

  certifications: z.array(z.string().max(200))
    .max(20, 'Maximum 20 certifications')
    .optional(),

  primary_location: z.string()
    .min(5, 'Location must be at least 5 characters')
    .max(255, 'Location must be less than 255 characters'),

  latitude: z.number()
    .min(-90)
    .max(90)
    .optional(),

  longitude: z.number()
    .min(-180)
    .max(180)
    .optional(),

  service_radius_km: z.number()
    .int()
    .min(1, 'Service radius must be at least 1 km')
    .max(500, 'Service radius must be less than 500 km')
    .default(50),
});

export type CreateProviderProfileInput = z.infer<typeof createProviderProfileSchema>;

export const updateProviderProfileSchema = createProviderProfileSchema.partial();
export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;

// ============================================================================
// SERVICE SCHEMAS
// ============================================================================

export const createServiceSchema = z.object({
  name: z.string()
    .min(5, 'Service name must be at least 5 characters')
    .max(200, 'Service name must be less than 200 characters'),

  description: z.string()
    .min(20, 'Service description must be at least 20 characters')
    .max(2000, 'Service description must be less than 2000 characters'),

  service_category: z.nativeEnum(ServiceCategory),

  price_shekel: z.number()
    .min(0.01, 'Price must be greater than 0')
    .max(100000, 'Price seems unrealistic'),

  duration_minutes: z.number()
    .int()
    .min(15, 'Minimum duration is 15 minutes')
    .max(1440, 'Maximum duration is 24 hours')
    .optional(),

  group_size_min: z.number()
    .int()
    .min(1, 'Minimum group size must be at least 1')
    .max(100, 'Minimum group size seems unrealistic')
    .default(1),

  group_size_max: z.number()
    .int()
    .min(1, 'Maximum group size must be at least 1')
    .max(100, 'Maximum group size seems unrealistic')
    .default(10),

  available_mon: z.boolean().default(true),
  available_tue: z.boolean().default(true),
  available_wed: z.boolean().default(true),
  available_thu: z.boolean().default(true),
  available_fri: z.boolean().default(true),
  available_sat: z.boolean().default(true),
  available_sun: z.boolean().default(true),

  start_hour: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    .optional(),

  end_hour: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    .optional(),

  min_experience_level: z.enum(['beginner', 'intermediate', 'advanced'])
    .optional(),

  certification_required: z.string()
    .max(200)
    .optional(),

  booking_required: z.boolean().default(true),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const createReviewSchema = z.object({
  provider_id: z.string()
    .uuid('Invalid provider ID'),

  rating: z.number()
    .int()
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating must be at most 5 stars'),

  title: z.string()
    .max(200, 'Review title must be less than 200 characters')
    .optional(),

  comment: z.string()
    .min(10, 'Review must be at least 10 characters')
    .max(5000, 'Review must be less than 5000 characters'),

  safety_rating: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),

  professionalism_rating: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),

  value_rating: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),

  title: z.string()
    .max(200)
    .optional(),

  comment: z.string()
    .min(10)
    .max(5000)
    .optional(),

  safety_rating: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),

  professionalism_rating: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),

  value_rating: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

export const createBookingSchema = z.object({
  service_id: z.string()
    .uuid('Invalid service ID'),

  booking_date: z.string()
    .date(),

  start_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),

  group_size: z.number()
    .int()
    .min(1, 'Group size must be at least 1')
    .max(100, 'Group size seems unrealistic'),

  special_requests: z.string()
    .max(1000, 'Special requests must be less than 1000 characters')
    .optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),

  provider_notes: z.string()
    .max(1000, 'Provider notes must be less than 1000 characters')
    .optional(),
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

// ============================================================================
// SEARCH & FILTER SCHEMAS
// ============================================================================

export const searchProvidersSchema = z.object({
  page: z.coerce.number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  search: z.string()
    .max(255)
    .optional(),

  provider_type: z.nativeEnum(ProviderType)
    .optional(),

  service_category: z.nativeEnum(ServiceCategory)
    .optional(),

  location: z.string()
    .max(255)
    .optional(),

  latitude: z.number()
    .min(-90)
    .max(90)
    .optional(),

  longitude: z.number()
    .min(-180)
    .max(180)
    .optional(),

  radius_km: z.number()
    .int()
    .min(1)
    .max(500)
    .default(50),

  min_rating: z.number()
    .min(0)
    .max(5)
    .default(0),

  price_min: z.number()
    .min(0)
    .default(0),

  price_max: z.number()
    .min(0)
    .default(100000),

  is_verified: z.boolean()
    .optional(),

  sort_by: z.enum(['rating', 'price_asc', 'price_desc', 'distance', 'newest'])
    .default('rating'),
});

export type SearchProvidersInput = z.infer<typeof searchProvidersSchema>;

// ============================================================================
// AVAILABILITY SCHEMAS
// ============================================================================

export const createAvailabilitySchema = z.object({
  available_date: z.string()
    .date(),

  start_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),

  end_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),

  max_bookings: z.number()
    .int()
    .min(1)
    .default(1),
});

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

export const blockAvailabilitySchema = z.object({
  available_date: z.string()
    .date(),

  start_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),

  end_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),

  block_reason: z.string()
    .max(500)
    .optional(),
});

export type BlockAvailabilityInput = z.infer<typeof blockAvailabilitySchema>;

// ============================================================================
// GALLERY SCHEMAS
// ============================================================================

export const createGalleryItemSchema = z.object({
  url: z.string()
    .url('Invalid URL'),

  media_type: z.enum(['image', 'video']),

  title: z.string()
    .max(200)
    .optional(),

  description: z.string()
    .max(1000)
    .optional(),

  is_featured: z.boolean()
    .default(false),
});

export type CreateGalleryItemInput = z.infer<typeof createGalleryItemSchema>;

// ============================================================================
// MODERATION SCHEMAS
// ============================================================================

export const updateProviderStatusSchema = z.object({
  status: z.nativeEnum(ProviderStatus),
  reason: z.string()
    .max(1000)
    .optional(),
});

export type UpdateProviderStatusInput = z.infer<typeof updateProviderStatusSchema>;

export const approveProviderSchema = z.object({
  reason: z.string()
    .max(1000)
    .optional(),
});

export type ApproveProviderInput = z.infer<typeof approveProviderSchema>;

export const suspendProviderSchema = z.object({
  reason: z.string()
    .min(10, 'Suspension reason must be provided')
    .max(1000),

  duration_days: z.number()
    .int()
    .min(1)
    .max(365)
    .optional(),
});

export type SuspendProviderInput = z.infer<typeof suspendProviderSchema>;

// ============================================================================
// REPORT SCHEMAS
// ============================================================================

export const reportProviderSchema = z.object({
  provider_id: z.string()
    .uuid('Invalid provider ID'),

  reason: z.enum([
    'fake_profile',
    'inappropriate_content',
    'harassment',
    'unsafe_practices',
    'fraud',
    'misleading_info',
    'other'
  ]),

  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
});

export type ReportProviderInput = z.infer<typeof reportProviderSchema>;

export const reportReviewSchema = z.object({
  review_id: z.string()
    .uuid('Invalid review ID'),

  reason: z.enum([
    'fake_review',
    'inappropriate_content',
    'harassment',
    'competitive_sabotage',
    'other'
  ]),

  description: z.string()
    .min(10)
    .max(1000)
    .optional(),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
