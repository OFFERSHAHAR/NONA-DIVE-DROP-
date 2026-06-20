-- ============================================================================
-- BIT PAYMENT SYSTEM SCHEMA
-- ============================================================================
-- This migration creates the complete Bit payment system for DIVE DROP
-- Bit is Israel's instant payment system (ביט)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BIT ACCOUNTS TABLE
-- ============================================================================
-- Stores linked Bit accounts for service providers

CREATE TABLE IF NOT EXISTS bit_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Service provider reference
  service_provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Account type
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('individual', 'business', 'company')),

  -- Bit identifiers
  bit_id VARCHAR(50) NOT NULL,
  bit_phone VARCHAR(15),
  bit_display_name VARCHAR(100),
  bit_status VARCHAR(50) DEFAULT 'active' CHECK (bit_status IN ('active', 'inactive', 'suspended', 'pending_verification')),

  -- Bank account details (encrypted)
  bank_code VARCHAR(10) NOT NULL,
  branch_code VARCHAR(10) NOT NULL,
  account_number VARCHAR(20) NOT NULL, -- Store encrypted in production
  account_holder_name VARCHAR(100) NOT NULL,

  -- Account info
  is_payout_account BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,

  -- Verification
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_token VARCHAR(255),

  -- Payout schedule
  payout_schedule VARCHAR(50) DEFAULT 'daily' CHECK (payout_schedule IN ('daily', 'weekly', 'monthly')),

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  UNIQUE(service_provider_id, bit_id)
);

CREATE INDEX idx_bit_accounts_service_provider ON bit_accounts(service_provider_id);
CREATE INDEX idx_bit_accounts_bit_id ON bit_accounts(bit_id);
CREATE INDEX idx_bit_accounts_status ON bit_accounts(bit_status);

-- ============================================================================
-- BIT PAYMENT REQUESTS TABLE
-- ============================================================================
-- Stores payment requests (QR codes, links, etc.)

CREATE TABLE IF NOT EXISTS bit_payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Booking reference
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,

  -- Payment amount (in cents)
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

  -- Bit request info
  bit_request_id VARCHAR(100) NOT NULL UNIQUE,

  -- Payment links
  payment_link TEXT NOT NULL,
  short_url TEXT,
  qr_code TEXT, -- Base64 encoded QR code image

  -- Payment method used
  payment_method VARCHAR(50) CHECK (payment_method IN ('bit', 'phone', 'id')),

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'initiated', 'completed', 'failed', 'expired', 'cancelled')
  ),

  -- Transaction info (when completed)
  transaction_id VARCHAR(100) UNIQUE,
  payer_identifier VARCHAR(100), -- Bit ID, phone, or ID number
  reference_number VARCHAR(100),

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  request_count INTEGER DEFAULT 0, -- How many times was the link accessed
  last_accessed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  CONSTRAINT check_expiration CHECK (expires_at > created_at)
);

CREATE INDEX idx_bit_payment_requests_booking ON bit_payment_requests(booking_id);
CREATE INDEX idx_bit_payment_requests_status ON bit_payment_requests(status);
CREATE INDEX idx_bit_payment_requests_created ON bit_payment_requests(created_at DESC);
CREATE INDEX idx_bit_payment_requests_expires ON bit_payment_requests(expires_at);

-- ============================================================================
-- BIT TRANSACTIONS TABLE
-- ============================================================================
-- Audit log for all Bit transactions

CREATE TABLE IF NOT EXISTS bit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Transaction identifiers
  bit_transaction_id VARCHAR(100) UNIQUE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Participants
  service_provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction type
  type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'refund', 'payout', 'commission')),

  -- Amount (in cents)
  amount_cents INTEGER NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),

  -- Payment method / account info
  payment_method VARCHAR(50),
  payer_identifier VARCHAR(100),

  -- Bank account (for payouts)
  bank_code VARCHAR(10),
  branch_code VARCHAR(10),
  account_number_masked VARCHAR(20), -- Show only last 4 digits

  -- Reference
  reference_number VARCHAR(100),

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  CONSTRAINT valid_amount CHECK (amount_cents != 0)
);

CREATE INDEX idx_bit_transactions_booking ON bit_transactions(booking_id);
CREATE INDEX idx_bit_transactions_service_provider ON bit_transactions(service_provider_id);
CREATE INDEX idx_bit_transactions_diver ON bit_transactions(diver_id);
CREATE INDEX idx_bit_transactions_type ON bit_transactions(type);
CREATE INDEX idx_bit_transactions_status ON bit_transactions(status);
CREATE INDEX idx_bit_transactions_created ON bit_transactions(created_at DESC);

-- ============================================================================
-- BIT REFUNDS TABLE
-- ============================================================================
-- Tracks refund requests and their status

CREATE TABLE IF NOT EXISTS bit_refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Refund identifiers
  bit_refund_id VARCHAR(100) NOT NULL UNIQUE,
  bit_transaction_id VARCHAR(100) NOT NULL,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Refund amount (in cents)
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

  -- Refund reason
  reason VARCHAR(100) NOT NULL CHECK (
    reason IN (
      'requested_by_customer',
      'duplicate',
      'fraudulent',
      'no_show',
      'not_as_described',
      'other'
    )
  ),

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_bit_refunds_booking ON bit_refunds(booking_id);
CREATE INDEX idx_bit_refunds_status ON bit_refunds(status);
CREATE INDEX idx_bit_refunds_created ON bit_refunds(created_at DESC);

-- ============================================================================
-- BIT PAYOUTS TABLE
-- ============================================================================
-- Tracks payouts to service providers

