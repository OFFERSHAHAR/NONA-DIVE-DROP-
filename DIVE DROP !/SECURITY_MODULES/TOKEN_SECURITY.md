# Token Security Module Guide

**JWT Tokens, Cookies, Refresh Rotation & Revocation**

**File:** `src/lib/security/token-security.ts`  
**Version:** 1.0  
**Last Updated:** June 20, 2026

---

## Overview

Token security is the foundation of authentication. This module implements:

1. **Secure Cookie Storage** - HttpOnly/Secure/SameSite flags
2. **Token Rotation** - Refresh token rotation to prevent reuse attacks
3. **Token Revocation** - Logout and token blacklisting
4. **Token Family Tracking** - Detects compromised token chains

---

## Architecture

### Token Lifecycle

```
1. User Login
   └─ Create access token (1 hour)
   └─ Create refresh token (7 days)
   └─ Create token family ID
   └─ Set HttpOnly cookies

2. Using Access Token
   └─ Send in Authorization header
   └─ Verify signature
   └─ Check revocation list
   └─ Allow request

3. Access Token Expires
   └─ Client sends refresh token
   └─ Server validates token family
   └─ Generate new access token
   └─ Generate new refresh token
   └─ Increment family generation

4. User Logout
   └─ Delete cookies
   └─ Add tokens to revocation list
   └─ Revoke entire family (all devices)

5. Reuse Attack Detected
   └─ Old refresh token used
   └─ Entire family revoked
   └─ All devices logged out
   └─ Alert user
```

---

## Implementation Details

### Access Token Configuration

```typescript
{
  name: 'auth_token',
  maxAge: 60 * 60,           // 1 hour (3600 seconds)
  httpOnly: true,             // JavaScript cannot read
  secure: true,               // HTTPS only
  sameSite: 'lax',            // CSRF protection
  path: '/',
}
```

