import { z } from 'zod';

// Booking status enum
export const BookingStatus = {
  DRAFT: 'draft',
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
} as const;

export type BookingStatusType = (typeof BookingStatus)[keyof typeof BookingStatus];

// Booking item status enum
export const BookingItemStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Create booking schema
export const createBookingSchema = z.object({
  buddy_user_id: z.string().uuid('Invalid buddy user ID'),
  dive_date: z.string().datetime('Invalid date format'),
  dive_site_id: z.string().uuid('Invalid dive site ID'),
  custom_location: z.string().optional(),
  service_provider_id: z.string().uuid('Invalid service provider ID').optional(),
  max_depth: z.number().positive().max(130, 'Depth exceeds safe limits'),
  water_temp: z.number().min(0).max(40),
  equipment_needed: z.array(z.string()).optional(),
  special_requirements: z.string().max(500).optional(),
  number_of_divers: z.number().int().positive().max(10),
  estimated_duration: z.number().positive().max(240), // minutes
});

// Update booking schema (partial)
export const updateBookingSchema = createBookingSchema.partial();

// Confirm booking schema (provider action)
export const confirmBookingSchema = z.object({
  confirm: z.boolean(),
  notes: z.string().max(1000).optional(),
});

// Complete booking schema (after dive)
export const completeBookingSchema = z.object({
  actual_duration: z.number().positive(),
  depth_achieved: z.number().positive(),
  location: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Booking review/rating schema
export const bookingReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review_text: z.string().min(10).max(1000),
  would_recommend: z.boolean(),
});

// List bookings filter schema
export const listBookingsFilterSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().int().min(1).max(100)),
  status: z.enum(['all', 'draft', 'pending_confirmation', 'confirmed', 'completed', 'cancelled', 'rejected']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  dive_site_id: z.string().uuid().optional(),
  sort_by: z.enum(['date', 'status', 'created']).optional().default('date'),
});

// Admin list bookings schema
export const adminListBookingsSchema = listBookingsFilterSchema.extend({
  user_id: z.string().uuid().optional(),
  provider_id: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

// Payment details schema
export const paymentDetailsSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('ILS'),
  payment_method: z.enum(['credit_card', 'paypal', 'bank_transfer']),
  transaction_id: z.string().optional(),
});

// Type exports
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type CompleteBookingInput = z.infer<typeof completeBookingSchema>;
export type BookingReviewInput = z.infer<typeof bookingReviewSchema>;
export type ListBookingsFilterInput = z.infer<typeof listBookingsFilterSchema>;
export type AdminListBookingsInput = z.infer<typeof adminListBookingsSchema>;
export type PaymentDetailsInput = z.infer<typeof paymentDetailsSchema>;
