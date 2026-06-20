/**
 * Driver Location Tracking Service
 * Manages GPS tracking for driver app - sends location updates to server
 *
 * Usage:
 *   startLocationTracking(tripId)  // Start tracking
 *   stopLocationTracking()         // Stop tracking
 *   getLocationStatus()            // Check if tracking
 */

type LocationCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

interface LocationServiceConfig {
  updateIntervalMs?: number; // How often to send updates
  enableHighAccuracy?: boolean;
  maxAge?: number;
  timeout?: number;
  onSuccess?: LocationCallback;
  onError?: ErrorCallback;
}

class DriverLocationService {
  private watchId: number | null = null;
  private currentTripId: string | null = null;
  private isTracking = false;
  private updateQueue: GeolocationPosition[] = [];
  private updateIntervalMs = 15000; // 15 seconds default
  private updateTimer: NodeJS.Timeout | null = null;
  private config: Required<LocationServiceConfig>;

  constructor(defaultConfig?: LocationServiceConfig) {
    this.config = {
      updateIntervalMs: defaultConfig?.updateIntervalMs ?? 15000,
      enableHighAccuracy: defaultConfig?.enableHighAccuracy ?? true,
      maxAge: defaultConfig?.maxAge ?? 0,
      timeout: defaultConfig?.timeout ?? 5000,
      onSuccess: defaultConfig?.onSuccess ?? (() => {}),
      onError: defaultConfig?.onError ?? (() => {}),
    };
  }

