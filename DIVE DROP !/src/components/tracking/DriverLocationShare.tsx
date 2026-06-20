'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useTranslations } from 'next-intl';
import type { DriverLocationUpdate } from '@/types/shuttle';

interface DriverLocationShareProps {
  tripId: string;
  shuttleId: string;
  enabled?: boolean;
  updateInterval?: number;
  onLocationUpdate?: (location: DriverLocationUpdate) => void;
  onError?: (error: Error) => void;
}

/**
 * Driver Location Sharing Component
 * Captures driver's GPS location and broadcasts it via Supabase Realtime
 * High-accuracy real-time tracking for driver movements
 */
export function DriverLocationShare({
  tripId,
  shuttleId,
  enabled = true,
  updateInterval = 15000,
  onLocationUpdate,
  onError,
}: DriverLocationShareProps) {
  const supabase = useSupabaseClient();
  const t = useTranslations('tracking');
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<DriverLocationUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationCount, setLocationCount] = useState(0);

  const watchIdRef = useRef<GeolocationWatchId | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationQueueRef = useRef<DriverLocationUpdate | null>(null);

  // Start geolocation tracking
  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location: DriverLocationUpdate = {
          trip_id: tripId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          bearing: position.coords.heading,
          timestamp: new Date().toISOString(),
        };

        locationQueueRef.current = location;
        setLastLocation(location);
      },
      (err) => {
        const errorMsg = `Geolocation error: ${err.message}`;
        setError(errorMsg);
        const error = new Error(errorMsg);
        onError?.(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, tripId, onError]);

  // Batch location updates to Supabase
  useEffect(() => {
    if (!enabled || !isTracking) return;

    updateIntervalRef.current = setInterval(async () => {
      if (!locationQueueRef.current) return;

      const location = locationQueueRef.current;

      try {
        // Update shuttle_trips current location
        await supabase
          .from('shuttle_trips')
          .update({
            current_latitude: location.latitude,
            current_longitude: location.longitude,
            accuracy: location.accuracy,
            altitude: location.altitude,
            updated_at: location.timestamp,
          })
          .eq('id', tripId);

        // Insert into location history for analytics
        await supabase
          .from('shuttle_location_history')
          .insert({
            trip_id: tripId,
            shuttle_id: shuttleId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            altitude: location.altitude,
            speed: location.speed,
            bearing: location.bearing,
            timestamp: location.timestamp,
          });

        setLocationCount((prev) => prev + 1);
        onLocationUpdate?.(location);
        locationQueueRef.current = null;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update location');
        setError(error.message);
        console.error('Location update error:', error);
      }
    }, updateInterval);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enabled, isTracking, tripId, shuttleId, supabase, updateInterval, onLocationUpdate]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-40 text-xs">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="font-semibold text-gray-800">
            {isTracking ? '📍 Tracking' : '⚪ Inactive'}
          </span>
        </div>

        {lastLocation && (
          <div className="text-gray-600 space-y-1">
            <p>📌 {lastLocation.latitude.toFixed(5)}, {lastLocation.longitude.toFixed(5)}</p>
            {lastLocation.accuracy && <p>🎯 ±{Math.round(lastLocation.accuracy)}m</p>}
            {lastLocation.speed && lastLocation.speed > 0 && <p>⚡ {Math.round(lastLocation.speed * 3.6)} km/h</p>}
            <p className="text-gray-500 text-xs">Updates: {locationCount}</p>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-xs p-1 bg-red-50 rounded">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
