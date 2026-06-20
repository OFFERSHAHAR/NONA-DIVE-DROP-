import { z } from 'zod';

// ============================================================================
// BIT ACCOUNT LINKING SCHEMAS
// ============================================================================

export const linkBitAccountSchema = z.object({
  // Account type
  account_type: z.enum(['individual', 'business', 'company']),

  // Bit ID or identifier
  bit_id: z.string().min(1).max(50),

  // Phone number (for verification)
  phone_number: z.string().regex(/^\d{7,15}$/),

  // Display name (how to identify this account)
  display_name: z.string().min(1).max(100),

  // Bank account details (for payouts)
  bank_code: z.string().min(1).max(10),
  branch_code: z.string().min(1).max(10),
  account_number: z.string().min(1).max(20),

  // Account holder name
  account_holder_name: z.string().min(1).max(100),

  // Is this account for payouts?
  is_payout_account: z.boolean().default(true),
});

export type LinkBitAccountInput = z.infer<typeof linkBitAccountSchema>;

export const updateBitAccountSchema = linkBitAccountSchema.partial();

export type UpdateBitAccountInput = z.infer<typeof updateBitAccountSchema>;

// ============================================================================
// BIT PAYMENT REQUEST SCHEMAS
// ============================================================================

export const createBitPaymentRequestSchema = z.object({
  // Booking reference
  booking_id: z.string().uuid('Invalid booking ID'),

  // Amount in cents
  amount_cents: z.number().int().min(100).max(10000000), // ₪1 to ₪100,000

  // Description
  description: z.string().min(1).max(200).optional(),

  // Unique request ID (idempotency)
  request_id: z.string().min(1).max(50).optional(),

  // Expiration time (seconds)
  expiration_seconds: z.number().int().min(300).max(3600).default(300),

  // Payment method preferences
  preferred_method: z.enum(['bit', 'phone', 'id']).optional(),

  // Metadata
  metadata: z.record(z.string()).optional(),
});

export type CreateBitPaymentRequestInput = z.infer<
  typeof createBitPaymentRequestSchema
>;

export const bitPaymentRequestResponseSchema = z.object({
  // Request ID from Bit
  request_id: z.string(),

  // Short URL for payment
  short_url: z.string().url().optional(),

  // Full payment link
  payment_link: z.string().url(),

  // QR code data
  qr_code: z.string().optional(),

  // Expiration timestamp
  expires_at: z.string().datetime(),

  // Status
  status: z.enum(['pending', 'initiated', 'completed', 'failed', 'expired']),
});

export type BitPaymentRequestResponse = z.infer<
  typeof bitPaymentRequestResponseSchema
>;

// ============================================================================
// BIT PAYMENT VERIFICATION SCHEMAS
// ============================================================================

export const verifyBitPaymentSchema = z.object({
  // Payment request ID
  request_id: z.string().min(1),

  // Optional transaction ID for verification
  transaction_id: z.string().optional(),

  // Payment method used
  payment_method: z.enum(['bit', 'phone', 'id']).optional(),

  // Payer identifier (Bit ID, phone, etc.)
  payer_identifier: z.string().optional(),
});

export type VerifyBitPaymentInput = z.infer<typeof verifyBitPaymentSchema>;

export const bitPaymentVerificationSchema = z.object({
  // Request ID
  request_id: z.string(),

  // Booking ID
  booking_id: z.string().uuid(),

  // Payment status
  status: z.enum(['pending', 'completed', 'failed', 'expired']),

  // Amount paid (cents)
  amount_cents: z.number().int(),

  // Transaction ID
  transaction_id: z.string(),

  // Payer info
  payer_bit_id: z.string().optional(),
  payer_phone: z.string().optional(),
  payer_id_number: z.string().optional(),

  // Payment timestamp
  paid_at: z.string().datetime().optional(),

  // Reference number
  reference_number: z.string().optional(),

  // Raw response (for audit)
  raw_response: z.record(z.unknown()).optional(),
});

export type BitPaymentVerification = z.infer<
  typeof bitPaymentVerificationSchema
>;

// ============================================================================
// BIT REFUND SCHEMAS
// ============================================================================

export const createBitRefundSchema = z.object({
  // Original transaction ID
  transaction_id: z.string().min(1),

  // Booking ID
  booking_id: z.string().uuid(),

  // Refund amount (cents)
  amount_cents: z.number().int().positive(),

  // Reason
  reason: z.enum([
    'requested_by_customer',
    'duplicate',
    'fraudulent',
    'no_show',
    'not_as_described',
    'other',
  ]),

  // Notes
  notes: z.string().max(500).optional(),

  // Unique refund ID (idempotency)
  refund_id: z.string().min(1).max(50).optional(),
});

export type CreateBitRefundInput = z.infer<typeof createBitRefundSchema>;

