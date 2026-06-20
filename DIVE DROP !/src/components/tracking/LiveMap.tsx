'use client';

import React, { useEffect, useRef } from 'react';
import type { RealtimeTracking } from '@/types/tracking';

interface LiveMapProps {
  tripDetails: RealtimeTracking | null;
  isLoading?: boolean;
  height?: string;
  className?: string;
}

/**
 * Live Map Component
 * Displays shuttle and passenger locations on a map
 *
 * Note: This is a placeholder. Integrate with your preferred mapping library:
 * - Mapbox GL
 * - Google Maps
 * - Leaflet
 * - TomTom
 *
 * Example with Leaflet:
 *
 * import L from 'leaflet';
 *
 * const map = L.map(container).setView([lat, lng], 15);
 * L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
 *
 * // Add shuttle marker
 * L.marker([shuttleLat, shuttleLng]).addTo(map).bindPopup('Shuttle');
 *
 * // Add passenger marker
 * L.marker([passengerLat, passengerLng]).addTo(map).bindPopup('You');
 */
export function LiveMap({ tripDetails, isLoading, height = '400px', className = '' }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tripDetails?.shuttle_location || !mapRef.current) return;

    // TODO: Initialize map with shuttle and passenger locations
    // Update markers as locations change
  }, [tripDetails]);

  if (!tripDetails?.shuttle_location) {
    return (
      <div
        ref={mapRef}
        style={{ height }}
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center text-gray-500">
          {isLoading ? 'Loading map...' : 'Map will load when tracking starts'}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className={`bg-gray-100 rounded-lg overflow-hidden ${className}`}
    >
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="mb-2">
            Shuttle Location: {tripDetails.shuttle_location.lat.toFixed(4)},
            {tripDetails.shuttle_location.lng.toFixed(4)}
          </p>
          {tripDetails.passenger_location && (
            <p>
              Your Location: {tripDetails.passenger_location.lat.toFixed(4)},
              {tripDetails.passenger_location.lng.toFixed(4)}
            </p>
          )}
          <p className="mt-2 text-sm">
            ETA: {tripDetails.eta_formatted}
          </p>
        </div>
      </div>
    </div>
  );
}
