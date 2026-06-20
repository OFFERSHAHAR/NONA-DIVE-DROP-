import { z } from 'zod';

// ============================================================================
// SERVICE PROVIDER ACCOUNT SCHEMAS
// ============================================================================

export const createServiceProviderAccountSchema = z.object({
  business_name: z.string().min(3).max(255),
  business_type: z.enum(['individual', 'company', 'boat_operator', 'dive_school']),
  business_tax_id: z.string().min(9).max(20).optional(),
  business_phone: z.string().min(10).max(20),
  business_address: z.string().max(500).optional(),
  business_website: z.string().url().optional(),
  payout_schedule: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  payout_currency: z.string().length(3).default('ILS'),
});

export type CreateServiceProviderAccountInput = z.infer<
  typeof createServiceProviderAccountSchema
>;

export const updateServiceProviderAccountSchema =
  createServiceProviderAccountSchema.partial();

export type UpdateServiceProviderAccountInput = z.infer<
  typeof updateServiceProviderAccountSchema
>;

// ============================================================================
// DIVE BOOKING SCHEMAS
// ============================================================================

export const createDiveBookingSchema = z.object({
  service_provider_id: z.string().uuid('Invalid service provider ID'),
  buddy_connection_id: z.string().uuid().optional(),

  dive_site_id: z.string().uuid().optional(),
  dive_date: z.string().datetime('Invalid date format'),
  dive_duration_minutes: z.number().int().min(30).max(480).optional(),
  number_of_divers: z.number().int().min(1).max(10).default(1),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),

  notes: z.string().max(2000).optional(),

  // Pricing (in ILS cents)
  amount_cents: z.number().int().min(100).max(10000000), // ₪1 to ₪100,000
});

export type CreateDiveBookingInput = z.infer<typeof createDiveBookingSchema>;

export const updateDiveBookingSchema = createDiveBookingSchema
  .partial()
  .omit({ service_provider_id: true, dive_date: true });

export type UpdateDiveBookingInput = z.infer<typeof updateDiveBookingSchema>;

export const cancelDiveBookingSchema = z.object({
  reason: z.string().max(500),
  refund_reason: z.enum([
    'diver_cancellation',
    'provider_cancellation',
    'payment_failed',
    'dispute_resolution',
  ]),
});

export type CancelDiveBookingInput = z.infer<typeof cancelDiveBookingSchema>;

export const diveBookingsFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  dive_date_from: z.string().datetime().optional(),
  dive_date_to: z.string().datetime().optional(),
  service_provider_id: z.string().uuid().optional(),
  diver_id: z.string().uuid().optional(),
  sort_by: z.enum(['recent', 'upcoming', 'price_low', 'price_high']).default('recent'),
});

export type DiveBookingsFilterInput = z.infer<typeof diveBookingsFilterSchema>;

// ============================================================================
// PAYMENT METHOD SCHEMAS
// ============================================================================

export const createPaymentMethodSchema = z.object({
  type: z.enum(['card', 'bank_account', 'digital_wallet']),
  stripe_payment_method_id: z.string().min(1),
  card_brand: z.string().optional(),
  card_last_four: z.string().length(4).optional(),
  card_exp_month: z.number().int().min(1).max(12).optional(),
  card_exp_year: z.number().int().min(2024).max(2099).optional(),
  is_default: z.boolean().default(false),
});

export type CreatePaymentMethodInput = z.infer<
  typeof createPaymentMethodSchema
>;

export const updatePaymentMethodSchema = z.object({
  is_default: z.boolean().optional(),
});

export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;

// ============================================================================
// STRIPE PAYMENT INTENT SCHEMAS
// ============================================================================

export const createPaymentIntentSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  payment_method_id: z.string().optional(), // If not provided, use SetupIntent
  save_payment_method: z.boolean().default(false),
});

export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;

export const confirmPaymentSchema = z.object({
  payment_intent_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const generateInvoiceSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  recipient_type: z.enum(['diver', 'service_provider']),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;

export const invoicesFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional(),
  recipient_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export type InvoicesFilterInput = z.infer<typeof invoicesFilterSchema>;

// ============================================================================
// REFUND SCHEMAS
// ============================================================================

export const initiateRefundSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  reason: z.enum([
    'diver_request',
    'provider_error',
    'cancellation',
    'dispute_resolution',
    'payment_failed',
  ]),
  amount_cents: z.number().int().positive().optional(), // If not provided, full refund
  notes: z.string().max(1000).optional(),
});

export type InitiateRefundInput = z.infer<typeof initiateRefundSchema>;

export const refundsFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed'])
    .optional(),
  booking_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export type RefundsFilterInput = z.infer<typeof refundsFilterSchema>;

// ============================================================================
// COMMISSION & EARNINGS SCHEMAS
// ============================================================================

export const commissionRateSchema = z.object({
  rate: z.number().min(0).max(1), // 0.08 = 8%
  min_booking_cents: z.number().int().positive().optional(),
  max_booking_cents: z.number().int().positive().optional(),
});

export type CommissionRate = z.infer<typeof commissionRateSchema>;

export const earningsFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  period: z.enum(['today', 'week', 'month', 'custom']).default('month'),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  group_by: z.enum(['day', 'week', 'month']).optional(),
});

export type EarningsFilterInput = z.infer<typeof earningsFilterSchema>;

// ============================================================================
// DISPUTE SCHEMAS
// ============================================================================

export const createDisputeSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  type: z.enum(['chargeback', 'complaint', 'refund_dispute']),
  reason: z.string().min(20).max(2000),
  evidence_urls: z.array(z.string().url()).optional(),
});

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

export const resolveDisputeSchema = z.object({
  dispute_id: z.string().uuid('Invalid dispute ID'),
  resolution: z.enum(['won', 'lost', 'settled']),
  notes: z.string().max(2000).optional(),
});

export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const paymentsDashboardFilterSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  currency: z.string().length(3).default('ILS'),
});

export type PaymentsDashboardFilterInput = z.infer<
  typeof paymentsDashboardFilterSchema
>;

export const transactionHistoryFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z
    .enum(['charge', 'payout', 'refund', 'fee'])
    .optional(),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export type TransactionHistoryFilterInput = z.infer<
  typeof transactionHistoryFilterSchema
>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateCommissionCalculation(
  gross: number,
  commission: number,
  net: number,
  tolerance: number = 1
): boolean {
  return Math.abs(gross - commission - net) <= tolerance;
}

export function formatCurrency(cents: number, currency: string = 'ILS'): string {
  const symbols: Record<string, string> = {
    ILS: '₪',
    USD: '$',
    EUR: '€',
  };

  const symbol = symbols[currency] || currency;
  const amount = (cents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

export function calculateCommission(
  amount: number,
  rate: number = 0.08
): { gross: number; commission: number; net: number } {
  const commission = Math.round(amount * rate);
  const net = amount - commission;

  return {
    gross: amount,
    commission,
    net,
  };
}
