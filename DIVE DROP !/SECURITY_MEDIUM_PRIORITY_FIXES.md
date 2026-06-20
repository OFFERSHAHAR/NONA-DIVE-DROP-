# Medium-Priority Security Fixes Implementation

This PR implements 5 medium-priority security fixes for improved authentication, CSRF protection, and input validation.

## Summary of Fixes

| # | Fix | File(s) | Status |
|---|-----|---------|--------|
| 1 | Rate limiting: 5 failed attempts = 15 min lockout | `src/lib/security/rate-limiter.ts` `src/app/api/admin/login/route.ts` | ✅ |
| 2 | CSRF token validation on POST/PUT/DELETE | `src/lib/security/csrf.ts` `src/lib/security/middleware-wrapper.ts` | ✅ |
| 3 | Email token reuse prevention | `src/lib/email/tokens.ts` | ✅ |
| 4 | Input validation with Zod on admin login | `src/app/api/admin/login/route.ts` | ✅ |
| 5 | Constant-time password comparison | `src/lib/security/password-validation.ts` | ✅ |

---

## Fix 1: Rate Limiting (5 Failed Attempts = 15 Min Lockout)

### What Was Added

**File:** `src/lib/security/rate-limiter.ts`

- `checkRateLimit()` - Check if identifier is rate limited
- `recordFailedAttempt()` - Record a failed login attempt
- `recordSuccessfulAttempt()` - Reset rate limit counter
- `startRateLimitCleanup()` - Initialize cleanup of expired entries
- `RATE_LIMIT_CONFIGS` - Configurable limits per endpoint

### Configuration

```typescript
RATE_LIMIT_CONFIGS.adminLogin = {
  maxAttempts: 5,           // Lock after 5 attempts
  windowMs: 15 * 60 * 1000, // Within 15 minute window
  lockoutMs: 15 * 60 * 1000 // Lockout for 15 minutes
}
```

### Implementation in Admin Login

**File:** `src/app/api/admin/login/route.ts`

```typescript
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  recordSuccessfulAttempt,
  RATE_LIMIT_CONFIGS 
} from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimitKey = `admin-login:${clientIP}`;

  // Check if rate limited
  const rateLimitStatus = checkRateLimit(
    rateLimitKey, 
    RATE_LIMIT_CONFIGS.adminLogin
  );

  if (rateLimitStatus.isLimited) {
    return NextResponse.json(
      { error: rateLimitStatus.message },
      { status: 429, headers: { 
        'Retry-After': Math.ceil(
          (rateLimitStatus.remainingTime || 0) / 1000
        ).toString() 
      }}
    );
  }

  // Try to authenticate
  const credentialsValid = validateAdminCredentialsSecure(username, password);

  if (!credentialsValid) {
    // Record failure
    const result = recordFailedAttempt(
      rateLimitKey, 
      RATE_LIMIT_CONFIGS.adminLogin,
      clientIP
    );
    
    // Return 401, may trigger lockout
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // On success, reset rate limit
  recordSuccessfulAttempt(rateLimitKey);
  
  // Return session with CSRF token
  return createResponseWithCSRFToken({ success: true, data: session });
}
```

### Testing

```bash
npm test -- src/__tests__/security/rate-limiting.test.ts
```

### Behavior Examples

```
Request 1: ✓ Allowed (1 attempt)
Request 2: ✓ Allowed (2 attempts)
Request 3: ✓ Allowed (3 attempts)
Request 4: ✓ Allowed (4 attempts)
Request 5: ✓ Allowed (5 attempts)
Request 6: ✗ Locked (Account locked for 15 minutes)
Request 7 (30 sec later): ✗ Locked (14:30 remaining)
Request 8 (15 min later): ✓ Allowed (Lockout expired, counter reset)
```

### Production Setup

For production, use Redis instead of in-memory storage:

```bash
npm install redis
```

Then update rate-limiter.ts to use Redis client.

---

## Fix 2: CSRF Token Validation

### What Was Added

**File:** `src/lib/security/csrf.ts`

- `generateCSRFToken()` - Generate secure CSRF token
- `validateCSRFToken()` - Verify token signature and expiry
- `extractCSRFToken()` - Get token from headers/body/params
- `validateCSRFMiddleware()` - Middleware for checking CSRF
- `createResponseWithCSRFToken()` - Response helper
- `isCSRFExempt()` - Check endpoint exemptions

