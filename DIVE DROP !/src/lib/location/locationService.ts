/**
 * Location Tracking Service
 * Handles real-time location updates for drivers and passengers
 * Optimized for web (desktop + mobile browsers)
 */

import { z } from 'zod';

// Location coordinate validation
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  altitude: z.number().optional(),
  altitudeAccuracy: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  timestamp: z.number(),
});

export type Location = z.infer<typeof LocationSchema>;

export const LocationUpdateSchema = z.object({
  tripId: z.string(),
  userId: z.string(),
  userType: z.enum(['driver', 'passenger']),
  location: LocationSchema,
  batteryLevel: z.number().min(0).max(100).optional(),
  isCharging: z.boolean().optional(),
  networkType: z.enum(['wifi', '4g', '5g', 'cellular', 'unknown']).optional(),
});

export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;

// Error types
export class LocationError extends Error {
  constructor(
    public code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN',
    message: string
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

export class LocationServiceConfig {
  // Frequency of location updates (ms)
  driverUpdateInterval: number = 10000; // Driver: every 10s
  passengerUpdateInterval: number = 5000; // Passenger: every 5s

  // Accuracy requirements
  highAccuracy: boolean = true; // High battery usage but better accuracy
  timeout: number = 10000; // Max time to get position (ms)
  maximumAge: number = 0; // Don't use cached positions

  // Battery optimization
  enableBatteryAwareness: boolean = true;
  reducedAccuracyOnLowBattery: boolean = true;
  lowBatteryThreshold: number = 15; // %

  // Error recovery
  maxRetries: number = 3;
  retryBackoffMs: number = 1000;
}

interface LocationWatchOptions {
  tripId: string;
  userId: string;
  userType: 'driver' | 'passenger';
  onLocationUpdate: (location: LocationUpdate) => Promise<void>;
  onError: (error: LocationError) => void;
  config?: Partial<LocationServiceConfig>;
}

/**
 * Web-based location tracking service
 * Works across all browsers and devices
 */
export class LocationService {
  private watchId: number | null = null;
  private config: LocationServiceConfig;
  private isTracking: boolean = false;
  private lastUpdateTime: number = 0;
  private retryCount: number = 0;
  private batteryManager: BatteryManager | null = null;

  constructor() {
    this.config = new LocationServiceConfig();
    this.initBatteryAPI();
  }

  /**
   * Initialize Battery Status API (if available)
   * Works on most modern browsers
   */
  private async initBatteryAPI() {
    if ('getBattery' in navigator) {
      try {
        this.batteryManager = await (navigator as any).getBattery();
      } catch (e) {
        console.warn('Battery API not available');
      }
    }
  }

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permission
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!this.isSupported()) {
      throw new LocationError('UNKNOWN', 'Geolocation not supported');
    }

    try {
      // Try to get permission status
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({
          name: 'geolocation',
        });
        return result.state as 'granted' | 'denied' | 'prompt';
      }

      // Fallback: try to get location (will trigger permission prompt)
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          () => resolve('denied')
        );
      });
    } catch (error) {
      throw new LocationError('UNKNOWN', 'Failed to check location permission');
    }
  }

  /**
   * Start tracking location for driver or passenger
   */
  async startTracking(options: LocationWatchOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new LocationError('UNKNOWN', 'Geolocation not supported');
    }

    if (this.isTracking) {
      console.warn('Location tracking already active');
      return;
    }

    // Merge config
    if (options.config) {
      this.config = { ...this.config, ...options.config };
    }

    this.isTracking = true;
    this.retryCount = 0;

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionSuccess(position, options),
      (error) => this.handlePositionError(error, options),
      {
        enableHighAccuracy: this.config.highAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maximumAge,
      }
    );
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
      this.retryCount = 0;
    }
  }

  /**
   * Get current position (one-time fetch)
   */
  async getCurrentPosition(): Promise<Location> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.parsePosition(position);
          resolve(location);
        },
        (error) => {
          reject(this.mapGeolocationError(error));
        },
        {
          enableHighAccuracy: this.config.highAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        }
      );
    });
  }

  /**
   * Handle successful position update
   */
  private async handlePositionSuccess(
    position: GeolocationPosition,
    options: LocationWatchOptions
  ): Promise<void> {
    try {
      const location = this.parsePosition(position);

      // Rate limiting: respect update intervals
      const now = Date.now();
      const interval =
        options.userType === 'driver'
          ? this.config.driverUpdateInterval
          : this.config.passengerUpdateInterval;

      if (now - this.lastUpdateTime < interval) {
        return; // Skip this update
      }

      this.lastUpdateTime = now;
      this.retryCount = 0; // Reset retry on success

      // Get battery info if available
      const batteryInfo = await this.getBatteryInfo();

      // Adjust accuracy if on low battery
      let finalLocation = location;
      if (
        this.config.enableBatteryAwareness &&
        this.config.reducedAccuracyOnLowBattery &&
        batteryInfo &&
        batteryInfo.batteryLevel < this.config.lowBatteryThreshold
      ) {
        // Round to lower precision to save battery
        finalLocation = {
          ...location,
          accuracy: Math.max(location.accuracy || 10, 50),
        };
      }

      // Send update to server
      const update: LocationUpdate = {
        tripId: options.tripId,
        userId: options.userId,
        userType: options.userType,
        location: finalLocation,
        ...batteryInfo,
      };

      await options.onLocationUpdate(update);
    } catch (error) {
      console.error('Error processing location update:', error);
      if (error instanceof LocationError) {
        options.onError(error);
      }
    }
  }

  /**
   * Handle position error with retry logic
   */
  private handlePositionError(
    error: GeolocationPositionError,
    options: LocationWatchOptions
  ): void {
    const locationError = this.mapGeolocationError(error);

    // Retry logic for transient errors
    if (
      locationError.code === 'TIMEOUT' &&
      this.retryCount < this.config.maxRetries
    ) {
      this.retryCount++;
      const delay = this.config.retryBackoffMs * Math.pow(2, this.retryCount - 1);
      setTimeout(() => {
        if (this.isTracking) {
          // Attempt recovery by restarting watch
          this.stopTracking();
          this.startTracking(options).catch(console.error);
        }
      }, delay);
      return;
    }

    // Permission denied - stop trying
    if (locationError.code === 'PERMISSION_DENIED') {
      this.stopTracking();
    }

    options.onError(locationError);
  }

  /**
   * Parse GeolocationPosition to Location type
   */
  private parsePosition(position: GeolocationPosition): Location {
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } =
      position.coords;

    return LocationSchema.parse({
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      timestamp: position.timestamp,
    });
  }

  /**
   * Map Geolocation API errors to LocationError
   */
  private mapGeolocationError(error: GeolocationPositionError): LocationError {
    const { code, message } = error;

    switch (code) {
      case 1:
        return new LocationError('PERMISSION_DENIED', 'User denied location access');
      case 2:
        return new LocationError('POSITION_UNAVAILABLE', 'Location position unavailable');
      case 3:
        return new LocationError('TIMEOUT', 'Location request timed out');
      default:
        return new LocationError('UNKNOWN', message || 'Unknown location error');
    }
  }

  /**
   * Get battery info (if available)
   */
  private async getBatteryInfo(): Promise<{
    batteryLevel: number;
    isCharging: boolean;
  } | null> {
    if (!this.batteryManager) return null;

    try {
      return {
        batteryLevel: Math.round(this.batteryManager.level * 100),
        isCharging: this.batteryManager.charging,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get network type (if available)
   */
  getNetworkType(): 'wifi' | '4g' | '5g' | 'cellular' | 'unknown' {
    if (!('connection' in navigator)) {
      return 'unknown';
    }

    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType;

    switch (effectiveType) {
      case '4g':
        return '4g';
      case '5g':
        return '5g';
      case '3g':
      case '2g':
        return 'cellular';
      case 'slow-2g':
        return 'cellular';
      default:
        return 'unknown';
    }
  }

  /**
   * Check if low power mode is enabled
   */
  isLowPowerMode(): boolean {
    if (!this.batteryManager) return false;
    return this.config.lowBatteryThreshold > 0 &&
      this.batteryManager.level * 100 < this.config.lowBatteryThreshold;
  }

  /**
   * Get tracking status
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LocationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let instance: LocationService | null = null;

export function getLocationService(): LocationService {
  if (!instance) {
    instance = new LocationService();
  }
  return instance;
}
