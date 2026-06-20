# Dive Drop Buddy Matching System - Database Architecture

## Overview

This document describes the complete database architecture for the Israeli diving buddy matching system. The system enables registered divers to post listings, express interest in other divers' listings, and establish connections with verified buddies.

**Created:** 2026-06-20  
**Version:** 1.0.0

---

## Core Principles

1. **Privacy First**: Contact information is hidden by default and only revealed after explicit authorization
2. **Soft Deletes**: Listings are archived rather than permanently deleted (via status enum)
3. **Automatic Expiry**: Listings automatically transition to "expired" status on the expiry date
4. **Row-Level Security**: RLS policies enforce access control at the database level
5. **Bidirectional Safety**: User IDs in connections are normalized to prevent duplicates

---

## Data Model

### Tables

#### 1. `buddy_listings`
Main table for dive buddy postings.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - Listing owner
- `location` (TEXT) - Dive location
- `latitude` (DECIMAL) - Optional: for map-based queries
- `longitude` (DECIMAL) - Optional: for map-based queries
- `date_from` (TIMESTAMP) - Trip start date
- `date_to` (TIMESTAMP) - Trip end date
- `diving_level` (ENUM: beginner|intermediate|advanced|divemaster)
- `dive_type` (ARRAY[dive_type]) - Types of dives preferred
- `description` (TEXT) - Personal message/bio
- `languages` (TEXT[]) - Languages spoken (e.g., ['Hebrew', 'English'])
- `group_size_min` (INT) - Minimum group size (default: 2)
- `group_size_max` (INT) - Maximum group size (default: 4)
- `status` (ENUM: active|archived|expired)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP) - Auto-calculated, triggers transition to 'expired'

**Key Constraints:**
- `date_from < date_to` - Enforced at DB level
- `group_size_min > 0 AND group_size_max >= group_size_min`

**Indexes:**
- `user_id`, `status`, `created_at DESC`, `expires_at`
- Composite: `(status, expires_at)` WHERE status='active' - For fast active listing queries

---

#### 2. `buddy_interests`
Represents one diver's interest in another's listing. Acts as a match request.

**Columns:**
- `id` (UUID, PK)
- `listing_id` (UUID, FK) - The listing being interested in
- `interested_user_id` (UUID, FK) - User expressing interest
- `message` (TEXT) - Message from interested user to listing owner
- `status` (ENUM: pending|accepted|rejected|cancelled)
- `contact_info_revealed_at` (TIMESTAMP) - When contact info was revealed
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Key Constraints:**
- `UNIQUE(listing_id, interested_user_id)` - One interest per user per listing
- Check: `interested_user_id != listing_owner_id` - Cannot interest own listing

**Indexes:**
- `listing_id`, `interested_user_id`, `status`, `created_at DESC`

**Important:**
- This table does NOT store contact information
- Contact info is hidden from `buddy_listings` until interest is ACCEPTED
- Once accepted, a `buddy_connection` is created

---

#### 3. `buddy_connections`
Approved buddy connections between two divers.

**Columns:**
- `id` (UUID, PK)
- `user_id_1` (UUID, FK) - First user (normalized: always < user_id_2)
- `user_id_2` (UUID, FK) - Second user (normalized: always > user_id_1)
- `meeting_date` (TIMESTAMP) - Optional: planned dive date
- `location` (TEXT) - Meeting location
- `dive_type` (ENUM) - Type of dive planned
- `contact_info_visible` (BOOLEAN) - Both users can see each other's contact info
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Key Constraints:**
- `user_id_1 < user_id_2` - Normalized to prevent duplicates
- `UNIQUE(user_id_1, user_id_2)` - One connection per pair

**Indexes:**
- `user_id_1`, `user_id_2`, `created_at DESC`

---

#### 4. `buddy_messages`
Direct messages between connected buddies.

**Columns:**
- `id` (UUID, PK)
- `sender_id` (UUID, FK)
- `receiver_id` (UUID, FK)
- `connection_id` (UUID, FK to buddy_connections) - Optional: link to connection
- `message` (TEXT) - Message content
- `read_at` (TIMESTAMP) - Null if unread
- `created_at` (TIMESTAMP)

**Indexes:**
- `sender_id`, `receiver_id`, `connection_id`
- `created_at DESC`
- `(read_at) WHERE read_at IS NULL` - Unread messages

---

## Row-Level Security (RLS) Policies

### Overview

All tables have RLS enabled. Policies enforce:
1. Users can only see their own data or data meant for them
2. Listing owners control who sees their listings
3. Contact info is hidden until connections are established

### Detailed Policy Breakdown

#### `buddy_listings` Policies

| Policy | Effect | Condition |
|--------|--------|-----------|
| **View Own** | SELECT | `user_id = auth.uid()` |
| **View Others' Active** | SELECT | `status = 'active'` AND `expires_at > NOW()` AND `user_id != auth.uid()` AND `auth.uid() IS NOT NULL` |
| **Create** | INSERT | `user_id = auth.uid()` |
| **Update Own** | UPDATE | `user_id = auth.uid()` |
| **Archive Own** | DELETE | `user_id = auth.uid()` |

