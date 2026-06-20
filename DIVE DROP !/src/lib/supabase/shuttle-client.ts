/**
 * Supabase Shuttle Tracking Client
 * Handles database operations and realtime subscriptions for dive shuttle tracking
 */

import { createClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ShuttleTrip,
  ShuttleTripUpdate,
  ShuttlePassenger,
  ShuttlePassengerUpdate,
  ShuttleLocationHistory,
  NearbyShuttle,
  DriverLocationUpdate,
  ShuttleTripStatus,
  PassengerStatus,
} from "@/types/shuttle";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// SHUTTLE TRIP QUERIES
// ============================================================================

/**
 * Get a shuttle trip by ID
 */
export async function getShuttleTrip(tripId: string): Promise<ShuttleTrip> {
  const { data, error } = await supabase
    .from("shuttle_trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (error) throw error;
  return data as ShuttleTrip;
}

/**
 * Get all trips for a driver
 */
export async function getDriverTrips(driverId: string): Promise<ShuttleTrip[]> {
  const { data, error } = await supabase
    .from("shuttle_trips")
    .select("*")
    .eq("driver_id", driverId)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return data as ShuttleTrip[];
}

/**
 * Get active trips (en_route or arrived)
 */
export async function getActiveTrips(): Promise<ShuttleTrip[]> {
  const { data, error } = await supabase
    .from("shuttle_trips")
    .select("*")
    .in("status", ["en_route", "arrived"])
    .order("started_at", { ascending: false });

  if (error) throw error;
  return data as ShuttleTrip[];
}

/**
 * Create a new shuttle trip
 */
export async function createShuttleTrip(
  shuttleId: string,
  driverId: string,
  pickupLocation: string,
  dropoffLocation: string,
  pickupLat?: number,
  pickupLon?: number
): Promise<ShuttleTrip> {
  const { data, error } = await supabase
    .from("shuttle_trips")
    .insert({
      shuttle_id: shuttleId,
      driver_id: driverId,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      current_latitude: pickupLat,
      current_longitude: pickupLon,
      status: "en_route",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ShuttleTrip;
}

/**
 * Update shuttle trip location and status
 */
export async function updateShuttleTrip(
  tripId: string,
  update: ShuttleTripUpdate
): Promise<ShuttleTrip> {
  const { data, error } = await supabase
    .from("shuttle_trips")
    .update(update)
    .eq("id", tripId)
    .select()
    .single();

  if (error) throw error;
  return data as ShuttleTrip;
}

/**
 * Update trip status to arrived
 */
export async function markTripArrived(tripId: string): Promise<ShuttleTrip> {
  return updateShuttleTrip(tripId, {
    status: "arrived" as ShuttleTripStatus,
    arrived_at: new Date().toISOString(),
  });
}

/**
 * Update trip status to completed
 */
export async function markTripCompleted(tripId: string): Promise<ShuttleTrip> {
  return updateShuttleTrip(tripId, {
    status: "completed" as ShuttleTripStatus,
    completed_at: new Date().toISOString(),
  });
}

// ============================================================================
// PASSENGER QUERIES
// ============================================================================

/**
 * Get passengers for a trip
 */
export async function getTripPassengers(tripId: string): Promise<ShuttlePassenger[]> {
  const { data, error } = await supabase
    .from("shuttle_passengers")
    .select("*")
    .eq("trip_id", tripId);

  if (error) throw error;
  return data as ShuttlePassenger[];
}

/**
 * Get passenger booking by ID
 */
export async function getPassengerBooking(
  bookingId: string
): Promise<ShuttlePassenger> {
  const { data, error } = await supabase
    .from("shuttle_passengers")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error) throw error;
  return data as ShuttlePassenger;
}

/**
 * Get all active bookings for a user
 */
export async function getUserBookings(userId: string): Promise<ShuttlePassenger[]> {
  const { data, error } = await supabase
    .from("shuttle_passengers")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["waiting", "picked_up"])
    .order("pickup_requested_at", { ascending: false });

  if (error) throw error;
  return data as ShuttlePassenger[];
}

/**
 * Create passenger booking
 */
export async function createPassengerBooking(
  tripId: string,
  userId: string,
  pickupLocation: string,
  dropoffLocation: string,
  pickupLat?: number,
  pickupLon?: number,
  dropoffLat?: number,
  dropoffLon?: number
): Promise<ShuttlePassenger> {
  const { data, error } = await supabase
    .from("shuttle_passengers")
    .insert({
      trip_id: tripId,
      user_id: userId,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLon,
      dropoff_latitude: dropoffLat,
      dropoff_longitude: dropoffLon,
      status: "waiting",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ShuttlePassenger;
}

/**
 * Update passenger status
 */
export async function updatePassengerStatus(
  passengerId: string,
  update: ShuttlePassengerUpdate
): Promise<ShuttlePassenger> {
  const { data, error } = await supabase
    .from("shuttle_passengers")
    .update(update)
    .eq("id", passengerId)
    .select()
    .single();

  if (error) throw error;
  return data as ShuttlePassenger;
}

/**
 * Mark passenger as picked up
 */
export async function markPassengerPickedUp(passengerId: string): Promise<ShuttlePassenger> {
  return updatePassengerStatus(passengerId, {
    status: "picked_up" as PassengerStatus,
    picked_up_at: new Date().toISOString(),
  });
}

/**
 * Mark passenger as dropped off
 */
export async function markPassengerDroppedOff(
  passengerId: string
): Promise<ShuttlePassenger> {
  return updatePassengerStatus(passengerId, {
    status: "dropped_off" as PassengerStatus,
    dropped_off_at: new Date().toISOString(),
  });
}

// ============================================================================
// LOCATION HISTORY (Analytics & Diagnostics)
// ============================================================================

/**
 * Get location history for a trip
 */
export async function getTripLocationHistory(
  tripId: string,
  limit: number = 100
): Promise<ShuttleLocationHistory[]> {
  const { data, error } = await supabase
    .from("shuttle_location_history")
    .select("*")
    .eq("trip_id", tripId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as ShuttleLocationHistory[];
}

// ============================================================================
// GEOLOCATION QUERIES (PostGIS)
// ============================================================================

/**
 * Find nearby shuttles within a radius
 * Uses PostGIS spatial queries for efficient geographic searches
 */
export async function findNearbyShuttles(
  latitude: number,
  longitude: number,
  radiusMeters: number = 5000
): Promise<NearbyShuttle[]> {
  const { data, error } = await supabase.rpc("find_nearby_shuttles", {
    user_lat: latitude,
    user_lon: longitude,
    radius_meters: radiusMeters,
  });

  if (error) throw error;
  return data as NearbyShuttle[];
}

/**
 * Calculate distance between two points
 */
export async function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number> {
  const { data, error } = await supabase.rpc("calculate_distance", {
    lat1,
    lon1,
    lat2,
    lon2,
  });

  if (error) throw error;
  return data as number; // meters
}

/**
 * Estimate ETA to destination
 */
export async function estimateETA(
  currentLat: number,
  currentLon: number,
  dropoffLat: number,
  dropoffLon: number
): Promise<string> {
  const { data, error } = await supabase.rpc("estimate_eta", {
    current_lat: currentLat,
    current_lon: currentLon,
    dropoff_lat: dropoffLat,
    dropoff_lon: dropoffLon,
  });

  if (error) throw error;
  return data as string; // PostgreSQL INTERVAL
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

type TripCallback = (trip: ShuttleTrip) => void;
type PassengerCallback = (passenger: ShuttlePassenger) => void;

const subscriptions = new Map<string, RealtimeChannel>();

/**
 * Subscribe to realtime updates for a specific trip
 * Called by divers to watch their shuttle approach in real-time
 */
export function subscribeTripUpdates(
  tripId: string,
  onUpdate: TripCallback,
  onError?: (error: Error) => void
): () => void {
  const channelName = `trip:${tripId}`;

  // Unsubscribe if already subscribed
  if (subscriptions.has(channelName)) {
    unsubscribeTripUpdates(tripId);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "shuttle_trips",
        filter: `id=eq.${tripId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as ShuttleTrip);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && err && onError) {
        onError(new Error(`Subscription error: ${err.message}`));
      }
    });

  subscriptions.set(channelName, channel);

  // Return unsubscribe function
  return () => unsubscribeTripUpdates(tripId);
}

/**
 * Subscribe to all trip updates for a driver
 * Called by drivers to see all their active trips
 */
export function subscribeDriverTrips(
  driverId: string,
  onUpdate: TripCallback,
  onError?: (error: Error) => void
): () => void {
  const channelName = `driver-trips:${driverId}`;

  if (subscriptions.has(channelName)) {
    unsubscribeDriverTrips(driverId);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shuttle_trips",
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as ShuttleTrip);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && err && onError) {
        onError(new Error(`Subscription error: ${err.message}`));
      }
    });

  subscriptions.set(channelName, channel);

  return () => unsubscribeDriverTrips(driverId);
}

/**
 * Subscribe to passenger updates for a trip
 * Called by drivers to see passenger status changes
 */
export function subscribePassengerUpdates(
  tripId: string,
  onUpdate: PassengerCallback,
  onError?: (error: Error) => void
): () => void {
  const channelName = `passengers:${tripId}`;

  if (subscriptions.has(channelName)) {
    unsubscribePassengerUpdates(tripId);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shuttle_passengers",
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as ShuttlePassenger);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && err && onError) {
        onError(new Error(`Subscription error: ${err.message}`));
      }
    });

  subscriptions.set(channelName, channel);

  return () => unsubscribePassengerUpdates(tripId);
}

/**
 * Subscribe to user's own bookings
 * Called by divers to watch their active bookings
 */
export function subscribeUserBookings(
  userId: string,
  onUpdate: PassengerCallback,
  onError?: (error: Error) => void
): () => void {
  const channelName = `user-bookings:${userId}`;

  if (subscriptions.has(channelName)) {
    unsubscribeUserBookings(userId);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shuttle_passengers",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as ShuttlePassenger);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && err && onError) {
        onError(new Error(`Subscription error: ${err.message}`));
      }
    });

  subscriptions.set(channelName, channel);

  return () => unsubscribeUserBookings(userId);
}

// ============================================================================
// UNSUBSCRIBE FUNCTIONS
// ============================================================================

export async function unsubscribeTripUpdates(tripId: string): Promise<void> {
  const channelName = `trip:${tripId}`;
  const channel = subscriptions.get(channelName);
  if (channel) {
    await supabase.removeChannel(channel);
    subscriptions.delete(channelName);
  }
}

export async function unsubscribeDriverTrips(driverId: string): Promise<void> {
  const channelName = `driver-trips:${driverId}`;
  const channel = subscriptions.get(channelName);
  if (channel) {
    await supabase.removeChannel(channel);
    subscriptions.delete(channelName);
  }
}

export async function unsubscribePassengerUpdates(tripId: string): Promise<void> {
  const channelName = `passengers:${tripId}`;
  const channel = subscriptions.get(channelName);
  if (channel) {
    await supabase.removeChannel(channel);
    subscriptions.delete(channelName);
  }
}

export async function unsubscribeUserBookings(userId: string): Promise<void> {
  const channelName = `user-bookings:${userId}`;
  const channel = subscriptions.get(channelName);
  if (channel) {
    await supabase.removeChannel(channel);
    subscriptions.delete(channelName);
  }
}

/**
 * Unsubscribe from all subscriptions
 */
export async function unsubscribeAll(): Promise<void> {
  for (const [, channel] of subscriptions) {
    await supabase.removeChannel(channel);
  }
  subscriptions.clear();
}

// ============================================================================
// DRIVER LOCATION UPDATES
// ============================================================================

/**
 * Send location update from driver (called periodically)
 * Updates current trip location and automatically logs to history
 */
export async function updateDriverLocation(
  update: DriverLocationUpdate
): Promise<ShuttleTrip> {
  return updateShuttleTrip(update.trip_id, {
    current_latitude: update.latitude,
    current_longitude: update.longitude,
    accuracy: update.accuracy,
    altitude: update.altitude,
  });
}

/**
 * Batch location updates for better performance
 * Call this instead of updateDriverLocation if updating multiple trips
 */
export async function batchUpdateLocations(
  updates: DriverLocationUpdate[]
): Promise<ShuttleTrip[]> {
  const promises = updates.map((update) => updateDriverLocation(update));
  return Promise.all(promises);
}
