-- DIVE DROP: Free Diving Schema
-- Comprehensive database for freediving instructors, services, buddy listings, sessions, and bookings
-- Features: instructor credentials, insurance verification, services, sessions, bookings, RLS
-- Created: 2026-06-20

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE freediving_credential_type AS ENUM (
  'AIDA',
  'IANTD',
  'PADI',
  'CMAS',
  'SSI',
  'OTHER'
);

CREATE TYPE freediving_level AS ENUM (
  'recreational',
  'intermediate',
  'advanced',
  'instructor',
  'master_instructor'
);

CREATE TYPE freediving_service_type AS ENUM (
  'apnea',
  'courses',
  'partner',
  'competition',
  'depth',
  'meditation',
  'safety',
  'rescue'
);

CREATE TYPE freediving_session_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE freediving_booking_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled'
);

CREATE TYPE insurance_status AS ENUM (
  'active',
  'expired',
  'pending_renewal'
);

-- ============================================================================
-- 1. INSTRUCTOR CREDENTIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Credential Info
  credential_type freediving_credential_type NOT NULL,
  level freediving_level NOT NULL,
  certification_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issuing_organization TEXT NOT NULL,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Document
  credential_document_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_dates CHECK (issue_date < expiry_date)
);

CREATE INDEX idx_instructor_credentials_credential_type ON instructor_credentials(credential_type);
CREATE INDEX idx_instructor_credentials_level ON instructor_credentials(level);
CREATE INDEX idx_instructor_credentials_is_verified ON instructor_credentials(is_verified);
CREATE INDEX idx_instructor_credentials_expiry_date ON instructor_credentials(expiry_date);
CREATE INDEX idx_instructor_credentials_certification_number ON instructor_credentials(certification_number);

-- ============================================================================
-- 2. INSTRUCTOR INSURANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Insurance Details
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL UNIQUE,
  coverage_type TEXT NOT NULL,
  coverage_amount_shekel DECIMAL(12, 2) NOT NULL,

  -- Coverage Period
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,

  -- Status
  status insurance_status DEFAULT 'active' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,

  -- Document
  insurance_document_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_dates CHECK (issue_date < expiry_date),
  CONSTRAINT valid_coverage_amount CHECK (coverage_amount_shekel > 0)
);

CREATE INDEX idx_instructor_insurance_status ON instructor_insurance(status);
CREATE INDEX idx_instructor_insurance_is_active ON instructor_insurance(is_active);
CREATE INDEX idx_instructor_insurance_expiry_date ON instructor_insurance(expiry_date);
CREATE INDEX idx_instructor_insurance_policy_number ON instructor_insurance(policy_number);

-- ============================================================================
-- 3. FREEDIVING INSTRUCTORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS freediving_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Basic Info
  bio TEXT DEFAULT '',
  phone TEXT,
  years_experience INT DEFAULT 0,

  -- Profile Media
  avatar_url TEXT,
  cover_image_url TEXT,

  -- Service Area
  primary_location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_radius_km INT DEFAULT 50,

  -- Credentials & Insurance (Foreign Keys)
  primary_credential_id UUID REFERENCES instructor_credentials(id) ON DELETE SET NULL,
  primary_insurance_id UUID REFERENCES instructor_insurance(id) ON DELETE SET NULL,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMPTZ,

  -- Insurance Check
  insurance_verified BOOLEAN DEFAULT FALSE,
  insurance_verified_at TIMESTAMPTZ,

  -- Rating & Stats
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_sessions_completed INT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5),
  CONSTRAINT valid_service_radius CHECK (service_radius_km > 0),
  CONSTRAINT valid_years_experience CHECK (years_experience >= 0)
);

CREATE INDEX idx_freediving_instructors_user_id ON freediving_instructors(user_id);
CREATE INDEX idx_freediving_instructors_is_verified ON freediving_instructors(is_verified);
CREATE INDEX idx_freediving_instructors_insurance_verified ON freediving_instructors(insurance_verified);
CREATE INDEX idx_freediving_instructors_is_active ON freediving_instructors(is_active);
CREATE INDEX idx_freediving_instructors_primary_location ON freediving_instructors(primary_location);
CREATE INDEX idx_freediving_instructors_average_rating ON freediving_instructors(average_rating DESC);
CREATE INDEX idx_freediving_instructors_created_at ON freediving_instructors(created_at DESC);

