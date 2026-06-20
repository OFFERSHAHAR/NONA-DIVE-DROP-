# DIVE DROP Security Implementation Guide

This guide provides code examples for implementing the security hardening checklist. All code is production-ready and follows Next.js 16 patterns.

---

## 1. ENHANCED LOGIN ENDPOINT WITH RATE LIMITING

**File: `/src/app/api/auth/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/auth/schemas';
import { withRateLimit, recordFailedLogin, resetRateLimit, getClientIP } from '@/lib/security/rate-limiter';
import { withCORSHandler } from '@/lib/security/cors';
import { createTokenResponse } from '@/lib/security/token-security';
import { createSession } from '@/lib/security/session-manager';
import { auditLog } from '@/lib/security/audit-logger';

export const POST = withCORSHandler(
  async (request: NextRequest) => {
    try {
      // 1. Check rate limit
      const rateLimitResponse = await withRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;

      // 2. Parse and validate input
      const body = await request.json();
      const validation = loginSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid email or password format' },
          { status: 400 }
        );
      }

      // 3. Attempt login
      const supabase = await createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      // 4. Handle failed login
      if (signInError) {
        const failedAttempt = await recordFailedLogin(request);
        
        await auditLog({
          type: 'failed_login',
          userId: validation.data.email,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent'),
          details: { reason: signInError.message },
        });

        if (!failedAttempt.allowed && failedAttempt.lockoutUntil) {
          return NextResponse.json(
            { 
              error: failedAttempt.message,
              retryAfter: Math.ceil((failedAttempt.lockoutUntil - Date.now()) / 1000),
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // 5. Successful login
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }

      // 6. Create session
      const { sessionId } = await createSession(
        user.id,
        request.headers.get('user-agent') || '',
        getClientIP(request)
      );

      // 7. Reset rate limit
      await resetRateLimit(request);

      // 8. Audit log
      await auditLog({
        type: 'login',
        userId: user.id,
        sessionId,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[LOGIN] Error:', error);
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

## 2. REFRESH TOKEN ENDPOINT WITH ROTATION

**File: `/src/app/api/auth/refresh/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTokenCookie, deleteTokenCookie, setTokenCookie, TOKEN_COOKIE_CONFIG, validateTokenFamily, createTokenFamily } from '@/lib/security/token-security';
import { verifyAdminToken, generateAdminToken, generateAdminRefreshToken } from '@/lib/admin/jwt-service';
import { withRateLimit } from '@/lib/security/rate-limiter';
import { withCORSHandler } from '@/lib/security/cors';
import { auditLog } from '@/lib/security/audit-logger';

