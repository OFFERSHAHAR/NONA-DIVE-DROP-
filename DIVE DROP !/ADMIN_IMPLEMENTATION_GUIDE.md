# Admin Authentication Implementation Guide

**Phase**: Ready to Build  
**Priority**: Critical  
**Estimated Timeline**: 2-3 weeks

---

## Quick Start

### Files Created

1. **ADMIN_AUTH_DESIGN.md** - Complete architecture design
2. **src/lib/auth/admin-schemas.ts** - Zod validation schemas
3. **src/lib/admin/permissions.ts** - Permission checking utilities
4. **src/lib/admin/audit.ts** - Audit logging utilities
5. **supabase/migrations/admin_auth_schema.sql** - Database schema

---

## Implementation Timeline

### Phase 1: Database & Infrastructure (Days 1-2)

**Tasks:**
- [ ] Run Supabase migration: `supabase migrations up`
- [ ] Verify RLS policies are enabled
- [ ] Test RLS policies with different roles
- [ ] Create first super_admin user manually in Supabase
- [ ] Verify audit logging works

### Phase 2: Authentication Flow (Days 3-5)

**Tasks:**
- [ ] Build `/admin/login` page (login form)
- [ ] Build `/api/admin/auth/login` endpoint
- [ ] Implement password validation with enhanced requirements
- [ ] Add rate limiting middleware
- [ ] Build session management
- [ ] Add logout functionality

### Phase 3: Authorization & Middleware (Days 6-7)

**Tasks:**
- [ ] Create middleware for `/admin` routes
- [ ] Implement permission guard components
- [ ] Build permission check utilities
- [ ] Add breadcrumb navigation
- [ ] Create 403 Unauthorized page

### Phase 4: 2FA Setup (Days 8-10)

**Tasks:**
- [ ] Install `speakeasy` and `qrcode` libraries
- [ ] Build `/admin/2fa/enable` page
- [ ] Build `/admin/2fa/setup` endpoint
- [ ] Build `/admin/verify-2fa` page
- [ ] Generate backup codes

### Phase 5: Admin Management UI (Days 11-14)

**Tasks:**
- [ ] Build `/admin/users` page (list admins)
- [ ] Build `/admin/users/invite` page
- [ ] Build `/admin/users/[id]` page (edit user)
- [ ] Implement role change functionality
- [ ] Implement admin deactivation

### Phase 6: Audit & Monitoring (Days 15-17)

**Tasks:**
- [ ] Build `/admin/audit-logs` page
- [ ] Build audit log filtering/search
- [ ] Build `/admin/sessions` page (active sessions)
- [ ] Add suspicious activity detection

### Phase 7: Testing & Security Hardening (Days 18-21)

**Tasks:**
- [ ] Write integration tests
- [ ] Perform security audit
- [ ] Test rate limiting
- [ ] Test RLS policies
- [ ] Performance test

---

## Security Best Practices During Implementation

### 1. Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### 2. Session Management
- Use HTTP-only secure cookies
- Set SameSite=Strict
- Expire access token after 1 hour
- Expire refresh token after 7 days
- Implement idle timeout (45 minutes)

### 3. Rate Limiting
- Max 5 failed login attempts per 15 minutes per IP
- Implement exponential backoff
- Block after 3 consecutive lockouts

### 4. Audit Logging
- Log ALL admin actions with timestamp and IP
- Make audit logs append-only (no deletes/updates)
- Redact sensitive fields (passwords, tokens)
- Retain for minimum 90 days

### 5. HTTPS & Transport Security
- Enforce HTTPS only for admin panel
- Use STS headers
- Implement CORS restrictions

---

## Environment Variables Required

NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADMIN_LOGIN_URL=/admin/login
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=/admin
NEXT_PUBLIC_SESSION_EXPIRY_HOURS=1
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=45
RESEND_API_KEY=your-resend-key

---

**Status**: Ready for Phase 1 Implementation  
**Version**: 1.0