### How CSRF Protection Works

```
1. Initial Request (GET /login)
   ↓
   Server generates CSRF token: "abc123:1234567890:hmac..."
   ↓
   Set in cookie + response header
   ↓
   Client receives token

2. Form Submission (POST /api/admin/login)
   ↓
   Client includes token in header:
   { "x-csrf-token": "abc123:1234567890:hmac..." }
   ↓
   Server validates:
   - Token format (3 parts: data:timestamp:hmac)
   - HMAC signature (constant-time comparison)
   - Expiration (24 hours)
   ↓
   If valid: Process request
   If invalid: Return 403 Forbidden
```

### Implementation in Route

```typescript
import { 
  validateCSRFMiddleware, 
  createResponseWithCSRFToken 
} from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // Validate CSRF first
  const csrfValidation = await validateCSRFMiddleware(request);
  if (!csrfValidation.valid) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  // Process request...

  // Return response with new CSRF token
  return createResponseWithCSRFToken({
    success: true,
    data: { user: 'admin' }
  });
}
```

### Client Usage

```javascript
// Get token from cookie
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf-token='))
  ?.split('=')[1];

// Include in POST request
fetch('/api/admin/login', {
  method: 'POST',
  headers: {
    'x-csrf-token': token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ username, password })
});
```

### Exempt Endpoints

```typescript
// Webhooks and health checks don't need CSRF
CSRF_EXEMPT_ENDPOINTS = [
  'POST /api/webhooks/stripe',
  'POST /api/webhooks/supabase',
  'GET /api/public/health',
];
```

### Testing

```bash
npm test -- src/__tests__/security/csrf.test.ts
```

---

## Fix 3: Email Token Reuse Prevention

### What Was Added

**File:** `src/lib/email/tokens.ts`

Enhanced `verifyEmailToken()` with:
- `reused` flag detection
- Atomic update with optimistic locking
- `used_count` tracking
- `invalidated` and `invalidation_reason` checks

New functions:
- `isTokenInvalidated()` - Check if token was invalidated
- `invalidateUserTokens()` - Invalidate all user tokens

### Database Schema

Required columns in `email_verification_tokens` table:

```sql
ALTER TABLE email_verification_tokens ADD COLUMN (
  verified_at TIMESTAMP,
  used_count INT DEFAULT 0,
  invalidated BOOLEAN DEFAULT false,
  invalidated_at TIMESTAMP,
  invalidation_reason VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX idx_tokens_user_verified 
  ON email_verification_tokens(user_id, verified);
```

### How It Works

```
Token Verification Flow:
1. User clicks: /api/auth/verify?token=XYZ&email=user@example.com
2. System checks:
   ✓ Token exists
   ✓ verified = false (not already used)
   ✓ invalidated = false (not invalidated)
   ✓ expires_at > NOW (not expired)
3. System updates atomically:
   UPDATE email_verification_tokens
   SET verified=true, verified_at=NOW(), used_count=used_count+1
   WHERE token=? AND email=? AND verified=false
4. If update affects 0 rows → Token reused/invalid
5. Return success/failure

Reuse Attack Blocked:
1. First verification: verified becomes true ✓
2. Second verification attempt:
   WHERE verified=false returns 0 rows
   → Rejected: "Token already used"
```

### Usage Example

```typescript
import {
  verifyEmailToken,
  invalidateEmailToken,
  isTokenInvalidated,
  invalidateUserTokens
} from '@/lib/email/tokens';

// Verify email token (with reuse detection)
const result = await verifyEmailToken(token, email);

if (result.reused) {
  // Token was used before
  return NextResponse.json(
    { error: 'This verification link has already been used' },
    { status: 400 }
  );
}

if (result.expired) {
  // Token expired
  return NextResponse.json(
    { error: 'Verification link has expired. Request a new one.' },
    { status: 400 }
  );
}

if (result.valid) {
  // Token is valid, email is verified
  const userId = result.userId;
}

// Invalidate token when user requests new email
await invalidateEmailToken(token, 'user_requested');

// Check if token is already invalidated
const status = await isTokenInvalidated(token);
if (status.invalidated) {
  console.log('Token invalidated:', status.reason);
}

// Invalidate all user tokens (security incident)
await invalidateUserTokens(userId, 'security_incident');
```

