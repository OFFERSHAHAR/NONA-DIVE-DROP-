# DIVE DROP Admin Panel - Security & Architecture Summary

**Prepared for**: DIVE DROP Development Team  
**Date**: June 20, 2026  
**Scope**: Admin authentication, authorization, and security architecture

---

## Executive Summary

A comprehensive, production-grade admin authentication and authorization system has been designed for DIVE DROP's admin panel. The system is built on Supabase Auth for session management, implements role-based access control (RBAC) with 4 tiers, and includes enterprise security features like 2FA, audit logging, rate limiting, and IP whitelisting.

**Key Features:**
- Email + password authentication (upgrade to 2FA for admins)
- 4-tier role system (Super Admin, Admin, Moderator, Viewer)
- Supabase Auth session management with HTTP-only cookies
- Comprehensive audit logging (append-only, all actions tracked)
- Rate limiting (5 failed attempts/15 minutes)
- Row-Level Security (RLS) policies
- Optional 2FA support (TOTP)
- Optional IP whitelisting per user
- Complete TypeScript implementation with Zod validation

---

## Architecture at a Glance

Authentication Flow:
1. Admin enters email + password
2. System validates credentials against admin_users table
3. Supabase Auth returns JWT session token
4. Session stored in HTTP-only secure cookie
5. Middleware checks authentication on each request
6. Permission check determines access level
7. Action logged to audit trail with IP + user agent

---

## 4-Tier Role System

| Role | Level | Can Do | Cannot Do |
|------|-------|--------|-----------|
| Super Admin | 5 | Everything | Nothing |
| Admin | 4 | Manage users/dive sites/shuttles | Manage admins, system settings |
| Moderator | 3 | Moderate content, manage dive sites | Delete data, modify users |
| Viewer | 1 | Read-only access | Any write operations |

**Permission Categories:**
- Users (read, create, edit, delete, ban)
- Dive Sites (read, create, edit, delete, publish)
- Shuttles (read, create, edit, delete, schedule)
- Admin Management (invite, change roles, deactivate)
- System (audit logs, settings)

---

## Security Features

### 1. Authentication
- Email + password with strong requirements
- Supabase Auth integration
- HTTP-only secure cookies
- SameSite=Strict CSRF protection
- Session expiration: 1 hour (access), 7 days (refresh)

### 2. Authorization
- Role-based access control (RBAC)
- Row-Level Security (RLS) on admin tables
- Permission checking middleware
- Protected routes with redirects

### 3. Two-Factor Authentication (2FA)
- TOTP-based (RFC 6238)
- QR code for authenticator apps
- 8 backup codes for recovery
- Mandatory for Super Admin, optional for others

### 4. Audit Logging
- Append-only audit trail
- Logs: action, resource, old/new values, IP, user agent, timestamp
- Sensitive fields redacted (passwords, tokens)
- Full-text searchable
- 90+ day retention

### 5. Rate Limiting
- 5 failed login attempts per IP per 15 minutes
- Auto-lock after excessive failures
- Email notification on suspicious activity

### 6. IP Whitelisting (Optional)
- Restrict logins to specific IP ranges
- Alert on new IP login
- CIDR notation support

### 7. Session Management
- Track active sessions per admin
- Device fingerprinting
- Logout from other devices
- Idle timeout (45 minutes)

---

## Database Schema Overview

**5 New Tables:**

1. **admin_users** - Core admin data
   - user_id, email, role, permissions, status
   - 2FA secrets and backup codes
   - IP whitelist, login tracking

2. **admin_sessions** - Active sessions
   - device tracking, last activity, expiration
   - Concurrent session management

3. **admin_audit_logs** - Append-only audit trail
   - action, resource, old/new values
   - IP, user agent, timestamp, status

4. **admin_invitations** - Pending admin invites
   - email, role, token, expiration

5. **admin_login_attempts** - Rate limiting
   - IP address, email, success/failure
   - Brute force detection

All tables have RLS policies, indexes, and constraints.

---

## File Structure

