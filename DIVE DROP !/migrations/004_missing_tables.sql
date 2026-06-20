-- ============================================================================
-- MIGRATION: Missing Core Tables
-- ============================================================================
-- This migration creates missing tables referenced in API code:
-- - feedback (dive conditions reports)
-- - rental_damage_assessments (equipment damage claims)
-- - lister_account_balance (payment tracking for listers)
-- - rental_commissions (commission tracking)

-- ============================================================================
-- FEEDBACK TABLE (Dive Condition Reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  diver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  dive_booking_id UUID REFERENCES dive_bookings(id) ON DELETE SET NULL,

  -- Dive Conditions
  visibility_meters DECIMAL(3, 1) NOT NULL CHECK (visibility_meters >= 0 AND visibility_meters <= 50),
  temperature_celsius DECIMAL(3, 1) NOT NULL CHECK (temperature_celsius >= 5 AND temperature_celsius <= 40),
  current_strength DECIMAL(3, 1) NOT NULL CHECK (current_strength >= 0 AND current_strength <= 10),

  -- Marine Life
  marine_life TEXT[] DEFAULT ARRAY[]::TEXT[],
  marine_life_custom VARCHAR(200),

  -- Notes and Images
  notes VARCHAR(300),
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  ip_address VARCHAR(45),
  user_agent VARCHAR(500)
);

CREATE INDEX idx_feedback_diver_id ON feedback(diver_id);
CREATE INDEX idx_feedback_dive_site_id ON feedback(dive_site_id);
CREATE INDEX idx_feedback_dive_booking_id ON feedback(dive_booking_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_submitted_at ON feedback(submitted_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Divers can view all feedback, only their own editable
CREATE POLICY "feedback_select_all"
  ON feedback FOR SELECT
  USING (TRUE);

CREATE POLICY "feedback_insert_own"
  ON feedback FOR INSERT
  WITH CHECK (diver_id = auth.uid());

CREATE POLICY "feedback_update_own"
  ON feedback FOR UPDATE
  USING (diver_id = auth.uid())
  WITH CHECK (diver_id = auth.uid());

CREATE POLICY "feedback_delete_own"
  ON feedback FOR DELETE
  USING (diver_id = auth.uid());

-- Admin can see all and manage
CREATE POLICY "admin_feedback_all"
  ON feedback FOR ALL
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- ============================================================================
-- EQUIPMENT RENTALS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rental Details
  rental_start_date DATE NOT NULL,
  rental_end_date DATE NOT NULL,
  pickup_location VARCHAR(500),
  dropoff_location VARCHAR(500),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'confirmed',
    'active',
    'returned',
    'cancelled',
    'disputed'
  )),

  -- Pricing
  daily_rate_cents INTEGER NOT NULL,
  rental_days INTEGER NOT NULL,
  total_cost_cents INTEGER NOT NULL,
  commission_rate DECIMAL(4, 3) DEFAULT 0.15,

  -- Damage and Returns
  damage_reported BOOLEAN DEFAULT FALSE,
  return_condition_notes TEXT,
  returned_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (rental_start_date < rental_end_date)
);

CREATE INDEX idx_equipment_rentals_lister_id ON equipment_rentals(lister_id);
CREATE INDEX idx_equipment_rentals_renter_id ON equipment_rentals(renter_id);
CREATE INDEX idx_equipment_rentals_equipment_id ON equipment_rentals(equipment_id);
CREATE INDEX idx_equipment_rentals_status ON equipment_rentals(status);
CREATE INDEX idx_equipment_rentals_created_at ON equipment_rentals(created_at DESC);

-- ============================================================================
-- RENTAL DAMAGE ASSESSMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rental_damage_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES equipment_rentals(id) ON DELETE CASCADE,

  -- People Involved
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessed_by_lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Damage Details
  damage_description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'total_loss')),
  repair_cost_cents INTEGER NOT NULL,
  replacement_cost_cents INTEGER,
  charge_cents INTEGER NOT NULL,

  -- Evidence
  photo_evidence JSONB,
  notes VARCHAR(500),

  -- Status and Timeline
  status VARCHAR(50) NOT NULL DEFAULT 'assessed' CHECK (status IN (
    'assessed',
    'disputed',
    'resolved',
    'charged'
  )),
  charge_issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  charge_due_date DATE,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rental_damage_assessments_rental_id ON rental_damage_assessments(rental_id);
