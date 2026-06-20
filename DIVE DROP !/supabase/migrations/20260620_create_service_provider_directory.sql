-- DIVE DROP: Service Provider Directory
-- Creates tables for dive instructor, shop, and service provider marketplace
-- Features: profiles, services, bookings, reviews, availability, moderation
-- Created: 2026-06-20

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE provider_type_enum AS ENUM (
  'instructor',
  'shop',
  'guide',
  'boat_operator',
  'rental',
  'photography'
);

CREATE TYPE service_category_enum AS ENUM (
  'training',
  'guiding',
  'equipment',
  'boat',
  'photography',
  'transport'
);

CREATE TYPE provider_status_enum AS ENUM (
  'pending',
  'approved',
  'suspended',
  'archived'
);

CREATE TYPE booking_status_enum AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled'
);

CREATE TYPE moderation_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- ============================================================================
-- 1. SERVICE PROVIDERS TABLE
-- ============================================================================

CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  business_name TEXT NOT NULL,
  description TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website_url TEXT,

  -- Profile Media
  avatar_url TEXT,
  cover_image_url TEXT,

  -- Business Type & Credentials
  provider_type provider_type_enum NOT NULL,
  license_number TEXT,
  license_expiry DATE,
  insurance_provider TEXT,
  insurance_expiry DATE,
  years_experience INT,
  certifications TEXT[],

  -- Service Area
  primary_location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_radius_km INT DEFAULT 50,

  -- Rating & Stats
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  response_rate DECIMAL(3, 2),

  -- Status & Moderation
  status provider_status_enum NOT NULL DEFAULT 'pending',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5),
  CONSTRAINT valid_service_radius CHECK (service_radius_km > 0),
  CONSTRAINT valid_years_experience CHECK (years_experience >= 0)
);

CREATE INDEX idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX idx_service_providers_provider_type ON service_providers(provider_type);
CREATE INDEX idx_service_providers_status ON service_providers(status);
CREATE INDEX idx_service_providers_primary_location ON service_providers(primary_location);
CREATE INDEX idx_service_providers_average_rating ON service_providers(average_rating DESC);
CREATE INDEX idx_service_providers_created_at ON service_providers(created_at DESC);
CREATE INDEX idx_service_providers_is_verified ON service_providers(is_verified);

-- ============================================================================
-- 2. PROVIDER SERVICES TABLE
-- ============================================================================

CREATE TABLE provider_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Service Details
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  service_category service_category_enum NOT NULL,

  -- Pricing
  price_shekel DECIMAL(8, 2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  duration_minutes INT,

  -- Group Size
  group_size_min INT DEFAULT 1,
  group_size_max INT DEFAULT 10,

  -- Availability Schedule
  available_mon BOOLEAN DEFAULT TRUE,
  available_tue BOOLEAN DEFAULT TRUE,
  available_wed BOOLEAN DEFAULT TRUE,
  available_thu BOOLEAN DEFAULT TRUE,
  available_fri BOOLEAN DEFAULT TRUE,
  available_sat BOOLEAN DEFAULT TRUE,
  available_sun BOOLEAN DEFAULT TRUE,

  start_hour TIME,
  end_hour TIME,

  -- Requirements
  min_experience_level TEXT,
  certification_required TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  booking_required BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_group_size CHECK (group_size_min > 0 AND group_size_max >= group_size_min),
  CONSTRAINT valid_price CHECK (price_shekel > 0),
  CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

CREATE INDEX idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX idx_provider_services_category ON provider_services(service_category);
CREATE INDEX idx_provider_services_is_active ON provider_services(is_active);
CREATE INDEX idx_provider_services_created_at ON provider_services(created_at DESC);

-- ============================================================================
-- 3. PROVIDER REVIEWS TABLE
-- ============================================================================

CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID,

  -- Review Content
  rating INT NOT NULL,
  title TEXT,
  comment TEXT,

  -- Sub-ratings
  safety_rating INT,
  professionalism_rating INT,
  value_rating INT,

  -- Metadata
  is_verified_booking BOOLEAN DEFAULT FALSE,
  is_helpful_count INT DEFAULT 0,
  is_reported BOOLEAN DEFAULT FALSE,
  moderation_status moderation_status_enum DEFAULT 'approved',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT valid_safety_rating CHECK (safety_rating IS NULL OR (safety_rating >= 1 AND safety_rating <= 5)),
  CONSTRAINT valid_professionalism_rating CHECK (professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)),
  CONSTRAINT valid_value_rating CHECK (value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 5)),
  CONSTRAINT unique_review_per_user_booking UNIQUE(provider_id, reviewer_user_id, booking_id)
);

