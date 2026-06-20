-- ============================================================================
-- PERFORMANCE MONITORING QUERIES FOR SUPABASE OPTIMIZATION
-- Use these to track performance improvements after migrations
-- ============================================================================

-- ============================================================================
-- SECTION 1: INDEX MONITORING
-- ============================================================================

-- Show all custom indexes with their usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as "Index Scans",
    idx_tup_read as "Tuples Read",
    idx_tup_fetch as "Tuples Fetched",
    pg_size_pretty(pg_relation_size(indexrelid)) as "Index Size",
    ROUND(100.0 * idx_tup_fetch / NULLIF(idx_tup_read, 0), 2) as "Fetch/Read Ratio"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes (candidates for removal after 30 days)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as "Index Size",
    idx_scan as "Scans",
    ROUND(100.0 * pg_relation_size(indexrelid) /
        pg_total_relation_size(relid), 2) as "% of Table Size"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Indexes with high maintenance cost (many writes, few reads)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_blks_read as "Blocks Read",
    idx_blks_hit as "Blocks Hit",
    idx_scan as "Index Scans",
    pg_size_pretty(pg_relation_size(indexrelid)) as "Size",
    ROUND(100.0 * idx_blks_hit / NULLIF(idx_blks_read + idx_blks_hit, 0), 2) as "Hit Ratio"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND (idx_blks_read + idx_blks_hit) > 0
ORDER BY idx_blks_read DESC;

-- ============================================================================
-- SECTION 2: TABLE MONITORING
-- ============================================================================

-- Monitor table sizes and growth
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Total Size",
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as "Table Size",
    n_live_tup as "Live Tuples",
    n_dead_tup as "Dead Tuples",
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) as "Dead %",
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Show table bloat and maintenance needs
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Size",
    n_live_tup as "Rows",
    CASE
        WHEN n_dead_tup = 0 THEN 'Clean'
        WHEN 100.0 * n_dead_tup / NULLIF(n_live_tup, 0) > 50 THEN 'NEEDS VACUUM'
        WHEN 100.0 * n_dead_tup / NULLIF(n_live_tup, 0) > 20 THEN 'High bloat'
        ELSE 'Normal'
    END as "Status"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_live_tup > 1000
ORDER BY n_dead_tup DESC;

-- ============================================================================
-- SECTION 3: MATERIALIZED VIEW MONITORING
-- ============================================================================

-- Track materialized view sizes and refresh status
SELECT
    matviewname,
    pg_size_pretty(pg_total_relation_size(matviewname::regclass)) as "View Size",
    CASE
        WHEN pg_total_relation_size(matviewname::regclass) > 10485760 THEN 'Large (>10MB)'
        WHEN pg_total_relation_size(matviewname::regclass) > 1048576 THEN 'Medium (>1MB)'
        ELSE 'Small (<1MB)'
    END as "Size Category"
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(matviewname::regclass) DESC;

-- Check cache metadata for refresh schedule
SELECT
    cache_name,
    refresh_frequency,
    last_refreshed,
    ROUND(EXTRACT(EPOCH FROM (NOW() - last_refreshed)) / 60, 1) as "Minutes Since Refresh",
    next_scheduled_refresh,
    CASE
        WHEN last_refreshed IS NULL THEN 'Never refreshed'
        WHEN NOW() > next_scheduled_refresh THEN '⚠️ OVERDUE'
        ELSE '✓ On schedule'
    END as "Status"
FROM cache_metadata
ORDER BY last_refreshed DESC;

-- ============================================================================
-- SECTION 4: RLS POLICY MONITORING
-- ============================================================================

-- Show all RLS policies with effectiveness
SELECT
    tablename,
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'Has filter' ELSE 'No filter' END as "Type",
    permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check RLS policy configuration
SELECT
    relname as tablename,
    relrowsecurity,
    relforcerowsecurity,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_class.relname) as policy_count
FROM pg_class
WHERE relkind = 'r'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND relname NOT LIKE 'pg_%'
ORDER BY relname;

-- ============================================================================
-- SECTION 5: AUDIT LOG MONITORING
-- ============================================================================

