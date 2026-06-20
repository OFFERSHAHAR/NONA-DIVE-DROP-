# DIVE DROP Admin Panel - Implementation Guide

**Status**: Ready for Migration  
**Last Updated**: 2026-06-20

## Quick Start

### 1. Migration Order

Apply migrations in this exact order to avoid dependency issues:

```bash
# Step 1: Create admin RBAC foundation
supabase migration up 20260620_create_admin_rbac_tables.sql

# Step 2: Create admin users and link to roles
supabase migration up 20260621_create_admin_users_table.sql

# Step 3: Enhance dive sites with moderation
supabase migration up 20260622_enhance_dive_sites_schema.sql

# Step 4: Create shuttle infrastructure
supabase migration up 20260623_create_shuttles_tables.sql

# Step 5: Create audit trail
supabase migration up 20260624_create_audit_logs_table.sql
```

### 2. Seed Initial Data

After running migrations, manually assign admin roles to your team:

```sql
-- Get the super_admin role ID
SELECT id FROM admin_roles WHERE name = 'super_admin';

-- Get a user ID from your users table
SELECT id, email FROM users LIMIT 5;

-- Create an admin user
INSERT INTO admin_users (user_id, role_id, is_active, activated_at)
VALUES ('USER_ID_HERE', 'SUPER_ADMIN_ROLE_ID', true, now());
```

### 3. Backfill Existing Data

The migrations include automatic backfill for:
- ✅ `dive_sites_enhanced`: All existing dive sites marked as published/approved
- ✅ `dive_site_images`: Existing images from `dive_sites.images` array converted to individual records

**No manual action needed** — backfill happens during migration.

---

## Breaking Changes & Data Migration

### What Changed

| Table | Change | Impact | Mitigation |
|-------|--------|--------|-----------|
| `dive_sites` | RLS policies updated | Unpublished sites hidden from public | Already backfilled with `published=true` |
| `dive_sites.images` | Array column still exists | Dual write needed in app code | See "Parallel Write Strategy" below |
| N/A | New tables added | None - purely additive | No data loss |

### Parallel Write Strategy (Transition Period)

During transition, your application should write to **both** the old `images` array AND the new `dive_site_images` table:

```typescript
// When updating a dive site with new images:
async function updateDiveSite(siteId: string, updates: any) {
  // Write to new table
  await supabase
    .from('dive_site_images')
    .insert(updates.newImages.map(img => ({
      dive_site_id: siteId,
      image_url: img.url,
      image_storage_path: img.path,
      order_index: img.order,
      is_primary: img.isPrimary,
      moderation_status: 'approved'
    })));

  // Write to old array column (for backward compatibility)
  await supabase
    .from('dive_sites')
    .update({
      images: updates.newImages.map(img => img.url)
    })
    .eq('id', siteId);
}
```

Once all clients updated, remove writes to `images` array.

---

## Admin User Setup Checklist

### For Each Admin Team Member

1. **Create User Account**
   ```sql
   -- User should already exist from auth signup
   -- Verify with:
   SELECT id, email FROM users WHERE email = 'admin@example.com';
   ```

2. **Assign Admin Role**
   ```sql
   INSERT INTO admin_users (user_id, role_id, is_active)
   SELECT 
     users.id,
     admin_roles.id,
     true
   FROM users
   JOIN admin_roles ON admin_roles.name = 'super_admin'
   WHERE users.email = 'admin@example.com';
   ```

3. **Verify Permissions**
   ```sql
   -- Test that user has expected permissions
   SELECT has_admin_permission(
     (SELECT id FROM users WHERE email = 'admin@example.com'),
     'dive_sites',
     'view'
   ) as can_view_sites;
   ```

### Initial Team Setup (Example)

```sql
-- Create 3 admins for small team
WITH users_to_promote AS (
  SELECT id FROM users
  WHERE email IN (
    'alice@divedrop.com',
    'bob@divedrop.com',
    'charlie@divedrop.com'
  )
)
INSERT INTO admin_users (user_id, role_id, is_active)
SELECT
  users_to_promote.id,
  admin_roles.id,
  true
FROM users_to_promote, admin_roles
WHERE admin_roles.name = 'super_admin'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Database Performance Notes

### Query Optimization for Common Operations

**Get user's permissions:**
```sql
-- Cache this in your app! Don't query per-request
SELECT ARRAY_AGG(CONCAT(ap.resource, ':', ap.action)) as permissions
FROM admin_users au
JOIN admin_roles ar ON au.role_id = ar.id
JOIN role_permissions rp ON ar.id = rp.role_id
JOIN admin_permissions ap ON rp.permission_id = ap.id
WHERE au.user_id = 'USER_ID'
AND au.is_active = true
AND au.deleted_at IS NULL;
```

**Get available shuttles for date:**
```sql
-- Uses indexes effectively
SELECT
  s.id,
  s.name,
  s.capacity,
  COALESCE(SUM(sb.number_of_persons), 0) as booked,
  s.capacity - COALESCE(SUM(sb.number_of_persons), 0) as available
