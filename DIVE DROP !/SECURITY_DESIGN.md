# Security & Permissions Design: Find a Buddy (מצא באדי)

**Document Status:** Complete Design Specification  
**Last Updated:** 2026-06-20  
**Security Specialist:** Claude Code  

---

## Executive Summary

This document specifies a complete authentication and permissions system for "Find a Buddy," a peer-to-peer dive buddy matching platform. The system enforces privacy-first design: contact information is hidden by default, revealed only after mutual consent, and all actions are audited for compliance.

**Key Principles:**
- **Privacy First:** Contact info hidden by default
- **Trust But Verify:** Mutual consent required for contact exchange
- **Transparent:** All sensitive actions logged
- **Secure:** Database-level access control via RLS
- **User Control:** Block, report, delete anytime

---

## Part 1: Permission Matrix

### 1.1 User Roles

```
ANONYMOUS    → Not logged in, read-only access to public listings
REGISTERED   → Email verified, can create listings and express interest
LISTING_OWNER→ Implicit role, can manage own listings and see interest requests
```

### 1.2 Permission Matrix

| **Action** | **Anonymous** | **Registered** | **Listing Owner** |
|:-----------|:-------------:|:--------------:|:-----------------:|
| **View Listing (title, desc, level, location)** | ✅ | ✅ | ✅ |
| **Create Listing** | ❌ | ✅ | ✅ |
| **Update Own Listing** | ❌ | ❌ | ✅ |
| **Delete Own Listing** | ❌ | ❌ | ✅ |
| **Express Interest** | ❌ | ✅ | ✅ |
| **View Interest Requests** | ❌ | ❌ | ✅ |
| **Request Contact Reveal** | ❌ | ✅ | ✅ |
| **Accept Contact Reveal** | ❌ | ❌ | ✅ |
| **View Contact Info (email, phone, pic)** | ❌ | ❌ | ✅ (if mutual) |
| **Block User** | ❌ | ✅ | ✅ |
| **Report User** | ❌ | ✅ | ✅ |
| **View Own Profile** | ❌ | ✅ | ✅ |
| **View Other Profile (public)** | ❌ | ✅ | ✅ |

### 1.3 Field-Level Visibility

```
PUBLIC ALWAYS:
├─ listing.id
├─ listing.title
├─ listing.description
├─ listing.divingLevel
├─ listing.location
├─ listing.diveDate
├─ listing.ownerName (first name only)
└─ listing.createdAt

AUTHENTICATED ONLY:
├─ listing.maxBuddies
├─ listing.imageUrl
└─ owner.bio (public profile info)

OWNER ONLY:
├─ listing.interestedUsers (who's interested)
├─ listing.revealRequests (contact reveal requests)
└─ user.blockedUsers (your block list)

MUTUAL REVEAL ONLY:
├─ user.email
├─ user.phone
├─ user.profilePicture
└─ user.location (full address if provided)
```

---

## Part 2: Contact Reveal Workflow

### 2.1 The 4-Step Flow

```
STEP 1: User B Expresses Interest
├─ User B sees User A's listing
└─ User B clicks "Express Interest"
   └─ Interest record created
   └─ User A sees "Someone is interested" (no name yet)

STEP 2: User B Requests Contact Reveal
├─ User B clicks "Reveal My Contact"
├─ Message: "User X (profile pic) wants to connect"
└─ Contact reveal record created
   ├─ initiator_contact_revealed = true (User B)
   └─ recipient_contact_revealed = false (User A)

STEP 3: User A Sees Request & Accepts
├─ User A sees the reveal request with User B's info:
│  ├─ First name
│  ├─ Photo
│  └─ "wants to connect"
├─ User A clicks "Accept" → reveals own contact back
└─ Contact reveal record updated
   └─ recipient_contact_revealed = true (User A)
   └─ mutual_revealed_at = NOW()

STEP 4: Mutual Visibility
├─ User A can now see User B's:
│  ├─ Email
│  ├─ Phone
│  └─ Profile picture
└─ User B can now see User A's:
   ├─ Email
   ├─ Phone
   └─ Profile picture
```

