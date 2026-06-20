'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FeedbackFormData } from '@/types/feedback';

interface UseFeedbackReturn {
  loading: boolean;
  error: string | null;
  submitFeedback: (
    diveSiteId: string,
    diveBookingId: string,
    userId: string,
    data: FeedbackFormData
  ) => Promise<void>;
}

export function useFeedback(): UseFeedbackReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = async (
    diveSiteId: string,
    diveBookingId: string,
    userId: string,
    data: FeedbackFormData
  ) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Insert feedback into database
      const { error: dbError } = await supabase.from('feedback').insert({
        dive_site_id: diveSiteId,
        dive_booking_id: diveBookingId,
        diver_id: userId,
        visibility_meters: data.visibility_meters,
        temperature_celsius: data.temperature_celsius,
        current_strength: data.current_strength,
        marine_life: data.marine_life,
        marine_life_custom: data.marine_life_custom,
        notes: data.notes,
        image_urls: data.image_urls,
        submitted_at: new Date().toISOString(),
      });

      if (dbError) {
        throw new Error(dbError.message || 'Failed to submit feedback');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while submitting feedback';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    submitFeedback,
  };
}
