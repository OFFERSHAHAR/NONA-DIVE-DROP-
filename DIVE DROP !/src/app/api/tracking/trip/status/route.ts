import { NextRequest, NextResponse } from 'next/server';
import { tripStatusUpdateSchema } from '@/lib/tracking/schemas';
import {
  withDriverAuth,
  successResponse,
  errorResponse,
  checkTripOwnership,
  withRateLimit,
  trackingRateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/tracking/middleware';
import { updateTripStatus } from '@/lib/tracking/database';

/**
 * POST /api/tracking/trip/status
 * Update trip status (arrived at pickup, picked up passenger, completed, etc.)
 *
 * Body:
 * {
 *   trip_id: string,
 *   status: 'in_progress' | 'arrived_at_pickup' | 'picked_up' | 'completed' | 'cancelled',
 *   notes?: string
 * }
 *
 * Returns:
 * {
 *   trip_id: string,
 *   status: string,
 *   updated_at: string
 * }
 */
export async function POST(request: NextRequest) {
  const { data: context, error: authError } = await withDriverAuth(request);
  if (authError) return authError;

  const rateLimiter = withRateLimit(trackingRateLimitConfigs.tripManagement);
  const limitCheck = rateLimiter(`trip:status:${context!.userId}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const body = await request.json();
    const validation = tripStatusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
    }

    const { trip_id, status, notes } = validation.data;

    // Verify driver owns this trip
    const owns = await checkTripOwnership(trip_id, context!.userId, 'driver');
    if (!owns) {
      return errorResponse('You do not have permission to update this trip', 403);
    }

    // Update status
    const updatedTrip = await updateTripStatus(trip_id, status, notes);

    // TODO: Send notification to passenger about status change
    // await notifyPassengerStatusChange(trip_id, status);

    return NextResponse.json(
      successResponse(
        {
          trip_id: updatedTrip.id,
          status: updatedTrip.status,
          updated_at: updatedTrip.updated_at,
          notes: updatedTrip.notes,
        },
        `Trip status updated to ${status}`
      ),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/tracking/trip/status error:', error);
    return errorResponse(error.message || 'Failed to update trip status', 500);
  }
}

/**
 * Status Transitions Guide:
 *
 * Flow:
 * pending -> in_progress (driver starts heading to pickup)
 *        -> in_progress -> arrived_at_pickup (driver arrives at pickup location)
 *        -> arrived_at_pickup -> picked_up (driver picks up passenger)
 *        -> picked_up -> completed (trip finished, passenger dropped off)
 *
 * Cancellation:
 * Any status -> cancelled (trip cancelled before/after pickup)
 */