### 2.2 Why This Design?

**User A (Listing Owner) is Protected:**
- Doesn't know who's interested until they express interest
- Can decide whether to reveal their contact
- Can decline without explanation
- Can block after seeing interest

**User B (Interested) is Protected:**
- Reveals contact voluntarily
- User A can see their info ONLY if they accept
- Can be blocked after revealing (their info isn't shown)

**Both Are Protected:**
- All contact reveals are logged
- Either party can block the other anytime
- Either party can report abuse

---

## Part 3: Blocking & Privacy Controls

### 3.1 What Does Blocking Do?

When **User A blocks User B:**

```
User B can no longer:
├─ See User A's active listings
├─ Express interest in User A's listings
├─ Send contact reveal requests
└─ View User A's profile

System automatically:
├─ Removes User B's interests from User A's listings
├─ Deletes any pending contact reveals
└─ Prevents future interactions
```

### 3.2 Blocking is Asymmetric

```
User A blocks User B
├─ User B can STILL see User A's profile (User A blocked them, not vice versa)
├─ User B can STILL express interest (but it won't go through)
└─ User B won't get a "you're blocked" message (privacy)

If User B tries to interact:
└─ System silently fails (no notification that they're blocked)
```

---

## Part 4: Reporting & Moderation

### 4.1 Report Types

```
SPAM
├─ Repetitive unwanted messages
└─ Suspicious patterns

ABUSE
├─ Harassment
├─ Threats
└─ Discrimination

INAPPROPRIATE
├─ Sexual content
├─ Scam/fraud
└─ Misleading info

OTHER
└─ (Reporter provides detail)
```

### 4.2 Report Action

When **User A reports User B:**

```
1. Report is submitted with reason + optional description
2. Audit log records:
   ├─ Reporter ID
   ├─ Reported user ID
   ├─ Reason
   ├─ Timestamp
   └─ Description
3. User is blocked from viewing reporter's listings (auto-block)
4. Report marked as "open" for moderation
5. Moderator reviews report:
   ├─ Can dismiss (no action)
   ├─ Can investigate (change status)
   └─ Can resolve (take action)
```

---

## Part 5: Database Schema & RLS

### 5.1 Tables & RLS Policies

**USERS TABLE**
```sql
id                  (UUID, PK)
email               (unique, RLS: owner only)
first_name          (public)
last_name           (public)
phone               (RLS: owner + mutual reveal)
profile_picture_url (RLS: owner + mutual reveal)
bio                 (public)
location            (RLS: full address for owner + mutual reveal)
blocked_users       (UUID[], RLS: owner only)
created_at          (timestamp)
```

**RLS Rules:**
- Owner can read entire profile
- Registered users can read public fields only
- Blocked users can't read any fields
- Contact fields visible only after mutual reveal

---

**LISTINGS TABLE**
```sql
id              (UUID, PK)
owner_id        (UUID, FK to users)
title           (text, public)
description     (text, public)
diving_level    (enum, public)
location        (text, public)
dive_date       (timestamp, public)
max_buddies     (int, auth only)
image_url       (text, auth only)
is_active       (boolean)
created_at      (timestamp)
updated_at      (timestamp)
```

**RLS Rules:**
- Anyone can read active listings
- Only owner can update/delete
- Blocked users can't read owner's listings
- Owner can see all interests

---

**INTERESTS TABLE**
```sql
id                  (UUID, PK)
listing_id          (UUID, FK)
interested_user_id  (UUID, FK)
listing_owner_id    (UUID, FK)
created_at          (timestamp)
UNIQUE(listing_id, interested_user_id)
```

**RLS Rules:**
- Interested user can read own interests
- Owner can read all interests in own listings
- Can only insert if authenticated and not owner

---

**CONTACT_REVEALS TABLE**
```sql
id                          (UUID, PK)
listing_id                  (UUID, FK)
initiator_id                (UUID, FK) -- User B requesting
recipient_id                (UUID, FK) -- User A (owner)
initiator_contact_revealed  (boolean)   -- User B revealed?
recipient_contact_revealed  (boolean)   -- User A revealed?
mutual_revealed_at          (timestamp) -- When both revealed
created_at                  (timestamp)
updated_at                  (timestamp)
UNIQUE(listing_id, initiator_id, recipient_id)
```

**RLS Rules:**
- Both parties can read their own reveals
- Can only update if you're involved
- Can only delete own reveal requests

---

**BLOCKS TABLE**
```sql
id              (UUID, PK)
blocker_id      (UUID, FK)
blocked_user_id (UUID, FK)
reason          (text, nullable)
created_at      (timestamp)
UNIQUE(blocker_id, blocked_user_id)
```

**RLS Rules:**
- Blocker can read own blocks
- Can only create/delete own blocks

---

**REPORTS TABLE**
```sql
id                  (UUID, PK)
reporter_id         (UUID, FK)
reported_user_id    (UUID, FK, nullable)
reported_listing_id (UUID, FK, nullable)
reason              (enum: spam|abuse|inappropriate|other)
description         (text, nullable)
status              (enum: open|investigating|resolved|dismissed)
created_at          (timestamp)
updated_at          (timestamp)
```

**RLS Rules:**
- Reporters can read own reports
- Only system can insert/update (admin only in practice)

---

**AUDIT_LOG TABLE**
```sql
id              (UUID, PK)
actor_id        (UUID, FK)
action          (enum: contact_revealed|user_blocked|user_reported|...)
resource_type   (enum: user|listing|contact)
resource_id     (UUID)
target_user_id  (UUID, nullable)
details         (JSONB)
ip_address      (INET)
user_agent      (text)
created_at      (timestamp)
```

**RLS Rules:**
- Involved users can read their own records
- Only system can insert
- Immutable after creation

---

### 5.2 Helper Functions

```sql
has_mutual_reveal(user_a_id, user_b_id, listing_id)
├─ Returns: true if both users have revealed contact
└─ Used by: get_visible_contact_info()

is_user_blocked(blocker_id, blocked_user_id)
├─ Returns: true if user is blocked
└─ Used by: RLS policies on listings and interests

get_visible_contact_info(user_id, viewer_id, listing_id)
├─ Returns: { email, phone, profile_picture } if mutual reveal
├─ Returns: { null, null, null } if no reveal
└─ Used by: Application queries
```

---

## Part 6: Server-Side Authorization

### 6.1 Permission Check Flow

```typescript
async function someAction(context: AuthContext, resourceId: string) {
  // Step 1: Get auth context
  const context = await getAuthContext();
  
  // Step 2: Check permission
  authorize(context, ResourceAction.SOME_ACTION);
  
  // Step 3: Require authentication
  const user = requireAuth(context);
  
  // Step 4: Check resource ownership
  requireOwnership(user.id, resourceOwnerId);
  
  // Step 5: Perform action
  // ... database operation ...
  
  // Step 6: Audit log
  await auditAction(...);
}
```

### 6.2 Error Classes

```typescript
AuthenticationError   // User not logged in
UnauthorizedError     // User lacks permission
ForbiddenError        // Can't perform on this resource
```

---

## Part 7: Implementation Checklist

### Phase 1: Database Setup
- [ ] Create all tables with RLS enabled
- [ ] Create all RLS policies
- [ ] Create helper functions
- [ ] Create indexes for performance
- [ ] Test RLS policies

### Phase 2: Application Layer
- [ ] Implement permission types (TypeScript)
- [ ] Implement permission checks
- [ ] Implement auth middleware
- [ ] Implement contact reveal service
- [ ] Implement blocking service
- [ ] Implement report service

### Phase 3: Server Actions
- [ ] Create listing action
- [ ] Express interest action
- [ ] Request contact reveal action
- [ ] Accept contact reveal action
- [ ] Block user action
- [ ] Report user action

### Phase 4: Client Components
- [ ] Listing card with actions
- [ ] Interest counter
- [ ] Contact reveal button
- [ ] Block/report menu
- [ ] Blocked users list

### Phase 5: Testing
- [ ] Anonymous user access tests
- [ ] Registered user tests
- [ ] Listing owner tests
- [ ] Blocking tests
- [ ] Contact reveal tests
- [ ] Reporting tests
- [ ] RLS policy tests

### Phase 6: Deployment
- [ ] Enable email verification
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerting
- [ ] Document audit log access
- [ ] Brief moderation team

---

## Part 8: Security Best Practices

### 8.1 Input Validation

```typescript
// All user inputs must be validated
const schema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\d{10,}$/),
  reason: z.enum(['spam', 'abuse', 'inappropriate', 'other']),
});
```

### 8.2 Rate Limiting

Implement rate limits on:
- Registration (1 per IP per hour)
- Login attempts (5 per email per 15 min)
- Report submissions (1 per user per 24 hours)
- Block actions (10 per user per day)

### 8.3 HTTPS Only

- Force HTTPS in production
- Use secure cookies (HttpOnly, SameSite=Strict)
- Enable HSTS headers

### 8.4 SQL Injection Prevention

- Use parameterized queries (Supabase JS client does this)
- Never concatenate user input into SQL
- Use TypeScript for type safety

### 8.5 CSRF Protection

- Use CSRF tokens for state-changing actions
- Verify origin header
- Use SameSite cookies

---

## Part 9: Compliance & Audit

### 9.1 What Gets Logged

Every sensitive action is logged in `audit_log`:

```
✅ Contact info revealed      (who, when, with whom)
✅ User blocked              (who blocked, when)
✅ Listing created/deleted   (who, when, which listing)
✅ Report submitted          (who reported, why)
✅ Interest expressed        (who, when, which listing)
```

### 9.2 Audit Trail Query

```sql
-- Get all contact reveals for compliance officer
SELECT 
  actor_id,
  target_user_id,
  action,
  details->>'listing_id' as listing_id,
  created_at
FROM audit_log
WHERE action = 'contact_revealed'
ORDER BY created_at DESC;

-- Get reports by status
SELECT 
  id,
  reporter_id,
  reported_user_id,
  reason,
  status,
  created_at
FROM reports
WHERE status = 'open'
ORDER BY created_at DESC;
```

### 9.3 Data Retention

```
LIVE DATA:
├─ Users:        Until account deleted or inactive for 2 years
├─ Listings:     Until deleted by owner
├─ Interests:    Until listing deleted or user blocks
└─ Contact reveals: Until listing deleted

AUDIT LOGS:
├─ Keep for:     7 years (legal requirement)
├─ Immutable:    Cannot be modified or deleted
├─ Encrypted:    At rest (Supabase handles)
└─ Access:       Audit log only for compliance

DELETED DATA:
├─ Soft delete: Account data anonymized not hard-deleted
├─ Listings:    Hard delete (no recovery)
└─ Personal info: Hard delete after 30 days
```

---

## Part 10: Error Handling

### 10.1 User-Facing Errors

```typescript
// ✅ Good: Helpful, safe
"This email is already registered"
"You must express interest before requesting contact"
"User not found"

// ❌ Bad: Leaks info
"User ID 123e4567 not found"
"Database error: UNIQUE constraint violation on users(email)"
"RLS policy denied access"
```

### 10.2 Security Error Messages

```typescript
// Never reveal:
- Database structure
- Auth token details
- RLS policy logic
- User existence (when appropriate)
- Password hints

// Always be vague about access:
"You don't have permission to view this"
NOT "You are not the listing owner"
```

---

## Part 11: Future Enhancements

### 11.1 Phase 2 Features

- [ ] Notifications (in-app, email, push)
- [ ] Messaging between matched buddies
- [ ] Photo uploads (virus scanning)
- [ ] Profile verification (ID check)
- [ ] Trust badges (verified email, ID, background check)
- [ ] Reputation scoring
- [ ] Advanced blocking (report reasons trigger auto-block)

### 11.2 Compliance Additions

- [ ] GDPR data export feature
- [ ] Right to be forgotten (data deletion)
- [ ] Privacy policy acceptance tracking
- [ ] Terms of service acceptance tracking
- [ ] CCPA compliance (California residents)
- [ ] SOC 2 audit trail certification

---

## Part 12: Support & Escalation

### 12.1 User Support

**Common Issues:**

```
"I can't see someone's contact info"
→ Check: Has contact reveal been accepted?
→ Check: Are they not blocked?
→ Check: Did they accept your reveal request?

"Someone keeps messaging me"
→ Action: Block the user
→ Action: Report them for harassment
→ Action: Delete the listing

"I revealed my contact but now regret it"
→ Explain: Contact reveal is permanent once mutual
→ Solution: Block the user to prevent further contact
```

### 12.2 Abuse Escalation

```
Report submitted with "abuse" reason
├─ Tier 1 (Auto):    System blocks reporter from viewing reported user's listings
├─ Tier 2 (Staff):   Manual review of report + context
├─ Tier 3 (Escalate): Legal team review if criminal activity suspected
└─ Tier 4 (Law):     Report to law enforcement with evidence
```

---

## Part 13: Files Created

All files are in `src/lib/security/`:

```
src/lib/security/
├─ permissions.ts              (Permission types & matrix)
├─ auth-middleware.ts          (Authorization checks)
├─ contact-reveal-service.ts   (Mutual reveal workflow)
├─ blocking-service.ts         (User blocking)
├─ report-service.ts           (Abuse reporting)
├─ rls-policies.sql            (Database RLS + functions)
├─ IMPLEMENTATION.md           (Step-by-step guide)
└─ SECURITY_DESIGN.md          (This file)
```

---

## Part 14: Quick Reference

### Permission Check
```typescript
const context = await getAuthContext();
authorize(context, ResourceAction.CREATE_LISTING);
```

### Check Ownership
```typescript
requireOwnership(userId, resourceOwnerId);
```

### Block a User
```typescript
const block = await blockUser(context, userToBlockId, "spam");
```

### Reveal Contact
```typescript
const reveal = await initiateContactReveal(context, listingId);
const accepted = await acceptContactReveal(context, revealId);
```

### Get Contact Info (if mutual reveal)
```typescript
const info = await getRevealedContactInfo(context, otherUserId, listingId);
// Returns: { email, phone, profilePictureUrl } or null
```

### Report Abuse
```typescript
const report = await reportUser(context, userId, "harassment", "Sent threatening messages");
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **RLS** | Row Level Security - database-level access control |
| **Mutual Reveal** | Both users have confirmed they want to share contact info |
| **Listing Owner** | User who created the dive buddy listing |
| **Interested User** | User who clicked "Express Interest" on a listing |
| **Initiator** | User B requesting contact reveal |
| **Recipient** | User A (listing owner) receiving the reveal request |
| **Audit Log** | Immutable record of all sensitive actions |
| **Blocking** | User A prevents User B from seeing their listings |
| **Reporting** | User A reports User B for abuse/spam to moderators |

---

## Conclusion

This security architecture implements a **privacy-first, user-controlled** system where:

1. Contact information is protected by default
2. Users have full control over their data
3. Mutual consent is required for contact exchange
4. All actions are logged for compliance
5. Users can block, report, and delete anytime

The system is enforced at **three layers**:
- **Database:** RLS policies prevent unauthorized access
- **Application:** TypeScript type checks and permission checks
- **API:** Server actions validate all operations

**Principle:** Trust the database first, not the client.

---

**Document Complete** | Security Specialist Review Ready | Deployment-Ready Specification
