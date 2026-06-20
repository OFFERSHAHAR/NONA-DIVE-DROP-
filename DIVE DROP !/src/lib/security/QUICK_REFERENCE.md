# Security System - Quick Reference

## Files Overview

```
src/lib/security/
├─ permissions.ts               (Permission types & checks)
├─ auth-middleware.ts           (Auth context & authorization)
├─ contact-reveal-service.ts    (Mutual contact reveals)
├─ blocking-service.ts          (User blocking)
├─ report-service.ts            (Abuse reporting)
├─ types.ts                     (TypeScript interfaces)
├─ rls-policies.sql             (Database RLS + functions)
├─ IMPLEMENTATION.md            (Step-by-step guide)
├─ SECURITY_DESIGN.md           (Complete design spec)
└─ QUICK_REFERENCE.md           (This file)
```

---

## Common Tasks

### 1. Protect a Server Action

```typescript
'use server';

import { getAuthContext, authorize, requireAuth } from '@/lib/security/auth-middleware';
import { ResourceAction } from '@/lib/security/permissions';

export async function myAction(data: any) {
  // Get auth context
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.CREATE_LISTING);
  
  // Get authenticated user
  const user = requireAuth(context);
  
  // Now you can use user.id
  return { success: true, user: user.id };
}
```

### 2. Check if User Owns Resource

```typescript
import { requireOwnership } from '@/lib/security/auth-middleware';

// In server action
const user = requireAuth(context);
requireOwnership(user.id, listing.ownerId);
// If not owner, throws ForbiddenError
```

### 3. Get Permission for Action

```typescript
import { hasPermission } from '@/lib/security/permissions';
import { UserRole, ResourceAction } from '@/lib/security/permissions';

const allowed = hasPermission(UserRole.REGISTERED, ResourceAction.CREATE_LISTING);
// Returns: true
```

### 4. Block a User

```typescript
import { blockUser } from '@/lib/security/blocking-service';

const context = await getAuthContext();
const block = await blockUser(context, userToBlockId, 'spam');
```

### 5. Reveal Contact Info

```typescript
import {
  initiateContactReveal,
  acceptContactReveal,
  getRevealedContactInfo,
} from '@/lib/security/contact-reveal-service';

// User B initiates
const reveal = await initiateContactReveal(context, listingId);

// User A accepts (later)
const accepted = await acceptContactReveal(context, revealId);

// Get contact info (if mutual reveal)
const contact = await getRevealedContactInfo(context, otherUserId, listingId);
// Returns: { email, phone, profilePictureUrl } or null
```

### 6. Report a User

```typescript
import { reportUser } from '@/lib/security/report-service';

const report = await reportUser(
  context,
  reportedUserId,
  'harassment',
  'Sent threatening messages'
);
```

### 7. Check Field Visibility

```typescript
import { canSeeField } from '@/lib/security/permissions';
import { UserRole, VisibilityLevel } from '@/lib/security/permissions';

const canSee = canSeeField(
  'ownerEmail',           // Field name
  UserRole.REGISTERED,    // Viewer role
  viewerId,               // Viewer user ID
  ownerId,                // Resource owner ID
  true                    // Has mutual reveal?
);
```

---

## Permission Levels

### What Each Role Can Do

```typescript
// ANONYMOUS (not logged in)
hasPermission(UserRole.ANONYMOUS, ResourceAction.VIEW_LISTING) // ✅
hasPermission(UserRole.ANONYMOUS, ResourceAction.CREATE_LISTING) // ❌

// REGISTERED (verified email)
hasPermission(UserRole.REGISTERED, ResourceAction.CREATE_LISTING) // ✅
hasPermission(UserRole.REGISTERED, ResourceAction.DELETE_LISTING) // ❌ (only owner)

// LISTING_OWNER (implicit)
// Same as REGISTERED + owner-specific actions
```

---

## Contact Reveal Flow

### Step 1: Express Interest
```typescript
'use server';

export async function expressInterestAction(listingId: string) {
  const context = await getAuthContext();
  authorize(context, ResourceAction.EXPRESS_INTEREST);
  
  const supabase = await createClient();
  
  const { data: interest } = await supabase
    .from('interests')
    .insert({
      listing_id: listingId,
      interested_user_id: context.user!.id,
      listing_owner_id: ownerId,
    })
    .select()
    .single();

  return { success: true, interest };
}
```

### Step 2: Request Contact Reveal (User B)
```typescript
'use server';

export async function requestContactRevealAction(listingId: string) {
  const context = await getAuthContext();
  authorize(context, ResourceAction.REQUEST_CONTACT);
  
  const reveal = await initiateContactReveal(context, listingId);
  // Message sent to owner: "User X wants to connect"
  
  return { success: true, reveal };
}
```

### Step 3: Accept & Reveal (User A)
```typescript
'use server';

export async function acceptContactRevealAction(revealId: string) {
  const context = await getAuthContext();
  authorize(context, ResourceAction.REVEAL_CONTACT);
  
  const reveal = await acceptContactReveal(context, revealId);
  // Both users can now see each other's contact info
  
  return { success: true, reveal };
}
```

### Step 4: Get Contact Info
```typescript
'use server';

export async function getContactAction(otherUserId: string, listingId: string) {
  const context = await getAuthContext();
  authorize(context, ResourceAction.VIEW_CONTACT_INFO);
  
  const contact = await getRevealedContactInfo(context, otherUserId, listingId);
  
  return {
    success: true,
    email: contact?.email,
    phone: contact?.phone,
    profilePicture: contact?.profilePictureUrl,
  };
}
```

