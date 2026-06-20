/**
 * TypeScript types for Dive Drop Buddy Matching System
 * Israeli Diving Buddy Matching Platform
 */

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export type DivingLevel = 'beginner' | 'intermediate' | 'advanced' | 'divemaster';

export type DiveType = 'reef' | 'boat' | 'cave' | 'wreck' | 'deep' | 'technical';

export type ListingStatus = 'active' | 'archived' | 'expired';

export type InterestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

// ============================================================================
// DATABASE MODELS
// ============================================================================

/**
 * Buddy Listing - A diver seeking a buddy
 * Contact information is kept private until explicitly revealed
 */
export interface BuddyListing {
  id: string;
  user_id: string;

  // Location and dates
  location: string;
  latitude?: number;
  longitude?: number;
  date_from: string; // ISO 8601 timestamp
  date_to: string;   // ISO 8601 timestamp

  // Diving preferences
  diving_level: DivingLevel;
  dive_type: DiveType[];
  description?: string;

  // Language support
  languages: string[];

  // Group size preference
  group_size_min: number;
  group_size_max: number;

  // Status
  status: ListingStatus;

  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Create/Update Buddy Listing Request
 */
export interface CreateBuddyListingInput {
  location: string;
  latitude?: number;
  longitude?: number;
  date_from: string;
  date_to: string;
  diving_level: DivingLevel;
  dive_type: DiveType[];
  description?: string;
  languages?: string[];
  group_size_min?: number;
  group_size_max?: number;
  expires_at?: string; // If not provided, defaults to date_to
}

export interface UpdateBuddyListingInput
  extends Partial<CreateBuddyListingInput> {}

/**
 * Buddy Interest - User's interest in another user's listing
 */
export interface BuddyInterest {
  id: string;
  listing_id: string;
  interested_user_id: string;

  // Message from interested user
  message?: string;

  // Status
  status: InterestStatus;

  // Contact reveal timestamp
  contact_info_revealed_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Create Buddy Interest Request
 */
export interface CreateBuddyInterestInput {
  listing_id: string;
  message?: string;
}

/**
 * Update Buddy Interest Request
 */
export interface UpdateBuddyInterestInput {
  status?: InterestStatus;
  message?: string;
}

/**
 * Buddy Connection - Approved connection between two divers
 */
export interface BuddyConnection {
  id: string;
  user_id_1: string; // Normalized: user_id_1 < user_id_2
  user_id_2: string;

  // Connection details
  meeting_date?: string;
  location?: string;
  dive_type?: DiveType;

  // Contact visibility
  contact_info_visible: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Update Buddy Connection Request
 */
export interface UpdateBuddyConnectionInput {
  meeting_date?: string;
  location?: string;
  dive_type?: DiveType;
  contact_info_visible?: boolean;
}

/**
 * Buddy Message - Direct message between connected buddies
 */
export interface BuddyMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  connection_id?: string;

  message: string;

  // Message status
  read_at?: string;

  // Timestamp
  created_at: string;
}

/**
 * Create Buddy Message Request
 */
export interface SendBuddyMessageInput {
  receiver_id: string;
  message: string;
  connection_id?: string;
}

// ============================================================================
// PROFILE & USER RELATED
// ============================================================================

/**
 * Buddy Profile - User profile visible to other divers
 * Contact info is only visible after connections are made
 */
export interface BuddyProfile {
  user_id: string;
  email?: string; // Hidden until authorized
  full_name?: string;
  avatar_url?: string;
  diving_level?: DivingLevel;
  bio?: string;
  phone?: string; // Hidden until authorized
  show_contact_info: boolean;
}

/**
 * Extended User Metadata (stored in auth.users.raw_user_meta_data)
 */
export interface BuddyUserMetadata {
  full_name?: string;
  avatar_url?: string;
  diving_level?: DivingLevel;
  bio?: string;
  phone?: string;
  languages?: string[];
  diving_experience_years?: number;
  certifications?: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Listing with owner profile (for browsing)
 */
export interface ListingWithProfile extends BuddyListing {
  owner: BuddyProfile;
}

/**
 * Interest with listing and profile details
 */
export interface InterestWithDetails extends BuddyInterest {
  listing: BuddyListing;
  interested_user: BuddyProfile;
}

/**
 * Connection with both user profiles
 */
export interface ConnectionWithProfiles extends BuddyConnection {
  user_1: BuddyProfile;
  user_2: BuddyProfile;
}

/**
 * Search/Filter parameters for listings
 */
export interface ListingsFilterParams {
  // Location (supports partial matching)
  location?: string;

  // Date range filter
  date_from?: string;
  date_to?: string;

  // Diving preferences
  diving_level?: DivingLevel;
  dive_types?: DiveType[];

  // Language preference
  languages?: string[];

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'created_at' | 'date_from' | 'expires_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Messages conversation thread
 */
export interface MessageThread {
  connection_id: string;
  other_user_id: string;
  other_user_profile: BuddyProfile;
  last_message?: BuddyMessage;
  unread_count: number;
  messages: BuddyMessage[];
}

// ============================================================================
// STORED PROCEDURE TYPES
// ============================================================================

/**
 * Result of accepting a buddy interest
 */
export interface AcceptInterestResult {
  connection_id: string;
  listing_id: string;
  listing_owner_id: string;
  interested_user_id: string;
}

/**
 * Result of rejecting a buddy interest
 */
export interface RejectInterestResult {
  interest_id: string;
  status: InterestStatus;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation result for listing creation/update
 */
export interface ListingValidation {
  is_valid: boolean;
  errors?: {
    field: keyof CreateBuddyListingInput;
    message: string;
  }[];
}

/**
 * Validation result for interest creation
 */
export interface InterestValidation {
  is_valid: boolean;
  errors?: {
    field: string;
    message: string;
  }[];
  user_already_interested?: boolean;
  listing_expired?: boolean;
  own_listing?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DIVING_LEVELS: DivingLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'divemaster',
];

export const DIVE_TYPES: DiveType[] = [
  'reef',
  'boat',
  'cave',
  'wreck',
  'deep',
  'technical',
];

export const LISTING_STATUSES: ListingStatus[] = [
  'active',
  'archived',
  'expired',
];

export const INTEREST_STATUSES: InterestStatus[] = [
  'pending',
  'accepted',
  'rejected',
  'cancelled',
];

export const HEBREW_LABELS: Record<string, string> = {
  beginner: 'מתחיל',
  intermediate: 'ביניים',
  advanced: 'מתקדם',
  divemaster: 'דיוומאסטר',
  reef: 'אלמוגים',
  boat: 'סירה',
  cave: 'מערה',
  wreck: 'ספינת שריון',
  deep: 'עמוק',
  technical: 'טכני',
  active: 'פעיל',
  archived: 'בארכיון',
  expired: 'פג',
  pending: 'ממתין',
  accepted: 'התקבל',
  rejected: 'דחוי',
  cancelled: 'בוטל',
};

// ============================================================================
// RLS & SECURITY TYPES
// ============================================================================

/**
 * User authorization context
 */
export interface AuthContext {
  user_id?: string;
  is_authenticated: boolean;
}

/**
 * RLS policy result
 */
export interface RLSCheck {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  reason?: string;
}