-- Monitor audit log growth
SELECT
    COUNT(*) as "Total Audit Entries",
    COUNT(DISTINCT user_id) as "Unique Users",
    COUNT(DISTINCT table_name) as "Tables Audited",
    COUNT(DISTINCT operation) as "Operation Types",
    DATE(MIN(changed_at)) as "First Entry",
    DATE(MAX(changed_at)) as "Last Entry",
    ROUND((EXTRACT(EPOCH FROM MAX(changed_at) - MIN(changed_at)) / 3600), 1) as "Hours of Data"
FROM audit_logs;

-- Audit log activity by table
SELECT
    table_name,
    operation,
    COUNT(*) as "Count",
    COUNT(DISTINCT user_id) as "Unique Users",
    MIN(changed_at) as "First Change",
    MAX(changed_at) as "Most Recent"
FROM audit_logs
GROUP BY table_name, operation
ORDER BY COUNT(*) DESC;

-- Audit log performance impact
SELECT
    pg_size_pretty(pg_total_relation_size('audit_logs')) as "Audit Log Size",
    COUNT(*) as "Total Entries",
    ROUND(pg_total_relation_size('audit_logs')::numeric / NULLIF(COUNT(*), 0), 0) as "Bytes Per Entry"
FROM audit_logs;

-- ============================================================================
-- SECTION 6: QUERY PERFORMANCE BASELINE
-- ============================================================================

-- Critical query 1: User profile statistics (should use mv_user_stats)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, username, total_dives, max_depth_achieved, avg_enjoyment
FROM mv_user_stats
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Critical query 2: Dive site discovery (should use indexes)
EXPLAIN (ANALYZE, BUFFERS)
SELECT ds.id, ds.name, COUNT(dl.id) as dives
FROM dive_sites ds
LEFT JOIN dive_logs dl ON ds.id = dl.dive_site_id
WHERE ds.difficulty_level = 'intermediate'
GROUP BY ds.id, ds.name
ORDER BY dives DESC LIMIT 20;

-- Critical query 3: Booking history (should use idx_bookings_diver_status)
EXPLAIN (ANALYZE, BUFFERS)
SELECT b.id, b.status, b.booking_date
FROM bookings b
WHERE diver_1_id = '00000000-0000-0000-0000-000000000000'
ORDER BY booking_date DESC LIMIT 20;

-- Critical query 4: Service provider search (should use mv_service_provider_stats or indexes)
EXPLAIN (ANALYZE, BUFFERS)
SELECT sp.business_name, COUNT(DISTINCT b.id) as bookings
FROM service_providers sp
LEFT JOIN bookings b ON sp.id = b.provider_id
WHERE sp.is_active = true
GROUP BY sp.id, sp.business_name
ORDER BY bookings DESC LIMIT 20;

-- ============================================================================
-- SECTION 7: PERFORMANCE TRENDS
-- ============================================================================

-- Create a simple performance trend tracking query
-- Run this periodically (daily/weekly) to track improvements
SELECT
    NOW()::DATE as measurement_date,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM dive_logs) as total_dives,
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan > 0) as active_indexes,
    (SELECT ROUND(AVG(idx_scan)) FROM pg_stat_user_indexes WHERE schemaname = 'public') as avg_index_scans,
    (SELECT SUM(idx_scan) FROM pg_stat_user_indexes WHERE schemaname = 'public') as total_index_scans,
    (SELECT COUNT(*) FROM audit_logs) as total_audit_entries;

-- ============================================================================
-- SECTION 8: RECOMMENDATIONS QUERIES
-- ============================================================================

-- Find tables that need VACUUM
SELECT
    schemaname,
    tablename,
    n_live_tup as "Live Rows",
    n_dead_tup as "Dead Rows",
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) as "Bloat %",
    CASE
        WHEN 100.0 * n_dead_tup / NULLIF(n_live_tup, 0) > 30 THEN '⚠️ VACUUM NOW'
        WHEN 100.0 * n_dead_tup / NULLIF(n_live_tup, 0) > 15 THEN 'Schedule VACUUM'
        ELSE 'OK'
    END as "Recommendation"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_live_tup > 1000
