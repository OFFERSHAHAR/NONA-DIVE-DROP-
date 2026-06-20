import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withDriverAuth,
  successResponse,
  errorResponse,
  withRateLimit,
  trackingRateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/tracking/middleware';
import { createTrip, getTripDetails } from '@/lib/tracking/database';
import { calculateDistance, calculateETA } from '@/lib/tracking/utils';

const startTripSchema = z.object({
  shuttle_id: z.string().uuid().describe('Shuttle ID'),
  passenger_id: z.string().uuid().describe('Passenger ID'),
  pickup_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  dropoff_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
});

/**
 * POST /api/tracking/trip/start
 * Driver starts a new trip
 *
 * Body:
 * {
 *   shuttle_id: string,
 *   passenger_id: string,
 *   pickup_location: { lat: number, lng: number, address?: string },
 *   dropoff_location: { lat: number, lng: number, address?: string }
 * }
 *
 * Returns:
 * {
 *   trip_id: string,
 *   status: 'pending',
 *   estimated_eta_minutes: number,
 *   created_at: string
 * }
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withDriverAuth(request);
  if (authError) return authError;

  const rateLimiter = withRateLimit(trackingRateLimitConfigs.tripManagement);
  const limitCheck = rateLimiter(`trip:start:${context!.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const body = await request.json();
    const validation = startTripSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
    }

    const { shuttle_id, passenger_id, pickup_location, dropoff_location } =
      validation.data;

    // Calculate estimated ETA from pickup to dropoff
    const distance = calculateDistance(
      pickup_location.lat,
      pickup_location.lng,
      dropoff_location.lat,
      dropoff_location.lng
    );

    // Estimate 50 km/h average speed in city
    const estimatedEtaSeconds = calculateETA(distance, 50, 5);
    const estimatedArrivalTime = new Date(
      Date.now() + estimatedEtaSeconds * 1000
    ).toISOString();

    // Create trip
    const newTrip = await createTrip({
      driver_id: context!.userId,
      shuttle_id,
      passenger_id,
      pickup_location,
      dropoff_location,
      estimated_arrival_time: estimatedArrivalTime,
    });

    return NextResponse.json(
      successResponse(
        {
          trip_id: newTrip.id,
          status: newTrip.status,
          estimated_eta_seconds: estimatedEtaSeconds,
          estimated_eta_minutes: Math.ceil(estimatedEtaSeconds / 60),
          estimated_arrival_time: estimatedArrivalTime,
          distance_meters: Math.round(distance),
          created_at: newTrip.created_at,
        },
        'Trip started successfully'
      ),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/tracking/trip/start error:', error);
    return errorResponse(error.message || 'Failed to start trip', 500);
  }
}
