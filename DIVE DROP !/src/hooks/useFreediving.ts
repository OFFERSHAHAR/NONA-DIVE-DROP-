/**
 * DIVE DROP: Free Diving React Hooks
 * Convenience hooks for common freediving operations
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import {
  getVerifiedInstructorDirectory,
  getInstructorProfile,
  createInstructorProfile,
  updateInstructorProfile,
  validateInstructorCredentials,
  addInstructorCredential,
  addInstructorInsurance,
  getInstructorServices,
  searchServices,
  createService,
  getActiveBuddyListings,
  createBuddyListing,
  getUserBookings,
  getInstructorBookings,
  createBooking,
  updateBookingStatus,
  getUpcomingSessions,
  createSession,
  getInstructorReviews,
  createReview,
  getInstructorStats,
  checkAvailability,
} from '@/lib/freediving-client';

// ============================================================================
// INSTRUCTOR HOOKS
// ============================================================================

/**
 * Hook to fetch verified instructor directory
 */
export function useInstructorDirectory(options?: {
  location?: string;
  service_type?: FreedivingServiceType;
  min_rating?: number;
  limit?: number;
}) {
  const supabase = createClient();
  const [instructors, setInstructors] = useState<InstructorDirectory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        setLoading(true);
        const data = await getVerifiedInstructorDirectory(supabase, options);
        setInstructors(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setInstructors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, [supabase, options?.location, options?.service_type, options?.min_rating]);

  return { instructors, loading, error };
}

/**
 * Hook to fetch single instructor profile
 */
export function useInstructor(instructorId: string | null) {
  const supabase = createClient();
  const [instructor, setInstructor] = useState<FreedivingInstructor | null>(null);
  const [loading, setLoading] = useState(!!instructorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instructorId) {
      setInstructor(null);
      setLoading(false);
      return;
    }

    const fetchInstructor = async () => {
      try {
        setLoading(true);
        const data = await getInstructorProfile(supabase, instructorId);
        setInstructor(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setInstructor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructor();
  }, [supabase, instructorId]);

  return { instructor, loading, error };
}

/**
 * Hook to fetch instructor statistics
 */
export function useInstructorStats(instructorId: string | null) {
  const supabase = createClient();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(!!instructorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instructorId) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getInstructorStats(supabase, instructorId);
        setStats(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [supabase, instructorId]);

  return { stats, loading, error };
}

/**
 * Hook to validate instructor credentials and insurance
 */
export function useInstructorValidation(instructorId: string | null) {
  const supabase = createClient();
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(!!instructorId);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async () => {
    if (!instructorId) return;

    try {
      setLoading(true);
      const data = await validateInstructorCredentials(supabase, instructorId);
      setValidation(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, instructorId]);

  useEffect(() => {
    validate();
  }, [validate]);

  return { validation, loading, error, validate };
}

/**
 * Hook to manage instructor profile
 */
export function useInstructorProfile(instructorId: string | null) {
  const supabase = createClient();
  const { instructor, loading, error } = useInstructor(instructorId);

  const updateProfile = useCallback(
    async (updates: Partial<FreedivingInstructor>) => {
      if (!instructorId) throw new Error('No instructor ID');
      const updated = await updateInstructorProfile(supabase, instructorId, updates);
      return updated;
    },
    [supabase, instructorId]
  );

  return { instructor, loading, error, updateProfile };
}

// ============================================================================
// SERVICE HOOKS
// ============================================================================

/**
 * Hook to fetch services by instructor
 */
export function useInstructorServices(instructorId: string | null) {
  const supabase = createClient();
  const [services, setServices] = useState<FreedivingService[]>([]);
  const [loading, setLoading] = useState(!!instructorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instructorId) {
      setServices([]);
      setLoading(false);
      return;
    }

    const fetchServices = async () => {
      try {
        setLoading(true);
        const data = await getInstructorServices(supabase, instructorId);
        setServices(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [supabase, instructorId]);

  return { services, loading, error };
}

/**
 * Hook to search services
 */
export function useServiceSearch(options?: {
  service_type?: FreedivingServiceType;
  min_level?: FreedivingLevel;
  max_price?: number;
  limit?: number;
}) {
  const supabase = createClient();
  const [services, setServices] = useState<FreedivingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const data = await searchServices(supabase, options);
        setServices(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [supabase, options?.service_type, options?.min_level, options?.max_price]);

  return { services, loading, error };
}

// ============================================================================
// BUDDY LISTING HOOKS
// ============================================================================

/**
 * Hook to fetch active buddy listings
 */
export function useBuddyListings(options?: {
  location?: string;
  experience_level?: FreedivingLevel;
  limit?: number;
}) {
  const supabase = createClient();
  const [listings, setListings] = useState<FreedivingBuddyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const data = await getActiveBuddyListings(supabase, options);
        setListings(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [supabase, options?.location, options?.experience_level]);

  return { listings, loading, error };
}

/**
 * Hook to create buddy listing
 */
export function useCreateBuddyListing() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
    };
    getUser();
  }, [supabase]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: Omit<FreedivingBuddyListingInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');

      try {
        setLoading(true);
        const listing = await createBuddyListing(supabase, {
          ...data,
          user_id: user.id,
        });
        setError(null);
        return listing;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase, user]
  );

  return { create, loading, error };
}

