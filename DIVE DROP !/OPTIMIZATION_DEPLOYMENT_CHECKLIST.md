# Supabase Optimization Deployment Checklist

Complete step-by-step checklist for deploying the database optimizations to DIVE DROP.

---

## Pre-Deployment Phase (30 minutes)

### Understanding & Preparation
- [ ] Read `SUPABASE_OPTIMIZATION_GUIDE.md` (main guide)
- [ ] Review `QUERY_OPTIMIZATION_PATTERNS.md` (code examples)
- [ ] Review `SUPABASE_INDEX_REFERENCE.md` (index details)
- [ ] Understand expected performance improvements (30-80%)

### Database Backup
- [ ] Create database backup in Supabase dashboard
  - Dashboard → Database → Backups → Create Backup
- [ ] Verify backup completed successfully
- [ ] Note backup ID for potential rollback
- [ ] Inform team backup is in progress

### Communication
- [ ] Schedule 2-3 hour maintenance window
- [ ] Notify stakeholders of planned optimization
- [ ] Disable external monitoring/alerts (optional, to avoid noise)
- [ ] Prepare rollback plan

---

## Phase 1: Schema Optimization (10-15 minutes)

### Execution
- [ ] Open Supabase SQL Editor
- [ ] Copy migration file: `20260627_schema_optimization.sql`
- [ ] Paste into SQL Editor
- [ ] Review the SQL before execution
- [ ] Click "Run" button
- [ ] Wait for completion (5-10 minutes)

### Verification
- [ ] Check for "migration completed successfully" message
- [ ] No errors in console output
- [ ] Verify index count increased:
  ```sql
  SELECT COUNT(*) FROM pg_stat_user_indexes
  WHERE indexname LIKE 'idx_%' OR indexname LIKE 'mv_%';
  -- Expected: ~30 new indexes
  ```
- [ ] Check materialized views created:
  ```sql
  SELECT COUNT(*) FROM pg_matviews;
  -- Expected: 2 new materialized views
  ```
- [ ] No table locks reported in status
- [ ] Database connection is stable

**Troubleshooting:**
- If execution fails: Check PostgreSQL version compatibility
- If indexes not created: Verify no syntax errors in migration
- If performance drops: Check newly created indexes with EXPLAIN

---

## Phase 2: RLS & Security Optimization (5 minutes)

### Execution
- [ ] Copy migration file: `20260627_rls_security_optimization.sql`
- [ ] Paste into SQL Editor
- [ ] Review SQL for any custom environment considerations
- [ ] Click "Run" button
- [ ] Wait for completion (2-3 minutes)

### Verification
- [ ] Migration completed without errors
- [ ] RLS policies updated (check if application still works)
- [ ] Audit table created:
  ```sql
  SELECT COUNT(*) FROM audit_logs;
  -- Should be 0 (empty, waiting for data)
  ```
- [ ] Audit triggers created:
  ```sql
  SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%';
  -- Should see: audit_bookings, audit_booking_payments, etc.
  ```

**Troubleshooting:**
- If RLS policies fail: Ensure no custom RLS modifications exist
- If audit triggers error: Check table names match (e.g., equipment_rentals vs equipment_rental)
- If functions don't compile: May have PostgreSQL version issues

---

## Phase 3: Caching Strategy (5-10 minutes)

