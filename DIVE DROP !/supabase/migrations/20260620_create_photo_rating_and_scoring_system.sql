-- ============================================================================
-- Photo Rating & Scoring System Migration
-- Created: 2026-06-20
-- Version: 1.0.0
--
-- This migration creates:
-- 1. user_photo_ratings: User ratings with comments
-- 2. photo_stats: Cached statistics for scoring
-- 3. photo_scores: Calculated scores for ranking
-- 4. Functions for scoring algorithm and stats calculation
-- 5. RLS policies for privacy
-- ============================================================================

-- ============================================================================
-- Table 1: user_photo_ratings
-- Stores individual user ratings and comments for photos
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_photo_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES user_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpfulness_count INTEGER DEFAULT 0, -- How many found this rating helpful
  is_verified_purchase BOOLEAN DEFAULT false, -- User has dived together
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Each user rates a photo only once
  UNIQUE(photo_id, user_id),

  -- Ensure user doesn't rate their own photo
  CONSTRAINT cannot_rate_own_photo CHECK (
    photo_id NOT IN (
      SELECT id FROM user_photos WHERE user_id = user_photo_ratings.user_id
    )
  )
);

-- Indexes for user_photo_ratings
CREATE INDEX user_photo_ratings_photo_id_idx ON user_photo_ratings(photo_id);
CREATE INDEX user_photo_ratings_user_id_idx ON user_photo_ratings(user_id);
CREATE INDEX user_photo_ratings_created_at_idx ON user_photo_ratings(created_at DESC);
CREATE INDEX user_photo_ratings_rating_idx ON user_photo_ratings(rating DESC);
CREATE INDEX user_photo_ratings_helpfulness_idx ON user_photo_ratings(helpfulness_count DESC);
CREATE INDEX user_photo_ratings_verified_idx ON user_photo_ratings(is_verified_purchase);

-- Enable RLS
ALTER TABLE user_photo_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: View all ratings (public)
CREATE POLICY "View all photo ratings"
  ON user_photo_ratings FOR SELECT
  USING (true);

-- Policy: Users can create their own ratings
CREATE POLICY "Create own rating"
  ON user_photo_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own ratings
CREATE POLICY "Update own rating"
  ON user_photo_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own ratings
CREATE POLICY "Delete own rating"
  ON user_photo_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can update ratings
CREATE POLICY "Admin manage ratings"
  ON user_photo_ratings FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Table 2: photo_stats
-- Cached statistics for photos (updated by cron job)
-- ============================================================================
CREATE TABLE IF NOT EXISTS photo_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL UNIQUE REFERENCES user_photos(id) ON DELETE CASCADE,

  -- Rating statistics
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  median_rating DECIMAL(3, 2) DEFAULT 0,

  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0, -- From photo ratings
  share_count INTEGER DEFAULT 0,

  -- Quality indicators
  quality_score DECIMAL(3, 2) DEFAULT 0, -- 0-1
  engagement_score DECIMAL(3, 2) DEFAULT 0, -- 0-1
  recency_score DECIMAL(3, 2) DEFAULT 0, -- 0-1

  -- Calculated score (for ranking)
  overall_score DECIMAL(3, 2) DEFAULT 0,

  -- Ranking percentile
  percentile_rank INTEGER DEFAULT 0, -- 0-100

  -- Metadata
  days_old INTEGER DEFAULT 0,
  verified_purchase_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for photo_stats
CREATE INDEX photo_stats_photo_id_idx ON photo_stats(photo_id);
CREATE INDEX photo_stats_overall_score_idx ON photo_stats(overall_score DESC);
CREATE INDEX photo_stats_avg_rating_idx ON photo_stats(avg_rating DESC);
CREATE INDEX photo_stats_engagement_score_idx ON photo_stats(engagement_score DESC);
CREATE INDEX photo_stats_recency_score_idx ON photo_stats(recency_score DESC);
CREATE INDEX photo_stats_view_count_idx ON photo_stats(view_count DESC);
CREATE INDEX photo_stats_last_calculated_at_idx ON photo_stats(last_calculated_at DESC);

-- Enable RLS
ALTER TABLE photo_stats ENABLE ROW LEVEL SECURITY;

-- Policy: View all stats
CREATE POLICY "View all photo stats"
  ON photo_stats FOR SELECT
  USING (true);

-- Policy: Only service role can update
CREATE POLICY "Admin update stats"
  ON photo_stats FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Table 3: photo_scores
