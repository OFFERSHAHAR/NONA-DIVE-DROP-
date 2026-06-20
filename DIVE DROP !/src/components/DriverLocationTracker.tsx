/**
 * Driver Location Tracker Component
 * Continuously tracks and sends driver location during active trip
 */

'use client';

import { useEffect, useState } from 'react';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { LocationError } from '@/lib/location/locationService';

interface DriverLocationTrackerProps {
  tripId: string;
  userId: string;
  isActive: boolean;
}

export function DriverLocationTracker({
  tripId,
  userId,
  isActive,
}: DriverLocationTrackerProps) {
  const [statusMessage, setStatusMessage] = useState<string>('');

  const {
    isTracking,
    isSupported,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermission,
    isLowBattery,
  } = useLocationTracking({
    tripId,
    userId,
    userType: 'driver',
    enabled: isActive,
    config: {
      driverUpdateInterval: 10000, // 10 seconds
      highAccuracy: true,
      timeout: 10000,
    },
    onError: (err: LocationError) => {
      console.error('Location tracking error:', err);
      setStatusMessage(`Error: ${err.message}`);
    },
  });

  // Update status message
  useEffect(() => {
    if (!isSupported) {
      setStatusMessage('Location services not supported on this device');
      return;
    }

    if (isTracking) {
      setStatusMessage(isLowBattery ? 'Tracking (Low Battery)' : 'Tracking...');
    } else if (error) {
      setStatusMessage(`Error: ${error.message}`);
    } else if (isActive && permissionStatus === 'denied') {
      setStatusMessage('Location permission denied');
    } else {
      setStatusMessage('Not tracking');
    }
  }, [isTracking, error, isActive, permissionStatus, isSupported, isLowBattery]);

  // Handle permission request
  const handleRequestPermission = async () => {
    try {
      await requestPermission();
    } catch (err) {
      console.error('Failed to request permission:', err);
    }
  };

  // If not supported, show message
  if (!isSupported) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          Location services are not available on this device
        </p>
      </div>
    );
  }

  // If permission denied, show request button
  if (permissionStatus === 'denied') {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm mb-3">
          Location access is required to share your position with passengers
        </p>
        <button
          onClick={handleRequestPermission}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Enable Location
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-blue-900 font-semibold text-sm">
            {statusMessage}
          </p>
          {isTracking && (
            <p className="text-blue-700 text-xs mt-1">
              Sending updates every 10 seconds
            </p>
          )}
          {isLowBattery && (
            <p className="text-orange-600 text-xs mt-1 font-medium">
              ⚠️ Low battery mode: accuracy reduced to save power
            </p>
          )}
        </div>
        {isTracking && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-blue-700 text-xs">Live</span>
          </div>
        )}
      </div>
    </div>
  );
}