### Testing

```bash
npm test -- src/__tests__/security/email-token-reuse.test.ts
```

---

## Fix 4: Input Validation with Zod

### What Was Added

**File:** `src/app/api/admin/login/route.ts`

```typescript
import { z } from 'zod';

const adminLoginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(500, 'Password is too long'),
  _csrf: z.string().optional(),
});

type AdminLoginInput = z.infer<typeof adminLoginSchema>;
```

### Implementation

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  let validatedData: AdminLoginInput;
  try {
    validatedData = adminLoginSchema.parse(body);
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      const errors = validationError.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: process.env.NODE_ENV === 'development' ? errors : undefined
        },
        { status: 400 }
      );
    }
    throw validationError;
  }

  const { username, password } = validatedData;
  // Now safely use validated data
}
```

### Validation Errors

```json
{
  "error": "Invalid input",
  "details": [
    {
      "field": "username",
      "message": "Username contains invalid characters"
    },
    {
      "field": "password",
      "message": "Password is required"
    }
  ]
}
```

### Benefits

- **Type-safe** - Full TypeScript inference
- **Reusable** - Define once, use everywhere
- **Composable** - Combine schemas
- **Detailed errors** - Per-field messages
- **Transformation** - Normalize input before use

---

## Fix 5: Constant-Time Password Comparison

### What Was Added

**File:** `src/lib/security/password-validation.ts`

Functions:
- `hashPassword()` - PBKDF2 with salt and key stretching
- `verifyPassword()` - Constant-time comparison
- `constantTimeEqual()` - Safe string comparison
- `validatePasswordStrength()` - Check password requirements
- `generateSecurePassword()` - Create strong passwords

### Why Constant-Time?

```
VULNERABLE:
if (password === correctPassword) {
  // If first char matches: 0.1ms
  // If 10th char matches: 1ms
  // Attacker can measure timing and brute-force!
}

SECURE:
crypto.timingSafeEqual(password, correctPassword);
  // Always takes same time
  // No information leaked via timing
```

### PBKDF2 Implementation

```typescript
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32);

    crypto.pbkdf2(
      password,
      salt,
      100000,  // 100K iterations (slow down brute force)
      64,      // 64 byte key
      'sha512',
      (err, derivedKey) => {
        if (err) reject(err);
        else {
          const hash = salt.toString('hex') + ':' + derivedKey.toString('hex');
          resolve(hash);
        }
      }
    );
  });
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, storedKeyHex] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(storedKeyHex, 'hex');

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      100000,
      64,
      'sha512',
      (err, dk) => err ? reject(err) : resolve(dk)
    );
  });

  // CRITICAL: Constant-time comparison
  try {
    return crypto.timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;  // Lengths don't match
  }
}
```

### Usage in Admin Login

```typescript
import { constantTimeEqual } from '@/lib/security/password-validation';

function validateAdminCredentialsSecure(
  username: string,
  password: string
): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME || '';
  const expectedPassword = process.env.ADMIN_PASSWORD || '';

  // Use constant-time comparison for BOTH username and password
  const match =
    constantTimeEqual(username, expectedUsername) &&
    constantTimeEqual(password, expectedPassword) &&
    expectedUsername.length > 0;

  return match;
}
```

### Testing

```bash
npm test -- src/__tests__/security/password-validation.test.ts
```

### Test Examples

```typescript
it('should verify correct password', async () => {
  const password = 'MySecurePassword123!@#';
  const hash = await hashPassword(password);
  expect(await verifyPassword(password, hash)).toBe(true);
});

it('should reject incorrect password', async () => {
  const hash = await hashPassword('correct');
  expect(await verifyPassword('incorrect', hash)).toBe(false);
});

