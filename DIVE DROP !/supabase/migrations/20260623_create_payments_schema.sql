-- DIVE DROP: Payments & Commission System
-- Created: 2026-06-23

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE commission_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');
CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_account', 'digital_wallet');
CREATE TYPE transaction_type AS ENUM ('charge', 'payout', 'refund', 'fee');
CREATE TYPE transaction_entity AS ENUM ('diver', 'service_provider', 'dive_drop');

-- ============================================================================
-- SERVICE PROVIDERS
-- ============================================================================
-- NOTE: service_providers table is created in 20260625_booking_system_schema.sql
-- This migration depends on that table and only creates payment-related tables
-- that reference it.

-- ============================================================================
-- NOTE: Booking table is created in 20260625_booking_system_schema.sql
-- This migration references the bookings table from that schema
-- ============================================================================

-- ============================================================================
-- COMMISSION RECORDS
-- ============================================================================

CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to booking
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE RESTRICT,

  -- Commission Calculation
  gross_amount_cents BIGINT NOT NULL, -- ₪500 = 50000
  commission_rate_percent DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
  commission_amount_cents BIGINT NOT NULL, -- 8% of gross

  -- Payout Amount (after fees)
  net_payout_cents BIGINT NOT NULL, -- gross - commission

  -- Stripe Fees (included in commission_rate)
  stripe_fee_cents BIGINT DEFAULT 0,

  -- Status
  status commission_status NOT NULL DEFAULT 'pending',

  -- Payout Reference
  payout_id VARCHAR(255), -- Stripe payout ID
  paid_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_amounts CHECK (
    commission_amount_cents >= 0
    AND net_payout_cents >= 0
    AND (gross_amount_cents - commission_amount_cents) = net_payout_cents
  ),
  CONSTRAINT valid_rate CHECK (commission_rate_percent >= 0 AND commission_rate_percent <= 100)
);

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to booking
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Invoice recipient
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_type VARCHAR(50), -- 'diver', 'service_provider'

  -- Invoice Details
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE,

  -- Line Items (JSON)
  items JSONB NOT NULL,

  -- Amounts
  subtotal_cents BIGINT NOT NULL,
  tax_cents BIGINT DEFAULT 0,
  total_cents BIGINT NOT NULL,

  -- VAT (21% in Israel)
  vat_percent DECIMAL(5, 2) DEFAULT 21.00,
  vat_number TEXT,

  -- Status
  status invoice_status DEFAULT 'draft',

  -- Storage
  pdf_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_amounts CHECK (subtotal_cents >= 0 AND tax_cents >= 0)
);

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe Payment Method
  stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,

  -- Method Details
  type payment_method_type NOT NULL,
  card_brand VARCHAR(50), -- 'visa', 'mastercard', 'amex'
  card_last_four VARCHAR(4),
  card_exp_month INT,
  card_exp_year INT,

  -- Default
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_card CHECK (
    (type != 'card') OR (card_last_four IS NOT NULL AND card_exp_month IS NOT NULL AND card_exp_year IS NOT NULL)
  )
);

-- ============================================================================
-- REFUNDS
-- ============================================================================

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  commission_record_id UUID NOT NULL REFERENCES commission_records(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Refund Details
  refund_amount_cents BIGINT NOT NULL,
  reason VARCHAR(255),

  -- Status
  status refund_status DEFAULT 'pending',

  -- Stripe Reference
  stripe_refund_id VARCHAR(255),

  -- Created by
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_amount CHECK (refund_amount_cents > 0)
);

