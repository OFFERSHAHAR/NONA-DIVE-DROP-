# Authorization Fixes - Implementation Checklist

**Status:** 5 Critical Files Fixed + Guide Created  
**Remaining Work:** Apply unified auth to remaining 80+ routes  
**Estimated Time:** 12 hours  
**Priority:** BLOCKING - Ship after fixes completed

---

## PHASE 1: CRITICAL FIXES (COMPLETED ✅)

### File Fixes Applied

- [x] `src/lib/admin/middleware.ts` - Fixed admin role verification
  - Changed from `const isAdmin = true` to proper admin_users check
  - Now verifies role, is_active, and status fields

- [x] `src/app/api/admin/dashboard/route.ts` - Added auth protection
  - Added `withAdminAuth()` check
  - Only authenticated admins can access

- [x] `src/app/api/equipment/route.ts` - Fixed auth method
  - Removed header-based auth (`x-user-id`)
  - Now uses proper Supabase session verification
  - Added ownership/admin verification for GET

- [x] `src/app/api/admin/photos/pending/route.ts` - Fixed role check
  - Now uses `isModerator()` from admin/permissions.ts
  - Proper is_active and status verification

### New Utilities Created

- [x] `src/lib/security/route-auth.ts` - Unified auth functions
  - `requireAuth()` - Basic auth
  - `requireAdminRole()` - Admin check
  - `requireSuperAdmin()` - Super admin check
  - `requireModeratorRole()` - Moderator+ check
  - `requireAdminPermission()` - Permission check
  - `verifyCronRequest()` - CRON secret check
  - `verifyOwnership()` - Ownership check
  - `verifyOwnershipOrAdmin()` - Owner OR admin check

### Documentation Created

- [x] `AUTHORIZATION_AUDIT.md` - Complete audit report
- [x] `AUTH_IMPLEMENTATION_GUIDE.md` - Developer guide
- [x] `FIX_CHECKLIST.md` - This file

---

## PHASE 2: REMAINING ADMIN ROUTES (TO DO)

### Dive Sites Management
Routes: `/api/admin/dive-sites/*`
- [ ] `GET /api/admin/dive-sites` - List all
- [ ] `POST /api/admin/dive-sites` - Create
- [ ] `GET /api/admin/dive-sites/[id]` - Get one
- [ ] `PUT /api/admin/dive-sites/[id]` - Update
- [ ] `DELETE /api/admin/dive-sites/[id]` - Delete

**Pattern:**
```typescript
const { admin, error } = await requireAdminPermission(
  request,
  AdminPermission.READ_DIVE_SITES // or CREATE_DIVE_SITES, etc.
);
if (error) return error;
```

### Shuttles Management
Routes: `/api/admin/shuttles/*`
- [ ] `GET /api/admin/shuttles` - List all
- [ ] `POST /api/admin/shuttles` - Create
- [ ] `GET /api/admin/shuttles/[id]` - Get one
- [ ] `PUT /api/admin/shuttles/[id]` - Update
- [ ] `DELETE /api/admin/shuttles/[id]` - Delete

### Users Management
Routes: `/api/admin/users/*`
- [ ] `GET /api/admin/users` - List all (currently broken)
- [ ] `POST /api/admin/users` - Create (currently broken)
- [ ] `GET /api/admin/users/[id]` - Get one
- [ ] `PUT /api/admin/users/[id]` - Update
- [ ] `DELETE /api/admin/users/[id]` - Delete (needs DELETE_USERS)

**Fix GET and POST:** Replace `withAdminAuth` from old middleware with new route-auth:
```typescript
import { requireAdminRole } from '@/lib/security/route-auth';

export async function GET(request: NextRequest) {
  const { admin, error } = await requireAdminRole(request);
  if (error) return error;
  
  // Use proper Supabase client
  const supabase = await createClient();
  // ... rest of code
}
```

### Photo Moderation
Routes: `/api/admin/photos/*`
- [ ] `GET /api/admin/photos/pending` - ✅ Fixed
- [ ] `POST /api/admin/photos/[id]/approve` - Add moderator check
- [ ] `POST /api/admin/photos/[id]/reject` - Add moderator check
- [ ] `GET /api/admin/photos/approved` - Add moderator check
- [ ] `GET /api/admin/photos/rejected` - Add moderator check
- [ ] `GET /api/admin/photos/stats` - Add admin check
- [ ] `GET /api/admin/photos/analytics` - Add admin check
- [ ] `POST /api/admin/photos/bulk` - Add admin check

**Pattern:**
```typescript
const { admin, error } = await requireModeratorRole(request);
if (error) return error;
```

### Equipment & Rentals
Routes: `/api/admin/equipment/*`, `/api/admin/equipment-analytics`
- [ ] `GET /api/admin/equipment` - List equipment
- [ ] `GET /api/admin/equipment-analytics` - Analytics
- [ ] `POST /api/admin/equipment/*` - Admin operations
- [ ] Missing permission for equipment operations (may need to add to schema)