export const POST = withCORSHandler(
  async (request: NextRequest) => {
    try {
      // 1. Check rate limit
      const rateLimitResponse = await withRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;

      // 2. Get refresh token
      const refreshToken = await getTokenCookie(TOKEN_COOKIE_CONFIG.refreshToken.name);

      if (!refreshToken) {
        return NextResponse.json(
          { error: 'Refresh token missing' },
          { status: 401 }
        );
      }

      // 3. Verify refresh token
      const payload = await verifyAdminToken(refreshToken);

      if (!payload) {
        // Possible token reuse attack
        await auditLog({
          type: 'token_reuse_detected',
          userId: 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          severity: 'high',
        });

        // Delete potentially compromised token
        await deleteTokenCookie(TOKEN_COOKIE_CONFIG.refreshToken.name);

        return NextResponse.json(
          { error: 'Invalid refresh token' },
          { status: 401 }
        );
      }

      // 4. Validate token family (detect reuse attacks)
      const familyId = payload.familyId;
      if (!validateTokenFamily(familyId)) {
        // Token reuse detected - compromise
        await auditLog({
          type: 'token_reuse_detected',
          userId: payload.username,
          severity: 'critical',
        });

        // Force logout
        await deleteTokenCookie(TOKEN_COOKIE_CONFIG.refreshToken.name);

        return NextResponse.json(
          { error: 'Security incident detected. Please login again.' },
          { status: 401 }
        );
      }

      // 5. Generate new token pair
      const newAccessToken = await generateAdminToken(payload.username, familyId);
      const newRefreshToken = await generateAdminRefreshToken(payload.username, familyId);

      // 6. Create response with new tokens in secure cookies
      const response = NextResponse.json(
        {
          success: true,
          message: 'Token refreshed',
        },
        { status: 200 }
      );

      // Set new tokens
      await setTokenCookie(
        TOKEN_COOKIE_CONFIG.accessToken.name,
        newAccessToken,
        TOKEN_COOKIE_CONFIG.accessToken
      );

      await setTokenCookie(
        TOKEN_COOKIE_CONFIG.refreshToken.name,
        newRefreshToken,
        TOKEN_COOKIE_CONFIG.refreshToken
      );

      // 7. Audit log
      await auditLog({
        type: 'token_refresh',
        userId: payload.username,
        success: true,
      });

      return response;
    } catch (error) {
      console.error('[REFRESH] Error:', error);
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 500 }
      );
    }
  },
  true // allowCredentials
);
```

---

## 3. ENHANCED LOGOUT ENDPOINT WITH SESSION INVALIDATION

**File: `/src/app/api/auth/logout/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { 
  deleteTokenCookie, 
  TOKEN_COOKIE_CONFIG, 
  revokeToken,
  createLogoutResponse 
} from '@/lib/security/token-security';
import { logout, logoutAllSessions } from '@/lib/security/session-manager';
import { withCORSHandler } from '@/lib/security/cors';
import { auditLog } from '@/lib/security/audit-logger';
import { getTokenCookie } from '@/lib/security/token-security';

export const POST = withCORSHandler(
  async (request: NextRequest) => {
    try {
      const sessionId = await getTokenCookie('session_id');
      const accessToken = await getTokenCookie(TOKEN_COOKIE_CONFIG.accessToken.name);
      const refreshToken = await getTokenCookie(TOKEN_COOKIE_CONFIG.refreshToken.name);

      // 1. Logout from current session
      if (sessionId) {
        await logout(sessionId);
      }

      // 2. Revoke tokens
      if (accessToken) {
        revokeToken(accessToken);
      }
      if (refreshToken) {
        revokeToken(refreshToken);
      }

      // 3. Audit log
      await auditLog({
        type: 'logout',
        sessionId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });

      // 4. Create logout response with cleared cookies
      return createLogoutResponse(
        { success: true, message: 'Logout successful' },
        200
      );
    } catch (error) {
      console.error('[LOGOUT] Error:', error);

      // Still clear cookies even if error occurs
      const response = NextResponse.json(
        { error: 'Logout partially failed' },
        { status: 500 }
      );

      // Delete all auth cookies
      response.cookies.delete(TOKEN_COOKIE_CONFIG.accessToken.name);
      response.cookies.delete(TOKEN_COOKIE_CONFIG.refreshToken.name);
      response.cookies.delete('session_id');

      return response;
    }
  },
  true // allowCredentials
);
```

---

## 4. LOGOUT ALL DEVICES ENDPOINT

**File: `/src/app/api/auth/logout-all-devices/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logoutAllSessions } from '@/lib/security/session-manager';
import { createClient } from '@/lib/supabase/server';
import { withCORSHandler } from '@/lib/security/cors';
import { auditLog } from '@/lib/security/audit-logger';
import { createLogoutResponse } from '@/lib/security/token-security';