Created files:
1. ADMIN_AUTH_DESIGN.md - Full architecture (100+ pages)
2. src/lib/auth/admin-schemas.ts - Zod validation + role definitions
3. src/lib/admin/permissions.ts - Permission checking utilities
4. src/lib/admin/audit.ts - Audit logging utilities
5. supabase/migrations/admin_auth_schema.sql - Database schema

---

## Implementation Timeline (3 Weeks)

- **Phase 1 (Days 1-2):** Database setup & RLS
- **Phase 2 (Days 3-5):** Login flow implementation
- **Phase 3 (Days 6-7):** Authorization & middleware
- **Phase 4 (Days 8-10):** 2FA setup
- **Phase 5 (Days 11-14):** Admin user management UI
- **Phase 6 (Days 15-17):** Audit logs & monitoring
- **Phase 7 (Days 18-21):** Testing & hardening

---

## Key Functions Reference

### Permission Checking
```typescript
import { checkAdminPermission, AdminPermission } from '@/lib/admin/permissions';

const canEditUsers = await checkAdminPermission(AdminPermission.EDIT_USERS);
const isSuperAdmin = await isSuperAdmin();
const perms = await getAdminPermissions();
```

### Audit Logging
```typescript
import { logAdminAction } from '@/lib/admin/audit';

await logAdminAction(
  'edit_user',
  'users',
  userId,
  oldData,
  newData,
  'success'
);
```

### Rate Limiting
```typescript
import { checkLoginRateLimit } from '@/lib/admin/audit';

const isLimited = await checkLoginRateLimit(ipAddress);
```

---

## Pre-Launch Security Checklist

- [ ] HTTPS enforced on all endpoints
- [ ] Password policy: 8 chars, uppercase, lowercase, number, special char
- [ ] HTTP-only secure cookies configured
- [ ] SameSite=Strict on all cookies
- [ ] Rate limiting: 5 attempts/15 min per IP
- [ ] 2FA enabled for Super Admin
- [ ] Audit logs retained 90+ days
- [ ] Sensitive fields redacted in logs
- [ ] RLS policies tested
- [ ] No hardcoded secrets
- [ ] Email alerts configured
- [ ] Backup strategy in place
- [ ] Admin documentation ready
- [ ] Incident response plan ready

---

## Recommended Additional Security

**Immediate (Week 1):**
1. Implement 2FA for Super Admin accounts
2. Enable IP whitelisting for key users
3. Configure email alerts for failed logins
4. Setup backup of audit logs

**Short-term (Month 1):**
1. Device fingerprinting
2. Anomaly detection for unusual activity
3. Admin security policy document
4. Security training for admins

**Medium-term (Month 2-3):**
1. SAML/OAuth for SSO (as team grows)
2. Hardware security keys (YubiKey) support
3. API key authentication
4. Quarterly security audits

---

## Testing Recommendations

### Manual Testing
- Valid login credentials
- Invalid password (5 failures triggers rate limit)
- 2FA flow and backup codes
- Each role permissions
- Audit log accuracy

### Automated Testing
- Unit tests for permission checks
- Integration tests for login
- E2E tests for admin workflows
- Load tests for audit logs

---

## Compliance & Standards

**Standards Used:**
- RFC 8174 (Key Words)
- RFC 6238 (TOTP)
- RFC 8949 (JWT)
- OWASP Top 10
- NIST 800-63B

**Best Practices:**
- Principle of Least Privilege
- Defense in Depth
- Separation of Concerns
- Fail Secure

---

## Next Steps

1. Review ADMIN_AUTH_DESIGN.md (complete architecture)
2. Follow ADMIN_IMPLEMENTATION_GUIDE.md (phased approach)
3. Run database migration (Phase 1)
4. Build login page (Phase 2)
5. Implement middleware (Phase 3)
6. Add 2FA (Phase 4)
7. Build admin UI (Phase 5)
8. Add monitoring (Phase 6)
9. Test & harden (Phase 7)

---

**Status**: Ready for Implementation  
**Last Updated**: June 20, 2026  
**Version**: 1.0