CREATE INDEX idx_rental_damage_assessments_lister_id ON rental_damage_assessments(lister_id);
CREATE INDEX idx_rental_damage_assessments_renter_id ON rental_damage_assessments(renter_id);
CREATE INDEX idx_rental_damage_assessments_status ON rental_damage_assessments(status);
CREATE INDEX idx_rental_damage_assessments_created_at ON rental_damage_assessments(created_at DESC);

ALTER TABLE rental_damage_assessments ENABLE ROW LEVEL SECURITY;

-- Listers and renters can view their own damage assessments
CREATE POLICY "damage_view_own"
  ON rental_damage_assessments FOR SELECT
  USING (
    lister_id = auth.uid() OR renter_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Listers can create damage assessments
CREATE POLICY "damage_insert_lister"
  ON rental_damage_assessments FOR INSERT
  WITH CHECK (assessed_by_lister_id = auth.uid() AND lister_id = auth.uid());

-- ============================================================================
-- RENTAL COMMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rental_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL UNIQUE REFERENCES equipment_rentals(id) ON DELETE CASCADE,

  -- People Involved
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Commission Breakdown
  rental_amount_cents INTEGER NOT NULL,
  commission_rate DECIMAL(4, 3) NOT NULL DEFAULT 0.15,
  commission_cents INTEGER NOT NULL,
  damage_commission_cents INTEGER DEFAULT 0,
  total_commission_cents INTEGER NOT NULL,

  -- Net Payout to Lister
  net_payout_cents INTEGER NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'held',
    'paid',
    'disputed'
  )),

  paid_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rental_commissions_lister_id ON rental_commissions(lister_id);
CREATE INDEX idx_rental_commissions_renter_id ON rental_commissions(renter_id);
CREATE INDEX idx_rental_commissions_status ON rental_commissions(status);
CREATE INDEX idx_rental_commissions_rental_id ON rental_commissions(rental_id);

-- ============================================================================
-- LISTER ACCOUNT BALANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lister_account_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lister_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Balance Tracking
  balance_owed_cents INTEGER DEFAULT 0,
  unpaid_damage_charges_cents INTEGER DEFAULT 0,
  total_earned_cents INTEGER DEFAULT 0,
  total_paid_out_cents INTEGER DEFAULT 0,

  -- Payout Details
  stripe_account_id VARCHAR(255),
  is_stripe_connected BOOLEAN DEFAULT FALSE,
  payout_method VARCHAR(50) CHECK (payout_method IN ('stripe', 'bank_transfer', 'paypal')),

  -- Status
  account_status VARCHAR(50) DEFAULT 'active' CHECK (account_status IN (
    'active',
    'suspended',
    'restricted'
  )),

  last_payout_date TIMESTAMP WITH TIME ZONE,
  last_verified_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lister_account_balance_lister_id ON lister_account_balance(lister_id);
CREATE INDEX idx_lister_account_balance_stripe_account_id ON lister_account_balance(stripe_account_id);

ALTER TABLE lister_account_balance ENABLE ROW LEVEL SECURITY;

-- Listers can view their own balance
CREATE POLICY "balance_view_own"
  ON lister_account_balance FOR SELECT
  USING (lister_id = auth.uid() OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Only system can update balances (via RLS-bypassing function)
CREATE POLICY "balance_admin_update"
  ON lister_account_balance FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- ============================================================================
-- FUNCTION: Update Lister Balance on Commission
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lister_balance_on_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert lister account balance
  INSERT INTO lister_account_balance (lister_id, total_earned_cents, balance_owed_cents)
  VALUES (NEW.lister_id, NEW.net_payout_cents, NEW.net_payout_cents)
  ON CONFLICT (lister_id) DO UPDATE SET
    balance_owed_cents = lister_account_balance.balance_owed_cents + NEW.net_payout_cents,
    total_earned_cents = lister_account_balance.total_earned_cents + NEW.rental_amount_cents,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_balance_after_commission
  AFTER INSERT ON rental_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_lister_balance_on_commission();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_rentals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rental_damage_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rental_commissions TO authenticated;
GRANT SELECT, UPDATE ON lister_account_balance TO authenticated;

-- Admin role needs full access
GRANT ALL ON feedback TO authenticated;
GRANT ALL ON equipment_rentals TO authenticated;
GRANT ALL ON rental_damage_assessments TO authenticated;
GRANT ALL ON rental_commissions TO authenticated;
GRANT ALL ON lister_account_balance TO authenticated;
