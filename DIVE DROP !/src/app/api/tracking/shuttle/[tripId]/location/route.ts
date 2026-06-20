/**
 * Single Trip Location Endpoint
 * POST /api/tracking/shuttle/[tripId]/location
 *
 * Alternative to batch endpoint for individual location updates
 * Less efficient but simpler for single updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const LocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  timestamp: z.number(),
  batteryLevel: z.number().min(0).max(100).optional(),
  isCharging: z.boolean().optional(),
  networkType: z.string().optional(),
});

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
 * POST /api/tracking/shuttle/[tripId]/location
 * Single location update for a trip
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    // Validate UUID format
    if (!isValidUUID(tripId)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const locationData = LocationUpdateSchema.parse(body);

    // Get auth user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is in trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('user_type')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'User not in trip' },
        { status: 403 }
      );
    }

    // Insert location
    const { data, error: insertError } = await supabase
      .from('trip_locations')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        user_type: participant.user_type,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        altitude: locationData.altitude,
        heading: locationData.heading,
        speed: locationData.speed,
        battery_level: locationData.batteryLevel,
        is_charging: locationData.isCharging,
        network_type: locationData.networkType,
        recorded_at: new Date(locationData.timestamp).toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to store location' },
        { status: 500 }
      );
    }

    // Broadcast update immediately
    await supabase
      .channel(`trip:${tripId}`)
      .send('broadcast', {
        event: 'location-update',
        payload: {
          trip_id: tripId,
          locations: [
            {
              user_id: user.id,
              user_type: participant.user_type,
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy,
            },
          ],
          timestamp: Date.now(),
        },
      });

    return NextResponse.json(
      {
        success: true,
        location: {
          id: data.id,
          tripId: data.trip_id,
          latitude: data.latitude,
          longitude: data.longitude,
          recordedAt: data.recorded_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          issues: error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Location update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/shuttle/[tripId]/location
 * Get latest location for trip
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    if (!isValidUUID(tripId)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Get latest location per user
    const { data: locations, error } = await supabase
      .from('trip_locations')
      .select('user_id, user_type, latitude, longitude, accuracy, recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    // Get latest per user
    const latestByUser = new Map();
    for (const loc of locations || []) {
      if (!latestByUser.has(loc.user_id)) {
        latestByUser.set(loc.user_id, loc);
      }
    }

    return NextResponse.json({
      tripId,
      locations: Array.from(latestByUser.values()),
      count: latestByUser.size,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('GET location error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