export const bitRefundResponseSchema = z.object({
  // Refund ID
  refund_id: z.string(),

  // Original transaction ID
  transaction_id: z.string(),

  // Amount refunded
  amount_cents: z.number().int(),

  // Status
  status: z.enum(['pending', 'processing', 'completed', 'failed']),

  // Timestamp
  created_at: z.string().datetime(),

  // Expected completion time
  completed_at: z.string().datetime().optional(),

  // Reason
  reason: z.string(),
});

export type BitRefundResponse = z.infer<typeof bitRefundResponseSchema>;

// ============================================================================
// BIT PAYOUT SCHEMAS
// ============================================================================

export const createBitPayoutSchema = z.object({
  // Service provider ID
  service_provider_id: z.string().uuid(),

  // Payout amount (cents)
  amount_cents: z.number().int().positive(),

  // Payout schedule
  schedule: z.enum(['immediate', 'daily', 'weekly', 'monthly']).default('daily'),

  // Bank account to payout to (use linked account if not provided)
  bank_code: z.string().min(1).max(10).optional(),
  branch_code: z.string().min(1).max(10).optional(),
  account_number: z.string().min(1).max(20).optional(),

  // Notes
  notes: z.string().max(500).optional(),

  // Unique payout ID (idempotency)
  payout_id: z.string().min(1).max(50).optional(),
});

export type CreateBitPayoutInput = z.infer<typeof createBitPayoutSchema>;

export const bitPayoutResponseSchema = z.object({
  // Payout ID
  payout_id: z.string(),

  // Service provider ID
  service_provider_id: z.string().uuid(),

  // Amount
  amount_cents: z.number().int(),

  // Status
  status: z.enum(['pending', 'processing', 'completed', 'failed']),

  // Timestamp
  created_at: z.string().datetime(),

  // Expected completion time
  expected_completion_at: z.string().datetime(),

  // Bank details (masked)
  bank_account_masked: z.string(),
});

export type BitPayoutResponse = z.infer<typeof bitPayoutResponseSchema>;

// ============================================================================
// BIT TRANSACTION SCHEMAS
// ============================================================================

export const bitTransactionSchema = z.object({
  // Transaction ID
  transaction_id: z.string(),

  // Booking ID
  booking_id: z.string().uuid(),

  // Service provider ID
  service_provider_id: z.string().uuid(),

  // Diver ID
  diver_id: z.string().uuid(),

  // Transaction type
  type: z.enum(['payment', 'refund', 'payout', 'commission']),

  // Amount (cents)
  amount_cents: z.number().int(),

  // Status
  status: z.enum(['pending', 'completed', 'failed']),

  // Payment method
  payment_method: z.enum(['bit', 'phone', 'id']),

  // Payer/Payee info
  payer_identifier: z.string().optional(),
  payee_bit_id: z.string().optional(),

  // Bank account (if applicable)
  bank_code: z.string().optional(),
  branch_code: z.string().optional(),
  account_number_masked: z.string().optional(),

  // Reference number
  reference_number: z.string(),

  // Timestamps
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),

  // Notes
  notes: z.string().optional(),
});

export type BitTransaction = z.infer<typeof bitTransactionSchema>;

// ============================================================================
// BIT WEBHOOK SCHEMAS
// ============================================================================

export const bitWebhookPaymentSchema = z.object({
  event: z.literal('payment.completed'),
  request_id: z.string(),
  booking_id: z.string().uuid(),
  transaction_id: z.string(),
  amount_cents: z.number().int(),
  payer_identifier: z.string(),
  payment_method: z.enum(['bit', 'phone', 'id']),
  reference_number: z.string(),
  paid_at: z.string().datetime(),
});

export type BitWebhookPayment = z.infer<typeof bitWebhookPaymentSchema>;

export const bitWebhookRefundSchema = z.object({
  event: z.literal('refund.completed'),
  refund_id: z.string(),
  transaction_id: z.string(),
  amount_cents: z.number().int(),
  completed_at: z.string().datetime(),
});

export type BitWebhookRefund = z.infer<typeof bitWebhookRefundSchema>;

export const bitWebhookPayoutSchema = z.object({
  event: z.literal('payout.completed'),
  payout_id: z.string(),
  service_provider_id: z.string().uuid(),
  amount_cents: z.number().int(),
  completed_at: z.string().datetime(),
});

export type BitWebhookPayout = z.infer<typeof bitWebhookPayoutSchema>;

// ============================================================================
// FILTERING & PAGINATION SCHEMAS
// ============================================================================

export const bitTransactionsFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['payment', 'refund', 'payout', 'commission']).optional(),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  booking_id: z.string().uuid().optional(),
  service_provider_id: z.string().uuid().optional(),
  diver_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort_by: z.enum(['recent', 'oldest', 'amount_high', 'amount_low']).default('recent'),
});

export type BitTransactionsFilterInput = z.infer<
  typeof bitTransactionsFilterSchema
>;

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const bitPaymentsDashboardFilterSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export type BitPaymentsDashboardFilterInput = z.infer<
  typeof bitPaymentsDashboardFilterSchema
>;
