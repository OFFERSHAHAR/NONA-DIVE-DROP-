/**
 * Real-time Location Listener
 * Receives live location updates via Supabase Realtime
 * For passengers to track driver, or driver to see all passengers
 */

import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { z } from 'zod';

export const LocationUpdatePayloadSchema = z.object({
  trip_id: z.string(),
  locations: z.array(
    z.object({
      user_id: z.string(),
      user_type: z.enum(['driver', 'passenger']),
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
  ),
  timestamp: z.number(),
});

export type LocationUpdatePayload = z.infer<typeof LocationUpdatePayloadSchema>;

export class RealtimeLocationListener {
  private channel: RealtimeChannel | null = null;
  private tripId: string | null = null;
  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  /**
   * Subscribe to real-time location updates for a trip
   */
  subscribe(tripId: string, onUpdate: (payload: LocationUpdatePayload) => void): () => void {
    this.tripId = tripId;

    // Create channel for this trip
    this.channel = this.supabase.channel(`trip:${tripId}`, {
      config: {
        broadcast: {
          self: false, // Don't receive own broadcasts
        },
      },
    });

    // Listen for location-update events
    this.channel
      .on('broadcast', { event: 'location-update' }, (payload) => {
        try {
          const validated = LocationUpdatePayloadSchema.parse(payload.payload);
          onUpdate(validated);
        } catch (error) {
          console.error('Invalid location update payload:', error);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to trip location updates: ${tripId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error:', status);
        }
      });

    // Return cleanup function
    return () => this.unsubscribe();
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.tripId = null;
  }

  /**
   * Check if currently subscribed
   */
  isSubscribed(): boolean {
    return this.channel !== null && this.channel.state === 'joined';
  }

  /**
   * Force refresh of live location by polling API
   */
  async refreshLocation(tripId: string): Promise<any> {
    try {
      const response = await fetch(`/api/tracking/shuttle/batch-location?tripId=${tripId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to refresh location:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create listener with Supabase client
 */
export function createRealtimeLocationListener(
  supabase: ReturnType<typeof createClient>
): RealtimeLocationListener {
  return new RealtimeLocationListener(supabase);
}
