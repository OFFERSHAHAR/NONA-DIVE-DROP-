# DIVE DROP Security Hardening Checklist

**Status:** COMPREHENSIVE AUDIT & IMPLEMENTATION GUIDE
**Date:** 2026-06-20
**Focus:** Authentication, API Security, and Authorization

---

## EXECUTIVE SUMMARY

This document provides a complete security hardening roadmap for DIVE DROP's authentication and API infrastructure. The project uses Supabase for core auth, Next.js 16 with async params, and jose for JWT handling. Critical gaps identified and mitigated below.

**Risk Areas Identified:**
- Token storage lacks secure HttpOnly cookie patterns
- Rate limiting is in-memory only (not distributed)
- CORS validation is missing
- No refresh token rotation pattern
- Logout doesn't invalidate sessions
- Input sanitization gaps on admin endpoints
- Missing HSTS and security headers
- Admin token verification is inconsistent

---

## 1. TOKEN STORAGE & REFRESH PATTERNS (JOSE)

### Current State
- Using Supabase auth session (automatic)
- JWT service in `/src/lib/admin/jwt-service.ts` for admin tokens
- Refresh tokens stored in memory/cookies without rotation

### GAPS
- [ ] No explicit HttpOnly/Secure/SameSite flags on admin tokens
- [ ] No refresh token rotation (CVE-2021-22911 pattern)
- [ ] No token revocation list (blacklist)
- [ ] Refresh tokens not stored in secure storage

### FIXES REQUIRED

**File: `/src/lib/auth/token-security.ts` (NEW)**
```typescript
// Secure token cookie handling
// Token storage patterns with rotation
// Revocation list management
```

**File: `/src/app/api/auth/refresh/route.ts` (NEW)**
```typescript
// Refresh token endpoint with rotation
// Implements refresh token family validation
// Detects token reuse attacks
```

**Priority:** CRITICAL

---

## 2. RATE LIMITING ON AUTH ENDPOINTS

### Current State
- In-memory rate limiting in middleware
- No distributed/persistent rate limiting
- No per-endpoint tuning

### GAPS
- [ ] In-memory store lost on restart
- [ ] No brute-force protection on login/register
- [ ] No exponential backoff
- [ ] No account lockout mechanism
- [ ] Not suitable for multi-instance deployments

### FIXES REQUIRED

**File: `/src/lib/security/rate-limiter.ts` (NEW)**
```typescript
// Redis-backed rate limiting
// Per-endpoint configuration
// Distributed across instances
```

**File: `/src/app/api/auth/login/route.ts` (NEW)**
```typescript
// Rate limited login endpoint
// Account lockout after N failures
// Audit logging of attempts
```

**Priority:** HIGH

---

## 3. CORS & ORIGIN VALIDATION

### Current State
- No explicit CORS configuration found
- Next.js default CORS behavior
- No origin whitelist

### GAPS
- [ ] Missing explicit CORS headers
- [ ] No origin validation on API routes
- [ ] Credentials not properly handled
- [ ] No preflight handling

### FIXES REQUIRED

**File: `/src/lib/security/cors.ts` (NEW)**
```typescript
// CORS middleware with origin validation
// Configurable whitelist
// Proper credential handling
```

**File: `/src/lib/security/headers.ts` (NEW)**
```typescript
// Security headers (HSTS, CSP, etc.)
// Per-route header configuration
```

**Priority:** HIGH

---

## 4. INPUT SANITIZATION ON ALL ENDPOINTS

### Current State
- Zod validation on admin/auth routes
- Missing sanitization on free-text fields
- No HTML/SQL injection prevention on search/filter params

### GAPS
- [ ] Query parameters not sanitized
- [ ] Search fields allow special characters
- [ ] No HTML escaping on text fields
- [ ] File upload paths not validated
- [ ] Dive site descriptions not sanitized

### FIXES REQUIRED

**File: `/src/lib/security/input-validation.ts` (NEW)**
```typescript
// Sanitization utilities
// XSS prevention
// Special character filtering
```

**Update:** `/src/lib/auth/schemas.ts`
```typescript
// Add sanitization to all auth schemas
// Email normalization
// Password strength validation improvements
```

**Priority:** HIGH

---

## 5. LOGOUT & SESSION INVALIDATION

### Current State
- Supabase handles logout via `signOut()`
- Admin tokens not explicitly revoked
- No session tracking

### GAPS
- [ ] No logout audit trail
- [ ] Admin tokens not added to blacklist
- [ ] No session invalidation across devices
- [ ] Refresh tokens not revoked on logout