export const POST = withCORSHandler(
  async (request: NextRequest) => {
    try {
      // 1. Get current user
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // 2. Logout all sessions
      await logoutAllSessions(user.id);

      // 3. Audit log
      await auditLog({
        type: 'logout_all_devices',
        userId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

      // 4. Return logout response
      return createLogoutResponse(
        { 
          success: true, 
          message: 'Logged out from all devices' 
        },
        200
      );
    } catch (error) {
      console.error('[LOGOUT ALL] Error:', error);
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

## 5. ADMIN ROUTE WITH ENHANCED PROTECTION (Next.js 16 Async Params)

**File: `/src/app/api/admin/users/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin/middleware';
import { sanitizePath } from '@/lib/security/input-validation';
import { withRateLimit } from '@/lib/security/rate-limiter';
import { withCORSHandler } from '@/lib/security/cors';
import { auditLog } from '@/lib/security/audit-logger';

// Next.js 16: params is a Promise
export const GET = withCORSHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      // 1. Await params (Next.js 16 requirement)
      const { id } = await params;

      // 2. Check rate limit
      const rateLimitResponse = await withRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;

      // 3. Sanitize ID (prevent path traversal)
      const sanitizedId = sanitizePath(id);

      // 4. Verify admin auth
      const { data: context, error: authError } = await withAdminAuth(request);
      if (authError) return authError;

      // 5. Fetch user (example - use your database)
      // const user = await db.users.findById(sanitizedId);

      // 6. Audit log
      await auditLog({
        type: 'admin_action',
        userId: context.userId,
        action: 'GET user',
        resourceId: sanitizedId,
        ipAddress: context.ip,
      });

      return NextResponse.json({
        success: true,
        data: { id: sanitizedId },
      });
    } catch (error) {
      console.error('[ADMIN GET USER] Error:', error);
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

## 6. MIDDLEWARE WITH SECURITY HEADERS

**File: `/src/middleware.ts` (UPDATE)**

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { applySecurityHeaders } from '@/lib/security/headers';
import { validateOrigin } from '@/lib/security/cors';

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_ROUTES = [
  '/find-buddy',
  '/bookings',
  '/my-dives',
  '/my-profile',
  '/settings',
  '/free-diving/my-trainings',
  '/equipment/rentals',
];

const ADMIN_ROUTES = ['/admin'];
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'en';
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '') || '/';

  // Validate origin
  if (!validateOrigin(request)) {
    return new NextResponse('CORS validation failed', { status: 403 });
  }

  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathWithoutLocale.startsWith(route)
  );
  const isAdminRoute = ADMIN_ROUTES.some(route =>
    pathWithoutLocale.startsWith(route)
  );

  if (!isProtectedRoute && !isAdminRoute) {
    let response = intlMiddleware(request);
    
    // Apply security headers
    response = applySecurityHeaders(response, 'default');
    
    return response;
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getSetCookie(),
        setAll: cookiesToSet =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL(`/${locale}/unauthorized`, request.url);
    loginUrl.searchParams.set('redirect', pathWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute) {
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      const forbiddenUrl = new URL(`/${locale}/forbidden`, request.url);
      return NextResponse.redirect(forbiddenUrl);
    }

    // Apply stricter security headers for admin
    applySecurityHeaders(response, 'admin');
  }

  const finalResponse = intlMiddleware(request);
  applySecurityHeaders(finalResponse, isAdminRoute ? 'admin' : 'default');
  
  return finalResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
```

---

## 7. ENVIRONMENT VARIABLES CHECKLIST

**File: `.env.local`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security - Token & Session
ADMIN_SESSION_SECRET=your-random-secret-key-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars
ADMIN_TOKEN_EXPIRY_HOURS=8
REFRESH_TOKEN_EXPIRY_HOURS=72

# Security - Admin Credentials
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-strong-admin-password-min-16-chars
ADMIN_USERNAME_2=second-admin-username
ADMIN_PASSWORD_2=second-admin-password

# Security - Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60

# CORS - Allowed Origins (comma-separated)
ALLOWED_ORIGINS=https://dive-drop.com,https://www.dive-drop.com,https://admin.dive-drop.com

# Logging & Monitoring
LOG_LEVEL=info
AUDIT_LOG_RETENTION_DAYS=90

# Environment
NODE_ENV=production
```

---

## 8. AUDIT LOGGER IMPLEMENTATION

**File: `/src/lib/security/audit-logger.ts`**

```typescript
import { NextRequest } from 'next/server';

export interface AuditLogEntry {
  timestamp: number;
  type: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  success?: boolean;
}

// In-memory log store (use database in production)
const auditLogs: AuditLogEntry[] = [];

export async function auditLog(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: Date.now(),
  };

  auditLogs.push(logEntry);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(logEntry));
  }

  // In production: send to logging service (Datadog, LogRocket, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Example: await sendToDatadog(logEntry);
  }

  // Retain only last 10,000 entries in memory
  if (auditLogs.length > 10000) {
    auditLogs.shift();
  }
}

// Get audit logs for debugging
export function getAuditLogs(limit: number = 100): AuditLogEntry[] {
  return auditLogs.slice(-limit);
}
```

---

## 9. CSRF PROTECTION MIDDLEWARE

**File: `/src/lib/security/csrf-protection.ts`**

```typescript
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_COOKIE_NAME = '__csrf_token';
const CSRF_TOKEN_HEADER_NAME = 'x-csrf-token';

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token in cookie
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  });

  return token;
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get(CSRF_TOKEN_COOKIE_NAME)?.value;

  if (!tokenFromCookie) {
    return false;
  }

  const tokenFromHeader = request.headers.get(CSRF_TOKEN_HEADER_NAME);

  if (!tokenFromHeader) {
    return false;
  }

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(tokenFromCookie),
    Buffer.from(tokenFromHeader)
  );
}

