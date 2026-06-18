-- Create dive_sites table
CREATE TABLE IF NOT EXISTS dive_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  location_latitude FLOAT NOT NULL,
  location_longitude FLOAT NOT NULL,
  address TEXT DEFAULT '',
  difficulty_level TEXT DEFAULT 'intermediate' NOT NULL,
  max_depth_recommended INT DEFAULT 40 NOT NULL,
  average_depth INT DEFAULT 20 NOT NULL,
  water_temperature_summer INT DEFAULT 24 NOT NULL,
  water_temperature_winter INT DEFAULT 15 NOT NULL,
  visibility_average INT DEFAULT 15 NOT NULL,
  water_type TEXT DEFAULT 'saltwater' NOT NULL,
  marine_life TEXT[] DEFAULT ARRAY[]::TEXT[],
  notable_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  access_type TEXT DEFAULT 'boat' NOT NULL,
  entry_fee FLOAT DEFAULT 0 NOT NULL,
  accessibility_rating INT DEFAULT 3 NOT NULL,
  best_season_start INT DEFAULT 1,
  best_season_end INT DEFAULT 12,
  currents_rating INT DEFAULT 2,
  suitability_beginner BOOLEAN DEFAULT true NOT NULL,
  suitability_intermediate BOOLEAN DEFAULT true NOT NULL,
  suitability_advanced BOOLEAN DEFAULT true NOT NULL,
  facilities TEXT[] DEFAULT ARRAY[]::TEXT[],
  nearby_services TEXT[] DEFAULT ARRAY[]::TEXT[],
  emergency_facilities BOOLEAN DEFAULT true NOT NULL,
  decompression_required BOOLEAN DEFAULT false NOT NULL,
  night_diving_available BOOLEAN DEFAULT false NOT NULL,
  wreck_diving BOOLEAN DEFAULT false NOT NULL,
  cave_diving BOOLEAN DEFAULT false NOT NULL,
  wall_diving BOOLEAN DEFAULT false NOT NULL,
  coral_rating INT DEFAULT 4,
  avg_rating FLOAT DEFAULT 0 NOT NULL,
  review_count INT DEFAULT 0 NOT NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  hazard_notes TEXT DEFAULT '',
  special_instructions TEXT DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Check constraints for enums
  CONSTRAINT valid_difficulty CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  CONSTRAINT valid_water_type CHECK (water_type IN ('saltwater', 'freshwater', 'brackish')),
  CONSTRAINT valid_access_type CHECK (access_type IN ('shore', 'boat', 'shore_and_boat')),
  CONSTRAINT valid_rating CHECK (avg_rating >= 0 AND avg_rating <= 5),
  CONSTRAINT valid_visibility CHECK (visibility_average >= 0),
  CONSTRAINT valid_depth CHECK (max_depth_recommended > 0 AND average_depth > 0 AND average_depth <= max_depth_recommended)
);

-- Create index on location for geographic queries
CREATE INDEX dive_sites_location_idx ON dive_sites(location_latitude, location_longitude);

-- Create index on difficulty_level for filtering
CREATE INDEX dive_sites_difficulty_idx ON dive_sites(difficulty_level);

-- Create index on country for location browsing
CREATE INDEX dive_sites_country_idx ON dive_sites(country);

-- Create index on rating for sorting popular sites
CREATE INDEX dive_sites_rating_idx ON dive_sites(avg_rating DESC);

-- Enable RLS
ALTER TABLE dive_sites ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view dive sites
CREATE POLICY "View all dive sites"
  ON dive_sites FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert dive sites
CREATE POLICY "Create dive sites"
  ON dive_sites FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own dive sites
CREATE POLICY "Update own dive sites"
  ON dive_sites FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
