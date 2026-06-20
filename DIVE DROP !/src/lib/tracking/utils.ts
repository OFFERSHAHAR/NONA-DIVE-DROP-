import { LocationUpdate, ETAInput } from './schemas';

/**
 * Haversine formula to calculate distance between two points
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate ETA in seconds based on distance and average speed
 * Returns ETA in seconds
 */
export function calculateETA(
  distanceMeters: number,
  averageSpeedKmh: number,
  bufferMinutes: number = 5
): number {
  // Convert average speed from km/h to m/s
  const speedMs = (averageSpeedKmh * 1000) / 3600;

  // Calculate time in seconds
  const timeSeconds = distanceMeters / speedMs;

  // Add buffer time
  const bufferSeconds = bufferMinutes * 60;

  return Math.ceil(timeSeconds + bufferSeconds);
}

/**
 * Calculate ETA wrapper that accepts ETAInput
 */
export function calculateETAFromInput(input: ETAInput): number {
  const distance = calculateDistance(
    input.from_lat,
    input.from_lng,
    input.to_lat,
    input.to_lng
  );

  return calculateETA(distance, input.average_speed_kmh, input.buffer_minutes);
}

/**
 * Validate location coordinates sanity checks
 * Returns true if location is valid
 */
export function validateLocationSanity(location: LocationUpdate): boolean {
  // Check latitude/longitude are within valid ranges
  if (location.lat < -90 || location.lat > 90) return false;
  if (location.lng < -180 || location.lng > 180) return false;

  // Check accuracy if provided
  if (location.accuracy !== undefined && location.accuracy < 0) return false;

  // Check speed if provided (max reasonable speed for vehicle is ~150 km/h)
  if (location.speed !== undefined && location.speed > 200) return false;

  // Check heading if provided
  if (location.heading !== undefined && (location.heading < 0 || location.heading > 360)) {
    return false;
  }

  return true;
}

/**
 * Calculate bearing between two points
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  const bearing = Math.atan2(y, x);
  return (toDeg(bearing) + 360) % 360;
}

/**
 * Convert radians to degrees
 */
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Format ETA as readable string
 */
export function formatETA(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'Calculating...';

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 1) return 'Less than 1 minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

/**
 * Format distance as readable string
 */
export function formatDistance(meters: number | null): string {
  if (meters === null || meters === undefined) return 'Calculating...';

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Check if location update is stale (older than X seconds)
 */
export function isLocationStale(
  lastUpdateTimestamp: number,
  maxAgeSeconds: number = 60
): boolean {
  const now = Date.now();
  const ageSeconds = (now - lastUpdateTimestamp) / 1000;
  return ageSeconds > maxAgeSeconds;
}

/**
 * Smooth location updates using simple averaging
 * Helps reduce jitter from GPS
 */
export function smoothLocationUpdate(
  previousLocation: { lat: number; lng: number },
  newLocation: { lat: number; lng: number },
  weight: number = 0.7
): { lat: number; lng: number } {
  // Weight new location more heavily if it's more accurate
  return {
    lat: previousLocation.lat * (1 - weight) + newLocation.lat * weight,
    lng: previousLocation.lng * (1 - weight) + newLocation.lng * weight,
  };
}
