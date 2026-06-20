# Authorization & Authentication System

## Overview

This document describes the complete authorization and authentication system for DiveDrop, including protected pages, user status display, and role-based access control.

## Components

### 1. User Status Component (`UserStatus.tsx`)

Displays user authentication status in the Header with:
- **When Logged In:**
  - User avatar with initials
  - User name and "Connected" badge
  - Link to Profile page
  - Settings button
  - Logout button

- **When Logged Out:**
  - Login button
  - Register button

**Usage:**
```tsx
import { UserStatus } from '@/components/UserStatus';

<Header>
  <UserStatus compact={false} /> {/* Full version */}
  <UserStatus compact={true} />  {/* Mobile/compact version */}
</Header>
```

### 2. Protected Page Wrapper (`ProtectedPageWrapper.tsx`)

Client-side wrapper component that:
- Redirects unauthenticated users to `/login`
- Shows loading state while checking authentication
- Optionally enforces admin role requirement
- Displays "Not Authorized" message for forbidden access

**Usage:**
```tsx
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';

export default function ProtectedPage() {
  return (
    <ProtectedPageWrapper requiredRole="registered">
      <YourContent />
    </ProtectedPageWrapper>
  );
}
```

### 3. Authentication Middleware (`middleware.ts`)

Server-side middleware that:
- Checks authentication status before page loads
- Redirects to `/unauthorized` (401) if not logged in
- Redirects to `/forbidden` (403) if lacking required role
- Applies i18n middleware for all routes

**Protected Routes:**
```
/find-buddy
/bookings
/my-dives
/my-profile
/settings
/free-diving/my-trainings
/equipment/rentals
/admin/* (admin only)
```

### 4. Error Pages

#### 401 Unauthorized (`unauthorized.tsx`)
- User is not logged in
- Prompts to login or register
- Redirect from protected routes

#### 403 Forbidden (`forbidden.tsx`)
- User is logged in but lacks permissions
- Typically admin routes accessed by non-admin users
- Contact support option

#### Generic Error (`error.tsx`)
- Application error handling
- Retry option
- Back to home link

## Protected Routes Structure

### Public Routes (No Auth Required)
```
/ (home)
/auth/login
/auth/register
/auth/forgot-password
```

### Registered User Routes
```
/find-buddy        - Find diving buddies
/bookings          - Manage bookings
/my-dives          - View past dives
/my-profile        - User profile
/settings          - User settings
/free-diving/*     - Free diving features
/equipment/*       - Equipment rentals
```

### Admin Routes (Admin Only)
```
/admin/users       - User management
/admin/dive-sites  - Dive site management
/admin/shuttles    - Shuttle management
/admin/settings    - Admin settings
```

## Authentication Flow

### Client-Side Initialization

1. **AuthProvider** initializes on layout
2. **useAuthInit** hook fetches current user
3. User state updates in **useAuthStore**
4. Components respond to auth state changes

```
AuthProvider (Root)
  ↓
useAuthInit Hook
  ↓
Supabase.auth.getUser()
  ↓
useAuthStore.setUser()
  ↓
Components update (UserStatus, ProtectedPageWrapper, etc.)
```

### Server-Side Protection

1. Request hits **middleware**
2. Route checked against PROTECTED_ROUTES
3. Supabase session validated
4. Redirect if unauthorized/forbidden
5. Otherwise proceed with i18n middleware

## User Roles

Defined in `src/lib/security/permissions.ts`:

```typescript
enum UserRole {
  ANONYMOUS = 'anonymous'        // Not logged in
  REGISTERED = 'registered'       // Email verified, can use most features
  LISTING_OWNER = 'listing_owner' // Can manage own listings
  ADMIN = 'admin'                 // Full access (in user_metadata.role)
}
```

## Usage Examples

### 1. Display User Status in Header

Already integrated! The Header component now includes:
```tsx
<Header>
  {/* Shows login/register buttons OR user info + settings + logout */}
  <UserStatus />
</Header>
```

### 2. Protect a Page

Wrap your page content:
```tsx
// src/app/[locale]/my-bookings/page.tsx

export default function MyBookingsPage() {
  return (
    <ProtectedPageWrapper requiredRole="registered">
      <div>
        <h1>My Bookings</h1>
        {/* Content here */}
      </div>
    </ProtectedPageWrapper>
  );
}
```

### 3. Server-Side Auth Check

In server actions or API routes:
```tsx
import { getAuthContext } from '@/lib/security/auth-middleware';

export async function getUserDives() {
  const auth = await getAuthContext();
  
  if (!auth.isAuthenticated) {
    throw new Error('Must be logged in');
  }
  
  // Fetch user's dives...
}
```

### 4. Check User Role

```tsx
import { useAuthStore } from '@/store/authStore';

export function AdminPanel() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.user_metadata?.role === 'admin';
  
  if (!isAdmin) return null;
  
  return <div>Admin Controls</div>;
}
```

## Troubleshooting

### Hydration Issues
- `UserStatus` has `useEffect` to prevent SSR/client mismatch
- Returns `null` during hydration

### Redirect Loops
- Middleware checks protected routes BEFORE i18n
- Locale detection happens in middleware
- Redirects preserve locale

### Auth State Not Updating
- Check that `AuthProvider` wraps your content
- Verify Supabase client is configured
- Check browser console for errors

### Admin Route Access
- User must have `role: 'admin'` in Supabase `user_metadata`
- Check in Supabase dashboard: Auth → Users → select user → User Metadata

## Configuration

### Protected Routes
Edit `PROTECTED_ROUTES` in `src/middleware.ts`:
```typescript
const PROTECTED_ROUTES = [
  '/find-buddy',
  '/bookings',
  // Add more routes here
];
```

### Admin Routes
Edit `ADMIN_ROUTES` in `src/middleware.ts`:
```typescript
const ADMIN_ROUTES = ['/admin'];
```

## Security Considerations

1. **Never trust client-side auth checks alone** - Always verify on server/middleware
2. **Use middleware for critical routes** - Pages like `/bookings` must be protected server-side
3. **Session validation** - Supabase handles session tokens automatically
4. **Role validation** - Check `user_metadata.role` for admin checks
5. **Contact reveal** - Implement contact-reveal service for sensitive user info

## Related Files

- `src/store/authStore.ts` - Zustand auth state
- `src/lib/hooks/useAuthInit.ts` - Auth initialization hook
- `src/lib/security/auth-middleware.ts` - Auth context and helpers
- `src/lib/security/permissions.ts` - Permission matrix and roles
- `src/middleware.ts` - Next.js middleware configuration
- `src/app/[locale]/AuthProvider.tsx` - Auth provider component

## Testing

### Test Protected Routes
1. Navigate to `/find-buddy` without logging in
2. Should redirect to `/unauthorized`
3. Login and try again
4. Should load page successfully

### Test Admin Routes
1. Login as regular user
2. Navigate to `/admin`
3. Should redirect to `/forbidden`
4. Login as admin
5. Should load successfully

### Test User Status
1. Logout - Should show Login/Register buttons
2. Login - Should show user name and avatar
3. Click settings - Should navigate to settings
4. Click logout - Should logout and refresh

## Next Steps

1. ✅ Create protected pages using `ProtectedPageWrapper`
2. ✅ Update all protected routes in middleware
3. ✅ Test authorization flows
4. Add email verification
5. Add 2FA for admin accounts
6. Implement audit logging for sensitive actions
