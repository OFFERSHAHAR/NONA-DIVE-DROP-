# DIVE DROP Admin Panel - Deployment Checklist

**Project**: DIVE DROP Admin Panel Database Schema  
**Version**: 1.0  
**Date**: 2026-06-20

---

## Pre-Deployment Phase

### 1. Database Backup & Validation
- [ ] **Create full production database backup**
  ```bash
  # Supabase dashboard: Project Settings → Backups
  # Or via CLI: supabase db remote commit
  ```
- [ ] **Test migrations on staging environment first**
  - [ ] Clone staging database from production
  - [ ] Apply all 5 migrations to staging
  - [ ] Verify schema with `\d` commands
  - [ ] Test RLS policies with sample data
- [ ] **Validate existing data integrity**
  - [ ] Check all users have auth_id references
  - [ ] Verify dive_sites table has complete data
  - [ ] Confirm no NULL values in critical columns

### 2. Team Preparation
- [ ] **Identify super_admin candidates**
  - [ ] Get email addresses of initial admins
  - [ ] Verify they have accounts in auth.users
  - [ ] Prepare role assignment script
- [ ] **Prepare team documentation**
  - [ ] Print/share ADMIN_SCHEMA_DESIGN.md
  - [ ] Print/share IMPLEMENTATION_GUIDE.md
  - [ ] Create admin onboarding guide (internal)
- [ ] **Schedule deployment window**
  - [ ] Pick off-peak time (low usage)
  - [ ] Notify users of potential downtime
  - [ ] Prepare rollback team

### 3. Code Review
- [ ] **Review all migration files**
  - [ ] 20260620_create_admin_rbac_tables.sql
  - [ ] 20260621_create_admin_users_table.sql
  - [ ] 20260622_enhance_dive_sites_schema.sql
  - [ ] 20260623_create_shuttles_tables.sql
  - [ ] 20260624_create_audit_logs_table.sql
- [ ] **Validate TypeScript types** (`src/types/admin.ts`)
- [ ] **Check RLS policies** for correctness
- [ ] **Verify indexes** exist for all critical queries
- [ ] **Confirm no hard-coded passwords/secrets**

---

## Deployment Phase

### Step 1: Apply Database Migrations (30 minutes)

**In Supabase Dashboard or via CLI:**

```bash
# Navigate to migrations directory
cd supabase/migrations

# Apply in order - DO NOT SKIP OR REORDER
supabase migration push 20260620_create_admin_rbac_tables.sql
supabase migration push 20260621_create_admin_users_table.sql
supabase migration push 20260622_enhance_dive_sites_schema.sql
supabase migration push 20260623_create_shuttles_tables.sql
supabase migration push 20260624_create_audit_logs_table.sql

# Verify migrations applied
supabase db remote show
```

**Or via Supabase Dashboard:**
1. Go to SQL Editor
2. Copy migration file contents
3. Run each migration (one at a time, in order)
4. Verify success messages

**Monitoring:**
- [ ] All 5 migrations show "SUCCESS"
- [ ] No errors in migration output
- [ ] Check Supabase Activity tab for completion

### Step 2: Verify Schema Creation (15 minutes)

Run validation queries in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should include:
-- admin_roles
-- admin_permissions
-- role_permissions
-- admin_users
-- dive_sites_enhanced
-- dive_site_images
-- shuttles
-- shuttle_schedules
-- shuttle_bookings
-- audit_logs
```

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'admin_users', 'shuttles', 'shuttle_bookings',
  'dive_sites', 'dive_sites_enhanced', 'audit_logs'
)
ORDER BY tablename;

-- All should show rowsecurity = true
```

```sql
-- Verify predefined roles exist
SELECT name, priority FROM admin_roles
ORDER BY priority;

-- Should show 7 roles:
-- super_admin, site_manager, shuttle_manager, user_admin, content_moderator, auditor, viewer
```

```sql
-- Count permissions
SELECT COUNT(*) as permission_count FROM admin_permissions;
-- Should be 22 or more
```

Validation checklist:
- [ ] All 10 tables created
- [ ] All tables have RLS enabled
- [ ] 7 roles created
- [ ] 22+ permissions created
- [ ] No error messages
- [ ] Backfill data populated (check counts)

### Step 3: Assign Initial Admin Roles (15 minutes)

**Create first super admin:**

```sql
-- Insert admin user for YOUR_EMAIL
INSERT INTO admin_users (user_id, role_id, is_active, notes)
SELECT
  u.id,
  ar.id,
  true,
  'Initial super_admin assignment'
FROM users u
JOIN admin_roles ar ON ar.name = 'super_admin'
WHERE u.email = 'your.email@example.com'
AND NOT EXISTS (
  SELECT 1 FROM admin_users WHERE user_id = u.id
)
RETURNING id, user_id, role_id, is_active;
```

**Verify admin was created:**

