-- ============================================================================
-- DIVE DROP Dive Site Feedback Card System - Database Schema
-- Feedback tables, aggregated conditions cache, and storage policies
-- Created: 2026-06-20
-- ============================================================================

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================
-- Stores diver feedback on dive conditions at specific dive sites and bookings
-- Each feedback record is associated with one booking and one dive site
-- Includes water conditions, marine life observations, and optional photos

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys (required)
  dive_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  diver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,

  -- Water Conditions (all required, validated with CHECK constraints)
  visibility_meters NUMERIC NOT NULL CHECK (visibility_meters >= 0 AND visibility_meters <= 50),
  temperature_celsius NUMERIC NOT NULL CHECK (temperature_celsius >= 5 AND temperature_celsius <= 40),
  current_strength NUMERIC NOT NULL CHECK (current_strength >= 0 AND current_strength <= 10),

  -- Marine Life & Observations
  marine_life TEXT[] NOT NULL DEFAULT '{}',
  marine_life_custom TEXT,
  notes TEXT NOT NULL CHECK (LENGTH(notes) <= 300),

  -- Images (client enforces max 3 files, 2MB each, JPEG/PNG only)
  image_urls TEXT[] NOT NULL DEFAULT '{}',

  -- Timestamps
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraint: Ensure at least one observation (either marine_life or notes)
  CONSTRAINT has_observation CHECK (
    ARRAY_LENGTH(marine_life, 1) > 0 OR LENGTH(notes) > 0
  )
);

-- ============================================================================
-- FEEDBACK INDEXES
-- ============================================================================
-- Optimize queries for dive site conditions and diver feedback history

CREATE INDEX idx_feedback_dive_site_id ON feedback(dive_site_id);
CREATE INDEX idx_feedback_diver_id ON feedback(diver_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- ============================================================================
-- FEEDBACK ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS: Divers can only view and manage their own feedback
-- However, all users can view feedback for public condition aggregation

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- INSERT Policy: Authenticated users can only submit their own feedback
CREATE POLICY "Divers can submit own feedback" ON feedback
  FOR INSERT WITH CHECK (
    auth.uid() = diver_id
  );

-- SELECT Policy: Anyone can view all feedback (for public conditions display)
-- Performance note: Minimum 2 feedback entries required to display conditions (enforced in API aggregation layer)
CREATE POLICY "Anyone can view feedback" ON feedback
  FOR SELECT USING (true);

-- UPDATE Policy: Divers can update only their own feedback
CREATE POLICY "Divers can update own feedback" ON feedback
  FOR UPDATE USING (auth.uid() = diver_id);

-- DELETE Policy: Divers can delete only their own feedback
CREATE POLICY "Divers can delete own feedback" ON feedback
  FOR DELETE USING (auth.uid() = diver_id);

-- ============================================================================
-- AGGREGATED CONDITIONS CACHE TABLE
-- ============================================================================
-- Stores pre-computed daily aggregations of dive conditions by site
-- Used for fast retrieval of condition stats, updated via scheduled job
-- Minimum 2 feedback entries required to cache aggregation (enforced in API layer)
-- Cache TTL: 5 minutes (enforced in API layer, not DB)
-- Performance target: <2s with cache

CREATE TABLE IF NOT EXISTS aggregated_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to dive site (required)
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,

  -- Aggregation date (daily buckets)
  date DATE NOT NULL,

  -- Visibility Statistics (in meters)
  visibility_avg NUMERIC,
  visibility_min NUMERIC,
  visibility_max NUMERIC,

  -- Temperature Statistics (in Celsius)
  temperature_avg NUMERIC,

  -- Current Strength Statistics
  current_strength_avg NUMERIC,

  -- Marine Life Species Counts (JSONB for flexibility)
  -- Format: {"species_name": count, "species_name_2": count}
  species_counts JSONB NOT NULL DEFAULT '{}',

  -- Aggregation Metadata
  total_feedback_count INT NOT NULL,
  cached_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Unique constraint: One aggregation per site per day
  UNIQUE(dive_site_id, date)
);

-- ============================================================================
-- AGGREGATED CONDITIONS INDEXES
-- ============================================================================
-- Optimize queries for recent aggregations and site/date lookups

CREATE INDEX idx_aggregated_conditions_site_date ON aggregated_conditions(dive_site_id, date DESC);

