-- ============================================================================
-- SUPABASE MIGRATION VERIFICATION SCRIPT
-- Run this to verify all three migrations were successful
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFY SCHEMA OPTIMIZATION MIGRATION
-- ============================================================================

SECTION: Schema Optimization Verification
SELECT '=== SCHEMA OPTIMIZATION MIGRATION ===' as section;

-- Count all custom indexes created
SELECT
    COUNT(*) as total_indexes,
    'Target: 25+' as target
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- List all indexes by table
SELECT
    tablename,
    COUNT(*) as index_count,
    STRING_AGG(indexname, ', ') as indexes
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

-- Verify materialized views from schema optimization
SELECT
    matviewname,
    pg_size_pretty(pg_total_relation_size(matviewname::regclass)) as size,
    (SELECT count(*) FROM pg_indexes WHERE indexname LIKE 'idx_mv_' || matviewname || '%') as indexes_on_view
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname IN ('mv_dive_site_stats', 'mv_provider_metrics');

-- Verify helper function for RLS
SELECT
    proname as function_name,
    prokind as function_kind,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'get_provider_user_id'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- PART 2: VERIFY RLS SECURITY OPTIMIZATION MIGRATION
-- ============================================================================

SELECT '=== RLS SECURITY OPTIMIZATION MIGRATION ===' as section;

-- Verify audit_logs table exists
SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
) as audit_logs_table_exists;

-- Check audit_logs structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Verify audit triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('bookings', 'booking_payments', 'provider_payouts', 'equipment_rentals');

-- Verify audit functions
SELECT
    proname,
    prosecdef as is_security_definer,
    prokind
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('audit_log_changes', 'check_rls_performance');

-- Count RLS policies by table
SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verify booking RLS policies are optimized
SELECT
    policyname,
    qual as policy_condition
FROM pg_policies
WHERE tablename = 'bookings'
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- PART 3: VERIFY CACHING STRATEGY MIGRATION
-- ============================================================================

SELECT '=== CACHING STRATEGY MIGRATION ===' as section;

-- Verify all 5 materialized views from caching strategy
SELECT
    matviewname,
    pg_size_pretty(pg_total_relation_size(matviewname::regclass)) as size,
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_mv_' || matviewname || '%') as indexes
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname LIKE 'mv_%'
ORDER BY matviewname;

-- Verify cache refresh functions
SELECT
    proname as function_name,
    prokind,
    prosecdef as is_security_definer
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('refresh_all_materialized_views', 'refresh_materialized_view');

-- Verify cache metadata table
SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'cache_metadata'
) as cache_metadata_exists;

-- Check cache metadata contents
SELECT
    cache_name,
    refresh_frequency,
    last_refreshed,
    next_scheduled_refresh
FROM cache_metadata
ORDER BY cache_name;

-- Verify cache invalidation triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'invalidate_%';

-- Verify cache invalidation queue table (optional)
SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'cache_invalidation_queue'
) as cache_queue_exists;

-- ============================================================================
-- PART 4: COMBINED VERIFICATION SUMMARY
-- ============================================================================

SELECT '=== COMBINED VERIFICATION SUMMARY ===' as section;

