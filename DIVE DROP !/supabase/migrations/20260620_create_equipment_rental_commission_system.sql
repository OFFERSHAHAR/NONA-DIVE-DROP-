-- ============================================================================
-- EQUIPMENT RENTAL & COMMISSION PAYMENT SYSTEM
-- ============================================================================
-- Complete schema for equipment rental with commission tracking and payment management
-- Rental Flow:
--   1. Renter books equipment from Lister
--   2. Renter pays via Bit (full rental cost)
--   3. System calculates commission from lister's revenue
--   4. DIVE DROP invoices lister for commission
--   5. Lister's account shows commission owed

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE rental_status AS ENUM (
  'pending',           -- Awaiting payment
  'confirmed',         -- Payment received, awaiting pickup
  'active',            -- Equipment is rented out
  'returned',          -- Equipment returned
  'cancelled',         -- Rental cancelled
  'dispute'            -- Dispute raised
);

CREATE TYPE damage_status AS ENUM (
  'pending',           -- Assessment pending
  'assessed',          -- Damage assessed
  'charged',           -- Charge issued to renter
  'paid',              -- Damage charge paid
  'disputed'           -- Charge disputed
);

CREATE TYPE commission_status AS ENUM (
  'pending',           -- Commission calculated, awaiting collection
  'invoiced',          -- Invoice sent to lister
  'paid',              -- Lister paid commission to DIVE DROP
  'disputed'           -- Payment disputed
);

CREATE TYPE invoice_status AS ENUM (
  'draft',             -- Invoice created but not sent
  'sent',              -- Invoice sent to lister
  'viewed',            -- Lister has viewed invoice
  'paid',              -- Payment received
  'partial',           -- Partial payment received
  'overdue'            -- Payment overdue
);

-- ============================================================================
-- EQUIPMENT CATALOG TABLE
-- ============================================================================
-- Diving equipment available for rental

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Equipment info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL CHECK (category IN (
    'wetsuit', 'bcd', 'regulator', 'tank', 'fins',
    'mask', 'snorkel', 'light', 'computer', 'camera',
    'other'
  )),

  -- Specifications
  size_or_model VARCHAR(100),
  brand VARCHAR(100),
  condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5),

  -- Rental pricing (in cents)
  daily_price_cents INTEGER NOT NULL CHECK (daily_price_cents > 0),

  -- Status
  available_for_rental BOOLEAN DEFAULT TRUE,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_equipment_category ON equipment(category);
CREATE INDEX idx_equipment_available ON equipment(available_for_rental);

-- ============================================================================
-- EQUIPMENT LISTINGS TABLE
-- ============================================================================
-- When a lister offers their equipment for rent

CREATE TABLE IF NOT EXISTS equipment_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lister (service provider)
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Equipment
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,

  -- Lister's custom rental price (in cents, overrides equipment default)
  daily_price_cents INTEGER NOT NULL CHECK (daily_price_cents > 0),

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  available_quantity INTEGER DEFAULT 1,
  reserved_quantity INTEGER DEFAULT 0,

  -- Commission rate for this listing (in decimal: 0.10 = 10%)
  commission_rate NUMERIC(5, 4) DEFAULT 0.10 CHECK (commission_rate >= 0.01 AND commission_rate <= 0.50),

  -- Cancellation policy
  cancellation_policy VARCHAR(100) DEFAULT 'flexible' CHECK (cancellation_policy IN (
    'flexible',          -- Free cancellation
    'moderate',          -- Non-refundable after 24 hours
    'strict'             -- Non-refundable after 7 days
  )),

  -- Deposit requirement (in cents)
  deposit_required_cents INTEGER DEFAULT 0,

  -- Damage insurance available
  insurance_available BOOLEAN DEFAULT TRUE,
  insurance_price_cents INTEGER,

  -- Description & terms
  description TEXT,
  rental_terms TEXT,

  -- Ratings & stats
  rating_average DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  rental_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}',

  UNIQUE(lister_id, equipment_id)
);

CREATE INDEX idx_equipment_listings_lister ON equipment_listings(lister_id);
CREATE INDEX idx_equipment_listings_equipment ON equipment_listings(equipment_id);
CREATE INDEX idx_equipment_listings_available ON equipment_listings(is_available);
CREATE INDEX idx_equipment_listings_rating ON equipment_listings(rating_average DESC);

-- ============================================================================
-- EQUIPMENT RENTALS TABLE
-- ============================================================================
-- Individual rental bookings