-- Historical scores for tracking changes over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS photo_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES user_photos(id) ON DELETE CASCADE,

  -- Score components
  rating_score DECIMAL(3, 2) NOT NULL, -- 0-1
  recency_score DECIMAL(3, 2) NOT NULL, -- 0-1
  engagement_score DECIMAL(3, 2) NOT NULL, -- 0-1

  -- Final score
  total_score DECIMAL(3, 2) NOT NULL, -- 0-1

  -- Weights (configurable)
  rating_weight DECIMAL(3, 2) DEFAULT 0.4,
  recency_weight DECIMAL(3, 2) DEFAULT 0.3,
  engagement_weight DECIMAL(3, 2) DEFAULT 0.3,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX photo_scores_photo_id_idx ON photo_scores(photo_id);
CREATE INDEX photo_scores_total_score_idx ON photo_scores(total_score DESC);
CREATE INDEX photo_scores_calculated_at_idx ON photo_scores(calculated_at DESC);

-- Enable RLS
ALTER TABLE photo_scores ENABLE ROW LEVEL SECURITY;

-- Policy: View all scores
CREATE POLICY "View all photo scores"
  ON photo_scores FOR SELECT
  USING (true);

-- Policy: Only service role can manage
CREATE POLICY "Admin manage scores"
  ON photo_scores FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Table 4: photo_engagement_tracking
-- Track views, likes, shares (lightweight tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS photo_engagement_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES user_photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'like', 'unlike', 'share')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX photo_engagement_tracking_photo_id_idx ON photo_engagement_tracking(photo_id);
CREATE INDEX photo_engagement_tracking_event_type_idx ON photo_engagement_tracking(event_type);
CREATE INDEX photo_engagement_tracking_created_at_idx ON photo_engagement_tracking(created_at DESC);
CREATE INDEX photo_engagement_tracking_user_id_idx ON photo_engagement_tracking(user_id);

-- Enable RLS
ALTER TABLE photo_engagement_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert
CREATE POLICY "Log engagement"
  ON photo_engagement_tracking FOR INSERT
  WITH CHECK (true);

-- Policy: Users see their own
CREATE POLICY "View own engagement"
  ON photo_engagement_tracking FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- Function 1: calculate_recency_score