---

## Database Queries

### Get Active Listings (Public)
```sql
SELECT * FROM listings
WHERE is_active = true
  AND owner_id NOT IN (
    SELECT id FROM users
    WHERE auth.uid() = ANY(blocked_users)
  );
```

### Get Listing with Interests (Owner Only)
```sql
SELECT 
  l.*,
  array_agg(i.interested_user_id) as interested_users
FROM listings l
LEFT JOIN interests i ON l.id = i.listing_id
WHERE l.owner_id = auth.uid()
GROUP BY l.id;
```

### Check Mutual Reveal
```sql
SELECT has_mutual_reveal(
  'user-a-id',
  'user-b-id',
  'listing-id'
);
```

### Get Blocked Users
```sql
SELECT * FROM blocks
WHERE blocker_id = auth.uid();
```

### Get Open Reports
```sql
SELECT * FROM reports
WHERE status = 'open'
ORDER BY created_at DESC;
```

### Audit Trail (Contact Reveals)
```sql
SELECT * FROM audit_log
WHERE action = 'contact_revealed'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

---

## Error Handling

### Common Errors

```typescript
// Authentication required
throw new AuthenticationError('Must be logged in');

// Permission denied
throw new UnauthorizedError('Cannot view contact info');

// Not your resource
throw new ForbiddenError('You do not own this listing');

// Resource not found
throw new Error('Listing not found');

// Already exists
throw new Error('You are already interested in this listing');
```

### In Server Actions

```typescript
'use server';

export async function myAction(input: any) {
  try {
    const context = await getAuthContext();
    authorize(context, ResourceAction.SOME_ACTION);
    const user = requireAuth(context);
    
    // ... do stuff ...
    
    return { success: true, data };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: 'Please log in' };
    }
    if (error instanceof UnauthorizedError) {
      return { error: 'You do not have permission' };
    }
    return {
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}
```

---

## Client Components

### Protected Button Example

```typescript
'use client';

import { expressInterestAction } from '@/app/actions/interests';
import { useAuthStore } from '@/store/authStore';

export function InterestButton({ listingId }: { listingId: string }) {
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!isAuthenticated) {
      // Show login modal
      return;
    }

    setLoading(true);
    try {
      const result = await expressInterestAction(listingId);
      if (result.error) {
        alert(result.error);
      } else {
        alert('Interest expressed!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading || !isAuthenticated}>
      {loading ? 'Loading...' : 'Express Interest'}
    </button>
  );
}
```

---

## Testing Checklist

### Auth Tests
- [ ] Anonymous user can view listings
- [ ] Anonymous user cannot create listing
- [ ] Registered user can create listing
- [ ] Non-owner cannot delete listing

### Contact Reveal Tests
- [ ] User B can request contact reveal
- [ ] User A receives notification
- [ ] User A can accept
- [ ] Contact info visible after mutual reveal
- [ ] Contact info hidden before mutual reveal

### Blocking Tests
- [ ] User A can block User B
- [ ] User B's listings hidden from User A
- [ ] User B's interests removed from User A's listings
- [ ] User A can unblock User B

### Reporting Tests
- [ ] User A can report User B
- [ ] Report appears in audit log
- [ ] User B is notified/not notified (depends on design)
- [ ] Multiple reports tracked separately

### Permission Tests
- [ ] RLS policies enforce access
- [ ] Anonymous user cannot read contact info via SQL
- [ ] Registered user cannot read others' contact info via SQL
- [ ] Only mutual reveal allows contact info access

---

## Deployment Checklist

- [ ] Run RLS SQL in Supabase
- [ ] Enable email verification
- [ ] Configure Supabase auth providers
- [ ] Set up SMTP for emails
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure CORS headers
- [ ] Enable security headers (CSP, HSTS)
- [ ] Set up monitoring/alerting
- [ ] Brief support team on new features
- [ ] Document blocking/reporting flow

---

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Email service
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=...

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

# Admin contact
ADMIN_EMAIL=admin@example.com
MODERATOR_EMAIL=moderator@example.com
```

---

## Useful Commands

### List all RLS policies
```sql
SELECT * FROM pg_policies;
```

### Check if RLS is enabled on a table
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'listings';
```

### Find unused contact reveals
```sql
SELECT * FROM contact_reveals
WHERE mutual_revealed_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days';
```

### Audit compliance report
```sql
SELECT 
  DATE_TRUNC('day', created_at) as day,
  action,
  COUNT(*) as count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), action
ORDER BY day DESC;
```

---

## Key Principles

1. **Database is Source of Truth** - RLS policies enforce access
2. **No Contact Info by Default** - Hidden until mutual consent
3. **All Actions Logged** - For compliance and abuse prevention
4. **User Control** - Can block, report, delete anytime
5. **Fail Secure** - Deny access when in doubt
6. **No Information Leakage** - Don't reveal if user is blocked
7. **Symmetric Blocking** - Not mutual (A blocks B ≠ B blocks A)
8. **Immutable Audit** - Cannot modify/delete audit logs

---

## Support Links

- **TypeScript Types:** `src/lib/security/types.ts`
- **Full Design:** `SECURITY_DESIGN.md`
- **Implementation Steps:** `src/lib/security/IMPLEMENTATION.md`
- **SQL Schema:** `src/lib/security/rls-policies.sql`
- **Supabase Docs:** https://supabase.com/docs/guides/auth
- **RLS Guide:** https://supabase.com/docs/guides/realtime/security-and-authorization

---

**Last Updated:** 2026-06-20  
**Security Level:** Comprehensive  
**Status:** Production-Ready
