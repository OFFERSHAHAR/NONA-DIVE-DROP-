import { z } from 'zod';

/**
 * Location Update Schema - Driver sends location to server
 * Validates coordinates, accuracy, speed, and heading
 */
export const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90).describe('Latitude'),
  lng: z.number().min(-180).max(180).describe('Longitude'),
  accuracy: z.number().min(0).max(1000).optional().describe('Accuracy in meters'),
  speed: z.number().min(0).optional().describe('Speed in km/h'),
  heading: z.number().min(0).max(360).optional().describe('Heading in degrees'),
  timestamp: z.number().optional().describe('Client timestamp in milliseconds'),
});

export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

/**
 * Trip Status Schema
 */
export const tripStatusSchema = z.enum([
  'pending', // Waiting for driver to start
  'in_progress', // Driver started and en route
  'arrived_at_pickup', // Driver arrived at pickup location
  'picked_up', // Driver picked up passenger
  'completed', // Trip completed
  'cancelled', // Trip cancelled
]);

export type TripStatus = z.infer<typeof tripStatusSchema>;

/**
 * Trip Start Schema
 */
export const startTripSchema = z.object({
  trip_id: z.string().uuid().describe('Trip ID'),
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
  estimated_duration_minutes: z.number().int().positive().optional(),
});

export type StartTripInput = z.infer<typeof startTripSchema>;

/**
 * Trip Status Update Schema
 */
export const tripStatusUpdateSchema = z.object({
  trip_id: z.string().uuid(),
  status: tripStatusSchema,
  notes: z.string().optional().max(500),
});

export type TripStatusUpdate = z.infer<typeof tripStatusUpdateSchema>;

/**
 * ETA Input Schema
 */
export const etaInputSchema = z.object({
  from_lat: z.number().min(-90).max(90),
  from_lng: z.number().min(-180).max(180),
  to_lat: z.number().min(-90).max(90),
  to_lng: z.number().min(-180).max(180),
  average_speed_kmh: z.number().positive().default(50),
  buffer_minutes: z.number().non_negative().default(5),
});

export type ETAInput = z.infer<typeof etaInputSchema>;

/**
 * Real-time Tracking Response Schema
 */
export const realtimeTrackingSchema = z.object({
  trip_id: z.string().uuid(),
  shuttle_location: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    heading: z.number().optional(),
    speed: z.number().optional(),
    updated_at: z.string().datetime(),
  }),
  passenger_location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  eta_seconds: z.number().int().positive().nullable(),
  eta_minutes: z.number().int().positive().nullable(),
  distance_meters: z.number().int().positive().nullable(),
  status: tripStatusSchema,
  driver_info: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatar_url: z.string().url().optional(),
    vehicle_name: z.string(),
    vehicle_color: z.string().optional(),
    vehicle_plate: z.string().optional(),
  }).optional(),
  last_update: z.string().datetime(),
});

export type RealtimeTracking = z.infer<typeof realtimeTrackingSchema>;

/**
 * Pagination schema for history
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;
