# Admin Authentication System Documentation

## Overview
A secure, production-ready admin authentication system for DIVE DROP with JWT-based sessions, dual admin credentials, and comprehensive security features.

## Features

### Security Features
- **JWT Token Authentication**: Secure token-based authentication using HS256 algorithm
- **HttpOnly Cookies**: Admin tokens stored in secure, httpOnly cookies (CSRF-protected)
- **Dual Admin Credentials**: Support for two independent admin accounts
- **Session Expiry**: Access tokens expire after 8 hours, refresh tokens after 72 hours
- **Token Refresh**: Automatic token refresh mechanism with refresh tokens
- **Environment Variables**: Credentials stored securely in `.env.local`
- **HTTPS Enforcement**: Secure cookies enforced in production
- **SameSite Cookie Policy**: Strict SameSite policy prevents CSRF attacks

### Admin Features
- **Dedicated Login Page**: Professional dark-mode login interface
- **Super Admin Dashboard**: Comprehensive system overview and management tools
- **User Management**: Full user account management
- **Dive Site Management**: Create/edit/manage dive sites
- **Shuttle Management**: Manage shuttle vehicles and schedules
- **System Configuration**: System-wide settings and configuration
- **Analytics & Reports**: Monitor system activity and statistics
- **Audit Logging**: All admin actions are logged

## Quick Start

### 1. Environment Setup

The `.env.local` file is already configured with test credentials:

```env
ADMIN_USERNAME=offer
ADMIN_PASSWORD=SecurePassword123!@#
ADMIN_USERNAME_2=or
ADMIN_PASSWORD_2=SecurePassword456!@#

ADMIN_SESSION_SECRET=your-super-secret-admin-session-key-change-in-production-12345
ADMIN_TOKEN_EXPIRY_HOURS=8
ADMIN_REFRESH_TOKEN_EXPIRY_HOURS=72
```

### 2. Start the Application

```bash
npm run dev
```

### 3. Access Admin Panel

1. Navigate to: `http://localhost:3000/en/admin/login`
2. Login with test credentials:
   - **Username**: `offer` or `or`
   - **Password**: `SecurePassword123!@#` or `SecurePassword456!@#`

### 4. Admin Dashboard

After successful login, you'll be redirected to `/admin/dashboard` with full access to:
- System overview and statistics
- User management
- Dive site management
- Shuttle management
- System settings

## API Endpoints

### Authentication Endpoints

#### POST `/api/admin/login`
Login with username and password.

**Request:**
```json
{
  "username": "offer",
  "password": "SecurePassword123!@#"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "username": "offer",
      "role": "super_admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1704067200000
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### POST `/api/admin/logout`
Logout and clear session cookies.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST `/api/admin/refresh`
Refresh access token using refresh token.

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1704067200000
  }
}
```

