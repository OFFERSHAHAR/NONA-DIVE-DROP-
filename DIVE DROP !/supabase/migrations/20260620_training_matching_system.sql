-- DIVE DROP: Free Diving Training Matching System
-- Comprehensive training matching by depth level with recommendations
-- Features: depth levels, training programs, progress tracking, matching algorithm
-- Created: 2026-06-20

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE training_depth_level AS ENUM (
  'beginner',
  'intermediate',
  'advanced',
  'expert'
);

CREATE TYPE training_program_status AS ENUM (
  'active',
  'inactive',
  'cancelled'
);

CREATE TYPE training_enrollment_status AS ENUM (
  'enrolled',
  'in_progress',
  'completed',
  'cancelled'
);

-- ============================================================================
-- 1. TRAINING PROGRAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES freediving_instructors(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Depth Classification
  depth_level training_depth_level NOT NULL,
  depth_min_meters INT NOT NULL,
  depth_max_meters INT NOT NULL,

  -- Program Details
  duration_hours INT NOT NULL,
  duration_days INT NOT NULL,
  max_students INT NOT NULL DEFAULT 4,
  current_enrollment INT DEFAULT 0,

  -- Pricing
  price_shekel DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ILS',

  -- Location & Schedule
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Availability
  next_start_date DATE,
  session_days INT DEFAULT 1,

  -- Requirements
  min_age INT DEFAULT 16,
  min_experience_level TEXT DEFAULT 'recreational',
  medical_clearance_required BOOLEAN DEFAULT TRUE,
  equipment_provided BOOLEAN DEFAULT FALSE,

  -- Content Coverage
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  certifications_offered TEXT[] DEFAULT ARRAY[]::TEXT[],
  equipment_provided_list TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  status training_program_status DEFAULT 'active' NOT NULL,

  -- Ratings
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  total_students_trained INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_depth CHECK (depth_min_meters < depth_max_meters),
  CONSTRAINT valid_duration CHECK (duration_hours > 0 AND duration_days > 0),
  CONSTRAINT valid_price CHECK (price_shekel > 0),
  CONSTRAINT valid_students CHECK (max_students > 0 AND current_enrollment <= max_students),
  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5)
);

CREATE INDEX idx_training_programs_instructor_id ON training_programs(instructor_id);
CREATE INDEX idx_training_programs_depth_level ON training_programs(depth_level);
CREATE INDEX idx_training_programs_location ON training_programs(location);
CREATE INDEX idx_training_programs_is_active ON training_programs(is_active);
CREATE INDEX idx_training_programs_next_start_date ON training_programs(next_start_date);
CREATE INDEX idx_training_programs_average_rating ON training_programs(average_rating DESC);
CREATE INDEX idx_training_programs_created_at ON training_programs(created_at DESC);

-- ============================================================================
-- 2. USER TRAINING PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Current Depth Achievement
  depth_achieved_meters INT DEFAULT 0,
  current_level training_depth_level DEFAULT 'beginner',

  -- Certifications Earned
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Training History
  total_trainings_completed INT DEFAULT 0,
  total_training_hours INT DEFAULT 0,

  -- Last Training
  last_training_date TIMESTAMPTZ,
  last_training_location TEXT,

  -- Medical Status
  medical_clearance_valid BOOLEAN DEFAULT TRUE,
  medical_clearance_expiry DATE,
  medical_notes TEXT,

  -- Safety Info
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  allergies TEXT,

  -- Preferences
  preferred_location TEXT,
  preferred_depth_min INT DEFAULT 0,
  preferred_depth_max INT DEFAULT 100,
  training_frequency_preference TEXT DEFAULT 'monthly',

  -- Progress Stats
  trainings_this_year INT DEFAULT 0,
  average_training_rating DECIMAL(3, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_depth_achieved CHECK (depth_achieved_meters >= 0),
  CONSTRAINT valid_hours CHECK (total_training_hours >= 0),
  CONSTRAINT valid_trainings CHECK (total_trainings_completed >= 0)
);

CREATE INDEX idx_user_training_progress_user_id ON user_training_progress(user_id);
CREATE INDEX idx_user_training_progress_current_level ON user_training_progress(current_level);
CREATE INDEX idx_user_training_progress_depth_achieved ON user_training_progress(depth_achieved_meters);
CREATE INDEX idx_user_training_progress_medical_clearance ON user_training_progress(medical_clearance_valid);

