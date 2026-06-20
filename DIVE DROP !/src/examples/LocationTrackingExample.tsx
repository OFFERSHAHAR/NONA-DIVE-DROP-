/**
 * Complete Location Tracking Usage Example
 * Shows driver and passenger workflows
 */

'use client';

import { useState, useEffect } from 'react';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { DriverLocationTracker } from '@/components/DriverLocationTracker';
import { PassengerMapView } from '@/components/PassengerMapView';
import { DeviceOptimizer, BATTERY_PRESETS } from '@/lib/location';

/**
 * Example: Driver Starting a Trip
 *
 * Flow:
 * 1. Driver opens trip details
 * 2. Component requests location permission
 * 3. Starts tracking GPS every 10 seconds
 * 4. Updates are sent to API and broadcast via Realtime
 * 5. Passengers see driver location in real-time
 * 6. When trip ends, tracking auto-stops
 */
export function DriverTripExample() {
  const [tripId] = useState('trip-abc123');
  const [userId] = useState('driver-xyz789');
  const [isActiveTrip, setIsActiveTrip] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(75);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Driver Trip Example</h2>
        <p className="text-gray-600">
          Location tracking starts automatically when trip is active
        </p>
      </div>

      {/* Status Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm">
          <span className="font-semibold">Trip Status:</span>{' '}
          {isActiveTrip ? '🟢 Active' : '🔴 Inactive'}
        </p>
        <p className="text-sm">
          <span className="font-semibold">Battery:</span> {batteryLevel}%
        </p>
      </div>

      {/* Location Tracker Component */}
      <DriverLocationTracker
        tripId={tripId}
        userId={userId}
        isActive={isActiveTrip}
      />

      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsActiveTrip(!isActiveTrip)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {isActiveTrip ? 'End Trip' : 'Start Trip'}
        </button>
        <button
          onClick={() => setBatteryLevel(Math.max(0, batteryLevel - 10))}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          Drain Battery ({batteryLevel}%)
        </button>
      </div>

      {/* Info */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <p>• Location updates: Every 10 seconds</p>
        <p>• Accuracy: ±5-10 meters (high)</p>
        <p>• Battery drain: ~8-12% per hour</p>
        <p>• Auto-stops when trip ends</p>
      </div>
    </div>
  );
}

/**
 * Example: Passenger Tracking Driver Location
 *
 * Flow:
 * 1. Passenger opens trip details
 * 2. Subscribes to driver location via Realtime
 * 3. Receives location every 10 seconds
 * 4. Displays driver on map
 * 5. Calculates ETA
 * 6. Stops subscription when trip ends
 */
export function PassengerTripExample() {
  const [tripId] = useState('trip-abc123');
  const [passengerId] = useState('passenger-user123');
  const [driverId] = useState('driver-xyz789');

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Passenger Trip Example</h2>
        <p className="text-gray-600">
          Displays driver location with live updates
        </p>
      </div>

      {/* Map Component */}
      <PassengerMapView
        tripId={tripId}
        userId={passengerId}
        driverId={driverId}
      />

      {/* Info */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <p>• Location updates: Every 10 seconds</p>
        <p>• Via Realtime channel subscription</p>
        <p>• ETA calculated using Haversine formula</p>
        <p>• Fallback: Manual polling every 5 seconds</p>
      </div>
    </div>
  );
}

/**
 * Example: Custom Hook Usage with Advanced Config
 *
 * For more control over tracking behavior
 */
