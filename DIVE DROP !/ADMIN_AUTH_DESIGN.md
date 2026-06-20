# DIVE DROP Admin Panel - Authentication & Authorization Architecture

**Date**: June 20, 2026  
**Team Size**: <5 admin users  
**Languages**: Hebrew/English  
**Stack**: Next.js 16, Supabase, @supabase/ssr  
**Status**: Design Document

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Role-Based Access Control (RBAC)](#role-based-access-control)
4. [Session Management](#session-management)
5. [Admin User Onboarding](#admin-user-onboarding)
6. [Security Recommendations](#security-recommendations)
7. [Implementation Examples](#implementation-examples)
8. [Database Schema](#database-schema)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN AUTHENTICATION FLOW                │
└─────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │   Admin User     │
                          │   (Browser)      │
                          └────────┬─────────┘
                                   │
                                   │ 1. Email + Password
                                   ▼
                          ┌──────────────────┐
                          │  Login Page      │
                          │  /admin/login    │
                          └────────┬─────────┘
                                   │
                        ┌──────────▼──────────┐
                        │ Validate Credentials│
                        │ Check admin_users   │
                        │ Table              │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
         ┌──────────▼──────────┐      ┌──────────▼──────────┐
         │  Valid Credentials  │      │ Invalid/Not Admin   │
         │  Role Check         │      │ Return Error        │
         └──────────┬──────────┘      └─────────────────────┘
                    │
              ┌─────▼─────┐
              │ Supabase  │ ← Session JWT Token
              │ Auth      │   (stored in secure HTTP-only cookie)
              └─────┬─────┘
                    │
         ┌──────────▼──────────┐
         │ Create Admin Session │
         │ (role + permissions  │
         │  in JWT claims)      │
         └──────────┬───────────┘
                    │
         ┌──────────▼──────────┐
         │ Redirect to         │
         │ /admin/dashboard    │
         └─────────────────────┘


   ┌────────────────────────────────────────────────────────────┐
   │           AUTHORIZATION CHECK (Per Route)                  │
   └────────────────────────────────────────────────────────────┘

   Request → Middleware → Extract JWT from Cookie
                              │
                        ┌─────▼─────┐
                        │ Valid JWT? │
                        └─────┬─────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              YES ┌─▼─┐            NO ┌─▼─┐
                 │   │                │   │
            ┌────▼──▼────┐      ┌─────▼──▼────┐
            │ Extract     │      │ Redirect to │
            │ role +      │      │ /admin/login│
            │ permissions │      └─────────────┘
            └────┬───┬───┘
                 │   │
         ┌───────▼─┐ └───────┐
         │ Has     │         │ RBAC
         │ required│         │ Check
         │ role?   │         │
         └───┬─────┘         │
             │               │
      ┌──────▴──────┐        │
      │              │        │
    YES           NO │        │
      │              │        │
   ALLOW ──────────▶ DENY   ◀─┘
      │              │
      └──────┬───────┘
             │
      Allow/Deny Access
```

---

## Authentication Flow

### 1. Recommended Approach: Email + Password with 2FA

**Why this over SSO:**
- Small team (<5 users) → minimal overhead
- Better control over admin accounts
- No external OAuth provider dependency
- Can be enhanced with 2FA later
- Works well with Supabase Auth native implementation

### 2. Login Flow

```typescript
// POST /api/admin/auth/login

1. Validate input (email + password)
2. Check if email exists in admin_users table
3. Verify user.is_active = true
4. Call Supabase Auth signInWithPassword()
5. Extract JWT token from Supabase session
6. Verify JWT claims contain admin role
7. Create HTTP-only secure cookie with session
8. Log authentication event (audit trail)
9. Return success → redirect to /admin/dashboard
```

### 3. Session Management

**Use Supabase Auth Sessions** (not custom JWT):

**Advantages:**
- Built-in refresh token mechanism
- Automatic expiration handling
- Secure HTTP-only cookie storage
- @supabase/ssr handles cookie management
- No need to implement custom token refresh logic

**Implementation:**
- Access token: 1 hour (JWT in cookie)
- Refresh token: 7 days (automatic renewal)
- Session stored in secure HTTP-only cookie
- Middleware validates token on each request

**Token Claims (JWT payload):**
```json
{
  "sub": "user-uuid",
  "email": "admin@divedrop.com",
  "role": "admin",
  "permissions": ["read_users", "write_users", "manage_dive_sites"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

### 4. Protected Route Middleware

```typescript
// middleware.ts - Check admin access

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Check if user has admin role
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', session.user.id)
      .single();
    
    if (!adminUser) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}
```

---

## Role-Based Access Control (RBAC)

### Role Definition

**3-Tier Role System:**

| Role | Level | Responsibilities | Cannot Do |
|------|-------|------------------|-----------|
| **Super Admin** | 5 | All permissions, invite admins, manage all data, system settings | None |
| **Admin** | 4 | Manage users, dive sites, shuttles, view audit logs | Invite new admins, change system settings |
| **Moderator** | 3 | Moderate user content, manage dive sites, respond to issues | Modify user accounts, delete data |
| **Viewer** | 1 | Read-only access to reports, analytics | Any write operations |

### Permission Matrix

```
┌─────────────────────┬──────────┬───────┬──────────┬────────┐
│ Resource            │Super Admin│ Admin│Moderator│ Viewer │
├─────────────────────┼──────────┼───────┼──────────┼────────┤
│ Users               │           │       │          │        │
│  - View All         │ ✓         │ ✓     │ ✓        │ ✓      │
│  - Create/Edit      │ ✓         │ ✓     │ ✗        │ ✗      │
│  - Delete           │ ✓         │ ✓     │ ✗        │ ✗      │
│  - Ban/Suspend      │ ✓         │ ✓     │ ✓        │ ✗      │
│                     │           │       │          │        │
│ Dive Sites          │           │       │          │        │
│  - View All         │ ✓         │ ✓     │ ✓        │ ✓      │
│  - Create/Edit      │ ✓         │ ✓     │ ✓        │ ✗      │
│  - Delete           │ ✓         │ ✓     │ ✗        │ ✗      │
│  - Publish/Archive  │ ✓         │ ✓     │ ✓        │ ✗      │
│                     │           │       │          │        │
│ Shuttles            │           │       │          │        │
│  - View All         │ ✓         │ ✓     │ ✓        │ ✓      │
│  - Create/Edit      │ ✓         │ ✓     │ ✗        │ ✗      │
│  - Delete           │ ✓         │ ✓     │ ✗        │ ✗      │
│  - Set Schedule     │ ✓         │ ✓     │ ✗        │ ✗      │
│                     │           │       │          │        │
│ Admin Users         │           │       │          │        │
│  - View All         │ ✓         │ ✗     │ ✗        │ ✗      │
│  - Invite           │ ✓         │ ✗     │ ✗        │ ✗      │
│  - Change Role      │ ✓         │ ✗     │ ✗        │ ✗      │
│  - Deactivate       │ ✓         │ ✗     │ ✗        │ ✗      │
│                     │           │       │          │        │
│ Audit Logs          │ ✓         │ ✓     │ ✓        │ ✗      │
│ Analytics/Reports   │ ✓         │ ✓     │ ✓        │ ✓      │
│ System Settings     │ ✓         │ ✗     │ ✗        │ ✗      │
└─────────────────────┴──────────┴───────┴──────────┴────────┘
```

### Permission Types (Atomic)

```typescript
enum AdminPermission {
  // Users
  READ_USERS = 'read_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  BAN_USERS = 'ban_users',
  
  // Dive Sites
  READ_DIVE_SITES = 'read_dive_sites',
  CREATE_DIVE_SITES = 'create_dive_sites',
  EDIT_DIVE_SITES = 'edit_dive_sites',
  DELETE_DIVE_SITES = 'delete_dive_sites',
  PUBLISH_DIVE_SITES = 'publish_dive_sites',
  
  // Shuttles
  READ_SHUTTLES = 'read_shuttles',
  CREATE_SHUTTLES = 'create_shuttles',
  EDIT_SHUTTLES = 'edit_shuttles',
  DELETE_SHUTTLES = 'delete_shuttles',
  MANAGE_SHUTTLE_SCHEDULE = 'manage_shuttle_schedule',
  
  // Admin Management
  MANAGE_ADMINS = 'manage_admins',
  INVITE_ADMINS = 'invite_admins',
  CHANGE_ADMIN_ROLE = 'change_admin_role',
  
  // System
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SETTINGS = 'manage_settings',
}
```

---

## Admin User Onboarding

### Invitation Flow

**Step 1: Super Admin Invites**
```
Super Admin → Admin Panel → "Invite Admin" 
            → Enter email, select role
            → System creates admin_users record with status: 'pending'
            → Sends email with invitation link + temporary token
```

**Step 2: Invitee Accepts Invitation**
```
Email Link → /admin/accept-invitation?token=xxxxx
           → Validate token (not expired, not used)
           → Show form: Set password + confirm password
           → Create user in Supabase Auth
           → Link to admin_users record
           → Update admin_users.status = 'active'
           → Log audit event
           → Redirect to /admin/dashboard
```

**Step 3: First Login Security Check**
```
First Login → Require password change
           → Optional: Enable 2FA setup
           → Show acknowledgement of admin responsibilities
           → Request confirmation of identity (security questions)
```

---

## Session Management

### Key Implementation Details

**1. Session Expiration & Refresh**
- Access Token: 1 hour
- Refresh Token: 7 days
- Automatic refresh on API calls (handled by @supabase/ssr)
- User must re-authenticate after 7 days

**2. Concurrent Session Control**
- Allow max 2 concurrent sessions per admin (configurable)
- Log each session login with IP, browser, timestamp
- Option to view active sessions and force logout

**3. Idle Timeout**
- Warn after 30 minutes of inactivity
- Log out after 45 minutes
- Clear sensitive data on logout

**4. Session Security Headers**
```
Secure: true          (HTTPS only)
HttpOnly: true        (No JS access)
SameSite: Strict      (CSRF protection)
Path: /admin          (Limited scope)
```

---

## Security Recommendations

### 1. Two-Factor Authentication (2FA) - HIGHLY RECOMMENDED

**Implementation:**
- TOTP (Time-based One-Time Password) via authenticator apps
- Backup codes for account recovery
- Mandatory for Super Admin, optional for others
- Can be enforced org-wide via policy

**Flow:**
```
Login with email/password → 2FA Challenge 
                          → Enter 6-digit code from authenticator
                          → Grant full session access
```

**Code example (using `speakeasy` library):**
```typescript
// Enable 2FA
import speakeasy from 'speakeasy';

const secret = speakeasy.generateSecret({
  name: `DIVE DROP Admin (${email})`,
  issuer: 'DIVE DROP',
  length: 32
});

// secret.base32 → Show QR code to user
// secret.ascii → Backup code

// Verify 2FA
const verified = speakeasy.totp.verify({
  secret: user.totp_secret,
  encoding: 'base32',
  token: userInput,
  window: 1
});
```

### 2. IP Whitelisting (Optional but Recommended)

**Approach:**
- Store allowed IP ranges per admin user
- Check IP on every request
- Alert on unexpected IP login
- Require email verification for new IP

**Configuration:**
```typescript
interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
  whitelisted_ips: string[];  // ['192.168.1.0/24', '10.0.0.5']
  require_ip_whitelist: boolean;
  status: 'active' | 'pending' | 'suspended';
}
```

### 3. Audit Logging - MANDATORY

**Log every admin action:**
```typescript
interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;  // 'create_user', 'edit_dive_site', etc.
  resource_type: string;  // 'users', 'dive_sites', etc.
  resource_id: string;
  old_values: object | null;
  new_values: object | null;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  error_message: string | null;
  created_at: timestamp;
}
```

**Critical actions to log:**
- Admin login/logout (with IP)
- User creation/deletion
- Permission changes
- Dive site modifications
- Shuttle management
- Admin invitations
- 2FA changes
- Password changes
- Session activity

### 4. Rate Limiting

```typescript
// Login endpoint
- Max 5 failed attempts per 15 minutes per IP
- Lock account after 5 consecutive failures
- Notify admin via email

// API endpoints
- Admin CRUD: 100 requests/minute per user
- Admin read: 1000 requests/minute per user
```

### 5. CORS & CSRF Protection

```typescript
// CORS headers
Access-Control-Allow-Origin: 'https://your-domain.com'
Access-Control-Allow-Methods: 'GET, POST, PUT, DELETE'
Access-Control-Allow-Credentials: 'true'

// CSRF Token (Supabase handles via SameSite=Strict cookies)
- All state-changing operations require CSRF token
- Token rotated after use
```

### 6. Secure Password Policy

Already implemented in auth schemas:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- **Recommendation:** Add special character requirement

### 7. Admin Device Management

Track trusted devices:
```typescript
interface AdminSession {
  id: string;
  admin_user_id: string;
  device_name: string;
  device_type: 'web' | 'mobile';
  device_fingerprint: string;
  ip_address: string;
  user_agent: string;
  last_activity: timestamp;
  expires_at: timestamp;
  is_trusted: boolean;
}
```

### 8. Encrypted Sensitive Fields

Fields to encrypt at-rest:
- Whitelisted IPs (if storing)
- TOTP backup codes
- Recovery codes
- Session tokens in logs

---

## Implementation Examples

### 1. Database Schema Migration

```sql
-- Admin Users Table
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer')),
  permissions text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  status text CHECK (status IN ('active', 'pending', 'suspended')) DEFAULT 'active',
  
  -- 2FA
  totp_secret text,
  totp_enabled boolean DEFAULT false,
  backup_codes text[],
  
  -- IP Whitelist
  whitelisted_ips text[] DEFAULT ARRAY[]::text[],
  require_ip_whitelist boolean DEFAULT false,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  last_login_at timestamp,
  last_login_ip text,
  login_attempt_count int DEFAULT 0,
  login_attempt_last_at timestamp
);

-- Admin Sessions Table
CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  device_name text,
  device_type text CHECK (device_type IN ('web', 'mobile')),
  device_fingerprint text,
  ip_address text NOT NULL,
  user_agent text,
  is_trusted boolean DEFAULT false,
  last_activity timestamp DEFAULT now(),
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  status text CHECK (status IN ('success', 'failure')) DEFAULT 'success',
  error_message text,
  created_at timestamp DEFAULT now(),
  
  CONSTRAINT meaningful_resource CHECK (
    (resource_type != 'unknown' AND resource_id IS NOT NULL) OR
    resource_type IN ('system', 'auth')
  )
);

-- Admin Invitations Table
CREATE TABLE admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES admin_users(id),
  accepted_at timestamp,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX admin_users_user_id_idx ON admin_users(user_id);
CREATE INDEX admin_users_email_idx ON admin_users(email);
CREATE INDEX admin_sessions_admin_user_id_idx ON admin_sessions(admin_user_id);
CREATE INDEX admin_audit_logs_admin_user_id_idx ON admin_audit_logs(admin_user_id);
CREATE INDEX admin_audit_logs_created_at_idx ON admin_audit_logs(created_at);
CREATE INDEX admin_audit_logs_resource_type_idx ON admin_audit_logs(resource_type);
```

### 2. Row-Level Security (RLS) Policies

```sql
-- Admin Users Table - RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Super admins can see all admin users
CREATE POLICY admin_users_super_admin_select
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

-- Users can only see their own admin record
CREATE POLICY admin_users_self_select
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- Only super admins can update admin users
CREATE POLICY admin_users_super_admin_update
  ON admin_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

-- Users can update their own email and basic info (not role)
CREATE POLICY admin_users_self_update
  ON admin_users FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (SELECT role FROM admin_users WHERE user_id = auth.uid())
  );

-- Audit Logs - RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY audit_logs_admin_select
  ON admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- Only insert (no update/delete) - append-only audit trail
CREATE POLICY audit_logs_insert
  ON admin_audit_logs FOR INSERT
  WITH CHECK (true);

-- Admin Sessions - RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY admin_sessions_self_select
  ON admin_sessions FOR SELECT
  USING (
    admin_user_id IN (
      SELECT id FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Invitations - RLS
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only super admins can create invitations
CREATE POLICY admin_invitations_super_admin_create
  ON admin_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );
```

### 3. Login API Route

```typescript
// src/app/api/admin/auth/login/route.ts

import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/auth/schemas';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    const supabase = await createClient();
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || headerList.get('x-client-ip') || 'unknown';
    
    // 1. Check rate limiting
    const { data: existingAttempts } = await supabase
      .from('admin_login_attempts')
      .select('*')
      .eq('ip_address', ip)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
    
    if (existingAttempts && existingAttempts.length >= 5) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }
    
    // 2. Check if user exists in admin_users table
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('user_id, role, permissions, status, totp_enabled')
      .eq('email', validatedData.email)
      .single();
    
    if (!adminUser) {
      // Log failed attempt
      await supabase.from('admin_login_attempts').insert({
        email: validatedData.email,
        ip_address: ip,
        success: false,
        reason: 'not_admin_user'
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    if (adminUser.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is suspended. Contact support.' },
        { status: 403 }
      );
    }
    
    // 3. Authenticate with Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });
    
    if (authError || !data.session) {
      // Log failed attempt
      await supabase.from('admin_login_attempts').insert({
        email: validatedData.email,
        ip_address: ip,
        success: false,
        reason: 'invalid_credentials'
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // 4. 2FA check if enabled
    if (adminUser.totp_enabled) {
      // Return response indicating 2FA required
      // Frontend will redirect to /admin/verify-2fa
      return NextResponse.json(
        { 
          success: true,
          requires_2fa: true,
          session_token: data.session.access_token
        },
        { status: 200 }
      );
    }
    
    // 5. Create admin session record
    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_user_id: adminUser.user_id,
        ip_address: ip,
        user_agent: headerList.get('user-agent') || 'unknown',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    
    if (sessionError) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    // 6. Update last login
    await supabase
      .from('admin_users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ip,
        login_attempt_count: 0
      })
      .eq('user_id', adminUser.user_id);
    
    // 7. Log successful login
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: adminUser.user_id,
        action: 'admin_login',
        resource_type: 'auth',
        status: 'success',
        ip_address: ip,
        user_agent: headerList.get('user-agent') || 'unknown'
      });
    
    // 8. Log login attempt
    await supabase.from('admin_login_attempts').insert({
      email: validatedData.email,
      ip_address: ip,
      success: true
    });
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Login successful'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
```

### 4. Permission Check Utility

```typescript
// src/lib/admin/permissions.ts

import { createClient } from '@/lib/supabase/server';

const rolePermissionMap: Record<string, string[]> = {
  'super_admin': [
    'read_users', 'create_users', 'edit_users', 'delete_users', 'ban_users',
    'read_dive_sites', 'create_dive_sites', 'edit_dive_sites', 'delete_dive_sites', 'publish_dive_sites',
    'read_shuttles', 'create_shuttles', 'edit_shuttles', 'delete_shuttles', 'manage_shuttle_schedule',
    'manage_admins', 'invite_admins', 'change_admin_role',
    'view_audit_logs', 'manage_settings'
  ],
  'admin': [
    'read_users', 'create_users', 'edit_users', 'delete_users', 'ban_users',
    'read_dive_sites', 'create_dive_sites', 'edit_dive_sites', 'delete_dive_sites', 'publish_dive_sites',
    'read_shuttles', 'create_shuttles', 'edit_shuttles', 'delete_shuttles', 'manage_shuttle_schedule',
    'view_audit_logs'
  ],
  'moderator': [
    'read_users', 'ban_users',
    'read_dive_sites', 'create_dive_sites', 'edit_dive_sites', 'publish_dive_sites',
    'read_shuttles',
    'view_audit_logs'
  ],
  'viewer': [
    'read_users', 'read_dive_sites', 'read_shuttles', 'view_audit_logs'
  ]
};

export async function checkAdminPermission(requiredPermission: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, permissions, is_active, status')
      .eq('user_id', user.id)
      .single();
    
    if (!adminUser || !adminUser.is_active || adminUser.status !== 'active') {
      return false;
    }
    
    // Check role permissions
    const rolePermissions = rolePermissionMap[adminUser.role] || [];
    if (rolePermissions.includes(requiredPermission)) {
      return true;
    }
    
    // Check custom permissions
    return adminUser.permissions?.includes(requiredPermission) || false;
    
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

export async function getAdminPermissions(): Promise<string[]> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single();
    
    if (!adminUser) return [];
    
    const basePermissions = rolePermissionMap[adminUser.role] || [];
    const customPermissions = adminUser.permissions || [];
    
    return [...new Set([...basePermissions, ...customPermissions])];
    
  } catch (error) {
    console.error('Get permissions error:', error);
    return [];
  }
}
```

### 5. Protected Admin Page Component

```typescript
// src/app/admin/layout.tsx

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/admin/login');
  }
  
  // Check admin status
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role, status, is_active')
    .eq('user_id', session.user.id)
    .single();
  
  if (!adminUser || !adminUser.is_active || adminUser.status !== 'active') {
    // Log unauthorized access attempt
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: session.user.id,
        action: 'unauthorized_admin_access',
        resource_type: 'auth',
        status: 'failure',
        error_message: 'User not authorized as admin'
      });
    
    redirect('/login');
  }
  
  return (
    <div className="admin-layout">
      <AdminHeader adminRole={adminUser.role} />
      <main>{children}</main>
    </div>
  );
}
```

### 6. Audit Logging Helper

```typescript
// src/lib/admin/audit.ts

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function logAdminAction(
  action: string,
  resourceType: string,
  resourceId?: string,
  oldValues?: object,
  newValues?: object,
  status: 'success' | 'failure' = 'success',
  errorMessage?: string
) {
  try {
    const supabase = await createClient();
    const headerList = await headers();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!adminUser) return;
    
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: adminUser.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: headerList.get('x-forwarded-for') || 'unknown',
        user_agent: headerList.get('user-agent') || 'unknown',
        status,
        error_message: errorMessage
      });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}
```

---

## Database Schema

See "Implementation Examples" section above for complete SQL migrations.

**Key Tables:**
1. `admin_users` - Core admin user data, roles, permissions
2. `admin_sessions` - Active sessions and device tracking
3. `admin_audit_logs` - Append-only audit trail (RLS: insert only)
4. `admin_invitations` - Pending admin invitations
5. `admin_login_attempts` - Rate limiting tracking

---

## Integration Checklist

- [ ] Create database tables and migrations
- [ ] Set up RLS policies for admin tables
- [ ] Implement login API endpoint
- [ ] Create login page component (/admin/login)
- [ ] Set up middleware for admin route protection
- [ ] Implement permission checking utility
- [ ] Create 2FA setup/verification pages
- [ ] Build admin dashboard layout
- [ ] Add audit logging to all admin actions
- [ ] Create admin user management page
- [ ] Implement invitation system
- [ ] Add rate limiting middleware
- [ ] Set up email notifications for admin events
- [ ] Create admin documentation
- [ ] Test with multiple roles and permissions
- [ ] Implement monitoring and alerting for failed login attempts
- [ ] Add session management UI (view active sessions, logout from other devices)
- [ ] Create security policy documentation for admins

---

## Security Checklist

- [ ] All admin endpoints use HTTPS only
- [ ] Passwords hashed with bcrypt (handled by Supabase Auth)
- [ ] Secure HTTP-only cookies for sessions
- [ ] CSRF protection via SameSite=Strict
- [ ] Rate limiting on login (5 attempts/15 min)
- [ ] Comprehensive audit logging (append-only)
- [ ] 2FA enabled for Super Admin (recommended for others)
- [ ] IP whitelisting optional per user
- [ ] No sensitive data in logs
- [ ] Session expiration after 7 days
- [ ] Idle timeout after 45 minutes
- [ ] Device fingerprinting for suspicious logins
- [ ] Email alerts for admin actions
- [ ] Regular security audits of admin_audit_logs table
- [ ] Admin account recovery procedure documented
- [ ] Incident response plan for compromised admin account

---

## Language Support

- **Default Admin Interface**: English
- **Audit Logs**: English (system language)
- **User-Facing Messages**: Support both Hebrew and English via next-intl
- **Email Notifications**: Hebrew/English based on admin preference

---

## Recommended Tools & Libraries

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.12.0",
    "@supabase/supabase-js": "^2.108.2",
    "zod": "^4.4.3",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "bcryptjs": "^2.4.3"
  }
}
```

---

## References

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **OWASP Admin Authentication**: https://cheatsheetseries.owasp.org/
- **JWT Best Practices**: https://tools.ietf.org/html/rfc8949
- **Rate Limiting**: https://owasp.org/www-community/attacks/Brute_force_attack

---

**Document Version**: 1.0  
**Last Updated**: June 20, 2026  
**Status**: Ready for Implementation