CREATE TABLE IF NOT EXISTS equipment_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parties involved
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,

  -- Rental period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rental_days INTEGER NOT NULL,

  -- Pricing (all in cents)
  daily_price_cents INTEGER NOT NULL,
  subtotal_cents INTEGER NOT NULL, -- rental_days * daily_price_cents
  deposit_cents INTEGER DEFAULT 0,
  insurance_cents INTEGER DEFAULT 0,

  -- Total amounts
  rental_cost_cents INTEGER NOT NULL, -- Subtotal + insurance
  total_cost_cents INTEGER NOT NULL, -- rental_cost + deposit

  -- Commission (calculated on rental_cost)
  commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.10,
  commission_cents INTEGER, -- Calculated when paid

  -- Payment info
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  bit_transaction_id VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Rental status
  status rental_status DEFAULT 'pending',

  -- Equipment condition checks
  condition_on_pickup_rating INTEGER CHECK (condition_on_pickup_rating IS NULL OR
    (condition_on_pickup_rating >= 1 AND condition_on_pickup_rating <= 5)),
  condition_on_return_rating INTEGER CHECK (condition_on_return_rating IS NULL OR
    (condition_on_return_rating >= 1 AND condition_on_return_rating <= 5)),

  -- Pickup & return
  picked_up_at TIMESTAMP WITH TIME ZONE,
  returned_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,
  renter_notes TEXT,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}',

  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_rental_days CHECK (rental_days > 0),
  CONSTRAINT valid_costs CHECK (rental_cost_cents > 0 AND subtotal_cents > 0)
);

CREATE INDEX idx_equipment_rentals_renter ON equipment_rentals(renter_id);
CREATE INDEX idx_equipment_rentals_lister ON equipment_rentals(lister_id);
CREATE INDEX idx_equipment_rentals_listing ON equipment_rentals(listing_id);
CREATE INDEX idx_equipment_rentals_status ON equipment_rentals(status);
CREATE INDEX idx_equipment_rentals_dates ON equipment_rentals(start_date, end_date);
CREATE INDEX idx_equipment_rentals_created ON equipment_rentals(created_at DESC);

-- ============================================================================
-- RENTAL COMMISSIONS TABLE
-- ============================================================================
-- Track commission earned by DIVE DROP from equipment rentals

CREATE TABLE IF NOT EXISTS rental_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Rental reference
  rental_id UUID NOT NULL UNIQUE REFERENCES equipment_rentals(id) ON DELETE CASCADE,

  -- Parties
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Amounts (in cents)
  rental_cost_cents INTEGER NOT NULL CHECK (rental_cost_cents > 0),
  commission_rate NUMERIC(5, 4) NOT NULL,
  commission_cents INTEGER NOT NULL CHECK (commission_cents > 0),

  -- Status
  status commission_status DEFAULT 'pending',

  -- Invoice info
  invoice_id UUID,
  invoice_generated_at TIMESTAMP WITH TIME ZONE,

  -- Payment tracking
  payment_received_at TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50), -- 'bit', 'bank_transfer', etc.
  payment_reference VARCHAR(100),

  -- Damage-related commissions
  damage_commission_cents INTEGER DEFAULT 0,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_rental_commissions_rental ON rental_commissions(rental_id);
CREATE INDEX idx_rental_commissions_lister ON rental_commissions(lister_id);
CREATE INDEX idx_rental_commissions_status ON rental_commissions(status);
CREATE INDEX idx_rental_commissions_created ON rental_commissions(created_at DESC);

-- ============================================================================
-- EQUIPMENT DAMAGE ASSESSMENTS TABLE
-- ============================================================================
-- Track damage to rented equipment

CREATE TABLE IF NOT EXISTS rental_damage_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Rental reference
  rental_id UUID NOT NULL REFERENCES equipment_rentals(id) ON DELETE CASCADE,

  -- Parties
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Damage details
  damage_description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN (
    'minor',      -- Cosmetic, no repair needed
    'moderate',   -- Needs repair but still functional
    'severe',     -- Non-functional, needs replacement
    'total_loss'  -- Equipment destroyed
  )),

  -- Repair/replacement cost (in cents)
  repair_cost_cents INTEGER NOT NULL CHECK (repair_cost_cents > 0),
  replacement_cost_cents INTEGER,

  -- Actual charge (lister decides)
  charge_cents INTEGER,

  -- Who assessed the damage
  assessed_by_lister_id UUID REFERENCES auth.users(id),

  -- Status
  status damage_status DEFAULT 'pending',

  -- Charge info
  charge_issued_at TIMESTAMP WITH TIME ZONE,
  charge_due_date DATE,

  -- Evidence
  photo_evidence JSONB, -- Array of photo URLs
  notes TEXT,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_rental_damage_rental ON rental_damage_assessments(rental_id);
