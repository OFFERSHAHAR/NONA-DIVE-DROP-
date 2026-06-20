/**
 * User Protection System Type Definitions
 * Comprehensive reputation, risk assessment, and blocking system
 * for instructors, listers, and service providers
 */

// ============================================================================
// REPUTATION & SCORING
// ============================================================================

export interface UserReputationScore {
  id: string;
  user_id: string;

  // Overall Score
  total_score: number; // 0-100

  // Activity Metrics
  completed_rentals: number;
  completed_trainings: number;
  completed_bookings: number;
  total_transactions: number;

  // Negative Indicators
  damage_count: number; // Equipment returned damaged
  non_payment_count: number; // Failed to pay
  instructor_complaints_count: number; // Complaints filed by providers
  cancellation_rate: number; // % of bookings cancelled by user
  no_show_count: number; // Didn't show up for booking

  // Positive Indicators
  positive_reviews: number;
  average_rating: number;
  on_time_completion_rate: number; // % completed on schedule

  // Status
  is_blacklisted: boolean;
  blacklist_reason?: string;
  blacklist_date?: string;
  blacklist_expiry?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ReputationHistory {
  id: string;
  user_id: string;

  // Change Details
  event_type:
    | 'booking_completed'
    | 'booking_cancelled'
    | 'damage_reported'
    | 'non_payment'
    | 'complaint_filed'
    | 'negative_review'
    | 'positive_review'
    | 'no_show'
    | 'manual_adjustment';

  score_change: number; // positive or negative
  new_score: number;

  // Reference
  related_booking_id?: string;
  related_complaint_id?: string;
  reason?: string;

  // Admin notes
  admin_notes?: string;

  created_at: string;
}

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

export interface RiskAssessmentResult {
  user_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number; // 0-100
  is_blocked_from_booking: boolean;
  is_blocked_from_renting: boolean;
  requires_deposit: boolean;
  requires_payment_upfront: boolean;
  requires_references: boolean;

  // Individual Risk Flags
  red_flags: RiskFlag[];

  // Assessment Details
  assessment_reason: string;
  last_assessed_at: string;
}

export interface RiskFlag {
  type:
    | 'equipment_damage_history'
    | 'non_payment_history'
    | 'provider_complaint'
    | 'low_reputation_score'
    | 'blacklisted'
    | 'high_cancellation_rate'
    | 'no_show_history'
    | 'outstanding_charges';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  data?: Record<string, any>;
}

// ============================================================================
// BLOCKING & RESTRICTIONS
// ============================================================================

export interface UserBlock {
  id: string;
  blocked_user_id: string; // The user being blocked
  blocking_user_id: string; // The provider/instructor doing the blocking
  user_type: 'instructor' | 'lister' | 'provider'; // What type of provider is doing the blocking

  // Block Details
  reason: string;
  created_reason_category:
    | 'behavior'
    | 'non_payment'
    | 'damage'
    | 'disrespect'
    | 'safety_concern'
    | 'other';

  // Restrictions
  can_book_services: boolean;
  can_send_messages: boolean;
  can_view_contact: boolean;

  // Status
  is_active: boolean;
  unblock_requested?: boolean;
  unblock_reason?: string;
  unblock_requested_at?: string;

  // Timestamps
  created_at: string;
  expires_at?: string; // Optional expiry date
}

export interface DepositRequirement {
  id: string;
  requiring_user_id: string; // Provider requiring deposit
  user_id: string; // User being asked
  requirement_type: 'damage_deposit' | 'booking_deposit' | 'full_amount';

  // Amount
  amount_required: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'refunded' | 'claimed';

  // Reference
  related_booking_id?: string;
  reason: string;

  // Payment
  payment_received_at?: string;
  payment_method?: string;
  stripe_charge_id?: string;

  // Refund
  refund_date?: string;
  refund_amount?: number;
  claim_date?: string;
  claim_description?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// INCIDENTS & COMPLAINTS
// ============================================================================

export interface UserComplaint {
  id: string;
  complainant_user_id: string;
  complained_against_user_id: string;
  related_booking_id: string;