export function AdvancedTrackingExample() {
  const [tripId] = useState('trip-abc123');
  const [userId] = useState('user-xyz789');
  const [config, setConfig] = useState('auto');

  const {
    isTracking,
    isSupported,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermission,
    getCurrentLocation,
    isLowBattery,
  } = useLocationTracking({
    tripId,
    userId,
    userType: 'driver',
    enabled: config !== 'manual', // Auto-start if not manual
    config:
      config === 'battery-saving'
        ? {
            driverUpdateInterval: 30000, // Less frequent
            highAccuracy: false, // Reduced accuracy
            timeout: 5000,
          }
        : config === 'high-precision'
          ? {
              driverUpdateInterval: 5000, // More frequent
              highAccuracy: true,
              timeout: 10000,
            }
          : undefined, // Use defaults
  });

  const handleGetCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      console.log('Current location:', location);
      alert(
        `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
      );
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Geolocation not supported</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Advanced Tracking Example</h2>
        <p className="text-gray-600">Manual control with custom configuration</p>
      </div>

      {/* Status Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-2">
        <p className="text-sm">
          <span className="font-semibold">Tracking:</span>{' '}
          {isTracking ? '🟢 Active' : '🔴 Inactive'}
        </p>
        <p className="text-sm">
          <span className="font-semibold">Permission:</span> {permissionStatus}
        </p>
        {isLowBattery && (
          <p className="text-sm text-orange-600 font-semibold">
            ⚠️ Low Battery Mode Active
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600">
            <span className="font-semibold">Error:</span> {error.message}
          </p>
        )}
      </div>

      {/* Config Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold">Configuration:</label>
        <select
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="auto">Auto (Defaults)</option>
          <option value="battery-saving">Battery Saving Mode</option>
          <option value="high-precision">High Precision Mode</option>
          <option value="manual">Manual Control</option>
        </select>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 flex-wrap">
        {!isTracking && permissionStatus === 'denied' && (
          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Request Permission
          </button>
        )}
        {config === 'manual' && (
          <>
            <button
              onClick={startTracking}
              disabled={isTracking}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Start Tracking
            </button>
            <button
              onClick={stopTracking}
              disabled={!isTracking}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Stop Tracking
            </button>
          </>
        )}
        <button
          onClick={handleGetCurrentLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Get Current Location
        </button>
      </div>

      {/* Configuration Info */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        {config === 'battery-saving' && (
          <>
            <p>• Update interval: 30 seconds (vs. 10s default)</p>
            <p>• Accuracy: ±50m (vs. ±5-10m)</p>
            <p>• Battery saving: ~60% reduction</p>
          </>
        )}
        {config === 'high-precision' && (
          <>
            <p>• Update interval: 5 seconds (vs. 10s default)</p>
            <p>• Accuracy: ±5-10m (high accuracy)</p>
            <p>• Battery usage: ~50% increase</p>
          </>
        )}
        {config === 'auto' && (
          <>
            <p>• Auto-starts when component mounts</p>
            <p>• Auto-stops when unmounted</p>
            <p>• Adapts to device battery level</p>
          </>
        )}
        {config === 'manual' && (
          <>
            <p>• Disabled by default</p>
            <p>• Use buttons to start/stop</p>
            <p>• Get one-time location with button</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Example: Device Optimizer Usage
 *
 * Automatically adjusts tracking based on device state
 */
export function DeviceOptimizedExample() {
  const [tripId] = useState('trip-abc123');
  const [userId] = useState('user-xyz789');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getMetrics = async () => {
      try {
        const deviceMetrics = await DeviceOptimizer.getDeviceMetrics();
        const recommended = await DeviceOptimizer.getRecommendedConfig();
        setMetrics(recommended);
      } catch (error) {
        console.error('Failed to get metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    getMetrics();

    // Monitor battery changes
    const unsubscribe = DeviceOptimizer.onBatteryChange((battery) => {
      console.log('Battery changed:', battery);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="p-4">Loading device metrics...</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Device-Optimized Example</h2>
        <p className="text-gray-600">
          Automatically adapts to device capabilities
        </p>
      </div>

      {/* Device Metrics */}
      {metrics && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Device Metrics:</h3>
          <div className="space-y-1 text-sm">
            <p>
              Battery Level: {metrics.metrics.batteryLevel}%{' '}
              {metrics.metrics.isCharging && '(Charging)'}
            </p>
            <p>Network: {metrics.metrics.networkType}</p>
            <p>
              High Accuracy:{' '}
              {metrics.highAccuracy ? 'Yes (±5-10m)' : 'No (±50m)'}
            </p>
            <p>
              Driver Update Interval: {metrics.driverUpdateInterval}ms (
              {(metrics.driverUpdateInterval / 1000).toFixed(1)}s)
            </p>
            <p>
              Passenger Update Interval: {metrics.passengerUpdateInterval}ms (
              {(metrics.passengerUpdateInterval / 1000).toFixed(1)}s)
            </p>
          </div>
        </div>
      )}

      {/* Using Recommended Config */}
      <DriverLocationTracker
        tripId={tripId}
        userId={userId}
        isActive={true}
      />

      {/* Battery Presets Info */}
      <div className="bg-blue-50 p-4 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Available Presets:</h3>
        <ul className="space-y-1 text-gray-600">
          <li>• Charging: 5s interval, high accuracy</li>
          <li>• Good: 10s interval, high accuracy</li>
          <li>• Moderate: 15s interval, high accuracy</li>
          <li>• Low: 30s interval, reduced accuracy</li>
          <li>• Critical: 60s interval, reduced accuracy</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Example: Multiple Users in Same Trip
 *
 * Shows how multiple drivers/passengers can share location
 */
export function MultiUserExample() {
  const [tripId] = useState('trip-group-123');
  const [userId] = useState('user-abc123');
  const [userType, setUserType] = useState<'driver' | 'passenger'>('driver');

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Multi-User Trip Example</h2>
        <p className="text-gray-600">
          Multiple drivers and passengers sharing location
        </p>
      </div>

      {/* User Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setUserType('driver')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            userType === 'driver'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Driver
        </button>
        <button
          onClick={() => setUserType('passenger')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            userType === 'passenger'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Passenger
        </button>
      </div>

      {/* Appropriate Component */}
      {userType === 'driver' ? (
        <DriverLocationTracker
          tripId={tripId}
          userId={userId}
          isActive={true}
        />
      ) : (
        <PassengerMapView
          tripId={tripId}
          userId={userId}
          driverId="driver-xyz789"
        />
      )}

      {/* Info */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        {userType === 'driver' ? (
          <>
            <p>• Continuously tracking your location</p>
            <p>• Updates sent every 10 seconds</p>
            <p>• Passengers can see your real-time location</p>
          </>
        ) : (
          <>
            <p>• Receiving driver location updates</p>
            <p>• Updates every 10 seconds</p>
            <p>• ETA calculated automatically</p>
          </>
        )}
      </div>
    </div>
  );
}
