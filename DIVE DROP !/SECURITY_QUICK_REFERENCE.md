# Security Quick Reference for DIVE DROP Developers

**TL;DR:** Comprehensive security hardening completed. Use code in `/src/lib/security/` for all auth and admin endpoints.

---

## 🚀 QUICK START (5 Minutes)

### 1. Use Secure Token Cookies
```typescript
import { createTokenResponse, createLogoutResponse } from '@/lib/security/token-security';

// Login response
return createTokenResponse(
  { success: true, user: userData },
  accessToken,
  refreshToken,
  200
);

// Logout response
return createLogoutResponse({ success: true }, 200);
```

### 2. Protect Auth Endpoints
```typescript
import { withRateLimit } from '@/lib/security/rate-limiter';
import { withCORSHandler } from '@/lib/security/cors';

export const POST = withCORSHandler(async (request) => {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Your handler code
}, true); // allowCredentials
```

### 3. Protect Admin Routes
```typescript
import { withAdminAuth } from '@/lib/admin/middleware';

export async function GET(request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ⚠️ Next.js 16: MUST await
  
  const { data: context, error } = await withAdminAuth(request);
  if (error) return error;
  
  // Your handler code
}
```

### 4. Sanitize User Input
```typescript
import { sanitizeSearchText, escapeHTMLServer } from '@/lib/security/input-validation';

const cleanText = sanitizeSearchText(userInput, 255);
const safeHTML = escapeHTMLServer(description);
```

### 5. Track Sessions
```typescript
import { createSession, logout, logoutAllSessions } from '@/lib/security/session-manager';

// After successful login
const { sessionId } = await createSession(userId, userAgent, ip);

// On logout
await logout(sessionId);

// Logout all devices
await logoutAllSessions(userId);
```

---

## 📋 CHECKLIST FOR ROUTE HANDLERS

Every API route should have:
- [ ] `withRateLimit` for rate limiting
- [ ] `withCORSHandler` for CORS validation
- [ ] `withAdminAuth` (admin routes only)
- [ ] Input validation with Zod schemas
- [ ] Input sanitization for user text
- [ ] Audit logging for important actions
- [ ] Error handling with proper status codes
- [ ] Async params awaited (Next.js 16)

**Template:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/security/rate-limiter';
import { withCORSHandler } from '@/lib/security/cors';

