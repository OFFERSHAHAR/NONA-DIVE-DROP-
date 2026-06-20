-- ============================================================================
-- DIVE DROP Booking System - Database Schema
-- Complete schema for marketplace booking system
-- Created: 2026-06-25
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Booking status enum
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
  'no_show',
  'reviewed'
);

-- Service type enum
CREATE TYPE service_type AS ENUM (
  'recreational',
  'technical',
  'rescue',
  'photography'
);

-- Difficulty level enum
CREATE TYPE difficulty_level AS ENUM (
  'beginner',
  'intermediate',
  'advanced',
  'instructor'
);

-- Guide type enum
CREATE TYPE guide_type AS ENUM (
  'group',
  'private'
);

-- Payment status enum
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded'
);

-- Payout status enum
CREATE TYPE payout_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Business type enum
CREATE TYPE business_type AS ENUM (
  'dive_center',
  'instructor',
  'boat_operator',
  'rental_shop'
);

-- Service category enum
CREATE TYPE service_category AS ENUM (
  'guide',
  'equipment',
  'boat',
  'transportation',
  'certification',
  'specialty'
);

-- Payment method enum
CREATE TYPE payment_method AS ENUM (
  'stripe',
  'paypal',
  'bank_transfer',
  'credit_card'
);

-- ============================================================================
-- SERVICE PROVIDER TABLES
-- ============================================================================

-- Service providers (dive centers, instructors, boat operators)
-- NOTE: If service_providers already exists from 20260620_create_service_provider_directory.sql,
-- we need to either drop it or merge the schemas. For now, using CREATE TABLE IF NOT EXISTS
-- and the existing table from 20260620 will be used.
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  business_name VARCHAR(255) NOT NULL UNIQUE,
  business_type business_type NOT NULL,
  description TEXT,

  -- Location & Service Area
  primary_location GEOGRAPHY(POINT, 4326) NOT NULL,
  service_radius_km INTEGER DEFAULT 50,
  cities_served TEXT[],

  -- Contact
  phone VARCHAR(20),
  website_url VARCHAR(255),
  social_media JSONB,

  -- Verification & Credentials
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,

  certifications TEXT[],
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(255),

  -- Ratings & Stats
  rating_average DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  response_time_hours DECIMAL(4,1),

  -- Business Settings
  commission_percentage DECIMAL(4,2) DEFAULT 15.00,
  bank_account_verified BOOLEAN DEFAULT FALSE,
  payout_frequency VARCHAR(20) DEFAULT 'weekly',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for service_providers
CREATE INDEX idx_service_providers_user ON service_providers(user_id);
CREATE INDEX idx_service_providers_type ON service_providers(business_type);
CREATE INDEX idx_service_providers_rating ON service_providers(rating_average DESC);
CREATE INDEX idx_service_providers_active ON service_providers(is_active);
CREATE INDEX idx_service_providers_location ON service_providers USING GIST(primary_location);

-- Service offerings from providers
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  service_name VARCHAR(255) NOT NULL,
  service_category service_category NOT NULL,
  description TEXT,

  -- Duration & Availability
  min_duration_minutes INTEGER DEFAULT 60,
  max_duration_minutes INTEGER DEFAULT 240,

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  price_per_extra_diver DECIMAL(10,2),

  -- Requirements
  min_certification_level difficulty_level,
  max_group_size INTEGER,

  -- Details
  equipment_provided BOOLEAN DEFAULT TRUE,
  includes_guide BOOLEAN DEFAULT TRUE,
  includes_photography BOOLEAN DEFAULT FALSE,
  special_features TEXT[],

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(service_category);
CREATE INDEX idx_services_active ON services(is_active);

-- Provider availability calendar
CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  availability_date DATE NOT NULL,

  -- Time slots (30-min granularity)
  available_slots JSONB NOT NULL,

  -- Overrides
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,

  -- Capacity
  max_daily_bookings INTEGER,
  current_bookings INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_availability_provider_date ON provider_availability(provider_id, availability_date);

-- ============================================================================
-- BOOKING TABLES
-- ============================================================================