CREATE INDEX idx_provider_reviews_provider_id ON provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_reviewer_user_id ON provider_reviews(reviewer_user_id);
CREATE INDEX idx_provider_reviews_rating ON provider_reviews(rating);
CREATE INDEX idx_provider_reviews_created_at ON provider_reviews(created_at DESC);
CREATE INDEX idx_provider_reviews_moderation_status ON provider_reviews(moderation_status);

-- ============================================================================
-- 4. PROVIDER GALLERY TABLE
-- ============================================================================

CREATE TABLE provider_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Media
  url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  title TEXT,
  description TEXT,

  -- Ordering
  display_order INT,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_media_type CHECK (media_type IN ('image', 'video'))
);

CREATE INDEX idx_provider_gallery_provider_id ON provider_gallery(provider_id);
CREATE INDEX idx_provider_gallery_display_order ON provider_gallery(display_order);
CREATE INDEX idx_provider_gallery_is_featured ON provider_gallery(is_featured);

-- ============================================================================
-- 5. PROVIDER AVAILABILITY TABLE
-- ============================================================================

CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Date & Time
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Capacity
  max_bookings INT DEFAULT 1,
  current_bookings INT DEFAULT 0,

  -- Block Out
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT valid_bookings CHECK (max_bookings > 0 AND current_bookings >= 0 AND current_bookings <= max_bookings),
  CONSTRAINT unique_availability UNIQUE(provider_id, available_date, start_time)
);

CREATE INDEX idx_provider_availability_provider_id ON provider_availability(provider_id);
CREATE INDEX idx_provider_availability_date ON provider_availability(available_date);
CREATE INDEX idx_provider_availability_is_blocked ON provider_availability(is_blocked);

-- ============================================================================
-- 6. PROVIDER BOOKINGS TABLE
-- ============================================================================

CREATE TABLE provider_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES provider_services(id) ON DELETE RESTRICT,
  booker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Booking Details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  group_size INT NOT NULL,

  -- Special Requests
  special_requests TEXT,

  -- Status
  status booking_status_enum NOT NULL DEFAULT 'pending',
  confirmation_code TEXT UNIQUE DEFAULT (gen_random_uuid()::TEXT),

  -- Pricing
  total_price_shekel DECIMAL(8, 2),

  -- Communication
  provider_notes TEXT,
  customer_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_group_size CHECK (group_size > 0),
  CONSTRAINT valid_price CHECK (total_price_shekel IS NULL OR total_price_shekel >= 0)
);

CREATE INDEX idx_provider_bookings_service_id ON provider_bookings(service_id);
CREATE INDEX idx_provider_bookings_booker_user_id ON provider_bookings(booker_user_id);
CREATE INDEX idx_provider_bookings_status ON provider_bookings(status);
CREATE INDEX idx_provider_bookings_booking_date ON provider_bookings(booking_date);
CREATE INDEX idx_provider_bookings_created_at ON provider_bookings(created_at DESC);

-- ============================================================================
-- 7. PROVIDER MODERATION LOGS TABLE
-- ============================================================================

CREATE TABLE provider_moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Action Details
  action TEXT NOT NULL,
  reason TEXT,

  -- Admin
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_action CHECK (action IN (
    'created', 'updated', 'approved', 'suspended', 'archived',
    'report_filed', 'review_removed', 'verified'
  ))
);

CREATE INDEX idx_provider_moderation_logs_provider_id ON provider_moderation_logs(provider_id);
CREATE INDEX idx_provider_moderation_logs_action ON provider_moderation_logs(action);
CREATE INDEX idx_provider_moderation_logs_created_at ON provider_moderation_logs(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_providers_timestamp
BEFORE UPDATE ON service_providers
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_provider_services_timestamp
BEFORE UPDATE ON provider_services
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_provider_reviews_timestamp
BEFORE UPDATE ON provider_reviews
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_provider_bookings_timestamp
BEFORE UPDATE ON provider_bookings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Function to recalculate provider rating from reviews
CREATE OR REPLACE FUNCTION recalculate_provider_rating(p_provider_id UUID)
RETURNS VOID AS $$
DECLARE
  v_avg_rating DECIMAL(3, 2);
  v_total_reviews INT;
BEGIN
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)::INT
  INTO v_avg_rating, v_total_reviews
  FROM provider_reviews
  WHERE provider_id = p_provider_id
  AND moderation_status = 'approved';

  UPDATE service_providers
  SET
    average_rating = COALESCE(v_avg_rating, 0),
    total_reviews = COALESCE(v_total_reviews, 0)
  WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update provider rating when review is added/updated
