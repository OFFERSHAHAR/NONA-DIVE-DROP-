# Dive Drop - Supabase Buddy Matching System

## Quick Start

This directory contains the complete Supabase database schema and documentation for the Israeli diving buddy matching system.

**Status**: Production-ready  
**Last Updated**: 2026-06-20  
**Schema Version**: 1.0.0

---

## Files Overview

### Core Implementation

| File | Purpose |
|------|---------|
| `migrations/001_buddy_matching_schema.sql` | Complete SQL schema with tables, indexes, RLS policies, triggers, and stored procedures |
| `ARCHITECTURE.md` | Detailed architecture guide covering data model, RLS policies, and security |
| `RELATIONSHIPS_AND_RLS.md` | ERD diagrams and comprehensive RLS policy documentation |
| `SETUP_AND_DEPLOYMENT.md` | Local development and production deployment guide |

### Application Layer

| File | Purpose |
|------|---------|
| `../src/types/buddy-matching.ts` | TypeScript types for all database models and API contracts |
| `../src/lib/supabase-buddy-client.ts` | Type-safe client wrapper for all buddy matching operations |

---

## Architecture Overview

### Tables

```
auth.users
    ├─ (1:N) buddy_listings
    │   └─ (1:N) buddy_interests
    └─ (N:N) buddy_connections (normalized: user_id_1, user_id_2)
        └─ (1:N) buddy_messages
```

### Data Flow

**User Journey: Discover → Interest → Connect → Message**

1. **Browse** - User sees active listings from other registered divers
2. **Interest** - User expresses interest with optional message
3. **Accept** - Listing owner accepts interest → Connection created
4. **Contact** - Both users can now see contact info & send messages
5. **Coordinate** - Message back and forth to plan the dive

### Key Security Features

- **Privacy First**: Contact info hidden until connection established
- **RLS Policies**: Row-level security enforces authorization at DB level
- **Soft Deletes**: Listings archived instead of deleted
- **Automatic Expiry**: Listings auto-transition to 'expired' on due date
- **Bidirectional Safety**: Connection user IDs normalized to prevent duplicates

---

## Database Schema

### buddy_listings
Dive buddy postings with location, dates, experience level, and dive preferences.

**Key Fields**: user_id, location, date_from, date_to, diving_level, dive_type[], description, status

### buddy_interests
Match requests from one diver to another's listing.

**Key Fields**: listing_id, interested_user_id, message, status (pending/accepted/rejected)

### buddy_connections
Approved connections between two divers (after interest accepted).

**Key Fields**: user_id_1, user_id_2, meeting_date, location, dive_type

### buddy_messages
Direct messages between connected buddies.

**Key Fields**: sender_id, receiver_id, message, read_at

---

## Row-Level Security (RLS)

All tables have RLS enabled with the following policies:

### buddy_listings
- **View Own**: Listing owner sees their own listings
- **View Others' Active**: Authenticated users see active, non-expired listings from others
- **Create**: Users can create listings for themselves
- **Update/Delete**: Users can only modify/delete own listings

### buddy_interests
- **View**: Listing owner sees interests on their listings; users see own interests
- **Create**: Users can express interest in other listings
- **Update**: Listing owner can accept/reject; interested user can modify
- **Delete**: Interested user can withdraw interest

### buddy_connections
- **View**: Both users in connection can see it
- **Create**: System only (via stored procedure)
- **Update/Delete**: Both users can modify/end connection

### buddy_messages
- **View**: Users see sent and received messages
- **Send**: Only to connected buddies
- **Mark Read**: Receiver can mark as read
- **Delete**: Either party can delete

---

## Contact Information Protection

Contact info (email, phone, full name) is:
- **NOT** stored in buddy_listings table
- **Stored** in auth.users.raw_user_meta_data (encrypted)
- **Revealed** only after connection established via get_buddy_profile() function
- **Tracked** via buddy_interests.contact_info_revealed_at timestamp

---

## Usage

### TypeScript Integration

```typescript
import { BuddyClient } from '@/lib/supabase-buddy-client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, anonKey);
const buddyClient = new BuddyClient(supabase);

// Browse active listings
const listings = await buddyClient.getBrowsableListings({
  location: 'אילת',
  diving_level: 'advanced',
});

// Express interest
const interest = await buddyClient.expressInterest({
  listing_id: 'uuid',
  message: 'I\'d love to dive with you!',
});

// Accept interest (as listing owner)
const connection = await buddyClient.acceptInterest(interest.id);

// Send message
const message = await buddyClient.sendMessage({
  receiver_id: 'uuid',
  message: 'When should we meet?',
});
```

---

## Indexes

Strategic indexes optimize queries:

| Table | Index | Purpose |
|-------|-------|---------|
| buddy_listings | (status, expires_at) | Fast active listing queries |
| buddy_listings | user_id, created_at, location | Owner listings & discovery |
| buddy_interests | listing_id, interested_user_id | Interest lookup |
| buddy_messages | sender_id, receiver_id, read_at | Message queries |

---

## Triggers & Automation