### Protection & Risk Management
Routes: `/api/admin/protection/*`, `/api/admin/problematic-users`
- [ ] `GET /api/admin/protection/dashboard` - Admin only
- [ ] `GET /api/admin/problematic-users` - Admin only
- [ ] `GET /api/admin/disputes` - Admin only
- [ ] `GET /api/admin/damage-reports` - Admin only

### CRON Routes (Must Have CRON_SECRET)
Routes: `/api/cron/*`
- [ ] `POST /api/cron/check-insurance-expiry`
- [ ] `POST /api/cron/rotate-photos`
- [ ] `POST /api/cron/calculate-scores`
- [ ] `POST /api/admin/cron/rotate-photos`

**Pattern:**
```typescript
import { verifyCronRequest } from '@/lib/security/route-auth';

export async function POST(request: NextRequest) {
  const { valid, error } = verifyCronRequest(request);
  if (error) return error;
  
  // Run background job
}
```

### Instructor Verification
Routes: `/api/admin/instructor-verification/*`
- [ ] `GET /api/admin/instructor-verification` - Get pending
- [ ] `POST /api/admin/instructor-verification` - Approve
- [ ] `POST /api/admin/instructor-verification/revoke` - Revoke
- [ ] `POST /api/instructor-verification/upload-credential` - Authenticated users only
- [ ] `POST /api/instructor-verification/upload-insurance` - Authenticated users only
- [ ] `GET /api/instructor-verification/status` - Authenticated users only

### Insurance & Health
Routes: `/api/admin/insurance-expiry-alerts`, `/api/admin/health`
- [ ] `GET /api/admin/insurance-expiry-alerts` - Admin only
- [ ] `GET /api/admin/health` - Admin only

### Bookings & Training
Routes: `/api/admin/bookings`, `/api/training/*`
- [ ] `GET /api/admin/bookings` - Admin read
- [ ] `POST /api/training/enroll` - Authenticated only
- [ ] `GET /api/training/progress` - Owner OR admin
- [ ] `POST /api/training/*` - Authenticated only

---

## PHASE 3: USER ROUTES (Review & Enhance)

### Buddy Features
Routes: `/api/buddy/*`
- [x] `POST /api/buddy/listings` - ✅ Auth correct
- [ ] `PUT /api/buddy/listings/[id]` - Add ownership check
- [ ] `DELETE /api/buddy/listings/[id]` - Add ownership check
- [ ] `GET /api/buddy/my-listings` - Add auth
- [ ] `POST /api/buddy/interests` - Add auth
- [ ] `GET /api/buddy/contact` - Add auth
- [ ] `POST /api/buddy/safety` - Add auth

### Free Diving
Routes: `/api/free-diving/*`
- [ ] `GET /api/free-diving/listings` - Public OK
- [ ] `POST /api/free-diving/my-listings` - Auth required
- [ ] `PUT /api/free-diving/listings/[id]` - Owner OR admin
- [ ] `DELETE /api/free-diving/listings/[id]` - Owner OR admin

### Bookings
Routes: `/api/bookings/*`
- [ ] `POST /api/bookings` - Auth required
- [ ] `GET /api/my-bookings` - Auth required
- [ ] `PUT /api/bookings/[id]` - Owner OR admin
- [ ] `POST /api/bookings/[id]/confirm` - Auth required
- [ ] `POST /api/bookings/[id]/complete` - Owner OR admin
- [ ] `POST /api/bookings/[id]/reviews` - Auth required

### Photos
Routes: `/api/photos/*`
- [ ] `POST /api/photos/upload` - ✅ Auth correct
- [ ] `GET /api/photos/[id]` - Public or auth based on status
- [ ] `GET /api/photos/site/[id]` - Public
- [ ] `GET /api/photos/instructor/[id]` - Public
- [ ] `GET /api/photos/free-diving/[id]` - Public

### Protection & Blocking
Routes: `/api/protection/*`
- [ ] `GET /api/protection/reputation/[userId]` - Public (anonymized)
- [ ] `POST /api/protection/block-user` - Auth required
- [ ] `POST /api/protection/request-deposit` - Auth required
- [ ] `POST /api/protection/complaints` - Auth required
- [ ] `POST /api/protection/damage-claims` - Auth required

### Payments
Routes: `/api/payments/*`, `/api/payment-packages`
- [ ] `POST /api/payments/bit/payment-request` - Auth required
- [ ] `POST /api/payments/bit/verify` - Auth required
- [ ] `POST /api/payments/bit/link-account` - Auth required
- [ ] `POST /api/payments/bit/refund` - Auth required (owner OR admin)
- [ ] `GET /api/payment-packages` - Public
- [ ] `POST /api/payment-packages` - Admin only