CREATE INDEX idx_rental_damage_lister ON rental_damage_assessments(lister_id);
CREATE INDEX idx_rental_damage_renter ON rental_damage_assessments(renter_id);
CREATE INDEX idx_rental_damage_status ON rental_damage_assessments(status);

-- ============================================================================
-- RENTAL INVOICES TABLE
-- ============================================================================
-- Monthly invoices sent to listers for commission payment

CREATE TABLE IF NOT EXISTS rental_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lister being invoiced
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Invoice period
  invoice_month DATE NOT NULL, -- First day of the month
  invoice_number VARCHAR(50) NOT NULL UNIQUE, -- INV-202406-001

  -- Summary amounts (in cents)
  total_rental_cost_cents INTEGER DEFAULT 0,
  total_commission_cents INTEGER DEFAULT 0,
  total_damage_charges_cents INTEGER DEFAULT 0,

  -- Breakdown
  rental_count INTEGER DEFAULT 0,
  commission_count INTEGER DEFAULT 0,
  damage_count INTEGER DEFAULT 0,

  -- Payment terms
  due_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'bit', -- How lister should pay

  -- Status
  status invoice_status DEFAULT 'draft',

  -- Timeline
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  payment_received_at TIMESTAMP WITH TIME ZONE,
  payment_amount_cents INTEGER,

  -- Notes
  notes TEXT,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_rental_invoices_lister ON rental_invoices(lister_id);
CREATE INDEX idx_rental_invoices_month ON rental_invoices(invoice_month);
CREATE INDEX idx_rental_invoices_status ON rental_invoices(status);
CREATE UNIQUE INDEX idx_rental_invoices_lister_month ON rental_invoices(lister_id, invoice_month);

-- ============================================================================
-- INVOICE LINE ITEMS TABLE
-- ============================================================================
-- Detailed breakdown of what's in each invoice

CREATE TABLE IF NOT EXISTS rental_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Invoice reference
  invoice_id UUID NOT NULL REFERENCES rental_invoices(id) ON DELETE CASCADE,

  -- Commission reference
  commission_id UUID REFERENCES rental_commissions(id),
  damage_id UUID REFERENCES rental_damage_assessments(id),

  -- Rental details (for reference)
  rental_id UUID REFERENCES equipment_rentals(id),

  -- Item description
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN (
    'rental_commission',
    'damage_charge',
    'adjustment'
  )),

  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  amount_cents INTEGER NOT NULL,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_invoice_line_items_invoice ON rental_invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_type ON rental_invoice_line_items(item_type);

-- ============================================================================
-- REVENUE ANALYTICS TABLE (Materialized View Helper)
-- ============================================================================
-- Pre-calculated analytics for dashboard performance

CREATE TABLE IF NOT EXISTS rental_analytics_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Period
  snapshot_date DATE NOT NULL UNIQUE,

  -- Totals (in cents)
  total_rental_revenue_cents INTEGER DEFAULT 0,
  total_commission_cents INTEGER DEFAULT 0,
  total_damage_charges_cents INTEGER DEFAULT 0,

  -- Counts
  active_rentals INTEGER DEFAULT 0,
  completed_rentals INTEGER DEFAULT 0,
  damaged_rentals INTEGER DEFAULT 0,

  -- Top performers
  top_equipment_json JSONB, -- {id, name, rental_count, revenue}
  top_listers_json JSONB,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_analytics_snapshot_date ON rental_analytics_snapshot(snapshot_date DESC);

-- ============================================================================
-- LISTER ACCOUNT STATUS TABLE
-- ============================================================================
-- Track what listers owe DIVE DROP

CREATE TABLE IF NOT EXISTS lister_account_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lister
  lister_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current balance owed (in cents)
  balance_owed_cents INTEGER DEFAULT 0,

  -- Breakdown
  unpaid_commissions_cents INTEGER DEFAULT 0,
  unpaid_damage_charges_cents INTEGER DEFAULT 0,
  paid_to_date_cents INTEGER DEFAULT 0,

  -- Total lifetime
  lifetime_rental_volume_cents INTEGER DEFAULT 0,
  lifetime_commission_paid_cents INTEGER DEFAULT 0,

  -- Last payment info
  last_payment_at TIMESTAMP WITH TIME ZONE,
  last_payment_amount_cents INTEGER,

  -- Status
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,

  -- Tracking
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_lister_account_balance_owed ON lister_account_balance(balance_owed_cents DESC);
CREATE INDEX idx_lister_account_balance_suspended ON lister_account_balance(is_suspended);