#### GET `/api/admin/verify`
Verify current admin session is valid.

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "username": "offer",
    "role": "super_admin",
    "isAuthenticated": true
  }
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "error": "Unauthorized: Invalid or expired token"
}
```

## Protected Routes

All routes under `/admin/*` are protected and require valid JWT authentication:

```
/admin/login              - Public (unprotected login page)
/admin/dashboard          - Super Admin Dashboard
/admin/users              - User Management
/admin/dive-sites         - Dive Site Management
/admin/shuttles           - Shuttle Management
/admin/settings           - System Settings
/admin/photos/*           - Photo Moderation
```

## Using Admin Auth in API Routes

To protect your custom API routes with admin authentication:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin/auth-middleware';

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const { data, error } = await withAdminAuth(request);

  if (error) {
    return error; // Return 401 if not authenticated
  }

  // Access admin context
  const adminUsername = data?.username;
  const adminRole = data?.role;

  // Your API logic here
  return NextResponse.json({
    success: true,
    message: 'Admin action completed',
  });
}
```

## JWT Token Structure

### Access Token
```json
{
  "username": "offer",
  "role": "super_admin",
  "iat": 1704066600,
  "exp": 1704084600
}
```

### Refresh Token
```json
{
  "username": "offer",
  "role": "super_admin",
  "type": "refresh",
  "iat": 1704066600,
  "exp": 1704326400
}
```

## File Structure

```
src/
├── lib/
│   └── admin/
│       ├── jwt-service.ts          # JWT generation and verification
│       ├── auth-middleware.ts       # Admin auth middleware
│       ├── permissions.ts           # Admin permissions (existing)
│       └── middleware.ts            # General admin middleware (existing)
│
├── app/
│   └── api/
│       └── admin/
│           ├── login/route.ts       # Login endpoint
│           ├── logout/route.ts      # Logout endpoint
│           ├── refresh/route.ts     # Token refresh endpoint
│           └── verify/route.ts      # Auth verification endpoint
│
└── app/[locale]/
    └── admin/
        ├── login/page.tsx           # Admin login page
        ├── dashboard/page.tsx       # Super admin dashboard
        └── layout.tsx               # Admin layout with auth check
```

## Production Checklist

### Before Deploying to Production

1. **Change Admin Credentials**
   ```env
   ADMIN_USERNAME=<strong-unique-username>
   ADMIN_PASSWORD=<very-strong-password-32-chars>
   ADMIN_USERNAME_2=<another-unique-username>
   ADMIN_PASSWORD_2=<another-strong-password>
   ```

2. **Update Session Secret**
   ```env
   ADMIN_SESSION_SECRET=<generate-new-256-bit-secret>
   ```

3. **Enable HTTPS**
   - Secure cookies are automatically enabled in production
   - Ensure your domain has valid SSL/TLS certificate

4. **Rotate Credentials Regularly**
   - Change admin passwords every 90 days
   - Rotate session secret when updating credentials

5. **Monitor Admin Access**
   - Review audit logs regularly
   - Check for suspicious login attempts
   - Monitor for brute force attacks

6. **Database Integration (Optional)**
   - Currently uses environment variable credentials
   - For multi-admin support, integrate with your database
   - Hash passwords using bcrypt before storing

7. **Implement Rate Limiting**
   - Add rate limiting to `/api/admin/login`
   - Prevent brute force attacks
   - Use Redis or similar for distributed rate limiting

8. **Set Up Monitoring**
   - Log all admin authentication events
   - Alert on failed login attempts
   - Monitor for unusual access patterns

## Customization

### Adding More Admin Users

To support more admin users, integrate with your database:

```typescript
// lib/admin/jwt-service.ts

interface AdminUser {
  username: string;
  password_hash: string; // bcrypt hash
  role: 'super_admin' | 'admin' | 'manager';
  isActive: boolean;
}

export async function validateAdminCredentials(
  username: string,
  password: string
): Promise<AdminUser | null> {
  // Query database
  const user = await db.admin_users.findOne({ username });

  if (!user || !user.isActive) {
    return null;
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);

  return isValid ? user : null;
}
```

### Extending JWT Payload

Add custom claims to JWT tokens:

```typescript
export async function generateAdminToken(username: string): Promise<string> {
  const token = await new SignJWT({
    username,
    role: 'super_admin',
    permissions: ['users.manage', 'sites.manage', 'shuttles.manage'],
    department: 'operations',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_HOURS}h`)
    .sign(SECRET);

  return token;
}
```

### Custom Token Expiry

Modify token expiry by changing environment variables:

```env
# Very secure (2 hours)
ADMIN_TOKEN_EXPIRY_HOURS=2

# Less frequent refresh needed (16 hours)
ADMIN_TOKEN_EXPIRY_HOURS=16

# Extended session (30 days)
ADMIN_REFRESH_TOKEN_EXPIRY_HOURS=720
```

## Troubleshooting

### Issue: "Invalid credentials" on login

1. Verify username matches exactly (case-sensitive)
2. Check password hasn't been trimmed or modified
3. Verify `.env.local` is loaded
4. Check that credentials are set in `.env.local`, not other env files

### Issue: "Invalid or expired token" after login

1. Token may have expired (8 hour default expiry)
2. Server clock may be out of sync
3. Session secret may have changed
4. Try logging out and logging back in

### Issue: Cannot access admin pages after login

1. Check browser cookies are enabled
2. Verify httpOnly cookies are being set (check DevTools)
3. Check SameSite cookie policy isn't blocking requests
4. Clear cookies and login again

### Issue: CORS errors when calling API

1. Admin API routes should be same-origin (no CORS issues)
2. If calling from different domain, configure CORS
3. Use relative URLs (`/api/admin/...`) not absolute URLs

## Security Best Practices

1. **Never commit credentials** to git
2. **Always use HTTPS** in production
3. **Rotate credentials** regularly
4. **Monitor audit logs** for suspicious activity
5. **Use strong passwords** (32+ characters recommended)
6. **Enable 2FA** (future enhancement)
7. **Implement rate limiting** on login endpoint
8. **Log all admin actions** (already implemented in existing code)
9. **Review admin access** regularly
10. **Use VPN/IP whitelisting** for extra security

## Support & Troubleshooting

For issues or questions about the admin authentication system:

1. Check the troubleshooting section above
2. Review API endpoint responses for error messages
3. Check browser console for client-side errors
4. Check server logs for server-side errors
5. Verify environment variables are correctly set

## Future Enhancements

Planned improvements for the admin authentication system:

- [ ] Two-Factor Authentication (2FA)
- [ ] OAuth2/OIDC support
- [ ] Role-based access control (RBAC)
- [ ] API key authentication for service accounts
- [ ] Session management dashboard
- [ ] Admin activity audit trail UI
- [ ] IP whitelisting support
- [ ] Geolocation-based alerts
- [ ] Passwordless authentication (WebAuthn)
- [ ] Single Sign-On (SSO) integration

---

**Last Updated**: 2026-06-20  
**Version**: 1.0.0  
**Status**: Production Ready
