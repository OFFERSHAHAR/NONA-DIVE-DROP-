/**
 * Stripe Configuration for DIVE DROP
 * Handles all Stripe Connect and payment processing settings
 */

export const STRIPE_CONFIG = {
  // API Keys
  apiKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLIC_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Commission Settings
  commission: {
    // Base commission rate (8%)
    rate: 0.08,

    // Commission by booking tier (optional)
    tiers: [
      {
        name: 'standard',
        min_cents: 100, // ₪1
        max_cents: 100000, // ₪1,000
        rate: 0.08, // 8%
      },
      {
        name: 'large',
        min_cents: 100001, // ₪1,000+
        max_cents: 1000000, // ₪10,000
        rate: 0.06, // 6% discount
      },
    ],

    // Stripe processing fees (included in commission)
    // 2.9% + ₪1.10 per transaction
    stripePercentageFee: 0.029,
    stripeFixedFee: 110, // in cents (₪1.10)

    // Minimum commission amount
    minCommission: 50, // ₪0.50

    // Whether to round up or down
    roundingMethod: 'round', // 'round' | 'ceil' | 'floor'
  },

  // Payment Intent Settings
  paymentIntent: {
    currency: 'ils',
    // statement_descriptor limited to 22 chars
    statementDescriptor: 'DIVE DROP - Dive Booking',

    // Metadata structure
    metadata: {
      platform: 'dive_drop',
      version: '1.0',
      environment: process.env.NODE_ENV || 'development',
    },

    // 3D Secure / SCA (Strong Customer Authentication)
    // Required in Israel for cards > ₪500
    automatic_payment_methods: {
      enabled: true,
    },

    // Confirm payment immediately (no client-side confirmation)
    confirm: false,
  },

  // Connect Settings (for service providers)
  connect: {
    // Stripe Connect account type
    type: 'standard', // 'standard' | 'express' | 'custom'

    // Account capabilities required
    capabilities: {
      card_payments: {
        requested: true,
      },
      transfers: {
        requested: true,
      },
    },

    // Refresh URL and Return URL for Connect flow
    refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/provider/connect/refresh`,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/provider/connect/return`,

    // Default settings for new connected accounts
    defaultSettings: {
      payout_schedule: 'daily',
      minimum_payout_amount: 1000, // ₪10
    },
  },

  // Webhook Configuration
  webhooks: {
    // Webhook events to listen for
    events: [
      // Payment Intent events
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'payment_intent.amount_capturable_updated',

      // Charge events
      'charge.captured',
      'charge.refunded',
      'charge.dispute.created',
      'charge.dispute.updated',
      'charge.dispute.closed',

      // Payout events
      'payout.created',
      'payout.paid',
      'payout.failed',
      'payout.canceled',
      'payout.updated',

      // Account events (for connected accounts)
      'account.updated',
      'account.external_account.created',
      'account.external_account.deleted',
      'account.external_account.updated',

      // Setup Intent events
      'setup_intent.succeeded',
      'setup_intent.setup_failed',

      // Chargeback events
      'charge.chargeback.created',
      'charge.chargeback.reversed',

      // Balance events
      'balance.available.updated',
    ],

    // Webhook timeout
    timeout: 5000, // 5 seconds

    // Retry behavior
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },

  // Payout Settings
  payouts: {
    // Payout schedules
    schedules: ['daily', 'weekly', 'monthly'] as const,
    defaultSchedule: 'daily',

    // Minimum payout amount (in cents)
    minimumAmount: 1000, // ₪10

    // Maximum payout amount per day
    maximumAmount: 50000000, // ₪500,000 (safety limit)

    // Payout delay (days after transaction)
    defaultDelay: 2, // Stripe default for ILS

    // Currency support
    supportedCurrencies: ['ILS', 'USD', 'EUR'],
  },

  // Refund Settings
  refunds: {
    // Refund window (hours after payment)
    window: 24,

    // Maximum refund percentage
    maxPercentage: 1.0, // 100%

    // Whether refunds include commission
    refundCommission: true,

    // Reason codes
    reasons: [
      'requested_by_customer',
      'duplicate',
      'fraudulent',
      'no_show',
      'not_as_described',
      'other',
    ],
  },

  // Fraud Detection
  fraud: {
    // Enable/disable fraud detection
    enabled: true,

    // Risk level thresholds
    riskThresholds: {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
    },

    // Require additional verification for high-risk transactions
    requireVerificationAboveRiskScore: 0.7,

    // Radar settings (if enabled)
    radar: {
      enabled: process.env.STRIPE_RADAR_ENABLED === 'true',
      allowHighRisk: false,
    },
  },

  // Dispute Management
  disputes: {
    // Auto-refund for disputes within this window
    autoRefundWindowDays: 1,

    // Evidence submission deadline (from Stripe's perspective)
    // Typically 7 days, configurable per dispute
    deadlineWindow: 7,

    // Whether to automatically submit evidence
    autoSubmitEvidence: true,

    // Contact info for disputes
    contactEmail: process.env.STRIPE_DISPUTE_EMAIL || 'disputes@divedrop.com',
  },

  // Tax Configuration (Israel)
  tax: {
    // VAT rate in Israel (21%)
    vatRate: 0.21,

    // Tax ID (for invoices)
    taxId: process.env.COMPANY_TAX_ID || '',

    // Whether to calculate VAT
    calculateVAT: true,

    // Report settings
    reportingEnabled: true,
    reportingCurrency: 'ILS',
  },

  // API Timeouts
  timeouts: {
    charge: 5000,
    refund: 5000,
    transfer: 10000,
    payout: 10000,
    webhookProcessing: 15000,
  },

  // Rate Limiting
  rateLimit: {
    // Requests per second per API key
    enabled: true,
    requestsPerSecond: 100,
    burstLimit: 500,
  },

  // Development / Testing
  testing: {
    // Test mode
    testMode: process.env.NODE_ENV === 'development',

    // Test card numbers (DO NOT CHANGE)
    testCards: {
      visa: '4242424242424242',
      mastercard: '5555555555554444',
      amex: '378282246310005',
      declined: '4000000000000002',
      threeDSecure: '4000002500003155',
    },

    // Webhook test event
    testWebhookEvent: 'charge.succeeded',
  },

  // Logging
  logging: {
    // Log all API calls
    logApiCalls: process.env.STRIPE_LOG_API_CALLS === 'true',

    // Log webhook processing
    logWebhooks: process.env.STRIPE_LOG_WEBHOOKS === 'true',

    // Log level
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  },
} as const;

