import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LocationUpdate, TripStatus } from './schemas';

/**
 * Get Supabase client
 */
export async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: any) => {
          cookiesToSet.forEach(({ name, value, options }: any) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

/**
 * Update shuttle current location
 */
export async function updateShuttleLocation(
  tripId: string,
  shuttleId: string,
  location: LocationUpdate
) {
  const supabase = await getSupabaseClient();

  // Update current location in shuttle_trips
  const { data, error } = await supabase
    .from('shuttle_trips')
    .update({
      current_location: `POINT(${location.lng} ${location.lat})`, // PostGIS format: longitude, latitude
      current_location_accuracy: location.accuracy || null,
      current_location_speed: location.speed || null,
      current_location_heading: location.heading || null,
      last_location_update: new Date().toISOString(),
    })
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;

  // Insert into location history for analytics
  await insertLocationHistory(tripId, shuttleId, location);

  return data;
}

/**
 * Insert location into history table for analytics
 */
export async function insertLocationHistory(
  tripId: string,
  shuttleId: string,
  location: LocationUpdate
) {
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from('shuttle_location_history')
    .insert([
      {
        trip_id: tripId,
        shuttle_id: shuttleId,
        location: `POINT(${location.lng} ${location.lat})`,
        accuracy: location.accuracy || null,
        speed: location.speed || null,
        heading: location.heading || null,
        recorded_at: new Date(location.timestamp || Date.now()).toISOString(),
      },
    ]);

  if (error) console.error('Error inserting location history:', error);
  return error === null;
}

/**
 * Get trip details with current location
 */
export async function getTripDetails(tripId: string) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('shuttle_trips')
    .select(`
      id,
      driver_id,
      passenger_id,
      status,
      pickup_location,
      dropoff_location,
      current_location,
      current_location_accuracy,
      current_location_speed,
      current_location_heading,
      last_location_update,
      estimated_arrival_time,
      created_at,
      updated_at,
      shuttle:shuttle_id(id, name, color, license_plate),
      driver:driver_id(
        id,
        user_id,
        users:user_id(id, first_name, last_name, avatar_url)
      ),
      passenger:passenger_id(id, first_name, last_name)
    `)
    .eq('id', tripId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get trip location history
 */
export async function getTripLocationHistory(
  tripId: string,
  limit: number = 100,
  offset: number = 0
) {
  const supabase = await getSupabaseClient();

  const { data, error, count } = await supabase
    .from('shuttle_location_history')
    .select('*', { count: 'exact' })
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

/**
 * Create new trip
 */
export async function createTrip(input: {
  driver_id: string;
  shuttle_id: string;
  passenger_id: string;
  pickup_location: { lat: number; lng: number; address?: string };
  dropoff_location: { lat: number; lng: number; address?: string };
  estimated_arrival_time?: string;
}) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('shuttle_trips')
    .insert([
      {
        driver_id: input.driver_id,
        shuttle_id: input.shuttle_id,
        passenger_id: input.passenger_id,
        pickup_location: {
          lat: input.pickup_location.lat,
          lng: input.pickup_location.lng,
          address: input.pickup_location.address,
        },
        dropoff_location: {
          lat: input.dropoff_location.lat,
          lng: input.dropoff_location.lng,
          address: input.dropoff_location.address,
        },
        status: 'pending',
        estimated_arrival_time: input.estimated_arrival_time || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update trip status
 */
export async function updateTripStatus(
  tripId: string,
  status: TripStatus,
  notes?: string
) {
  const supabase = await getSupabaseClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (notes) {
    updateData.notes = notes;
  }

  // Set completion time if trip is completed
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('shuttle_trips')
    .update(updateData)
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get active trips for a driver
 */
export async function getActiveTripsForDriver(driverId: string) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('shuttle_trips')
    .select(`
      id,
      passenger_id,
      status,
      pickup_location,
      dropoff_location,
      current_location,
      estimated_arrival_time,
      passenger:passenger_id(id, first_name, last_name)
    `)
    .eq('driver_id', driverId)
    .in('status', ['pending', 'in_progress', 'arrived_at_pickup', 'picked_up'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get passenger's current trip
 */
export async function getPassengerCurrentTrip(passengerId: string) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('shuttle_trips')
    .select(`
      id,
      driver_id,
      status,
      pickup_location,
      dropoff_location,
      current_location,
      current_location_accuracy,
      current_location_speed,
      current_location_heading,
      last_location_update,
      estimated_arrival_time,
      shuttle:shuttle_id(id, name, color, license_plate),
      driver:driver_id(
        id,
        user_id,
        users:user_id(id, first_name, last_name, avatar_url, phone)
      )
    `)
    .eq('passenger_id', passengerId)
    .in('status', ['in_progress', 'arrived_at_pickup', 'picked_up'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned"
    throw error;
  }

  return data || null;
}

/**
 * Get trip completion summary
 */
export async function getTripCompletionSummary(tripId: string) {
  const supabase = await getSupabaseClient();

  const { data: trip, error: tripError } = await supabase
    .from('shuttle_trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripError) throw tripError;

  // Get location history stats
  const { data: locations, error: locError } = await supabase
    .from('shuttle_location_history')
    .select('location, recorded_at')
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: true });

  if (locError) throw locError;

  return {
    trip,
    locationUpdates: locations?.length || 0,
    firstLocationUpdate: locations?.[0]?.recorded_at,
    lastLocationUpdate: locations?.[locations.length - 1]?.recorded_at,
  };
}

/**
 * Check if trip is still active
 */
export async function isTripActive(tripId: string): Promise<boolean> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('shuttle_trips')
    .select('status')
    .eq('id', tripId)
    .single();

  if (error) return false;

  const activeStatuses = ['pending', 'in_progress', 'arrived_at_pickup', 'picked_up'];
  return activeStatuses.includes(data.status);
}

/**
 * Broadcast location update via Supabase Realtime
 */
export async function broadcastLocationUpdate(tripId: string, locationData: any) {
  const supabase = await getSupabaseClient();

  // This will trigger Realtime subscribers listening to shuttle_trips changes
  await supabase.realtime.send('broadcast', {
    event: 'location_update',
    payload: {
      trip_id: tripId,
      location: locationData,
      timestamp: new Date().toISOString(),
    },
  });
}
