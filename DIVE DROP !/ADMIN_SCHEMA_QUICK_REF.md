# DIVE DROP Admin Schema - Quick Reference Card

**Print this and keep at your desk during deployment!**

---

## Migration Order (CRITICAL)

```
1. 20260620_create_admin_rbac_tables.sql
2. 20260621_create_admin_users_table.sql
3. 20260622_enhance_dive_sites_schema.sql
4. 20260623_create_shuttles_tables.sql
5. 20260624_create_audit_logs_table.sql
```

---

## Key Tables Overview

| Table | Purpose | Rows | Key Field |
|-------|---------|------|-----------|
| `admin_roles` | Role definitions (7 predefined) | 7 | name |
| `admin_permissions` | Permissions (22+) | 22+ | resource:action |
| `admin_users` | Links users to roles | <10 | user_id |
| `dive_sites_enhanced` | Moderation metadata | ~100 | dive_site_id |
| `dive_site_images` | Images per site | ~500 | dive_site_id |
| `shuttles` | Shuttle templates | 5-20 | id |
| `shuttle_schedules` | Individual runs | 100s | shuttle_id:date |
| `shuttle_bookings` | User reservations | 1000s | user_id |
| `audit_logs` | Action audit trail | 10000s+ | created_at |

---

## Admin Roles Cheat Sheet

| Role | Permissions | Use Case |
|------|-------------|----------|
| `super_admin` | ALL | First admin only |
| `site_manager` | Dive sites + images | Content managers |
| `shuttle_manager` | Shuttles + bookings | Logistics team |
| `user_admin` | Users + profiles | Account managers |
| `content_moderator` | Approve content | Moderators |
| `auditor` | View all + export | Compliance |
| `viewer` | View sites + profiles | Reporting only |

---

## Essential SQL Queries

### Create First Super Admin
```sql
INSERT INTO admin_users (user_id, role_id, is_active)
SELECT u.id, ar.id, true
FROM users u, admin_roles ar
WHERE u.email = 'admin@divedrop.com' AND ar.name = 'super_admin';
```

### Check Admin Permissions
```sql
SELECT has_admin_permission('USER_ID', 'dive_sites', 'view');
SELECT get_user_admin_role('USER_ID');
```

### Get Shuttle Availability
```sql
SELECT * FROM get_shuttle_availability('SHUTTLE_ID', '2026-06-25');
SELECT can_book_shuttle('SCHEDULE_ID', 3);
```

### View Audit Logs
```sql
SELECT * FROM audit_logs WHERE created_at > now() - INTERVAL '24 hours';
SELECT * FROM get_audit_summary(7);
```

### Approve Dive Site
```sql
SELECT approve_dive_site('SITE_ID', 'ADMIN_ID', 'Looks good');
SELECT toggle_dive_site_featured('SITE_ID', true, 'ADMIN_ID');
```

---

## RLS Policy Summary

| Table | Public | Auth User | Admin |
|-------|--------|-----------|-------|
| `admin_users` | ❌ | Own record | All |
| `dive_sites` | ✅ Published | ✅ Published | ✅ All |
| `shuttles` | ✅ Active | ✅ Active | ✅ All |
| `shuttle_bookings` | ❌ | Own only | All |
| `audit_logs` | ❌ | ❌ | Auditor+ |

---

## Common Helper Functions

```sql
-- Permission checking
has_admin_permission(user_id, resource, action)
user_has_admin_role(user_id, role_name)
get_user_admin_role(user_id)

-- Shuttle operations
get_shuttle_availability(shuttle_id, date)
can_book_shuttle(schedule_id, num_persons)
confirm_booking(booking_id)
cancel_booking(booking_id, reason)

-- Dive site moderation
approve_dive_site(site_id, admin_id, notes)
reject_dive_site(site_id, admin_id, notes)
flag_dive_site_needs_revision(site_id, admin_id, notes)
toggle_dive_site_featured(site_id, featured, admin_id)

-- Audit operations
get_audit_summary(days, resource_type)
get_admin_activity(admin_user_id, limit)
get_failed_actions(limit)
```

---

## Indexing Summary

✅ All critical paths indexed:
- Admin role lookups
- Shuttle scheduling by date
- Booking searches by user
- Audit log queries by time
- Moderation status filtering

---

## Data Flow Diagram

```
User Signs Up
    ↓
auth.users (Supabase)
    ↓
users table
    ↓
admin_users ← admin_roles ← role_permissions → admin_permissions
    ↓
Can access:
  - dive_sites (if site_manager)
  - shuttles (if shuttle_manager)
  - audit_logs (if auditor/super_admin)
```

---

## Soft Delete Pattern

**Instead of DELETE:**
```sql
UPDATE admin_users SET deleted_at = now() WHERE id = '...';
```

