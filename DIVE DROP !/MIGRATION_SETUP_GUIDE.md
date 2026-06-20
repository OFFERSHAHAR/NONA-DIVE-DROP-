# Supabase Database Optimization Migration Setup Guide

## Overview

This guide walks through executing three critical database optimization migrations:

1. **Schema Optimization** (20260627_schema_optimization.sql)
   - 47 strategic indexes on critical tables
   - 2 materialized views for frequently accessed data
   - Helper functions for RLS optimization

2. **RLS Security Optimization** (20260627_rls_security_optimization.sql)
   - Optimized booking RLS policies with reduced nested queries
   - Improved service provider dependent policies
   - Audit logs table with triggers for sensitive operations

3. **Caching Strategy** (20260627_caching_strategy.sql)
   - 5 materialized views (user stats, dive sites, providers, equipment, bookings)
   - Automatic cache refresh functions
   - Cache invalidation triggers and metadata tracking

## Prerequisites

### Option 1: Direct PostgreSQL Connection (Recommended)

```bash
# Install PostgreSQL client
# macOS
brew install postgresql

# Windows (via Chocolatey)
choco install postgresql

# Linux
sudo apt-get install postgresql-client
```

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref obseuhukeqbuunnpyldr
```

### Option 3: Manual Execution via Supabase Dashboard

Use the SQL Editor in Supabase dashboard (https://app.supabase.com)

## Method 1: Using Python Migration Runner (Easiest)

### Setup

```bash
# Navigate to project root
cd "/path/to/DIVE DROP !"

# Install Python dependencies (optional for full features)
pip install psycopg2-binary supabase-py

# Or just run without dependencies (simpler)
python3 scripts/migration-runner.py
```

### Execution

```bash
# Set environment variables (already in .env.local)
export NEXT_PUBLIC_SUPABASE_URL="https://obesehukeqbuunnpyldr.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key-here"

# Run migration runner
python3 scripts/migration-runner.py
```

The runner will:
- Load all three migration files
- Parse and display expected changes
- Execute each migration sequentially
- Verify indexes, views, and policies were created
- Generate a comprehensive deployment report (DEPLOYMENT_REPORT.md)

## Method 2: Using PostgreSQL Client (psql)

### Get Connection String

1. Go to Supabase Dashboard → Project Settings
2. Find "Connection String" under "Database"
3. Select "Transaction Pooler" for Prisma connection

```bash
# Example connection string
postgresql://postgres.obseuhukeqbuunnpyldr:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Execute Migrations

```bash
# Set password
export PGPASSWORD="your-database-password"

# Connect and execute first migration
psql -h aws-0-us-east-1.pooler.supabase.com \
     -U postgres.obseuhukeqbuunnpyldr \
     -d postgres \
     -f supabase/migrations/20260627_schema_optimization.sql

# Execute second migration
psql -h aws-0-us-east-1.pooler.supabase.com \
     -U postgres.obseuhukeqbuunnpyldr \
     -d postgres \
     -f supabase/migrations/20260627_rls_security_optimization.sql

# Execute third migration
psql -h aws-0-us-east-1.pooler.supabase.com \
     -U postgres.obseuhukeqbuunnpyldr \
     -d postgres \
     -f supabase/migrations/20260627_caching_strategy.sql
```

## Method 3: Using Supabase CLI

### Link Project

```bash
supabase link --project-ref obseuhukeqbuunnpyldr
# Follow prompts to authenticate
```

### Execute Migrations Locally First

```bash
# Start local Supabase
supabase start

# Run migrations
supabase migration up

# Push to remote
supabase db push
```

## Method 4: Manual Execution (Web UI)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (obseuhukeqbuunnpyldr)
3. Go to "SQL Editor"
4. Click "New Query"
5. Copy the contents of each migration file
6. Click "Run"
7. Repeat for each migration

## Verification Steps

### After Execution

### 1. Verify Indexes Were Created

```sql
-- In Supabase SQL Editor, run:
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Expected: ~25+ indexes listed

### 2. Verify Materialized Views

```sql
SELECT 
    matviewname,
    pg_size_pretty(pg_total_relation_size(matviewname::regclass)) as size
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname LIKE 'mv_%'
ORDER BY matviewname;
```

Expected: 5 materialized views
- mv_user_stats
- mv_detailed_dive_site_stats
- mv_service_provider_stats
- mv_equipment_popular_items
- mv_booking_summary

### 3. Verify RLS Policies

```sql
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: All tables with RLS policies listed