-- ============================================================================
-- COMMISSION PAYMENT REQUESTS TABLE
-- ============================================================================
-- Track when DIVE DROP requests payment from listers via Bit

CREATE TABLE IF NOT EXISTS rental_commission_payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Invoice & Lister
  invoice_id UUID NOT NULL REFERENCES rental_invoices(id) ON DELETE CASCADE,
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Bit payment info
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  bit_request_id VARCHAR(100) UNIQUE,
  payment_link TEXT,
  short_url TEXT,
  qr_code TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'initiated', 'completed', 'failed', 'expired', 'cancelled'
  )),

  -- Payment details
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  request_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_rental_payment_requests_invoice ON rental_commission_payment_requests(invoice_id);
CREATE INDEX idx_rental_payment_requests_lister ON rental_commission_payment_requests(lister_id);
CREATE INDEX idx_rental_payment_requests_status ON rental_commission_payment_requests(status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_damage_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lister_account_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_commission_payment_requests ENABLE ROW LEVEL SECURITY;

-- Equipment is public (read-only)
CREATE POLICY "Anyone can view equipment" ON equipment FOR SELECT USING (TRUE);

-- Equipment listings are public
CREATE POLICY "Anyone can view active listings" ON equipment_listings FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Listers can view own listings" ON equipment_listings FOR SELECT
  USING (lister_id = auth.uid());

CREATE POLICY "Listers can manage own listings" ON equipment_listings FOR UPDATE
  USING (lister_id = auth.uid());

-- Renters can view their rentals
CREATE POLICY "Renters can view own rentals" ON equipment_rentals FOR SELECT
  USING (renter_id = auth.uid() OR lister_id = auth.uid());

-- Commissions visible to lister and admin
CREATE POLICY "Listers can view own commissions" ON rental_commissions FOR SELECT
  USING (lister_id = auth.uid());

-- Damage assessments
CREATE POLICY "Parties can view damage assessments" ON rental_damage_assessments FOR SELECT
  USING (lister_id = auth.uid() OR renter_id = auth.uid());

-- Invoices
CREATE POLICY "Listers can view own invoices" ON rental_invoices FOR SELECT
  USING (lister_id = auth.uid());

-- Account balance
CREATE POLICY "Listers can view own balance" ON lister_account_balance FOR SELECT
  USING (lister_id = auth.uid());

-- Payment requests
CREATE POLICY "Listers can view own payment requests" ON rental_commission_payment_requests FOR SELECT
  USING (lister_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate commission amount
CREATE OR REPLACE FUNCTION calculate_rental_commission(
  rental_cost_cents INTEGER,
  commission_rate NUMERIC
)
RETURNS INTEGER AS $$
BEGIN
  RETURN CAST(ROUND(rental_cost_cents * commission_rate) AS INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update lister account balance when commission is paid
CREATE OR REPLACE FUNCTION update_lister_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE lister_account_balance
    SET
      balance_owed_cents = balance_owed_cents - NEW.commission_cents,
      paid_to_date_cents = paid_to_date_cents + NEW.commission_cents,
      last_payment_at = NOW()
    WHERE lister_id = NEW.lister_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lister_balance
  AFTER UPDATE ON rental_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_lister_balance();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_equipment_rental_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_equipment_rental_timestamp
  BEFORE UPDATE ON equipment_rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_rental_timestamp();

CREATE TRIGGER trigger_rental_commission_timestamp
  BEFORE UPDATE ON rental_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_rental_timestamp();

-- ============================================================================
-- INITIAL DATA (Configuration)
-- ============================================================================

-- Set default commission rate (10%)
INSERT INTO equipment_listings (lister_id, equipment_id, daily_price_cents, commission_rate)
SELECT DISTINCT lister_id, id, 5000, 0.10 FROM equipment_listings
ON CONFLICT DO NOTHING;

-- Create default lister account balance entries
INSERT INTO lister_account_balance (lister_id)
SELECT DISTINCT lister_id FROM equipment_listings
ON CONFLICT (lister_id) DO NOTHING;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON equipment TO authenticated;
GRANT SELECT ON equipment_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON equipment_rentals TO authenticated;
GRANT SELECT ON rental_commissions TO authenticated;
GRANT SELECT ON rental_damage_assessments TO authenticated;
GRANT SELECT ON rental_invoices TO authenticated;
GRANT SELECT ON rental_analytics_snapshot TO authenticated;
GRANT SELECT ON lister_account_balance TO authenticated;
