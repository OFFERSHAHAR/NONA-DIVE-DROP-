/**
 * Passenger Map View Component
 * Shows driver location in real-time via Realtime subscription
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createRealtimeLocationListener } from '@/lib/location/realtimeLocationListener';
import type { LocationUpdatePayload } from '@/lib/location/realtimeLocationListener';

interface PassengerMapViewProps {
  tripId: string;
  userId: string;
  driverId: string;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  lastUpdate: Date;
}

/**
 * Component that displays driver location to passenger
 * Uses Supabase Realtime for live updates
 */
export function PassengerMapView({
  tripId,
  userId,
  driverId,
}: PassengerMapViewProps) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [passengerLocation, setPassengerLocation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);

  const listenerRef = useRef<ReturnType<typeof createRealtimeLocationListener> | null>(null);
  const supabaseRef = useRef(createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // Initialize real-time listener
  useEffect(() => {
    const listener = createRealtimeLocationListener(supabaseRef.current);
    listenerRef.current = listener;

    // Subscribe to location updates
    const unsubscribe = listener.subscribe(tripId, (payload: LocationUpdatePayload) => {
      // Find driver location from payload
      const driverLoc = payload.locations.find(
        (loc) => loc.user_id === driverId && loc.user_type === 'driver'
      );

      if (driverLoc) {
        setDriverLocation({
          latitude: driverLoc.latitude,
          longitude: driverLoc.longitude,
          accuracy: driverLoc.accuracy,
          lastUpdate: new Date(),
        });

        // Calculate ETA if we have both locations
        if (passengerLocation) {
          calculateETA(driverLoc.latitude, driverLoc.longitude);
        }
      }
    });

    setIsLoading(false);

    return () => {
      unsubscribe();
    };
  }, [tripId, driverId, passengerLocation]);

  // Get initial locations
  useEffect(() => {
    const getInitialLocation = async () => {
      try {
        const response = await fetch(
          `/api/tracking/shuttle/batch-location?tripId=${tripId}`
        );
        if (!response.ok) throw new Error('Failed to fetch locations');

        const data = await response.json();
        const locations = data.locations || [];

        // Set driver location
        const driver = locations.find(
          (loc: any) => loc.user_id === driverId && loc.user_type === 'driver'
        );
        if (driver) {
          setDriverLocation({
            latitude: driver.latitude,
            longitude: driver.longitude,
            accuracy: driver.accuracy,
            lastUpdate: new Date(),
          });
        }

        // Set passenger location
        const passenger = locations.find(
          (loc: any) => loc.user_id === userId && loc.user_type === 'passenger'
        );
        if (passenger) {
          setPassengerLocation({
            latitude: passenger.latitude,
            longitude: passenger.longitude,
          });
        }
      } catch (err) {
        setError('Failed to load location data');
        console.error(err);
      }
    };

    getInitialLocation();
  }, [tripId, userId, driverId]);

  // Calculate ETA based on distance and speed
  const calculateETA = (driverLat: number, driverLng: number) => {
    if (!passengerLocation) return;

    // Haversine distance formula
    const R = 6371; // Earth's radius in km
    const dLat = (passengerLocation.latitude - driverLat) * (Math.PI / 180);
    const dLng = (passengerLocation.longitude - driverLng) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(driverLat * (Math.PI / 180)) *
        Math.cos(passengerLocation.latitude * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Assume average speed of 30 km/h in urban area
    const avgSpeed = 30;
    const etaMinutes = Math.round((distance / avgSpeed) * 60);

    if (etaMinutes > 0) {
      setEta(`${etaMinutes} min away`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
          <p className="text-gray-600">Loading driver location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Driver Location</h3>
            {driverLocation && (
              <p className="text-sm text-gray-600 mt-1">
                Last updated: {driverLocation.lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
          {eta && (
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">{eta}</p>
              <p className="text-xs text-gray-500">ETA</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Placeholder */}
      {driverLocation && (
        <div className="w-full h-96 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
          {/* This would be replaced with actual map library (Mapbox, Google Maps, Leaflet) */}
          <div className="text-center">
            <p className="text-gray-600 font-semibold">Map Integration Required</p>
            <p className="text-sm text-gray-500 mt-2">
              Driver: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
            </p>
            {passengerLocation && (
              <p className="text-sm text-gray-500 mt-1">
                You: {passengerLocation.latitude.toFixed(4)}, {passengerLocation.longitude.toFixed(4)}
              </p>
            )}
          </div>

          {/* Visual Indicator */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-xs text-gray-600">Driver</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              <span className="text-xs text-gray-600">You</span>
            </div>
          </div>
        </div>
      )}

      {/* Accuracy Info */}
      {driverLocation?.accuracy && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            📍 Location accuracy: ±{Math.round(driverLocation.accuracy)}m
          </p>
        </div>
      )}
    </div>
  );
}