**Contact Info Visibility:**
- Owner sees their own full listing
- Others see only: location, dates, diving_level, dive_type, description, languages
- Contact info (email, phone) is NOT stored in listings table
- Revealed only via `buddy_interests.contact_info_revealed_at` and `buddy_connections`

---

#### `buddy_interests` Policies

| Policy | Effect | Condition |
|--------|--------|-----------|
| **Owner Views Interests** | SELECT | `listing_id IN (SELECT id FROM buddy_listings WHERE user_id = auth.uid())` |
| **View Own Interests** | SELECT | `interested_user_id = auth.uid()` |
| **Create Interest** | INSERT | `interested_user_id = auth.uid()` |
| **Update Own Interest** | UPDATE | `interested_user_id = auth.uid()` |
| **Owner Updates Status** | UPDATE | Listing owner can accept/reject via `buddy_interests.status` |
| **Delete Own Interest** | DELETE | `interested_user_id = auth.uid()` |

---

#### `buddy_connections` Policies

| Policy | Effect | Condition |
|--------|--------|-----------|
| **View Connection** | SELECT | `user_id_1 = auth.uid() OR user_id_2 = auth.uid()` |
| **Create** | INSERT | System only (via `accept_buddy_interest` stored procedure) |
| **Update** | UPDATE | Either user in the connection |
| **Delete** | DELETE | Either user in the connection |

---

#### `buddy_messages` Policies

| Policy | Effect | Condition |
|--------|--------|-----------|
| **View Sent** | SELECT | `sender_id = auth.uid()` |
| **View Received** | SELECT | `receiver_id = auth.uid()` |
| **Send Message** | INSERT | `sender_id = auth.uid()` AND connection exists between sender and receiver |
| **Update Own** | UPDATE | `sender_id = auth.uid()` |
| **Mark as Read** | UPDATE | `receiver_id = auth.uid()` (only `read_at` field) |
| **Delete** | DELETE | `sender_id = auth.uid() OR receiver_id = auth.uid()` |

---

## Automatic Behaviors

### Triggers

#### 1. Auto-Expire Listings
**Function:** `auto_expire_listings()`

Automatically transitions listings from 'active' to 'expired' when `expires_at < NOW()`.

**Timing:** Runs BEFORE INSERT or UPDATE

```sql
IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
  NEW.status = 'expired';
END IF;
```

---

#### 2. Timestamp Updates
**Function:** `update_timestamp()`

Automatically updates `updated_at` to `NOW()` on modifications.

**Tables Affected:** buddy_listings, buddy_interests, buddy_connections

---

## Stored Procedures

### 1. `accept_buddy_interest(p_interest_id UUID)`

**Purpose:** Accept a buddy interest and create a connection.

**Behavior:**
1. Validates the interest exists and current user is listing owner
2. Updates `buddy_interests.status = 'accepted'`
3. Sets `buddy_interests.contact_info_revealed_at = NOW()`
4. Creates a `buddy_connection` between the two users
5. User IDs normalized: `LEAST(...) AS user_id_1`, `GREATEST(...) AS user_id_2`

**Returns:**
- `connection_id`
- `listing_id`
- `listing_owner_id`
- `interested_user_id`

**Access:** SECURITY DEFINER (runs with owner permissions)

---

### 2. `reject_buddy_interest(p_interest_id UUID)`

**Purpose:** Reject a buddy interest.

**Behavior:**
1. Updates `buddy_interests.status = 'rejected'`
2. Only listing owner can reject

**Returns:**
- `interest_id`
- `status`

---

### 3. `get_buddy_profile(p_user_id UUID)`

**Purpose:** Retrieve a user's buddy profile with conditional contact info.

**Returns:**
```typescript
{
  user_id: UUID
  email?: string        // Null if not connected
  full_name?: string
  avatar_url?: string
  diving_level?: DivingLevel
  bio?: string
  phone?: string        // Null if not connected
  show_contact_info: boolean
}
```

**Contact Info Visibility Rules:**
- Own profile: Always visible
- Connected buddy: Always visible
- Others: Only if `contact_info_visible = TRUE`

---

## User Metadata Storage

User profiles are stored in `auth.users.raw_user_meta_data` as JSON:

```json
{
  "full_name": "רגינה כהן",
  "avatar_url": "https://...",
  "diving_level": "advanced",
  "bio": "אוהבת צלילה טכנית",
  "phone": "+972-50-1234567",
  "languages": ["Hebrew", "English"],
  "diving_experience_years": 5,
  "certifications": ["PADI Open Water", "PADI Advanced"]
}
```

---

## Search & Query Patterns

### Active Listings Query
```sql
SELECT * FROM buddy_listings
WHERE status = 'active'
  AND expires_at > NOW()
  AND user_id != auth.uid()
ORDER BY created_at DESC;
```

