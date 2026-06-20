# Dive Drop Buddy Matching - Quick Reference

## Tables at a Glance

### buddy_listings
Create a buddy request posting

```sql
INSERT INTO buddy_listings (
  user_id, location, date_from, date_to, 
  diving_level, dive_type, description, expires_at
) VALUES (
  auth.uid(), 'אילת', '2026-07-01', '2026-07-07', 
  'advanced', ARRAY['reef', 'boat'], 'Let\'s dive!', '2026-06-30'
);
```

### buddy_interests
Express interest in someone's listing

```sql
INSERT INTO buddy_interests (listing_id, interested_user_id, message)
VALUES ('listing-uuid', auth.uid(), 'I\'d love to join!');
```

### buddy_connections
Created automatically after interest accepted

```sql
-- View own connections
SELECT * FROM buddy_connections 
WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid();
```

### buddy_messages
Send a message to a connected buddy

```sql
INSERT INTO buddy_messages (sender_id, receiver_id, message)
VALUES (auth.uid(), 'buddy-uuid', 'When should we dive?');
```

---

## Common Queries

### Browse Active Listings
```sql
SELECT * FROM buddy_listings
WHERE status = 'active' 
  AND expires_at > NOW()
  AND user_id != auth.uid()
ORDER BY created_at DESC;
```

### Get Interests on My Listings
```sql
SELECT bi.*, bl.location, bl.dive_type
FROM buddy_interests bi
JOIN buddy_listings bl ON bi.listing_id = bl.id
WHERE bl.user_id = auth.uid()
  AND bi.status = 'pending'
ORDER BY bi.created_at DESC;
```

### Get My Pending Interests
```sql
SELECT bi.*, bl.location, bl.date_from, bl.date_to
FROM buddy_interests bi
JOIN buddy_listings bl ON bi.listing_id = bl.id
WHERE bi.interested_user_id = auth.uid()
  AND bi.status = 'pending'
ORDER BY bi.created_at DESC;
```

### Get My Connected Buddies
```sql
SELECT * FROM buddy_connections
WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid();
```

### Get Unread Messages
```sql
SELECT * FROM buddy_messages
WHERE receiver_id = auth.uid() 
  AND read_at IS NULL
ORDER BY created_at DESC;
```

### Get Conversation with Specific Buddy
```sql
SELECT * FROM buddy_messages
WHERE (sender_id = auth.uid() AND receiver_id = $1)
   OR (sender_id = $1 AND receiver_id = auth.uid())
ORDER BY created_at ASC;
```

---

## TypeScript API

### Browse Listings
```typescript
const listings = await buddyClient.getBrowsableListings({
  location: 'אילת',
  diving_level: 'advanced',
  dive_types: ['reef', 'boat'],
  limit: 20,
});
```

### Create Listing
```typescript
const listing = await buddyClient.createListing({
  location: 'אילת',
  date_from: '2026-07-01',
  date_to: '2026-07-07',
  diving_level: 'advanced',
  dive_type: ['reef', 'boat'],
  description: 'Technical dive enthusiast',
});
```

### Express Interest
```typescript
const interest = await buddyClient.expressInterest({
  listing_id: listingId,
  message: 'Let\'s dive together!',
});
```

### Accept Interest (Create Connection)
```typescript
const connection = await buddyClient.acceptInterest(interestId);
// Now both users can see each other's contact info and message
```

### Send Message
```typescript
const message = await buddyClient.sendMessage({
  receiver_id: buddyUserId,
  message: 'When should we meet?',
  connection_id: connectionId, // optional
});
```

### Get Conversation
```typescript
const messages = await buddyClient.getConversation(buddyUserId);
```

### Mark as Read
```typescript
await buddyClient.markAsRead(messageId);
// or mark all from a user as read
await buddyClient.markConversationAsRead(buddyUserId);
```

### Get Buddy Profile (with Contact Info if Connected)
```typescript
const profile = await buddyClient.getBuddyProfile(userId);
// If connected: includes email, phone
// If not connected: basic info only
```

---

## RLS Rules (What Users Can See)

### buddy_listings
- ✓ Own listings (always)
- ✓ Others' active, non-expired listings
- ✗ Others' archived/expired listings
- ✗ Others' private info (contact details hidden)

### buddy_interests
- ✓ Interests on own listings
- ✓ Own interest expressions
- ✗ Others' interests on their listings

### buddy_connections
- ✓ Own connections (both users)
- ✗ Others' connections

### buddy_messages
- ✓ Sent messages
- ✓ Received messages
- ✗ Others' conversations

---

## When Contact Info Is Revealed

| Scenario | Email Visible | Phone Visible |
|----------|:---:|:---:|
| Browsing listings | ✗ | ✗ |
| After interest expressed | ✗ | ✗ |
| After interest ACCEPTED | ✓ | ✓ |
| Connected buddies | ✓ | ✓ |
| Own profile | ✓ | ✓ |

---

## Stored Procedures

### Accept Interest & Create Connection
```typescript
const result = await buddyClient.acceptInterest(interestId);
// Returns: { connection_id, listing_id, listing_owner_id, interested_user_id }
```

### Get Profile (with RLS-Safe Contact Info)
```typescript
const profile = await buddyClient.getBuddyProfile(userId);
```

