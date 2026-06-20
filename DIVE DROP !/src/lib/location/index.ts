/**
 * Location Tracking Module
 * Main export for location tracking functionality
 */

export { LocationService, getLocationService } from './locationService';
export type {
  Location,
  LocationUpdate,
  LocationServiceConfig,
} from './locationService';
export { LocationError } from './locationService';

export {
  RealtimeLocationListener,
  createRealtimeLocationListener,
} from './realtimeLocationListener';
export type { LocationUpdatePayload } from './realtimeLocationListener';

export { DeviceOptimizer, BATTERY_PRESETS, NETWORK_PRESETS } from './deviceOptimizer';
export type { DeviceMetrics } from './deviceOptimizer';
