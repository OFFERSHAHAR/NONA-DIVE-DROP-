'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Location } from '@/types/tracking';

interface TrackingMapProps {
  userLocation?: { latitude: number; longitude: number } | null;
  shuttleLocation?: { latitude: number; longitude: number } | null;
  routePoints?: Location[];
  className?: string;
  onMapReady?: () => void;
  onCenterToUser?: (fn: () => void) => void;
  onZoomIn?: (fn: () => void) => void;
  onZoomOut?: (fn: () => void) => void;
}

/**
 * High-performance Leaflet map for live shuttle tracking
 * - Real-time location updates
 * - Responsive marker animations
 * - Touch-friendly zoom controls
 * - RTL/LTR support
 */
export function TrackingMap({
  userLocation,
  shuttleLocation,
  routePoints = [],
  className = '',
  onMapReady,
  onCenterToUser,
  onZoomIn,
  onZoomOut,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const polylineRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current || isReady) return;

    initTimeoutRef.current = setTimeout(() => {
      import('leaflet').then((L) => {
        // Fix Leaflet default icon paths for Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map
        const map = L.map(containerRef.current!, {
          center: [
            userLocation?.latitude || 32.8755,
            userLocation?.longitude || 34.7674,
          ],
          zoom: 15,
          zoomControl: false,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
          minZoom: 5,
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsReady(true);

        // Expose control functions
        onCenterToUser?.(() => {
          if (userLocation) {
            map.setView([userLocation.latitude, userLocation.longitude], 15, {
              animate: true,
              duration: 0.5,
            });
          }
        });

        onZoomIn?.(() => map.zoomIn());
        onZoomOut?.(() => map.zoomOut());

        onMapReady?.();
      }).catch((err) => {
        console.error('Failed to load Leaflet:', err);
        setIsReady(true);
      });
    }, 100);

    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isReady, userLocation, onMapReady, onCenterToUser, onZoomIn, onZoomOut]);

  // Update user location marker
  useEffect(() => {
    if (!isReady || !userLocation || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      const oldMarker = markersRef.current.get('user');

      if (oldMarker) {
        map.removeLayer(oldMarker);
      }

      // User marker (blue dot)
      const userIcon = L.divIcon({
        html: `
          <div class="relative w-8 h-8">
            <div class="absolute inset-0 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
            <div class="absolute inset-2 bg-blue-600 rounded-full"></div>
          </div>
        `,
        iconSize: [32, 32],
        className: 'user-marker',
      });

      const userMarker = L.marker(
        [userLocation.latitude, userLocation.longitude],
        { icon: userIcon, zIndexOffset: 1000 }
      ).addTo(map);

      // Add accuracy circle
      const oldCircle = circleRef.current;
      if (oldCircle) map.removeLayer(oldCircle);

      const circle = L.circle(
        [userLocation.latitude, userLocation.longitude],
        {
          radius: 30,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '4, 4',
        }
      ).addTo(map);

      markersRef.current.set('user', userMarker);
      circleRef.current = circle;

      // Center map on user (only first time or when explicitly requested)
      if (markersRef.current.size === 1) {
        map.setView([userLocation.latitude, userLocation.longitude], 15);
      }
    });
  }, [isReady, userLocation]);

  // Update shuttle location marker with bearing
  useEffect(() => {
    if (!isReady || !shuttleLocation || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      const oldMarker = markersRef.current.get('shuttle');

      if (oldMarker) {
        map.removeLayer(oldMarker);
      }

      // Shuttle marker (red car icon rotated by bearing)
      const rotation = shuttleLocation.bearing ? `rotate(${shuttleLocation.bearing}deg)` : 'rotate(0deg)';
      const shuttleIcon = L.divIcon({
        html: `
          <div class="w-8 h-8 bg-red-500 rounded-lg border-2 border-white shadow-lg flex items-center justify-center transform ${rotation}">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 0 1 1 1v1.323l3.954 1.582 1.599-.8a1 1 0 0 1 1.894.894l-1.6.8 1.6.8a1 1 0 0 1-1.894.894l-1.599-.8L11 7.323V19a1 1 0 0 1-2 0V7.323L5.046 5.741 3.447 6.541a1 1 0 0 1-1.894-.894l1.6-.8-1.6-.8a1 1 0 0 1 1.894-.894l1.599.8L9 4.323V3a1 1 0 0 1 1-1z" />
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        className: 'shuttle-marker',
      });

      const shuttleMarker = L.marker(
        [shuttleLocation.latitude, shuttleLocation.longitude],
        { icon: shuttleIcon, zIndexOffset: 999 }
      ).addTo(map);

      markersRef.current.set('shuttle', shuttleMarker);
    });
  }, [isReady, shuttleLocation]);

  // Draw route polyline
  useEffect(() => {
    if (!isReady || routePoints.length < 2 || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      const latlngs = routePoints.map((point) => [point.latitude, point.longitude]);

      const polyline = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'route-line',
      }).addTo(map);

      polylineRef.current = polyline;

      // Fit bounds if both markers exist
      if (userLocation && shuttleLocation) {
        const group = L.featureGroup([polyline]);
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
      }
    });
  }, [isReady, routePoints, userLocation, shuttleLocation]);

  return (
    <div ref={containerRef} className={`w-full h-full bg-gray-100 ${className}`} />
  );
}