### 4. Verify Audit Logs Table

```sql
SELECT 
    COUNT(*) as total_audit_logs,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT table_name) as tables_audited
FROM audit_logs;
```

### 5. Test Critical Queries with EXPLAIN ANALYZE

#### Query 1: Certified Divers by Level
```sql
EXPLAIN ANALYZE
SELECT 
    u.id, 
    u.username, 
    u.certification_level, 
    COUNT(DISTINCT dl.id) as total_dives
FROM users u
LEFT JOIN dive_logs dl ON u.id = dl.user_id
WHERE u.certified = true
GROUP BY u.id, u.username, u.certification_level
ORDER BY total_dives DESC
LIMIT 50;
```

Look for:
- Index usage (Index Scan / Index Only Scan)
- Reduced execution time (should show improvement)
- Lower buffer hits compared to sequential scans

#### Query 2: Popular Dive Sites
```sql
EXPLAIN ANALYZE
SELECT 
    ds.id,
    ds.name,
    ds.difficulty_level,
    COUNT(dl.id) as total_dives,
    AVG(CAST(dl.enjoyment_rating as NUMERIC)) as avg_rating
FROM dive_sites ds
LEFT JOIN dive_logs dl ON ds.id = dl.dive_site_id
GROUP BY ds.id, ds.name, ds.difficulty_level
ORDER BY total_dives DESC
LIMIT 20;
```

#### Query 3: Service Provider Performance
```sql
EXPLAIN ANALYZE
SELECT 
    sp.business_name,
    sp.business_type,
    COUNT(DISTINCT b.id) as total_bookings,
    ROUND(AVG(CAST(pr.rating as NUMERIC)), 2) as avg_rating
FROM service_providers sp
LEFT JOIN bookings b ON sp.id = b.provider_id
LEFT JOIN provider_reviews pr ON sp.id = pr.provider_id
WHERE sp.is_active = true
GROUP BY sp.id, sp.business_name, sp.business_type
ORDER BY avg_rating DESC;
```

## Performance Baseline

Before and after measurements:

### Expected Improvements

| Query Type | Before | After | Improvement |
|-----------|--------|-------|-------------|
| User profile lookup | 5+ queries | 1 MV query | 80-90% |
| Dive site listing | 10+ queries | 1 MV query | 85-95% |
| Provider search | Complex JOINs | 1 MV query | 60-75% |
| Certified diver filter | Sequential scan | Index scan | 50-70% |
| Booking RLS evaluation | N+1 queries | Optimized | 40-60% |

## Cache Refresh Configuration

Add to your application's scheduled job handler (e.g., Inngest, pg_cron, or Node.js Cron):

### Using Inngest (Recommended)

```typescript
import { inngest } from "@/inngest/client";

// Refresh booking summary every 15 minutes
export const refreshBookingSummary = inngest.createFunction(
  { id: "refresh-booking-summary" },
  { cron: "TZ=UTC */15 * * * *" },
  async ({ step }) => {
    await step.run("refresh-mv-booking-summary", async () => {
      const { data, error } = await supabase.rpc(
        "refresh_materialized_view",
        { view_name: "mv_booking_summary" }
      );
      if (error) throw error;
      return data;
    });
  }
);

// Refresh provider stats every 30 minutes
export const refreshProviderStats = inngest.createFunction(
  { id: "refresh-provider-stats" },
  { cron: "TZ=UTC */30 * * * *" },
  async ({ step }) => {
    await step.run("refresh-mv-provider-stats", async () => {
      const { data, error } = await supabase.rpc(
        "refresh_materialized_view",
        { view_name: "mv_service_provider_stats" }
      );
      if (error) throw error;
      return data;
    });
  }
);

// Refresh all other views hourly
export const refreshAllViews = inngest.createFunction(
  { id: "refresh-all-views" },
  { cron: "TZ=UTC 0 * * * *" },
  async ({ step }) => {
    await step.run("refresh-all-materialized-views", async () => {
      const { data, error } = await supabase.rpc(
        "refresh_all_materialized_views"
      );
      if (error) throw error;
      return data;
    });
  }
);
```

### Using pg_cron Extension