-- ============================================================================
-- PAYMENT TRANSACTIONS (Audit Trail)
-- ============================================================================

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to booking (optional)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Transaction Details
  type transaction_type NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'ILS',

  -- Parties
  from_entity transaction_entity NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_entity transaction_entity NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Stripe Reference
  stripe_event_id VARCHAR(255),
  stripe_transaction_id VARCHAR(255),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Details
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_amount CHECK (amount_cents > 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- ============================================================================
-- DISPUTES & CHARGEBACKS
-- ============================================================================

CREATE TABLE payment_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  booking_id UUID NOT NULL REFERENCES bookings(id),

  -- Dispute Details
  type VARCHAR(50), -- 'chargeback', 'complaint', 'refund_dispute'
  reason TEXT,

  -- Stripe Reference
  stripe_dispute_id VARCHAR(255),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'won', 'lost', 'warning_closed', 'evidence_submitted'

  -- Timeline
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deadline TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Resolution
  resolution_notes TEXT,

  metadata JSONB,

  CONSTRAINT valid_status CHECK (status IN ('open', 'won', 'lost', 'warning_closed', 'evidence_submitted'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Service Providers
-- Indexes already created in 20260625_booking_system_schema.sql

-- Bookings
-- Indexes already created in 20260625_booking_system_schema.sql

-- Commission Records
CREATE INDEX idx_commission_records_booking_id ON commission_records(booking_id);
CREATE INDEX idx_commission_records_service_provider_id ON commission_records(service_provider_id);
CREATE INDEX idx_commission_records_status ON commission_records(status);
CREATE INDEX idx_commission_records_payout_id ON commission_records(payout_id);
CREATE INDEX idx_commission_records_created_at ON commission_records(created_at DESC);

-- Invoices
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_invoices_recipient_id ON invoices(recipient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Payment Methods
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_stripe ON payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(user_id, is_default);

-- Refunds
CREATE INDEX idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX idx_refunds_commission_record_id ON refunds(commission_record_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);

-- Payment Transactions
CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_from_user_id ON payment_transactions(from_user_id);
CREATE INDEX idx_payment_transactions_to_user_id ON payment_transactions(to_user_id);
CREATE INDEX idx_payment_transactions_type ON payment_transactions(type);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Disputes
CREATE INDEX idx_payment_disputes_booking_id ON payment_disputes(booking_id);
CREATE INDEX idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX idx_payment_disputes_stripe_id ON payment_disputes(stripe_dispute_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- RLS already enabled on service_providers and bookings in 20260625_booking_system_schema.sql
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_providers and bookings are defined in 20260625_booking_system_schema.sql
-- This migration only adds RLS for payment-related tables

-- Commission Records
CREATE POLICY "Service providers can view their commissions"
  ON commission_records
  FOR SELECT
  USING (
    service_provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- Invoices
CREATE POLICY "Users can view their invoices"
  ON invoices
  FOR SELECT
  USING (recipient_id = auth.uid());

-- Payment Methods
CREATE POLICY "Users can view their payment methods"
  ON payment_methods
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their payment methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their payment methods"
  ON payment_methods
  FOR UPDATE
  USING (user_id = auth.uid());

-- Refunds
CREATE POLICY "Users can view related refunds"
  ON refunds
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE diver_id = auth.uid()
        OR service_provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Payment Transactions
CREATE POLICY "Users can view related transactions"
  ON payment_transactions
  FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR booking_id IN (
      SELECT id FROM bookings
      WHERE diver_id = auth.uid()
        OR service_provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Payment Disputes
CREATE POLICY "Users can view related disputes"
  ON payment_disputes
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE diver_id = auth.uid()
        OR service_provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp_payments()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for service_providers and bookings are defined in 20260625_booking_system_schema.sql

CREATE TRIGGER trigger_update_commission_records_timestamp
BEFORE UPDATE ON commission_records
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_payments();

CREATE TRIGGER trigger_update_invoices_timestamp
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_payments();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate commission amount
CREATE OR REPLACE FUNCTION calculate_commission(
  amount_cents BIGINT,
  commission_rate DECIMAL DEFAULT 0.08
)
RETURNS TABLE (
  gross_cents BIGINT,
  commission_cents BIGINT,
  net_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    amount_cents,
    ROUND(amount_cents * commission_rate)::BIGINT,
    (amount_cents - ROUND(amount_cents * commission_rate)::BIGINT)::BIGINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_commission(BIGINT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION update_timestamp_payments() TO authenticated;
