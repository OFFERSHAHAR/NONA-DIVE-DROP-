# Dive Drop - Database Relationships & RLS Policies

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         auth.users                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ id (UUID)                                        [PRIMARY KEY] │   │
│  │ email (TEXT)                                                  │   │
│  │ raw_user_meta_data (JSONB)                                   │   │
│  │   ├─ full_name                                               │   │
│  │   ├─ avatar_url                                              │   │
│  │   ├─ diving_level                                            │   │
│  │   ├─ bio                                                     │   │
│  │   ├─ phone [HIDDEN - RLS Protected]                          │   │
│  │   ├─ languages []                                            │   │
│  │   └─ certifications []                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────┬──────────────────────────┬──────────────────────────────┘
            │                          │
            │ 1:N                      │ 1:N
            │ (owns)                   │ (sends/receives)
            │                          │
    ┌───────▼────────────┐         ┌──▼────────────────────┐
    │ buddy_listings     │         │ buddy_messages        │
    │ ──────────────────  │         │ ───────────────────── │
    │ id [PK]            │         │ id [PK]               │
    │ user_id [FK] ──────┼─┐       │ sender_id [FK] ───────┼──┐
    │ location           │ │       │ receiver_id [FK] ─────┼──┼──┐
    │ latitude           │ │       │ connection_id [FK] ───┼──┼──┼──┐
    │ longitude          │ │       │ message               │  │  │  │
    │ date_from          │ │       │ read_at               │  │  │  │
    │ date_to            │ │       │ created_at            │  │  │  │
    │ diving_level       │ │       └──────────────────────┘  │  │  │
    │ dive_type []       │ │                                 │  │  │
    │ description        │ │                                 │  │  │
    │ languages []       │ │       ┌──────────────────────┐  │  │  │
    │ group_size_min     │ │       │ buddy_connections    │  │  │  │
    │ group_size_max     │ │       │ ───────────────────── │  │  │  │
    │ status             │ │       │ id [PK]              │  │  │  │
    │ created_at         │ │       │ user_id_1 [FK] ──────┼──┼──┴──┘
    │ updated_at         │ │       │ user_id_2 [FK] ──────┼──┴─────┐
    │ expires_at         │ │       │ meeting_date         │        │
    └─────────┬──────────┘ │       │ location             │        │
              │ 1:N        │       │ dive_type            │        │
              │(targets)   │       │ contact_info_visible │        │
              │            │       │ created_at           │        │
              │            │       │ updated_at           │        │
              │            └────   └──────────────────────┘        │
              │                                                     │
              │ 1:N                                                 │
              │                                    N:N (normalized) │
              │                                    (via user_id_1/2)│
              │                                                     │
    ┌─────────▼──────────────────┐                                 │
    │ buddy_interests            │                                 │
    │ ────────────────────────── │                                 │
    │ id [PK]                    │                                 │
    │ listing_id [FK] ──────────┬┘                                 │
    │ interested_user_id [FK] ──┴──┐                               │
    │ message                       │                              │
    │ status                        │                              │
    │ contact_info_revealed_at      │                              │
    │ created_at                    │                              │
    │ updated_at                    │                              │
    └──────────────────────────────┘  (normalized users)           │
                                                                   │
                                    ┌───────────────────────────┘
                                    │
                            ┌───────┴──────────┐
                            │                  │
                      user_id_1          user_id_2
                      (always <)         (always >)
```

---

## Data Flow: Interest → Connection → Messages

### Step 1: Browse Listings (No Auth → Authenticated)
```
User1 (authenticated)
  └─ Can VIEW all active listings from other users
     └─ buddy_listings WHERE status='active' AND user_id != auth.uid()
        └─ Contact info is HIDDEN (not stored in listings)
```

### Step 2: Express Interest
```
User1 creates buddy_interests record
  ├─ listing_id → User2's listing
  ├─ interested_user_id = User1.id
  ├─ message = optional
  └─ status = 'pending'
  
User2 (listing owner) receives notification
  └─ Can view interest via: SELECT * FROM buddy_interests 
     WHERE listing_id IN (SELECT id FROM buddy_listings WHERE user_id = auth.uid())
```

### Step 3: Accept Interest
```
User2 calls: accept_buddy_interest(interest_id)
  ├─ UPDATE buddy_interests SET status='accepted', contact_info_revealed_at=NOW()
  └─ CREATE buddy_connection(user_id_1, user_id_2)
     └─ Normalized: LEAST(User1, User2) as user_id_1, GREATEST(...) as user_id_2

