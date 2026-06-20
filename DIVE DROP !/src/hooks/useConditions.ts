'use client';

import { useState, useEffect } from 'react';
import type { AggregatedConditions } from '@/types/feedback';
import { aggregatedConditionsSchema } from '@/lib/feedback/validation';

/**
 * Options for useConditions hook
 *
 * @property enabled - Whether to fetch conditions (default: true)
 * @property revalidateInterval - Cache validity duration in milliseconds (default: 300000 = 5 minutes)
 */
export interface UseConditionsOptions {
  enabled?: boolean;
  revalidateInterval?: number;
}

/**
 * useConditions Hook
 *
 * Fetches aggregated dive site conditions with client-side caching in sessionStorage.
 * Implements smart caching strategy to minimize API calls while ensuring fresh data.
 *
 * Features:
 * - Fetches aggregated conditions from /api/feedback/aggregate
 * - Caches results in sessionStorage with TTL
 * - Skips fetch if cached data is fresh (< revalidateInterval)
 * - Handles "Insufficient feedback" error gracefully
 * - Automatic polling at specified interval
 * - Cleanup on unmount
 *
 * @param diveSiteId - The dive site ID to fetch conditions for
 * @param options - Hook configuration options
 * @returns Object with data (AggregatedConditions | null), isLoading, and error
 */
export function useConditions(diveSiteId: string, options?: UseConditionsOptions) {
  const { enabled = true, revalidateInterval = 5 * 60 * 1000 } = options || {};

  const [data, setData] = useState<AggregatedConditions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cache key for sessionStorage
   */
  const getCacheKey = (siteId: string) => `conditions_${siteId}`;

  /**
   * Get cached data if it exists and is fresh
   */
  const getCachedData = (siteId: string): AggregatedConditions | null => {
    try {
      const cacheKey = getCacheKey(siteId);
      const cached = sessionStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      const { data: cachedData, timestamp } = parsed;

      // Check if cache is fresh
      const now = Date.now();
      const age = now - timestamp;

      if (age < revalidateInterval) {
        // Cache is fresh, use it
        return cachedData;
      }

      // Cache is stale, clear it
      sessionStorage.removeItem(cacheKey);
      return null;
    } catch {
      // If cache parse fails, ignore and return null
      return null;
    }
  };

  /**
   * Store data in cache
   */
  const setCachedData = (siteId: string, conditions: AggregatedConditions) => {
    try {
      const cacheKey = getCacheKey(siteId);
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: conditions,
          timestamp: Date.now(),
        })
      );
    } catch {
      // If cache write fails, silently continue (not critical)
    }
  };

  /**
   * Fetch conditions from API
   */
  const fetchConditions = async (siteId: string) => {
    // Check cache first
    const cachedData = getCachedData(siteId);
    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/feedback/aggregate?siteId=${encodeURIComponent(siteId)}`);

      if (!response.ok) {
        // Check for specific error messages
        const errorData = await response.json().catch(() => ({}));

        // Handle insufficient feedback error
        if (response.status === 400 && errorData.message?.includes('Insufficient')) {
          setError('Insufficient feedback');
          setData(null);
          setIsLoading(false);
          return;
        }

        throw new Error(errorData.message || `Failed to fetch conditions: ${response.status}`);
      }

      const jsonData = await response.json();

      // Validate against schema
      const validatedData = aggregatedConditionsSchema.parse(jsonData);

      // Cache the data
      setCachedData(siteId, validatedData);

      // Set state
      setData(validatedData);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while fetching conditions';
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Effect: Initial fetch and polling setup
   */
  useEffect(() => {
    if (!enabled || !diveSiteId) {
      return;
    }

    // Initial fetch
    fetchConditions(diveSiteId);

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchConditions(diveSiteId);
    }, revalidateInterval);

    // Cleanup on unmount or dependency change
    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, diveSiteId, revalidateInterval]);

  return {
    data,
    isLoading,
    error,
  };
}