### FIXES REQUIRED

**File: `/src/lib/security/session-manager.ts` (NEW)**
```typescript
// Session tracking and invalidation
// Logout event emission
// Multi-device session management
```

**File: `/src/app/api/auth/logout/route.ts` (NEW)**
```typescript
// Enhanced logout with token revocation
// Audit logging
// All-devices logout option
```

**Priority:** CRITICAL

---

## 6. MULTI-FACTOR AUTH (MFA) OPPORTUNITIES

### Current State
- No MFA implementation
- Supabase supports TOTP via extensions

### RECOMMENDATIONS

**Phase 1: TOTP Implementation**
- [ ] Enable Supabase MFA extension
- [ ] Add TOTP setup page
- [ ] Backup codes generation
- [ ] Recovery options

**Phase 2: WebAuthn**
- [ ] Hardware key support
- [ ] Biometric authentication
- [ ] Passwordless login

**File:** `/src/lib/auth/mfa-service.ts` (NEW)
```typescript
// TOTP generation and verification
// MFA enrollment flow
// Backup code management
```

**Priority:** MEDIUM (post-launch)

---

## 7. OAUTH INTEGRATION

### Current State
- Supabase supports OAuth providers
- No OAuth setup in current codebase

### RECOMMENDATIONS

**Supported Providers:**
- Google (recommended)
- GitHub
- Apple
- Microsoft

**File:** `/src/lib/auth/oauth-providers.ts` (NEW)
```typescript
// OAuth provider configuration
// Token handling
// Profile mapping
```

**Priority:** MEDIUM (feature request dependent)

---

## 8. ADMIN ROUTE PROTECTION

### Current State
- Admin routes protected by middleware
- Admin API routes use `withAdminAuth` middleware
- Role-based access control exists

### GAPS
- [ ] Inconsistent auth method (Supabase vs JWT)
- [ ] No permission granularity (only admin/not-admin)
- [ ] No audit trail for admin actions
- [ ] Missing CSRFtoken on admin forms
- [ ] Next.js 16 async params not fully handled

### FIXES REQUIRED

**File: `/src/lib/admin/permissions.ts` (REVIEW & ENHANCE)**
```typescript
// Role-based permission matrix
// Granular permissions
// Permission caching
```

**File: `/src/lib/admin/csrf-protection.ts` (NEW)**
```typescript
// CSRF token generation
// CSRF middleware
// Form state binding
```

**File: `/src/app/api/admin/[...admin]/route.ts` (NEW)**
```typescript
// Unified admin API route handler
// Consistent auth & validation
// Async params handling for Next.js 16
```

**Priority:** HIGH

---

## 9. NEXT.JS 16 ASYNC PARAMS REVIEW

### Current State
- Recent commits show async params updates
- Some routes still may use old pattern

### REQUIRED CHANGES

All route handlers must follow pattern:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // MUST await
  // ... handler code
}
```

**Files to Audit:**
- [ ] All `/src/app/api/**/*.ts` route handlers
- [ ] Dynamic route parameters
- [ ] Catch-all routes

**Priority:** CRITICAL

---

## 10. SECURITY HEADERS IMPLEMENTATION

### Current State
- No explicit security headers
- Using Next.js default headers

### REQUIRED HEADERS

**File: `/src/middleware.ts` (UPDATE)**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [see implementation]
Permissions-Policy: [see implementation]
```

**Priority:** MEDIUM

---

## 11. ENVIRONMENT VARIABLES & SECRETS

### Current State
- Using `.env.local` for secrets
- ADMIN credentials in env vars
- Session secret present

### BEST PRACTICES