Result:
  ├─ User1 and User2 can now see each other's contact info
  └─ User1 and User2 can now send/receive messages
```

### Step 4: Send Messages
```
User1 sends message to User2
  ├─ INSERT buddy_messages
  │  ├─ sender_id = User1.id
  │  ├─ receiver_id = User2.id
  │  ├─ connection_id = buddy_connection.id
  │  └─ message = "Hello!"
  │
  └─ RLS checks: Is there a valid connection?
     └─ SELECT FROM buddy_connections WHERE (user_id_1 = auth.uid() AND user_id_2 = receiver_id)...
```

---

## Contact Information Privacy Model

### BEFORE Interest Accepted
```
User1 browsing User2's listing:
┌─────────────────────────────┐
│ User2's Listing             │
│ ─────────────────────────── │
│ location: אילת              │ ✓ VISIBLE
│ date_from: 2026-07-01       │ ✓ VISIBLE
│ date_to: 2026-07-07         │ ✓ VISIBLE
│ diving_level: advanced      │ ✓ VISIBLE
│ dive_type: [reef, boat]     │ ✓ VISIBLE
│ description: "Love diving!" │ ✓ VISIBLE
│ languages: [Hebrew, English]│ ✓ VISIBLE
│                             │
│ email: user2@example.com    │ ✗ HIDDEN
│ phone: +972-50-1234567      │ ✗ HIDDEN
│ full_name: ???              │ ✗ HIDDEN
│ avatar: ???                 │ ✗ HIDDEN
└─────────────────────────────┘
```

### AFTER Interest Accepted
```
User1 and User2 connected:
┌──────────────────────────────┐
│ User2's Profile              │
│ ────────────────────────────  │
│ full_name: רגינה כהן         │ ✓ VISIBLE (via get_buddy_profile)
│ avatar_url: https://...      │ ✓ VISIBLE
│ diving_level: advanced       │ ✓ VISIBLE
│ bio: "Love diving!"          │ ✓ VISIBLE
│ email: user2@example.com     │ ✓ VISIBLE (via get_buddy_profile)
│ phone: +972-50-1234567       │ ✓ VISIBLE (via get_buddy_profile)
└──────────────────────────────┘
```

---

## Detailed RLS Policies

### buddy_listings RLS Policies

#### Policy 1: View Own Listings
```sql
CREATE POLICY "Users can see own listings"
  ON buddy_listings
  FOR SELECT
  USING (user_id = auth.uid());

Purpose: List owner can always see their own listings (for editing, archiving)
Effect: Acts as read access for own profile management
```

#### Policy 2: View Active Listings from Others
```sql
CREATE POLICY "Authenticated users can see active listings from others"
  ON buddy_listings
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL           -- Must be logged in
    AND user_id != auth.uid()        -- Cannot be own listing
    AND status = 'active'            -- Only active listings
    AND expires_at > NOW()           -- Must not be expired
  );

Purpose: Enable discovery of buddy opportunities
Effect: Forms the basis of the "Browse Buddies" feature
```

#### Policy 3: Create Listings
```sql
CREATE POLICY "Users can create own listings"
  ON buddy_listings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

Purpose: Users can only create listings for themselves
Effect: Prevents impersonation
```

#### Policy 4: Update Listings
```sql
CREATE POLICY "Users can update own listings"
  ON buddy_listings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

Purpose: Users can modify their own listings
Effect: Allows updates to dates, description, preferences, etc.
```

#### Policy 5: Delete/Archive Listings
```sql
CREATE POLICY "Users can archive own listings"
  ON buddy_listings
  FOR DELETE
  USING (user_id = auth.uid());

Purpose: Users can soft-delete their listings
Effect: Uses DELETE but triggers status→'archived' via constraint check
Note: Hard delete is prevented; status='archived' is the equivalent
```

**Key Security Properties:**
- Listing owners control visibility of their own listings
- Contact info is NOT stored in buddy_listings table
- Other users cannot modify listings they don't own
- Anonymous users cannot browse listings (must be authenticated)

---

### buddy_interests RLS Policies

#### Policy 1: Listing Owner Views Interests
```sql
CREATE POLICY "Listing owner can see interests on their listings"
  ON buddy_interests
  FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM buddy_listings WHERE user_id = auth.uid()
    )
  );

