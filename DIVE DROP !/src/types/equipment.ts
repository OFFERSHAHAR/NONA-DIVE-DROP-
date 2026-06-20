/**
 * Equipment Rental System Type Definitions
 * Complete TypeScript definitions for DIVE DROP equipment marketplace
 */

// ============================================================================
// STATUS & ENUM TYPES
// ============================================================================

export type EquipmentType =
  | 'fins'
  | 'wetsuit'
  | 'tank'
  | 'weights'
  | 'bcd'
  | 'regulator'
  | 'mask'
  | 'snorkel'
  | 'dive_computer'
  | 'torch'
  | 'knife'
  | 'camera'
  | 'clothing'
  | 'other';

export type EquipmentCondition =
  | 'excellent'  // Like new, minimal use
  | 'very_good'  // Some minor wear
  | 'good'       // Normal wear, fully functional
  | 'fair'       // Signs of use, fully functional
  | 'poor';      // Limited functionality, repair needed

export type RentalStatus =
  | 'pending'         // Renter requested, awaiting lister approval
  | 'approved'        // Lister approved rental
  | 'rejected'        // Lister rejected rental
  | 'active'          // Equipment currently rented out
  | 'returned'        // Equipment returned
  | 'damage_pending'  // Awaiting damage assessment
  | 'completed'       // Rental completed & assessed
  | 'cancelled';      // Rental cancelled

export type DamageLevel =
  | 'none'        // No damage
  | 'minor'       // Cosmetic only, no functional impact
  | 'moderate'    // Functional impact but repairable
  | 'major'       // Significant damage, expensive repair
  | 'total_loss'; // Equipment unusable

export type SizeType =
  | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'  // Clothing sizes
  | 'one_size'
  | 'numeric';  // For numeric specs like tank capacity

// ============================================================================
// EQUIPMENT LISTING TYPES
// ============================================================================

/**
 * Equipment listing posted by a lister
 */
export interface EquipmentListing {
  id: string;
  owner_id: string;  // User who owns/is renting out the equipment

  // Equipment Details
  equipment_type: EquipmentType;
  brand?: string;
  model?: string;
  description: string;

  // Specifications
  size?: string;
  condition: EquipmentCondition;
  year_purchased?: number;

  // Availability
  available_from: string;    // ISO date
  available_until: string;   // ISO date or null for indefinite
  location: {
    lat: number;
    lng: number;
  };
  location_name: string;     // "Tel Aviv, Israel"
  location_radius_km: number; // How far willing to travel for delivery

  // Pricing
  rental_price_per_day: number; // In cents (ILS)
  min_rental_days?: number;
  max_rental_days?: number;
  discount_per_week?: number; // Optional discount for 7+ days
  delivery_fee?: number;       // In cents, if applicable

  // Photos
  photo_urls: string[];       // Min 1, max 5

  // Status
  is_active: boolean;
  total_rentals: number;
  rating_average?: number;
  review_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Review for equipment listing
 */
export interface EquipmentReview {
  id: string;
  listing_id: string;
  rental_id: string;
  reviewer_id: string;   // The renter
  owner_id: string;

  rating: 1 | 2 | 3 | 4 | 5;
  condition_rating?: 1 | 2 | 3 | 4 | 5;
  communication_rating?: 1 | 2 | 3 | 4 | 5;

  comment?: string;
  tags?: string[];  // "clean", "durable", "quick_delivery", etc

  created_at: string;
}

// ============================================================================
// RENTAL REQUEST & ACTIVE RENTAL TYPES
// ============================================================================

/**
 * Equipment rental request/contract
 */
export interface EquipmentRental {
  id: string;

  // Parties involved
  lister_id: string;     // Equipment owner
  renter_id: string;     // Person renting the equipment
  listing_id: string;

  // Rental Period
  rental_start: string;  // ISO date
  rental_end: string;    // ISO date
  rental_days: number;   // Calculated from dates

  // Pricing & Commission
  daily_rate: number;    // Price per day in cents
  rental_cost: number;   // Total rental cost (daily_rate * rental_days) in cents
  commission_amount: number; // DIVE DROP commission in cents
  renter_total: number;  // What renter pays in cents
  lister_payout: number; // What lister receives after commission in cents

  // Delivery/Pickup
  delivery_method: 'pickup' | 'delivery' | 'shipped';
  delivery_cost?: number; // In cents if applicable
  delivery_address?: string;
  renter_contact?: string; // Phone/email for coordination

  // Status
  status: RentalStatus;
  rejected_reason?: string;

  // Damage Assessment
  damage_assessment_required: boolean;
  damage_photos?: string[];
  damage_level?: DamageLevel;
  damage_description?: string;
  damage_cost?: number; // Repair/replacement cost in cents
  damage_covered_by_insurance?: boolean;

  // Payment Details
  payment_request_id?: string;  // Bit payment request ID
  transaction_id?: string;      // After payment completed
  paid_at?: string;
  refund_id?: string;          // If refund issued
  refunded_at?: string;

  // Timestamps
  requested_at: string;
  approved_at?: string;
  active_from?: string;
  returned_at?: string;
  completed_at?: string;
  cancelled_at?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Insurance claim for equipment damage
 */
export interface EquipmentInsuranceClaim {
  id: string;
  rental_id: string;