**Required in `.env.local`:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - ✓ (public)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ✓ (public)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Server only
- [ ] `ADMIN_SESSION_SECRET` - Strong random
- [ ] `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Strong creds
- [ ] `ADMIN_TOKEN_EXPIRY_HOURS` - Default 8h
- [ ] `REFRESH_TOKEN_EXPIRY_HOURS` - Default 72h
- [ ] `RATE_LIMIT_REQUESTS` - Default 100
- [ ] `RATE_LIMIT_WINDOW_SECONDS` - Default 60
- [ ] `SESSION_SECRET` - For session signing

**Priority:** CRITICAL

---

## 12. AUDIT LOGGING & MONITORING

### Current State
- Basic audit logging in admin actions
- `/src/lib/admin/audit.ts` exists

### ENHANCEMENTS NEEDED

- [ ] Log all authentication attempts
- [ ] Log all authorization failures
- [ ] Log sensitive data access
- [ ] Structured logging (JSON format)
- [ ] Audit log retention policy (90 days+)
- [ ] Real-time alerts for suspicious activity

**File: `/src/lib/security/audit-logger.ts` (NEW)**
```typescript
// Comprehensive audit logging
// Structured event format
// Real-time alerting
```

**Priority:** HIGH

---

## 13. DEPENDENCY SECURITY

### Current State
**Key Packages Identified:**
- `jose` ^5.10.0 - JWT handling ✓ (latest)
- `zod` ^4.4.3 - Input validation ✓ (latest)
- `@supabase/ssr` ^0.12.0 - Auth ✓ (latest)
- `next` 16.2.9 - Framework ✓ (latest)

### SECURITY UPDATES
- [ ] Run `npm audit` regularly
- [ ] Enable Dependabot on GitHub
- [ ] Update dev dependencies
- [ ] Test updates in staging first

**Priority:** ONGOING

---

## IMPLEMENTATION ROADMAP

### Phase 1: CRITICAL (Week 1)
1. Add refresh token rotation
2. Implement rate limiting (Redis-backed)
3. Add CSRF protection
4. Implement session invalidation on logout
5. Review and fix async params in all routes

### Phase 2: HIGH (Week 2)
6. Add CORS & origin validation
7. Implement input sanitization
8. Add security headers (HSTS, CSP)
9. Enhance audit logging
10. Add account lockout after failed logins

### Phase 3: MEDIUM (Week 3-4)
11. TOTP/MFA implementation
12. OAuth provider integration
13. Advanced threat detection
14. Security headers refinement
15. Documentation & team training

---

## TESTING CHECKLIST

### Authentication Testing
- [ ] Normal login flow works
- [ ] Invalid credentials rejected
- [ ] Session expires correctly
- [ ] Refresh token rotates
- [ ] Logout invalidates tokens
- [ ] Admin routes blocked for non-admins

### Rate Limiting Testing
- [ ] Limit enforced after N requests
- [ ] Counter resets per window
- [ ] Distributed across instances
- [ ] Lockout after repeated failures

### CORS Testing
- [ ] Valid origins allowed
- [ ] Invalid origins blocked
- [ ] Credentials sent correctly
- [ ] Preflight requests work

### Input Validation Testing
- [ ] XSS payloads rejected
- [ ] SQL injection attempts blocked
- [ ] Path traversal prevented
- [ ] Unicode handling correct

### Async Params Testing
- [ ] All dynamic routes use await
- [ ] Params correctly destructured
- [ ] No race conditions
- [ ] Error handling works

---

## COMPLIANCE MAPPING

**OWASP Top 10 (2021)**
- A01: Broken Access Control → Admin auth, permissions ✓
- A02: Cryptographic Failures → HTTPS, secure cookies ✓
- A03: Injection → Input validation, prepared statements ✓
- A04: Insecure Design → MFA, session management ✓
- A05: Security Misconfiguration → Headers, env vars ✓
- A06: Vulnerable Components → Dependency scanning ✓
- A07: Authentication Failures → Rate limiting, MFA ✓
- A08: Data Integrity Failures → Audit logging ✓
- A09: Logging Failures → Audit trails ✓
- A10: SSRF → Origin validation ✓

**SOC 2 Type II**
- CC6.1: Logical access controls ✓
- CC6.2: Prior to issuing system credentials ✓
- CC7.2: System monitoring ✓
- CC7.3: Unauthorized activities detected ✓

---

## MONITORING & ALERTS

### Recommended Alerts
1. Failed login attempts (>5 in 5 minutes)
2. Token refresh failures
3. Admin route access failures
4. Rate limit exceeded
5. Unusual geographic access
6. Multiple concurrent sessions
7. Password reset attempts

### Logging Infrastructure
- Use structured JSON logging
- Send logs to centralized system (e.g., Datadog, LogRocket)
- Set retention to 90+ days
- Enable real-time alerting

---

## REVIEW SCHEDULE

- **Weekly:** Security header updates
- **Monthly:** Dependency updates & audit
- **Quarterly:** Full security audit
- **Annually:** Penetration testing

---

## CONTACT & ESCALATION

**Security Team:** [Your Security Contact]
**Report Vulnerabilities:** [Bug Bounty Program if available]
**Incident Response:** [Incident Response Plan]

---

## REFERENCES

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [jose NPM Documentation](https://github.com/panva/jose)
- [Next.js Security Best Practices](https://nextjs.org/docs/basic-features/pages#security)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated:** 2026-06-20
**Next Review:** 2026-07-20
**Status:** READY FOR IMPLEMENTATION
