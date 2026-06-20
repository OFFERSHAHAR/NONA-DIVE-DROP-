/**
 * Shuttle Tracking Types
 * Real-time dive shuttle tracking system with Supabase
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ShuttleTripStatus {
  EN_ROUTE = "en_route",
  ARRIVED = "arrived",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum PassengerStatus {
  WAITING = "waiting",
  PICKED_UP = "picked_up",
  DROPPED_OFF = "dropped_off",
  CANCELLED = "cancelled",
}

export enum ShuttleStatus {
  ACTIVE = "active",
  OFFLINE = "offline",
  MAINTENANCE = "maintenance",
}

// ============================================================================
// SHUTTLE CORE TYPES
// ============================================================================

export interface Shuttle {
  id: string;
  name: string;
  driver_id: string;
  capacity: number;
  status: ShuttleStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SHUTTLE TRIP TYPES
// ============================================================================

export interface ShuttleTrip {
  id: string;
  shuttle_id: string;
  driver_id: string;

  // Locations
  pickup_location: string;
  dropoff_location: string;

  // Current location (coordinates + accuracy)
  current_latitude: number | null;
  current_longitude: number | null;
  current_location?: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  } | null;

  // Location metadata
  accuracy: number | null; // meters
  altitude: number | null; // meters

  // Status
  status: ShuttleTripStatus;

  // Timestamps
  started_at: string;
  arrived_at: string | null;
  completed_at: string | null;

  // ETA
  initial_eta_minutes: number | null;
  estimated_arrival: string | null;

  created_at: string;
  updated_at: string;
}

export interface ShuttleTripUpdate {
  current_latitude?: number;
  current_longitude?: number;
  accuracy?: number;
  altitude?: number;
  status?: ShuttleTripStatus;
  arrived_at?: string | null;
  completed_at?: string | null;
  estimated_arrival?: string | null;
}

export interface ShuttleTripWithPassengers extends ShuttleTrip {
  shuttle_passengers: ShuttlePassenger[];
}

// ============================================================================
// PASSENGER TYPES
// ============================================================================

export interface ShuttlePassenger {
  id: string;
  trip_id: string;
  user_id: string;

  // Locations
  pickup_location: string;
  dropoff_location: string;

  // Coordinates
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;

  // Status
  status: PassengerStatus;

  // Timestamps
  pickup_requested_at: string;
  picked_up_at: string | null;
  dropped_off_at: string | null;

  // ETA
  estimated_pickup: string | null;

  created_at: string;
  updated_at: string;
}

export interface ShuttlePassengerUpdate {
  status?: PassengerStatus;
  picked_up_at?: string | null;
  dropped_off_at?: string | null;
  estimated_pickup?: string | null;
}

// ============================================================================
// LOCATION HISTORY TYPES (Analytics)
// ============================================================================

export interface ShuttleLocationHistory {
  id: string;
  trip_id: string;
  shuttle_id: string;

  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;

  speed: number | null; // km/h
  bearing: number | null; // degrees 0-360

  location?: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };

  timestamp: string;
  created_at: string;
}

// ============================================================================
// REALTIME SUBSCRIPTION TYPES
// ============================================================================

export type ShuttleTripRealtimePayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  new: ShuttleTrip | null;
  old: ShuttleTrip | null;
  eventType: "INSERT" | "UPDATE" | "DELETE";
};

export type ShuttlePassengerRealtimePayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  new: ShuttlePassenger | null;
  old: ShuttlePassenger | null;
  eventType: "INSERT" | "UPDATE" | "DELETE";
};

// ============================================================================
// GEOLOCATION QUERY RESULT TYPES
// ============================================================================

export interface NearbyShuttle {
  shuttle_id: string;
  trip_id: string;
  distance_meters: number;
  current_latitude: number;
  current_longitude: number;
}

export interface DistanceInfo {
  distance_meters: number;
  distance_km: number;
  distance_miles: number;
}

// ============================================================================
// ETA CALCULATION TYPES
// ============================================================================

export interface ETAData {
  eta_seconds: number;
  eta_minutes: number;
  distance_meters: number;
  estimated_arrival: Date;
}

// ============================================================================
// DRIVER LOCATION UPDATE (sent by driver app)
// ============================================================================

export interface DriverLocationUpdate {
  trip_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
  timestamp?: string;
}

// ============================================================================
// DIVER / PASSENGER VIEW
// ============================================================================

export interface DiverShuttleTrackingView {
  trip: ShuttleTrip;
  shuttle: Shuttle;
  passengers: ShuttlePassenger[];
  myPassengerBooking: ShuttlePassenger;
  distance_to_pickup: DistanceInfo;
  eta_to_pickup: ETAData;
}

// ============================================================================
// DRIVER VIEW
// ============================================================================

export interface DriverShuttleView {
  trip: ShuttleTrip;
  shuttle: Shuttle;
  passengers: ShuttlePassenger[];
  next_pickup: ShuttlePassenger | null;
  next_dropoff: ShuttlePassenger | null;
}