FROM shuttles s
LEFT JOIN shuttle_schedules ss ON s.id = ss.shuttle_id
  AND ss.scheduled_date = '2026-06-25'
  AND ss.status != 'cancelled'
LEFT JOIN shuttle_bookings sb ON ss.id = sb.shuttle_schedule_id
  AND sb.status IN ('confirmed', 'checked_in')
  AND sb.deleted_at IS NULL
WHERE s.is_active = true
AND s.deleted_at IS NULL
GROUP BY s.id;
```

### Index Coverage

All critical queries are covered by the indexes in the migrations:

- ✅ Admin role lookups: `idx_admin_users_role_id`
- ✅ Active admins: `idx_admin_users_active`
- ✅ Shuttle schedules by date: `idx_shuttle_schedules_date`
- ✅ Bookings by user: `idx_shuttle_bookings_user`
- ✅ Audit logs by timestamp: `idx_audit_logs_timestamp`

---

## RLS Policy Testing

### Test Super Admin Access

```typescript
// Use super_admin JWT token
const { data, error } = await supabase
  .from('admin_users')
  .select('*')
  .eq('is_active', true);

// Should return all active admin users
```

### Test Regular User Access

```typescript
// Use regular user JWT token
const { data, error } = await supabase
  .from('admin_users')
  .select('*');

// Should return only their own record (if they're an admin)
// or empty (if not an admin)
```

### Test Shuttle Booking Access

```typescript
// Regular user can only view own bookings
const { data } = await supabase
  .from('shuttle_bookings')
  .select('*');

// Returns only bookings where user_id = auth.uid()
```

---

## Soft Delete Implementation

All tables with `deleted_at` use soft deletes. To "delete":

```sql
-- Instead of DELETE, UPDATE deleted_at
UPDATE admin_users
SET deleted_at = now()
WHERE id = 'USER_ID';

-- Recovery is simple
UPDATE admin_users
SET deleted_at = NULL
WHERE id = 'USER_ID';
```

RLS policies automatically filter `deleted_at IS NULL`, so soft-deleted records:
- ✅ Are invisible to users (RLS filters them)
- ✅ Are preserved in audit logs
- ✅ Can be recovered if needed
- ✅ Can be hard-deleted after retention period

---

## Helper Functions Quick Reference

### Admin Permission Checking

```sql
-- Check if user can perform action
SELECT has_admin_permission(
  '{{current_user_id}}',
  'dive_sites',
  'update'
);

-- Get user's role name
SELECT get_user_admin_role('{{current_user_id}}');

-- Check role directly
SELECT user_has_admin_role(
  '{{current_user_id}}',
  'super_admin'
);
```

### Shuttle Operations

```sql
-- Check availability on specific date
SELECT * FROM get_shuttle_availability('SHUTTLE_ID', '2026-06-25');

-- Check if booking is possible
SELECT can_book_shuttle('SCHEDULE_ID', 3); -- 3 persons

-- Confirm booking
SELECT confirm_booking('BOOKING_ID');

-- Cancel booking
SELECT cancel_booking('BOOKING_ID', 'Customer requested cancellation');
```

### Audit Operations

```sql
-- Get activity summary for last 7 days
SELECT * FROM get_audit_summary(7);

-- Get specific admin's recent actions
SELECT * FROM get_admin_activity('ADMIN_USER_ID', 100);

-- Find failed actions for troubleshooting
SELECT * FROM get_failed_actions(50);
```

### Dive Site Moderation

```sql
-- Approve a dive site
SELECT approve_dive_site('SITE_ID', '{{admin_user_id}}', 'Looks good');

-- Reject a dive site
SELECT reject_dive_site('SITE_ID', '{{admin_user_id}}', 'Incomplete data');

-- Flag for revision
SELECT flag_dive_site_needs_revision('SITE_ID', '{{admin_user_id}}', 'Add more images');

-- Toggle featured
SELECT toggle_dive_site_featured('SITE_ID', true, '{{admin_user_id}}');
```

---

## Application Integration Points

### 1. Admin Dashboard Layout

```typescript
// Suggested React structure
/app
  /admin
    /dashboard
      page.tsx              // Main admin home
    /users
      page.tsx              // Manage users
      /[id]
        page.tsx            // User detail
    /dive-sites
      page.tsx              // Manage dive sites
      /[id]
        page.tsx            // Site detail + moderation
    /shuttles
      page.tsx              // Manage shuttles
      /[id]
        page.tsx            // Shuttle detail
    /bookings
      page.tsx              // View/manage bookings
    /audit-logs
      page.tsx              // View audit trail
```

### 2. Permission Guard Component

```typescript
// src/components/AdminGuard.tsx
export function AdminGuard({
  permission: {resource, action},
  fallback = <AccessDenied />
}) {
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    supabase.rpc('has_admin_permission', {
      p_user_id: user.id,
      p_resource: resource,
      p_action: action
    }).then(r => setHasAccess(r.data));
  }, []);
  
  return hasAccess ? <>{children}</> : fallback;
}