  claim_type: 'damage' | 'loss' | 'theft';
  claim_status: 'pending' | 'approved' | 'rejected' | 'paid';

  damage_description: string;
  damage_photos: string[];
  damage_cost_estimate: number;

  claim_amount: number;
  approved_amount?: number;

  insurance_provider?: string;
  claim_reference?: string;

  submitted_at: string;
  resolved_at?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// MESSAGE & DISPUTE TYPES
// ============================================================================

/**
 * Message between lister and renter
 */
export interface EquipmentMessage {
  id: string;
  rental_id: string;

  sender_id: string;
  sender_role: 'lister' | 'renter';

  message_type: 'text' | 'image' | 'status_update';
  content: string;
  image_url?: string;

  is_read: boolean;
  read_at?: string;

  created_at: string;
}

/**
 * Dispute between lister and renter
 */
export interface EquipmentDispute {
  id: string;
  rental_id: string;

  initiated_by: 'lister' | 'renter';
  dispute_type: 'damage' | 'non_return' | 'other';
  description: string;

  evidence: string[];  // Photo URLs

  status: 'open' | 'in_review' | 'resolved' | 'cancelled';
  resolution?: string;

  opened_at: string;
  resolved_at?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// DASHBOARD & ANALYTICS TYPES
// ============================================================================

/**
 * Lister dashboard stats
 */
export interface ListerDashboard {
  listings_count: number;
  active_listings: number;
  inactive_listings: number;

  total_rentals: number;
  current_rentals: number;
  completed_rentals: number;

  total_earnings: number;     // In cents
  pending_payouts: number;    // In cents
  completed_payouts: number;  // In cents

  average_rating: number;
  total_reviews: number;

  response_time_hours: number;
  acceptance_rate: number;    // 0-100
}

/**
 * Renter rental history
 */
export interface RenterHistory {
  rentals_completed: number;
  active_rentals: number;
  total_spent: number;        // In cents

  average_rating_received: number;
  damage_claims: number;
  disputes_initiated: number;

  cancellations: number;
  no_shows: number;
}

/**
 * Equipment rental analytics for admin
 */
export interface EquipmentAnalytics {
  total_listings: number;
  total_rentals: number;
  active_rentals: number;

  total_platform_revenue: number;  // In cents (commissions)
  total_lister_payouts: number;    // In cents

  average_equipment_price: number;
  average_rental_duration: number;

  most_popular_equipment: EquipmentType[];
  damage_rate: number;  // Percentage
  dispute_rate: number; // Percentage

  by_equipment_type: Record<EquipmentType, {
    count: number;
    avg_price: number;
    rating_avg: number;
  }>;
}

// ============================================================================
// REQUEST & FORM TYPES
// ============================================================================

/**
 * Request body for creating equipment listing
 */
export interface CreateEquipmentListingRequest {
  equipment_type: EquipmentType;
  brand?: string;
  model?: string;
  description: string;

  size?: string;
  condition: EquipmentCondition;
  year_purchased?: number;

  available_from: string;
  available_until: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  location_radius_km?: number;

  rental_price_per_day: number;
  min_rental_days?: number;
  max_rental_days?: number;
  discount_per_week?: number;
  delivery_fee?: number;

  photo_urls: string[];
}

/**
 * Request body for requesting a rental
 */
export interface RequestEquipmentRentalRequest {
  listing_id: string;
  rental_start: string;
  rental_end: string;

  delivery_method: 'pickup' | 'delivery' | 'shipped';
  delivery_address?: string;
  renter_contact: string;
}

/**
 * Request body for lister to approve/reject rental
 */
export interface ApproveEquipmentRentalRequest {
  status: 'approved' | 'rejected';
  rejected_reason?: string;
}

/**
 * Request body for returning equipment
 */
export interface ReturnEquipmentRequest {
  damage_level: DamageLevel;
  damage_description?: string;
  damage_photos?: string[];
  damage_cost?: number;
}

/**
 * Request body for reviewing equipment
 */
export interface CreateEquipmentReviewRequest {
  rental_id: string;
  listing_id: string;

  rating: 1 | 2 | 3 | 4 | 5;
  condition_rating?: 1 | 2 | 3 | 4 | 5;
  communication_rating?: 1 | 2 | 3 | 4 | 5;

  comment?: string;
  tags?: string[];
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Complete equipment listing with related data
 */
export interface EquipmentListingDetail extends EquipmentListing {
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  reviews?: EquipmentReview[];
}

/**
 * Complete rental with all details
 */
export interface EquipmentRentalDetail extends EquipmentRental {
  listing?: EquipmentListing;
  lister?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  renter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  messages?: EquipmentMessage[];
  dispute?: EquipmentDispute;
  insurance_claim?: EquipmentInsuranceClaim;
}

/**
 * Search results
 */
export interface EquipmentSearchResult {
  listing: EquipmentListingDetail;
  availability_status: 'available' | 'unavailable' | 'limited';
  distance_km?: number;
}

/**
 * Paginated response
 */
export interface PaginatedEquipmentResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Equipment rental payment info for Bit
 */
export interface EquipmentRentalPaymentInfo {
  rental_id: string;
  renter_id: string;
  lister_id: string;
  amount_cents: number;
  description: string;
  payment_request_id?: string;
  qr_code?: string;
  payment_link?: string;
}
