/**
 * Booking System Type Definitions
 * Complete TypeScript definitions for the DIVE DROP booking marketplace
 */

// ============================================================================
// STATUS & ENUM TYPES
// ============================================================================

export type BookingStatus =
  | 'pending'          // Awaiting provider response
  | 'confirmed'        // Provider accepted, awaiting payment
  | 'in_progress'      // Dive happening now
  | 'completed'        // Dive finished, awaiting reviews
  | 'cancelled'        // Cancelled by diver or provider
  | 'declined'         // Provider rejected
  | 'no_show'          // Diver/provider didn't show up
  | 'reviewed';        // Both parties reviewed

export type ServiceType =
  | 'recreational'
  | 'technical'
  | 'rescue'
  | 'photography';

export type DifficultyLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'instructor';

export type GuideType = 'group' | 'private';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type PayoutStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type BusinessType =
  | 'dive_center'
  | 'instructor'
  | 'boat_operator'
  | 'rental_shop';

export type ServiceCategory =
  | 'recreational_dive'
  | 'technical_dive'
  | 'rescue_training'
  | 'certification'
  | 'specialty'
  | 'equipment_rental'
  | 'boat_charter';

export type PaymentMethod =
  | 'stripe'
  | 'paypal'
  | 'bank_transfer'
  | 'credit_card';

// ============================================================================
// BOOKING TYPES
// ============================================================================

/**
 * Core booking record connecting 2 divers with 1 service provider
 */
export interface Booking {
  id: string;

  // Party Information
  diver_1_id: string;
  diver_2_id: string;
  provider_id: string;

  // Booking Details
  dive_site_id: string;
  booking_date: string;              // YYYY-MM-DD
  booking_time: string;              // HH:MM
  duration_minutes: number;          // 30-180
  max_depth?: number;
  difficulty_level: DifficultyLevel;
  group_size: number;
  special_requests?: string;

  // Service Details
  service_type: ServiceType;
  equipment_provided: boolean;
  guide_type: GuideType;

  // Status & Timestamps
  status: BookingStatus;
  provider_response?: 'confirmed' | 'declined';
  provider_response_at?: string;
  decline_reason?: string;

  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;

  // Pricing
  service_price: number;
  commission_amount: number;
  total_price: number;
  commission_percentage: number;

  // Review Status
  diver_1_reviewed: boolean;
  diver_2_reviewed: boolean;
  provider_reviewed: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Line item in a booking (specific services included)
 */
export interface BookingItem {
  id: string;
  booking_id: string;

  service_id: string;
  service_name: string;
  service_category: 'guide' | 'equipment' | 'boat' | 'transportation' | 'certification' | 'specialty';

  quantity: number;
  unit_price: number;
  total_price: number;

  created_at: string;
}

/**
 * Message in booking conversation
 */
export interface BookingMessage {
  id: string;
  booking_id: string;

  sender_id: string;
  sender_type: 'diver' | 'provider';

  message_type: 'text' | 'system' | 'update' | 'attachment';
  content: string;

  is_read: boolean;
  read_at?: string;

  created_at: string;
}

/**
 * Audit trail for booking status changes
 */
export interface BookingStatusHistory {
  id: string;
  booking_id: string;

  old_status?: BookingStatus;
  new_status: BookingStatus;

  changed_by_user_id?: string;
  changed_by_type: 'diver' | 'provider' | 'admin' | 'system';

  reason?: string;

  created_at: string;
}

// ============================================================================
// SERVICE PROVIDER TYPES
// ============================================================================

/**
 * Service provider (dive center, instructor, boat operator, etc)
 */
export interface ServiceProvider {
  id: string;
  user_id: string;

  // Basic Info
  business_name: string;
  business_type: BusinessType;
  description?: string;

  // Location & Service Area
  primary_location: {
    lat: number;
    lng: number;
  };
  service_radius_km: number;
  cities_served: string[];

  // Contact
  phone?: string;
  website_url?: string;
  social_media?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };

  // Verification & Credentials
  verified: boolean;
  verified_at?: string;

  certifications: string[];           // PADI, IANTD, etc
  insurance_provider?: string;
  insurance_policy_number?: string;

  // Ratings & Stats
  rating_average?: number;
  review_count: number;
  completed_bookings: number;
  response_time_hours: number;

  // Business Settings
  commission_percentage: number;
  bank_account_verified: boolean;
  payout_frequency: 'weekly' | 'monthly';

  // Status
  is_active: boolean;
  onboarding_completed: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Individual service offering from a provider
 */
export interface Service {
  id: string;
  provider_id: string;

  // Details
  service_name: string;
  service_category: ServiceCategory;
  description?: string;

  // Duration & Availability
  min_duration_minutes: number;
  max_duration_minutes: number;

  // Pricing
  base_price: number;
  price_per_extra_diver?: number;

  // Requirements
  min_certification_level?: DifficultyLevel;
  max_group_size?: number;

  // Features
  equipment_provided: boolean;
  includes_guide: boolean;
  includes_photography: boolean;
  special_features: string[];

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Provider availability calendar
 */
export interface ProviderAvailability {
  id: string;
  provider_id: string;

  availability_date: string;          // YYYY-MM-DD

  // Time slots (30-min granularity)
  available_slots: Array<{
    start: string;                    // HH:MM
    end: string;                      // HH:MM
    capacity: number;
  }>;

  // Overrides
  is_blocked: boolean;
  blocked_reason?: string;

  // Capacity tracking
  max_daily_bookings?: number;
  current_bookings: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PAYMENT & PAYOUT TYPES
// ============================================================================

/**
 * Payment record for booking
 */
export interface BookingPayment {
  id: string;
  booking_id: string;