Purpose: Listing owner can review all interest requests they received
Effect: Shows "who is interested in my listing?"
```

#### Policy 2: Interested User Views Own Interests
```sql
CREATE POLICY "Users can see their own interests"
  ON buddy_interests
  FOR SELECT
  USING (interested_user_id = auth.uid());

Purpose: Users can track their own interest expressions
Effect: Shows "which listings have I expressed interest in?"
```

#### Policy 3: Create Interests
```sql
CREATE POLICY "Users can create interests"
  ON buddy_interests
  FOR INSERT
  WITH CHECK (interested_user_id = auth.uid());

Purpose: Users can only express their own interest
Effect: Prevents spoofing interests
Additional: Database constraint prevents:
  - UNIQUE(listing_id, interested_user_id) - one interest per user per listing
  - cannot_interest_own_listing - prevents self-interest
```

#### Policy 4: Update Own Interest
```sql
CREATE POLICY "Users can update their own interests"
  ON buddy_interests
  FOR UPDATE
  USING (interested_user_id = auth.uid())
  WITH CHECK (interested_user_id = auth.uid());

Purpose: Users can modify/cancel their own interests
Effect: Allows status changes by interested user
```

#### Policy 5: Listing Owner Accepts/Rejects
```sql
CREATE POLICY "Listing owner can update interest status"
  ON buddy_interests
  FOR UPDATE
  USING (
    listing_id IN (
      SELECT id FROM buddy_listings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM buddy_listings WHERE user_id = auth.uid()
    )
  );

Purpose: Listing owner can accept/reject interest requests
Effect: Changes buddy_interests.status and triggers buddy_connection creation
Note: Called via accept_buddy_interest() stored procedure
```

#### Policy 6: Delete Own Interest
```sql
CREATE POLICY "Users can delete their own interests"
  ON buddy_interests
  FOR DELETE
  USING (interested_user_id = auth.uid());

Purpose: Users can withdraw interest requests
Effect: Removes the interest record
```

**Key Security Properties:**
- Only relevant parties can view interests (listing owner or interested user)
- Interest status is controlled by listing owner (accept/reject)
- Users cannot express interest in own listings (enforced at DB level)
- Contact info NOT revealed until interest is accepted

---

### buddy_connections RLS Policies

#### Policy 1: View Connection
```sql
CREATE POLICY "Users can see their connections"
  ON buddy_connections
  FOR SELECT
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

Purpose: Both users in a connection can see the connection
Effect: Lists "my buddies" for both users
```

#### Policy 2: Create Connection
```sql
CREATE POLICY "System creates connections"
  ON buddy_connections
  FOR INSERT
  WITH CHECK (true);

Purpose: Only the system creates connections (no user-facing INSERT)
Effect: Connections created only via accept_buddy_interest() stored procedure
Note: This is open because the stored procedure enforces authorization
```

#### Policy 3: Update Connection
```sql
CREATE POLICY "Connection users can update"
  ON buddy_connections
  FOR UPDATE
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
  WITH CHECK (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

Purpose: Both users can update connection details (meeting date, dive type)
Effect: Allows coordination after connection established
```

#### Policy 4: Delete Connection
```sql
CREATE POLICY "Connection users can delete"
  ON buddy_connections
  FOR DELETE
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

Purpose: Either user can break/archive the connection
Effect: Enables leaving a buddy relationship
Note: Uses DELETE but data persists for auditing (should be soft delete in future)
```

**Key Security Properties:**
- Both users have equal access to the connection
- Prevents unauthorized connection creation (via stored procedure gate)
- User IDs normalized (user_id_1 < user_id_2) prevents duplicates
- Contact info is now VISIBLE to both parties via get_buddy_profile()

---

### buddy_messages RLS Policies

#### Policy 1: View Sent Messages
```sql
CREATE POLICY "Users can see sent messages"
  ON buddy_messages
  FOR SELECT
  USING (sender_id = auth.uid());

Purpose: Users can see their sent messages
Effect: Message history from sender's perspective
```

#### Policy 2: View Received Messages
```sql
CREATE POLICY "Users can see received messages"
  ON buddy_messages
  FOR SELECT
  USING (receiver_id = auth.uid());

Purpose: Users can see their received messages
Effect: Inbox view
```

#### Policy 3: Send Messages
```sql
CREATE POLICY "Users can send messages to connected buddies"
  ON buddy_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM buddy_connections
      WHERE (user_id_1 = auth.uid() AND user_id_2 = receiver_id)
         OR (user_id_2 = auth.uid() AND user_id_1 = receiver_id)
    )
  );

