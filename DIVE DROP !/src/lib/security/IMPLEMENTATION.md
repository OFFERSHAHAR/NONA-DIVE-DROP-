# Implementation Guide: Authentication & Permissions System

## Overview

This guide walks through implementing the security & permissions system for "Find a Buddy" (מצא באדי).

The system has three layers:
1. **Database Layer** - Row Level Security (RLS) policies in PostgreSQL
2. **Application Layer** - Permission checks and authorization middleware
3. **API Layer** - Server actions with auth context

---

## 1. Database Setup

Run the SQL schema from `rls-policies.sql` in your Supabase project:

```bash
# In Supabase dashboard:
# 1. Go to SQL Editor
# 2. Create new query
# 3. Paste contents of rls-policies.sql
# 4. Run
```

This creates:
- `users` table with RLS enabled
- `listings` table with RLS enabled
- `interests` table - tracks who's interested
- `contact_reveals` table - tracks mutual contact reveals
- `blocks` table - user blocking
- `reports` table - abuse reports
- `audit_log` table - compliance tracking

---

## 2. Permission Types

### User Roles

```typescript
enum UserRole {
  ANONYMOUS = 'anonymous',        // Not logged in
  REGISTERED = 'registered',      // Verified + authenticated
  LISTING_OWNER = 'listing_owner' // Owns a listing (implicit)
}
```

### Permission Matrix

| Action | Anonymous | Registered | Owner |
|--------|-----------|-----------|-------|
| View Listing | ✅ | ✅ | ✅ |
| View Contact Info | ❌ | ❌ | ✅ (if mutual reveal) |
| Create Listing | ❌ | ✅ | ✅ |
| Update Own Listing | ❌ | ❌ | ✅ |
| Delete Own Listing | ❌ | ❌ | ✅ |
| Express Interest | ❌ | ✅ | ✅ |
| Reveal Contact | ❌ | ✅ | ✅ |
| Block User | ❌ | ✅ | ✅ |
| Report User | ❌ | ✅ | ✅ |

---

## 3. Server Action Example: Create Listing

```typescript
// src/app/actions/listings.ts
'use server';

import { getAuthContext, authorize, requireAuth } from '@/lib/security/auth-middleware';
import { ResourceAction } from '@/lib/security/permissions';
import { auditListingCreation } from '@/lib/security/auth-middleware';
import { createClient } from '@/lib/supabase/server';

export async function createListingAction(data: {
  title: string;
  description: string;
  divingLevel: 'beginner' | 'intermediate' | 'advanced';
  location: string;
  diveDate: string;
  maxBuddies: number;
}) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.CREATE_LISTING);
  
  // Get authenticated user
  const user = requireAuth(context);
  
  const supabase = await createClient();
  
  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        owner_id: user.id,
        title: data.title,
        description: data.description,
        diving_level: data.divingLevel,
        location: data.location,
        dive_date: data.diveDate,
        max_buddies: data.maxBuddies,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await auditListingCreation(user.id, listing.id, data.title);

    return { success: true, listing };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to create listing'
    };
  }
}
```

---

## 4. Server Action Example: Express Interest

```typescript
// src/app/actions/interests.ts
'use server';

import { getAuthContext, authorize, requireAuth } from '@/lib/security/auth-middleware';
import { ResourceAction } from '@/lib/security/permissions';
import { createClient } from '@/lib/supabase/server';

export async function expressInterestAction(listingId: string) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.EXPRESS_INTEREST);
  
  // Get authenticated user
  const user = requireAuth(context);
  
  const supabase = await createClient();
  
  try {
    // Get listing owner
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    // Can't be interested in own listing
    if (user.id === listing.owner_id) {
      throw new Error('Cannot express interest in your own listing');
    }

    // Create interest record
    const { data: interest, error } = await supabase
      .from('interests')
      .insert({
        listing_id: listingId,
        interested_user_id: user.id,
        listing_owner_id: listing.owner_id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('You are already interested in this listing');
      }
      throw error;
    }

    return { success: true, interest };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to express interest'
    };
  }
}
```

---

## 5. Server Action Example: Reveal Contact

