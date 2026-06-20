/**
 * React hook for Bit payment management
 */

import { useState, useCallback } from 'react';
import type { BitPaymentRequestResponse } from '@/lib/payments/bit.schemas';

export interface PaymentRequest {
  request_id: string;
  payment_link: string;
  short_url?: string;
  qr_code?: string;
  expires_at: string;
  amount_cents: number;
  amount_display: string;
}

export interface PaymentVerification {
  success: boolean;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  booking?: {
    id: string;
    status: string;
    amount_cents: number;
    amount_display: string;
    transaction_id: string;
  };
  commission?: {
    amount_cents: number;
    amount_display: string;
    rate: string;
  };
  payout?: {
    amount_cents: number;
    amount_display: string;
    schedule: string;
  };
}

export interface UseBitPaymentState {
  loading: boolean;
  error: string | null;
  paymentRequest: PaymentRequest | null;
  verification: PaymentVerification | null;
}

export function useBitPayment() {
  const [state, setState] = useState<UseBitPaymentState>({
    loading: false,
    error: null,
    paymentRequest: null,
    verification: null,
  });

  /**
   * Create a payment request
   */
  const createPaymentRequest = useCallback(
    async (bookingId: string, amountCents: number): Promise<PaymentRequest | null> => {
      setState({
        loading: true,
        error: null,
        paymentRequest: null,
        verification: null,
      });

      try {
        const response = await fetch('/api/payments/bit/payment-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: bookingId,
            amount_cents: amountCents,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment request');
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          loading: false,
          paymentRequest: data.payment_request,
        }));

        return data.payment_request;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));

        return null;
      }
    },
    []
  );

  /**
   * Verify payment completion
   */
  const verifyPayment = useCallback(
    async (
      requestId: string,
      bookingId: string
    ): Promise<PaymentVerification | null> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch('/api/payments/bit/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            booking_id: bookingId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to verify payment');
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          loading: false,
          verification: data,
        }));

        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));

        return null;
      }
    },
    []
  );

  /**
   * Request a refund
   */
  const requestRefund = useCallback(
    async (
      bookingId: string,
      reason: string,
      notes?: string,
      amountCents?: number
    ): Promise<any | null> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch('/api/payments/bit/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: bookingId,
            reason,
            notes,
            amount_cents: amountCents,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to request refund');
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          loading: false,
        }));

        return data.refund;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));

        return null;
      }
    },
    []
  );

  /**
   * Link a Bit account
   */
  const linkBitAccount = useCallback(
    async (accountData: any): Promise<any | null> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch('/api/payments/bit/link-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accountData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to link account');
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          loading: false,
        }));

        return data.account;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));

        return null;
      }
    },
    []
  );

  /**
   * Clear errors
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      paymentRequest: null,
      verification: null,
    });
  }, []);

  return {
    ...state,
    createPaymentRequest,
    verifyPayment,
    requestRefund,
    linkBitAccount,
    clearError,
    reset,
  };
}
