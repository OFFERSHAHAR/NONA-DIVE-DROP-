/**
 * DIVE DROP: Free Diving TypeScript Types
 * Complete type definitions for freediving instructors, services, buddy listings, sessions, and bookings
 */

import type { Json } from './supabase';

// ============================================================================
// ENUMS - Match Supabase enums exactly
// ============================================================================

export type FreedivingCredentialType = 'AIDA' | 'IANTD' | 'PADI' | 'CMAS' | 'SSI' | 'OTHER';

export type FreedivingLevel = 'recreational' | 'intermediate' | 'advanced' | 'instructor' | 'master_instructor';

export type FreedivingServiceType = 'apnea' | 'courses' | 'partner' | 'competition' | 'depth' | 'meditation' | 'safety' | 'rescue';

export type FreedivingSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type FreedivingBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type InsuranceStatus = 'active' | 'expired' | 'pending_renewal';

// ============================================================================
// 1. INSTRUCTOR CREDENTIALS
// ============================================================================

export interface InstructorCredential {
  id: string;
  credential_type: FreedivingCredentialType;
  level: FreedivingLevel;
  certification_number: string;
  issue_date: string; // DATE
  expiry_date: string; // DATE
  issuing_organization: string;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null; // TIMESTAMPTZ
  verification_notes: string | null;
  credential_document_url: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface InstructorCredentialInsert {
  credential_type: FreedivingCredentialType;
  level: FreedivingLevel;
  certification_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_organization: string;
  credential_document_url?: string | null;
}

export interface InstructorCredentialUpdate {
  is_verified?: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
}

// ============================================================================
// 2. INSTRUCTOR INSURANCE
// ============================================================================

export interface InstructorInsurance {
  id: string;
  provider_name: string;
  policy_number: string;
  coverage_type: string;
  coverage_amount_shekel: number;
  issue_date: string; // DATE
  expiry_date: string; // DATE
  status: InsuranceStatus;
  is_active: boolean;
  insurance_document_url: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface InstructorInsuranceInsert {
  provider_name: string;
  policy_number: string;
  coverage_type: string;
  coverage_amount_shekel: number;
  issue_date: string;
  expiry_date: string;
  insurance_document_url?: string | null;
}

export interface InstructorInsuranceUpdate {
  status?: InsuranceStatus;
  is_active?: boolean;
  expiry_date?: string;
}

// ============================================================================
// 3. FREEDIVING INSTRUCTORS
// ============================================================================

export interface FreedivingInstructor {
  id: string;
  user_id: string;
  bio: string;
  phone: string | null;
  years_experience: number;
  avatar_url: string | null;
  cover_image_url: string | null;
  primary_location: string;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number;
  primary_credential_id: string | null;
  primary_insurance_id: string | null;
  is_verified: boolean;
  verification_date: string | null; // TIMESTAMPTZ
  insurance_verified: boolean;
  insurance_verified_at: string | null; // TIMESTAMPTZ
  average_rating: number;
  total_reviews: number;
  total_sessions_completed: number;
  is_active: boolean;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface FreedivingInstructorInsert {
  user_id: string;
  primary_location: string;
  bio?: string;
  phone?: string | null;
  years_experience?: number;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km?: number;
}

export interface FreedivingInstructorUpdate {
  bio?: string;
  phone?: string | null;
  years_experience?: number;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  primary_location?: string;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km?: number;
  primary_credential_id?: string | null;
  primary_insurance_id?: string | null;
  is_verified?: boolean;
  insurance_verified?: boolean;
  is_active?: boolean;
}

export interface FreedivingInstructorProfile extends FreedivingInstructor {
  credentials?: InstructorCredential[];
  insurance?: InstructorInsurance | null;
  services?: FreedivingService[];
}

// ============================================================================
// 4. FREEDIVING SERVICES
// ============================================================================

export interface FreedivingService {
  id: string;
  instructor_id: string;
  name: string;
  description: string;
  service_type: FreedivingServiceType;
  price_shekel: number;
  currency: string;
  duration_minutes: number;
  min_level: FreedivingLevel;
  max_participants: number;
  available_mon: boolean;
  available_tue: boolean;
  available_wed: boolean;
  available_thu: boolean;
  available_fri: boolean;
  available_sat: boolean;
  available_sun: boolean;
  start_hour: string | null; // TIME
  end_hour: string | null; // TIME
  is_active: boolean;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface FreedivingServiceInsert {
  instructor_id: string;
  name: string;
  description: string;
  service_type: FreedivingServiceType;
  price_shekel: number;
  duration_minutes: number;
  min_level?: FreedivingLevel;
  max_participants?: number;
  start_hour?: string | null;
  end_hour?: string | null;
}

export interface FreedivingServiceUpdate {
  name?: string;
  description?: string;
  price_shekel?: number;
  duration_minutes?: number;
  min_level?: FreedivingLevel;
  max_participants?: number;
  is_active?: boolean;
}

// ============================================================================
// 5. FREEDIVING BUDDY LISTINGS
// ============================================================================

export interface FreedivingBuddyListing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  start_date: string; // TIMESTAMP
  end_date: string; // TIMESTAMP
  experience_level: FreedivingLevel;
  max_depth_meters: number | null;
  max_participants: number;
  contact_method: string;
  contact_hidden: boolean;
  is_active: boolean;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface FreedivingBuddyListingInsert {
  user_id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  experience_level: FreedivingLevel;
  description?: string;
  max_depth_meters?: number | null;
  max_participants?: number;
  contact_method?: string;
}

export interface FreedivingBuddyListingUpdate {
  title?: string;
  description?: string;
  location?: string;
  experience_level?: FreedivingLevel;
  max_depth_meters?: number | null;
  max_participants?: number;
  is_active?: boolean;
}

// ============================================================================
// 6. FREEDIVING SESSIONS
// ============================================================================

export interface FreedivingSession {
  id: string;
  instructor_id: string | null;
  service_id: string | null;
  title: string;
  description: string;
  location: string;
  session_date: string; // TIMESTAMPTZ
  duration_minutes: number;
  max_participants: number;
  current_participants: number;
  planned_depth_meters: number | null;
  safety_coordinator_id: string | null;
  status: FreedivingSessionStatus;
  notes: string;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface FreedivingSessionInsert {
  title: string;
  location: string;
  session_date: string;
  duration_minutes: number;
  instructor_id?: string | null;
  service_id?: string | null;
  description?: string;
  max_participants?: number;
  planned_depth_meters?: number | null;
  safety_coordinator_id?: string | null;
}

export interface FreedivingSessionUpdate {
  title?: string;
  description?: string;
  location?: string;
  status?: FreedivingSessionStatus;
  current_participants?: number;
  notes?: string;
  planned_depth_meters?: number | null;
}

export interface FreedivingSessionWithParticipants extends FreedivingSession {
  participants?: FreedivingSessionParticipant[];
}

// ============================================================================
// 7. FREEDIVING SESSION PARTICIPANTS
// ============================================================================

export interface FreedivingSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  is_instructor: boolean;
  role: 'participant' | 'safety_diver' | 'instructor' | 'assistant';
  max_depth_certified: number | null;
  medical_clearance: boolean;
  joined_at: string; // TIMESTAMPTZ
  left_at: string | null; // TIMESTAMPTZ
}

export interface FreedivingSessionParticipantInsert {
  session_id: string;
  user_id: string;
  role?: 'participant' | 'safety_diver' | 'instructor' | 'assistant';
  is_instructor?: boolean;
  max_depth_certified?: number | null;
  medical_clearance?: boolean;
}

// ============================================================================
// 8. FREEDIVING BOOKINGS
// ============================================================================

export interface FreedivingBooking {
  id: string;
  service_id: string;
  booker_user_id: string;
  booking_date: string; // DATE
  start_time: string; // TIME
  end_time: string; // TIME
  participant_count: number;
  special_requests: string | null;
  medical_notes: string | null;
  status: FreedivingBookingStatus;
  confirmation_code: string;
  total_price_shekel: number | null;
  instructor_notes: string | null;
  customer_notes: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface FreedivingBookingInsert {
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  participant_count: number;
  special_requests?: string | null;
  medical_notes?: string | null;
}

export interface FreedivingBookingUpdate {
  status?: FreedivingBookingStatus;
  special_requests?: string | null;
  medical_notes?: string | null;
  instructor_notes?: string | null;
  customer_notes?: string | null;
  total_price_shekel?: number | null;
}

export interface FreedivingBookingWithService extends FreedivingBooking {
  service?: FreedivingService;
  instructor?: FreedivingInstructor;
}

// ============================================================================
// 9. FREEDIVING REVIEWS
// ============================================================================

export interface FreedivingReview {
  id: string;
  instructor_id: string;
  reviewer_user_id: string;
  booking_id: string | null;
  rating: number; // 1-5
  title: string | null;
  comment: string | null;
  safety_rating: number | null; // 1-5
  professionalism_rating: number | null; // 1-5
  instruction_quality_rating: number | null; // 1-5
  is_verified_booking: boolean;
  is_helpful_count: number;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface FreedivingReviewInsert {
  instructor_id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  booking_id?: string | null;
  safety_rating?: number | null;
  professionalism_rating?: number | null;
  instruction_quality_rating?: number | null;
}

export interface FreedivingReviewUpdate {
  rating?: number;
  title?: string | null;
  comment?: string | null;
  safety_rating?: number | null;
  professionalism_rating?: number | null;
  instruction_quality_rating?: number | null;
}

// ============================================================================
// COMPOSITE/VIEW TYPES (For API responses)
// ============================================================================

export interface InstructorDirectory {
  id: string;
  user_id: string;
  business_name?: string;
  bio: string;
  avatar_url: string | null;
  primary_location: string;
  latitude: number | null;
  longitude: number | null;
  average_rating: number;
  total_reviews: number;
  total_sessions_completed: number;
  is_verified: boolean;
  insurance_verified: boolean;
  years_experience: number;
  credentials: InstructorCredential[];
  services: FreedivingService[];
}

export interface BookingWithDetails {
  booking: FreedivingBooking;
  service: FreedivingService;
  instructor: FreedivingInstructor;
  reviews?: FreedivingReview[];
}

export interface SessionWithAllDetails {
  session: FreedivingSession;
  instructor?: FreedivingInstructor | null;
  service?: FreedivingService | null;
  participants: FreedivingSessionParticipant[];
  safety_coordinator?: any | null;
}

export interface BuddyMatchProfile {
  listing: FreedivingBuddyListing;
  user_id: string;
  user_name?: string;
  user_avatar?: string | null;
  experience_level: FreedivingLevel;
  max_depth_certified?: number;
}

// ============================================================================
// STATISTICS & METRICS
// ============================================================================

export interface InstructorStats {
  instructor_id: string;
  total_sessions: number;
  total_bookings: number;
  average_rating: number;
  total_reviews: number;
  active_services: number;
  completion_rate: number; // percentage
  response_time_hours?: number;
  member_since: string;
}

export interface FreedivingSessionStats {
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  average_participants: number;
  busiest_day_of_week: string;
  busiest_hour: string;
}

// ============================================================================
// DATABASE TYPE HELPERS
// ============================================================================

export type FreedivingDatabase = {
  instructor_credentials: InstructorCredential;
  instructor_insurance: InstructorInsurance;
  freediving_instructors: FreedivingInstructor;
  freediving_services: FreedivingService;
  freediving_buddy_listings: FreedivingBuddyListing;
  freediving_sessions: FreedivingSession;
  freediving_session_participants: FreedivingSessionParticipant;
  freediving_bookings: FreedivingBooking;
  freediving_reviews: FreedivingReview;
};
