# Authorization Implementation Guide

**Last Updated:** 2026-06-20  
**Status:** CRITICAL FIXES APPLIED  
**All developers should read this.**

---

## QUICK START - How to Protect a Route

### Pattern 1: Basic User Authentication
For routes that require user to be logged in:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/route-auth';

export async function POST(request: NextRequest) {
  // Step 1: Check user is authenticated
  const { user, error } = await requireAuth(request);
  if (error) return error;

  // Step 2: Use user.id safely
  const { data } = await supabase
    .from('buddy_listings')
    .insert({ user_id: user!.id, ...validatedData });

  return NextResponse.json(data, { status: 201 });
}
```

### Pattern 2: Admin-Only Route
For routes that require admin access:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/security/route-auth';

export async function GET(request: NextRequest) {
  // Automatically checks admin_users table + role + is_active + status
  const { admin, error } = await requireAdminRole(request);
  if (error) return error;

  // admin.role is guaranteed to be 'admin' or 'super_admin'
  // admin.is_active is guaranteed to be true
  // admin.status is guaranteed to be 'active'

  return NextResponse.json(adminData);
}
```

### Pattern 3: Super Admin Only
For routes that only super admin can access:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/security/route-auth';

export async function DELETE(request: NextRequest) {
  const { admin, error } = await requireSuperAdmin(request);
  if (error) return error;

  // Only super_admin users reach here
  await supabase.from('admin_users').delete().eq('id', targetAdminId);

  return NextResponse.json({ success: true });
}
```

### Pattern 4: Moderator or Admin (Photo Approval)
For moderation tasks:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireModeratorRole } from '@/lib/security/route-auth';

export async function POST(request: NextRequest) {
  const { admin, error } = await requireModeratorRole(request);
  if (error) return error;

  // moderator, admin, or super_admin can reach here
  await supabase
    .from('photos')
    .update({ status: 'approved' })
    .eq('id', photoId);

  return NextResponse.json({ success: true });
}
```

### Pattern 5: Owner OR Admin (Edit Own Resource)
For user-owned resources that admins can also manage:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, verifyOwnershipOrAdmin } from '@/lib/security/route-auth';

export async function PUT(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  // Check if user owns the listing or is admin
  const { valid, error: ownershipError } = await verifyOwnershipOrAdmin(
    user!.id,
    listingOwnerId
  );
  if (!valid) return ownershipError;

  // User is either owner OR admin
  const { data } = await supabase
    .from('buddy_listings')
    .update(validatedData)
    .eq('id', listingId);

  return NextResponse.json(data);
}
```

### Pattern 6: Permission-Level Check
For granular permission control:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/security/route-auth';
import { AdminPermission } from '@/lib/auth/admin-schemas';

export async function POST(request: NextRequest) {
  // Require specific permissions (can be single or array)
  const { admin, error } = await requireAdminPermission(
    request,
    AdminPermission.BAN_USERS
  );
  if (error) return error;

  // Only users with BAN_USERS permission reach here
  await supabase.from('users').update({ banned: true }).eq('id', userId);

  return NextResponse.json({ success: true });
}
```

### Pattern 7: CRON/Scheduled Tasks
For background jobs that should only run with secret:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/security/route-auth';

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET header
  const { valid, error } = verifyCronRequest(request);
  if (error) return error;

  // Only requests with correct CRON_SECRET header reach here
  await runBackgroundJob();

  return NextResponse.json({ success: true });
}
```

---

## Common Mistakes to AVOID

### ❌ DON'T: Check headers for authentication
```typescript
// WRONG - Header can be forged by client
const userId = request.headers.get('x-user-id');
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### ❌ DON'T: Assume all authenticated users are admins
```typescript
// WRONG - This was the old bug
const { user } = await supabase.auth.getUser();
if (user) {
  // This user is NOT necessarily admin!
}
```

### ❌ DON'T: Skip ownership verification
```typescript
// WRONG - User can modify other users' data
const { user } = await supabase.auth.getUser();
await supabase.from('listings').update(data).eq('id', listingId);
// Should verify user.id === listing.user_id
```

### ❌ DON'T: Check only role, not is_active
```typescript
// WRONG - Suspended admin could still access
const { data: admin } = await supabase
  .from('admin_users')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (admin?.role === 'admin') {
  // Not checking is_active or status!
}
```

### ❌ DON'T: Mix different auth strategies
```typescript
// WRONG - Use same pattern everywhere
// Some routes use middleware, some use route auth, some use headers
// Use route-auth.ts consistently!
```

---

## Migration Checklist

If you're updating an old route:

- [ ] Replace header-based auth with `requireAuth()`
- [ ] Replace role checks from `profiles` table with `admin_users`
- [ ] Add `is_active` and `status` verification
- [ ] Use permission matrix instead of just role checks
- [ ] Add ownership verification for user-owned resources
- [ ] Test with anonymous user (should be denied)
- [ ] Test with regular user (should be denied if admin route)
- [ ] Test with admin user (should be allowed)
- [ ] Test with super admin (should be allowed)

---

## Examples by Route Type

### User Feature (Buddy Listing)

```typescript
// GET /api/buddy/listings (Public + Authenticated)
export async function GET(request: NextRequest) {
  // No auth needed for GET (public listing view)
  // But authenticated users see more
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch public listings
  // If user is logged in, add extra fields to response
}

// POST /api/buddy/listings (Create - Auth Required)
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  // Create listing with user.id as owner
}

// PUT /api/buddy/listings/[id] (Edit - Owner OR Admin)
export async function PUT(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  const { valid, error: ownerError } = await verifyOwnershipOrAdmin(
    user!.id,
    listing.user_id
  );
  if (!valid) return ownerError;

  // Update listing
}
```