-- Main booking record
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Party Information
  diver_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diver_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Booking Details
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 30 AND duration_minutes <= 480),
  max_depth DECIMAL(4,1),
  difficulty_level difficulty_level NOT NULL,
  group_size INTEGER DEFAULT 2,
  special_requests TEXT,

  -- Service Details
  service_type service_type NOT NULL,
  equipment_provided BOOLEAN DEFAULT TRUE,
  guide_type guide_type DEFAULT 'group',

  -- Status & Timestamps
  status booking_status NOT NULL DEFAULT 'pending',
  provider_response VARCHAR(20),
  provider_response_at TIMESTAMP,
  decline_reason TEXT,

  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,

  -- Pricing
  service_price DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(4,2) DEFAULT 15.00,

  -- Review Status
  diver_1_reviewed BOOLEAN DEFAULT FALSE,
  diver_2_reviewed BOOLEAN DEFAULT FALSE,
  provider_reviewed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for bookings
CREATE INDEX idx_bookings_diver_1 ON bookings(diver_1_id);
CREATE INDEX idx_bookings_diver_2 ON bookings(diver_2_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- Services included in booking
CREATE TABLE booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  service_id UUID NOT NULL REFERENCES services(id),
  service_name VARCHAR(255) NOT NULL,
  service_category service_category NOT NULL,

  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);

-- Communication thread
CREATE TABLE booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_type VARCHAR(20) NOT NULL,

  message_type VARCHAR(20) DEFAULT 'text',
  content TEXT NOT NULL,

  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_messages_booking ON booking_messages(booking_id);
CREATE INDEX idx_booking_messages_sender ON booking_messages(sender_id);
CREATE INDEX idx_booking_messages_unread ON booking_messages(booking_id, is_read);

-- Audit trail
CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  old_status booking_status,
  new_status booking_status NOT NULL,

  changed_by_user_id UUID REFERENCES auth.users(id),
  changed_by_type VARCHAR(20) NOT NULL,

  reason TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id);

-- ============================================================================
-- PAYMENT TABLES
-- ============================================================================

-- Payment records
CREATE TABLE booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Payment source
  payer_id UUID NOT NULL REFERENCES auth.users(id),
  payer_type VARCHAR(20) NOT NULL,

  -- Amount
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,

  -- Payment method
  payment_method payment_method NOT NULL,
  payment_reference VARCHAR(255) UNIQUE,

  -- Status
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_gateway_response JSONB,

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  paid_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_payments_booking ON booking_payments(booking_id);
CREATE INDEX idx_booking_payments_payer ON booking_payments(payer_id);
CREATE INDEX idx_booking_payments_status ON booking_payments(payment_status);

-- Provider payouts
CREATE TABLE provider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id),

  -- Payout period
  payout_period_start DATE NOT NULL,
  payout_period_end DATE NOT NULL,

  -- Earnings
  gross_earnings DECIMAL(10,2) NOT NULL,
  commission_paid DECIMAL(10,2) NOT NULL,
  net_earnings DECIMAL(10,2) NOT NULL,

  -- Completed bookings
  booking_count INTEGER NOT NULL,

  -- Payout details
  payout_method VARCHAR(20) NOT NULL,
  account_reference VARCHAR(255),

  -- Status
  payout_status payout_status NOT NULL DEFAULT 'pending',
  gateway_response JSONB,

  processed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_payouts_provider ON provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON provider_payouts(payout_status);

-- ============================================================================
-- REVIEW TABLES
-- ============================================================================

-- Provider reviews and ratings
CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

  -- Breakdown ratings
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  safety_rating INTEGER CHECK (safety_rating >= 1 AND safety_rating <= 5),
  instruction_quality_rating INTEGER CHECK (instruction_quality_rating >= 1 AND instruction_quality_rating <= 5),
  equipment_condition_rating INTEGER CHECK (equipment_condition_rating >= 1 AND equipment_condition_rating <= 5),

  title VARCHAR(255),
  comment TEXT,

  -- Tags
  experience_tags TEXT[],

  response_from_provider TEXT,
  responded_at TIMESTAMP,

  is_verified_booking BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_reviews_provider ON provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_reviewer ON provider_reviews(reviewer_id);
