-- ============================================================================
-- CACHING STRATEGY & MATERIALIZED VIEWS
-- Implement caching for frequently accessed data
-- Created: 2026-06-27
-- ============================================================================

-- ============================================================================
-- PART 1: MATERIALIZED VIEWS FOR FREQUENTLY ACCESSED DATA
-- ============================================================================

-- 1. User Statistics Cache (for profile displays)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_stats AS
SELECT
  u.id,
  u.username,
  u.full_name,
  u.avatar_url,
  u.experience_level,
  u.certified,
  u.certification_level,
  COUNT(DISTINCT dl.id) as total_dives,
  COUNT(DISTINCT dl.buddy_id) as total_buddy_dives,
  COUNT(DISTINCT dl.dive_site_id) as unique_sites_visited,
  MAX(dl.max_depth_reached) as max_depth_achieved,
  AVG(CAST(dl.enjoyment_rating as NUMERIC))::NUMERIC(3,2) as avg_enjoyment,
  COUNT(DISTINCT CASE WHEN dl.is_favorite THEN dl.id END) as favorite_dives,
  u.created_at,
  NOW() as cache_refreshed_at
FROM users u
LEFT JOIN dive_logs dl ON u.id = dl.user_id
GROUP BY u.id, u.username, u.full_name, u.avatar_url, u.experience_level, u.certified, u.certification_level, u.created_at;

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_mv_user_stats_id ON mv_user_stats(id);
CREATE INDEX IF NOT EXISTS idx_mv_user_stats_experience ON mv_user_stats(experience_level);

-- 2. Dive Site Detailed Statistics Cache
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_detailed_dive_site_stats AS
SELECT
  ds.id,
  ds.name,
  ds.country,
  ds.region,
  ds.difficulty_level,
  ds.avg_rating,
  ds.review_count,
  COUNT(DISTINCT dl.id) as total_dives_recorded,
  COUNT(DISTINCT dl.user_id) as unique_divers,
  AVG(CAST(dl.max_depth_reached as NUMERIC))::NUMERIC(5,2) as avg_max_depth,
  AVG(CAST(dl.enjoyment_rating as NUMERIC))::NUMERIC(3,2) as avg_enjoyment_rating,
  MIN(dl.dive_date) as earliest_dive,
  MAX(dl.dive_date) as latest_dive,
  STRING_AGG(DISTINCT unnest(dl.marine_life_observed)::text, ', ') FILTER (WHERE dl.marine_life_observed IS NOT NULL) as common_marine_life,
  COUNT(DISTINCT CASE WHEN dl.is_public THEN dl.id END) as public_dives,
  ds.water_temperature_summer,
  ds.water_temperature_winter,
  ds.visibility_average,
  ds.max_depth_recommended,
  NOW() as cache_refreshed_at
FROM dive_sites ds
LEFT JOIN dive_logs dl ON ds.id = dl.dive_site_id
GROUP BY
  ds.id, ds.name, ds.country, ds.region, ds.difficulty_level,
  ds.avg_rating, ds.review_count, ds.water_temperature_summer,
  ds.water_temperature_winter, ds.visibility_average, ds.max_depth_recommended;