```sql
SELECT au.id, u.email, ar.name, au.is_active
FROM admin_users au
JOIN users u ON au.user_id = u.id
JOIN admin_roles ar ON au.role_id = ar.id
WHERE au.is_active = true;
```

**Test permission:**

```sql
SELECT has_admin_permission(
  (SELECT user_id FROM admin_users WHERE id = 'ADMIN_ID_FROM_ABOVE'),
  'dive_sites',
  'view'
) as has_permission;

-- Should return true
```

Checklist:
- [ ] At least 1 super_admin created
- [ ] Super admin has all permissions
- [ ] Can verify with `has_admin_permission()`

---

## Post-Deployment Phase

### Step 1: Run Integration Tests (30 minutes)

**Test RLS Policies:**

```typescript
// Test as public user (no auth)
const { data, error } = await supabase
  .from('admin_users')
  .select('*');
// Should return: error (no policy for non-auth)

// Test as authenticated non-admin user
const { data, error } = await supabase
  .from('admin_users')
  .select('*');
// Should return: own record only OR empty

// Test as super_admin
const { data, error } = await supabase
  .from('admin_users')
  .select('*');
// Should return: all active admin users
```

**Test Permission Functions:**

```typescript
// Get user's role
const role = await supabase.rpc('get_user_admin_role', {
  p_user_id: currentUserId
});
// Should return: role name or NULL

// Check specific permission
const hasAccess = await supabase.rpc('has_admin_permission', {
  p_user_id: currentUserId,
  p_resource: 'dive_sites',
  p_action: 'update'
});
// Should return: true/false
```

**Test Shuttle Operations:**

```typescript
// Check availability
const availability = await supabase.rpc('get_shuttle_availability', {
  p_shuttle_id: shuttleId,
  p_date: '2026-06-25'
});
// Should return: available_seats, total_bookings, is_available

// Test booking capability
const canBook = await supabase.rpc('can_book_shuttle', {
  p_shuttle_schedule_id: scheduleId,
  p_number_of_persons: 3
});
// Should return: true/false
```

Test checklist:
- [ ] RLS policies block unauthorized access
- [ ] Super_admin can view all data
- [ ] Regular users can view own data only
- [ ] Permission functions work correctly
- [ ] Shuttle availability calculations correct
- [ ] Booking validation works
- [ ] Audit logs created for actions

### Step 2: Load Testing (30 minutes)

**Test with expected peak load:**

```bash
# Using Apache Bench or similar
ab -n 1000 -c 10 https://api.divedrop.com/admin/users

# Monitor:
# - Response time
# - Error rate
# - Database CPU usage
# - Query performance
```

Key metrics to track:
- [ ] p95 response time < 1000ms
- [ ] p99 response time < 2000ms
- [ ] Error rate < 0.1%
- [ ] DB CPU stays < 80%

### Step 3: Monitor and Alert Setup

**Set up monitoring for:**

- [ ] **Audit Log Growth**
  ```sql
  -- Check daily audit entries
  SELECT DATE(created_at) as date, COUNT(*) as entries
  FROM audit_logs
  WHERE created_at > now() - INTERVAL '7 days'
  GROUP BY DATE(created_at);
  ```

- [ ] **Failed Actions**
  ```sql
  -- Alert if > 10 failed actions per day
  SELECT COUNT(*) FROM audit_logs
  WHERE created_at > now() - INTERVAL '24 hours'
  AND status = 'failure';
  ```

- [ ] **Admin Session Activity**
  ```sql
  -- Monitor logins
  SELECT COUNT(*) FROM admin_users
  WHERE last_login_at > now() - INTERVAL '24 hours';
  ```

- [ ] **Shuttle Overbooking**
  ```sql
  -- Check for overbooked schedules
  SELECT COUNT(*) FROM shuttle_schedules ss
  WHERE (SELECT SUM(number_of_persons) FROM shuttle_bookings
         WHERE shuttle_schedule_id = ss.id
         AND status IN ('confirmed', 'checked_in')) > 
        (SELECT capacity FROM shuttles WHERE id = ss.shuttle_id);
  ```

Checklist:
- [ ] Set up Supabase alerts
- [ ] Create dashboard for audit logs
- [ ] Set up email alerts for critical issues
- [ ] Configure log retention policy
- [ ] Schedule daily health checks

### Step 4: Documentation & Training

- [ ] **User Documentation**
  - [ ] Create admin user guide (how to use panel)
  - [ ] Document moderation workflow
  - [ ] Create shuttle management guide
  - [ ] Prepare troubleshooting guide

- [ ] **Team Training**
  - [ ] Train team on role assignments
  - [ ] Demo permission checking
  - [ ] Walk through audit logs
  - [ ] Practice booking management

- [ ] **Operation Runbooks**
  - [ ] Create incident response guide
  - [ ] Document common issues and fixes
  - [ ] Prepare emergency rollback procedure
  - [ ] Create password reset process

