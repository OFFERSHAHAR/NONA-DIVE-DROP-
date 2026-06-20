/**
 * React Hook for Location Tracking
 * Manages driver/passenger location tracking lifecycle
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getLocationService,
  LocationError,
  type LocationUpdate,
  type LocationServiceConfig,
} from '@/lib/location/locationService';

interface UseLocationTrackingOptions {
  tripId: string;
  userId: string;
  userType: 'driver' | 'passenger';
  onLocationUpdate?: (location: LocationUpdate) => Promise<void>;
  onError?: (error: LocationError) => void;
  enabled?: boolean;
  config?: Partial<LocationServiceConfig>;
}

interface UseLocationTrackingReturn {
  isTracking: boolean;
  isSupported: boolean;
  error: LocationError | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermission: () => Promise<void>;
  getCurrentLocation: () => Promise<any>;
  isLowBattery: boolean;
}

/**
 * Hook for managing location tracking
 * Handles permission requests, error recovery, and cleanup
 */
export function useLocationTracking(
  options: UseLocationTrackingOptions
): UseLocationTrackingReturn {
  const {
    tripId,
    userId,
    userType,
    onLocationUpdate,
    onError,
    enabled = false,
    config,
  } = options;

  const locationService = useRef(getLocationService());
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'prompt' | 'unknown'
  >('unknown');
  const [error, setError] = useState<LocationError | null>(null);
  const [isLowBattery, setIsLowBattery] = useState(false);
  const updateQueueRef = useRef<LocationUpdate[]>([]);
  const isSyncingRef = useRef(false);

  const isSupported = locationService.current.isSupported();

  // Default location update handler (sends to API)
  const defaultLocationUpdate = useCallback(async (location: LocationUpdate) => {
    try {
      // Add to queue for batch processing
      updateQueueRef.current.push(location);

      // Flush queue if too large or low connectivity
      if (updateQueueRef.current.length >= 10) {
        await flushLocationQueue();
      }
    } catch (err) {
      console.error('Failed to queue location update:', err);
    }
  }, []);

  // Flush queued location updates to server
  const flushLocationQueue = useCallback(async () => {
    if (isSyncingRef.current || updateQueueRef.current.length === 0) {
      return;
    }

    isSyncingRef.current = true;
    try {
      const updates = [...updateQueueRef.current];
      updateQueueRef.current = [];

      // Send batch update to server
      const response = await fetch('/api/tracking/shuttle/batch-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        // Requeue failed updates
        updateQueueRef.current = [...updates, ...updateQueueRef.current];
      }
    } catch (error) {
      console.error('Failed to sync location updates:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Request location permission
  const requestPermission = useCallback(async () => {
    try {
      const status = await locationService.current.requestPermission();
      setPermissionStatus(status);

      if (status === 'denied') {
        setError(
          new LocationError(
            'PERMISSION_DENIED',
            'Location access denied. Please enable in settings.'
          )
        );
      }
    } catch (err) {
      const locError = err instanceof LocationError
        ? err
        : new LocationError('UNKNOWN', String(err));
      setError(locError);
      if (onError) onError(locError);
    }
  }, [onError]);

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!isSupported) {
      setError(
        new LocationError('UNKNOWN', 'Geolocation not supported on this device')
      );
      return;
    }

    // Check permission first
    if (permissionStatus === 'prompt' || permissionStatus === 'unknown') {
      await requestPermission();
    }

    if (permissionStatus === 'denied') {
      setError(
        new LocationError(
          'PERMISSION_DENIED',
          'Location permission required to track'
        )
      );
      return;
    }

    try {
      if (config) {
        locationService.current.updateConfig(config);
      }

      await locationService.current.startTracking({
        tripId,
        userId,
        userType,
        onLocationUpdate: onLocationUpdate || defaultLocationUpdate,
        onError: (err: LocationError) => {
          setError(err);
          if (onError) onError(err);
        },
        config,
      });

      setIsTracking(true);
      setError(null);

      // Monitor battery status
      monitorBattery();

      // Periodically flush queue
      const flushInterval = setInterval(() => {
        flushLocationQueue();
      }, 30000); // Every 30s

      return () => clearInterval(flushInterval);
    } catch (err) {
      const locError = err instanceof LocationError
        ? err
        : new LocationError('UNKNOWN', String(err));
      setError(locError);
      if (onError) onError(locError);
    }
  }, [
    isSupported,
    permissionStatus,
    tripId,
    userId,
    userType,
    onLocationUpdate,
    onError,
    config,
    requestPermission,
    defaultLocationUpdate,
    flushLocationQueue,
  ]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    locationService.current.stopTracking();
    setIsTracking(false);
    // Flush any remaining updates
    flushLocationQueue();
  }, [flushLocationQueue]);

  // Get current location (one-time)
  const getCurrentLocation = useCallback(async () => {
    try {
      return await locationService.current.getCurrentPosition();
    } catch (err) {
      const locError = err instanceof LocationError
        ? err
        : new LocationError('UNKNOWN', String(err));
      setError(locError);
      throw locError;
    }
  }, []);

  // Monitor battery status
  const monitorBattery = useCallback(() => {
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryStatus = () => {
          setIsLowBattery(battery.level < 0.15);
        };

        updateBatteryStatus();
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);

        return () => {
          battery.removeEventListener('levelchange', updateBatteryStatus);
          battery.removeEventListener('chargingchange', updateBatteryStatus);
        };
      });
    }
  }, []);

  // Auto-start/stop based on enabled flag
  useEffect(() => {
    if (enabled && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }
  }, [enabled, isTracking, startTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isTracking, stopTracking]);

  // Flush queue on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushLocationQueue();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushLocationQueue]);

  return {
    isTracking,
    isSupported,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermission,
    getCurrentLocation,
    isLowBattery,
  };
}