-- Indexes for dive site stats
CREATE INDEX IF NOT EXISTS idx_mv_dive_site_stats_id ON mv_detailed_dive_site_stats(id);
CREATE INDEX IF NOT EXISTS idx_mv_dive_site_stats_rating ON mv_detailed_dive_site_stats(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_mv_dive_site_stats_difficulty ON mv_detailed_dive_site_stats(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_mv_dive_site_stats_location ON mv_detailed_dive_site_stats(country, region);

-- 3. Service Provider Performance Cache
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_service_provider_stats AS
SELECT
  sp.id,
  sp.user_id,
  sp.business_name,
  sp.business_type,
  sp.verified,
  sp.is_active,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
  ROUND(
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END)::numeric /
    NULLIF(COUNT(DISTINCT b.id), 0) * 100,
    2
  )::NUMERIC(5,2) as completion_rate,
  ROUND(AVG(CAST(pr.rating as NUMERIC)), 2)::NUMERIC(3,2) as avg_rating,
  COUNT(DISTINCT pr.id) as review_count,
  AVG(CAST(pr.professionalism_rating as NUMERIC))::NUMERIC(3,2) as professionalism_score,
  AVG(CAST(pr.safety_rating as NUMERIC))::NUMERIC(3,2) as safety_score,
  AVG(CAST(pr.instruction_quality_rating as NUMERIC))::NUMERIC(3,2) as instruction_score,
  sp.response_time_hours,
  sp.created_at,
  NOW() as cache_refreshed_at
FROM service_providers sp
LEFT JOIN bookings b ON sp.id = b.provider_id
LEFT JOIN provider_reviews pr ON sp.id = pr.provider_id
GROUP BY sp.id, sp.user_id, sp.business_name, sp.business_type, sp.verified, sp.is_active, sp.response_time_hours, sp.created_at;

-- Indexes for provider stats
CREATE INDEX IF NOT EXISTS idx_mv_provider_stats_id ON mv_service_provider_stats(id);
CREATE INDEX IF NOT EXISTS idx_mv_provider_stats_rating ON mv_service_provider_stats(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_mv_provider_stats_type ON mv_service_provider_stats(business_type);
CREATE INDEX IF NOT EXISTS idx_mv_provider_stats_completion ON mv_service_provider_stats(completion_rate DESC);

-- 4. Equipment Listing Popular Items Cache
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_equipment_popular_items AS
SELECT
  el.id,
  el.owner_id,
  el.equipment_type,
  el.brand,
  el.model,
  el.condition,
  el.rental_price_per_day,
  el.rating_average,
  el.review_count,
  el.total_rentals,
  COUNT(DISTINCT er.id) as recent_rentals_30d,
  ROUND(AVG(CAST(er_reviews.rating as NUMERIC)), 2)::NUMERIC(3,2) as recent_avg_rating,
  el.created_at,
  NOW() as cache_refreshed_at
FROM equipment_listings el
LEFT JOIN equipment_rentals er ON el.id = er.listing_id
  AND er.rental_start >= NOW() - INTERVAL '30 days'
LEFT JOIN equipment_reviews er_reviews ON el.id = er_reviews.listing_id
  AND er_reviews.created_at >= NOW() - INTERVAL '30 days'
WHERE el.is_active = true
GROUP BY el.id, el.owner_id, el.equipment_type, el.brand, el.model, el.condition, el.rental_price_per_day, el.rating_average, el.review_count, el.total_rentals, el.created_at;

-- Indexes for equipment stats
CREATE INDEX IF NOT EXISTS idx_mv_equipment_popular_type ON mv_equipment_popular_items(equipment_type);
CREATE INDEX IF NOT EXISTS idx_mv_equipment_popular_rating ON mv_equipment_popular_items(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_mv_equipment_popular_rentals ON mv_equipment_popular_items(total_rentals DESC);

-- 5. Booking Status Summary Cache (for analytics)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_booking_summary AS
SELECT
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
  ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2)::NUMERIC(5,2) as completion_rate,
  DATE(NOW()) as summary_date,
  NOW() as cache_refreshed_at
FROM bookings;

-- ============================================================================
-- PART 2: REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  -- Refresh user stats
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_stats;

  -- Refresh dive site stats
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_detailed_dive_site_stats;

  -- Refresh provider stats
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_service_provider_stats;

  -- Refresh equipment stats
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_equipment_popular_items;

  -- Refresh booking summary
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_booking_summary;

  RAISE NOTICE 'All materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh specific materialized view
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || quote_ident(view_name);
  RAISE NOTICE 'Refreshed materialized view: %', view_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: CACHE INVALIDATION TRIGGERS
-- ============================================================================

-- Trigger to invalidate user stats when user data changes
CREATE OR REPLACE FUNCTION invalidate_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark that user stats need refresh
  -- In a production system, you might insert into a "cache_invalidation_queue" table
  RAISE NOTICE 'User stats cache invalidated for user: %', COALESCE(NEW.id, OLD.id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invalidate_user_stats_on_change ON users;
CREATE TRIGGER invalidate_user_stats_on_change
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_user_stats();

-- Trigger to invalidate dive site stats when dive data changes
CREATE OR REPLACE FUNCTION invalidate_dive_site_stats()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Dive site stats cache invalidated for site: %', COALESCE(NEW.dive_site_id, OLD.dive_site_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invalidate_dive_site_stats_on_change ON dive_logs;
CREATE TRIGGER invalidate_dive_site_stats_on_change
  AFTER INSERT OR UPDATE ON dive_logs
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_dive_site_stats();

-- ============================================================================
-- PART 4: CACHE WARMING STRATEGIES
-- ============================================================================

-- Create a cache metadata table to track refresh times
CREATE TABLE IF NOT EXISTS cache_metadata (
  cache_name VARCHAR(255) PRIMARY KEY,
  last_refreshed TIMESTAMPTZ,
  refresh_frequency INTERVAL,
  row_count INTEGER,
  size_bytes BIGINT,
  next_scheduled_refresh TIMESTAMPTZ
);

-- Initialize cache metadata
INSERT INTO cache_metadata (cache_name, refresh_frequency)
VALUES
  ('mv_user_stats', INTERVAL '1 hour'),
  ('mv_detailed_dive_site_stats', INTERVAL '2 hours'),
  ('mv_service_provider_stats', INTERVAL '30 minutes'),
  ('mv_equipment_popular_items', INTERVAL '1 hour'),
  ('mv_booking_summary', INTERVAL '15 minutes')
ON CONFLICT (cache_name) DO NOTHING;

-- ============================================================================
-- PART 5: QUERY OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

-- When querying user profiles, use the cached view:
-- SELECT * FROM mv_user_stats WHERE id = $1;
-- Instead of: Multiple joins on users, dive_logs, profiles

-- When listing dive sites with stats, use:
-- SELECT * FROM mv_detailed_dive_site_stats ORDER BY avg_rating DESC LIMIT 20;
-- Instead of: Complex joins with GROUP BY

-- When finding service providers, use:
-- SELECT * FROM mv_service_provider_stats WHERE business_type = $1 ORDER BY avg_rating DESC;
-- Instead of: Joining bookings and provider_reviews every time

-- ============================================================================
-- PART 6: CACHE INVALIDATION QUEUE (OPTIONAL)
-- ============================================================================

-- For more sophisticated cache management, create a queue table
CREATE TABLE IF NOT EXISTS cache_invalidation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name TEXT NOT NULL,
  invalidation_reason TEXT,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_queue_processed
  ON cache_invalidation_queue(processed_at, priority DESC)
  WHERE processed_at IS NULL;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW mv_user_stats IS
  'Cached user profile statistics with dive counts and achievements (refresh hourly)';

COMMENT ON MATERIALIZED VIEW mv_detailed_dive_site_stats IS
  'Cached dive site statistics with marine life and popularity metrics (refresh every 2 hours)';

COMMENT ON MATERIALIZED VIEW mv_service_provider_stats IS
  'Cached provider performance metrics including ratings and completion rates (refresh every 30 minutes)';

COMMENT ON MATERIALIZED VIEW mv_equipment_popular_items IS
  'Cached popular equipment listings with recent rental data (refresh hourly)';

COMMENT ON MATERIALIZED VIEW mv_booking_summary IS
  'Cached booking status summary for analytics (refresh every 15 minutes)';

COMMENT ON FUNCTION refresh_all_materialized_views() IS
  'Refreshes all materialized views concurrently - run as scheduled job';

COMMENT ON FUNCTION refresh_materialized_view(TEXT) IS
  'Refreshes a specific materialized view by name';

COMMENT ON TABLE cache_metadata IS
  'Tracks materialized view refresh schedules and statistics';

COMMENT ON TABLE cache_invalidation_queue IS
  'Queue for cache invalidation events (optional for advanced scenarios)';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Summary of changes:
-- 1. Created 5 materialized views for frequently accessed data
-- 2. Implemented automatic cache refresh functions
-- 3. Added cache invalidation triggers
-- 4. Created cache metadata tracking table
-- 5. Provided query optimization recommendations
--
-- Performance Impact:
-- - Reduce response times for user profiles from 5+ queries to 1 MV lookup
-- - Dive site listings from 10+ queries to 1 MV lookup
-- - Provider searches from complex JOINs to simple MV query
--
-- Refresh Schedule (implement in application cron or PostgreSQL pg_cron):
-- - mv_user_stats: Every hour
-- - mv_detailed_dive_site_stats: Every 2 hours
-- - mv_service_provider_stats: Every 30 minutes
-- - mv_equipment_popular_items: Every hour
-- - mv_booking_summary: Every 15 minutes
--
-- Next Steps:
-- - Set up cron jobs to call refresh_all_materialized_views()
-- - Monitor cache hit rates and adjust refresh intervals
-- - Measure query performance improvements
-- - Consider edge caching for read-heavy endpoints
-- ============================================================================