// Calculate commission for an amount
export function calculateCommission(
  amountCents: number,
  overrideRate?: number
): {
  gross: number;
  commission: number;
  stripeFee: number;
  net: number;
} {
  const rate = overrideRate ?? STRIPE_CONFIG.commission.rate;

  // Calculate raw commission
  let commission = Math.round(amountCents * rate);

  // Apply minimum commission
  if (commission < STRIPE_CONFIG.commission.minCommission) {
    commission = STRIPE_CONFIG.commission.minCommission;
  }

  // Calculate Stripe fee (separate from commission)
  const stripeFee =
    Math.round(amountCents * STRIPE_CONFIG.commission.stripePercentageFee) +
    STRIPE_CONFIG.commission.stripeFixedFee;

  // Net payout is after commission (commission already includes Stripe fee)
  const net = amountCents - commission;

  return {
    gross: amountCents,
    commission,
    stripeFee,
    net,
  };
}

// Get commission rate based on booking amount
export function getCommissionRate(amountCents: number): number {
  const tier = STRIPE_CONFIG.commission.tiers.find(
    (t) => amountCents >= t.min_cents && amountCents <= t.max_cents
  );

  return tier?.rate ?? STRIPE_CONFIG.commission.rate;
}

// Validate commission calculation
export function validateCommission(
  gross: number,
  commission: number,
  net: number,
  tolerance: number = 2
): boolean {
  return Math.abs(gross - commission - net) <= tolerance;
}

// Format currency for display
export function formatCurrency(cents: number, currency: string = 'ILS'): string {
  const symbols: Record<string, string> = {
    ILS: '₪',
    USD: '$',
    EUR: '€',
  };

  const symbol = symbols[currency] ?? currency;
  const amount = (cents / 100).toFixed(2);

  return `${symbol}${amount}`;
}

// Get webhook signature validation
export function validateWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require('crypto');

  const hash = crypto
    .createHmac('sha256', STRIPE_CONFIG.webhookSecret)
    .update(body)
    .digest('hex');

  const signatureTimestamp = signature.split(',')[0].split('=')[1];
  const signatureSignature = signature.split(',')[1].split('=')[1];

  const computedSignature = crypto
    .createHmac('sha256', STRIPE_CONFIG.webhookSecret)
    .update(`${signatureTimestamp}.${body}`)
    .digest('hex');

  return computedSignature === signatureSignature;
}
