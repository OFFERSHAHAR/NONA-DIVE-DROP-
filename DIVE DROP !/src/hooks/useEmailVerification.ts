/**
 * Hook: useEmailVerification
 * Handles email verification flow in components
 * Usage in signup forms, profile pages, etc.
 */

import { useState, useCallback } from 'react';

export interface EmailVerificationOptions {
  userId: string;
  email: string;
  userName: string;
  locale: 'en' | 'he';
}

export interface EmailVerificationState {
  loading: boolean;
  success: boolean;
  error: string | null;
  message: string;
  expiresAt: Date | null;
}

export function useEmailVerification() {
  const [state, setState] = useState<EmailVerificationState>({
    loading: false,
    success: false,
    error: null,
    message: '',
    expiresAt: null,
  });

  const sendVerificationEmail = useCallback(
    async (options: EmailVerificationOptions) => {
      setState({
        loading: true,
        success: false,
        error: null,
        message: '',
        expiresAt: null,
      });

      try {
        const response = await fetch('/api/auth/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        });

        const data = await response.json();

        if (!response.ok) {
          setState({
            loading: false,
            success: false,
            error: data.error || 'Failed to send verification email',
            message: '',
            expiresAt: null,
          });
          return false;
        }

        setState({
          loading: false,
          success: true,
          error: null,
          message: data.message,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setState({
          loading: false,
          success: false,
          error: errorMessage,
          message: '',
          expiresAt: null,
        });
        return false;
      }
    },
    []
  );

  const verifyEmail = useCallback(async (token: string, email: string) => {
    setState({
      loading: true,
      success: false,
      error: null,
      message: '',
      expiresAt: null,
    });

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          response.status === 410
            ? 'Verification link has expired'
            : data.error || 'Verification failed';

        setState({
          loading: false,
          success: false,
          error: errorMessage,
          message: '',
          expiresAt: null,
        });
        return false;
      }

      setState({
        loading: false,
        success: true,
        error: null,
        message: data.message,
        expiresAt: null,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({
        loading: false,
        success: false,
        error: errorMessage,
        message: '',
        expiresAt: null,
      });
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      success: false,
      error: null,
      message: '',
      expiresAt: null,
    });
  }, []);

  return {
    ...state,
    sendVerificationEmail,
    verifyEmail,
    reset,
  };
}