-- ============================================================================
-- 3. TRAINING RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,

  -- Recommendation Details
  reason TEXT NOT NULL,
  confidence_score DECIMAL(3, 2),
  match_details JSONB DEFAULT '{}'::JSONB,

  -- User Status
  was_recommended_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  was_viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  was_booked BOOLEAN DEFAULT FALSE,
  booked_at TIMESTAMPTZ,

  -- Scoring Components
  depth_match_score DECIMAL(3, 2),
  experience_match_score DECIMAL(3, 2),
  location_match_score DECIMAL(3, 2),
  price_match_score DECIMAL(3, 2),
  instructor_quality_score DECIMAL(3, 2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_recommendation UNIQUE(user_id, training_program_id),
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX idx_training_recommendations_user_id ON training_recommendations(user_id);
CREATE INDEX idx_training_recommendations_training_program_id ON training_recommendations(training_program_id);
CREATE INDEX idx_training_recommendations_confidence_score ON training_recommendations(confidence_score DESC);
CREATE INDEX idx_training_recommendations_was_recommended_at ON training_recommendations(was_recommended_at DESC);
CREATE INDEX idx_training_recommendations_was_viewed ON training_recommendations(was_viewed);

-- ============================================================================
-- 4. TRAINING ENROLLMENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,

  -- Enrollment Details
  enrollment_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  status training_enrollment_status DEFAULT 'enrolled' NOT NULL,

  -- Progress
  completion_date TIMESTAMPTZ,
  completion_percentage INT DEFAULT 0,
  progress_notes TEXT,

  -- Performance
  passed BOOLEAN,
  certification_earned TEXT,
  depth_achieved INT,

  -- Session Attendance
  sessions_attended INT DEFAULT 0,
  sessions_missed INT DEFAULT 0,

  -- Payment
  payment_status TEXT DEFAULT 'pending',
  amount_paid DECIMAL(10, 2),

  -- Feedback
  student_feedback TEXT,
  student_rating INT,
  instructor_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_enrollment UNIQUE(user_id, training_program_id),
  CONSTRAINT valid_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT valid_rating CHECK (student_rating IS NULL OR (student_rating >= 1 AND student_rating <= 5))
);

CREATE INDEX idx_training_enrollments_user_id ON training_enrollments(user_id);
CREATE INDEX idx_training_enrollments_training_program_id ON training_enrollments(training_program_id);
CREATE INDEX idx_training_enrollments_status ON training_enrollments(status);
CREATE INDEX idx_training_enrollments_enrollment_date ON training_enrollments(enrollment_date DESC);
CREATE INDEX idx_training_enrollments_passed ON training_enrollments(passed);

-- ============================================================================
-- 5. DEPTH PROGRESSION RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS depth_progression_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule Configuration
  from_level training_depth_level NOT NULL,
  to_level training_depth_level NOT NULL,

  -- Requirements
  min_depth_achievement INT NOT NULL,
  min_trainings_required INT DEFAULT 1,
  min_hours_required INT DEFAULT 4,
  min_days_between_training INT DEFAULT 0,
  certifications_required TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Progression Details
  description TEXT,
  training_programs_available TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_progression UNIQUE(from_level, to_level),
  CONSTRAINT valid_requirements CHECK (min_depth_achievement > 0 AND min_trainings_required >= 1)
);

CREATE INDEX idx_depth_progression_rules_from_level ON depth_progression_rules(from_level);
CREATE INDEX idx_depth_progression_rules_to_level ON depth_progression_rules(to_level);

-- ============================================================================
-- 6. TRAINING FEEDBACK TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feedback
  overall_rating INT NOT NULL,
  instructor_rating INT,
  safety_rating INT,
  content_quality_rating INT,
  comment TEXT,

  -- Experience
  comfortable_with_depth BOOLEAN,
  would_recommend BOOLEAN,
  improvements_needed TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_feedback UNIQUE(training_program_id, user_id),
  CONSTRAINT valid_rating CHECK (overall_rating >= 1 AND overall_rating <= 5),
  CONSTRAINT valid_instructor_rating CHECK (instructor_rating IS NULL OR (instructor_rating >= 1 AND instructor_rating <= 5)),
  CONSTRAINT valid_safety_rating CHECK (safety_rating IS NULL OR (safety_rating >= 1 AND safety_rating <= 5)),
  CONSTRAINT valid_content_rating CHECK (content_quality_rating IS NULL OR (content_quality_rating >= 1 AND content_quality_rating <= 5))
);

