import { NextRequest, NextResponse } from 'next/server';
import { etaInputSchema } from '@/lib/tracking/schemas';
import {
  successResponse,
  errorResponse,
  withRateLimit,
  trackingRateLimitConfigs,
  rateLimitErrorResponse,
} from '@/lib/tracking/middleware';
import {
  calculateDistance,
  calculateETA,
  calculateETAFromInput,
  formatETA,
  formatDistance,
} from '@/lib/tracking/utils';

/**
 * POST /api/tracking/eta
 * Calculate ETA between two points
 *
 * Public endpoint - no authentication required
 * Used for pre-trip estimation
 *
 * Body:
 * {
 *   from_lat: number,
 *   from_lng: number,
 *   to_lat: number,
 *   to_lng: number,
 *   average_speed_kmh?: number (default: 50),
 *   buffer_minutes?: number (default: 5)
 * }
 *
 * Returns:
 * {
 *   distance_meters: number,
 *   distance_formatted: string,
 *   eta_seconds: number,
 *   eta_minutes: number,
 *   eta_formatted: string,
 *   calculation_time_ms: number
 * }
 */
export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

  const rateLimiter = withRateLimit(trackingRateLimitConfigs.tracking);
  const limitCheck = rateLimiter(`eta:${clientIp}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const startTime = Date.now();
    const body = await request.json();
    const validation = etaInputSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
    }

    const { from_lat, from_lng, to_lat, to_lng, average_speed_kmh, buffer_minutes } =
      validation.data;

    // Calculate distance
    const distance = calculateDistance(from_lat, from_lng, to_lat, to_lng);

    // Calculate ETA
    const etaSeconds = calculateETA(distance, average_speed_kmh, buffer_minutes);
    const etaMinutes = Math.ceil(etaSeconds / 60);

    const calculationTime = Date.now() - startTime;

    return NextResponse.json(
      successResponse({
        distance_meters: Math.round(distance),
        distance_kilometers: (distance / 1000).toFixed(2),
        distance_formatted: formatDistance(distance),
        eta_seconds: etaSeconds,
        eta_minutes: etaMinutes,
        eta_formatted: formatETA(etaSeconds),
        breakdown: {
          travel_time_seconds: Math.ceil(distance / ((average_speed_kmh * 1000) / 3600)),
          buffer_seconds: buffer_minutes * 60,
          average_speed_kmh,
        },
        calculation_time_ms: calculationTime,
      })
    );
  } catch (error: any) {
    console.error('POST /api/tracking/eta error:', error);
    return errorResponse(error.message || 'Failed to calculate ETA', 500);
  }
}

/**
 * GET /api/tracking/eta
 * Calculate ETA using query parameters
 *
 * Query params:
 *   - from_lat (required)
 *   - from_lng (required)
 *   - to_lat (required)
 *   - to_lng (required)
 *   - average_speed_kmh (default: 50)
 *   - buffer_minutes (default: 5)
 */
export async function GET(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

  const rateLimiter = withRateLimit(trackingRateLimitConfigs.tracking);
  const limitCheck = rateLimiter(`eta:${clientIp}`);

  if (!limitCheck.allowed) {
    return rateLimitErrorResponse(limitCheck.retryAfter!);
  }

  try {
    const startTime = Date.now();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const input = {
      from_lat: searchParams.get('from_lat'),
      from_lng: searchParams.get('from_lng'),
      to_lat: searchParams.get('to_lat'),
      to_lng: searchParams.get('to_lng'),
      average_speed_kmh: searchParams.get('average_speed_kmh'),
      buffer_minutes: searchParams.get('buffer_minutes'),
    };

    // Convert to numbers
    const numericInput = {
      from_lat: parseFloat(input.from_lat || ''),
      from_lng: parseFloat(input.from_lng || ''),
      to_lat: parseFloat(input.to_lat || ''),
      to_lng: parseFloat(input.to_lng || ''),
      average_speed_kmh: input.average_speed_kmh ? parseFloat(input.average_speed_kmh) : 50,
      buffer_minutes: input.buffer_minutes ? parseFloat(input.buffer_minutes) : 5,
    };

    const validation = etaInputSchema.safeParse(numericInput);

    if (!validation.success) {
      return errorResponse(
        `Validation error: ${validation.error.issues[0].message}`,
        400
      );
    }

    const { from_lat, from_lng, to_lat, to_lng, average_speed_kmh, buffer_minutes } =
      validation.data;

    // Calculate distance
    const distance = calculateDistance(from_lat, from_lng, to_lat, to_lng);

    // Calculate ETA
    const etaSeconds = calculateETA(distance, average_speed_kmh, buffer_minutes);
    const etaMinutes = Math.ceil(etaSeconds / 60);

    const calculationTime = Date.now() - startTime;

    return NextResponse.json(
      successResponse({
        distance_meters: Math.round(distance),
        distance_kilometers: (distance / 1000).toFixed(2),
        distance_formatted: formatDistance(distance),
        eta_seconds: etaSeconds,
        eta_minutes: etaMinutes,
        eta_formatted: formatETA(etaSeconds),
        breakdown: {
          travel_time_seconds: Math.ceil(distance / ((average_speed_kmh * 1000) / 3600)),
          buffer_seconds: buffer_minutes * 60,
          average_speed_kmh,
        },
        calculation_time_ms: calculationTime,
      })
    );
  } catch (error: any) {
    console.error('GET /api/tracking/eta error:', error);
    return errorResponse(error.message || 'Failed to calculate ETA', 500);
  }
}
