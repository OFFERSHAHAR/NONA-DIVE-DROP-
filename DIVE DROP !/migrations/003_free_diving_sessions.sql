-- Free Diving Sessions & Booking Tables

-- ============================================================================
-- FREE DIVING SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS free_diving_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Session Details
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN (
    'group_apnea_training',
    'certification_course',
    'competition_prep',
    'depth_training',
    'partner_sessions'
  )),

  -- Difficulty Level
  level VARCHAR(50) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),

  -- Location & Schedule
  location VARCHAR(255) NOT NULL,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),

  start_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5),
  duration_minutes INTEGER,

  -- Capacity & Pricing
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
  price_shekel DECIMAL(10, 2) NOT NULL CHECK (price_shekel >= 0),

  -- Session Status
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  )),

  -- Additional Info
  equipment_provided BOOLEAN DEFAULT FALSE,
  min_experience_level VARCHAR(50),
  max_depth_meters INTEGER,
  weather_conditions VARCHAR(500),
  special_requirements TEXT,

  -- Images
  image_url VARCHAR(2048),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_free_diving_sessions_instructor_id ON free_diving_sessions(instructor_id);
CREATE INDEX idx_free_diving_sessions_status ON free_diving_sessions(status);
CREATE INDEX idx_free_diving_sessions_session_type ON free_diving_sessions(session_type);
CREATE INDEX idx_free_diving_sessions_level ON free_diving_sessions(level);
CREATE INDEX idx_free_diving_sessions_start_date ON free_diving_sessions(start_date);
CREATE INDEX idx_free_diving_sessions_location ON free_diving_sessions(location);

-- ============================================================================
-- FREE DIVING SESSION BOOKINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS free_diving_session_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES free_diving_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Booking Status
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN (
    'pending',
    'confirmed',
    'completed',
    'cancelled'
  )),

  -- Booking Date
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Pricing
  price_paid_shekel DECIMAL(10, 2) NOT NULL,

  -- Payment
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'completed',
    'failed',
    'refunded'
  )),
  payment_method VARCHAR(50),
  payment_transaction_id VARCHAR(255),

  -- Participation
  attended BOOLEAN DEFAULT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_free_diving_session_bookings_session_id ON free_diving_session_bookings(session_id);
CREATE INDEX idx_free_diving_session_bookings_user_id ON free_diving_session_bookings(user_id);
CREATE INDEX idx_free_diving_session_bookings_status ON free_diving_session_bookings(status);
CREATE INDEX idx_free_diving_session_bookings_payment_status ON free_diving_session_bookings(payment_status);
CREATE INDEX idx_free_diving_session_bookings_booked_at ON free_diving_session_bookings(booked_at DESC);

-- ============================================================================
-- FREE DIVING SESSION REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS free_diving_session_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES free_diving_sessions(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES free_diving_session_bookings(id) ON DELETE SET NULL,

  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT NOT NULL CHECK (LENGTH(comment) >= 10),

  -- Sub-ratings
  instruction_quality_rating INTEGER CHECK (instruction_quality_rating IS NULL OR (instruction_quality_rating >= 1 AND instruction_quality_rating <= 5)),
  safety_rating INTEGER CHECK (safety_rating IS NULL OR (safety_rating >= 1 AND safety_rating <= 5)),
  value_rating INTEGER CHECK (value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 5)),

  -- Moderation
  moderation_status VARCHAR(50) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  is_helpful_count INTEGER DEFAULT 0,
  is_reported BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(session_id, reviewer_user_id)
);

CREATE INDEX idx_free_diving_session_reviews_session_id ON free_diving_session_reviews(session_id);
CREATE INDEX idx_free_diving_session_reviews_reviewer_user_id ON free_diving_session_reviews(reviewer_user_id);
CREATE INDEX idx_free_diving_session_reviews_moderation_status ON free_diving_session_reviews(moderation_status);
CREATE INDEX idx_free_diving_session_reviews_rating ON free_diving_session_reviews(rating);
CREATE INDEX idx_free_diving_session_reviews_created_at ON free_diving_session_reviews(created_at DESC);

-- ============================================================================
-- FREE DIVING SESSION ROSTER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS free_diving_session_roster (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES free_diving_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES free_diving_session_bookings(id) ON DELETE SET NULL,

  -- Attendance
  attended BOOLEAN DEFAULT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,

  -- Notes
  instructor_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_free_diving_session_roster_session_id ON free_diving_session_roster(session_id);
CREATE INDEX idx_free_diving_session_roster_user_id ON free_diving_session_roster(user_id);
CREATE INDEX idx_free_diving_session_roster_attended ON free_diving_session_roster(attended);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE free_diving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_diving_session_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_diving_session_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_diving_session_roster ENABLE ROW LEVEL SECURITY;

-- Free Diving Sessions: Public can view sessions
CREATE POLICY "public_view_sessions"
  ON free_diving_sessions FOR SELECT
  USING (status != 'cancelled');

-- Free Diving Sessions: Instructors can update their own
CREATE POLICY "instructor_update_own_sessions"
  ON free_diving_sessions FOR UPDATE
  USING (instructor_id = auth.uid());

-- Free Diving Sessions: Instructors can delete their own
CREATE POLICY "instructor_delete_own_sessions"
  ON free_diving_sessions FOR DELETE
  USING (instructor_id = auth.uid());

-- Free Diving Sessions: Instructors can create sessions
CREATE POLICY "instructors_create_sessions"
  ON free_diving_sessions FOR INSERT
  WITH CHECK (instructor_id = auth.uid());

-- Free Diving Session Bookings: Users can view their own bookings
CREATE POLICY "users_view_own_bookings"
  ON free_diving_session_bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT instructor_id FROM free_diving_sessions WHERE id = session_id
  ));

-- Free Diving Session Bookings: Users can create bookings
CREATE POLICY "users_create_bookings"
  ON free_diving_session_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Free Diving Session Bookings: Users can update their own
CREATE POLICY "users_update_own_bookings"
  ON free_diving_session_bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- Free Diving Session Reviews: Public can view approved reviews
CREATE POLICY "public_view_approved_reviews"
  ON free_diving_session_reviews FOR SELECT
  USING (moderation_status = 'approved');

-- Free Diving Session Reviews: Users can create reviews
CREATE POLICY "users_create_reviews"
  ON free_diving_session_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_user_id);

-- Free Diving Session Roster: Instructors can view their session roster
CREATE POLICY "instructor_view_roster"
  ON free_diving_session_roster FOR SELECT
  USING (auth.uid() IN (
    SELECT instructor_id FROM free_diving_sessions WHERE id = session_id
  ));

-- Free Diving Session Roster: Participants can view their own entry
CREATE POLICY "participant_view_own_roster"
  ON free_diving_session_roster FOR SELECT
  USING (auth.uid() = user_id);

-- Free Diving Session Roster: System can manage roster
CREATE POLICY "system_manage_roster"
  ON free_diving_session_roster FOR INSERT
  WITH CHECK (TRUE);
