-- Create dive_logs table
CREATE TABLE IF NOT EXISTS dive_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  dive_plan_id UUID REFERENCES dive_plans(id) ON DELETE SET NULL,
  buddy_id UUID REFERENCES users(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Dive details
  dive_number INT NOT NULL,
  dive_date DATE NOT NULL,
  dive_time_start TIME,
  dive_time_end TIME,
  duration_minutes INT DEFAULT 0 NOT NULL,
  surface_interval_minutes INT DEFAULT 0,

  -- Depth and pressure
  max_depth_reached INT DEFAULT 0 NOT NULL,
  average_depth INT DEFAULT 0 NOT NULL,
  surface_pressure INT DEFAULT 0,
  starting_pressure INT DEFAULT 0,
  ending_pressure INT DEFAULT 0,

  -- Environment conditions
  water_temperature INT DEFAULT 0 NOT NULL,
  water_visibility INT DEFAULT 0,
  water_type TEXT DEFAULT 'saltwater' NOT NULL,
  weather_conditions TEXT DEFAULT 'fair',
  current_strength TEXT DEFAULT 'none',
  sea_state TEXT DEFAULT 'calm',
  waves_height INT DEFAULT 0,
  wind_speed INT DEFAULT 0,

  -- Equipment used
  tank_size INT DEFAULT 0,
  tank_type TEXT DEFAULT 'air',
  weights_used FLOAT DEFAULT 0,
  suit_type TEXT DEFAULT 'wetsuit',
  additional_equipment TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Dive type and activities
  dive_type TEXT DEFAULT 'recreational' NOT NULL,
  activities TEXT[] DEFAULT ARRAY[]::TEXT[],
  marine_life_observed TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Certification and training
  certified_during_dive BOOLEAN DEFAULT false NOT NULL,
  certification_type TEXT DEFAULT '',
  training_during_dive BOOLEAN DEFAULT false NOT NULL,
  skill_practiced TEXT DEFAULT '',

  -- Experience
  difficulty_felt TEXT DEFAULT 'easy' NOT NULL,
  enjoyment_rating INT DEFAULT 5 NOT NULL,
  anxiety_level INT DEFAULT 1 NOT NULL,

  -- Safety
  incidents_during_dive BOOLEAN DEFAULT false NOT NULL,
  incidents_description TEXT DEFAULT '',
  medical_reaction_post_dive BOOLEAN DEFAULT false NOT NULL,
  decompression_stops_made INT DEFAULT 0,
  safety_stops_made INT DEFAULT 0,

  -- Log details
  detailed_notes TEXT DEFAULT '',
  photos_count INT DEFAULT 0 NOT NULL,
  video_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Health and fitness
  fatigue_level INT DEFAULT 1 NOT NULL,
  stress_level INT DEFAULT 1 NOT NULL,
  post_dive_condition TEXT DEFAULT 'good',
  any_pain_or_discomfort BOOLEAN DEFAULT false NOT NULL,
  pain_or_discomfort_description TEXT DEFAULT '',

  -- Follow-up
  follow_up_needed BOOLEAN DEFAULT false NOT NULL,
  follow_up_notes TEXT DEFAULT '',

  -- Metadata
  is_public BOOLEAN DEFAULT false NOT NULL,
  is_favorite BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Check constraints for enums
  CONSTRAINT valid_water_type CHECK (water_type IN ('saltwater', 'freshwater', 'brackish')),
  CONSTRAINT valid_tank_type CHECK (tank_type IN ('air', 'nitrox', 'trimix', 'other')),
  CONSTRAINT valid_dive_type CHECK (dive_type IN ('recreational', 'training', 'work', 'technical')),
  CONSTRAINT valid_difficulty_felt CHECK (difficulty_felt IN ('easy', 'moderate', 'challenging', 'difficult')),
  CONSTRAINT valid_post_dive_condition CHECK (post_dive_condition IN ('good', 'fair', 'poor', 'emergency')),
  CONSTRAINT valid_enjoyment CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5),
  CONSTRAINT valid_anxiety CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  CONSTRAINT valid_fatigue CHECK (fatigue_level >= 1 AND fatigue_level <= 10),
  CONSTRAINT valid_stress CHECK (stress_level >= 1 AND stress_level <= 10),
  CONSTRAINT valid_duration CHECK (duration_minutes >= 0)
);

-- Create index on user_id for fast user dive lookups
CREATE INDEX dive_logs_user_id_idx ON dive_logs(user_id);

-- Create index on dive_site_id for site statistics
CREATE INDEX dive_logs_dive_site_id_idx ON dive_logs(dive_site_id);

-- Create index on dive_date for chronological queries
CREATE INDEX dive_logs_dive_date_idx ON dive_logs(dive_date DESC);

-- Create index on buddy_id for social features
CREATE INDEX dive_logs_buddy_id_idx ON dive_logs(buddy_id);

-- Enable RLS
ALTER TABLE dive_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own dive logs
CREATE POLICY "View own dive logs"
  ON dive_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view public dive logs from other users
CREATE POLICY "View public dive logs"
  ON dive_logs FOR SELECT
  USING (is_public AND auth.role() = 'authenticated');

-- Policy: Users can insert their own dive logs
CREATE POLICY "Create own dive logs"
  ON dive_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own dive logs
CREATE POLICY "Update own dive logs"
  ON dive_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
