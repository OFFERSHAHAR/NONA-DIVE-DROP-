/**
 * Bit Payment System Configuration for DIVE DROP
 * Handles all Bit payment processing, account linking, and settlement
 *
 * Bit (ביט) is Israel's national instant payment system
 * Official docs: https://www.bit.org.il/
 */

export const BIT_CONFIG = {
  // API Configuration
  api: {
    // Bit API endpoints
    baseUrl: process.env.BIT_API_URL || 'https://api.bit.org.il/v1',

    // Authentication
    apiKey: process.env.BIT_API_KEY || '',
    apiSecret: process.env.BIT_API_SECRET || '',

    // Merchant ID (assigned by Bit)
    merchantId: process.env.BIT_MERCHANT_ID || '',

    // Business identifier
    businessId: process.env.BIT_BUSINESS_ID || '',
    businessName: process.env.BIT_BUSINESS_NAME || 'DIVE DROP',
  },

  // Payment Request Settings
  paymentRequest: {
    // Request timeout (seconds)
    timeout: 300, // 5 minutes

    // Currency (always ILS for Bit)
    currency: 'ILS',

    // Supported payment methods
    methods: ['bit', 'phone', 'id'], // Bit ID, Phone number, ID number

    // Request description template
    descriptionTemplate: 'DIVE DROP - Dive Booking #{bookingId}',

    // Metadata structure
    metadata: {
      platform: 'dive_drop',
      version: '1.0',
      environment: process.env.NODE_ENV || 'development',
    },
  },

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

    // Minimum commission amount
    minCommission: 50, // ₪0.50

    // Whether to round up or down
    roundingMethod: 'round', // 'round' | 'ceil' | 'floor'
  },

  // Bit Account Linking
  accountLinking: {
    // Supported account types
    types: [
      'individual',      // Individual (תעודת זהות)
      'business',        // Business (מספר עוסק)
      'company',         // Company (מספר תאגיד)
    ],

    // Bit ID verification
    verification: {
      required: true,
      autoVerify: process.env.NODE_ENV === 'development', // Skip in dev
      timeout: 3600, // 1 hour
    },

    // Account data to store
    dataToStore: [
      'bit_id',          // Unique Bit identifier
      'bit_phone',       // Registered phone
      'bit_display_name', // Display name
      'bit_status',      // Account status (active, inactive, suspended)
    ],
  },

  // Bank Account Settings (for Bit transfers)
  bankAccount: {
    // Automatic account resolution
    autoResolve: true,

    // Supported banks (Israeli banks)
    supportedBanks: [
      'bank_leumi',
      'bank_poalim',
      'bank_discount',
      'mizrahi',
      'igud',
      'beersheva',
      'otsar_hapost',
      'union_bank',
      'leumiplus',
      'max',
      'yahav',
    ],

    // Bank transfer timeout
    timeout: 5000, // 5 seconds for resolution
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

    // Payout processing time (hours)
    processingTime: {
      daily: '4-6 hours',
      weekly: '1 day',
      monthly: '2-3 days',
    },

    // Settlement cycle
    settlementCycle: 'T+1', // Next business day
  },

  // Webhook Configuration
  webhooks: {
    // Webhook events to listen for
    events: [
      // Payment events
      'payment.initiated',
      'payment.pending',
      'payment.completed',
      'payment.failed',
      'payment.expired',
      'payment.cancelled',

      // Refund events
      'refund.initiated',
      'refund.processing',
      'refund.completed',
      'refund.failed',

      // Payout events
      'payout.scheduled',
      'payout.processing',
      'payout.completed',
      'payout.failed',

      // Account events
      'account.linked',
      'account.updated',
      'account.suspended',
      'account.verified',

      // Reconciliation events
      'reconciliation.initiated',
      'reconciliation.completed',
    ],

    // Webhook timeout
    timeout: 5000, // 5 seconds

    // Retry behavior
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    backoffMultiplier: 2,
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

  // Dispute Management
  disputes: {
    // Dispute resolution window (days)
    resolutionWindow: 7,

    // Whether to auto-resolve within policy
    autoResolve: true,

    // Contact info for disputes
    contactEmail: process.env.BIT_DISPUTE_EMAIL || 'disputes@divedrop.com',
  },

  // Security Settings
  security: {
    // Enable request signing
    signRequests: true,

    // Enable response validation
    validateResponses: true,

    // SSL certificate validation
    verifySsl: process.env.NODE_ENV === 'production',

    // IP whitelist (optional)
    ipWhitelist: process.env.BIT_IP_WHITELIST?.split(',') || [],

    // Rate limiting
    rateLimit: {
      enabled: true,
      requestsPerSecond: 100,
      burstLimit: 500,
    },
  },

  // Logging
  logging: {
    // Log all API calls
    logApiCalls: process.env.BIT_LOG_API_CALLS === 'true',

    // Log webhook processing
    logWebhooks: process.env.BIT_LOG_WEBHOOKS === 'true',

    // Log level
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',

    // Mask sensitive data
    maskSensitiveData: true,
  },

  // Testing
  testing: {
    // Test mode
    testMode: process.env.NODE_ENV === 'development',

    // Test Bit IDs
    testIds: {
      individual: '123456789',
      business: '999999999',
    },
  },

  // API Timeouts
  timeouts: {
    paymentRequest: 5000,
    paymentVerification: 5000,
    accountLinking: 10000,
    bankResolution: 5000,
    refund: 5000,
    payout: 10000,
    webhookProcessing: 15000,
  },
} as const;

// ============================================================================
// COMMISSION CALCULATIONS
// ============================================================================

/**
 * Calculate commission for a payment amount
 */
export function calculateCommission(
  amountCents: number,
  overrideRate?: number
): {
  gross: number;
  commission: number;
  net: number;
  commissionPercent: number;
} {
  const rate = overrideRate ?? BIT_CONFIG.commission.rate;

  // Calculate raw commission
  let commission = Math.round(amountCents * rate);

  // Apply minimum commission
  if (commission < BIT_CONFIG.commission.minCommission) {
    commission = BIT_CONFIG.commission.minCommission;
  }

  // Net payout is after commission
  const net = amountCents - commission;

  return {
    gross: amountCents,
    commission,
    net,
    commissionPercent: (commission / amountCents) * 100,
  };
}

/**
 * Get commission rate based on booking amount
 */
export function getCommissionRate(amountCents: number): number {
  const tier = BIT_CONFIG.commission.tiers.find(
    (t) => amountCents >= t.min_cents && amountCents <= t.max_cents
  );

  return tier?.rate ?? BIT_CONFIG.commission.rate;
}

/**
 * Validate commission calculation
 */
export function validateCommission(
  gross: number,
  commission: number,
  net: number,
  tolerance: number = 2
): boolean {
  return Math.abs(gross - commission - net) <= tolerance;
}

/**
 * Format currency for display
 */
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

/**
 * Generate Bit request signature (HMAC-SHA256)
 */
export function generateBitSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Validate Bit webhook signature
 */
export function validateBitWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateBitSignature(body, secret);
  return expectedSignature === signature;
}