  /**
   * Start tracking driver location
   */
  public start(tripId: string, customConfig?: Partial<LocationServiceConfig>): void {
    if (this.isTracking) {
      console.warn(
        `Already tracking trip ${this.currentTripId}. Stop first before starting new trip.`
      );
      return;
    }

    if (!tripId) {
      throw new Error("Trip ID is required to start tracking");
    }

    // Update config if provided
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    this.currentTripId = tripId;
    this.isTracking = true;
    this.updateQueue = [];

    if (!("geolocation" in navigator)) {
      console.error("Geolocation is not available");
      this.config.onError(
        new GeolocationPositionError(
          0,
          "Geolocation is not available in this browser",
          new Error()
        )
      );
      return;
    }

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.onPositionUpdate(position),
      (error) => this.onPositionError(error),
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maxAge,
      }
    );

    // Start periodic update timer
    this.startUpdateTimer();

    console.log(`[LocationService] Started tracking trip: ${tripId}`);
  }

  /**
   * Stop tracking
   */
  public stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.isTracking = false;
    const tripId = this.currentTripId;
    this.currentTripId = null;
    this.updateQueue = [];

    console.log(`[LocationService] Stopped tracking trip: ${tripId}`);
  }

  /**
   * Get current tracking status
   */
  public getStatus(): {
    isTracking: boolean;
    tripId: string | null;
    queuedUpdates: number;
  } {
    return {
      isTracking: this.isTracking,
      tripId: this.currentTripId,
      queuedUpdates: this.updateQueue.length,
    };
  }

  /**
   * Manually send queued locations
   */
  public async flushQueue(): Promise<void> {
    if (this.updateQueue.length === 0 || !this.currentTripId) {
      return;
    }

    const positions = [...this.updateQueue];
    this.updateQueue = [];

    console.log(`[LocationService] Flushing ${positions.length} location updates...`);

    // Send all positions
    const promises = positions.map((pos) => this.sendLocationUpdate(pos));
    const results = await Promise.allSettled(promises);

    // Log results
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      console.warn(`[LocationService] Sent ${succeeded}/${positions.length} updates`);
    }
  }

  /**
   * Pause tracking temporarily (without stopping watch)
   */
  public pause(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    console.log("[LocationService] Paused");
  }

  /**
   * Resume tracking after pause
   */
  public resume(): void {
    if (this.isTracking && !this.updateTimer) {
      this.startUpdateTimer();
      console.log("[LocationService] Resumed");
    }
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  /**
   * Handle position update from geolocation API
   */
  private onPositionUpdate(position: GeolocationPosition): void {
    this.config.onSuccess(position);

    // Queue the update
    this.updateQueue.push(position);

    // Log update
    const { latitude, longitude, accuracy } = position.coords;
    console.log(
      `[LocationService] Position: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy.toFixed(0)}m)`
    );
  }

  /**
   * Handle geolocation error
   */
  private onPositionError(error: GeolocationPositionError): void {
    this.config.onError(error);

    let errorMessage = "Unknown geolocation error";
    switch (error.code) {
      case 1:
        errorMessage = "Permission denied";
        break;
      case 2:
        errorMessage = "Position unavailable";
        break;
      case 3:
        errorMessage = "Request timeout";
        break;
    }

    console.error(`[LocationService] Error: ${errorMessage}`);
  }

  /**
   * Start periodic update timer
   */
  private startUpdateTimer(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      this.flushQueue().catch((error) => {
        console.error("[LocationService] Error flushing queue:", error);
      });
    }, this.config.updateIntervalMs);
  }

  /**
   * Send a single location update to the server
   */
  private async sendLocationUpdate(position: GeolocationPosition): Promise<void> {
    if (!this.currentTripId) {
      throw new Error("No trip ID set");
    }

    const { latitude, longitude, accuracy, altitude } = position.coords;
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch("/api/driver/update-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trip_id: this.currentTripId,
          latitude,
          longitude,
          accuracy: accuracy ?? undefined,
          altitude: altitude ?? undefined,
          timestamp,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error}`);
      }

      // Success - log and continue
    } catch (error) {
      console.error("[LocationService] Failed to send location:", error);
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let locationService: DriverLocationService | null = null;

export function getLocationService(
  config?: LocationServiceConfig
): DriverLocationService {
  if (!locationService) {
    locationService = new DriverLocationService(config);
  }
  return locationService;
}

// ============================================================================
// CONVENIENCE EXPORTS (for use without the singleton)
// ============================================================================

export function startLocationTracking(tripId: string): void {
  getLocationService().start(tripId);
}

export function stopLocationTracking(): void {
  getLocationService().stop();
}

export function pauseLocationTracking(): void {
  getLocationService().pause();
}

export function resumeLocationTracking(): void {
  getLocationService().resume();
}

export function getLocationStatus() {
  return getLocationService().getStatus();
}

export async function flushLocationQueue(): Promise<void> {
  return getLocationService().flushQueue();
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useEffect, useRef } from "react";

interface UseLocationTrackingProps {
  tripId: string;
  enabled?: boolean;
  updateIntervalMs?: number;
  onError?: (error: string) => void;
}

/**
 * React hook for driver location tracking
 *
 * Usage:
 * const { status, accuracy } = useLocationTracking({
 *   tripId: "123",
 *   updateIntervalMs: 15000,
 * });
 */
export function useLocationTracking({
  tripId,
  enabled = true,
  updateIntervalMs = 15000,
  onError,
}: UseLocationTrackingProps): {
  isTracking: boolean;
  lastPosition: GeolocationCoordinates | null;
  error: string | null;
} {
  const [isTracking, setIsTracking] = React.useState(false);
  const [lastPosition, setLastPosition] = React.useState<GeolocationCoordinates | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const serviceRef = useRef<DriverLocationService | null>(null);

  useEffect(() => {
    if (!enabled || !tripId) return;

    // Initialize service
    if (!serviceRef.current) {
      serviceRef.current = getLocationService({
        updateIntervalMs,
        onSuccess: (position) => {
          setLastPosition(position.coords);
          setError(null);
        },
        onError: (geoError) => {
          const errorMsg = `Geolocation Error: ${geoError.message}`;
          setError(errorMsg);
          onError?.(errorMsg);
        },
      });
    }

    // Start tracking
    serviceRef.current.start(tripId, { updateIntervalMs });
    setIsTracking(true);

    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.stop();
      }
      setIsTracking(false);
    };
  }, [tripId, enabled, updateIntervalMs, onError]);

  return {
    isTracking,
    lastPosition,
    error,
  };
}