  // Complaint Details
  complaint_type:
    | 'equipment_damage'
    | 'no_show'
    | 'non_payment'
    | 'safety_violation'
    | 'behavior'
    | 'false_claims'
    | 'other';

  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Evidence
  evidence_files?: string[]; // S3 URLs
  photos?: string[]; // S3 URLs

  // Status
  status: 'open' | 'under_review' | 'resolved' | 'dismissed' | 'appealed';
  resolution?: string;
  resolved_by_admin_id?: string;
  resolution_date?: string;

  // Appeal
  appeal_reason?: string;
  appeal_status?: 'pending' | 'accepted' | 'rejected';
  appeal_reviewed_by?: string;
  appeal_date?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// DAMAGE CLAIMS
// ============================================================================

export interface DamageClaim {
  id: string;
  lister_id: string; // Owner of equipment
  renter_id: string; // Person who rented it
  booking_id: string;

  // Damage Details
  item_name: string;
  item_value: number;
  damage_type: 'broken' | 'lost' | 'damaged' | 'wear_and_tear';
  damage_description: string;

  // Assessment
  damage_photos?: string[]; // S3 URLs
  estimated_repair_cost: number;
  claim_amount: number;

  // Status
  status: 'claimed' | 'under_review' | 'approved' | 'rejected' | 'paid';
  reviewed_by_admin_id?: string;
  review_notes?: string;

  // Payment
  payment_method?: string;
  payment_date?: string;
  payment_amount?: number;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// INSTRUCTOR/LISTER SETTINGS
// ============================================================================

export interface ProviderProtectionSettings {
  id: string;
  provider_id: string;
  provider_type: 'instructor' | 'lister' | 'provider';

  // Verification Requirements
  require_verified_users: boolean;
  minimum_reputation_score: number; // 0-100
  require_references: boolean;

  // Financial Protection
  auto_require_deposit: boolean;
  deposit_amount?: number;
  require_payment_upfront: boolean;

  // Approval Process
  require_booking_approval: boolean;
  auto_approve_returning_users: boolean;

  // Communication
  message_filter_enabled: boolean;
  block_unverified_messages: boolean;

  // Cancellation Policy
  strict_cancellation_enabled: boolean;
  cancellation_penalty_percent?: number;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface GetUserReputationRequest {
  user_id: string;
}

export interface GetUserReputationResponse extends UserReputationScore {
  risk_assessment: RiskAssessmentResult;
  recent_history?: ReputationHistory[];
}

export interface GetRiskAssessmentRequest {
  user_id: string;
}

export interface BlockUserRequest {
  blocked_user_id: string;
  reason: string;
  reason_category:
    | 'behavior'
    | 'non_payment'
    | 'damage'
    | 'disrespect'
    | 'safety_concern'
    | 'other';
  temporary?: boolean;
  expires_in_days?: number;
}

export interface BlockUserResponse {
  block_id: string;
  blocked_user_id: string;
  is_active: boolean;
  expires_at?: string;
}

export interface RequestDepositRequest {
  user_id: string;
  amount: number;
  requirement_type: 'damage_deposit' | 'booking_deposit' | 'full_amount';
  related_booking_id?: string;
  reason: string;
}

export interface FileComplaintRequest {
  complained_against_user_id: string;
  booking_id: string;
  complaint_type:
    | 'equipment_damage'
    | 'no_show'
    | 'non_payment'
    | 'safety_violation'
    | 'behavior'
    | 'false_claims'
    | 'other';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  evidence_files?: string[];
  photos?: string[];
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface IncomingBookingWithRisk {
  booking_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  reputation_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  red_flags: RiskFlag[];
  booking_date: string;
  booking_details: string;
  is_blocked: boolean;
}

export interface ProviderBlockedUsersList {
  blocked_users: Array<{
    user_id: string;
    user_name: string;
    user_avatar?: string;
    block_reason: string;
    blocked_at: string;
    expires_at?: string;
    can_unblock: boolean;
  }>;
  total_blocked: number;
}

export interface ProtectionDashboardStats {
  total_complaints: number;
  open_complaints: number;
  damage_claims_total: number;
  damage_claims_pending: number;
  blocked_users: number;
  pending_deposits: number;
  total_reputation_issues: number;
}