ORDER BY n_dead_tup DESC;

-- Find missing indexes (tables with many sequential scans)
SELECT
    schemaname,
    tablename,
    seq_scan as "Sequential Scans",
    seq_tup_read as "Rows Read",
    CASE
        WHEN seq_scan > 100 AND seq_tup_read > 100000 THEN '⚠️ Consider indexing'
        WHEN seq_scan > 50 THEN 'Review query patterns'
        ELSE 'OK'
    END as "Recommendation"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- ============================================================================
-- SECTION 9: DASHBOARD SUMMARY
-- ============================================================================

-- Quick health check summary
SELECT
    'Indexes' as "Category",
    COUNT(*)::text as "Count",
    'Target: 25+' as "Target"
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'

UNION ALL

SELECT
    'Materialized Views',
    COUNT(*)::text,
    'Target: 7'
FROM pg_matviews
WHERE schemaname = 'public'

UNION ALL

SELECT
    'RLS Policies',
    COUNT(*)::text,
    'Target: 25+'
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Audit Entries',
    COUNT(*)::text,
    'Growing with activity'
FROM audit_logs

UNION ALL

SELECT
    'Active Index Scans',
    COUNT(*)::text,
    'Shows index usage'
FROM pg_stat_user_indexes
WHERE idx_scan > 0 AND schemaname = 'public';

-- ============================================================================
-- SECTION 10: EXPORT FOR MONITORING SYSTEMS
-- ============================================================================

-- Format for logging/monitoring systems (JSON-compatible output)
SELECT
    jsonb_build_object(
        'timestamp', NOW(),
        'indexes_total', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'),
        'indexes_unused', (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0),
        'materialized_views', (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public'),
        'rls_policies', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'),
        'audit_log_entries', (SELECT COUNT(*) FROM audit_logs),
        'cache_metadata_updated', (SELECT MAX(last_refreshed) FROM cache_metadata),
        'total_database_size', (SELECT pg_size_pretty(pg_database_size(current_database()))),
        'largest_table', (
            SELECT jsonb_build_object(
                'name', tablename,
                'size', pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
            )
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 1
        )
    ) as "monitoring_data";

-- ============================================================================
-- SECTION 11: BENCHMARKING TEMPLATE
-- ============================================================================

-- Use these templates to benchmark before/after improvements

-- Benchmark 1: User stats lookup
WITH start_time AS (
    SELECT now() as time
)
SELECT
    (SELECT time FROM start_time) as test_start,
    NOW() as test_end,
    EXTRACT(EPOCH FROM (NOW() - (SELECT time FROM start_time))) as duration_seconds
FROM mv_user_stats
WHERE id = '00000000-0000-0000-0000-000000000000'
LIMIT 1;

-- Benchmark 2: Dive log aggregation
WITH start_time AS (
    SELECT now() as time
)
SELECT
    COUNT(*) as total_dives,
    (SELECT time FROM start_time) as test_start,
    NOW() as test_end,
    EXTRACT(EPOCH FROM (NOW() - (SELECT time FROM start_time))) as duration_seconds
FROM dive_logs
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- NOTES FOR MONITORING
-- ============================================================================
--
-- Run these queries periodically:
-- - Daily: Section 2 (table monitoring) and Section 7 (trends)
-- - Weekly: Sections 1-6 for full health check
-- - As needed: Section 8 (recommendations)
--
-- Key metrics to track:
-- 1. Index scan counts (should be increasing for new indexes)
-- 2. Materialized view refresh times (should be <5 seconds)
-- 3. Audit log growth (normal with activity)
-- 4. Query execution times (should decrease)
-- 5. Dead tuple percentage (should stay <20%)
--
-- Alert conditions:
-- - Index scans = 0 after 1 week (unused index)
-- - Dead tuples > 30% (need VACUUM)
-- - Sequential scans >> index scans (missing index)
-- - Cache metadata next_scheduled_refresh < NOW() (overdue refresh)
--

-- ============================================================================
-- END OF PERFORMANCE MONITORING SCRIPT
-- ============================================================================
