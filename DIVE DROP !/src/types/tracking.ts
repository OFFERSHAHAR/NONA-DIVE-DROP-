// Tracking system types for Live Tracking Map
export type TripStatus =
  | 'pending'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'driver_arrived'
  | 'en_route_to_site'
  | 'completed';

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface ShuttleLocation extends Location {
  accuracy?: number;
  bearing?: number;
  speed?: number;
}

export interface ShuttleDriver {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  license_number?: string;
  rating?: number;
  reviews_count?: number;
}

export interface Shuttle {
  id: string;
  plate_number: string;
  model: string;
  driver: ShuttleDriver;
  capacity: number;
  current_passengers: number;
  location: ShuttleLocation;
  route_points?: Location[];
}

export interface DiveTrip {
  id: string;
  user_id: string;
  dive_site_id: string;
  shuttle_id?: string | null;
  status: TripStatus;
  pickup_location: Location;
  destination_location: Location;
  scheduled_time: string;
  pickup_time?: string | null;
  eta_arrival?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingSession {
  trip_id: string;
  user_location: Location;
  shuttle_location?: ShuttleLocation | null;
  distance_to_shuttle?: number; // in meters
  eta_minutes?: number;
  status: TripStatus;
  last_updated: string;
}

export interface NotificationPayload {
  id: string;
  type: 'driver_nearby' | 'driver_arrived' | 'eta_5min' | 'eta_1min' | 'status_change';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface RealtimeTrackingPayload {
  shuttle_location: ShuttleLocation;
  distance_to_shuttle: number;
  eta_minutes: number;
  route_points: Location[];
  timestamp: string;
}

export interface RouteMetrics {
  total_distance: number; // in meters
  estimated_duration: number; // in seconds
  current_distance_remaining: number;
  current_duration_remaining: number;
  polyline?: string; // encoded polyline for map rendering
}