// Usage:
<AdminGuard permission={{resource: 'dive_sites', action: 'update'}}>
  <DiveSiteEditor />
</AdminGuard>
```

### 3. Audit Logging from Application

```typescript
// When admin performs action in UI, log it
async function logAdminAction(
  action: string,
  resourceType: string,
  resourceId: string,
  oldValues?: any,
  newValues?: any
) {
  await supabase.rpc('log_admin_action', {
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_old_values: oldValues ? JSON.stringify(oldValues) : null,
    p_new_values: newValues ? JSON.stringify(newValues) : null
  });
}
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Failed Admin Actions**
   ```sql
   -- Check daily
   SELECT COUNT(*) as failed_actions
   FROM audit_logs
   WHERE created_at > now() - INTERVAL '24 hours'
   AND status IN ('failure', 'partial');
   ```

2. **Admin Session Activity**
   ```sql
   -- Track logins
   UPDATE admin_users
   SET last_login_at = now(),
       login_count = login_count + 1
   WHERE user_id = auth.uid();
   ```

3. **Shuttle Availability**
   ```sql
   -- Monitor overbooked schedules
   SELECT
     ss.id,
     s.name,
     ss.scheduled_date,
     (SELECT SUM(number_of_persons) FROM shuttle_bookings 
      WHERE shuttle_schedule_id = ss.id
      AND status IN ('confirmed', 'checked_in')) as booked,
     s.capacity
   FROM shuttle_schedules ss
   JOIN shuttles s ON ss.shuttle_id = s.id
   WHERE ss.scheduled_date = CURRENT_DATE
   AND (SELECT SUM(number_of_persons) FROM shuttle_bookings 
        WHERE shuttle_schedule_id = ss.id
        AND status IN ('confirmed', 'checked_in')) > s.capacity;
   ```

---

## Troubleshooting

### Admin Can't Access Admin Panel

1. Check if user has admin_users record:
   ```sql
   SELECT * FROM admin_users WHERE user_id = 'USER_ID' AND is_active = true;
   ```

2. Check if role is valid:
   ```sql
   SELECT * FROM admin_roles WHERE id IN (
     SELECT role_id FROM admin_users WHERE user_id = 'USER_ID'
   );
   ```

3. Check permission for specific resource:
   ```sql
   SELECT has_admin_permission('USER_ID', 'dive_sites', 'view');
   ```

### RLS Policy Blocking Valid Requests

1. Verify user has correct JWT token with their user_id
2. Check `auth.uid()` matches a valid admin_users record
3. Ensure `deleted_at IS NULL` on relevant records
4. Test policy directly in SQL:
   ```sql
   SET session request.jwt.claims = '{"sub":"USER_ID"}';
   SELECT * FROM dive_sites_enhanced;
   ```

### Performance Issues with Audit Logs

Archive old logs monthly:
```sql
-- Move logs older than 12 months to archive
CREATE TABLE audit_logs_archive AS
SELECT * FROM audit_logs
WHERE created_at < now() - INTERVAL '12 months';

DELETE FROM audit_logs
WHERE created_at < now() - INTERVAL '12 months';
```

---

## Security Best Practices

### ✅ DO

- ✅ Use helper functions (`has_admin_permission`) for permission checks
- ✅ Log all admin actions to audit_logs
- ✅ Use soft deletes for compliance
- ✅ Restrict role assignment to super_admin only
- ✅ Monitor failed action attempts
- ✅ Enforce strong passwords for admin accounts
- ✅ Use row-level security on all sensitive tables

### ❌ DON'T

- ❌ Bypass RLS policies in application code
- ❌ Store admin credentials in environment variables
- ❌ Use `auth.jwt()` directly without RLS
- ❌ Hard-delete records without archiving
- ❌ Grant admin roles to users without verification
- ❌ Leave admin sessions active indefinitely
- ❌ Ignore failed action audit logs

---

## Rollback Plan

If you need to revert all schema changes:

```bash
# Rollback in reverse order
supabase migration down 20260624_create_audit_logs_table.sql
supabase migration down 20260623_create_shuttles_tables.sql
supabase migration down 20260622_enhance_dive_sites_schema.sql
supabase migration down 20260621_create_admin_users_table.sql
supabase migration down 20260620_create_admin_rbac_tables.sql
```

**Warning**: This will delete all admin roles, user assignments, and audit logs. Data in `dive_sites` is preserved but `dive_sites_enhanced` and `dive_site_images` are dropped.

---

## Next Steps

1. **Apply migrations** to your Supabase project
2. **Assign admin roles** to your team members
3. **Test RLS policies** with different roles
4. **Build admin dashboard** components
5. **Implement audit logging** in application code
6. **Set up monitoring** and alerts
7. **Train admin team** on panel usage

---

## Support & Documentation

- Full schema documentation: See `ADMIN_SCHEMA_DESIGN.md`
- Migration files: `/supabase/migrations/`
- TypeScript types: See "TypeScript Types" section in schema design