-- Calculates recency score (0-1) based on upload date
-- Max score (1.0) for photos uploaded in last 7 days
-- Min score (0.0) for photos older than 90 days
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_recency_score(
  created_timestamp TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  days_old INTEGER;
  score DECIMAL;
BEGIN
  days_old := EXTRACT(DAY FROM (now() - created_timestamp))::INTEGER;

  -- Linear decay: 1.0 at 0 days, 0.5 at 45 days, 0.0 at 90 days
  IF days_old <= 0 THEN
    score := 1.0;
  ELSIF days_old >= 90 THEN
    score := 0.0;
  ELSE
    score := (90 - days_old) / 90.0::DECIMAL;
  END IF;

  RETURN GREATEST(0, LEAST(1, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function 2: calculate_engagement_score
-- Calculates engagement score (0-1) based on views and interactions
-- Normalized to 0-1 scale using logarithmic distribution
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  total_interactions INTEGER;
  raw_score DECIMAL;
  normalized_score DECIMAL;
BEGIN
  total_interactions := view_count + (like_count * 5) + (comment_count * 10);

  -- Logarithmic scale: log10(interactions + 1) / 3 (normalized to 0-1)
  -- This means: 0 interactions = 0, 10 interactions = 0.33, 100 = 0.67, 1000 = 1.0
  IF total_interactions = 0 THEN
    normalized_score := 0;
  ELSE
    raw_score := LOG(total_interactions + 1) / LOG(10);
    normalized_score := raw_score / 3.0;
  END IF;

  RETURN GREATEST(0, LEAST(1, normalized_score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function 3: calculate_photo_score
-- Main scoring algorithm: combines rating, recency, and engagement
-- Score = (rating * 0.4) + (recency * 0.3) + (engagement * 0.3)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_photo_score(
  avg_rating DECIMAL,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  created_timestamp TIMESTAMPTZ
) RETURNS TABLE(
  rating_score DECIMAL,
  recency_score DECIMAL,
  engagement_score DECIMAL,
  total_score DECIMAL
) AS $$
DECLARE
  v_rating_score DECIMAL;
  v_recency_score DECIMAL;
  v_engagement_score DECIMAL;
  v_total_score DECIMAL;
BEGIN
  -- Normalize rating to 0-1 scale
  v_rating_score := COALESCE(avg_rating, 0) / 5.0;

  -- Calculate recency score
  v_recency_score := calculate_recency_score(created_timestamp);

  -- Calculate engagement score
  v_engagement_score := calculate_engagement_score(view_count, like_count, comment_count);

  -- Calculate total weighted score
  v_total_score := (v_rating_score * 0.4) + (v_recency_score * 0.3) + (v_engagement_score * 0.3);

  RETURN QUERY SELECT
    v_rating_score,
    v_recency_score,
    v_engagement_score,
    v_total_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function 4: update_photo_stats
-- Updates photo_stats table with current metrics and scores
-- This is called by the cron job daily
-- ============================================================================
CREATE OR REPLACE FUNCTION update_photo_stats(p_photo_id UUID DEFAULT NULL)
RETURNS TABLE(
  updated_count INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_photo_id UUID;
  v_avg_rating DECIMAL;
  v_rating_count INTEGER;
  v_median_rating DECIMAL;
  v_view_count INTEGER;
  v_like_count INTEGER;
  v_comment_count INTEGER;
  v_verified_count INTEGER;
  v_days_old INTEGER;
  v_score_row RECORD;
BEGIN
  -- If no specific photo, update all
  IF p_photo_id IS NULL THEN
    -- Update all photo stats
    WITH updated_photos AS (
      UPDATE photo_stats ps SET
        avg_rating = COALESCE((
          SELECT AVG(rating) FROM user_photo_ratings WHERE photo_id = ps.photo_id
        ), 0),
        rating_count = COALESCE((
          SELECT COUNT(*) FROM user_photo_ratings WHERE photo_id = ps.photo_id
        ), 0),
        median_rating = COALESCE((
          SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY rating)
          FROM user_photo_ratings WHERE photo_id = ps.photo_id
        ), 0),
        view_count = COALESCE((
          SELECT COUNT(*) FROM photo_engagement_tracking
          WHERE photo_id = ps.photo_id AND event_type = 'view'
        ), 0),
        like_count = COALESCE((
          SELECT COUNT(*) FROM photo_engagement_tracking
          WHERE photo_id = ps.photo_id AND event_type = 'like'
        ), 0),
        comment_count = COALESCE((
          SELECT COUNT(*) FROM user_photo_ratings WHERE photo_id = ps.photo_id AND comment IS NOT NULL
        ), 0),
        verified_purchase_count = COALESCE((
          SELECT COUNT(*) FROM user_photo_ratings
          WHERE photo_id = ps.photo_id AND is_verified_purchase = true
        ), 0),
        days_old = EXTRACT(DAY FROM (now() - up.created_at))::INTEGER,
        last_calculated_at = now(),
        updated_at = now()
      FROM user_photos up
      WHERE up.id = ps.photo_id
      RETURNING ps.id
    )
    SELECT COUNT(*)::INTEGER INTO updated_count FROM updated_photos;

    RETURN QUERY SELECT updated_count, NULL::TEXT;
  ELSE
    -- Update specific photo
    SELECT
      COALESCE(AVG(rating), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY rating), 0),
      COALESCE((SELECT COUNT(*) FROM photo_engagement_tracking WHERE photo_id = p_photo_id AND event_type = 'view'), 0),
      COALESCE((SELECT COUNT(*) FROM photo_engagement_tracking WHERE photo_id = p_photo_id AND event_type = 'like'), 0),
      COALESCE((SELECT COUNT(*) FROM user_photo_ratings WHERE photo_id = p_photo_id AND comment IS NOT NULL), 0),
      COALESCE((SELECT COUNT(*) FROM user_photo_ratings WHERE photo_id = p_photo_id AND is_verified_purchase = true), 0),
      EXTRACT(DAY FROM (now() - up.created_at))::INTEGER
    INTO
      v_avg_rating,
      v_rating_count,
      v_median_rating,
      v_view_count,
      v_like_count,
      v_comment_count,
      v_verified_count,
      v_days_old
    FROM user_photos up
    WHERE up.id = p_photo_id;

    -- Calculate scores
    SELECT * INTO v_score_row FROM calculate_photo_score(
      v_avg_rating,
      v_view_count,
      v_like_count,
      v_comment_count,
      (SELECT created_at FROM user_photos WHERE id = p_photo_id)
    );

    -- Update photo_stats
    UPDATE photo_stats SET
      avg_rating = v_avg_rating,
      rating_count = v_rating_count,
      median_rating = v_median_rating,
      view_count = v_view_count,
      like_count = v_like_count,
      comment_count = v_comment_count,
      verified_purchase_count = v_verified_count,
      quality_score = (v_score_row).rating_score,
      engagement_score = (v_score_row).engagement_score,
      recency_score = (v_score_row).recency_score,
      overall_score = (v_score_row).total_score,
      days_old = v_days_old,
      last_calculated_at = now(),
      updated_at = now()
    WHERE photo_id = p_photo_id;

    -- Insert score history
    INSERT INTO photo_scores(
      photo_id,
      rating_score,
      recency_score,
      engagement_score,
      total_score
    ) VALUES (
      p_photo_id,
      (v_score_row).rating_score,
      (v_score_row).recency_score,
      (v_score_row).engagement_score,
      (v_score_row).total_score
    );

    RETURN QUERY SELECT 1::INTEGER, NULL::TEXT;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 0::INTEGER, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function 5: calculate_percentile_ranks
-- Updates percentile ranks for all photos (for leaderboards)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_percentile_ranks()
RETURNS TABLE(
  updated_count INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  WITH ranked_photos AS (
    SELECT
      photo_id,
      ROUND(100 * ROW_NUMBER() OVER (ORDER BY overall_score ASC) / COUNT(*) OVER ())::INTEGER AS percentile
    FROM photo_stats
  )
  UPDATE photo_stats ps
  SET
    percentile_rank = rp.percentile,
    updated_at = now()
  FROM ranked_photos rp
  WHERE ps.photo_id = rp.photo_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN QUERY SELECT v_updated_count, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 0::INTEGER, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: Initialize photo_stats when photo is created
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_photo_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO photo_stats(photo_id)
  VALUES (NEW.id)
  ON CONFLICT (photo_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER init_photo_stats
AFTER INSERT ON user_photos
FOR EACH ROW
EXECUTE FUNCTION initialize_photo_stats();

-- ============================================================================
-- Trigger: Update timestamp on user_photo_ratings
-- ============================================================================
CREATE OR REPLACE FUNCTION update_rating_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();

  -- Update parent photo stats after rating change
  PERFORM update_photo_stats(NEW.photo_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_rating_timestamp
BEFORE UPDATE ON user_photo_ratings
FOR EACH ROW
EXECUTE FUNCTION update_rating_timestamp();

CREATE TRIGGER record_rating_change
AFTER INSERT OR UPDATE OR DELETE ON user_photo_ratings
FOR EACH ROW
EXECUTE FUNCTION update_rating_timestamp();

-- ============================================================================
-- Trigger: Track engagement (views, likes)
-- ============================================================================
CREATE OR REPLACE FUNCTION on_engagement_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update photo stats after engagement
  PERFORM update_photo_stats(NEW.photo_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_engagement_tracked
AFTER INSERT ON photo_engagement_tracking
FOR EACH ROW
EXECUTE FUNCTION on_engagement_change();

-- ============================================================================
-- Create views for common queries
-- ============================================================================

-- Top rated photos
CREATE OR REPLACE VIEW top_rated_photos AS
SELECT
  ps.photo_id,
  up.caption,
  ps.avg_rating,
  ps.rating_count,
  ps.view_count,
  ps.overall_score,
  ps.percentile_rank,
  up.user_id,
  up.created_at
FROM photo_stats ps
JOIN user_photos up ON ps.photo_id = up.id
WHERE up.status = 'approved'
ORDER BY ps.avg_rating DESC, ps.rating_count DESC
LIMIT 100;

-- Most viewed photos
CREATE OR REPLACE VIEW most_viewed_photos AS
SELECT
  ps.photo_id,
  up.caption,
  ps.view_count,
  ps.avg_rating,
  ps.overall_score,
  ps.percentile_rank,
  up.user_id,
  up.created_at
FROM photo_stats ps
JOIN user_photos up ON ps.photo_id = up.id
WHERE up.status = 'approved'
ORDER BY ps.view_count DESC
LIMIT 100;

-- Top scoring photos (for rotation/homepage)
CREATE OR REPLACE VIEW top_scoring_photos AS
SELECT
  ps.photo_id,
  up.caption,
  ps.overall_score,
  ps.avg_rating,
  ps.view_count,
  ps.engagement_score,
  ps.recency_score,
  ps.percentile_rank,
  up.user_id,
  up.created_at,
  up.file_url
FROM photo_stats ps
JOIN user_photos up ON ps.photo_id = up.id
WHERE up.status = 'approved' AND ps.overall_score > 0
ORDER BY ps.overall_score DESC
LIMIT 100;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT SELECT ON user_photo_ratings TO anon;
GRANT SELECT ON photo_stats TO anon;
GRANT SELECT ON photo_scores TO anon;
GRANT SELECT ON photo_engagement_tracking TO anon;

GRANT ALL ON user_photo_ratings TO authenticated;
GRANT SELECT ON photo_stats TO authenticated;
GRANT SELECT ON photo_scores TO authenticated;
GRANT INSERT ON photo_engagement_tracking TO authenticated;