// ============================================================================
// BOOKING HOOKS
// ============================================================================

/**
 * Hook to fetch user bookings
 */
export function useUserBookings() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
    };
    getUser();
  }, [supabase]);
  const [bookings, setBookings] = useState<FreedivingBooking[]>([]);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const data = await getUserBookings(supabase, user.id);
        setBookings(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [supabase, user]);

  return { bookings, loading, error };
}

/**
 * Hook to fetch instructor bookings
 */
export function useInstructorBookings(
  instructorId: string | null,
  status?: FreedivingBooking['status']
) {
  const supabase = createClient();
  const [bookings, setBookings] = useState<FreedivingBooking[]>([]);
  const [loading, setLoading] = useState(!!instructorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instructorId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const data = await getInstructorBookings(supabase, instructorId, status);
        setBookings(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [supabase, instructorId, status]);

  return { bookings, loading, error };
}

/**
 * Hook to check availability and create booking
 */
export function useCreateBooking() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
    };
    getUser();
  }, [supabase]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAndBook = useCallback(
    async (
      serviceId: string,
      bookingData: Omit<FreedivingBookingInsert, 'service_id'>
    ) => {
      if (!user) throw new Error('Not authenticated');

      try {
        setLoading(true);

        // Check availability
        const available = await checkAvailability(
          supabase,
          serviceId,
          bookingData.booking_date,
          bookingData.start_time,
          bookingData.end_time,
          bookingData.participant_count
        );

        if (!available.available) {
          throw new Error(available.reason || 'Service not available');
        }

        // Create booking
        const booking = await createBooking(supabase, {
          ...bookingData,
          service_id: serviceId,
        });

        setError(null);
        return booking;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase, user]
  );

  return { checkAndBook, loading, error };
}

// ============================================================================
// SESSION HOOKS
// ============================================================================

/**
 * Hook to fetch upcoming sessions
 */
export function useUpcomingSessions(options?: {
  instructorId?: string;
  location?: string;
  limit?: number;
}) {
  const supabase = createClient();
  const [sessions, setSessions] = useState<FreedivingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await getUpcomingSessions(supabase, options);
        setSessions(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [supabase, options?.instructorId, options?.location]);

  return { sessions, loading, error };
}

// ============================================================================
// REVIEW HOOKS
// ============================================================================

/**
 * Hook to fetch instructor reviews
 */
export function useInstructorReviews(instructorId: string | null) {
  const supabase = createClient();
  const [reviews, setReviews] = useState<FreedivingReview[]>([]);
  const [loading, setLoading] = useState(!!instructorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instructorId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const data = await getInstructorReviews(supabase, instructorId);
        setReviews(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [supabase, instructorId]);

  return { reviews, loading, error };
}

/**
 * Hook to create review
 */
export function useCreateReview() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
    };
    getUser();
  }, [supabase]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: Omit<FreedivingReviewInsert, 'reviewer_user_id'>) => {
      if (!user) throw new Error('Not authenticated');

      try {
        setLoading(true);
        const review = await createReview(supabase, {
          ...data,
          reviewer_user_id: user.id,
        });
        setError(null);
        return review;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase, user]
  );

  return { create, loading, error };
}

// ============================================================================
// CREDENTIAL & INSURANCE HOOKS
// ============================================================================

/**
 * Hook to add instructor credential
 */
export function useAddCredential() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    async (data: InstructorCredentialInsert) => {
      try {
        setLoading(true);
        const credential = await addInstructorCredential(supabase, data);
        setError(null);
        return credential;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return { add, loading, error };
}

/**
 * Hook to add instructor insurance
 */
export function useAddInsurance() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    async (data: InstructorInsuranceInsert) => {
      try {
        setLoading(true);
        const insurance = await addInstructorInsurance(supabase, data);
        setError(null);
        return insurance;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return { add, loading, error };
}