-- ============================================================================
-- 4. FREEDIVING SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS freediving_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES freediving_instructors(id) ON DELETE CASCADE,

  -- Service Details
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  service_type freediving_service_type NOT NULL,

  -- Pricing
  price_shekel DECIMAL(8, 2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  duration_minutes INT NOT NULL,

  -- Requirements
  min_level freediving_level DEFAULT 'recreational',
  max_participants INT DEFAULT 4,

  -- Availability
  available_mon BOOLEAN DEFAULT TRUE,
  available_tue BOOLEAN DEFAULT TRUE,
  available_wed BOOLEAN DEFAULT TRUE,
  available_thu BOOLEAN DEFAULT TRUE,
  available_fri BOOLEAN DEFAULT TRUE,
  available_sat BOOLEAN DEFAULT TRUE,
  available_sun BOOLEAN DEFAULT TRUE,

  start_hour TIME,
  end_hour TIME,

  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_price CHECK (price_shekel > 0),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0),
  CONSTRAINT valid_participants CHECK (max_participants > 0)
);

CREATE INDEX idx_freediving_services_instructor_id ON freediving_services(instructor_id);
CREATE INDEX idx_freediving_services_service_type ON freediving_services(service_type);
CREATE INDEX idx_freediving_services_is_active ON freediving_services(is_active);
CREATE INDEX idx_freediving_services_created_at ON freediving_services(created_at DESC);

-- ============================================================================
-- 5. FREEDIVING BUDDY LISTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS freediving_buddy_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Search Details
  title TEXT NOT NULL,
  description TEXT DEFAULT '',

  -- Location & Timing
  location TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,

  -- Requirements
  experience_level freediving_level NOT NULL,
  max_depth_meters INT,

  -- Group Info
  max_participants INT DEFAULT 2,

  -- Contact
  contact_method TEXT DEFAULT 'in_app',
  contact_hidden BOOLEAN DEFAULT TRUE NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_max_participants CHECK (max_participants > 0),
  CONSTRAINT valid_max_depth CHECK (max_depth_meters IS NULL OR max_depth_meters > 0),
  CONSTRAINT valid_date_range CHECK (start_date < end_date)
);

CREATE INDEX idx_freediving_buddy_listings_user_id ON freediving_buddy_listings(user_id);
CREATE INDEX idx_freediving_buddy_listings_location ON freediving_buddy_listings(location);
CREATE INDEX idx_freediving_buddy_listings_experience_level ON freediving_buddy_listings(experience_level);
CREATE INDEX idx_freediving_buddy_listings_is_active ON freediving_buddy_listings(is_active);
CREATE INDEX idx_freediving_buddy_listings_start_date ON freediving_buddy_listings(start_date);
CREATE INDEX idx_freediving_buddy_listings_created_at ON freediving_buddy_listings(created_at DESC);

-- ============================================================================
-- 6. FREEDIVING SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS freediving_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES freediving_instructors(id) ON DELETE CASCADE,
  service_id UUID REFERENCES freediving_services(id) ON DELETE SET NULL,

  -- Session Details
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT NOT NULL,

  -- Schedule
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,

  -- Participants
  max_participants INT DEFAULT 4,
  current_participants INT DEFAULT 0,

  -- Depth & Safety
  planned_depth_meters INT,
  safety_coordinator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status & Results
  status freediving_session_status DEFAULT 'scheduled' NOT NULL,
  notes TEXT DEFAULT '',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_duration CHECK (duration_minutes > 0),
  CONSTRAINT valid_participants CHECK (max_participants > 0 AND current_participants >= 0 AND current_participants <= max_participants),
  CONSTRAINT valid_planned_depth CHECK (planned_depth_meters IS NULL OR planned_depth_meters > 0)
);

CREATE INDEX idx_freediving_sessions_instructor_id ON freediving_sessions(instructor_id);
CREATE INDEX idx_freediving_sessions_service_id ON freediving_sessions(service_id);
CREATE INDEX idx_freediving_sessions_session_date ON freediving_sessions(session_date);
CREATE INDEX idx_freediving_sessions_status ON freediving_sessions(status);
CREATE INDEX idx_freediving_sessions_created_at ON freediving_sessions(created_at DESC);

-- ============================================================================
-- 7. FREEDIVING SESSION PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS freediving_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES freediving_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Participation Info
  is_instructor BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'participant',

  -- Safety Info
  max_depth_certified INT,
  medical_clearance BOOLEAN DEFAULT TRUE,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  left_at TIMESTAMPTZ,

  CONSTRAINT unique_participant UNIQUE(session_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('participant', 'safety_diver', 'instructor', 'assistant'))
);