### Admin Feature (Photo Moderation)

```typescript
// GET /api/admin/photos/pending (Moderator+)
export async function GET(request: NextRequest) {
  const { admin, error } = await requireModeratorRole(request);
  if (error) return error;

  // Return pending photos
}

// POST /api/admin/photos/[id]/approve (Moderator+)
export async function POST(request: NextRequest) {
  const { admin, error } = await requireModeratorRole(request);
  if (error) return error;

  // Approve photo
}

// POST /api/admin/admins/[id]/revoke (Super Admin Only)
export async function POST(request: NextRequest) {
  const { admin, error } = await requireSuperAdmin(request);
  if (error) return error;

  // Revoke admin
}
```

### Permission-Based Feature

```typescript
// DELETE /api/admin/users/[id] (Requires DELETE_USERS permission)
export async function DELETE(request: NextRequest) {
  const { admin, error } = await requireAdminPermission(
    request,
    AdminPermission.DELETE_USERS
  );
  if (error) return error;

  // Delete user
}

// BAN user (Requires BAN_USERS permission)
export async function POST(request: NextRequest) {
  const { admin, error } = await requireAdminPermission(
    request,
    AdminPermission.BAN_USERS
  );
  if (error) return error;

  // Ban user
}
```

### Scheduled Task (CRON)

```typescript
// POST /api/cron/check-insurance-expiry
export async function POST(request: NextRequest) {
  const { valid, error } = verifyCronRequest(request);
  if (error) return error;

  // Run insurance check job
}

// Must be called with:
// curl -H "Authorization: Bearer $CRON_SECRET" https://yoursite/api/cron/...
```

---

## Testing Your Changes

### Test Anonymous User
```bash
# Should be DENIED
curl http://localhost:3000/api/admin/dashboard

# Should be ALLOWED (public endpoint)
curl http://localhost:3000/api/buddy/listings
```

### Test Authenticated User
```bash
# Get auth token first
TOKEN=$(curl http://localhost:3000/api/auth/token)

# Should be ALLOWED
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/buddy/listings

# Should be DENIED
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/dashboard
```

### Test Admin User
```bash
# Admin token
ADMIN_TOKEN=$(curl http://localhost:3000/api/admin/auth/token)

# Should be ALLOWED
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/dashboard

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -X POST http://localhost:3000/api/admin/users
```

### Test Super Admin vs Admin
```bash
# Super Admin can manage admins
curl -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -X DELETE http://localhost:3000/api/admin/admins/123/revoke

# Regular Admin CANNOT
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -X DELETE http://localhost:3000/api/admin/admins/123/revoke
# Returns 403 Forbidden
```

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... (for server operations)

# CRON jobs
CRON_SECRET=your-secret-key-here (generate and keep secret!)
```

---

## Audit Logging (Coming Soon)

All admin operations should be logged:

```typescript
import { auditLog } from '@/lib/admin/audit';

// After admin action
await auditLog({
  actor_id: admin.id,
  action: 'user_banned',
  resource_type: 'user',
  resource_id: targetUserId,
  details: { reason: 'Harassment' },
  ip_address: request.headers.get('x-forwarded-for'),
  user_agent: request.headers.get('user-agent'),
});
```

---

## Permission Matrix Reference

### Buddy Feature Permissions (User-Level)
```
VIEW_LISTING       → Anonymous, Registered, Owner ✅
CREATE_LISTING     → Registered, Owner ✅
UPDATE_LISTING     → Owner ✅
DELETE_LISTING     → Owner ✅
VIEW_CONTACT_INFO  → Owner (who expressed interest) ✅
REVEAL_CONTACT     → Interested user ✅
EXPRESS_INTEREST   → Registered ✅
```

### Admin Permissions (Role-Based)

**Super Admin** → ALL permissions  
**Admin** → All except MANAGE_ADMINS, INVITE_ADMINS, CHANGE_ADMIN_ROLE  
**Moderator** → READ_USERS, BAN_USERS, manage dive sites, VIEW_AUDIT_LOGS  
**Viewer** → READ_USERS, READ_DIVE_SITES, READ_SHUTTLES, VIEW_AUDIT_LOGS  

---

## When to Use Which Function

| Scenario | Function | Returns |
|----------|----------|---------|
| Just need user ID | `requireAuth()` | `user.id` |
| User owns resource | `verifyOwnership()` | `valid: boolean` |
| User OR admin | `verifyOwnershipOrAdmin()` | `valid: boolean` |
| Admin access | `requireAdminRole()` | `admin` object |
| Super admin only | `requireSuperAdmin()` | `admin` object |
| Moderator+ | `requireModeratorRole()` | `admin` object |
| Permission check | `requireAdminPermission()` | `admin` object |
| CRON job | `verifyCronRequest()` | `valid: boolean` |

---

## File Locations

- **Route auth utilities:** `src/lib/security/route-auth.ts` ← USE THIS
- **Permissions matrix:** `src/lib/auth/admin-schemas.ts` ← Reference
- **Admin functions:** `src/lib/admin/permissions.ts` ← Legacy
- **User permissions:** `src/lib/security/permissions.ts` ← User-level

**Going forward:** Use `route-auth.ts` for all new routes.

---

## Questions?

If a route doesn't fit the patterns above:
1. Check if it needs user auth → `requireAuth()`
2. Check if it needs admin → `requireAdminRole()`
3. Check if it needs specific permission → `requireAdminPermission()`
4. Check if user should own resource → `verifyOwnership()`

Stack them as needed!

---

**Version:** 1.0  
**Last Review:** 2026-06-20  
**Next Review:** 2026-07-20  