Uses index: `(status, expires_at) WHERE status='active'`

---

### User's Pending Interests
```sql
SELECT * FROM buddy_interests
WHERE listing_id IN (SELECT id FROM buddy_listings WHERE user_id = auth.uid())
  AND status = 'pending'
ORDER BY created_at DESC;
```

---

### User's Connected Buddies
```sql
SELECT * FROM buddy_connections
WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
ORDER BY created_at DESC;
```

---

## Security Considerations

### 1. Contact Information Protection
- **Never** stored in `buddy_listings`
- Stored in `auth.users.raw_user_meta_data` (encrypted by Supabase)
- Revealed only via:
  - `buddy_interests.contact_info_revealed_at` (timestamp proof)
  - `get_buddy_profile()` function (with authorization checks)
  - `buddy_connections` (mutual access)

### 2. Self-Interest Prevention
```sql
CONSTRAINT cannot_interest_own_listing CHECK (
  interested_user_id != (SELECT user_id FROM buddy_listings WHERE id = listing_id)
)
```

### 3. Duplicate Connection Prevention
```sql
CONSTRAINT unique_connection UNIQUE(user_id_1, user_id_2)
```
User IDs are normalized so only one connection per pair exists.

### 4. Message Authorization
Messages can only be sent between connected buddies:
```sql
AND EXISTS (
  SELECT 1 FROM buddy_connections
  WHERE (user_id_1 = auth.uid() AND user_id_2 = receiver_id)
     OR (user_id_2 = auth.uid() AND user_id_1 = receiver_id)
)
```

---

## Multilingual Support

### Hebrew & English Labels
Stored in application layer (not database):

```typescript
const HEBREW_LABELS = {
  'beginner': 'מתחיל',
  'intermediate': 'ביניים',
  'advanced': 'מתקדם',
  'reef': 'אלמוגים',
  'boat': 'סירה',
  // ... etc
}
```

### Database Storage
- Location names: Stored as-is (e.g., "אילת", "Eilat")
- Descriptions: User-provided (Hebrew/English)
- Enum values: Always English (reef, boat, etc.)

---

## Performance Optimization

### Indexes Created

1. **buddy_listings**
   - Single: `user_id`, `status`, `created_at`, `expires_at`, `location`, `diving_level`
   - Composite: `(status, expires_at)` WHERE status='active' (for fast active query)
   - Range: `(date_from, date_to)` (for date filtering)

2. **buddy_interests**
   - Single: `listing_id`, `interested_user_id`, `status`, `created_at`

3. **buddy_connections**
   - Single: `user_id_1`, `user_id_2`, `created_at`

4. **buddy_messages**
   - Single: `sender_id`, `receiver_id`, `connection_id`, `created_at`
   - Partial: `(read_at)` WHERE read_at IS NULL (unread messages)

---

## Soft Deletes Strategy

Instead of hard deletes, listings are archived:

```sql
-- Archive a listing
UPDATE buddy_listings
SET status = 'archived'
WHERE id = $1 AND user_id = auth.uid();

-- Query excludes archived by default
SELECT * FROM buddy_listings
WHERE status = 'active' AND expires_at > NOW();
```

**Benefits:**
- Preserves data for audits
- Prevents accidental data loss
- Allows temporary hiding and restoration

---

## Data Retention Policy

- **Active listings**: Visible until manual archive or expiry
- **Archived listings**: Soft-deleted, kept in DB for audit
- **Expired listings**: Auto-archived, kept in DB
- **Messages**: Retained indefinitely
- **Connections**: Retained indefinitely
- **Interests**: Retained for audit (status shows outcome)

---

## Migrations & Versioning

**Current Version:** 001_buddy_matching_schema.sql

To apply migrations:

```bash
supabase db push
# or
supabase migration up
```

---

## Next Steps / Future Enhancements

1. **Reviews & Ratings**: Post-dive feedback system
2. **Blocked Users**: Prevention of unwanted contacts
3. **Chat Moderation**: Spam/harassment reporting
4. **Verification**: ID verification for trust
5. **Payment**: Premium features (verified badges, listings)
6. **Analytics**: User activity, popular dive sites
7. **Notifications**: Real-time alerts for matches
8. **Geospatial**: Radius-based searches using PostGIS

---

## Troubleshooting

### Issue: User cannot see listings
**Check:**
- Is user authenticated? (`auth.uid()` must exist)
- Are listings active and not expired? (`status = 'active'` AND `expires_at > NOW()`)
- Is user trying to view own listings? (Own always visible)

### Issue: Contact info is not visible
**Check:**
- Is there an accepted interest or connection?
- Has `accept_buddy_interest()` been called?
- Is the requesting user in the connection?

### Issue: Cannot create interest
**Check:**
- Is listing owner different from interested user?
- Is listing still active?
- Has user already expressed interest? (UNIQUE constraint)

---

## Support

For questions or issues, contact the development team.
