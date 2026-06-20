-- ============================================================================
-- SCHEMA OPTIMIZATION MIGRATION
-- Comprehensive database optimization: indexes, normalization, and performance
-- Created: 2026-06-27
-- ============================================================================

-- ============================================================================
-- PART 1: MISSING INDEXES FOR CRITICAL QUERIES
-- ============================================================================

-- Users table: Add missing indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_certified_level
  ON users(certified, certification_level)
  WHERE certified = true;

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_experience_level
  ON users(experience_level);

-- Profiles table: Composite indexes for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_certified_experience
  ON profiles(certified, experience_level)
  WHERE certified = true;

CREATE INDEX IF NOT EXISTS idx_profiles_updated_at
  ON profiles(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_privacy_level
  ON profiles(privacy_level)
  WHERE privacy_level = 'public';

-- Dive logs table: Critical for user history and reporting
CREATE INDEX IF NOT EXISTS idx_dive_logs_user_dive_site
  ON dive_logs(user_id, dive_site_id);

CREATE INDEX IF NOT EXISTS idx_dive_logs_dive_site_date
  ON dive_logs(dive_site_id, dive_date DESC);

CREATE INDEX IF NOT EXISTS idx_dive_logs_is_public
  ON dive_logs(is_public)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_dive_logs_instructor_id
  ON dive_logs(instructor_id);

-- Dive sites table: Optimize geographic and filtering queries
CREATE INDEX IF NOT EXISTS idx_dive_sites_region_country
  ON dive_sites(region, country);

CREATE INDEX IF NOT EXISTS idx_dive_sites_difficulty_rating
  ON dive_sites(difficulty_level, avg_rating DESC);

CREATE INDEX IF NOT EXISTS idx_dive_sites_suitability
  ON dive_sites(suitability_beginner, suitability_intermediate, suitability_advanced);

-- Bookings table: Essential for booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_diver_status
  ON bookings(diver_1_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_diver_2_status
  ON bookings(diver_2_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_date
  ON bookings(provider_id, booking_date DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_dive_site_date
  ON bookings(dive_site_id, booking_date);

-- Service providers table: Marketplace queries
CREATE INDEX IF NOT EXISTS idx_service_providers_verified_active
  ON service_providers(verified, is_active)
  WHERE verified = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_providers_business_type_active
  ON service_providers(business_type, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_providers_created_at
  ON service_providers(created_at DESC);

-- Services table: Service discovery
CREATE INDEX IF NOT EXISTS idx_services_provider_active
  ON services(provider_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_services_category_active
  ON services(service_category, is_active)
  WHERE is_active = true;

-- Feedback table: Aggregation and history queries
CREATE INDEX IF NOT EXISTS idx_feedback_dive_site_created
  ON feedback(dive_site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_diver_created
  ON feedback(diver_id, created_at DESC);

-- Aggregated conditions: Cache lookups
CREATE INDEX IF NOT EXISTS idx_aggregated_conditions_site_recent
  ON aggregated_conditions(dive_site_id, date DESC);

-- Equipment listings: Marketplace queries
CREATE INDEX IF NOT EXISTS idx_equipment_listings_type_active
  ON equipment_listings(equipment_type, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_equipment_listings_owner_active
  ON equipment_listings(owner_id, is_active);

-- Equipment rentals: Rental queries
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_lister_status
  ON equipment_rentals(lister_id, status);

CREATE INDEX IF NOT EXISTS idx_equipment_rentals_renter_status
  ON equipment_rentals(renter_id, status);

CREATE INDEX IF NOT EXISTS idx_equipment_rentals_rental_period
  ON equipment_rentals(rental_start, rental_end);

-- ============================================================================
-- PART 2: IMPROVE RLS POLICY PERFORMANCE
-- ============================================================================

-- Create helper function for service provider lookup (used in RLS)
-- This reduces N+1 queries by materializing the relationship check
CREATE OR REPLACE FUNCTION get_provider_user_id(provider_id UUID)
RETURNS UUID AS $$
  SELECT user_id FROM service_providers WHERE id = provider_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Add index to support the function
CREATE INDEX IF NOT EXISTS idx_service_providers_id_user
  ON service_providers(id, user_id);

-- ============================================================================
-- PART 3: CASCADE DELETE IMPROVEMENTS
-- ============================================================================

-- Verify and update cascade deletes for data integrity
-- These ensure orphaned records are automatically cleaned up

-- Note: Existing cascade deletes are good, but we'll ensure they're optimal:
-- - users -> dive_logs (already ON DELETE CASCADE)
-- - users -> profiles (already ON DELETE CASCADE)
-- - dive_sites -> dive_logs (ON DELETE SET NULL - might want CASCADE for some cases)
-- - service_providers -> services (already ON DELETE CASCADE)
-- - bookings -> booking_items (already ON DELETE CASCADE)
-- - bookings -> booking_messages (already ON DELETE CASCADE)

-- If you want to hard-delete dive logs when a user deletes their account,
-- ensure the constraint is CASCADE. To change existing constraint:
-- ALTER TABLE dive_logs
--   DROP CONSTRAINT dive_logs_dive_site_id_fkey,
--   ADD CONSTRAINT dive_logs_dive_site_id_fkey
--     FOREIGN KEY (dive_site_id) REFERENCES dive_sites(id) ON DELETE CASCADE;

-- ============================================================================
-- PART 4: OPTIMIZE FREQUENTLY JOINED TABLES
-- ============================================================================

-- Create materialized view for dive site statistics (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dive_site_stats AS
SELECT
  ds.id,
  ds.name,
  COUNT(DISTINCT dl.id) as total_dives,
  COUNT(DISTINCT dl.user_id) as unique_divers,
  AVG(CAST(dl.max_depth_reached as NUMERIC)) as avg_max_depth,
  AVG(CAST(dl.enjoyment_rating as NUMERIC)) as avg_enjoyment,
  MIN(dl.dive_date) as first_dive_date,
  MAX(dl.dive_date) as last_dive_date,
  ds.avg_rating,
  ds.review_count
FROM dive_sites ds
LEFT JOIN dive_logs dl ON ds.id = dl.dive_site_id
GROUP BY ds.id, ds.name, ds.avg_rating, ds.review_count;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_dive_site_stats_id
  ON mv_dive_site_stats(id);

CREATE INDEX IF NOT EXISTS idx_mv_dive_site_stats_total_dives
  ON mv_dive_site_stats(total_dives DESC);

-- Create materialized view for provider performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_provider_metrics AS
SELECT
  sp.id,
  sp.user_id,
  sp.business_name,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
  ROUND(COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END)::numeric /
        NULLIF(COUNT(DISTINCT b.id), 0) * 100, 2) as completion_rate,
  AVG(CAST(pr.rating as NUMERIC)) as avg_rating,
  COUNT(DISTINCT pr.id) as review_count,
  sp.verified,
  sp.is_active
FROM service_providers sp
LEFT JOIN bookings b ON sp.id = b.provider_id
LEFT JOIN provider_reviews pr ON sp.id = pr.provider_id
GROUP BY sp.id, sp.user_id, sp.business_name, sp.verified, sp.is_active;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_provider_metrics_id
  ON mv_provider_metrics(id);

CREATE INDEX IF NOT EXISTS idx_mv_provider_metrics_completion_rate
  ON mv_provider_metrics(completion_rate DESC);

-- ============================================================================
-- PART 5: PARTITIONING STRATEGY FOR LARGE TABLES
-- ============================================================================

-- NOTE: PostgreSQL in Supabase supports table partitioning
-- For very large tables (millions of rows), consider partitioning by time
-- Example for dive_logs (if it grows very large):
--
-- ALTER TABLE dive_logs
-- PARTITION BY RANGE (YEAR(dive_date));
--
-- CREATE TABLE dive_logs_2024 PARTITION OF dive_logs
--   FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
--
-- This improves query performance and maintenance for time-series data
-- Only implement if table exceeds 10M+ rows

-- ============================================================================
-- PART 6: ADD COMPUTED COLUMNS (if supported in your version)
-- ============================================================================

-- For PostgreSQL 12+, computed columns can help with common calculations
-- Example: Add a computed diver_level based on total_dives and certifications
-- Note: These are read-only and automatically calculated

-- This requires PostgreSQL 12+. If your Supabase version supports it:
-- ALTER TABLE users ADD COLUMN diver_level TEXT GENERATED ALWAYS AS (
--   CASE
--     WHEN total_dives < 10 THEN 'novice'
--     WHEN total_dives < 50 THEN 'recreational'
--     WHEN total_dives < 200 THEN 'experienced'
--     ELSE 'expert'
--   END
-- ) STORED;

-- ============================================================================
-- PART 7: VACUUM AND ANALYZE
-- ============================================================================

-- Run maintenance on indexed tables
-- Note: These are typically run automatically by Postgres, but manual runs
-- can improve performance after bulk operations

-- VACUUM ANALYZE users;
-- VACUUM ANALYZE dive_logs;
-- VACUUM ANALYZE dive_sites;
-- VACUUM ANALYZE bookings;
-- VACUUM ANALYZE service_providers;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_users_certified_level IS
  'Optimizes queries filtering for certified divers at specific levels';

COMMENT ON INDEX idx_dive_logs_user_dive_site IS
  'Enables fast lookups of user dives at specific sites (join optimization)';

COMMENT ON INDEX idx_bookings_diver_status IS
  'Critical for booking history queries filtering by status';

COMMENT ON MATERIALIZED VIEW mv_dive_site_stats IS
  'Pre-computed dive site statistics (refresh hourly via cron job)';

COMMENT ON MATERIALIZED VIEW mv_provider_metrics IS
  'Pre-computed provider performance metrics (refresh every 30 minutes)';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Summary of changes:
-- 1. Added 25+ strategic indexes covering common query patterns
-- 2. Created 2 materialized views for frequently accessed aggregates
-- 3. Added helper function for RLS optimization
-- 4. Documented cascade delete strategy
-- 5. Provided partitioning guidance for future scaling
--
-- Next Steps:
-- - Set up cron jobs to refresh materialized views (Tasks in separate migration)
-- - Monitor query performance using EXPLAIN ANALYZE
-- - Remove unused indexes after 30 days of monitoring
-- - Schedule regular VACUUM ANALYZE runs
-- ============================================================================