**Why These Settings:**
- **httpOnly:** Protects against XSS attacks (malicious JS can't steal token)
- **secure:** Only sent over HTTPS (protects from man-in-the-middle)
- **sameSite='lax':** Protects from CSRF while allowing form submissions
- **1-hour expiry:** Short-lived, minimizes damage if compromised

### Refresh Token Configuration

```typescript
{
  name: 'refresh_token',
  maxAge: 7 * 24 * 60 * 60,   // 7 days
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
}
```

**Purpose:**
- Longer-lived (7 days) to reduce login frequency
- Stored securely in HttpOnly cookie
- Used only for token refresh (not API requests)

### Admin Token Configuration

```typescript
{
  name: 'admin_token',
  maxAge: 8 * 60 * 60,         // 8 hours
  httpOnly: true,
  secure: true,
  sameSite: 'strict',           // Stricter for admin
  path: '/admin',               // Only /admin routes
}
```

**Differences:**
- Shorter expiry (8 hours vs 1 hour access) - admin actions more sensitive
- `sameSite='strict'` - prevents CSRF on cross-site forms
- Path limited to `/admin` - reduces attack surface

---

## Usage Examples

### Setting Secure Token Cookies

```typescript
// In login endpoint
import { setTokenCookie, TOKEN_COOKIE_CONFIG } from '@/lib/security/token-security';

export async function POST(request: Request) {
  // ... authentication logic ...

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Set both cookies with secure flags
  await setTokenCookie(
    TOKEN_COOKIE_CONFIG.accessToken.name,
    accessToken,
    TOKEN_COOKIE_CONFIG.accessToken
  );

  await setTokenCookie(
    TOKEN_COOKIE_CONFIG.refreshToken.name,
    refreshToken,
    TOKEN_COOKIE_CONFIG.refreshToken
  );

  return NextResponse.json({ success: true });
}
```

### Retrieving Tokens

```typescript
// In server action or API route
import { getTokenCookie } from '@/lib/security/token-security';

export async function getCurrentUser() {
  const token = await getTokenCookie('auth_token');
  
  if (!token) {
    return null; // User not logged in
  }

  // Verify and decode token
  const decoded = verifyJWT(token);
  return decoded.user;
}
```

### Logout with Token Revocation

```typescript
import {
  deleteTokenCookie,
  revokeToken,
  revokeAllUserTokens,
  createLogoutResponse,
} from '@/lib/security/token-security';

export async function logoutAction() {
  const token = await getTokenCookie('auth_token');
  
  // Option 1: Revoke single token (one device)
  if (token) {
    revokeToken(token);
  }

  // Option 2: Revoke all tokens (all devices)
  const user = getCurrentUser();
  if (user) {
    await revokeAllUserTokens(user.id);
  }

  // Delete cookies
  await deleteTokenCookie('auth_token');
  await deleteTokenCookie('refresh_token');

  // Return safe logout response
  return createLogoutResponse({ success: true });
}
```

### Token Refresh Flow

```typescript
// Client-side hook
import { useEffect } from 'react';

export function useTokenRefresh() {
  useEffect(() => {
    // Refresh token 5 minutes before expiry
    const interval = setInterval(async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        // Refresh failed - redirect to login
        window.location.href = '/auth/login';
      }
    }, 55 * 60 * 1000); // Every 55 minutes (for 1-hour tokens)

    return () => clearInterval(interval);
  }, []);
}

// Server-side refresh endpoint
export async function POST(request: Request) {
  const refreshToken = await getTokenCookie('refresh_token');
  
  if (!refreshToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Validate token family (detect reuse attacks)
  const decoded = verifyJWT(refreshToken);
  if (!validateTokenFamily(decoded.family_id)) {
    // Reuse attack detected!
    revokeTokenFamily(decoded.family_id);
    return new NextResponse('Security breach detected', { status: 403 });
  }

  // Generate new tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return createTokenResponse(
    { success: true },
    accessToken,
    refreshToken
  );
}
```

---

## Token Family Validation

### How It Works

**Scenario 1: Legitimate Refresh**
```
Time 0: User logs in
  └─ Family ID: "abc123"
  └─ Generation: 0

Time 30 min: User opens app in another tab
  └─ Access token expired
  └─ Send refresh token to /api/auth/refresh
  └─ Validate family "abc123" → VALID
  └─ Generate new tokens with generation: 1
  └─ Return new tokens

Time 60 min: Token expires again
  └─ Send refresh token (generation: 1)
  └─ Validate family → VALID (generation advances to 2)
  └─ Return new tokens
```

**Scenario 2: Reuse Attack (Token Compromised)**
```
Time 0: User logs in
  └─ Family ID: "abc123"
  └─ Generation: 0

Attacker steals refresh token somehow
  └─ Attacker sends old token at Time T
  └─ Legitimate user sends current token at Time T+500ms
  └─ Both happen in <1 second window
  └─ Multiple uses of same family in short window
  └─ System detects reuse attack
  └─ Revokes entire family
  └─ All devices logged out
  └─ User must login again
  └─ Alerts sent
```

### Detection Logic

```typescript
export function validateTokenFamily(familyId: string): boolean {
  const family = tokenFamilies.get(familyId);

  if (!family) {
    // Family doesn't exist (never saw this token)
    console.warn(`Token family not found: ${familyId}`);
    return false;
  }

  if (family.revokedAt) {
    // Family was revoked (previous reuse detected)
    console.warn(`Token family revoked: ${familyId}`);
    return false;
  }

  // Check if used too recently (likely reuse attack)
  const timeSinceLastUse = Date.now() - family.lastUsedAt;
  if (timeSinceLastUse < 1000) {
    // Less than 1 second - multiple uses detected
    console.error(`Token reuse detected: ${familyId}`);
    revokeTokenFamily(familyId); // Revoke all tokens
    return false;
  }

  // Valid use - advance family generation
  family.generationCount++;
  family.lastUsedAt = Date.now();

  return true;
}
```

---

## Security Considerations

### What This Protects Against

1. **XSS Attacks**
   - HttpOnly cookies cannot be read by JavaScript
   - Even if XSS is possible, attacker cannot steal tokens

2. **CSRF Attacks**
   - SameSite=lax prevents cross-site form submissions
   - Even if attacker tricks user to click link, cookies not sent

3. **Token Reuse Attacks**
   - Token families detect if old token is reused
   - Attacker with stolen refresh token is immediately detected
   - All user sessions revoked

4. **Man-in-the-Middle (MITM) Attacks**
   - Secure flag ensures HTTPS only
   - Token cannot be stolen in transit

5. **Long-Lived Token Exposure**
   - Short access token lifetime (1 hour)
   - Minimizes damage if access token compromised
   - Longer refresh token used infrequently

### What This Does NOT Protect Against

1. **Session Fixation** - Requires additional CSRF token
2. **Phishing** - If user logs in on phishing site, attacker gets token
3. **Compromised Device** - If device is infected with keylogger
4. **Network Sniffing** - Only if HTTPS is broken

---

## Troubleshooting

### Issue: User Gets Logged Out Unexpectedly

**Cause 1: Access token expired**
- Normal behavior, should refresh automatically
- Check browser console for errors

**Cause 2: Refresh token expired**
- User's refresh token >7 days old
- Must login again

**Cause 3: Token revoked**
- User logged out from another device
- All devices logout simultaneously (intended)

**Diagnosis:**
```typescript
// Check token expiry
const decoded = jwt.decode(token);
console.log('Expires:', new Date(decoded.exp * 1000));
console.log('Issued:', new Date(decoded.iat * 1000));

// Check revocation list
console.log('Is revoked:', isTokenRevoked(token));
```

### Issue: "Invalid Token" Error

**Cause 1: Token malformed**
```
Check: Token starts with "eyJ" (JWT header)
If not: Token was corrupted or isn't a JWT
```

**Cause 2: Token signature invalid**
```
Check: JWT_SECRET changed?
Solution: Rotate JWT_SECRET will require re-login
```

**Cause 3: Token expired**
```
Check: Date.now() > token.exp * 1000
Solution: Refresh token
```

### Issue: "Reuse Attack Detected"

**Symptom:** User sees "Security breach detected" message

**Meaning:** System detected token was used twice in <1 second

**Possible Causes:**
1. Attacker stole refresh token
2. Multiple tabs/windows using same token
3. Network race condition (double submit)

**What Happens:**
- Entire token family revoked
- All devices logged out
- User must login again
- Security team alerted (log entry created)

**Recovery:**
```
User should:
1. Change password
2. Check for suspicious activity
3. Contact support if needed

Admin should:
1. Review login history
2. Check for unauthorized activity
3. Monitor for further attacks
```

---

## Testing

### Unit Tests

```typescript
import { 
  setTokenCookie, 
  getTokenCookie, 
  revokeToken,
  validateTokenFamily,
} from '@/lib/security/token-security';

describe('Token Security', () => {
  it('should set secure cookies with correct flags', async () => {
    await setTokenCookie(
      'auth_token',
      'test_token_123',
      TOKEN_COOKIE_CONFIG.accessToken
    );

    const cookie = await getTokenCookie('auth_token');
    expect(cookie).toBe('test_token_123');
  });

  it('should revoke tokens', async () => {
    const token = 'test_token_456';
    revokeToken(token);
    
    expect(isTokenRevoked(token)).toBe(true);
  });

  it('should detect token reuse', () => {
    const familyId = 'family_123';
    createTokenFamily(familyId, 'user_123');

    // First use - should be valid
    expect(validateTokenFamily(familyId)).toBe(true);

    // Immediate reuse (< 1 second) - attack!
    expect(validateTokenFamily(familyId)).toBe(false);

    // Family should be revoked
    expect(isTokenRevoked(familyId)).toBe(true);
  });
});
```

### Integration Tests

```typescript
// Test full login → use → refresh → logout flow
describe('Token Flow Integration', () => {
  it('should handle full login and logout cycle', async () => {
    // 1. Login
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
      credentials: 'include',
    });
    expect(loginRes.status).toBe(200);

    // 2. Use token (call protected endpoint)
    const apiRes = await fetch('/api/user/profile', {
      credentials: 'include',
    });
    expect(apiRes.status).toBe(200);

    // 3. Refresh token
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    expect(refreshRes.status).toBe(200);

    // 4. Logout
    const logoutRes = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    expect(logoutRes.status).toBe(200);

    // 5. Verify token revoked
    const verifyRes = await fetch('/api/user/profile', {
      credentials: 'include',
    });
    expect(verifyRes.status).toBe(401); // Unauthorized
  });
});
```

---

## Best Practices

1. **Never Log Tokens**
   - Don't print tokens to console
   - Don't include in error messages
   - Don't send to analytics

2. **Always Use HttpOnly Cookies**
   - Never store tokens in localStorage
   - Never pass token in URL
   - Never pass token in HTML comments

3. **Validate on Every Request**
   - Check token signature
   - Check expiration
   - Check revocation list
   - Never trust client claim

4. **Rotate Refresh Tokens**
   - New refresh token on every refresh
   - Detect old token reuse
   - Revoke entire family if attacked

5. **Handle Token Expiry Gracefully**
   - Refresh before expiry (client-side)
   - Show "session expired" message if refresh fails
   - Redirect to login

---

## Migration Guide

### From Version 0.5 (Old Token System)

```typescript
// Old way (insecure - tokens in localStorage)
localStorage.setItem('auth_token', token);
const token = localStorage.getItem('auth_token');

// New way (secure - HttpOnly cookies)
await setTokenCookie('auth_token', token, TOKEN_COOKIE_CONFIG.accessToken);
const token = await getTokenCookie('auth_token');
```

**Steps to Migrate:**
1. Stop using localStorage for tokens
2. Use setTokenCookie() instead
3. Retrieve with getTokenCookie()
4. Update all API calls to use credentials: 'include'
5. Test in staging
6. Deploy and monitor

---

## References

- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 6265: HTTP State Management (Cookies)](https://tools.ietf.org/html/rfc6265)
- [RFC 7519: JSON Web Tokens](https://tools.ietf.org/html/rfc7519)
- [OWASP: Token Based Authentication](https://owasp.org/www-community/attacks/csrf)

---

**Module Owner:** Security Team  
**Last Review:** June 20, 2026  
**Next Review:** September 20, 2026
