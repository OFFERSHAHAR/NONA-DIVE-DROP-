-- ============================================================================
-- EQUIPMENT RENTAL SYSTEM - SUPABASE MIGRATION
-- ============================================================================
-- This migration creates all tables for the Equipment Rental Marketplace

-- ============================================================================
-- EQUIPMENT LISTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Equipment Details
  equipment_type VARCHAR(50) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  description TEXT NOT NULL,

  -- Specifications
  size VARCHAR(50),
  condition VARCHAR(50) NOT NULL DEFAULT 'good',
  year_purchased INTEGER,

  -- Availability
  available_from TIMESTAMPTZ NOT NULL,
  available_until TIMESTAMPTZ,
  location JSONB NOT NULL, -- {lat, lng}
  location_name VARCHAR(200) NOT NULL,
  location_radius_km NUMERIC DEFAULT 50,

  -- Pricing
  rental_price_per_day INTEGER NOT NULL, -- in cents
  min_rental_days INTEGER,
  max_rental_days INTEGER,
  discount_per_week NUMERIC, -- percentage
  delivery_fee INTEGER, -- in cents

  -- Photos
  photo_urls TEXT[] NOT NULL,

  -- Status & Stats
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_rentals INTEGER NOT NULL DEFAULT 0,
  rating_average NUMERIC,
  review_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT equipment_type_valid CHECK (equipment_type IN (
    'fins', 'wetsuit', 'tank', 'weights', 'bcd', 'regulator',
    'mask', 'snorkel', 'dive_computer', 'torch', 'knife', 'camera',
    'clothing', 'other'
  )),
  CONSTRAINT condition_valid CHECK (condition IN (
    'excellent', 'very_good', 'good', 'fair', 'poor'
  ))
);

-- Indexes for listings
CREATE INDEX idx_equipment_listings_owner_id ON equipment_listings(owner_id);
CREATE INDEX idx_equipment_listings_equipment_type ON equipment_listings(equipment_type);
CREATE INDEX idx_equipment_listings_condition ON equipment_listings(condition);
CREATE INDEX idx_equipment_listings_is_active ON equipment_listings(is_active);
CREATE INDEX idx_equipment_listings_created_at ON equipment_listings(created_at DESC);
CREATE INDEX idx_equipment_listings_rating ON equipment_listings(rating_average DESC);

-- ============================================================================
-- EQUIPMENT RENTALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parties
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,

  -- Rental Period
  rental_start TIMESTAMPTZ NOT NULL,
  rental_end TIMESTAMPTZ NOT NULL,
  rental_days INTEGER NOT NULL,

  -- Pricing & Commission
  daily_rate INTEGER NOT NULL, -- in cents
  rental_cost INTEGER NOT NULL, -- in cents
  commission_amount INTEGER NOT NULL, -- in cents
  renter_total INTEGER NOT NULL, -- in cents
  lister_payout INTEGER NOT NULL, -- in cents

  -- Delivery
  delivery_method VARCHAR(50) NOT NULL DEFAULT 'pickup',
  delivery_cost INTEGER, -- in cents
  delivery_address VARCHAR(500),
  renter_contact VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  rejected_reason TEXT,

  -- Damage Assessment
  damage_assessment_required BOOLEAN NOT NULL DEFAULT false,
  damage_photos TEXT[],
  damage_level VARCHAR(50),
  damage_description TEXT,
  damage_cost INTEGER, -- in cents
  damage_covered_by_insurance BOOLEAN,

  -- Payment
  payment_request_id VARCHAR(255),
  transaction_id VARCHAR(255),
  paid_at TIMESTAMPTZ,
  refund_id VARCHAR(255),
  refunded_at TIMESTAMPTZ,

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  active_from TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT delivery_method_valid CHECK (delivery_method IN (
    'pickup', 'delivery', 'shipped'
  )),
  CONSTRAINT status_valid CHECK (status IN (
    'pending', 'approved', 'rejected', 'active', 'returned',
    'damage_pending', 'completed', 'cancelled'
  )),
  CONSTRAINT damage_level_valid CHECK (damage_level IS NULL OR damage_level IN (
    'none', 'minor', 'moderate', 'major', 'total_loss'
  ))
);

-- Indexes for rentals
CREATE INDEX idx_equipment_rentals_lister_id ON equipment_rentals(lister_id);
CREATE INDEX idx_equipment_rentals_renter_id ON equipment_rentals(renter_id);
CREATE INDEX idx_equipment_rentals_listing_id ON equipment_rentals(listing_id);
CREATE INDEX idx_equipment_rentals_status ON equipment_rentals(status);
CREATE INDEX idx_equipment_rentals_payment_request_id ON equipment_rentals(payment_request_id);
CREATE INDEX idx_equipment_rentals_transaction_id ON equipment_rentals(transaction_id);
CREATE INDEX idx_equipment_rentals_created_at ON equipment_rentals(created_at DESC);
CREATE INDEX idx_equipment_rentals_rental_start ON equipment_rentals(rental_start);

