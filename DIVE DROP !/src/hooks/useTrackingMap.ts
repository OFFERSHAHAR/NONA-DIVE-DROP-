'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ShuttleLocation,
  TrackingSession,
  DiveTrip,
  Shuttle,
  RouteMetrics,
} from '@/types/tracking';

interface UseTrackingMapOptions {
  tripId: string;
  updateInterval?: number;
  onStatusChange?: (status: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for real-time shuttle tracking
 * - Fetches trip and shuttle data
 * - Watches user geolocation
 * - Subscribes to shuttle location updates via Supabase Realtime
 * - Calculates distance and ETA
 */
export function useTrackingMap({
  tripId,
  updateInterval = 3000,
  onStatusChange,
  onError,
}: UseTrackingMapOptions) {
  const supabase = createClient();
  const [trip, setTrip] = useState<DiveTrip | null>(null);
  const [shuttle, setShuttle] = useState<Shuttle | null>(null);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [shuttleLocation, setShuttleLocation] = useState<ShuttleLocation | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [etaMinutes, setEtaMinutes] = useState<number>(0);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const geolocationRef = useRef<GeolocationWatchId | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const locationUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Haversine formula for accurate distance calculation
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Fetch initial trip and shuttle data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // Fetch trip details
        const { data: tripData, error: tripError } = await supabase
          .from('dive_trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripError) throw tripError;
        setTrip(tripData);

        // Fetch shuttle data if assigned
        if (tripData.shuttle_id) {
          const { data: shuttleData, error: shuttleError } = await supabase
            .from('shuttles')
            .select(
              `
              id,
              plate_number,
              model,
              capacity,
              current_passengers,
              drivers (
                id,
                name,
                phone,
                avatar_url,
                license_number,
                rating,
                reviews_count
              )
            `
            )
            .eq('id', tripData.shuttle_id)
            .single();

          if (shuttleError) throw shuttleError;
          setShuttle(shuttleData as unknown as Shuttle);

          // Fetch latest shuttle location
          const { data: locationData } = await supabase
            .from('shuttle_location_history')
            .select('*')
            .eq('shuttle_id', tripData.shuttle_id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          if (locationData) {
            setShuttleLocation(locationData);
          }
        }

        setIsLoading(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch trip data');
        setError(error);
        onError?.(error);
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [tripId, supabase, onError]);

  // Start geolocation tracking with high accuracy
  useEffect(() => {
    if (!navigator.geolocation) {
      const err = new Error('Geolocation is not supported by this browser');
      setError(err);
      onError?.(err);
      return;
    }

    geolocationRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation(position.coords);
      },
      (err) => {
        const error = new Error(`Geolocation error: ${err.message}`);
        setError(error);
        onError?.(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (geolocationRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationRef.current);
      }
    };
  }, [onError]);

  // Subscribe to shuttle location updates via Realtime
  useEffect(() => {
    if (!tripId || !trip?.shuttle_id) return;

    subscriptionRef.current = supabase
      .channel(`shuttle_location:${trip.shuttle_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shuttle_location_history',
          filter: `shuttle_id=eq.${trip.shuttle_id}`,
        },
        (payload) => {
          const locationUpdate = payload.new as ShuttleLocation;
          setShuttleLocation(locationUpdate);

          // Calculate distance and ETA
          if (userLocation) {
            const dist = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              locationUpdate.latitude,
              locationUpdate.longitude
            );
            setDistance(dist);

            // ETA calculation: distance / speed
            const speedKmh = (locationUpdate.speed || 15) * 3.6; // Convert m/s to km/h
            const eta = Math.ceil((dist / 1000 / speedKmh) * 60); // Convert to minutes
            setEtaMinutes(Math.max(0, eta));
          }
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [tripId, trip?.shuttle_id, supabase, userLocation, calculateDistance]);

  // Subscribe to trip status changes
  useEffect(() => {
    if (!tripId) return;

    subscriptionRef.current = supabase
      .channel(`trip_status:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dive_trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => {
          const updatedTrip = payload.new as DiveTrip;
          setTrip(updatedTrip);
          onStatusChange?.(updatedTrip.status);
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [tripId, supabase, onStatusChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      subscriptionRef.current?.unsubscribe();
      if (locationUpdateRef.current) {
        clearTimeout(locationUpdateRef.current);
      }
    };
  }, []);

  return {
    trip,
    shuttle,
    userLocation,
    shuttleLocation,
    distance,
    etaMinutes,
    routeMetrics,
    isLoading,
    error,
    calculateDistance,
  };
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export type UseTrackingMapReturn = ReturnType<typeof useTrackingMap>;