CREATE INDEX idx_provider_reviews_booking ON provider_reviews(booking_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;

-- Service Providers: Users can view all, only edit own
CREATE POLICY "Users can view all providers" ON service_providers
  FOR SELECT USING (true);

CREATE POLICY "Users can update own provider" ON service_providers
  FOR UPDATE USING (auth.uid() = user_id);

-- Services: Anyone can view, provider can manage
CREATE POLICY "Anyone can view services" ON services
  FOR SELECT USING (true);

CREATE POLICY "Providers can manage own services" ON services
  FOR INSERT WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own services" ON services
  FOR UPDATE USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Availability: Anyone can view, provider can manage
CREATE POLICY "Anyone can view availability" ON provider_availability
  FOR SELECT USING (true);

CREATE POLICY "Providers can manage own availability" ON provider_availability
  FOR INSERT WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own availability" ON provider_availability
  FOR UPDATE USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Bookings: Users can only see their own
CREATE POLICY "Divers can view own bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = diver_1_id OR
    auth.uid() = diver_2_id OR
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Divers can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    auth.uid() = diver_1_id OR auth.uid() = diver_2_id
  );

CREATE POLICY "Relevant parties can update bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() = diver_1_id OR
    auth.uid() = diver_2_id OR
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- Booking Items: Same as bookings
CREATE POLICY "Relevant parties can view booking items" ON booking_items
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        auth.uid() = diver_1_id OR
        auth.uid() = diver_2_id OR
        provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Messages: Only participants can view
CREATE POLICY "Participants can view booking messages" ON booking_messages
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        auth.uid() = diver_1_id OR
        auth.uid() = diver_2_id OR
        provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages" ON booking_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    booking_id IN (
      SELECT id FROM bookings WHERE
        auth.uid() = diver_1_id OR
        auth.uid() = diver_2_id OR
        provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Status History: Relevant parties can view
CREATE POLICY "Relevant parties can view status history" ON booking_status_history
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        auth.uid() = diver_1_id OR
        auth.uid() = diver_2_id OR
        provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Payments: Relevant parties can view
CREATE POLICY "Relevant parties can view payments" ON booking_payments
  FOR SELECT USING (
    auth.uid() = payer_id OR
    booking_id IN (
      SELECT id FROM bookings WHERE
        auth.uid() = diver_1_id OR
        auth.uid() = diver_2_id OR
        provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Payouts: Only provider can view own
CREATE POLICY "Providers can view own payouts" ON provider_payouts
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Reviews: Anyone can view, only participants can create
CREATE POLICY "Anyone can view reviews" ON provider_reviews
  FOR SELECT USING (true);

CREATE POLICY "Reviewers can create reviews" ON provider_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    booking_id IN (
      SELECT id FROM bookings WHERE
        auth.uid() = diver_1_id OR auth.uid() = diver_2_id
    )
  );

CREATE POLICY "Reviewers can update own reviews" ON provider_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update booking updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_updated_at();

-- Calculate and store provider stats after review
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_providers
  SET
    rating_average = (
      SELECT AVG(rating) FROM provider_reviews WHERE provider_id = NEW.provider_id
    ),
    review_count = (
      SELECT COUNT(*) FROM provider_reviews WHERE provider_id = NEW.provider_id
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER provider_stats_after_review
  AFTER INSERT ON provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE service_providers IS 'Service providers (dive centers, instructors, boat operators)';
COMMENT ON TABLE bookings IS 'Core booking records connecting 2 divers with 1 service provider';
COMMENT ON TABLE booking_items IS 'Line items - specific services included in booking';
COMMENT ON TABLE booking_messages IS 'Conversation thread between divers and provider';
COMMENT ON TABLE booking_payments IS 'Payment records for bookings';
COMMENT ON TABLE provider_reviews IS 'Reviews and ratings for service providers';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- - Created 10 main tables for booking system
-- - Added comprehensive indexing for performance
-- - Implemented Row-Level Security (RLS) for data isolation
-- - Added triggers for automatic updates
-- - Full referential integrity with ON DELETE CASCADE where appropriate