-- ============================================================================
-- EQUIPMENT REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
  rental_id UUID NOT NULL REFERENCES equipment_rentals(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ratings
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  condition_rating SMALLINT CHECK (condition_rating >= 1 AND condition_rating <= 5),
  communication_rating SMALLINT CHECK (communication_rating >= 1 AND communication_rating <= 5),

  -- Content
  comment TEXT,
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reviews
CREATE INDEX idx_equipment_reviews_listing_id ON equipment_reviews(listing_id);
CREATE INDEX idx_equipment_reviews_rental_id ON equipment_reviews(rental_id);
CREATE INDEX idx_equipment_reviews_reviewer_id ON equipment_reviews(reviewer_id);
CREATE INDEX idx_equipment_reviews_created_at ON equipment_reviews(created_at DESC);

-- ============================================================================
-- EQUIPMENT MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES equipment_rentals(id) ON DELETE CASCADE,

  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('lister', 'renter')),

  message_type VARCHAR(50) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  image_url VARCHAR(500),

  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT message_type_valid CHECK (message_type IN (
    'text', 'image', 'status_update'
  ))
);

-- Indexes for messages
CREATE INDEX idx_equipment_messages_rental_id ON equipment_messages(rental_id);
CREATE INDEX idx_equipment_messages_sender_id ON equipment_messages(sender_id);
CREATE INDEX idx_equipment_messages_created_at ON equipment_messages(created_at DESC);

-- ============================================================================
-- EQUIPMENT DISPUTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES equipment_rentals(id) ON DELETE CASCADE,

  initiated_by VARCHAR(50) NOT NULL CHECK (initiated_by IN ('lister', 'renter')),
  dispute_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,

  evidence TEXT[],

  status VARCHAR(50) NOT NULL DEFAULT 'open',
  resolution TEXT,

  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dispute_type_valid CHECK (dispute_type IN (
    'damage', 'non_return', 'other'
  )),
  CONSTRAINT status_valid CHECK (status IN (
    'open', 'in_review', 'resolved', 'cancelled'
  ))
);

-- Indexes for disputes
CREATE INDEX idx_equipment_disputes_rental_id ON equipment_disputes(rental_id);
CREATE INDEX idx_equipment_disputes_status ON equipment_disputes(status);

-- ============================================================================
-- EQUIPMENT INSURANCE CLAIMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_insurance_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES equipment_rentals(id) ON DELETE CASCADE,

  claim_type VARCHAR(50) NOT NULL,
  claim_status VARCHAR(50) NOT NULL DEFAULT 'pending',

  damage_description TEXT NOT NULL,
  damage_photos TEXT[] NOT NULL,
  damage_cost_estimate INTEGER NOT NULL, -- in cents

  claim_amount INTEGER NOT NULL,
  approved_amount INTEGER,

  insurance_provider VARCHAR(200),
  claim_reference VARCHAR(100),

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT claim_type_valid CHECK (claim_type IN (
    'damage', 'loss', 'theft'
  )),
  CONSTRAINT status_valid CHECK (claim_status IN (
    'pending', 'approved', 'rejected', 'paid'
  ))
);

-- Indexes for insurance claims
CREATE INDEX idx_equipment_insurance_claims_rental_id ON equipment_insurance_claims(rental_id);
CREATE INDEX idx_equipment_insurance_claims_status ON equipment_insurance_claims(claim_status);

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE equipment_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_rentals;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_disputes;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE equipment_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_insurance_claims ENABLE ROW LEVEL SECURITY;

-- Equipment Listings RLS
CREATE POLICY "Anyone can view active listings" ON equipment_listings
  FOR SELECT USING (is_active = true OR owner_id = auth.uid());

CREATE POLICY "Owners can manage their listings" ON equipment_listings
  FOR ALL USING (owner_id = auth.uid());

-- Equipment Rentals RLS
CREATE POLICY "Users can view their own rentals" ON equipment_rentals
  FOR SELECT USING (
    renter_id = auth.uid() OR lister_id = auth.uid()
  );

CREATE POLICY "Renters can create rental requests" ON equipment_rentals
  FOR INSERT WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Users can update their rental records" ON equipment_rentals
  FOR UPDATE USING (
    renter_id = auth.uid() OR lister_id = auth.uid()
  );

-- Equipment Reviews RLS
CREATE POLICY "Anyone can view reviews" ON equipment_reviews
  FOR SELECT USING (true);

CREATE POLICY "Renters can create reviews" ON equipment_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Equipment Messages RLS
CREATE POLICY "Users can view messages for their rentals" ON equipment_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR
    rental_id IN (
      SELECT id FROM equipment_rentals WHERE
        renter_id = auth.uid() OR lister_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages on their rentals" ON equipment_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    rental_id IN (
      SELECT id FROM equipment_rentals WHERE
        renter_id = auth.uid() OR lister_id = auth.uid()
    )
  );

-- Equipment Disputes RLS
CREATE POLICY "Users can view disputes for their rentals" ON equipment_disputes
  FOR SELECT USING (
    rental_id IN (
      SELECT id FROM equipment_rentals WHERE
        renter_id = auth.uid() OR lister_id = auth.uid()
    )
  );

-- Insurance Claims RLS
CREATE POLICY "Users can view claims for their rentals" ON equipment_insurance_claims
  FOR SELECT USING (
    rental_id IN (
      SELECT id FROM equipment_rentals WHERE
        renter_id = auth.uid() OR lister_id = auth.uid()
    )
  );

CREATE POLICY "Renters can create insurance claims" ON equipment_insurance_claims
  FOR INSERT WITH CHECK (
    rental_id IN (
      SELECT id FROM equipment_rentals WHERE renter_id = auth.uid()
    )
  );