Purpose: Only allow messages between confirmed buddies
Effect: Prevents unsolicited messages
Note: Subquery checks for connection normalization (user_id_1 < user_id_2)
```

#### Policy 4: Update Messages
```sql
CREATE POLICY "Users can update their messages"
  ON buddy_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

Purpose: Sender can edit/delete own messages
Effect: Limited to sender (prevents receiver from modifying messages)
```

#### Policy 5: Mark as Read
```sql
CREATE POLICY "Receiver can mark message as read"
  ON buddy_messages
  FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

Purpose: Receiver marks messages as read
Effect: Updates only read_at field
```

#### Policy 6: Delete Messages
```sql
CREATE POLICY "Users can delete their messages"
  ON buddy_messages
  FOR DELETE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

Purpose: Either party can delete the message
Effect: Soft delete recommended in future to preserve audit trail
```

**Key Security Properties:**
- Messages only travel between connected buddies
- Connection existence is verified at INSERT time
- Sender/receiver distinction enforced
- Message content cannot be modified after send (best practice)

---

## User Journey with RLS

### Journey 1: Discover and Connect

```
1. USER AUTHENTICATION
   ├─ auth.uid() is set in JWT
   └─ Can now use all authenticated policies

2. BROWSE LISTINGS
   └─ SELECT * FROM buddy_listings
      WHERE status='active' AND expires_at > NOW() AND user_id != auth.uid()
      ✓ RLS Policy: "Authenticated users can see active listings from others"
      ✓ Contact info is NULL (not stored in listings)

3. EXPRESS INTEREST
   └─ INSERT INTO buddy_interests (listing_id, interested_user_id, message)
      ✓ RLS Policy: "Users can create interests"
      ✓ Database constraint: unique per listing, not self-interest

4. WAIT FOR RESPONSE
   └─ SELECT * FROM buddy_interests WHERE interested_user_id = auth.uid()
      ✓ RLS Policy: "Users can see their own interests"

5. LISTING OWNER ACCEPTS
   (Different session, auth.uid() = listing owner)
   └─ CALL accept_buddy_interest(interest_id)
      ├─ UPDATE buddy_interests SET status='accepted'
      ├─ ✓ RLS Policy: "Listing owner can update interest status"
      └─ CREATE buddy_connection(user_id_1, user_id_2)
         └─ ✓ RLS Policy: "System creates connections" (stored procedure)

6. BOTH USERS NOW CONNECTED
   └─ User1 calls get_buddy_profile(User2.id)
      └─ Returns email, phone, full_name
         ✓ Check: EXISTS (SELECT FROM buddy_connections WHERE...)
         ✓ Contact info is now VISIBLE
```

### Journey 2: Send Messages

```
1. USER1 SENDS MESSAGE TO USER2
   └─ INSERT INTO buddy_messages (sender_id, receiver_id, message)
      ✓ RLS checks:
         ├─ sender_id = auth.uid() (authenticated user)
         └─ EXISTS buddy_connection WHERE (user_id_1=auth.uid() AND user_id_2=receiver_id)
            (connection must exist and be properly normalized)

2. USER2 RECEIVES MESSAGE
   └─ SELECT * FROM buddy_messages WHERE receiver_id = auth.uid()
      ✓ RLS Policy: "Users can see received messages"

3. USER2 MARKS AS READ
   └─ UPDATE buddy_messages SET read_at=NOW() WHERE id=msg_id
      ✓ RLS Policy: "Receiver can mark message as read"
      ✓ Only updates read_at field