---

## Status Enums

### ListingStatus
- `active` - Currently browsable
- `archived` - Owner archived manually
- `expired` - Auto-archived after expires_at

### InterestStatus
- `pending` - Awaiting owner response
- `accepted` - Owner accepted, connection created
- `rejected` - Owner declined
- `cancelled` - User withdrew interest

### DivingLevel
- `beginner` - מתחיל
- `intermediate` - ביניים
- `advanced` - מתקדם
- `divemaster` - דיוומאסטר

### DiveType
- `reef` - אלמוגים
- `boat` - סירה
- `cave` - מערה
- `wreck` - ספינת שריון
- `deep` - עמוק
- `technical` - טכני

---

## Validation Rules

### Listings
- `date_from < date_to` - Required
- `group_size_min > 0` - At least 1 diver
- `group_size_max >= group_size_min` - Valid range
- Cannot create interest in own listing - Database constraint

### Interests
- One interest per user per listing - Unique constraint
- Cannot interest own listing - Check constraint
- Listing must exist and not be expired

### Messages
- Both users must be connected - RLS enforced
- Cannot message self - Check constraint
- Connection must exist - RLS enforced

---

## Performance Tips

### Browsing Listings
Uses index: `(status, expires_at) WHERE status='active'`
- Add location filter for faster results
- Use pagination (limit/offset)

### Checking Interests
Uses index: `listing_id`
- Owner checks interests on their listings: Fast
- User checks own interests: Fast

### Finding Conversation Partner
Uses indexes: `sender_id`, `receiver_id`
- Get conversation: Fast
- Get unread count: Use index on `read_at`

---

## Common Operations Flow

### Start Conversation (Step by Step)

```
1. User A browses listings
   → GET /buddy_listings (active, not expired, not own)

2. User A sees User B's listing
   → Display location, dates, diving_level, description
   → Contact info is HIDDEN

3. User A expresses interest
   → POST /buddy_interests (listing_id, message)

4. User B sees interest notification
   → GET /buddy_interests (on own listings, status=pending)

5. User B clicks "Accept"
   → CALL accept_buddy_interest(interest_id)
   → Automatically creates buddy_connection

6. User A can now message User B
   → User A can see User B's contact info
   → User B can see User A's contact info
   → POST /buddy_messages

7. Conversation happens
   → Both can read/respond
   → Messages marked as read
```

---

## Debugging Checklist

**"I can't see listings"**
- [ ] Are you logged in? (RLS needs auth.uid())
- [ ] Do they have status='active'?
- [ ] Are they not expired? (expires_at > NOW())

**"Contact info is hidden"**
- [ ] Do you have an accepted interest? (buddy_connection exists?)
- [ ] Is the connection between you and the user?

**"Can't send message"**
- [ ] Do you have a buddy_connection with this user?
- [ ] Did you accept an interest (or they accepted yours)?

**"Can't express interest"**
- [ ] Is the listing still active and not expired?
- [ ] Did you already express interest? (UNIQUE constraint)
- [ ] Are you trying to interest your own listing? (Prevented by constraint)

---

## Environment Variables

```bash
# Supabase URLs and Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Service role (backend only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## File Structure

```
supabase/
├── migrations/
│   └── 001_buddy_matching_schema.sql
├── README.md                           (this file)
├── QUICK_REFERENCE.md                  (you are here)
├── ARCHITECTURE.md                     (detailed design)
├── RELATIONSHIPS_AND_RLS.md           (ERD & policies)
└── SETUP_AND_DEPLOYMENT.md            (setup guide)

src/
├── types/
│   └── buddy-matching.ts              (TypeScript types)
└── lib/
    └── supabase-buddy-client.ts       (Client library)
```

---

## Key Security Properties

✓ Contact info not exposed until connection established  
✓ RLS policies prevent unauthorized data access  
✓ Users cannot modify others' listings  
✓ Users cannot delete others' interests  
✓ Messages only travel between connected buddies  
✓ Automatic connection prevents duplicates  

---

## Quick Tips

1. **Always use BuddyClient** for type safety and RLS compliance
2. **Contact info hides automatically** via RLS, no code needed
3. **Archive listings instead of deleting** (soft delete via status)
4. **Check connection before messaging** (RLS will reject otherwise)
5. **Timestamps are automatic** (created_at, updated_at)
6. **Listings auto-expire** (status changes to 'expired' on date)
7. **User IDs are normalized** in connections (user_id_1 < user_id_2)
8. **Messages are one-way** (sent/received distinction)
9. **Interests are one-to-one** per listing (UNIQUE constraint)
10. **Always authenticate** (RLS requires valid auth.uid())

---

## Testing in Supabase Studio

### Test RLS as Different User
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create multiple test users
4. Run queries with `-- Set authenticated user` header:

```sql
-- Set authenticated user: test-user-id
SELECT * FROM buddy_listings WHERE status = 'active';
```

### Verify Policies
1. Go to Authentication > Policies
2. Check all policies are listed and ENABLED
3. Run test queries to verify enforcement

---

## Last Updated
2026-06-20

## Version
1.0.0

For detailed information, see ARCHITECTURE.md or SETUP_AND_DEPLOYMENT.md