CREATE INDEX idx_freediving_session_participants_session_id ON freediving_session_participants(session_id);
CREATE INDEX idx_freediving_session_participants_user_id ON freediving_session_participants(user_id);
CREATE INDEX idx_freediving_session_participants_role ON freediving_session_participants(role);

-- ============================================================================
-- 8. FREEDIVING BOOKINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS freediving_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES freediving_services(id) ON DELETE RESTRICT,
  booker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Booking Details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  participant_count INT NOT NULL,

  -- Special Requests
  special_requests TEXT,
  medical_notes TEXT,

  -- Status
  status freediving_booking_status NOT NULL DEFAULT 'pending',
  confirmation_code TEXT UNIQUE DEFAULT (gen_random_uuid()::TEXT),

  -- Pricing
  total_price_shekel DECIMAL(8, 2),

  -- Communication
  instructor_notes TEXT,
  customer_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_participant_count CHECK (participant_count > 0),
  CONSTRAINT valid_price CHECK (total_price_shekel IS NULL OR total_price_shekel >= 0)
);

CREATE INDEX idx_freediving_bookings_service_id ON freediving_bookings(service_id);
CREATE INDEX idx_freediving_bookings_booker_user_id ON freediving_bookings(booker_user_id);
CREATE INDEX idx_freediving_bookings_status ON freediving_bookings(status);
CREATE INDEX idx_freediving_bookings_booking_date ON freediving_bookings(booking_date);
CREATE INDEX idx_freediving_bookings_created_at ON freediving_bookings(created_at DESC);

-- ============================================================================
-- 9. FREEDIVING REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS freediving_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES freediving_instructors(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES freediving_bookings(id) ON DELETE SET NULL,

  -- Review Content
  rating INT NOT NULL,
  title TEXT,
  comment TEXT,

  -- Sub-ratings
  safety_rating INT,
  professionalism_rating INT,
  instruction_quality_rating INT,

  -- Metadata
  is_verified_booking BOOLEAN DEFAULT FALSE,
  is_helpful_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT valid_safety_rating CHECK (safety_rating IS NULL OR (safety_rating >= 1 AND safety_rating <= 5)),
  CONSTRAINT valid_professionalism_rating CHECK (professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)),
  CONSTRAINT valid_instruction_quality CHECK (instruction_quality_rating IS NULL OR (instruction_quality_rating >= 1 AND instruction_quality_rating <= 5)),
  CONSTRAINT unique_review_per_user UNIQUE(instructor_id, reviewer_user_id, booking_id)
);

CREATE INDEX idx_freediving_reviews_instructor_id ON freediving_reviews(instructor_id);
CREATE INDEX idx_freediving_reviews_reviewer_user_id ON freediving_reviews(reviewer_user_id);
CREATE INDEX idx_freediving_reviews_rating ON freediving_reviews(rating);
CREATE INDEX idx_freediving_reviews_created_at ON freediving_reviews(created_at DESC);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for instructor_credentials
CREATE TRIGGER trigger_update_instructor_credentials_timestamp
BEFORE UPDATE ON instructor_credentials
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for instructor_insurance
CREATE TRIGGER trigger_update_instructor_insurance_timestamp
BEFORE UPDATE ON instructor_insurance
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for freediving_instructors
CREATE TRIGGER trigger_update_freediving_instructors_timestamp
BEFORE UPDATE ON freediving_instructors
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for freediving_services
CREATE TRIGGER trigger_update_freediving_services_timestamp
BEFORE UPDATE ON freediving_services
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for freediving_buddy_listings
CREATE TRIGGER trigger_update_freediving_buddy_listings_timestamp
BEFORE UPDATE ON freediving_buddy_listings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for freediving_sessions
CREATE TRIGGER trigger_update_freediving_sessions_timestamp
BEFORE UPDATE ON freediving_sessions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for freediving_bookings
CREATE TRIGGER trigger_update_freediving_bookings_timestamp
BEFORE UPDATE ON freediving_bookings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for freediving_reviews
CREATE TRIGGER trigger_update_freediving_reviews_timestamp
BEFORE UPDATE ON freediving_reviews
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Function to recalculate instructor rating
CREATE OR REPLACE FUNCTION recalculate_instructor_rating(p_instructor_id UUID)
RETURNS VOID AS $$
DECLARE
  v_avg_rating DECIMAL(3, 2);
  v_total_reviews INT;