-- ============================================================================
-- AGGREGATED CONDITIONS RLS
-- ============================================================================
-- SELECT Policy: Anyone can view public aggregations (used for condition display)

ALTER TABLE aggregated_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view aggregated conditions" ON aggregated_conditions
  FOR SELECT USING (true);

-- ============================================================================
-- STORAGE BUCKET: FEEDBACK_IMAGES
-- ============================================================================
-- Stores user-uploaded dive condition photos
-- Images served via signed URLs (not publicly accessible directly)
-- Client-side enforces: Max 3 files, 2MB each, JPEG/PNG only

-- Note: Storage bucket policies must be created via Supabase dashboard or
-- migrations tool that supports bucket operations. This is a placeholder comment.
--
-- Manual setup required in Supabase dashboard:
-- 1. Create bucket: "feedback_images"
-- 2. Make public: false (use signed URLs)
-- 3. Policy: Users upload to auth.uid()::text folder
--    - Create policy for INSERT on "feedback_images"
--    - Expression: bucket_id = 'feedback_images' AND auth.uid()::text = (STRING_TO_ARRAY(name, '/'))[1]
-- 4. Policy: All authenticated users can view
--    - Create policy for SELECT on "feedback_images"
--    - Expression: bucket_id = 'feedback_images'

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE feedback IS 'Diver feedback on dive conditions at specific sites and bookings';
COMMENT ON COLUMN feedback.visibility_meters IS 'Water visibility in meters (0-50m range)';
COMMENT ON COLUMN feedback.temperature_celsius IS 'Water temperature in Celsius (5-40C range)';
COMMENT ON COLUMN feedback.current_strength IS 'Current strength rating (0-10 scale)';
COMMENT ON COLUMN feedback.marine_life IS 'Array of observed marine species/taxonomies';
COMMENT ON COLUMN feedback.marine_life_custom IS 'Free-form text for unlisted species (max 500 chars enforced client-side)';
COMMENT ON COLUMN feedback.notes IS 'Feedback notes and observations (max 300 chars)';
COMMENT ON COLUMN feedback.image_urls IS 'Array of uploaded image URLs (max 3 images, 2MB each, JPEG/PNG enforced client-side)';

COMMENT ON TABLE aggregated_conditions IS 'Daily aggregation cache of dive conditions by site for fast retrieval';
COMMENT ON COLUMN aggregated_conditions.date IS 'Aggregation date (UTC)';
COMMENT ON COLUMN aggregated_conditions.species_counts IS 'JSONB map of species name to occurrence count across daily feedback';
COMMENT ON COLUMN aggregated_conditions.total_feedback_count IS 'Number of feedback entries included in this aggregation';
COMMENT ON COLUMN aggregated_conditions.cached_at IS 'Timestamp when aggregation was computed or last refreshed';

COMMENT ON INDEX idx_feedback_dive_site_id IS 'Speeds up condition queries for a specific dive site';
COMMENT ON INDEX idx_feedback_diver_id IS 'Speeds up feedback history queries for a specific diver';
COMMENT ON INDEX idx_feedback_created_at IS 'Speeds up chronological queries and daily aggregation jobs';
COMMENT ON INDEX idx_aggregated_conditions_site_date IS 'Optimizes recent aggregation lookups per site';

-- ============================================================================
-- GLOBAL CONSTRAINTS & NOTES
-- ============================================================================
--
-- Image Constraints (enforced in API layer, not DB):
--   - Max 3 files per feedback
--   - Max 2MB per file
--   - Supported formats: JPEG, PNG
--
-- Aggregation Constraints (enforced in API aggregation logic):
--   - Minimum 2 feedback entries required before displaying conditions
--   - Cache TTL: 5 minutes (API caching strategy)
--
-- Row-Level Security:
--   - Divers can only submit/edit/delete their own feedback
--   - All users can view feedback (enables public condition display)
--   - Aggregated conditions are always public
--
-- Performance Targets:
--   - Condition queries: <2 seconds with cache
--   - Feedback submission: <1 second
--   - Bulk aggregation job: <30 seconds for all sites daily
--

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary:
-- - Created feedback table with water conditions, observations, and images
-- - Added aggregated_conditions cache table for fast condition retrieval
-- - Implemented RLS policies for privacy and public access
-- - Added indexes for optimal query performance
-- - Storage bucket (feedback_images) requires manual setup in Supabase dashboard
-- - All constraints validated with CHECK clauses
-- - Ready for API integration (Tasks 3+)
--
