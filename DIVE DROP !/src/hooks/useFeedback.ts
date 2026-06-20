'use client';

import { useState } from 'react';
import { feedbackInsertSchema } from '@/lib/feedback/validation';
import type { FeedbackInsertInput } from '@/lib/feedback/validation';
import { ZodError } from 'zod';

/**
 * useFeedback Hook
 *
 * Manages feedback submission to the API with validation and error handling.
 *
 * @returns {Object} Hook return object with submitFeedback, isLoading, and error
 */
export function useFeedback() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit feedback to the API
   *
   * @param data - FeedbackInsertInput data to submit
   * @returns Promise<boolean> - true on success, false on validation error
   * @throws Error on network or API errors
   */
  const submitFeedback = async (data: FeedbackInsertInput): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate data against schema
      const validatedData = feedbackInsertSchema.parse(data);

      // POST to API endpoint
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      // Handle API errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const apiError = errorData.message || `API error: ${response.status}`;
        throw new Error(apiError);
      }

      // Success - clear any existing errors
      setError(null);
      return true;
    } catch (err) {
      // Handle validation errors
      if (err instanceof ZodError) {
        const validationMessage = err.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        setError(`Validation error: ${validationMessage}`);
        return false;
      }

      // Handle other errors
      const message =
        err instanceof Error ? err.message : 'An error occurred while submitting feedback';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitFeedback,
    isLoading,
    error,
  };
}