CREATE TABLE IF NOT EXISTS bit_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Payout identifiers
  bit_payout_id VARCHAR(100) NOT NULL UNIQUE,
  service_provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payout amount (in cents)
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

  -- Payout schedule
  schedule VARCHAR(50) DEFAULT 'daily' CHECK (schedule IN ('immediate', 'daily', 'weekly', 'monthly')),

  -- Bank account
  bank_code VARCHAR(10) NOT NULL,
  branch_code VARCHAR(10) NOT NULL,
  account_number_masked VARCHAR(20) NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expected_completion_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_bit_payouts_service_provider ON bit_payouts(service_provider_id);
CREATE INDEX idx_bit_payouts_status ON bit_payouts(status);
CREATE INDEX idx_bit_payouts_created ON bit_payouts(created_at DESC);

-- ============================================================================
-- BIT COMMISSION RECORDS TABLE
-- ============================================================================
-- Tracks commission earned by DIVE DROP

CREATE TABLE IF NOT EXISTS bit_commission_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Booking reference
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Commission amount (in cents)
  commission_cents INTEGER NOT NULL CHECK (commission_cents > 0),

  -- Gross amount
  gross_amount_cents INTEGER NOT NULL,

  -- Commission percentage applied
  commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.08, -- 0.08 = 8%

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'failed')),

  -- Collected via which transaction
  bit_transaction_id VARCHAR(100) REFERENCES bit_transactions(bit_transaction_id),

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_bit_commission_records_booking ON bit_commission_records(booking_id);
CREATE INDEX idx_bit_commission_records_status ON bit_commission_records(status);
CREATE INDEX idx_bit_commission_records_created ON bit_commission_records(created_at DESC);

-- ============================================================================
-- BIT WEBHOOKS LOG TABLE
-- ============================================================================
-- Stores webhook events for audit and replay

CREATE TABLE IF NOT EXISTS bit_webhooks_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Webhook event type
  event_type VARCHAR(100) NOT NULL,

  -- Raw event data
  event_data JSONB NOT NULL,

  -- Processing status
  status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed')),

  -- Error info (if processing failed)
  error_message TEXT,

  -- Timing
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  signature_valid BOOLEAN,
  ip_address INET,

  -- Retry tracking
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_bit_webhooks_log_event_type ON bit_webhooks_log(event_type);
CREATE INDEX idx_bit_webhooks_log_status ON bit_webhooks_log(status);
CREATE INDEX idx_bit_webhooks_log_received ON bit_webhooks_log(received_at DESC);

-- ============================================================================
-- BIT SETTLEMENT TABLE
-- ============================================================================
-- Track daily/weekly/monthly settlements

CREATE TABLE IF NOT EXISTS bit_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Settlement period
  settlement_date DATE NOT NULL UNIQUE,
  period_type VARCHAR(50) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- Totals
  total_payment_cents INTEGER DEFAULT 0,
  total_commission_cents INTEGER DEFAULT 0,
  total_refund_cents INTEGER DEFAULT 0,
  total_payout_cents INTEGER DEFAULT 0,

  -- Settlement status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Related transactions
  transaction_count INTEGER DEFAULT 0,

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_bit_settlements_date ON bit_settlements(settlement_date DESC);
CREATE INDEX idx_bit_settlements_status ON bit_settlements(status);

-- ============================================================================
-- UPDATED BOOKINGS TABLE (if not already updated)
-- ============================================================================
-- Add Bit-specific fields to bookings

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS bit_payment_request_id UUID REFERENCES bit_payment_requests(id),
ADD COLUMN IF NOT EXISTS bit_transaction_id VARCHAR(100) REFERENCES bit_transactions(bit_transaction_id),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'bit' CHECK (payment_method IN ('bit'));

CREATE INDEX idx_bookings_bit_payment_request ON bookings(bit_payment_request_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE bit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bit_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bit_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bit_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bit_commission_records ENABLE ROW LEVEL SECURITY;

-- Service providers can view their own accounts
CREATE POLICY "Users can view own Bit accounts" ON bit_accounts
  FOR SELECT
  USING (service_provider_id = auth.uid());

-- Service providers can view their own payouts
CREATE POLICY "Users can view own payouts" ON bit_payouts
  FOR SELECT
  USING (service_provider_id = auth.uid());

-- Service providers can view their transactions
CREATE POLICY "Users can view own transactions" ON bit_transactions
  FOR SELECT
  USING (service_provider_id = auth.uid() OR diver_id = auth.uid());

-- Divers can view their refunds
CREATE POLICY "Divers can view own refunds" ON bit_refunds
  FOR SELECT
  USING (booking_id IN (
    SELECT id FROM bookings WHERE diver_id = auth.uid()
  ));

-- Admin policies (handled by auth.uid() = admin check elsewhere)

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate commission
CREATE OR REPLACE FUNCTION calculate_bit_commission(
  gross_amount_cents INTEGER,
  commission_rate NUMERIC DEFAULT 0.08
)
RETURNS TABLE (
  commission_cents INTEGER,
  net_amount_cents INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT
    CAST(ROUND(gross_amount_cents * commission_rate) AS INTEGER),
    gross_amount_cents - CAST(ROUND(gross_amount_cents * commission_rate) AS INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bit_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bit_accounts_updated_at
  BEFORE UPDATE ON bit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bit_accounts_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON bit_accounts TO authenticated;
GRANT SELECT ON bit_payment_requests TO authenticated;
GRANT SELECT ON bit_transactions TO authenticated;
GRANT SELECT ON bit_refunds TO authenticated;
GRANT SELECT ON bit_payouts TO authenticated;
GRANT SELECT ON bit_commission_records TO PUBLIC;
GRANT SELECT ON bit_webhooks_log TO PUBLIC;
