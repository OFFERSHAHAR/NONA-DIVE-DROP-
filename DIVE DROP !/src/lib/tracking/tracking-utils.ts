/**
 * Utility functions for tracking system
 */

import type { Location, ShuttleLocation } from '@/types/tracking';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate ETA in minutes based on distance and speed
 * Returns estimated time in minutes
 */
export function calculateETA(distanceMeters: number, speedKmH: number = 15): number {
  if (speedKmH <= 0) return 0;

  const distanceKm = distanceMeters / 1000;
  const etaHours = distanceKm / speedKmH;
  const etaMinutes = etaHours * 60;

  return Math.max(0, Math.ceil(etaMinutes));
}

/**
 * Calculate bearing between two coordinates
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let bearing = toDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Check if user is near shuttle
 */
export function isUserNearShuttle(
  userLocation: { latitude: number; longitude: number },
  shuttleLocation: { latitude: number; longitude: number },
  thresholdMeters: number = 50
): boolean {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    shuttleLocation.latitude,
    shuttleLocation.longitude
  );

  return distance <= thresholdMeters;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(minutes: number): string {
  if (minutes < 1) {
    return 'Now';
  }

  if (minutes === 1) {
    return '1 minute';
  }

  return `${minutes} minutes`;
}

/**
 * Create route bounds for map zoom/pan operations
 */
export interface Bounds {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
}

export function createRouteBounds(points: Location[]): Bounds | null {
  if (points.length === 0) return null;

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  return {
    ne: { lat: maxLat, lng: maxLng },
    sw: { lat: minLat, lng: minLng },
  };
}

/**
 * Check if location is within bounds
 */
export function isLocationWithinBounds(
  location: Location,
  bounds: Bounds
): boolean {
  return (
    location.latitude >= bounds.sw.lat &&
    location.latitude <= bounds.ne.lat &&
    location.longitude >= bounds.sw.lng &&
    location.longitude <= bounds.ne.lng
  );
}
