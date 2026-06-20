/**
 * React Hooks for Shuttle Tracking
 * Manages realtime subscriptions and component state
 */

import { useEffect, useState, useRef, useCallback } from "react";
import {
  getShuttleTrip,
  getTripPassengers,
  subscribeTripUpdates,
  unsubscribeTripUpdates,
  subscribePassengerUpdates,
  unsubscribePassengerUpdates,
  subscribeUserBookings,
  unsubscribeUserBookings,
  calculateDistance,
  estimateETA as estimateETAFromDB,
  findNearbyShuttles,
} from "@/lib/supabase/shuttle-client";
import {
  ShuttleTrip,
  ShuttlePassenger,
  PassengerStatus,
  ShuttleTripStatus,
  ETAData,
  DistanceInfo,
  NearbyShuttle,
} from "@/types/shuttle";

// ============================================================================
// DIVER TRACKING HOOK
// ============================================================================

interface UseDiverTrackingProps {
  tripId: string;
  userLat?: number;
  userLon?: number;
  dropoffLat?: number;
  dropoffLon?: number;
  enabled?: boolean;
}

interface UseDiverTrackingReturn {
  trip: ShuttleTrip | null;
  passengers: ShuttlePassenger[];
  distance: DistanceInfo | null;
  eta: ETAData | null;
  status: "loading" | "ready" | "error";
  error: Error | null;
}

/**
 * Hook for divers to track their shuttle in real-time
 * Updates position every time the shuttle location changes
 */