export const POST = withCORSHandler(
  async (request: NextRequest) => {
    // Rate limit check
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
      // Parse and validate input
      const body = await request.json();
      // const validation = yourSchema.safeParse(body);
      
      // Your logic here

      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    } catch (error) {
      console.error('[ROUTE] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  true // allowCredentials
);
```

---

## 🔐 COMMON SECURITY PATTERNS

### Pattern 1: Login with Rate Limiting
```typescript
import { recordFailedLogin, resetRateLimit } from '@/lib/security/rate-limiter';

// On failed login
const failedAttempt = await recordFailedLogin(request);
if (!failedAttempt.allowed) {
  return NextResponse.json(
    { error: failedAttempt.message },
    { status: 429 }
  );
}

// On successful login
await resetRateLimit(request);
```

### Pattern 2: Token Refresh with Rotation
```typescript
import { validateTokenFamily, revokeTokenFamily } from '@/lib/security/token-security';

if (!validateTokenFamily(familyId)) {
  // Possible token reuse attack!
  revokeTokenFamily(familyId);
  return NextResponse.json({ error: 'Security incident' }, { status: 401 });
}

// Generate new tokens with same family ID
```

### Pattern 3: Secure Logout
```typescript
import { revokeToken, createLogoutResponse } from '@/lib/security/token-security';

revokeToken(accessToken);
revokeToken(refreshToken);
await logout(sessionId);

return createLogoutResponse(
  { success: true, message: 'Logged out' },
  200
);
```

### Pattern 4: Admin Action with Audit
```typescript
import { withAdminAuth } from '@/lib/admin/middleware';
import { auditLog } from '@/lib/security/audit-logger';

const { data: context, error } = await withAdminAuth(request);
if (error) return error;

// Do admin action
await updateUser(userId);

// Log it
await auditLog({
  type: 'admin_action',
  userId: context.userId,
  action: 'UPDATE user',
  resourceId: userId,
  ipAddress: context.ip,
});
```

---

## ⚠️ COMMON MISTAKES TO AVOID

### ❌ Don't: Forget to await async params
```typescript
// WRONG - Next.js 16
export async function GET(request, { params }) {
  const id = params.id; // ❌ params is a Promise!
}

// RIGHT
export async function GET(request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ✓ Await the Promise
}
```

### ❌ Don't: Store tokens in localStorage
```typescript
// WRONG - XSS attack can steal it
localStorage.setItem('token', token);

// RIGHT - Use secure HttpOnly cookies (handled by token-security.ts)
```

### ❌ Don't: Skip input validation
```typescript
// WRONG - No validation
const description = request.body.description;

// RIGHT - Validate and sanitize
const validation = schema.safeParse(request.body);
if (!validation.success) return error response;
const description = sanitizeSearchText(validation.data.description);
```

### ❌ Don't: Expose sensitive error details
```typescript
// WRONG - Leaks info
return NextResponse.json({
  error: `User ${userId} not found in admin_users table`
}, { status: 403 });

// RIGHT - Generic message
return NextResponse.json({
  error: 'Access denied'
}, { status: 403 });
```

### ❌ Don't: Trust user-provided file names
```typescript
// WRONG
const fileName = request.body.fileName;
await uploadFile(fileName, data);

// RIGHT
import { sanitizeFileName } from '@/lib/security/input-validation';
const fileName = sanitizeFileName(request.body.fileName);
```

---

## 🧪 TESTING SECURITY

### Test Rate Limiting
```bash
# Make 6 requests to login endpoint in 30 seconds
# Should get 429 on 6th request
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

### Test CORS
```bash
# From different origin
curl -X OPTIONS http://localhost:3000/api/admin/users \
  -H "Origin: https://malicious.com"
# Should return 403
```

### Test Input Sanitization
```bash
const result = validateInputSecurity('<script>alert("xss")</script>');
console.log(result.safe); // false
console.log(result.issues); // ['Input contains potential XSS payload']
```

### Test Token Rotation
```typescript
// Get new tokens via refresh endpoint
const response1 = await fetch('/api/auth/refresh', { method: 'POST' });

// Try to use old refresh token again (reuse attack)
const response2 = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Cookie': `refresh_token=${oldToken}` }
});
// Should return 401 or revoke user sessions
```

---

## 🔍 DEBUGGING SECURITY ISSUES

### Check if token is secure
```typescript
import { TOKEN_COOKIE_CONFIG } from '@/lib/security/token-security';

// Verify in Network tab:
console.log(TOKEN_COOKIE_CONFIG.accessToken);
// Should show:
// { httpOnly: true, secure: true, sameSite: 'lax' }
```

### Check rate limit status
```typescript
import { getRateLimitStatus, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';

const status = getRateLimitStatus('ip:127.0.0.1', RATE_LIMIT_CONFIGS['POST /api/auth/login']);
console.log(status); // { count, maxRequests, remaining, resetAt }
```

### Check session validity
```typescript
import { validateSession } from '@/lib/security/session-manager';

const session = await validateSession(sessionId);
if (!session) {
  console.log('Session expired or invalid');
}
```

### Check if input contains XSS/SQL
```typescript
import { 
  validateInputSecurity, 
  containsXSSPayload, 
  containsSQLInjectionPayload 
} from '@/lib/security/input-validation';

const userInput = "<img src=x onerror='alert(1)'>";
const result = validateInputSecurity(userInput);
// { safe: false, issues: ['Input contains potential XSS payload'] }
```

---

## 🔐 ENVIRONMENT VARIABLES REQUIRED

```bash
# Token & Session Management
ADMIN_SESSION_SECRET=your-random-secret-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars
ADMIN_TOKEN_EXPIRY_HOURS=8
REFRESH_TOKEN_EXPIRY_HOURS=72

# Admin Credentials
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-strong-password-min-16-chars

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60

# CORS Origins
ALLOWED_ORIGINS=https://dive-drop.com,https://admin.dive-drop.com

# Logging
LOG_LEVEL=info
AUDIT_LOG_RETENTION_DAYS=90
```

**Check in .env.local if set:**
```bash
# Don't commit .env.local!
grep -E "ADMIN_SESSION_SECRET|SESSION_SECRET" .env.local
```

---

## 📊 MONITORING WHAT TO WATCH

### Critical Alerts
1. **Failed login rate >10% in 5min** → Possible brute force
2. **Rate limit rejections >100/min** → DDoS or bot
3. **Token validation failures >1%** → Possible compromise
4. **CORS rejections spike** → Configuration issue

### Health Checks
```typescript
// Add to /api/health endpoint
{
  auth: "operational",
  rateLimiting: "operational", 
  corsConfiguration: "valid",
  securityHeaders: "enabled",
  auditLogging: "active"
}
```

---

## 🚨 SECURITY INCIDENT RESPONSE

**Found a vulnerability?**
1. Stop deployment
2. Alert security team
3. Follow `IMPLEMENTATION_GUIDE.md` for fix
4. Create test case to prevent regression
5. Deploy hotfix
6. Document incident

**Suspected breach?**
1. Enable audit logging (if not already)
2. Review audit logs for suspicious activity
3. Force password reset for affected users
4. Revoke all sessions (use `logoutAllSessions()`)
5. Check for token reuse (review token_family validation logs)

---

## 📚 REFERENCE LINKS IN CODE

Each security module has detailed documentation:
- `/src/lib/security/token-security.ts` - Token patterns
- `/src/lib/security/rate-limiter.ts` - Rate limiting strategies
- `/src/lib/security/cors.ts` - CORS configuration
- `/src/lib/security/headers.ts` - Security headers
- `/src/lib/security/input-validation.ts` - Sanitization patterns
- `/src/lib/security/session-manager.ts` - Session lifecycle

---

## ✅ PRE-COMMIT CHECKLIST

Before pushing code:
```bash
# Does it handle rate limiting?
grep -l "withRateLimit" src/app/api/**/*.ts

# Does it handle CORS?
grep -l "withCORSHandler\|withCORS" src/app/api/**/*.ts

# Does it sanitize input?
grep -l "sanitize\|validate.*Input" src/app/api/**/*.ts

# Does it await async params?
grep -n "{ params }" src/app/**/*.ts | grep -v "await"

# Did you test it?
npm test -- security
```

---

## 🎯 SUCCESS METRICS

After implementing security hardening:
- [ ] 0 failed logins from same IP in 5 minutes
- [ ] <0.1% token validation failures
- [ ] 0 CORS rejections from allowed origins
- [ ] 100% of sensitive endpoints rate limited
- [ ] 0 XSS payloads passing validation
- [ ] 0 SQL injection strings passing validation
- [ ] All audit logs retained 90+ days
- [ ] <100ms for all auth endpoints
- [ ] All security headers present
- [ ] No sensitive data in error messages

---

## 📞 GETTING HELP

- **Security questions:** Slack #security channel
- **Code examples:** See `/IMPLEMENTATION_GUIDE.md`
- **Module documentation:** Read docstrings in `/src/lib/security/*.ts`
- **Audit trail:** See `/SECURITY_AUDIT_SUMMARY.md`
- **Implementation status:** See `/SECURITY_HARDENING_CHECKLIST.md`

---

**Last Updated:** June 20, 2026
**Status:** Production Ready
**Next Review:** July 20, 2026