### Execution
- [ ] Copy migration file: `20260627_caching_strategy.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run" button
- [ ] Wait for materialized views to compute (3-15 minutes)

### Verification During Computation
- [ ] Monitor computation in status area
- [ ] CPU usage may spike temporarily (normal)
- [ ] Application continues functioning (queries still work)

### Verification After Completion
- [ ] Migration completed without errors
- [ ] All 5 materialized views created:
  ```sql
  SELECT matviewname FROM pg_matviews
  WHERE matviewname LIKE 'mv_%'
  ORDER BY matviewname;
  -- Expected: 5 views
  -- - mv_booking_summary
  -- - mv_detailed_dive_site_stats
  -- - mv_equipment_popular_items
  -- - mv_service_provider_stats
  -- - mv_user_stats
  ```
- [ ] Cache metadata table created:
  ```sql
  SELECT COUNT(*) FROM cache_metadata;
  -- Expected: 5 rows (one per view)
  ```
- [ ] Refresh functions created:
  ```sql
  SELECT proname FROM pg_proc WHERE proname LIKE 'refresh%';
  -- Expected: refresh_all_materialized_views, refresh_materialized_view
  ```

---

## Phase 4: Schedule Materialized View Refresh (15-30 minutes)

### Option A: PostgreSQL pg_cron (Recommended for Supabase)

#### Setup
- [ ] Open SQL Editor
- [ ] Execute: `CREATE EXTENSION IF NOT EXISTS pg_cron;`
- [ ] Verify: Should complete without error

#### Schedule Jobs (execute these queries one by one)
- [ ] Hourly refresh of user stats:
  ```sql
  SELECT cron.schedule('refresh-user-stats', '0 * * * *',
    'SELECT refresh_materialized_view(''mv_user_stats'')');
  -- Expected message: (1 row)
  ```

- [ ] Every 30 minutes refresh provider stats:
  ```sql
  SELECT cron.schedule('refresh-provider-stats', '*/30 * * * *',
    'SELECT refresh_materialized_view(''mv_service_provider_stats'')');
  ```

- [ ] Every 15 minutes refresh booking summary:
  ```sql
  SELECT cron.schedule('refresh-booking-summary', '*/15 * * * *',
    'SELECT refresh_materialized_view(''mv_booking_summary'')');
  ```

- [ ] Every 2 hours refresh dive site stats:
  ```sql
  SELECT cron.schedule('refresh-dive-site-stats', '0 */2 * * *',
    'SELECT refresh_materialized_view(''mv_detailed_dive_site_stats'')');
  ```

- [ ] Hourly refresh equipment stats:
  ```sql
  SELECT cron.schedule('refresh-equipment-stats', '0 * * * *',
    'SELECT refresh_materialized_view(''mv_equipment_popular_items'')');
  ```

#### Verification
- [ ] All cron jobs scheduled successfully
- [ ] Check scheduled jobs:
  ```sql
  SELECT jobid, schedule, command FROM cron.job;
  -- Expected: 5 rows (5 scheduled jobs)
  ```

### Option B: Application-Level Cron (Next.js)

**If pg_cron not available, use application scheduler:**

- [ ] Create file: `src/lib/cron/materializedViews.ts`
- [ ] Add cron jobs using `node-cron` or similar
- [ ] Test locally before deployment:
  ```bash
  npm test -- materializedViews
  ```
- [ ] Deploy to production
- [ ] Verify first refresh executed in logs

### Option C: Manual Refresh (Fallback)

If scheduling not possible:
- [ ] Add manual refresh to admin dashboard
- [ ] Create API endpoint for on-demand refresh:
  ```typescript
  POST /api/admin/cache/refresh
  ```
- [ ] Document need for manual refresh
- [ ] Set reminder to refresh weekly

---

## Phase 5: Application Updates (1-2 hours)

### Identify Queries to Optimize
- [ ] Search codebase for queries that can use materialized views
- [ ] Priority: User profile, dive site listings, provider search
- [ ] Check `QUERY_OPTIMIZATION_PATTERNS.md` for patterns

### Update Queries (Example: User Profile)

**Before:**
```typescript
const { data: user } = await supabase.from('users').select('*').eq('id', userId);
const { data: dives } = await supabase.from('dive_logs').select('*').eq('user_id', userId);
```

**After:**
```typescript
const { data } = await supabase.from('mv_user_stats').select('*').eq('id', userId).single();
```

### Key Files to Update
- [ ] `/src/app/api/users/[id]/profile/route.ts` - Use mv_user_stats
- [ ] `/src/app/api/dive-sites/[id]/route.ts` - Use mv_detailed_dive_site_stats
- [ ] `/src/app/api/service-providers/search/route.ts` - Use mv_service_provider_stats
- [ ] `/src/app/api/equipment/route.ts` - Use mv_equipment_popular_items
- [ ] `/src/app/api/bookings/route.ts` - Keep using bookings table
- [ ] Any aggregation queries - Consider caching

### Testing Updates
- [ ] Compile TypeScript without errors:
  ```bash
  npm run build
  ```
- [ ] Run unit tests:
  ```bash
  npm test
  ```
- [ ] Test API endpoints manually:
  ```bash
  curl http://localhost:3000/api/users/[id]/profile
  ```
- [ ] Verify returned data matches previous format
- [ ] Check response times improved

---

## Phase 6: Performance Monitoring (1 week)

### Day 1: Baseline Metrics
- [ ] Record current query latencies:
  ```sql
  SELECT query, mean_time FROM pg_stat_statements
  WHERE mean_time > 50 ORDER BY mean_time DESC LIMIT 20;
  ```
- [ ] Document before/after statistics
- [ ] Check application server CPU usage
- [ ] Verify no application errors in logs

### Day 2-3: Verify Cache Hits
- [ ] Check materialized view refresh logs
- [ ] Verify cron jobs executing successfully:
  ```sql
  SELECT * FROM cron.job_run_details WHERE success = true
  ORDER BY start_time DESC LIMIT 20;
  ```
- [ ] Confirm views updating with latest data
- [ ] Monitor for any stale data issues

### Day 4-7: Performance Analysis
- [ ] Compare latencies from Day 1
- [ ] Calculate actual improvement percentages
- [ ] Identify any slow queries still remaining:
  ```sql
  SELECT query, mean_time FROM pg_stat_statements
  WHERE mean_time > 100 ORDER BY mean_time DESC LIMIT 10;
  ```
- [ ] Check index usage:
  ```sql
  SELECT indexname, idx_scan FROM pg_stat_user_indexes
  WHERE idx_scan = 0 AND indexname LIKE 'idx_%'
  LIMIT 20;
  -- Unused indexes (consider removing)
  ```

### Actions Based on Results
- [ ] If performance improved <20%: Review query patterns, check if using new views
- [ ] If performance improved 30-80%: Success! Proceed to documentation
- [ ] If specific queries still slow: Use EXPLAIN ANALYZE to investigate
- [ ] If cache is stale: Adjust refresh frequency

---

## Phase 7: Documentation & Team Handoff (30 minutes)

### Documentation
- [ ] Create internal wiki/documentation with:
  - [ ] What was optimized and why
  - [ ] New materialized views and when to use them
  - [ ] Query patterns reference
  - [ ] Monitoring procedures
  - [ ] Rollback instructions (if needed)

### Team Training
- [ ] Notify development team of changes
- [ ] Share `QUERY_OPTIMIZATION_PATTERNS.md`
- [ ] Demo new query patterns in standup
- [ ] Create PR template reminder for future optimizations

### Monitor Ongoing
- [ ] Set up alerts for:
  - [ ] Materialized view refresh failures
  - [ ] Slow query detection
  - [ ] CPU usage spikes
- [ ] Schedule monthly review of:
  - [ ] Index usage statistics
  - [ ] Unused indexes
  - [ ] Cache hit rates
  - [ ] Query performance trends

---

## Post-Deployment Phase (Ongoing)

### Weekly Checks (30 minutes)
- [ ] Review cron job execution logs
- [ ] Check for errors in application logs
- [ ] Monitor database query performance
- [ ] Verify no degradation in application functionality

### Monthly Reviews (1 hour)
- [ ] Full performance analysis
- [ ] Index usage review (remove unused)
- [ ] Cache freshness review
- [ ] Plan any additional optimizations

### Quarterly Reviews (2 hours)
- [ ] Comprehensive database health check
- [ ] Plan for table growth (partitioning?)
- [ ] Review new query patterns from development
- [ ] Update documentation with learnings

---

## Rollback Procedure (If Needed)

**Only if critical issues occur:**

### Immediate Rollback (5 minutes)
- [ ] Stop materialized view refresh jobs:
  ```sql
  SELECT cron.unschedule('refresh-user-stats');
  SELECT cron.unschedule('refresh-provider-stats');
  -- (etc for all 5 jobs)
  ```

- [ ] Revert application queries to original pattern
  - [ ] Revert TypeScript changes
  - [ ] Redeploy application

### Full Rollback (15 minutes)
- [ ] Restore from backup:
  - [ ] Dashboard → Database → Backups → Restore
  - [ ] Wait for restore completion
- [ ] Application automatically uses original query patterns
- [ ] Verify application functionality restored

### Post-Rollback Analysis
- [ ] Identify what caused the issue
- [ ] Document the problem
- [ ] Plan fix before re-attempting
- [ ] Notify team of change

---

## Success Criteria

### Technical Success (All must be true)
- ✅ All 3 migrations applied without errors
- ✅ 47+ indexes created and active
- ✅ 5 materialized views computing successfully
- ✅ Cron jobs executing on schedule
- ✅ No application errors or warnings
- ✅ Query latency reduced by 30%+
- ✅ Database CPU usage reduced

### Functional Success (All must be true)
- ✅ All API endpoints returning correct data
- ✅ User profiles load quickly
- ✅ Dive site listings show accurate stats
- ✅ Provider search works as expected
- ✅ Booking operations complete normally
- ✅ Equipment rental flows work
- ✅ No RLS policy violations reported

### Performance Success (Target metrics)
- ✅ User profile queries: <200ms (was 500ms)
- ✅ Dive site listings: <400ms (was 1000ms)
- ✅ Provider search: <250ms (was 900ms)
- ✅ Booking searches: <300ms (was 800ms)
- ✅ Database CPU: <40% (was 60%)

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Pre-Deployment | 30 min | Initial setup |
| Phase 1: Schema | 15 min | Execution |
| Phase 2: RLS | 5 min | Execution |
| Phase 3: Caching | 10 min | Execution + wait |
| Phase 4: Scheduling | 20 min | Setup |
| Phase 5: App Updates | 90 min | Development |
| Phase 6: Monitoring | 7 days | Observation |
| Phase 7: Handoff | 30 min | Documentation |
| **Total** | **~3-5 hours** + **1 week monitoring** | |

---

## Contact & Support

### During Deployment
- Keep this checklist open
- Have SQL Editor ready
- Maintain database backup accessibility
- Keep team informed of progress

### For Issues
1. Check the specific phase that failed
2. Review troubleshooting section
3. Consult migration files for SQL details
4. Check `SUPABASE_OPTIMIZATION_GUIDE.md` FAQ section
5. Review PostgreSQL error messages carefully

### Success Indicators
- Deployment completed without errors
- Monitoring shows performance improvements
- Application functioning normally
- Team trained on new patterns

---

## Final Checklist

- [ ] All phases completed successfully
- [ ] Performance improved by 30%+
- [ ] No application errors
- [ ] Team trained and updated
- [ ] Documentation created
- [ ] Monitoring set up
- [ ] Rollback plan ready (but not needed)
- [ ] Ready for production use

**Deployment Status: Ready to Execute**

