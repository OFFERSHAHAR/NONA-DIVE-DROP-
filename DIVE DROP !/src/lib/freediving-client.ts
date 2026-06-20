/**
 * DIVE DROP: Free Diving Supabase Client
 * Utility functions for freediving operations with RLS validation
 */

import { createClient } from '@supabase/supabase-js';
import type {
  FreedivingInstructor,
  FreedivingInstructorInsert,
  FreedivingService,
  FreedivingServiceInsert,
  FreedivingBuddyListing,
  FreedivingBuddyListingInsert,
  FreedivingBooking,
  FreedivingBookingInsert,
  FreedivingSession,
  FreedivingSessionInsert,
  FreedivingReview,
  FreedivingReviewInsert,
  InstructorCredential,
  InstructorCredentialInsert,
  InstructorInsurance,
  InstructorInsuranceInsert,
  FreedivingLevel,
  FreedivingServiceType,
  InstructorDirectory,
} from '@/types/freediving';

// ============================================================================
// INSTRUCTOR OPERATIONS
// ============================================================================

/**
 * Get instructor profile with credentials and insurance
 */
export async function getInstructorProfile(
  client: any,
  instructorId: string
): Promise<FreedivingInstructor | null> {
  const { data, error } = await client
    .from('freediving_instructors')
    .select('*')
    .eq('id', instructorId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get verified instructors directory (public view)
 */
export async function getVerifiedInstructorDirectory(
  client: any,
  options: {
    location?: string;
    service_type?: FreedivingServiceType;
    min_rating?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<InstructorDirectory[]> {
  let query = client
    .from('freediving_instructors')
    .select(
      `
      id,
      user_id,
      bio,
      avatar_url,
      primary_location,
      latitude,
      longitude,
      average_rating,
      total_reviews,
      total_sessions_completed,
      is_verified,
      insurance_verified,
      years_experience,
      instructor_credentials(*)
    `
    )
    .eq('is_verified', true)
    .eq('insurance_verified', true)
    .eq('is_active', true);

  if (options.location) {
    query = query.ilike('primary_location', `%${options.location}%`);
  }

  if (options.min_rating) {
    query = query.gte('average_rating', options.min_rating);
  }

  query = query.order('average_rating', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create instructor profile
 */
export async function createInstructorProfile(
  client: any,
  profile: FreedivingInstructorInsert
): Promise<FreedivingInstructor> {
  const { data, error } = await client
    .from('freediving_instructors')
    .insert([profile])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update instructor profile
 */
export async function updateInstructorProfile(
  client: any,
  instructorId: string,
  updates: Partial<FreedivingInstructor>
): Promise<FreedivingInstructor> {
  const { data, error } = await client
    .from('freediving_instructors')
    .update(updates)
    .eq('id', instructorId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Validate instructor has verified credentials and active insurance
 */
export async function validateInstructorCredentials(
  client: any,
  instructorId: string
): Promise<{
  has_valid_credential: boolean;
  has_valid_insurance: boolean;
  is_eligible: boolean;
  issues: string[];
}> {
  const instructor = await getInstructorProfile(client, instructorId);

  if (!instructor) {
    return {
      has_valid_credential: false,
      has_valid_insurance: false,
      is_eligible: false,
      issues: ['Instructor not found'],
    };
  }

  const issues: string[] = [];

  // Check credentials
  let has_valid_credential = false;
  if (instructor.primary_credential_id) {
    const { data: credential } = await client
      .from('instructor_credentials')
      .select('*')
      .eq('id', instructor.primary_credential_id)
      .single();

    if (credential) {
      const isVerified = credential.is_verified;
      const isNotExpired = new Date(credential.expiry_date) > new Date();
      has_valid_credential = isVerified && isNotExpired;

      if (!isVerified) issues.push('Credentials not verified');
      if (!isNotExpired) issues.push('Credentials expired');
    } else {
      issues.push('Primary credential not found');
    }
  } else {
    issues.push('No credentials linked');
  }

  // Check insurance
  let has_valid_insurance = false;
  if (instructor.primary_insurance_id) {
    const { data: insurance } = await client
      .from('instructor_insurance')
      .select('*')
      .eq('id', instructor.primary_insurance_id)
      .single();

    if (insurance) {
      const isActive = insurance.status === 'active' && insurance.is_active;
      const isNotExpired = new Date(insurance.expiry_date) > new Date();
      has_valid_insurance = isActive && isNotExpired;

      if (!isActive) issues.push('Insurance not active');
      if (!isNotExpired) issues.push('Insurance expired');
    } else {
      issues.push('Primary insurance not found');
    }
  } else {
    issues.push('No insurance linked');
  }

  return {
    has_valid_credential,
    has_valid_insurance,
    is_eligible: has_valid_credential && has_valid_insurance,
    issues,
  };
}

// ============================================================================
// CREDENTIALS OPERATIONS
// ============================================================================

/**
 * Add instructor credential
 */
export async function addInstructorCredential(
  client: any,
  credential: InstructorCredentialInsert
): Promise<InstructorCredential> {
  const { data, error } = await client
    .from('instructor_credentials')
    .insert([credential])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get instructor credentials
 */
export async function getInstructorCredentials(
  client: any,
  instructorId: string
): Promise<InstructorCredential[]> {
  const instructor = await getInstructorProfile(client, instructorId);

  if (!instructor) return [];

  const { data, error } = await client
    .from('instructor_credentials')
    .select('*')
    .eq('id', instructor.primary_credential_id);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// INSURANCE OPERATIONS
// ============================================================================

/**
 * Add instructor insurance
 */
export async function addInstructorInsurance(
  client: any,
  insurance: InstructorInsuranceInsert
): Promise<InstructorInsurance> {
  const { data, error } = await client
    .from('instructor_insurance')
    .insert([insurance])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get instructor insurance
 */
export async function getInstructorInsurance(
  client: any,
  instructorId: string
): Promise<InstructorInsurance | null> {
  const instructor = await getInstructorProfile(client, instructorId);

  if (!instructor || !instructor.primary_insurance_id) return null;

  const { data, error } = await client
    .from('instructor_insurance')
    .select('*')
    .eq('id', instructor.primary_insurance_id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// SERVICE OPERATIONS
// ============================================================================

/**
 * Get services by instructor
 */
export async function getInstructorServices(
  client: any,
  instructorId: string
): Promise<FreedivingService[]> {
  const { data, error } = await client
    .from('freediving_services')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

/**
 * Search services
 */
export async function searchServices(
  client: any,
  options: {
    service_type?: FreedivingServiceType;
    min_level?: FreedivingLevel;
    location?: string;
    max_price?: number;
    limit?: number;
  } = {}
): Promise<FreedivingService[]> {
  let query = client
    .from('freediving_services')
    .select(
      `
      *,
      freediving_instructors(
        id,
        primary_location,
        is_verified,
        insurance_verified
      )
    `
    )
    .eq('is_active', true)
    .eq('freediving_instructors.is_verified', true)
    .eq('freediving_instructors.insurance_verified', true);

  if (options.service_type) {
    query = query.eq('service_type', options.service_type);
  }

  if (options.min_level) {
    query = query.eq('min_level', options.min_level);
  }

  if (options.max_price) {
    query = query.lte('price_shekel', options.max_price);
  }

  query = query.limit(options.limit || 20);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create service
 */
export async function createService(
  client: any,
  service: FreedivingServiceInsert
): Promise<FreedivingService> {
  const { data, error } = await client
    .from('freediving_services')
    .insert([service])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// BUDDY LISTING OPERATIONS
// ============================================================================

/**
 * Get active buddy listings
 */
export async function getActiveBuddyListings(
  client: any,
  options: {
    location?: string;
    experience_level?: FreedivingLevel;
    limit?: number;
    offset?: number;
  } = {}
): Promise<FreedivingBuddyListing[]> {
  let query = client
    .from('freediving_buddy_listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (options.location) {
    query = query.ilike('location', `%${options.location}%`);
  }

  if (options.experience_level) {
    query = query.eq('experience_level', options.experience_level);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create buddy listing
 */
export async function createBuddyListing(
  client: any,
  listing: FreedivingBuddyListingInsert
): Promise<FreedivingBuddyListing> {
  const { data, error } = await client
    .from('freediving_buddy_listings')
    .insert([listing])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// BOOKING OPERATIONS
// ============================================================================

/**
 * Get user bookings
 */
export async function getUserBookings(
  client: any,
  userId: string
): Promise<FreedivingBooking[]> {
  const { data, error } = await client
    .from('freediving_bookings')
    .select(
      `
      *,
      freediving_services(
        *,
        freediving_instructors(
          id,
          user_id,
          primary_location,
          average_rating
        )
      )
    `
    )
    .eq('booker_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get instructor bookings
 */
export async function getInstructorBookings(
  client: any,
  instructorId: string,
  status?: FreedivingBooking['status']
): Promise<FreedivingBooking[]> {
  let query = client
    .from('freediving_bookings')
    .select(
      `
      *,
      freediving_services(
        id,
        name,
        instructor_id
      )
    `
    )
    .in(
      'service_id',
      client.from('freediving_services').select('id').eq('instructor_id', instructorId)
    );

  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create booking
 */
export async function createBooking(
  client: any,
  booking: FreedivingBookingInsert
): Promise<FreedivingBooking> {
  const { data, error } = await client
    .from('freediving_bookings')
    .insert([booking])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  client: any,
  bookingId: string,
  status: FreedivingBooking['status']
): Promise<FreedivingBooking> {
  const { data, error } = await client
    .from('freediving_bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// SESSION OPERATIONS
// ============================================================================

/**
 * Get upcoming sessions
 */
export async function getUpcomingSessions(
  client: any,
  options: {
    instructorId?: string;
    location?: string;
    limit?: number;
  } = {}
): Promise<FreedivingSession[]> {
  const now = new Date().toISOString();

  let query = client
    .from('freediving_sessions')
    .select(
      `
      *,
      freediving_instructors(
        id,
        bio,
        average_rating
      )
    `
    )
    .eq('status', 'scheduled')
    .gt('session_date', now)
    .order('session_date', { ascending: true });

  if (options.instructorId) {
    query = query.eq('instructor_id', options.instructorId);
  }

  if (options.location) {
    query = query.ilike('location', `%${options.location}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create session
 */
export async function createSession(
  client: any,
  session: FreedivingSessionInsert
): Promise<FreedivingSession> {
  const { data, error } = await client
    .from('freediving_sessions')
    .insert([session])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// REVIEW OPERATIONS
// ============================================================================

/**
 * Get instructor reviews
 */
export async function getInstructorReviews(
  client: any,
  instructorId: string
): Promise<FreedivingReview[]> {
  const { data, error } = await client
    .from('freediving_reviews')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create review
 */
export async function createReview(
  client: any,
  review: FreedivingReviewInsert
): Promise<FreedivingReview> {
  const { data, error } = await client
    .from('freediving_reviews')
    .insert([review])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user reviews
 */
export async function getUserReviews(
  client: any,
  userId: string
): Promise<FreedivingReview[]> {
  const { data, error } = await client
    .from('freediving_reviews')
    .select('*')
    .eq('reviewer_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get instructor stats
 */
export async function getInstructorStats(
  client: any,
  instructorId: string
): Promise<{
  total_sessions: number;
  total_bookings: number;
  average_rating: number;
  total_reviews: number;
  active_services: number;
  completion_rate: number;
}> {
  const instructor = await getInstructorProfile(client, instructorId);

  if (!instructor) {
    throw new Error('Instructor not found');
  }

  const { data: sessions } = await client
    .from('freediving_sessions')
    .select('id')
    .eq('instructor_id', instructorId);

  const { data: bookings } = await client
    .from('freediving_bookings')
    .select('id')
    .in(
      'service_id',
      client.from('freediving_services').select('id').eq('instructor_id', instructorId)
    );

  const { data: services } = await client
    .from('freediving_services')
    .select('id')
    .eq('instructor_id', instructorId)
    .eq('is_active', true);

  const { data: completedSessions } = await client
    .from('freediving_sessions')
    .select('id')
    .eq('instructor_id', instructorId)
    .eq('status', 'completed');

  return {
    total_sessions: sessions?.length || 0,
    total_bookings: bookings?.length || 0,
    average_rating: instructor.average_rating,
    total_reviews: instructor.total_reviews,
    active_services: services?.length || 0,
    completion_rate:
      (sessions?.length || 0) > 0
        ? Math.round(((completedSessions?.length || 0) / (sessions?.length || 0)) * 100)
        : 0,
  };
}

/**
 * Check if dates are available for booking
 */
export async function checkAvailability(
  client: any,
  serviceId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  participantCount: number
): Promise<{
  available: boolean;
  reason?: string;
}> {
  const service = await client
    .from('freediving_services')
    .select('*')
    .eq('id', serviceId)
    .single();

  if (!service.data) {
    return { available: false, reason: 'Service not found' };
  }

  // Check participant count
  if (participantCount > service.data.max_participants) {
    return {
      available: false,
      reason: `Maximum ${service.data.max_participants} participants allowed`,
    };
  }

  // Check day availability
  const date = new Date(bookingDate);
  const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
  const availableField = `available_${dayName}`;

  if (!service.data[availableField]) {
    return { available: false, reason: `Service not available on ${dayName}` };
  }

  // Check time range
  if (service.data.start_hour && service.data.end_hour) {
    const [startHour] = startTime.split(':');
    const [endHour] = endTime.split(':');
    const [serviceStartHour] = service.data.start_hour.split(':');
    const [serviceEndHour] = service.data.end_hour.split(':');

    if (
      parseInt(startHour) < parseInt(serviceStartHour) ||
      parseInt(endHour) > parseInt(serviceEndHour)
    ) {
      return {
        available: false,
        reason: `Service available ${service.data.start_hour} - ${service.data.end_hour}`,
      };
    }
  }

  return { available: true };
}
