import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tracking/location
 * Updates driver location in real-time
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const body = await request.json();

    const {
      trip_id,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      bearing,
    } = body;

    // Validate required fields
    if (!trip_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Get shuttle ID from trip
    const { data: trip, error: tripError } = await supabase
      .from('shuttle_trips')
      .select('shuttle_id')
      .eq('id', trip_id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Insert location history
    const { data, error } = await supabase
      .from('shuttle_location_history')
      .insert({
        trip_id,
        shuttle_id: trip.shuttle_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        bearing,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Location insert error:', error);
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Location API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/location?trip_id=xxx
 * Gets latest location for a trip
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const tripId = request.nextUrl.searchParams.get('trip_id');

    if (!tripId) {
      return NextResponse.json(
        { error: 'trip_id required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('shuttle_location_history')
      .select('*')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Location API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