```typescript
// src/app/actions/contact-reveal.ts
'use server';

import { getAuthContext, authorize, requireAuth } from '@/lib/security/auth-middleware';
import { ResourceAction } from '@/lib/security/permissions';
import {
  initiateContactReveal,
  acceptContactReveal,
  getRevealedContactInfo,
} from '@/lib/security/contact-reveal-service';

export async function initiateContactRevealAction(listingId: string) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.REQUEST_CONTACT);
  
  try {
    const reveal = await initiateContactReveal(context, listingId);
    return { success: true, reveal };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to initiate contact reveal'
    };
  }
}

export async function acceptContactRevealAction(revealId: string) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.REVEAL_CONTACT);
  
  try {
    const reveal = await acceptContactReveal(context, revealId);
    return { success: true, reveal };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to accept contact reveal'
    };
  }
}

export async function getRevealedContactAction(otherUserId: string, listingId: string) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.VIEW_CONTACT_INFO);
  
  try {
    const contact = await getRevealedContactInfo(context, otherUserId, listingId);
    return { success: true, contact };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to get contact info'
    };
  }
}
```

---

## 6. Server Action Example: Block User

```typescript
// src/app/actions/blocking.ts
'use server';

import { getAuthContext, authorize, requireAuth } from '@/lib/security/auth-middleware';
import { ResourceAction } from '@/lib/security/permissions';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '@/lib/security/blocking-service';

export async function blockUserAction(blockedUserId: string, reason?: string) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.BLOCK_USER);
  
  try {
    const block = await blockUser(context, blockedUserId, reason);
    return { success: true, block };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to block user'
    };
  }
}

export async function unblockUserAction(blockedUserId: string) {
  const context = await getAuthContext();
  
  try {
    await unblockUser(context, blockedUserId);
    return { success: true };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to unblock user'
    };
  }
}

export async function getBlockedUsersAction() {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.BLOCK_USER);
  
  try {
    const users = await getBlockedUsers(context);
    return { success: true, users };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to get blocked users'
    };
  }
}
```

---

## 7. Server Action Example: Report User

```typescript
// src/app/actions/reports.ts
'use server';

import { getAuthContext, authorize } from '@/lib/security/auth-middleware';
import { ResourceAction } from '@/lib/security/permissions';
import {
  reportUser,
  reportListing,
  getUserReports,
} from '@/lib/security/report-service';
import type { ReportReason } from '@/lib/security/report-service';

export async function reportUserAction(
  reportedUserId: string,
  reason: ReportReason,
  description?: string
) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.REPORT_USER);
  
  try {
    const report = await reportUser(context, reportedUserId, reason, description);
    return { success: true, report };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to report user'
    };
  }
}

export async function reportListingAction(
  listingId: string,
  reason: ReportReason,
  description?: string
) {
  const context = await getAuthContext();
  
  // Check permission
  authorize(context, ResourceAction.REPORT_USER);
  
  try {
    const report = await reportListing(context, listingId, reason, description);
    return { success: true, report };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to report listing'
    };
  }
}
```

---

## 8. Client Component Example: Listing Card

```typescript
// src/components/ListingCard.tsx
'use client';

import { useState } from 'react';
import { expressInterestAction } from '@/app/actions/interests';
import { blockUserAction } from '@/app/actions/blocking';
import { reportUserAction } from '@/app/actions/reports';
import { useAuthStore } from '@/store/authStore';

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    description: string;
    divingLevel: string;
    location: string;
    diveDate: string;
    ownerName: string;
    ownerId: string;
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExpressInterest = async () => {
    if (!isAuthenticated) {
      // Show login prompt
      return;
    }

    setLoading(true);
    try {
      const result = await expressInterestAction(listing.id);
      if (result.error) {
        console.error(result.error);
        alert(result.error);
      } else {
        alert('Interest expressed! The listing owner will see your interest.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm('Block this user?')) return;

    setLoading(true);
    try {
      const result = await blockUserAction(listing.ownerId);
      if (result.error) {
        console.error(result.error);
        alert(result.error);
      } else {
        alert('User blocked. You won\'t see their listings again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    const reason = window.prompt(
      'Why are you reporting this listing?\n(spam/abuse/inappropriate/other)'
    );
    if (!reason) return;

    setLoading(true);
    try {
      const result = await reportUserAction(
        listing.ownerId,
        reason as any,
        'Reported via listing'
      );
      if (result.error) {
        console.error(result.error);
        alert(result.error);
      } else {
        alert('Report submitted. Thank you for helping keep the community safe.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold text-lg">{listing.title}</h3>
      <p className="text-gray-600 mb-2">{listing.description}</p>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm">
            <strong>Owner:</strong> {listing.ownerName}
          </p>
          <p className="text-sm">
            <strong>Level:</strong> {listing.divingLevel}
          </p>
          <p className="text-sm">
            <strong>Location:</strong> {listing.location}
          </p>
          <p className="text-sm">
            <strong>Date:</strong> {listing.diveDate}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExpressInterest}
            disabled={loading || !isAuthenticated}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Express Interest'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="bg-gray-300 text-gray-800 px-3 py-2 rounded hover:bg-gray-400"
            >
              ⋮
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-10">
                <button
                  onClick={() => {
                    handleBlock();
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 border-b"
                >
                  Block User
                </button>
                <button
                  onClick={() => {
                    handleReport();
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Report Listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Client Component Example: Contact Reveal

```typescript
// src/components/ContactRevealButton.tsx
'use client';