### Auto-Expire Listings
Listings automatically transition to 'expired' status when expires_at < NOW()

### Timestamp Updates
updated_at is automatically set to NOW() on modifications

---

## Stored Procedures

### accept_buddy_interest(interest_id)
Accepts interest, reveals contact info, and creates buddy_connection.

```typescript
const result = await buddyClient.acceptInterest(interestId);
// Returns: { connection_id, listing_id, listing_owner_id, interested_user_id }
```

### reject_buddy_interest(interest_id)
Rejects interest request.

### get_buddy_profile(user_id)
Returns user profile with conditional contact info visibility.

---

## Hebrew & English Support

- Enum values stored in English (beginner, reef, boat, etc.)
- User content in Hebrew/English as provided
- UI labels translated in application layer
- Location names stored as provided

---

## Performance Characteristics

| Operation | Complexity | Indexed |
|-----------|-----------|---------|
| Browse active listings | O(1) | Yes - (status, expires_at) |
| Get own listings | O(1) | Yes - user_id |
| Get interests on listings | O(log n) | Yes - listing_id |
| Send message | O(log n) | Check connection exists |
| Get conversation | O(log n) | Yes - connection_id |

---

## Deployment Checklist

- [ ] Run migration: `supabase migration push`
- [ ] Verify RLS policies enabled
- [ ] Configure auth providers
- [ ] Set up email templates
- [ ] Create database backups
- [ ] Load test with real data
- [ ] Configure monitoring/alerts
- [ ] Document team access & responsibilities
- [ ] Set up disaster recovery procedure
- [ ] Enable audit logging

---

## Testing

### RLS Policy Testing
```bash
# Local development
supabase start
supabase db push
# Run tests in tests/rls.test.ts
```

### Integration Testing
```bash
npm test -- buddy-client.integration.test.ts
```

### Load Testing
```bash
k6 run tests/load-test.js
```

---

## Security Checklist

- [ ] RLS enabled and verified on all tables
- [ ] Contact info properly hidden from non-connected users
- [ ] Foreign key constraints prevent orphaned records
- [ ] Service role key secured (never in client code)
- [ ] Auth tokens validated server-side
- [ ] Database backups automated
- [ ] HTTPS enforced (Supabase default)
- [ ] Rate limiting configured
- [ ] Audit logging enabled

---

## Troubleshooting

**User can't see listings**
- Check if user is authenticated (RLS requires auth.uid())
- Verify listing status='active' and expires_at > NOW()

**Contact info not visible**
- Confirm buddy_connection exists between users
- Check get_buddy_profile() authorization logic

**Cannot express interest**
- Verify listing still exists and is not expired
- Check UNIQUE constraint (already interested?)
- Ensure not trying to interest own listing

**Messages not sending**
- Verify buddy_connection exists
- Check both users are in the connection
- Ensure sender_id matches authenticated user

---

## Architecture Decision Records (ADR)

### ADR-001: Soft Deletes for Listings
**Decision**: Use status enum (active/archived/expired) instead of hard delete

**Rationale**: 
- Preserve data for audits and analytics
- Allow restoration of accidentally archived listings
- Support historical queries
- Comply with privacy regulations

### ADR-002: Contact Info Not in Listings
**Decision**: Store contact info in auth.users.raw_user_meta_data, not buddy_listings

**Rationale**:
- Leverage built-in auth encryption
- Prevent accidental exposure in listings queries
- Enable selective visibility via get_buddy_profile()
- Simplify RLS policies

### ADR-003: Normalized User IDs in Connections
**Decision**: Always store user_id_1 < user_id_2 in buddy_connections

**Rationale**:
- Prevent duplicate connections (one connection per pair)
- Simplify queries (no need to check both directions)
- Enable efficient UNIQUE constraint
- Support bidirectional relationship model

---

## Future Enhancements

1. **Reviews & Ratings** - Post-dive feedback system
2. **Blocked Users** - Prevention of unwanted contacts
3. **Verification** - ID verification for trust/badges
4. **Analytics** - Popular dive sites, user activity
5. **Payment** - Premium features (verified badges)
6. **Geospatial** - PostGIS radius-based searches
7. **Chat Moderation** - Spam/harassment reporting
8. **Notifications** - Real-time alerts for matches
9. **Preferences** - Auto-matching based on preferences
10. **Diving Buddy Ratings** - Community trust system

---

## Support & Contact

- **Documentation**: See ARCHITECTURE.md and RELATIONSHIPS_AND_RLS.md
- **Setup Guide**: See SETUP_AND_DEPLOYMENT.md
- **TypeScript Types**: See src/types/buddy-matching.ts
- **Client Library**: See src/lib/supabase-buddy-client.ts

---

## License

Part of the DIVE DROP! project.

---

## Changelog

### v1.0.0 (2026-06-20)
**Initial Release**
- Complete schema design for buddy matching
- RLS policies for privacy & authorization
- TypeScript type definitions
- Type-safe client library
- Comprehensive documentation
- Setup & deployment guide
- Integration test examples