BEGIN
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)::INT
  INTO v_avg_rating, v_total_reviews
  FROM freediving_reviews
  WHERE instructor_id = p_instructor_id;

  UPDATE freediving_instructors
  SET
    average_rating = COALESCE(v_avg_rating, 0),
    total_reviews = COALESCE(v_total_reviews, 0)
  WHERE id = p_instructor_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update instructor rating
CREATE TRIGGER trigger_recalculate_instructor_rating
AFTER INSERT OR UPDATE ON freediving_reviews
FOR EACH ROW
EXECUTE FUNCTION recalculate_instructor_rating(NEW.instructor_id);

-- Function to validate instructor credentials and insurance
CREATE OR REPLACE FUNCTION validate_instructor_verification(p_instructor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_valid_credential BOOLEAN;
  v_has_valid_insurance BOOLEAN;
BEGIN
  -- Check if instructor has verified credential with future expiry date
  SELECT EXISTS(
    SELECT 1 FROM instructor_credentials
    WHERE id = (
      SELECT primary_credential_id FROM freediving_instructors
      WHERE id = p_instructor_id
    )
    AND is_verified = TRUE
    AND expiry_date > NOW()::DATE
  ) INTO v_has_valid_credential;

  -- Check if instructor has active insurance
  SELECT EXISTS(
    SELECT 1 FROM instructor_insurance
    WHERE id = (
      SELECT primary_insurance_id FROM freediving_instructors
      WHERE id = p_instructor_id
    )
    AND status = 'active'
    AND expiry_date > NOW()::DATE
  ) INTO v_has_valid_insurance;

  RETURN v_has_valid_credential AND v_has_valid_insurance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE instructor_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE freediving_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE freediving_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE freediving_buddy_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE freediving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE freediving_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE freediving_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE freediving_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INSTRUCTOR CREDENTIALS POLICIES
-- ============================================================================

-- Public can view verified credentials
CREATE POLICY "Public can view verified credentials"
  ON instructor_credentials
  FOR SELECT
  USING (is_verified = TRUE AND expiry_date > NOW()::DATE);

-- Instructors can view their own credentials
CREATE POLICY "Instructors can view own credentials"
  ON instructor_credentials
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM freediving_instructors
    WHERE primary_credential_id = instructor_credentials.id
  ));

-- Instructors can create credentials
CREATE POLICY "Instructors can create credentials"
  ON instructor_credentials
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM freediving_instructors
  ));

-- Only admins/system can verify credentials
CREATE POLICY "Only system can update credentials"
  ON instructor_credentials
  FOR UPDATE
  USING (FALSE);

-- ============================================================================
-- INSTRUCTOR INSURANCE POLICIES
-- ============================================================================

-- Public can view active insurance status
CREATE POLICY "Public can view active insurance"
  ON instructor_insurance
  FOR SELECT
  USING (is_active = TRUE AND status = 'active');

-- Instructors can view their own insurance
CREATE POLICY "Instructors can view own insurance"
  ON instructor_insurance
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM freediving_instructors
    WHERE primary_insurance_id = instructor_insurance.id
  ));

-- Instructors can create insurance
CREATE POLICY "Instructors can create insurance"
  ON instructor_insurance
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM freediving_instructors
  ));

-- Instructors can update their insurance
CREATE POLICY "Instructors can update own insurance"
  ON instructor_insurance
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM freediving_instructors
    WHERE primary_insurance_id = instructor_insurance.id
  ));

-- ============================================================================
-- FREEDIVING INSTRUCTORS POLICIES
-- ============================================================================

-- Public can view verified instructors with valid insurance
CREATE POLICY "Public can view verified instructors"
  ON freediving_instructors
  FOR SELECT
  USING (is_verified = TRUE AND insurance_verified = TRUE AND is_active = TRUE);

-- Instructors can view their own profile
CREATE POLICY "Instructors can view own profile"
  ON freediving_instructors
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create instructor profile
CREATE POLICY "Users can create instructor profile"
  ON freediving_instructors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Instructors can update their own profile
CREATE POLICY "Instructors can update own profile"
  ON freediving_instructors
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FREEDIVING SERVICES POLICIES
-- ============================================================================

-- Public can view active services from verified instructors
CREATE POLICY "Public can view verified instructor services"
  ON freediving_services
  FOR SELECT
  USING (
    is_active = TRUE
    AND instructor_id IN (
      SELECT id FROM freediving_instructors
      WHERE is_verified = TRUE AND insurance_verified = TRUE AND is_active = TRUE
    )
  );