**Recovery:**
```sql
UPDATE admin_users SET deleted_at = NULL WHERE id = '...';
```

**In RLS - automatically filtered:**
```sql
WHERE deleted_at IS NULL
```

---

## Performance Tuning Checklist

- [ ] Cache user permissions in app (1 hour TTL)
- [ ] Cache role definitions (rarely change)
- [ ] Cache shuttle schedules (5 min TTL)
- [ ] Archive audit logs > 12 months
- [ ] Monitor index usage monthly
- [ ] Query logs for n+1 patterns
- [ ] Partition shuttle_bookings by year

---

## Backup & Recovery

**Before deployment:**
```
Supabase → Project Settings → Backups → Take Snapshot
```

**If rollback needed:**
```
Supabase → Project Settings → Backups → Restore
```

**Or via CLI:**
```bash
supabase db remote commit  # Backup
supabase migration down 20260624...  # Rollback
```

---

## Testing Checklist

- [ ] `admin_users` select returns only own record for non-admins
- [ ] Shuttle bookings show only user's bookings
- [ ] Audit logs only visible to auditor/super_admin
- [ ] Dive site images visible if approved + site published
- [ ] Permission functions return correct values
- [ ] Soft deleted records invisible to users

---

## Alert Triggers to Set Up

**Check daily:**
- [ ] Failed actions: `SELECT COUNT(*) FROM audit_logs WHERE status = 'failure' AND created_at > now() - INTERVAL '24 hours'`
- [ ] Overbooked shuttles: `SELECT COUNT(*) FROM shuttle_schedules WHERE is_full = true`
- [ ] Pending moderation: `SELECT COUNT(*) FROM dive_sites_enhanced WHERE moderation_status = 'pending'`

**Check weekly:**
- [ ] Admin activity: `SELECT * FROM get_admin_activity(user_id, 100)`
- [ ] Audit log size: `SELECT COUNT(*) FROM audit_logs`
- [ ] Inactive admins: `SELECT * FROM admin_users WHERE last_login_at < now() - INTERVAL '30 days'`

---

## Emergency Procedures

**Admin locked out:**
1. Verify user has admin_users record
2. Check is_active = true
3. Check deleted_at IS NULL
4. Verify role hasn't been deleted

**Shuttle overbooking:**
1. Check shuttle_schedules.is_full
2. Validate current_occupancy vs capacity
3. Check pending bookings status
4. Cancel lowest-priority pending bookings

**Database performance degrading:**
1. Check index coverage: `SELECT * FROM pg_stat_user_indexes`
2. Find slow queries: `SELECT query, calls, total_time FROM pg_stat_statements`
3. Analyze table stats: `ANALYZE [table_name]`
4. Reindex if needed: `REINDEX TABLE [table_name]`

---

## Important Notes

⚠️ **DO NOT:**
- Skip migration steps
- Reorder migrations
- Hard-delete admin_users (use soft delete)
- Modify RLS policies without testing
- Grant admin role without verification

✅ **ALWAYS:**
- Test in staging first
- Keep backups before migration
- Log all admin actions
- Monitor performance after deploy
- Update documentation

---

## File Locations

```
c:\Users\GamingPC\Desktop\DIVE DROP !

supabase/
  ├── migrations/
  │   ├── 20260620_create_admin_rbac_tables.sql
  │   ├── 20260621_create_admin_users_table.sql
  │   ├── 20260622_enhance_dive_sites_schema.sql
  │   ├── 20260623_create_shuttles_tables.sql
  │   └── 20260624_create_audit_logs_table.sql
  ├── ADMIN_SCHEMA_DESIGN.md (COMPLETE REFERENCE)
  └── IMPLEMENTATION_GUIDE.md (SETUP & INTEGRATION)

src/
  └── types/
      └── admin.ts (TypeScript types)

DEPLOYMENT_CHECKLIST.md (STEP-BY-STEP)
ADMIN_SCHEMA_SUMMARY.txt (HIGH-LEVEL OVERVIEW)
```

---

## Quick Command Reference

**Local Testing:**
```bash
# Start Supabase locally
supabase start

# Apply migration
supabase migration up [name].sql

# Test RLS policy
SET session request.jwt.claims = '{"sub":"user_id"}';
SELECT * FROM admin_users;

# Rollback
supabase migration down [name].sql
```

**Production:**
```bash
# List migrations
supabase migration list

# Verify schema
supabase db remote show
```

---

## Contact Quick Links

- **Supabase Dashboard**: https://supabase.com/dashboard
- **SQL Editor**: SQL Editor tab in dashboard
- **Database**: Database → SQL Editor
- **Backups**: Project Settings → Backups
- **Docs**: ADMIN_SCHEMA_DESIGN.md

---

**Print date**: ___________  
**Printed by**: ___________  
**Deployment date**: ___________

---

*Last updated: 2026-06-20 | Version 1.0*