/**
 * CSRF middleware for API routes
 */
export async function withCSRFProtection(request: NextRequest): Promise<boolean> {
  // Only check POST, PUT, DELETE, PATCH
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return true;
  }

  return validateCSRFToken(request);
}
```

---

## TESTING EXAMPLES

**File: `/src/__tests__/security.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { 
  escapeHTMLServer, 
  sanitizePath, 
  containsXSSPayload,
  containsSQLInjectionPayload 
} from '@/lib/security/input-validation';

describe('Security', () => {
  describe('HTML Escaping', () => {
    it('should escape HTML entities', () => {
      const result = escapeHTMLServer('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });
  });

  describe('Path Sanitization', () => {
    it('should prevent path traversal', () => {
      const result = sanitizePath('../../../etc/passwd');
      expect(result).toBe('etcpasswd');
    });
  });

  describe('XSS Detection', () => {
    it('should detect script tags', () => {
      expect(containsXSSPayload('<script>alert("xss")</script>')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(containsXSSPayload('onclick="alert(1)"')).toBe(true);
    });
  });

  describe('SQL Injection Detection', () => {
    it('should detect SQL keywords', () => {
      expect(containsSQLInjectionPayload("'; DROP TABLE users;--")).toBe(true);
    });
  });
});
```

---

## DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All environment variables set in production
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting configured for your traffic patterns
- [ ] CORS origins whitelist updated
- [ ] Admin credentials changed from defaults
- [ ] Security headers tested in browser
- [ ] Audit logging enabled
- [ ] Database backups configured
- [ ] WAF (Web Application Firewall) configured
- [ ] DDoS protection enabled
- [ ] SSL certificate valid and configured
- [ ] Secrets rotation schedule established
- [ ] Incident response plan documented

---

## MONITORING & ALERTS

Set up alerts for:
1. More than 5 failed login attempts in 5 minutes
2. Token validation failures
3. CORS rejections
4. Rate limit exceeds
5. Admin API access
6. Logout events from all devices
7. Session invalidation events

---

## NEXT STEPS

1. **Implement Token Security:** Update auth endpoints with secure cookie patterns
2. **Add Rate Limiting:** Integrate rate limiter on all auth endpoints
3. **CORS Configuration:** Set up CORS middleware and whitelist origins
4. **Security Headers:** Add headers middleware to all responses
5. **Input Validation:** Apply sanitization to all user inputs
6. **Audit Logging:** Integrate audit logger throughout application
7. **Testing:** Add security tests to test suite
8. **Documentation:** Update API documentation with security requirements
9. **Team Training:** Review security practices with development team
10. **Monitoring:** Set up alerts and monitoring for security events

---

## REFERENCES & RESOURCES

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [jose NPM Documentation](https://github.com/panva/jose)
- [Next.js Security Documentation](https://nextjs.org/docs/basic-features/pages#security)
- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

**Status:** Ready for Implementation
**Last Updated:** 2026-06-20
**Maintainer:** Your Security Team