CREATE INDEX idx_training_feedback_training_program_id ON training_feedback(training_program_id);
CREATE INDEX idx_training_feedback_user_id ON training_feedback(user_id);
CREATE INDEX idx_training_feedback_overall_rating ON training_feedback(overall_rating);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update timestamp function
CREATE TRIGGER trigger_update_training_programs_timestamp
BEFORE UPDATE ON training_programs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_user_training_progress_timestamp
BEFORE UPDATE ON user_training_progress
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_training_recommendations_timestamp
BEFORE UPDATE ON training_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_training_enrollments_timestamp
BEFORE UPDATE ON training_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_depth_progression_rules_timestamp
BEFORE UPDATE ON depth_progression_rules
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_training_feedback_timestamp
BEFORE UPDATE ON training_feedback
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Function to get next recommended training level
CREATE OR REPLACE FUNCTION get_next_training_level(p_user_id UUID)
RETURNS training_depth_level AS $$
DECLARE
  v_current_level training_depth_level;
  v_depth_achieved INT;
  v_next_level training_depth_level;
BEGIN
  -- Get user's current level and depth
  SELECT current_level, depth_achieved_meters
  INTO v_current_level, v_depth_achieved
  FROM user_training_progress
  WHERE user_id = p_user_id;

  -- If no progress record, return beginner
  IF v_current_level IS NULL THEN
    RETURN 'beginner'::training_depth_level;
  END IF;

  -- Check progression rules to suggest next level
  SELECT to_level
  INTO v_next_level
  FROM depth_progression_rules
  WHERE from_level = v_current_level
  AND min_depth_achievement <= v_depth_achieved
  AND is_active = TRUE
  LIMIT 1;

  -- If progression possible, return next level; otherwise return current level
  RETURN COALESCE(v_next_level, v_current_level);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate training recommendation score
