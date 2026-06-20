import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PhotoStats {
  photo_id: string;
  avg_rating: number;
  rating_count: number;
  median_rating: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  quality_score: number;
  engagement_score: number;
  recency_score: number;
  overall_score: number;
  percentile_rank: number;
  verified_purchase_count: number;
  days_old: number;
  last_calculated_at: string;
}

interface UserRating {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

interface AllRatings {
  ratings: Array<{
    id: string;
    rating: number;
    comment?: string;
    created_at: string;
  }>;
  userRating: UserRating | null;
  count: number;
}

interface UsePhotoRatingReturn {
  // Stats
  stats: PhotoStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Ratings
  ratings: AllRatings | null;
  ratingsLoading: boolean;
  ratingsError: string | null;

  // User's own rating
  userRating: UserRating | null;

  // Actions
  submitRating: (rating: number, comment?: string) => Promise<void>;
  deleteRating: () => Promise<void>;
  trackView: () => Promise<void>;
  trackLike: (liked: boolean) => Promise<void>;
  trackShare: () => Promise<void>;

  // Loading states
  isSubmitting: boolean;
  submitError: string | null;
}

/**
 * Hook for managing photo ratings and stats
 *
 * @param photoId - Photo ID to rate
 * @param autoFetch - Auto-fetch stats on mount (default: true)
 *
 * @example
 * const { stats, userRating, submitRating, trackView } = usePhotoRating(photoId);
 *
 * useEffect(() => {
 *   trackView();
 * }, [photoId]);
 */
export function usePhotoRating(photoId: string, autoFetch = true): UsePhotoRatingReturn {
  const { user } = useAuth();

  // Stats state
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Ratings state
  const [ratings, setRatings] = useState<AllRatings | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // User rating state
  const [userRating, setUserRating] = useState<UserRating | null>(null);

  // Get auth token
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    // If using Supabase auth
    try {
      const {
        data: { session },
      } = await (window as any).supabase?.auth.getSession?.();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, [user]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);

      const response = await fetch(`/api/photos/${photoId}/stats`);

      if (!response.ok) {
        throw new Error(`Failed to fetch stats (${response.status})`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch stats';
      setStatsError(message);
    } finally {
      setStatsLoading(false);
    }
  }, [photoId]);

  // Fetch ratings
  const fetchRatings = useCallback(async () => {
    try {
      setRatingsLoading(true);
      setRatingsError(null);

      const headers: HeadersInit = {};
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/photos/${photoId}/rate`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ratings (${response.status})`);
      }

      const data = await response.json();
      setRatings(data);
      setUserRating(data.userRating);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch ratings';
      setRatingsError(message);
    } finally {
      setRatingsLoading(false);
    }
  }, [photoId, getAuthToken]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchStats();
      fetchRatings();
    }
  }, [photoId, autoFetch, fetchStats, fetchRatings]);

  // Submit rating
  const submitRating = useCallback(
    async (rating: number, comment?: string) => {
      if (!user) {
        throw new Error('Must be logged in to rate');
      }

      try {
        setIsSubmitting(true);
        setSubmitError(null);

        const token = await getAuthToken();
        if (!token) {
          throw new Error('Authentication failed');
        }

        const response = await fetch(`/api/photos/${photoId}/rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating,
            comment: comment?.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit rating');
        }

        const result = await response.json();

        // Update local state
        setUserRating(result.rating);

        // Refresh stats (avg rating should update)
        await Promise.all([fetchStats(), fetchRatings()]);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit rating';
        setSubmitError(message);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [photoId, user, getAuthToken, fetchStats, fetchRatings]
  );

  // Delete rating
  const deleteRating = useCallback(async () => {
    if (!user || !userRating) {
      throw new Error('No rating to delete');
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await fetch(`/api/photos/${photoId}/rate/${userRating.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete rating');
      }

      // Update local state
      setUserRating(null);

      // Refresh stats
      await Promise.all([fetchStats(), fetchRatings()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete rating';
      setSubmitError(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [photoId, user, userRating, getAuthToken, fetchStats, fetchRatings]);

  // Track view
  const trackView = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/photos/${photoId}/engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ event_type: 'view' }),
      });

      if (!response.ok) {
        console.warn('Failed to track view');
      }
    } catch (error) {
      console.error('View tracking error:', error);
    }
  }, [photoId, getAuthToken]);

  // Track like
  const trackLike = useCallback(
    async (liked: boolean) => {
      try {
        const token = await getAuthToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/photos/${photoId}/engagement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            event_type: liked ? 'like' : 'unlike',
          }),
        });

        if (!response.ok) {
          console.warn('Failed to track like');
        }
      } catch (error) {
        console.error('Like tracking error:', error);
      }
    },
    [photoId, getAuthToken]
  );

  // Track share
  const trackShare = useCallback(async () => {
    try {
      const response = await fetch(`/api/photos/${photoId}/engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: 'share' }),
      });

      if (!response.ok) {
        console.warn('Failed to track share');
      }
    } catch (error) {
      console.error('Share tracking error:', error);
    }
  }, [photoId]);

  return {
    // Stats
    stats,
    statsLoading,
    statsError,

    // Ratings
    ratings,
    ratingsLoading,
    ratingsError,

    // User's own rating
    userRating,

    // Actions
    submitRating,
    deleteRating,
    trackView,
    trackLike,
    trackShare,

    // Loading states
    isSubmitting,
    submitError,
  };
}

/**
 * Hook for fetching photo stats only
 * @param photoId - Photo ID
 */
export function usePhotoStats(photoId: string) {
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/photos/${photoId}/stats`);
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [photoId]);

  return { stats, isLoading, error };
}

/**
 * Hook for fetching all ratings for a photo
 * @param photoId - Photo ID
 */
export function usePhotoRatings(photoId: string) {
  const [ratings, setRatings] = useState<AllRatings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/photos/${photoId}/rate`);
        if (!response.ok) {
          throw new Error('Failed to fetch ratings');
        }

        const data = await response.json();
        setRatings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [photoId]);

  return { ratings, isLoading, error };
}