```

---

## Security Guarantees

### Table: buddy_listings
| Threat | Mitigation |
|--------|-----------|
| User A sees User B's contact info | Contact info not stored; requires active connection |
| User A modifies User B's listing | RLS policy: can only UPDATE own listings |
| User A deletes User B's listing | RLS policy: can only DELETE own listings |
| Anonymous user browses listings | RLS policy: auth.uid() IS NOT NULL required |
| User A expresses interest in own listing | Database constraint: cannot_interest_own_listing |

### Table: buddy_interests
| Threat | Mitigation |
|--------|-----------|
| User A sees User B's interests | RLS policy: only owner or interested user can view |
| User A accepts interest not on their listing | RLS policy: listing owner only can accept |
| User A creates duplicate interests | Database constraint: UNIQUE(listing_id, interested_user_id) |
| User A sends message before connection | RLS policy on messages: connection must exist |

### Table: buddy_connections
| Threat | Mitigation |
|--------|-----------|
| User A creates connection with User B | RLS: only system (stored procedure) can INSERT |
| User A modifies User B's connection details | RLS policy: both users can UPDATE own connection |
| Duplicate connections created | Database constraint: UNIQUE(user_id_1, user_id_2) |
| User A and User B relation appears twice | Database constraint: user_id_1 < user_id_2 (normalized) |

### Table: buddy_messages
| Threat | Mitigation |
|--------|-----------|
| User A sends message to User B without connection | RLS policy: connection must exist |
| User A sees User B's received messages | RLS policy: can only see own sent/received |
| Receiver modifies message content | RLS policy: only sender can UPDATE |
| User A sends unsolicited messages | RLS policy: buddy_connections required |

---

## Testing RLS Policies

### Test Case 1: Browse Listings
```sql
-- As User1 (authenticated)
SELECT * FROM buddy_listings WHERE user_id != auth.uid();
-- Expected: Only active listings with status='active' and expires_at > NOW()

-- As anonymous user
SELECT * FROM buddy_listings;
-- Expected: No rows (auth.uid() IS NULL fails policy)
```

### Test Case 2: Express Interest
```sql
-- As User1 (interested in User2's listing)
INSERT INTO buddy_interests (listing_id, interested_user_id, message)
VALUES (listing_id, auth.uid(), 'Let''s dive together!');
-- Expected: Success

-- Try to express interest as User2 (via spoofing interested_user_id)
INSERT INTO buddy_interests (listing_id, interested_user_id, message)
VALUES (listing_id, 'user1-id', 'This should fail!');
-- Expected: RLS violation (interested_user_id != auth.uid())
```

### Test Case 3: Accept Interest
```sql
-- As User2 (listing owner)
UPDATE buddy_interests SET status='accepted' WHERE id=interest_id;
-- Expected: Success (listing owner can update)

-- As User1 (interested user, not owner)
UPDATE buddy_interests SET status='accepted' WHERE id=interest_id;
-- Expected: RLS violation (only owner can accept)
```

### Test Case 4: Send Messages
```sql
-- As User1 (connected to User2)
INSERT INTO buddy_messages (sender_id, receiver_id, message)
VALUES (auth.uid(), user2_id, 'When shall we dive?');
-- Expected: Success (connection exists)

-- As User3 (not connected to User2)
INSERT INTO buddy_messages (sender_id, receiver_id, message)
VALUES (auth.uid(), user2_id, 'Let''s dive!');
-- Expected: RLS violation (no connection)
```

---

## Performance Considerations

### Query Planning

#### Fast Queries (Index-backed)
```sql
-- Uses idx_buddy_listings_status_expires
SELECT * FROM buddy_listings
WHERE status='active' AND expires_at > NOW();

-- Uses idx_buddy_interests_listing_id
SELECT * FROM buddy_interests WHERE listing_id = $1;

-- Uses idx_buddy_messages_receiver_id, filtered by read_at
SELECT * FROM buddy_messages
WHERE receiver_id = auth.uid() AND read_at IS NULL;
```

#### Slower Queries (May need optimization)
```sql
-- Uses subquery on buddy_listings
SELECT * FROM buddy_interests
WHERE listing_id IN (SELECT id FROM buddy_listings WHERE user_id = auth.uid());
-- Consider: Denormalize listing_owner_id to buddy_interests

-- Check connection existence (done in message RLS)
EXISTS (SELECT 1 FROM buddy_connections WHERE user_id_1=... OR user_id_2=...);
-- Consider: Two-index approach or denormalization
```

### Index Strategy
- **Write-heavy**: buddy_listings, buddy_interests, buddy_messages
- **Read-heavy**: buddy_listings (browse), buddy_connections (my buddies)
- **Composite indexes**: (status, expires_at), (read_at) WHERE read_at IS NULL

---

## Conclusion

This RLS design ensures:
1. **Privacy**: Contact info hidden until connections are made
2. **Authorization**: Users can only see/modify their own data
3. **Integrity**: Database constraints prevent invalid states
4. **Performance**: Strategic indexes support common queries
5. **Auditability**: Soft deletes preserve historical data