Checklist:
- [ ] Team trained on new admin panel
- [ ] Documentation published internally
- [ ] Runbooks prepared
- [ ] Support team briefed

---

## Ongoing Maintenance

### Weekly Tasks
- [ ] Review audit logs for anomalies
- [ ] Check failed action count
- [ ] Monitor admin login activity
- [ ] Review shuttle booking metrics

### Monthly Tasks
- [ ] Archive old audit logs (> 30 days)
- [ ] Review admin role assignments
- [ ] Audit RLS policy effectiveness
- [ ] Perform full schema backup
- [ ] Review and optimize slow queries

### Quarterly Tasks
- [ ] Perform security audit
- [ ] Review access patterns
- [ ] Validate data retention policies
- [ ] Test disaster recovery/rollback
- [ ] Update documentation

---

## Rollback Plan

**If critical issues occur:**

### Immediate Rollback (< 5 minutes)

```bash
# Revert all migrations in reverse order
supabase migration down 20260624_create_audit_logs_table.sql
supabase migration down 20260623_create_shuttles_tables.sql
supabase migration down 20260622_enhance_dive_sites_schema.sql
supabase migration down 20260621_create_admin_users_table.sql
supabase migration down 20260620_create_admin_rbac_tables.sql

# Restore from backup if needed
# Via Supabase: Project Settings → Backups → Restore
```

### Testing Rollback (in staging first)
- [ ] Stop production traffic
- [ ] Revert migrations in staging
- [ ] Verify data is intact
- [ ] Verify application still works
- [ ] Get approval before doing in production

### Post-Rollback
- [ ] Analyze what went wrong
- [ ] Create fix/patch
- [ ] Test thoroughly in staging
- [ ] Redeploy with fix

Rollback checklist:
- [ ] Database backup restored
- [ ] No data loss
- [ ] Application functional
- [ ] All systems operational
- [ ] Issue documented

---

## Success Criteria

### Deployment Success = All of these are TRUE

- [x] All 5 migrations applied successfully
- [x] All 10 tables created with correct schema
- [x] All RLS policies enabled and working
- [x] 7 admin roles created with correct permissions
- [x] At least 1 super_admin assigned
- [x] Integration tests pass
- [x] Load tests show acceptable performance
- [x] Audit logs are recording actions
- [x] Team trained and ready
- [x] Monitoring alerts configured
- [x] Documentation complete

### Go / No-Go Decision

| Criteria | Status | Owner | Sign-off |
|----------|--------|-------|----------|
| Schema deployed | [ ] | DBA | ___ |
| Tests passed | [ ] | QA | ___ |
| Performance acceptable | [ ] | DevOps | ___ |
| Admin assigned | [ ] | Team Lead | ___ |
| Team trained | [ ] | Training | ___ |
| Monitoring ready | [ ] | Operations | ___ |
| Documentation done | [ ] | Documentation | ___ |

**Final Decision**: [ ] GO / [ ] NO-GO

---

## Troubleshooting Guide

### Migration fails with "relation already exists"
- **Cause**: Migrations already applied
- **Fix**: Check current schema, skip already-applied migrations
- **Verify**: `supabase migration list`

### RLS policy blocking legitimate access
- **Cause**: User doesn't have admin_users record or is_active=false
- **Fix**: Create admin_users record and set is_active=true
- **Test**: 
  ```sql
  SELECT * FROM admin_users WHERE user_id = 'USER_ID';
  ```

### Audit logs not appearing
- **Cause**: User isn't an admin (no admin_users record) or triggers not firing
- **Fix**: Verify user has admin_users record and is_active=true
- **Test**:
  ```sql
  SELECT * FROM audit_logs WHERE created_at > now() - INTERVAL '5 minutes';
  ```

### Shuttle bookings failing
- **Cause**: Schedule at capacity or user not authenticated
- **Fix**: Check shuttle_schedules.is_full and user auth status
- **Verify**: 
  ```sql
  SELECT * FROM get_shuttle_availability('SHUTTLE_ID', '2026-06-25');
  ```

### Performance degradation
- **Cause**: Missing indexes or inefficient queries
- **Fix**: Check index coverage, optimize queries
- **Monitor**: 
  ```sql
  SELECT query, calls, total_time FROM pg_stat_statements
  WHERE query LIKE '%shuttle%' OR query LIKE '%admin%'
  ORDER BY total_time DESC;
  ```

---

## Sign-Off

**Deployment completed by**: _______________________  
**Date/Time**: _______________  
**Verified by**: _______________  
**Approved by**: _______________  

**Notes**:
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Contact & Support

For issues or questions:
- **Technical**: Database architect or DBA
- **Admin Panel**: Development team
- **Operations**: DevOps team
- **Training**: Team lead

---

**End of Deployment Checklist**