  // Payer information
  payer_id: string;
  payer_type: 'diver_1' | 'diver_2';

  // Amount breakdown
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  tax_amount: number;

  // Payment method
  payment_method: PaymentMethod;
  payment_reference?: string;

  // Status
  payment_status: PaymentStatus;
  payment_gateway_response?: Record<string, any>;

  // Error handling
  error_message?: string;
  retry_count: number;

  // Timestamps
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Provider payout record
 */
export interface ProviderPayout {
  id: string;
  provider_id: string;

  // Payout period
  payout_period_start: string;        // YYYY-MM-DD
  payout_period_end: string;          // YYYY-MM-DD

  // Earnings
  gross_earnings: number;
  commission_paid: number;
  net_earnings: number;

  // Completed bookings
  booking_count: number;

  // Payout details
  payout_method: 'bank_transfer' | 'stripe_connect';
  account_reference?: string;

  // Status
  payout_status: PayoutStatus;
  gateway_response?: Record<string, any>;

  // Timestamps
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REVIEW & RATING TYPES
// ============================================================================

/**
 * Review for service provider by diver
 */
export interface ProviderReview {
  id: string;
  booking_id: string;
  provider_id: string;
  reviewer_id: string;

  // Overall rating
  rating: 1 | 2 | 3 | 4 | 5;

  // Detailed ratings
  professionalism_rating?: 1 | 2 | 3 | 4 | 5;
  safety_rating?: 1 | 2 | 3 | 4 | 5;
  instruction_quality_rating?: 1 | 2 | 3 | 4 | 5;
  equipment_condition_rating?: 1 | 2 | 3 | 4 | 5;

  // Content
  title?: string;
  comment?: string;

  // Tags
  experience_tags?: string[];

  // Provider response
  response_from_provider?: string;
  responded_at?: string;

  // Verification
  is_verified_booking: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REQUEST & FORM TYPES
// ============================================================================

/**
 * Request body for creating a new booking
 */
export interface CreateBookingRequest {
  diver_1_id: string;
  diver_2_id: string;
  provider_id: string;
  dive_site_id: string;

  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  max_depth?: number;
  difficulty_level: DifficultyLevel;

  service_type: ServiceType;
  guide_type: GuideType;
  equipment_provided?: boolean;
  special_requests?: string;
}

/**
 * Request body for updating booking status
 */
export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  reason?: string;
  provider_response?: 'confirmed' | 'declined';
  decline_reason?: string;
}

/**
 * Request body for cancelling booking
 */
export interface CancelBookingRequest {
  cancellation_reason: string;
  cancelled_by: 'diver' | 'provider';
}

/**
 * Request body for posting a review
 */
export interface CreateReviewRequest {
  reviewer_id: string;
  rating: 1 | 2 | 3 | 4 | 5;

  professionalism_rating?: 1 | 2 | 3 | 4 | 5;
  safety_rating?: 1 | 2 | 3 | 4 | 5;
  instruction_quality_rating?: 1 | 2 | 3 | 4 | 5;
  equipment_condition_rating?: 1 | 2 | 3 | 4 | 5;

  title?: string;
  comment?: string;
  experience_tags?: string[];
}

/**
 * Request body for posting a message
 */
export interface SendMessageRequest {
  content: string;
  message_type?: 'text' | 'system' | 'attachment';
}

/**
 * Request body for processing payment
 */
export interface ProcessPaymentRequest {
  payment_method: PaymentMethod;
  amount: number;
  currency: 'USD' | 'ILS' | 'EUR' | 'GBP';
  payer_type: 'diver_1' | 'diver_2';
  token: string;
}

/**
 * Request body for setting availability
 */
export interface SetAvailabilityRequest {
  date: string;
  slots: Array<{
    start: string;
    end: string;
    capacity: number;
  }>;
  is_blocked?: boolean;
}

/**
 * Request body for blocking dates
 */
export interface BlockDatesRequest {
  date_from: string;
  date_to: string;
  reason: string;
}

// ============================================================================
// RESPONSE & AGGREGATE TYPES
// ============================================================================

/**
 * Complete booking with related data
 */
export interface BookingDetail extends Booking {
  diver_1?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    diving_experience: DifficultyLevel;
  };
  diver_2?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    diving_experience: DifficultyLevel;
  };
  provider?: ServiceProvider;
  dive_site?: {
    id: string;
    name: string;
    location: string;
    depth: number;
  };
  items?: BookingItem[];
  messages?: BookingMessage[];
  payments?: BookingPayment[];
  reviews?: {
    diver_1_review?: ProviderReview;
    diver_2_review?: ProviderReview;
    provider_review?: ProviderReview;
  };
}

/**
 * Provider search result with availability info
 */
export interface ProviderSearchResult {
  provider: ServiceProvider;
  availability_status: 'available' | 'unavailable' | 'limited';
  available_slots?: string[];
  services: Service[];
  reviews: ProviderReview[];
  rating_summary?: {
    avg: number;
    count: number;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Payment status summary
 */
export interface PaymentStatusSummary {
  diver_1_paid: boolean;
  diver_2_paid: boolean;
  total_paid: number;
  remaining: number;
  status: 'pending' | 'partial_payment' | 'paid';
}

/**
 * Booking request notification
 */
export interface BookingRequestNotification {
  booking_id: string;
  diver_1: { name: string; rating: number };
  diver_2: { name: string; rating: number };
  dive_site: string;
  date: string;
  time: string;
  commission: number;
  received_at: string;
}
