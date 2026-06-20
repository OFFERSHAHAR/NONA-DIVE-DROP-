/**
 * Bit API Integration Service
 * Handles all communication with Bit payment system
 */

import { BIT_CONFIG, generateBitSignature, validateBitWebhookSignature } from './bit.config';
import type {
  LinkBitAccountInput,
  CreateBitPaymentRequestInput,
  VerifyBitPaymentInput,
  CreateBitRefundInput,
  CreateBitPayoutInput,
} from './bit.schemas';
import {
  bitPaymentRequestResponseSchema,
  bitPaymentVerificationSchema,
  bitRefundResponseSchema,
  bitPayoutResponseSchema,
} from './bit.schemas';

export class BitApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BitApiError';
  }
}

/**
 * Bit API client for handling payment operations
 */
export class BitApiClient {
  private apiKey: string;
  private apiSecret: string;
  private merchantId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = BIT_CONFIG.api.apiKey;
    this.apiSecret = BIT_CONFIG.api.apiSecret;
    this.merchantId = BIT_CONFIG.api.merchantId;
    this.baseUrl = BIT_CONFIG.api.baseUrl;

    if (!this.apiKey || !this.apiSecret || !this.merchantId) {
      throw new Error(
        'Bit API credentials not configured. Set BIT_API_KEY, BIT_API_SECRET, and BIT_MERCHANT_ID environment variables.'
      );
    }
  }

  /**
   * Make authenticated request to Bit API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Prepare request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Merchant-Id': this.merchantId,
      'User-Agent': 'DiveDrop/1.0',
    };

    let body: string | undefined;

    if (data) {
      body = JSON.stringify(data);

      // Sign request
      const signature = generateBitSignature(body, this.apiSecret);
      headers['X-Signature'] = signature;
    }

    // Log API call if enabled
    if (BIT_CONFIG.logging.logApiCalls) {
      console.log(`[Bit API] ${method} ${endpoint}`);
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        timeout: BIT_CONFIG.timeouts.paymentRequest,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new BitApiError(
          responseData.message || `Bit API error: ${response.statusText}`,
          responseData.code || 'UNKNOWN_ERROR',
          response.status,
          responseData
        );
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof BitApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new BitApiError(
          `Failed to communicate with Bit API: ${error.message}`,
          'API_CONNECTION_ERROR',
          0,
          error
        );
      }

      throw error;
    }
  }

  /**
   * Link a service provider's Bit account
   */
  async linkAccount(input: LinkBitAccountInput) {
    const response = await this.request('/accounts/link', 'POST', {
      account_type: input.account_type,
      bit_id: input.bit_id,
      phone_number: input.phone_number,
      display_name: input.display_name,
      bank_code: input.bank_code,
      branch_code: input.branch_code,
      account_number: input.account_number,
      account_holder_name: input.account_holder_name,
      is_payout_account: input.is_payout_account,
    });

    return response;
  }

  /**
   * Create a payment request (generates QR code / payment link)
   */
  async createPaymentRequest(input: CreateBitPaymentRequestInput) {
    const requestBody = {
      merchant_id: this.merchantId,
      booking_id: input.booking_id,
      amount_cents: input.amount_cents,
      description:
        input.description ||
        `DIVE DROP - Dive Booking #${input.booking_id.substring(0, 8)}`,
      request_id: input.request_id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiration_seconds: input.expiration_seconds,
      preferred_method: input.preferred_method,
      metadata: input.metadata || {},
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/bit/payment`,
    };

    const response = await this.request<any>(
      '/payment-requests/create',
      'POST',
      requestBody
    );

    // Validate response structure
    return bitPaymentRequestResponseSchema.parse({
      request_id: response.request_id,
      short_url: response.short_url,
      payment_link: response.payment_link,
      qr_code: response.qr_code,
      expires_at: response.expires_at,
      status: response.status || 'pending',
    });
  }

  /**
   * Verify a payment was completed
   */
  async verifyPayment(input: VerifyBitPaymentInput) {
    const response = await this.request<any>('/payment-requests/verify', 'POST', {
      request_id: input.request_id,
      transaction_id: input.transaction_id,
    });

    // Validate response
    return bitPaymentVerificationSchema.parse({
      request_id: response.request_id,
      booking_id: response.booking_id,
      status: response.status,
      amount_cents: response.amount_cents,
      transaction_id: response.transaction_id,
      payer_bit_id: response.payer_bit_id,
      payer_phone: response.payer_phone,
      payer_id_number: response.payer_id_number,
      paid_at: response.paid_at,
      reference_number: response.reference_number,
      raw_response: response,
    });
  }

  /**
   * Get payment request status
   */
  async getPaymentRequestStatus(requestId: string) {
    const response = await this.request<any>(
      `/payment-requests/${requestId}/status`,
      'GET'
    );

    return {
      request_id: response.request_id,
      status: response.status,
      amount_cents: response.amount_cents,
      booking_id: response.booking_id,
      created_at: response.created_at,
      expires_at: response.expires_at,
      transaction_id: response.transaction_id,
      paid_at: response.paid_at,
    };
  }

  /**
   * Initiate a refund
   */
  async createRefund(input: CreateBitRefundInput) {
    const refundId = input.refund_id || `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await this.request<any>('/refunds/create', 'POST', {
      transaction_id: input.transaction_id,
      amount_cents: input.amount_cents,
      reason: input.reason,
      notes: input.notes,
      refund_id: refundId,
    });

    return bitRefundResponseSchema.parse({
      refund_id: response.refund_id,
      transaction_id: response.transaction_id,
      amount_cents: response.amount_cents,
      status: response.status,
      created_at: response.created_at,
      completed_at: response.completed_at,
      reason: response.reason,
    });
  }

  /**
   * Get refund status
   */
  async getRefundStatus(refundId: string) {
    const response = await this.request<any>(
      `/refunds/${refundId}/status`,
      'GET'
    );

    return {
      refund_id: response.refund_id,
      transaction_id: response.transaction_id,
      amount_cents: response.amount_cents,
      status: response.status,
      created_at: response.created_at,
      completed_at: response.completed_at,
    };
  }

  /**
   * Create a payout to service provider
   */
  async createPayout(input: CreateBitPayoutInput) {
    const payoutId = input.payout_id || `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await this.request<any>('/payouts/create', 'POST', {
      payout_id: payoutId,
      service_provider_id: input.service_provider_id,
      amount_cents: input.amount_cents,
      schedule: input.schedule,
      bank_code: input.bank_code,
      branch_code: input.branch_code,
      account_number: input.account_number,
      notes: input.notes,
    });

    return bitPayoutResponseSchema.parse({
      payout_id: response.payout_id,
      service_provider_id: response.service_provider_id,
      amount_cents: response.amount_cents,
      status: response.status,
      created_at: response.created_at,
      expected_completion_at: response.expected_completion_at,
      bank_account_masked: response.bank_account_masked,
    });
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string) {
    const response = await this.request<any>(
      `/payouts/${payoutId}/status`,
      'GET'
    );

    return {
      payout_id: response.payout_id,
      service_provider_id: response.service_provider_id,
      amount_cents: response.amount_cents,
      status: response.status,
      created_at: response.created_at,
      expected_completion_at: response.expected_completion_at,
    };
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(body: string, signature: string): boolean {
    return validateBitWebhookSignature(body, signature, this.apiSecret);
  }

  /**
   * Resolve bank details from Bit ID
   */
  async resolveBankDetails(bitId: string) {
    const response = await this.request<any>(
      '/accounts/resolve-bank-details',
      'POST',
      { bit_id: bitId }
    );

    return {
      bit_id: response.bit_id,
      bank_code: response.bank_code,
      branch_code: response.branch_code,
      account_number: response.account_number,
      account_holder_name: response.account_holder_name,
      bank_name: response.bank_name,
      status: response.status,
    };
  }
}

/**
 * Create singleton instance
 */
let client: BitApiClient | null = null;

export function getBitApiClient(): BitApiClient {
  if (!client) {
    client = new BitApiClient();
  }
  return client;
}

// Export for testing
export function resetBitApiClient() {
  client = null;
}