it('should validate password strength', () => {
  const weak = validatePasswordStrength('weak');
  expect(weak.valid).toBe(false);

  const strong = validatePasswordStrength('StrongPass123!@#');
  expect(strong.valid).toBe(true);
  expect(strong.score).toBeGreaterThan(60);
});
```

---

## Integration Example

### Complete Admin Login Flow

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  RATE_LIMIT_CONFIGS,
} from '@/lib/security/rate-limiter';
import {
  validateCSRFMiddleware,
  createResponseWithCSRFToken,
} from '@/lib/security/csrf';
import { constantTimeEqual } from '@/lib/security/password-validation';
import { createAdminSession } from '@/lib/admin/jwt-service';

// Zod validation
const adminLoginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimitKey = `admin-login:${clientIP}`;

  try {
    // 1. Check CSRF token
    const csrfValidation = await validateCSRFMiddleware(request);
    if (!csrfValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // 2. Check rate limit
    const rateLimitStatus = checkRateLimit(
      rateLimitKey,
      RATE_LIMIT_CONFIGS.adminLogin
    );
    if (rateLimitStatus.isLimited) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429 }
      );
    }

    // 3. Validate input with Zod
    const body = await request.json();
    const validatedData = adminLoginSchema.parse(body);
    const { username, password } = validatedData;

    // 4. Check credentials with constant-time comparison
    const credentialsValid =
      constantTimeEqual(username, process.env.ADMIN_USERNAME || '') &&
      constantTimeEqual(password, process.env.ADMIN_PASSWORD || '');

    if (!credentialsValid) {
      recordFailedAttempt(rateLimitKey, RATE_LIMIT_CONFIGS.adminLogin);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 5. Success: Reset rate limit and create session
    recordSuccessfulAttempt(rateLimitKey);
    const session = await createAdminSession(username);

    // 6. Return response with CSRF token
    const response = createResponseWithCSRFToken({
      success: true,
      data: { user: { username, role: 'super_admin' }, token: session.token },
    });

    // Set secure cookies
    response.cookies.set('admin_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return response;
  } catch (error) {
    console.error('[ADMIN AUTH]', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

---

## Environment Variables

```env
# Admin credentials
ADMIN_USERNAME=admin_user
ADMIN_PASSWORD=SecurePassword123!@#
ADMIN_USERNAME_2=admin_user2
ADMIN_PASSWORD_2=SecurePassword456!@#

# JWT/Session
ADMIN_SESSION_SECRET=long-secret-key-change-in-production
ADMIN_TOKEN_EXPIRY_HOURS=8
ADMIN_REFRESH_TOKEN_EXPIRY_HOURS=72

# CSRF
CSRF_SECRET=csrf-secret-change-in-production

# Database
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...

# Deployment
NODE_ENV=production
```

---

## Testing All Fixes

```bash
# Run all security tests
npm test -- src/__tests__/security/ --run

# Individual test files
npm test -- src/__tests__/security/rate-limiting.test.ts --run
npm test -- src/__tests__/security/csrf.test.ts --run
npm test -- src/__tests__/security/password-validation.test.ts --run
npm test -- src/__tests__/security/email-token-reuse.test.ts --run

# With coverage
npm run test:coverage -- src/__tests__/security/
```

---

## Files Summary

| File | Lines | Changes |
|------|-------|---------|
| `src/lib/security/rate-limiter.ts` | 387 | Enhanced with admin login config |
| `src/lib/security/csrf.ts` | 258 | New: CSRF token generation & validation |
| `src/lib/security/password-validation.ts` | 291 | New: PBKDF2 + constant-time comparison |
| `src/lib/security/middleware-wrapper.ts` | 131 | New: Security middleware wrapper |
| `src/lib/email/tokens.ts` | 248 | Enhanced with reuse prevention |
| `src/app/api/admin/login/route.ts` | 147 | Integrated all 5 fixes |
| Tests | 700+ | Comprehensive test coverage |

---

## Checklist

- [x] Rate limiting implemented
- [x] CSRF protection implemented
- [x] Email token reuse prevention
- [x] Zod input validation
- [x] Constant-time password comparison
- [x] Test coverage for all fixes
- [x] Documentation complete
- [ ] Deploy to staging
- [ ] Security audit review
- [ ] Production deployment

---

## Notes

- All fixes follow OWASP security recommendations
- Tests are comprehensive and cover edge cases
- Error messages don't leak sensitive information
- Production deployment requires Redis for rate limiting
- CSRF tokens should be rotated periodically
- Email token database schema must include new columns
