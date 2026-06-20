/**
 * Unit Tests for Tracking Utilities
 *
 * Run with: npm test -- src/lib/tracking/__tests__/utils.test.ts
 */

import {
  calculateDistance,
  calculateETA,
  calculateETAFromInput,
  validateLocationSanity,
  calculateBearing,
  formatETA,
  formatDistance,
  isLocationStale,
  smoothLocationUpdate,
} from '../utils';

describe('Tracking Utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points using Haversine formula', () => {
      // Tel Aviv to Jerusalem: approximately 60 km
      const distance = calculateDistance(32.0853, 34.7818, 31.7683, 35.2137);
      expect(distance).toBeGreaterThan(50000); // meters
      expect(distance).toBeLessThan(70000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(32.0853, 34.7818, 32.0853, 34.7818);
      expect(distance).toBeLessThan(1); // Allow small rounding error
    });

    it('should handle antipodal points', () => {
      // Distance between north and south pole
      const distance = calculateDistance(90, 0, -90, 0);
      expect(distance).toBeGreaterThan(20000000); // ~20,000 km
    });
  });

  describe('calculateETA', () => {
    it('should calculate ETA correctly', () => {
      // 10 km distance, 50 km/h speed, 5 min buffer
      // Expected: 12 minutes (10 + 2 buffer)
      const etaSeconds = calculateETA(10000, 50, 5);
      expect(etaSeconds).toBeGreaterThan(600); // > 10 min
      expect(etaSeconds).toBeLessThan(900); // < 15 min
    });

    it('should include buffer time', () => {
      const etaWithoutBuffer = calculateETA(10000, 50, 0);
      const etaWithBuffer = calculateETA(10000, 50, 5);
      expect(etaWithBuffer).toBeGreaterThan(etaWithoutBuffer);
      expect(etaWithBuffer - etaWithoutBuffer).toBeGreaterThanOrEqual(300); // ~5 min
    });

    it('should handle zero distance', () => {
      const etaSeconds = calculateETA(0, 50, 5);
      expect(etaSeconds).toBeGreaterThan(0); // At least buffer
    });
  });

  describe('validateLocationSanity', () => {
    it('should accept valid location', () => {
      const valid = validateLocationSanity({
        lat: 32.0853,
        lng: 34.7818,
        accuracy: 10,
        speed: 50,
        heading: 90,
      });
      expect(valid).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const invalid = validateLocationSanity({
        lat: 91, // > 90
        lng: 34.7818,
      });
      expect(invalid).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const invalid = validateLocationSanity({
        lat: 32.0853,
        lng: 181, // > 180
      });
      expect(invalid).toBe(false);
    });

    it('should reject invalid speed', () => {
      const invalid = validateLocationSanity({
        lat: 32.0853,
        lng: 34.7818,
        speed: 250, // Unrealistic for vehicle
      });
      expect(invalid).toBe(false);
    });

    it('should reject invalid heading', () => {
      const invalid = validateLocationSanity({
        lat: 32.0853,
        lng: 34.7818,
        heading: 361, // > 360
      });
      expect(invalid).toBe(false);
    });

    it('should reject negative accuracy', () => {
      const invalid = validateLocationSanity({
        lat: 32.0853,
        lng: 34.7818,
        accuracy: -5,
      });
      expect(invalid).toBe(false);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between two points', () => {
      // North
      const northBearing = calculateBearing(0, 0, 1, 0);
      expect(northBearing).toBeLessThan(45); // Close to 0°

      // East
      const eastBearing = calculateBearing(0, 0, 0, 1);
      expect(eastBearing).toBeGreaterThan(45);
      expect(eastBearing).toBeLessThan(135);

      // South
      const southBearing = calculateBearing(0, 0, -1, 0);
      expect(southBearing).toBeGreaterThan(135);
      expect(southBearing).toBeLessThan(225);

      // West
      const westBearing = calculateBearing(0, 0, 0, -1);
      expect(westBearing).toBeGreaterThan(225);
      expect(westBearing).toBeLessThan(315);
    });
  });

  describe('formatETA', () => {
    it('should format ETA seconds to readable string', () => {
      expect(formatETA(0)).toBe('Less than 1 minute');
      expect(formatETA(30)).toBe('Less than 1 minute');
      expect(formatETA(60)).toBe('1 minute');
      expect(formatETA(120)).toBe('2 minutes');
      expect(formatETA(300)).toBe('5 minutes');
    });

    it('should handle null', () => {
      expect(formatETA(null)).toBe('Calculating...');
    });
  });

  describe('formatDistance', () => {
    it('should format distance in meters for short distances', () => {
      expect(formatDistance(100)).toBe('100 m');
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('should format distance in kilometers for long distances', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(5500)).toBe('5.5 km');
      expect(formatDistance(50000)).toBe('50.0 km');
    });

    it('should handle null', () => {
      expect(formatDistance(null)).toBe('Calculating...');
    });
  });

  describe('isLocationStale', () => {
    it('should detect stale location', () => {
      const oneMinuteAgo = Date.now() - 60000;
      const isStale = isLocationStale(oneMinuteAgo, 30);
      expect(isStale).toBe(true);
    });

    it('should detect fresh location', () => {
      const fiveSecondsAgo = Date.now() - 5000;
      const isStale = isLocationStale(fiveSecondsAgo, 30);
      expect(isStale).toBe(false);
    });
  });

  describe('smoothLocationUpdate', () => {
    it('should smooth noisy location updates', () => {
      const previous = { lat: 32.0, lng: 34.0 };
      const newLocation = { lat: 32.01, lng: 34.01 };
      const smoothed = smoothLocationUpdate(previous, newLocation, 0.7);

      expect(smoothed.lat).toBeGreaterThan(previous.lat);
      expect(smoothed.lat).toBeLessThan(newLocation.lat);
      expect(smoothed.lng).toBeGreaterThan(previous.lng);
      expect(smoothed.lng).toBeLessThan(newLocation.lng);
    });

    it('should weight new location heavily with high weight', () => {
      const previous = { lat: 32.0, lng: 34.0 };
      const newLocation = { lat: 32.01, lng: 34.01 };
      const smoothed = smoothLocationUpdate(previous, newLocation, 0.9);

      // Closer to new location with high weight
      expect(smoothed.lat).toBeCloseTo(newLocation.lat, 1);
      expect(smoothed.lng).toBeCloseTo(newLocation.lng, 1);
    });

    it('should weight new location lightly with low weight', () => {
      const previous = { lat: 32.0, lng: 34.0 };
      const newLocation = { lat: 32.01, lng: 34.01 };
      const smoothed = smoothLocationUpdate(previous, newLocation, 0.1);

      // Closer to previous location with low weight
      expect(smoothed.lat).toBeCloseTo(previous.lat, 2);
      expect(smoothed.lng).toBeCloseTo(previous.lng, 2);
    });
  });
});
