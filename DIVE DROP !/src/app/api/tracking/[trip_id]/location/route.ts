/**
 * API endpoint for shuttle location updates
 * Used by shuttle drivers to report their current location
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trip_id: string }> }
) {
  try {
    const { trip_id } = await params;
    const body = await request.json();

    const supabase = createServerComponentClient({ cookies });

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const { latitude, longitude, accuracy, bearing, speed } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    // Get the trip and verify shuttle is assigned
    const { data: trip, error: tripError } = await supabase
      .from('dive_trips')
      .select('shuttle_id')
      .eq('id', trip_id)
      .single();

    if (tripError || !trip || !trip.shuttle_id) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Insert location update
    const { data: location, error: insertError } = await supabase
      .from('shuttle_locations')
      .insert({
        shuttle_id: trip.shuttle_id,
        latitude,
        longitude,
        accuracy: accuracy || undefined,
        bearing: bearing || undefined,
        speed: speed || undefined,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting shuttle location:', insertError);
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
    }

    // Broadcast update via Realtime
    // This happens automatically through Supabase PostgreSQL changes

    return NextResponse.json(
      {
        success: true,
        location,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve shuttle location for a trip
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trip_id: string }> }
) {
  try {
    const { trip_id } = await params;
    const supabase = createServerComponentClient({ cookies });

    // Get trip and shuttle
    const { data: trip, error: tripError } = await supabase
      .from('dive_trips')
      .select('shuttle_id')
      .eq('id', trip_id)
      .single();

    if (tripError || !trip || !trip.shuttle_id) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Get latest shuttle location
    const { data: location, error: locationError } = await supabase
      .from('shuttle_locations')
      .select('*')
      .eq('shuttle_id', trip.shuttle_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (locationError && locationError.code !== 'PGRST116') {
      console.error('Error fetching location:', locationError);
      return NextResponse.json(
        { error: 'Failed to fetch location' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        location: location || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