CREATE OR REPLACE FUNCTION calculate_recommendation_score(
  p_user_id UUID,
  p_training_program_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  v_depth_match DECIMAL(3, 2);
  v_experience_match DECIMAL(3, 2);
  v_location_match DECIMAL(3, 2);
  v_price_match DECIMAL(3, 2);
  v_quality_match DECIMAL(3, 2);
  v_final_score DECIMAL(3, 2);
  v_user_depth INT;
  v_user_level training_depth_level;
  v_user_location TEXT;
  v_program_depth_min INT;
  v_program_depth_max INT;
  v_program_level training_depth_level;
  v_program_location TEXT;
  v_program_price DECIMAL(10, 2);
  v_program_rating DECIMAL(3, 2);
BEGIN
  -- Get user progress
  SELECT depth_achieved_meters, current_level, preferred_location
  INTO v_user_depth, v_user_level, v_user_location
  FROM user_training_progress
  WHERE user_id = p_user_id;

  -- Get training program details
  SELECT depth_min_meters, depth_max_meters, depth_level, location, price_shekel, average_rating
  INTO v_program_depth_min, v_program_depth_max, v_program_level, v_program_location, v_program_price, v_program_rating
  FROM training_programs
  WHERE id = p_training_program_id;

  -- Calculate depth match (0-1)
  IF v_user_depth BETWEEN v_program_depth_min AND v_program_depth_max THEN
    v_depth_match := 1.0;
  ELSIF v_user_depth < v_program_depth_min THEN
    v_depth_match := GREATEST(0.0, (v_program_depth_min::DECIMAL - v_user_depth::DECIMAL) / 40.0);
  ELSE
    v_depth_match := 0.5; -- Already too deep, lower score
  END IF;

  -- Calculate experience match (0-1)
  CASE
    WHEN v_user_level = 'beginner' AND v_program_level = 'beginner' THEN v_experience_match := 1.0;
    WHEN v_user_level = 'beginner' AND v_program_level IN ('intermediate', 'advanced', 'expert') THEN v_experience_match := 0.0;
    WHEN v_user_level = 'intermediate' AND v_program_level IN ('beginner', 'intermediate') THEN v_experience_match := 1.0;
    WHEN v_user_level = 'intermediate' AND v_program_level IN ('advanced', 'expert') THEN v_experience_match := 0.3;
    WHEN v_user_level = 'advanced' AND v_program_level IN ('beginner', 'intermediate') THEN v_experience_match := 0.1;
    WHEN v_user_level = 'advanced' AND v_program_level IN ('advanced', 'expert') THEN v_experience_match := 1.0;
    WHEN v_user_level = 'expert' AND v_program_level = 'expert' THEN v_experience_match := 1.0;
    ELSE v_experience_match := 0.5;
  END CASE;

  -- Calculate location match (0-1)
  IF v_user_location IS NOT NULL AND v_program_location ILIKE '%' || v_user_location || '%' THEN
    v_location_match := 1.0;
  ELSIF v_user_location IS NOT NULL THEN
    v_location_match := 0.6; -- Moderate match if locations differ
  ELSE
    v_location_match := 0.8; -- No preference set, still good
  END IF;

  -- Calculate price match (0-1) - prefer moderate prices
  IF v_program_price BETWEEN 500 AND 2000 THEN
    v_price_match := 1.0;
  ELSIF v_program_price < 500 THEN
    v_price_match := 0.8;
  ELSE
    v_price_match := 0.6;
  END IF;

  -- Quality match based on instructor rating
  v_quality_match := COALESCE(v_program_rating, 0.0) / 5.0;

  -- Calculate final score (weighted average)
  v_final_score := (
    (v_depth_match * 0.3) +
    (v_experience_match * 0.25) +
    (v_location_match * 0.15) +
    (v_price_match * 0.15) +
    (v_quality_match * 0.15)
  );

  RETURN ROUND(v_final_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get training recommendations for user
CREATE OR REPLACE FUNCTION get_training_recommendations(p_user_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE(
  training_program_id UUID,
  program_name TEXT,
  instructor_name TEXT,
  depth_level training_depth_level,
  confidence_score DECIMAL,
  reason TEXT,
  price_shekel DECIMAL,
  location TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.id,
    tp.name,
    (SELECT full_name FROM auth.users au WHERE au.id = fi.user_id) as instructor_name,
    tp.depth_level,
    calculate_recommendation_score(p_user_id, tp.id) as confidence_score,
    'Recommended based on your training level and depth progression'::TEXT as reason,
    tp.price_shekel,
    tp.location
  FROM training_programs tp
  JOIN freediving_instructors fi ON tp.instructor_id = fi.id
  WHERE tp.is_active = TRUE
  AND tp.status = 'active'
  AND fi.is_verified = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM training_enrollments te
    WHERE te.user_id = p_user_id
    AND te.training_program_id = tp.id
    AND te.status != 'cancelled'
  )
  ORDER BY calculate_recommendation_score(p_user_id, tp.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent booking above current level
CREATE OR REPLACE FUNCTION check_training_level_eligibility(p_user_id UUID, p_training_program_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_level training_depth_level;
  v_program_level training_depth_level;
  v_user_depth INT;
  v_program_depth_min INT;
  v_progression_allowed BOOLEAN;
BEGIN
  -- Get user's current level
  SELECT current_level, depth_achieved_meters
  INTO v_user_level, v_user_depth
  FROM user_training_progress
  WHERE user_id = p_user_id;

  -- If no progress, default to beginner
  IF v_user_level IS NULL THEN
    v_user_level := 'beginner'::training_depth_level;
    v_user_depth := 0;
  END IF;

  -- Get program level and depth requirements
  SELECT depth_level, depth_min_meters
  INTO v_program_level, v_program_depth_min
  FROM training_programs
  WHERE id = p_training_program_id;

  -- Check if progression is allowed
  SELECT EXISTS(
    SELECT 1 FROM depth_progression_rules
    WHERE from_level = v_user_level
    AND to_level = v_program_level
    AND min_depth_achievement <= v_user_depth
    AND is_active = TRUE
  ) INTO v_progression_allowed;

  -- User can only book at same level or if progression is allowed
  RETURN v_user_level = v_program_level OR v_progression_allowed;
END;
$$ LANGUAGE plpgsql;

-- Function to update training program enrollment count
CREATE OR REPLACE FUNCTION update_program_enrollment(p_training_program_id UUID)
RETURNS VOID AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM training_enrollments
  WHERE training_program_id = p_training_program_id
  AND status IN ('enrolled', 'in_progress');

  UPDATE training_programs
  SET current_enrollment = v_count
  WHERE id = p_training_program_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update enrollment count on enrollment changes
CREATE OR REPLACE FUNCTION trigger_update_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_program_enrollment(NEW.training_program_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_training_enrollments_update_count
AFTER INSERT OR UPDATE OR DELETE ON training_enrollments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_enrollment_count();

-- Function to auto-generate recommendation when user completes training
CREATE OR REPLACE FUNCTION auto_generate_training_recommendations(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_next_level training_depth_level;
  v_rec RECORD;
BEGIN
  -- Get next recommended level
  v_next_level := get_next_training_level(p_user_id);

  -- Find trainings for next level and insert recommendations
  FOR v_rec IN
    SELECT id
    FROM training_programs
    WHERE depth_level = v_next_level
    AND is_active = TRUE
    AND status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM training_recommendations
      WHERE user_id = p_user_id
      AND training_program_id = training_programs.id
    )
    LIMIT 5
  LOOP
    INSERT INTO training_recommendations (user_id, training_program_id, reason, confidence_score)
    VALUES (
      p_user_id,
      v_rec.id,
      'Recommended for your next depth progression level',
      calculate_recommendation_score(p_user_id, v_rec.id)
    )
    ON CONFLICT (user_id, training_program_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update user level based on depth achieved
CREATE OR REPLACE FUNCTION update_user_training_level(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_depth INT;
  v_new_level training_depth_level;
BEGIN
  -- Get max depth achieved
  SELECT MAX(depth_achieved)
  INTO v_depth
  FROM training_enrollments
  WHERE user_id = p_user_id
  AND passed = TRUE;

  -- Determine level based on depth
  CASE
    WHEN v_depth >= 40 THEN v_new_level := 'expert'::training_depth_level;
    WHEN v_depth >= 25 THEN v_new_level := 'advanced'::training_depth_level;
    WHEN v_depth >= 10 THEN v_new_level := 'intermediate'::training_depth_level;
    ELSE v_new_level := 'beginner'::training_depth_level;
  END CASE;

  -- Update user progress
  UPDATE user_training_progress
  SET
    current_level = v_new_level,
    depth_achieved_meters = COALESCE(v_depth, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE depth_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TRAINING PROGRAMS POLICIES
-- ============================================================================

-- Public can view active training programs
CREATE POLICY "Anyone can view active training programs"
  ON training_programs
  FOR SELECT
  USING (is_active = TRUE AND status = 'active');

-- Instructors can view their own programs
CREATE POLICY "Instructors can view own programs"
  ON training_programs
  FOR SELECT
  USING (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- Instructors can create programs
CREATE POLICY "Instructors can create programs"
  ON training_programs
  FOR INSERT
  WITH CHECK (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- Instructors can update their programs
CREATE POLICY "Instructors can update own programs"
  ON training_programs
  FOR UPDATE
  USING (
    instructor_id IN (
      SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- USER TRAINING PROGRESS POLICIES
-- ============================================================================

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
  ON user_training_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their progress record
CREATE POLICY "Users can create own progress"
  ON user_training_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their progress
CREATE POLICY "Users can update own progress"
  ON user_training_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRAINING RECOMMENDATIONS POLICIES
-- ============================================================================

-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
  ON training_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can create/update recommendations
CREATE POLICY "System can manage recommendations"
  ON training_recommendations
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- TRAINING ENROLLMENTS POLICIES
-- ============================================================================

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments"
  ON training_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Instructors can view enrollments for their programs
CREATE POLICY "Instructors can view program enrollments"
  ON training_enrollments
  FOR SELECT
  USING (
    training_program_id IN (
      SELECT id FROM training_programs
      WHERE instructor_id IN (
        SELECT id FROM freediving_instructors WHERE user_id = auth.uid()
      )
    )
  );

-- Users can enroll in programs
CREATE POLICY "Users can enroll in programs"
  ON training_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their enrollments
CREATE POLICY "Users can update own enrollments"
  ON training_enrollments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DEPTH PROGRESSION RULES POLICIES
-- ============================================================================

-- Everyone can view progression rules
CREATE POLICY "Anyone can view progression rules"
  ON depth_progression_rules
  FOR SELECT
  USING (is_active = TRUE);

-- ============================================================================
-- TRAINING FEEDBACK POLICIES
-- ============================================================================

-- Anyone can view feedback
CREATE POLICY "Anyone can view training feedback"
  ON training_feedback
  FOR SELECT
  USING (TRUE);

-- Users can create feedback for trainings they completed
CREATE POLICY "Users can create training feedback"
  ON training_feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM training_enrollments
      WHERE user_id = auth.uid()
      AND training_program_id = training_feedback.training_program_id
      AND status = 'completed'
    )
  );

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON training_feedback
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_next_training_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_recommendation_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_training_recommendations(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_training_level_eligibility(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_program_enrollment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_training_recommendations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_training_level(UUID) TO authenticated;