### Equipment Rentals
Routes: `/api/equipment/rentals/*`
- [ ] `POST /api/equipment/rentals/create` - Auth required
- [ ] `GET /api/equipment/rentals/[id]` - Owner OR admin
- [ ] `PUT /api/equipment/rentals/[id]` - Owner OR admin
- [ ] `GET /api/equipment/commissions/my-account` - Auth required
- [ ] `GET /api/equipment/commissions/invoices` - Auth required

### Tracking
Routes: `/api/tracking/*`
- [ ] `POST /api/tracking/location` - Auth required
- [ ] `POST /api/tracking/trip/start` - Auth required
- [ ] `POST /api/tracking/trip/[tripId]` - Auth required
- [ ] `GET /api/tracking/eta` - Auth required
- [ ] `POST /api/tracking/shuttle/batch-location` - Shuttle driver only

---

## PHASE 4: ENVIRONMENT & DEPLOYMENT

- [ ] Generate `CRON_SECRET` and add to `.env.local`
  ```bash
  # Generate 32-char random secret
  openssl rand -base64 32 > cron_secret.txt
  # Add to .env.local as CRON_SECRET=...
  ```

- [ ] Verify all admin users in DB have proper role/is_active/status
  ```sql
  SELECT id, user_id, role, is_active, status FROM admin_users;
  ```

- [ ] Add RLS policies (if not present)
  ```sql
  -- Check current policies
  SELECT * FROM pg_policies WHERE tablename = 'admin_users';
  ```

- [ ] Test all auth scenarios (see AUTHORIZATION_AUDIT.md section 9)

- [ ] Update API documentation with new auth patterns

- [ ] Security review of all changes

- [ ] Deploy to staging environment

- [ ] Run full test suite

- [ ] Deploy to production

---

## PRIORITY ORDER

### MUST DO FIRST (Blocking)
1. ✅ Fix admin middleware (Done)
2. ✅ Protect admin dashboard (Done)
3. ✅ Fix equipment auth (Done)
4. ✅ Fix photo pending (Done)
5. **Protect ALL remaining admin routes** (12 hours)
6. **Add CRON secret protection** (1 hour)
7. **Test all 5 scenarios** (2 hours)

### THEN DO (Next Sprint)
- [ ] Enhance user route auth (4 hours)
- [ ] Add audit logging to admin operations (2 hours)
- [ ] Create admin dashboard frontend with auth (4 hours)
- [ ] Implement 2FA enforcement (2 hours)

### NICE TO HAVE (Later)
- [ ] Rate limiting per user (2 hours)
- [ ] API usage analytics (4 hours)
- [ ] Permission audit reports (2 hours)
- [ ] Bulk permission changes (2 hours)

---

## TESTING BEFORE DEPLOYMENT

### Unit Tests to Add
```typescript
// src/lib/security/__tests__/route-auth.test.ts
describe('requireAuth', () => {
  it('should return error for unauthenticated request', async () => {});
  it('should return user for authenticated request', async () => {});
});

describe('requireAdminRole', () => {
  it('should deny non-admin users', async () => {});
  it('should allow admin users', async () => {});
  it('should deny suspended admins', async () => {});
});

describe('verifyOwnership', () => {
  it('should allow resource owner', () => {});
  it('should deny non-owner', () => {});
});
```

### Integration Tests to Add
```bash
# Test as anonymous user
curl http://localhost:3000/api/admin/dashboard
# Should return 401

# Test as regular user
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3000/api/admin/dashboard
# Should return 403

# Test as admin
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/dashboard
# Should return 200
```

---

## Sign-Off Checklist

Before merging:

- [ ] All critical routes protected
- [ ] No hardcoded admin assumptions
- [ ] No header-based auth
- [ ] All ownership checks in place
- [ ] CRON secret protected
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Security review approved
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] Production deployment plan created

---

## Rollback Plan

If issues found in production:

1. Identify which routes are broken
2. Check if role/permission issue or implementation issue
3. If role issue: Quick hotfix role mapping
4. If implementation: Revert route and fix in staging
5. Use feature flags to disable routes while fixing

---

## Metrics to Monitor

After deployment, watch these metrics:

- [ ] Auth failure rate (should be low but non-zero)
- [ ] Admin operation latency (should be <200ms added)
- [ ] Database query volume for admin_users (monitor spike)
- [ ] RLS policy violation attempts (monitor security)
- [ ] Failed admin authentications (monitor attacks)

---

## Questions?

See:
- `AUTHORIZATION_AUDIT.md` - Full security audit
- `AUTH_IMPLEMENTATION_GUIDE.md` - How to implement
- `src/lib/security/route-auth.ts` - Code reference

---

**Created:** 2026-06-20  
**Status:** Ready for implementation  
**Estimated Total Time:** 12-16 hours  
**Team:** Backend + Security  
**Deadline:** End of week  