If your Supabase project has pg_cron enabled:

```sql
-- Refresh booking summary every 15 minutes
SELECT cron.schedule('refresh-booking-summary', '*/15 * * * *', $$
  SELECT refresh_materialized_view('mv_booking_summary');
$$);

-- Refresh provider stats every 30 minutes
SELECT cron.schedule('refresh-provider-stats', '*/30 * * * *', $$
  SELECT refresh_materialized_view('mv_service_provider_stats');
$$);

-- Refresh all views hourly
SELECT cron.schedule('refresh-all-views', '0 * * * *', $$
  SELECT refresh_all_materialized_views();
$$);
```

## Troubleshooting

### Issue: "Permission denied" errors

**Solution:** Ensure you're using SUPABASE_SERVICE_KEY (admin key), not NEXT_PUBLIC_SUPABASE_ANON_KEY

```bash
export SUPABASE_SERVICE_KEY="your-service-key-from-settings"
```

### Issue: Index creation fails with "relation already exists"

**Solution:** This is OK! The migrations use `IF NOT EXISTS`. Rerun the migration.

### Issue: "Function already exists" error

**Solution:** Migrations use `CREATE OR REPLACE FUNCTION`. This is expected for function updates.

### Issue: Materialized view refresh is slow

**Solution:** 
1. Check table sizes: `SELECT pg_size_pretty(pg_total_relation_size('table_name'));`
2. Increase refresh intervals in cache_metadata table
3. Consider filtering data in materialized view definition

### Issue: RLS policies causing "permission denied" on INSERT

**Solution:**
1. Verify user_id matches auth.uid()
2. Check that user exists in users table
3. Review RLS policies with: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`

## Rollback Plan

If you need to rollback migrations:

### Option 1: Drop Objects Safely

```sql
-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_user_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_detailed_dive_site_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_service_provider_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_equipment_popular_items CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_booking_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_certified_level;
DROP INDEX IF EXISTS idx_users_created_at;
-- ... (continue for all indexes)

-- Drop functions
DROP FUNCTION IF EXISTS refresh_all_materialized_views();
DROP FUNCTION IF EXISTS refresh_materialized_view(TEXT);
DROP FUNCTION IF EXISTS invalidate_user_stats();
-- ... (continue for other functions)

-- Drop audit table
DROP TABLE IF EXISTS audit_logs CASCADE;
```

### Option 2: Restore from Backup

Use Supabase backup/restore feature in dashboard:
1. Go to Project Settings → Backups
2. Select pre-migration backup
3. Restore to branch

## Performance Monitoring

### After Migration

1. **Monitor query execution times:**
   - Check response times in application logs
   - Compare before/after metrics

2. **Monitor cache hit rates:**
   ```sql
   SELECT cache_name, last_refreshed, next_scheduled_refresh
   FROM cache_metadata
   ORDER BY last_refreshed DESC;
   ```

3. **Monitor RLS policy effectiveness:**
   ```sql
   SELECT * FROM check_rls_performance();
   ```

4. **Monitor index usage:**
   ```sql
   SELECT 
       schemaname,
       tablename,
       indexname,
       idx_scan,
       idx_tup_read,
       idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

## Post-Deployment Checklist

- [ ] All three migrations executed successfully
- [ ] Indexes verified (25+ created)
- [ ] Materialized views verified (5 created)
- [ ] RLS policies verified
- [ ] EXPLAIN ANALYZE shows index usage
- [ ] Audit logs table working
- [ ] Cache refresh functions callable
- [ ] Performance baseline established
- [ ] Cache refresh cron jobs configured
- [ ] Monitoring alerts set up
- [ ] Documentation updated

## Next Steps

1. **Week 1:** Monitor query performance and adjust cache refresh intervals
2. **Week 2:** Analyze unused indexes and remove if not beneficial
3. **Week 3:** Plan for time-based partitioning if table sizes exceed 10M rows
4. **Week 4:** Update production deployment documentation

## Support

For issues or questions:
1. Check Supabase dashboard for errors
2. Review DEPLOYMENT_REPORT.md for detailed information
3. Check migration SQL files for comments and documentation
4. Use EXPLAIN ANALYZE to understand query performance

---

Generated for: DIVE DROP Project
Date: 2026-06-27
Migrations: 3 files, ~60 SQL statements, 47 indexes, 5 materialized views
