/**
 * API Endpoint: Batch Location Updates
 * Handles real-time location tracking for drivers and passengers
 * POST /api/tracking/shuttle/batch-location
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation
const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  timestamp: z.number(),
});

const LocationUpdateSchema = z.object({
  tripId: z.string().uuid(),
  userId: z.string().uuid(),
  userType: z.enum(['driver', 'passenger']),
  location: LocationSchema,
  batteryLevel: z.number().min(0).max(100).optional(),
  isCharging: z.boolean().optional(),
  networkType: z.string().optional(),
});

const BatchLocationRequestSchema = z.object({
  updates: z.array(LocationUpdateSchema),
  timestamp: z.number(),
});

type LocationUpdate = z.infer<typeof LocationUpdateSchema>;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * POST /api/tracking/shuttle/batch-location
 * Store batch location updates
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = BatchLocationRequestSchema.parse(body);

    // Authenticate user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Process location updates
    const tripLocations = await Promise.all(
      validated.updates.map(async (update) => {
        // Verify user is part of trip (driver or passenger)
        const tripCheck = await supabase
          .from('trip_participants')
          .select('id')
          .eq('trip_id', update.tripId)
          .eq('user_id', user.id)
          .eq('user_type', update.userType)
          .single();

        if (tripCheck.error) {
          console.error(`User not in trip ${update.tripId}`);
          return null;
        }

        return {
          trip_id: update.tripId,
          user_id: update.userId,
          user_type: update.userType,
          latitude: update.location.latitude,
          longitude: update.location.longitude,
          accuracy: update.location.accuracy || 50,
          altitude: update.location.altitude,
          heading: update.location.heading,
          speed: update.location.speed,
          battery_level: update.batteryLevel,
          is_charging: update.isCharging,
          network_type: update.networkType,
          recorded_at: new Date(update.location.timestamp).toISOString(),
        };
      })
    );

    // Filter out failed validations
    const validLocations = tripLocations.filter((loc) => loc !== null);

    if (validLocations.length === 0) {
      return NextResponse.json(
        { error: 'No valid locations to process' },
        { status: 400 }
      );
    }

    // Insert into database
    const { data, error } = await supabase
      .from('trip_locations')
      .insert(validLocations);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to store locations' }, { status: 500 });
    }

    // Update trip live tracking (Redis cache or realtime)
    // This allows passenger/driver apps to get live updates
    await updateTripLiveTracking(validLocations);

    return NextResponse.json(
      {
        success: true,
        processed: validLocations.length,
        failed: tripLocations.length - validLocations.length,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Batch location error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update trip live tracking for real-time display
 * Uses Supabase Realtime or Redis for instant delivery
 */
async function updateTripLiveTracking(
  locations: Array<{
    trip_id: string;
    user_id: string;
    user_type: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
  }>
) {
  // Group by trip for batch processing
  const locationsByTrip = new Map<string, typeof locations>();

  for (const loc of locations) {
    if (!locationsByTrip.has(loc.trip_id)) {
      locationsByTrip.set(loc.trip_id, []);
    }
    locationsByTrip.get(loc.trip_id)!.push(loc);
  }

  // Update active trips with latest location
  for (const [tripId, locs] of locationsByTrip) {
    const latest = locs[locs.length - 1];

    // Update trip current position (for live map)
    await supabase
      .from('trips')
      .update({
        current_location: {
          latitude: latest.latitude,
          longitude: latest.longitude,
          accuracy: latest.accuracy,
        },
        last_location_update: new Date().toISOString(),
      })
      .eq('id', tripId);

    // Broadcast to subscribed clients via Realtime
    // This triggers location-update channel subscriptions
    await supabase
      .channel(`trip:${tripId}`)
      .send('broadcast', {
        event: 'location-update',
        payload: {
          trip_id: tripId,
          locations: locs.map((loc) => ({
            user_id: loc.user_id,
            user_type: loc.user_type,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
          })),
          timestamp: Date.now(),
        },
      });
  }
}

/**
 * GET /api/tracking/shuttle/batch-location
 * Get live location of specific trip
 * Query params: tripId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');

    if (!tripId) {
      return NextResponse.json(
        { error: 'tripId required' },
        { status: 400 }
      );
    }

    // Get latest location for each participant
    const { data: locations, error } = await supabase
      .from('trip_locations')
      .select('user_id, user_type, latitude, longitude, accuracy, recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(5); // Get latest 5 per user

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Group by user and get latest
    const latestByUser = new Map();
    for (const loc of locations || []) {
      if (!latestByUser.has(loc.user_id)) {
        latestByUser.set(loc.user_id, loc);
      }
    }

    return NextResponse.json({
      tripId,
      locations: Array.from(latestByUser.values()),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('GET location error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