CREATE TRIGGER trigger_recalculate_rating_on_review
AFTER INSERT OR UPDATE ON provider_reviews
FOR EACH ROW
EXECUTE FUNCTION recalculate_provider_rating(NEW.provider_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_moderation_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SERVICE PROVIDERS POLICIES
-- ============================================================================

CREATE POLICY "Public can view approved verified providers"
  ON service_providers
  FOR SELECT
  USING (status = 'approved' AND is_verified = true);

CREATE POLICY "Providers can view own profile"
  ON service_providers
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own provider profile"
  ON service_providers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Providers can update own profile"
  ON service_providers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status != 'suspended');

-- ============================================================================
-- PROVIDER SERVICES POLICIES
-- ============================================================================

CREATE POLICY "Public can view active services of approved providers"
  ON provider_services
  FOR SELECT
  USING (
    is_active = true
    AND provider_id IN (
      SELECT id FROM service_providers
      WHERE status = 'approved' AND is_verified = true
    )
  );

CREATE POLICY "Providers can view their own services"
  ON provider_services
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create own services"
  ON provider_services
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own services"
  ON provider_services
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete own services"
  ON provider_services
  FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROVIDER REVIEWS POLICIES
-- ============================================================================

CREATE POLICY "Public can view approved reviews"
  ON provider_reviews
  FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Reviewers can view own reviews"
  ON provider_reviews
  FOR SELECT
  USING (reviewer_user_id = auth.uid());

CREATE POLICY "Providers can view reviews on their profile"
  ON provider_reviews
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reviews"
  ON provider_reviews
  FOR INSERT
  WITH CHECK (
    reviewer_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM provider_bookings
      WHERE service_id IN (
        SELECT id FROM provider_services
        WHERE provider_id = provider_reviews.provider_id
      )
      AND booker_user_id = auth.uid()
      AND status = 'completed'
    )
  );

CREATE POLICY "Reviewers can update own reviews"
  ON provider_reviews
  FOR UPDATE
  USING (reviewer_user_id = auth.uid())
  WITH CHECK (reviewer_user_id = auth.uid());

-- ============================================================================
-- PROVIDER GALLERY POLICIES
-- ============================================================================

CREATE POLICY "Public can view gallery of approved providers"
  ON provider_gallery
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers
      WHERE status = 'approved' AND is_verified = true
    )
  );

CREATE POLICY "Providers can manage own gallery"
  ON provider_gallery
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own gallery"
  ON provider_gallery
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete own gallery"
  ON provider_gallery
  FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROVIDER AVAILABILITY POLICIES
-- ============================================================================

CREATE POLICY "Public can view availability of approved providers"
  ON provider_availability
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers
      WHERE status = 'approved' AND is_verified = true
    )
  );

CREATE POLICY "Providers can manage own availability"
  ON provider_availability
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own availability"
  ON provider_availability
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete own availability"
  ON provider_availability
  FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROVIDER BOOKINGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own bookings"
  ON provider_bookings
  FOR SELECT
  USING (booker_user_id = auth.uid());

CREATE POLICY "Providers can view bookings for their services"
  ON provider_bookings
  FOR SELECT
  USING (
    service_id IN (
      SELECT id FROM provider_services
      WHERE provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create bookings"
  ON provider_bookings
  FOR INSERT
  WITH CHECK (booker_user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON provider_bookings
  FOR UPDATE
  USING (booker_user_id = auth.uid())
  WITH CHECK (booker_user_id = auth.uid());

CREATE POLICY "Providers can update bookings for their services"
  ON provider_bookings
  FOR UPDATE
  USING (
    service_id IN (
      SELECT id FROM provider_services
      WHERE provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- MODERATION LOGS POLICIES
-- ============================================================================

CREATE POLICY "Admins can view moderation logs"
  ON provider_moderation_logs
  FOR SELECT
  USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_provider_rating(UUID) TO authenticated;