-- Instructors can view their own services
CREATE POLICY "Instructors can view own services"
  ON freediving_services
  FOR SELECT
  USING (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- Instructors can create services
CREATE POLICY "Instructors can create services"
  ON freediving_services
  FOR INSERT
  WITH CHECK (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- Instructors can update their services
CREATE POLICY "Instructors can update own services"
  ON freediving_services
  FOR UPDATE
  USING (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- Instructors can delete their services
CREATE POLICY "Instructors can delete own services"
  ON freediving_services
  FOR DELETE
  USING (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FREEDIVING BUDDY LISTINGS POLICIES
-- ============================================================================

-- Public can view active listings
CREATE POLICY "Anyone can view active buddy listings"
  ON freediving_buddy_listings
  FOR SELECT
  USING (is_active = TRUE);

-- Users can view their own listings
CREATE POLICY "Users can view own buddy listings"
  ON freediving_buddy_listings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create listings
CREATE POLICY "Users can create buddy listings"
  ON freediving_buddy_listings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "Users can update own buddy listings"
  ON freediving_buddy_listings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "Users can delete own buddy listings"
  ON freediving_buddy_listings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FREEDIVING SESSIONS POLICIES
-- ============================================================================

-- Public can view scheduled sessions
CREATE POLICY "Anyone can view scheduled sessions"
  ON freediving_sessions
  FOR SELECT
  USING (status = 'scheduled' AND instructor_id IN (
    SELECT id FROM freediving_instructors
    WHERE is_verified = TRUE AND insurance_verified = TRUE
  ));

-- Participants can view their sessions
CREATE POLICY "Participants can view their sessions"
  ON freediving_sessions
  FOR SELECT
  USING (
    instructor_id IN (SELECT id FROM freediving_instructors WHERE user_id = auth.uid())
    OR id IN (
      SELECT session_id FROM freediving_session_participants
      WHERE user_id = auth.uid()
    )
  );

-- Instructors can create sessions
CREATE POLICY "Instructors can create sessions"
  ON freediving_sessions
  FOR INSERT
  WITH CHECK (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- Instructors can update their sessions
CREATE POLICY "Instructors can update own sessions"
  ON freediving_sessions
  FOR UPDATE
  USING (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FREEDIVING SESSION PARTICIPANTS POLICIES
-- ============================================================================

-- Users can view their participations
CREATE POLICY "Users can view own participations"
  ON freediving_session_participants
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR session_id IN (
      SELECT id FROM freediving_sessions
      WHERE instructor_id IN (
        SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
      )
    )
  );

-- Users can join sessions
CREATE POLICY "Users can join sessions"
  ON freediving_session_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their participation
CREATE POLICY "Users can update own participation"
  ON freediving_session_participants
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FREEDIVING BOOKINGS POLICIES
-- ============================================================================

-- Users can view own bookings
CREATE POLICY "Users can view own bookings"
  ON freediving_bookings
  FOR SELECT
  USING (auth.uid() = booker_user_id);

-- Instructors can view bookings for their services
CREATE POLICY "Instructors can view service bookings"
  ON freediving_bookings
  FOR SELECT
  USING (
    service_id IN (
      SELECT id FROM freediving_services
      WHERE instructor_id IN (
        SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create bookings
CREATE POLICY "Users can create bookings"
  ON freediving_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = booker_user_id);

-- Users can update their bookings
CREATE POLICY "Users can update own bookings"
  ON freediving_bookings
  FOR UPDATE
  USING (auth.uid() = booker_user_id)
  WITH CHECK (auth.uid() = booker_user_id);

-- Instructors can update bookings for their services
CREATE POLICY "Instructors can update service bookings"
  ON freediving_bookings
  FOR UPDATE
  USING (
    service_id IN (
      SELECT id FROM freediving_services
      WHERE instructor_id IN (
        SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- FREEDIVING REVIEWS POLICIES
-- ============================================================================

-- Public can view reviews
CREATE POLICY "Anyone can view reviews"
  ON freediving_reviews
  FOR SELECT
  USING (TRUE);

-- Users can create reviews only after booking completion
CREATE POLICY "Users can create reviews after booking"
  ON freediving_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_user_id
    AND EXISTS (
      SELECT 1 FROM freediving_bookings
      WHERE id = booking_id
      AND booker_user_id = auth.uid()
      AND status = 'completed'
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON freediving_reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_user_id)
  WITH CHECK (auth.uid() = reviewer_user_id);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_instructor_rating(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_instructor_verification(UUID) TO authenticated;