export function useDiverTracking({
  tripId,
  userLat,
  userLon,
  dropoffLat,
  dropoffLon,
  enabled = true,
}: UseDiverTrackingProps): UseDiverTrackingReturn {
  const [trip, setTrip] = useState<ShuttleTrip | null>(null);
  const [passengers, setPassengers] = useState<ShuttlePassenger[]>([]);
  const [distance, setDistance] = useState<DistanceInfo | null>(null);
  const [eta, setEta] = useState<ETAData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial trip data
  useEffect(() => {
    if (!enabled || !tripId) return;

    const loadInitial = async () => {
      try {
        setStatus("loading");
        const tripData = await getShuttleTrip(tripId);
        const passengersData = await getTripPassengers(tripId);

        setTrip(tripData);
        setPassengers(passengersData);
        setStatus("ready");
      } catch (err) {
        setError(err as Error);
        setStatus("error");
      }
    };

    loadInitial();
  }, [tripId, enabled]);

  // Calculate distance and ETA whenever trip location or dropoff changes
  useEffect(() => {
    if (
      !trip?.current_latitude ||
      !trip?.current_longitude ||
      !dropoffLat ||
      !dropoffLon
    ) {
      return;
    }

    const calculate = async () => {
      try {
        // Calculate distance
        const distMeters = await calculateDistance(
          trip.current_latitude!,
          trip.current_longitude!,
          dropoffLat,
          dropoffLon
        );

        setDistance({
          distance_meters: distMeters,
          distance_km: distMeters / 1000,
          distance_miles: distMeters / 1609.34,
        });

        // Calculate ETA
        const etaInterval = await estimateETAFromDB(
          trip.current_latitude!,
          trip.current_longitude!,
          dropoffLat,
          dropoffLon
        );

        // Parse PostgreSQL interval (e.g., "00:05:30")
        const [hours, minutes, seconds] = etaInterval
          .split(":")
          .map((x) => parseInt(x, 10));
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        const estimatedArrival = new Date(Date.now() + totalSeconds * 1000);

        setEta({
          eta_seconds: totalSeconds,
          eta_minutes: Math.ceil(totalSeconds / 60),
          distance_meters: distMeters,
          estimated_arrival: estimatedArrival,
        });
      } catch (err) {
        console.error("Error calculating distance/ETA:", err);
      }
    };

    calculate();
  }, [trip?.current_latitude, trip?.current_longitude, dropoffLat, dropoffLon]);

  // Subscribe to realtime trip updates
  useEffect(() => {
    if (!enabled || !tripId || trip?.status === "completed") return;

    const unsubscribe = subscribeTripUpdates(
      tripId,
      (updatedTrip) => {
        setTrip(updatedTrip);
      },
      (err) => {
        setError(err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tripId, enabled, trip?.status]);

  // Subscribe to passenger updates
  useEffect(() => {
    if (!enabled || !tripId) return;

    const unsubscribe = subscribePassengerUpdates(
      tripId,
      (updatedPassenger) => {
        setPassengers((prev) =>
          prev.map((p) => (p.id === updatedPassenger.id ? updatedPassenger : p))
        );
      },
      (err) => {
        setError(err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tripId, enabled]);

  return {
    trip,
    passengers,
    distance,
    eta,
    status,
    error,
  };
}

// ============================================================================
// USER BOOKINGS HOOK
// ============================================================================

interface UseUserBookingsReturn {
  bookings: ShuttlePassenger[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for divers to monitor all their active bookings
 */
export function useUserBookings(
  userId: string,
  enabled: boolean = true
): UseUserBookingsReturn {
  const [bookings, setBookings] = useState<ShuttlePassenger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => Promise<void>) | null>(null);

  const refetch = useCallback(async () => {
    // Note: subscribeUserBookings handles initial load
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;

    const unsubscribe = subscribeUserBookings(
      userId,
      (booking) => {
        setBookings((prev) => {
          // Check if booking already exists
          const exists = prev.find((b) => b.id === booking.id);
          if (exists) {
            // Update existing booking
            return prev.map((b) => (b.id === booking.id ? booking : b));
          }
          // Add new booking
          return [...prev, booking];
        });
      },
      (err) => {
        setError(err);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribeRef.current?.();
    };
  }, [userId, enabled]);

  return {
    bookings,
    loading,
    error,
    refetch,
  };
}

// ============================================================================
// NEARBY SHUTTLES HOOK
// ============================================================================

interface UseNearbyShuttlesProps {
  latitude: number;
  dropoffLatitude: number;
  longitude: number;
  dropoffLongitude: number;
  radiusMeters?: number;
  enabled?: boolean;
  pollIntervalMs?: number;
}

interface UseNearbyShuttlesReturn {
  shuttles: NearbyShuttle[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to find nearby shuttles
 * Polls periodically to find available shuttles
 */
export function useNearbyShuttles({
  latitude,
  longitude,
  radiusMeters = 5000,
  enabled = true,
  pollIntervalMs = 30000, // 30 seconds
}: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  enabled?: boolean;
  pollIntervalMs?: number;
}): UseNearbyShuttlesReturn {
  const [shuttles, setShuttles] = useState<NearbyShuttle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const search = async () => {
      try {
        setLoading(true);
        const nearby = await findNearbyShuttles(latitude, longitude, radiusMeters);
        setShuttles(nearby);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setShuttles([]);
      } finally {
        setLoading(false);
      }
    };

    // Search immediately
    search();

    // Poll periodically
    const interval = setInterval(search, pollIntervalMs);

    return () => clearInterval(interval);
  }, [latitude, longitude, radiusMeters, enabled, pollIntervalMs]);

  return {
    shuttles,
    loading,
    error,
  };
}

// ============================================================================
// ETA CALCULATION HOOK
// ============================================================================

interface UseETACalculatorProps {
  shuttleLatitude: number | null;
  shuttleLongitude: number | null;
  destinationLatitude: number;
  destinationLongitude: number;
  enabled?: boolean;
}

interface UseETACalculatorReturn {
  eta: ETAData | null;
  distance: DistanceInfo | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to calculate ETA and distance
 * Runs whenever shuttle or destination location changes
 */
export function useETACalculator({
  shuttleLatitude,
  shuttleLongitude,
  destinationLatitude,
  destinationLongitude,
  enabled = true,
}: UseETACalculatorProps): UseETACalculatorReturn {
  const [eta, setEta] = useState<ETAData | null>(null);
  const [distance, setDistance] = useState<DistanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (
      !enabled ||
      shuttleLatitude == null ||
      shuttleLongitude == null ||
      !destinationLatitude ||
      !destinationLongitude
    ) {
      return;
    }

    const calculate = async () => {
      try {
        setLoading(true);

        // Calculate distance
        const distMeters = await calculateDistance(
          shuttleLatitude,
          shuttleLongitude,
          destinationLatitude,
          destinationLongitude
        );

        setDistance({
          distance_meters: distMeters,
          distance_km: distMeters / 1000,
          distance_miles: distMeters / 1609.34,
        });

        // Calculate ETA
        const etaInterval = await estimateETAFromDB(
          shuttleLatitude,
          shuttleLongitude,
          destinationLatitude,
          destinationLongitude
        );

        // Parse PostgreSQL interval
        const [hours, minutes, seconds] = etaInterval
          .split(":")
          .map((x) => parseInt(x, 10));
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        setEta({
          eta_seconds: totalSeconds,
          eta_minutes: Math.ceil(totalSeconds / 60),
          distance_meters: distMeters,
          estimated_arrival: new Date(Date.now() + totalSeconds * 1000),
        });

        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    calculate();
  }, [
    shuttleLatitude,
    shuttleLongitude,
    destinationLatitude,
    destinationLongitude,
    enabled,
  ]);

  return {
    eta,
    distance,
    loading,
    error,
  };
}
