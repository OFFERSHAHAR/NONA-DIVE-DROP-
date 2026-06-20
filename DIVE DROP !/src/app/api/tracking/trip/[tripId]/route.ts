import { NextRequest, NextResponse } from 'next/server';
import {
  withUserAuth,
  successResponse,
  errorResponse,
  checkTripOwnership,
  withRateLimit,
  trackingRateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/tracking/middleware';
import { getTripDetails, getTripLocationHistory } from '@/lib/tracking/database';
import { calculateDistance, calculateETA, formatETA, formatDistance } from '@/lib/tracking/utils';

interface RouteParams {
  params: Promise<{ tripId: string }>;
}

/**
 * GET /api/tracking/trip/:tripId
 * Get full trip details with current location and ETA
 *
 * Returns:
 * {
 *   shuttle_location: { lat, lng, accuracy, speed, heading, updated_at },
 *   passenger_location: { lat, lng }?,
 *   eta_seconds: number,
 *   eta_minutes: number,
 *   eta_formatted: string,
 *   distance_meters: number,
 *   distance_formatted: string,
 *   status: string,
 *   driver_info: { id, name, avatar_url, vehicle_name, vehicle_color, vehicle_plate },
 *   last_update: string
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { data: context, error: authError } = await withUserAuth(request);
  if (authError) return authError;

  const rateLimiter = withRateLimit(trackingRateLimitConfigs.tracking);
  const limitCheck = rateLimiter(`trip:get:${context!.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const { tripId } = await params;

    // Verify user owns this trip
    const owns = await checkTripOwnership(tripId, context!.userId, context!.role);
    if (!owns) {
      return errorResponse('You do not have access to this trip', 403);
    }

    const trip = await getTripDetails(tripId);
    if (!trip) {
      return errorResponse('Trip not found', 404);
    }

    // Parse current location
    let shuttleLocation = null;
    let distanceMeters = null;
    let etaSeconds = null;

    if (trip.current_location) {
      // PostGIS returns format: { x: lng, y: lat }
      const coords = trip.current_location;
      shuttleLocation = {
        lat: coords.y,
        lng: coords.x,
        accuracy: trip.current_location_accuracy,
        speed: trip.current_location_speed,
        heading: trip.current_location_heading,
        updated_at: trip.last_location_update || new Date().toISOString(),
      };

      // Calculate distance and ETA to dropoff
      if (trip.dropoff_location) {
        distanceMeters = calculateDistance(
          coords.y,
          coords.x,
          trip.dropoff_location.lat,
          trip.dropoff_location.lng
        );

        // Average speed from data or default 50 km/h
        const averageSpeed = shuttleLocation.speed || 50;
        etaSeconds = calculateETA(distanceMeters, averageSpeed, 5);
      }
    }

    const response = {
      trip_id: trip.id,
      shuttle_location: shuttleLocation,
      dropoff_location: trip.dropoff_location,
      pickup_location: trip.pickup_location,
      eta_seconds: etaSeconds,
      eta_minutes: etaSeconds ? Math.ceil(etaSeconds / 60) : null,
      eta_formatted: etaSeconds ? formatETA(etaSeconds) : 'Calculating...',
      distance_meters: distanceMeters,
      distance_formatted: distanceMeters ? formatDistance(distanceMeters) : 'Calculating...',
      status: trip.status,
      driver_info: trip.driver ? {
        id: trip.driver.id,
        user_id: trip.driver.user_id,
        name: trip.driver.users ? `${trip.driver.users.first_name} ${trip.driver.users.last_name}` : 'Driver',
        avatar_url: trip.driver.users?.avatar_url,
        vehicle_name: trip.shuttle?.name,
        vehicle_color: trip.shuttle?.color,
        vehicle_plate: trip.shuttle?.license_plate,
      } : null,
      last_update: trip.last_location_update || trip.updated_at,
    };

    return NextResponse.json(successResponse(response));
  } catch (error: any) {
    console.error('GET /api/tracking/trip/:tripId error:', error);
    return errorResponse(error.message || 'Failed to fetch trip details', 500);
  }
}

/**
 * GET /api/tracking/trip/:tripId/history
 * Get location history for the trip
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20, max: 100)
 */
export async function getHistory(request: NextRequest, { params }: RouteParams) {
  const { data: context, error: authError } = await withUserAuth(request);
  if (authError) return authError;

  try {
    const { tripId } = await params;

    // Verify user owns this trip
    const owns = await checkTripOwnership(tripId, context!.userId, context!.role);
    if (!owns) {
      return errorResponse('You do not have access to this trip', 403);
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '20'),
      100
    );

    if (page < 1 || limit < 1) {
      return errorResponse('Invalid pagination parameters', 400);
    }

    const offset = (page - 1) * limit;
    const { data: history, count } = await getTripLocationHistory(tripId, limit, offset);

    // Format locations
    const formattedHistory = history?.map((entry: any) => ({
      timestamp: entry.recorded_at,
      location: {
        lat: entry.location.y,
        lng: entry.location.x,
      },
      accuracy: entry.accuracy,
      speed: entry.speed,
      heading: entry.heading,
    })) || [];

    return NextResponse.json(
      successResponse({
        trip_id: tripId,
        locations: formattedHistory,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      })
    );
  } catch (error: any) {
    console.error('GET /api/tracking/trip/:tripId/history error:', error);
    return errorResponse(error.message || 'Failed to fetch history', 500);
  }
}