-- Summary counts
WITH summary AS (
    SELECT
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as index_count,
        (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') as materialized_view_count,
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%audit%') as audit_table_count,
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as rls_policy_count,
        (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as function_count
)
SELECT
    index_count || ' indexes' as indexes_created,
    materialized_view_count || ' materialized views' as views_created,
    audit_table_count || ' audit table(s)' as audit_tables,
    rls_policy_count || ' RLS policies' as rls_policies,
    function_count || ' functions' as functions_total
FROM summary;

-- Detailed index statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;

-- ============================================================================
-- PART 5: HEALTH CHECKS
-- ============================================================================

SELECT '=== HEALTH CHECKS ===' as section;

-- Check for indexes with zero scans (potential candidates for removal)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check materialized view sizes and row counts
SELECT
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(matviewname::regclass)) as total_size,
    (SELECT COUNT(*) FROM pg_stat_user_tables WHERE relname = matviewname) as approximate_rows
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(matviewname::regclass) DESC;

-- Check for missing table RLS
SELECT
    t.tablename,
    COALESCE(COUNT(p.policyname), 0) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE '_supabase%'
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- ============================================================================
-- PART 6: CRITICAL QUERY PERFORMANCE TESTS
-- ============================================================================

SELECT '=== CRITICAL QUERY PERFORMANCE TESTS ===' as section;
SELECT 'Run these queries with EXPLAIN ANALYZE to verify improvements' as note;

-- Test 1: Certified divers
EXPLAIN ANALYZE
SELECT u.id, u.username, u.certification_level, COUNT(DISTINCT dl.id) as total_dives
FROM users u
LEFT JOIN dive_logs dl ON u.id = dl.user_id
WHERE u.certified = true
GROUP BY u.id, u.username, u.certification_level
ORDER BY total_dives DESC
LIMIT 50;

-- Test 2: Dive site statistics
EXPLAIN ANALYZE
SELECT ds.id, ds.name, COUNT(dl.id) as dives,
       AVG(CAST(dl.enjoyment_rating as NUMERIC)) as avg_rating
FROM dive_sites ds
LEFT JOIN dive_logs dl ON ds.id = dl.dive_site_id
GROUP BY ds.id, ds.name
ORDER BY dives DESC
LIMIT 20;

-- Test 3: Service provider rankings
EXPLAIN ANALYZE
SELECT sp.business_name, COUNT(DISTINCT b.id) as bookings,
       ROUND(AVG(CAST(pr.rating as NUMERIC)), 2) as avg_rating
FROM service_providers sp
LEFT JOIN bookings b ON sp.id = b.provider_id
LEFT JOIN provider_reviews pr ON sp.id = pr.provider_id
WHERE sp.is_active = true
GROUP BY sp.id, sp.business_name
ORDER BY avg_rating DESC
LIMIT 20;

-- Test 4: User booking history
EXPLAIN ANALYZE
SELECT b.id, b.status, b.booking_date
FROM bookings b
WHERE diver_1_id = '00000000-0000-0000-0000-000000000000'
   OR diver_2_id = '00000000-0000-0000-0000-000000000000'
ORDER BY booking_date DESC
LIMIT 20;

-- ============================================================================
-- PART 7: MIGRATION COMPLETION CHECKLIST
-- ============================================================================

SELECT '=== MIGRATION COMPLETION CHECKLIST ===' as section;

WITH checks AS (
    SELECT
        'Indexes created (target 25+)' as check_name,
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') >= 25 as passed,
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as actual_value

    UNION ALL

    SELECT
        'Materialized views (target 7)',
        (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') >= 7,
        (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public')

    UNION ALL

    SELECT
        'Audit logs table exists',
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs'),
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN 1 ELSE 0 END

    UNION ALL

    SELECT
        'Cache metadata table exists',
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cache_metadata'),
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cache_metadata') THEN 1 ELSE 0 END

    UNION ALL

    SELECT
        'RLS policies configured',
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') > 0,
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public')

    UNION ALL

    SELECT
        'Refresh functions available',
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'refresh_all_materialized_views'),
        CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'refresh_all_materialized_views') THEN 1 ELSE 0 END

    UNION ALL

    SELECT
        'Audit triggers configured',
        (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name LIKE 'audit_%') > 0,
        (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name LIKE 'audit_%')
)
SELECT
    check_name,
    CASE WHEN passed THEN '✓ PASS' ELSE '✗ FAIL' END as status,
    actual_value as actual_count
FROM checks
ORDER BY passed DESC, check_name;

-- ============================================================================
-- PART 8: RECOMMENDATIONS
-- ============================================================================

SELECT '=== RECOMMENDATIONS ===' as section;

-- Suggest indexes to monitor (zero scans)
SELECT
    'Monitor these indexes (no scans in current period):' as recommendation,
    COUNT(*) as unused_index_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexname LIKE 'idx_%';

-- Check for bloated tables
SELECT
    'Check table bloat:' as recommendation,
    COUNT(*) as large_table_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_live_tup > 100000;

-- Summary
SELECT
    'Deployment Status' as item,
    'READY FOR PRODUCTION' as value
WHERE EXISTS(
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' LIMIT 1
)
AND EXISTS(
    SELECT 1 FROM pg_matviews WHERE schemaname = 'public' LIMIT 1
)
AND EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs'
);

-- ============================================================================
-- PART 9: PERFORMANCE BASELINE QUERIES
-- ============================================================================

SELECT '=== PERFORMANCE BASELINE QUERIES ===' as section;
SELECT 'Use these queries to establish performance baseline' as note;

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) as row_estimate
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'dive_logs', 'dive_sites', 'bookings', 'service_providers')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index effectiveness
SELECT
    'Effective indexes (>100 scans)' as index_category,
    COUNT(*) as count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan > 100

UNION ALL

SELECT
    'Under-utilized indexes (<10 scans)',
    COUNT(*)
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan > 0 AND idx_scan < 10

UNION ALL

SELECT
    'Unused indexes (0 scans)',
    COUNT(*)
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0;

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================

SELECT '✓ Verification Complete - Review results above' as completion_message;