import { useState } from 'react';
import {
  initiateContactRevealAction,
  getRevealedContactAction,
} from '@/app/actions/contact-reveal';

interface ContactRevealButtonProps {
  listingId: string;
  userId: string;
  userName: string;
}

export function ContactRevealButton({
  listingId,
  userId,
  userName,
}: ContactRevealButtonProps) {
  const [revealed, setRevealed] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    email?: string;
    phone?: string;
    profilePictureUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    setLoading(true);
    try {
      const result = await initiateContactRevealAction(listingId);
      if (result.error) {
        alert(result.error);
      } else {
        // Try to fetch contact info
        const contactResult = await getRevealedContactAction(userId, listingId);
        if (contactResult.contact) {
          setContactInfo(contactResult.contact);
          setRevealed(true);
        } else {
          alert(
            'Contact reveal initiated! ' +
            `${userName} will see your request and can choose to share their contact information.`
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (revealed && contactInfo) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <h4 className="font-bold mb-2">Contact Information for {userName}</h4>
        {contactInfo.email && (
          <p className="text-sm">
            <strong>Email:</strong> {contactInfo.email}
          </p>
        )}
        {contactInfo.phone && (
          <p className="text-sm">
            <strong>Phone:</strong> {contactInfo.phone}
          </p>
        )}
        {contactInfo.profilePictureUrl && (
          <img
            src={contactInfo.profilePictureUrl}
            alt={userName}
            className="w-16 h-16 rounded-full mt-2"
          />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleReveal}
      disabled={loading}
      className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Reveal Your Contact Info'}
    </button>
  );
}
```

---

## 10. Audit Logging Flow

Every sensitive action is logged:

```typescript
// Automatically tracked in audit_log:
- contact_revealed: When User A and B exchange contact info
- contact_requested: When User B requests contact reveal
- user_blocked: When User A blocks User B
- user_reported: When User A reports User B for abuse
- listing_created: When User A creates a listing
- listing_deleted: When User A deletes their listing
- interest_expressed: When User B expresses interest
```

Access the audit log for compliance:
```sql
SELECT * FROM audit_log
WHERE action = 'contact_revealed'
ORDER BY created_at DESC;
```

---

## 11. Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Contact info fields hidden by default
- [ ] Mutual reveal required for contact visibility
- [ ] Blocking prevents listing visibility
- [ ] All actions logged for audit
- [ ] No contact info in logs
- [ ] Input validation on all forms
- [ ] HTTPS only in production
- [ ] Rate limiting on sensitive endpoints
- [ ] Email verification required for registration

---

## 12. Testing

```bash
# Test anonymous access (should see public listings only)
# Test registered user (should express interest, request contact)
# Test listing owner (should see interests, reveal contact back)
# Test blocking (should remove listings, clear interests)
# Test reporting (should create audit record)
```

---

## Deployment Checklist

Before going to production:

1. Run RLS policies SQL in Supabase
2. Enable email verification in Supabase Auth
3. Set up SMTP for email notifications
4. Configure rate limiting on API
5. Set up backup strategy for audit logs
6. Enable HTTPS
7. Configure CSP headers
8. Test all security scenarios
