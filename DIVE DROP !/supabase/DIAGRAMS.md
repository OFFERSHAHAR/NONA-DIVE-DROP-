# Dive Drop - Database Diagrams & Visual Guides

## 1. Complete Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Supabase Auth                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ auth.users (Supabase managed)                                      │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │ • id: UUID [PRIMARY KEY]                                           │  │
│  │ • email: TEXT                                                      │  │
│  │ • raw_user_meta_data: JSONB                                        │  │
│  │   ├─ full_name: TEXT                                               │  │
│  │   ├─ avatar_url: TEXT                                              │  │
│  │   ├─ diving_level: TEXT [ENCRYPTED]                                │  │
│  │   ├─ phone: TEXT [ENCRYPTED - HIDDEN]                              │  │
│  │   ├─ bio: TEXT                                                     │  │
│  │   ├─ languages: TEXT[]                                             │  │
│  │   └─ certifications: TEXT[]                                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────┬─────────────────────────┬──────────────────────────────────────┘
         │                         │
         │ 1:N (owns)              │ N:N (sender/receiver)
         │                         │
         │                         │
    ┌────▼────────────────┐        ├──────────────────────────┐
    │ buddy_listings      │        │ buddy_messages           │
    ├────────────────────┤        ├──────────────────────────┤
    │ id: UUID [PK]      │        │ id: UUID [PK]            │
    │ user_id: UUID [FK] ├──┐     │ sender_id: UUID [FK] ────┼──┐
    │ location: TEXT     │  │     │ receiver_id: UUID [FK] ──┼──┼──┐
    │ latitude: DECIMAL  │  │     │ connection_id: UUID [FK] ├──┼──┼──┐
    │ longitude: DECIMAL │  │     │ message: TEXT            │  │  │  │
    │ date_from: TIMESTAMP│  │     │ read_at: TIMESTAMP       │  │  │  │
    │ date_to: TIMESTAMP │  │     │ created_at: TIMESTAMP    │  │  │  │
    │ diving_level       │  │     └──────────────────────────┘  │  │  │
    │ dive_type[]        │  │                                    │  │  │
    │ description        │  │                                    │  │  │
    │ languages[]        │  │     ┌──────────────────────────┐   │  │  │
    │ group_size_min     │  │     │ buddy_connections        │   │  │  │
    │ group_size_max     │  │     ├──────────────────────────┤   │  │  │
    │ status: ENUM       │  │     │ id: UUID [PK]            │   │  │  │
    │ created_at         │  │     │ user_id_1: UUID [FK] ────┼───┼──┴──┘
    │ updated_at         │  │     │ user_id_2: UUID [FK] ────┼───┴─────┐
    │ expires_at         │  │     │ meeting_date: TIMESTAMP  │         │
    └────┬──────────────┘  │     │ location: TEXT           │         │
         │ 1:N             │     │ dive_type: ENUM          │         │
         │(target)         │     │ contact_info_visible     │         │
         │                 │     │ created_at               │         │
         │                 │     │ updated_at               │         │
         │                 │     └──────────────────────────┘         │
         │                 │                                          │
         │ 1:N             │                          N:N (normalized)│
         │                 │                          (user_id_1 <   │
         │                 └────┐                      user_id_2)    │
         │                      │                                     │
    ┌────▼──────────────────┐   │                                     │
    │ buddy_interests       │   │                                     │
    ├──────────────────────┤   │                                     │
    │ id: UUID [PK]        │   │                                     │
    │ listing_id: UUID [FK]├───┘                                     │
    │ interested_user_id───┼──┐                                      │
    │   [FK]               │  │                                      │
    │ message: TEXT        │  │                                      │
    │ status: ENUM         │  │                                      │
    │ contact_info_        │  │                                      │
    │   revealed_at        │  │                                      │
    │ created_at           │  │                                      │
    │ updated_at           │  │                                      │
    └──────────────────────┘  │                                      │
                              │ (normalized users)                   │
                        ┌─────┴──────────┐                          │
                        │                │                          │
                  user_id_1         user_id_2                      │
                  (always <)        (always >)                      │
                                                                    │
                                    ┌───────────────────────────┘
                                    │
                            ┌───────┴──────────┐
                            │                  │
                      user_id_1          user_id_2
                      (any order)       (any order)
```

---

## 2. Data Flow Diagram: Interest → Connection → Messages

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: BROWSE LISTINGS                                             │
│ User A is authenticated, browses active listings                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SELECT * FROM buddy_listings                                       │
│  WHERE status='active'                                              │
│    AND expires_at > NOW()                                           │
│    AND user_id != auth.uid()  ← RLS enforces this                   │
│                                                                      │
│  Result: User A sees User B's listing                               │
│  ├─ location: אילת                   ✓ Visible                     │
│  ├─ dates: 2026-07-01 to 2026-07-07  ✓ Visible                     │
│  ├─ diving_level: advanced           ✓ Visible                     │
│  ├─ description: "Technical diver"   ✓ Visible                     │
│  ├─ email: user2@example.com         ✗ HIDDEN (not in table)       │
│  └─ phone: +972-50-1234567           ✗ HIDDEN (not in table)       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: EXPRESS INTEREST                                            │
│ User A clicks "Interested" and sends a message                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSERT INTO buddy_interests (                                      │
│    listing_id = 'user-b-listing-id',                               │
│    interested_user_id = auth.uid(),  ← RLS enforces auth.uid()     │
│    message = "Let's dive together!",                                │
│    status = 'pending'                                               │
│  )                                                                  │
│                                                                      │
│  RLS Checks:                                                        │
│  ✓ interested_user_id = auth.uid() ← User A must be themselves      │
│                                                                      │
│  Database Constraints:                                              │
│  ✓ UNIQUE(listing_id, interested_user_id) ← Only 1 interest/user   │
│  ✓ interested_user_id != listing_owner ← Can't interest own listing│
│                                                                      │
│  Result: buddy_interests record created with status='pending'       │
│  User B receives notification about new interest                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: LISTING OWNER REVIEWS INTEREST                              │
│ User B (listing owner) sees interest notification                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SELECT * FROM buddy_interests                                      │
│  WHERE listing_id IN (                                              │
│    SELECT id FROM buddy_listings WHERE user_id = auth.uid()  ← B    │
│  )                                                                  │
│  AND status = 'pending'                                             │
│                                                                      │
│  RLS Enforces:                                                      │
│  ✓ Only listing owner (User B) can see this query                   │
│  ✓ User A cannot see User B's other interests                       │
│                                                                      │
│  Result: User B sees User A's interest with message                 │
│  But User B still CANNOT see User A's contact info!                 │
│  ├─ Contact info remains HIDDEN until accepted                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: ACCEPT INTEREST → CREATE CONNECTION                         │
│ User B clicks "Accept" on User A's interest                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CALL accept_buddy_interest(interest_id)                            │
│                                                                      │
│  Procedure Steps:                                                   │
│  1. Verify auth.uid() owns the listing ← RLS Check                  │
│  2. UPDATE buddy_interests:                                         │
│     SET status = 'accepted'                                         │
│     SET contact_info_revealed_at = NOW()                            │
│  3. CREATE buddy_connection (normalized):                           │
│     INSERT INTO buddy_connections (                                 │
│       user_id_1 = LEAST(user_b_id, user_a_id),                      │
│       user_id_2 = GREATEST(user_b_id, user_a_id)                    │
│     )                                                               │
│                                                                      │
│  Database Safeguards:                                               │
│  ✓ UNIQUE(user_id_1, user_id_2) ← One connection per pair          │
│  ✓ Normalization prevents duplicates ← user_id_1 < user_id_2        │
│                                                                      │
│  Result: buddy_connection created                                   │
│  ✓ Both users are now connected!                                   │
│  ✓ Contact info is NOW REVEALED!                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: VIEW CONTACT INFO                                           │
│ User A calls get_buddy_profile(User B id)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Function: get_buddy_profile(p_user_id)                             │
│                                                                      │
│  Returns:                                                           │
│  {                                                                  │
│    user_id: 'user-b-id',                                           │
│    email: 'user2@example.com',      ✓ NOW VISIBLE!                 │
│    phone: '+972-50-1234567',        ✓ NOW VISIBLE!                 │
│    full_name: 'רגינה כהן',          ✓ NOW VISIBLE!                 │
│    avatar_url: 'https://...',       ✓ NOW VISIBLE!                 │
│    diving_level: 'advanced',        ✓ VISIBLE (before too)         │
│    bio: 'Technical diver',          ✓ VISIBLE (before too)         │
│    show_contact_info: true          ✓ NOW TRUE!                    │
│  }                                                                  │
│                                                                      │
│  Authorization Check (inside function):                             │
│  IF auth.uid() = p_user_id (own profile)                            │
│    THEN show all contact info                                       │
│  ELSE IF EXISTS buddy_connection where both are in it               │
│    THEN show all contact info                                       │
│  ELSE                                                               │
│    THEN hide email and phone (return NULL)                          │
│                                                                      │
│  Result: User A now has User B's full contact info                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: SEND MESSAGES                                               │
│ User A sends message to User B                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSERT INTO buddy_messages (                                       │
│    sender_id = auth.uid(),  ← User A (RLS enforced)                 │
│    receiver_id = 'user-b-id',                                       │
│    message = 'When shall we dive?',                                 │
│    connection_id = 'connection-id' (optional)                       │
│  )                                                                  │
│                                                                      │
│  RLS Security Check (before INSERT allowed):                        │
│  ✓ sender_id = auth.uid() ← Must be your own message                │
│  ✓ EXISTS buddy_connections WHERE (                                 │
│      (user_id_1 = auth.uid() AND user_id_2 = receiver_id)           │
│      OR (user_id_2 = auth.uid() AND user_id_1 = receiver_id)         │
│    ) ← Must have active connection                                  │
│                                                                      │
│  If any check fails → RLS BLOCKS INSERT                             │
│  If all checks pass → Message stored                                │
│                                                                      │
│  Result: Message delivered                                          │
│  User B can now read it                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: ONGOING CONVERSATION                                        │
│ Both users message back and forth                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User B retrieves conversation:                                     │
│  SELECT * FROM buddy_messages                                       │
│  WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())         │
│    AND (                                                            │
│      (sender_id = 'user-a-id' AND receiver_id = auth.uid())         │
│      OR (receiver_id = 'user-a-id' AND sender_id = auth.uid())      │
│    )                                                                │
│  ORDER BY created_at ASC                                            │
│                                                                      │
│  RLS Enforces:                                                      │
│  ✓ User B can only see their own received messages                  │
│  ✓ User B can only see their own sent messages                      │
│  ✓ User B cannot see User A ↔ User C conversation                   │
│                                                                      │
│  User B marks messages as read:                                     │
│  UPDATE buddy_messages SET read_at = NOW()                          │
│  WHERE id = message_id AND receiver_id = auth.uid()                 │
│                                                                      │
│  Result: Full encrypted conversation between buddies                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. RLS Policy Enforcement Diagram

```
Request from Client
       │
       ▼
┌──────────────────────────────────────┐
│ Is user authenticated?                │
│ auth.uid() EXISTS?                    │
└──────┬──────────────────────────────┘
       │ NO                        │ YES
       ▼                          ▼
   [DENY]            ┌──────────────────────────┐
  No anonymous       │ Which table?              │
  access to          │                          │
  listings           └──────┬──────────────────┘
                           │
                ┌──────────┴──────────┬──────────────┬──────────────┐
                ▼                    ▼              ▼              ▼
          buddy_listings      buddy_interests  buddy_connections  buddy_messages
                │                  │               │                │
                ▼                  ▼               ▼                ▼
         ┌─────────────┐   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ View own?   │   │ Is owner or  │  │ In connection│  │ Sent or      │
         │ YES ✓       │   │ interested?  │  │ with you?    │  │ received?    │
         │ View others'│   │ YES ✓        │  │ YES ✓        │  │ YES ✓        │
         │ active?     │   │ No ✗         │  │ No ✗         │  │ No ✗         │
         │ YES ✓       │   │              │  │              │  │              │
         │ Create?     │   │ Create new?  │  │ Create?      │  │ Send to      │
         │ YES ✓       │   │ YES ✓        │  │ System only  │  │ connected?   │
         │ Update own? │   │ Update own?  │  │ No direct    │  │ YES ✓        │
         │ YES ✓       │   │ YES ✓        │  │              │  │ Mark read?   │
         │ Delete own? │   │ Delete own?  │  │ Update?      │  │ YES ✓        │
         │ YES ✓       │   │ YES ✓        │  │ YES ✓        │  │              │
         │ No ✗        │   │              │  │ Delete?      │  │ Read own     │
         │ No ✗        │   │ Update status│  │ YES ✓        │  │ YES ✓        │
         │             │   │ if owner?    │  │              │  │ Write to     │
         │             │   │ YES ✓        │  │              │  │ connected?   │
         │             │   │              │  │              │  │ YES ✓        │
         │             │   │ Delete own?  │  │              │  │ Delete own?  │
         │             │   │ YES ✓        │  │              │  │ YES ✓        │
         └─────────────┘   └──────────────┘  └──────────────┘  └──────────────┘
                │                │               │                │
                ▼                ▼               ▼                ▼
            [EXECUTE]      [EXECUTE]        [EXECUTE]        [EXECUTE]
            or             or               or               or
            [DENY]         [DENY]           [DENY]           [DENY]
```

---

## 4. Contact Info Visibility Timeline

```
TIME AXIS: Interest Lifecycle

T0: User A Browses Listing
┌─────────────────────────────────────────────────┐
│ buddy_listings (User B's listing)               │
├─────────────────────────────────────────────────┤
│ ✓ location: אילת                                │
│ ✓ date_from, date_to                            │
│ ✓ diving_level: advanced                        │
│ ✓ dive_type: [reef, boat]                       │
│ ✓ description: "Tech diver"                     │
│ ✗ email: HIDDEN (not in table)                  │
│ ✗ phone: HIDDEN (not in table)                  │
└─────────────────────────────────────────────────┘

T1: User A Expresses Interest
┌─────────────────────────────────────────────────┐
│ buddy_interests                                 │
├─────────────────────────────────────────────────┤
│ listing_id: user-b-listing-id                   │
│ interested_user_id: user-a-id                   │
│ message: "Let's dive together!"                 │
│ status: pending                                 │
│ contact_info_revealed_at: NULL (not yet)        │
├─────────────────────────────────────────────────┤
│ Contact Info Status: STILL HIDDEN               │
│ ✗ User B's email still not visible to User A    │
│ ✗ User B's phone still not visible to User A    │
└─────────────────────────────────────────────────┘

T2: User B Accepts Interest
┌─────────────────────────────────────────────────┐
│ buddy_interests (UPDATED)                       │
├─────────────────────────────────────────────────┤
│ status: accepted ← CHANGED                      │
│ contact_info_revealed_at: 2026-06-20 10:15 UTC ← SET!
├─────────────────────────────────────────────────┤
│ buddy_connections (CREATED)                     │
├─────────────────────────────────────────────────┤
│ id: connection-id                               │
│ user_id_1: user-a-id (normalized)               │
│ user_id_2: user-b-id (normalized)               │
│ contact_info_visible: true                      │
├─────────────────────────────────────────────────┤
│ Contact Info Status: NOW VISIBLE!               │
│ ✓ User A can now see User B's email             │
│ ✓ User A can now see User B's phone             │
│ ✓ User B can now see User A's email             │
│ ✓ User B can now see User A's phone             │
│                                                 │
│ Authorization: get_buddy_profile() checks:      │
│ IF auth.uid() IN (connection.user_id_1, .._2)  │
│   THEN return email, phone                      │
│ ELSE                                            │
│   RETURN NULL for email, phone                  │
└─────────────────────────────────────────────────┘

T3: Ongoing Conversation
┌─────────────────────────────────────────────────┐
│ buddy_messages (MANY)                           │
├─────────────────────────────────────────────────┤
│ [User A message] ...                            │
│ [User B message] ...                            │
│ [User A message] ...                            │
│ [User B message] ...                            │
│ ...                                             │
├─────────────────────────────────────────────────┤
│ Contact Info: ACCESSIBLE VIA PROFILE            │
│ ✓ Both can call get_buddy_profile()             │
│ ✓ Both see full contact info                    │
│ ✓ Connection ensures access                     │
└─────────────────────────────────────────────────┘
```

---

## 5. Database Index Usage Map

```
buddy_listings Queries
│
├─ Browse active listings
│  └─ Uses: (status, expires_at) WHERE status='active'
│     SELECT * FROM buddy_listings
│     WHERE status='active' AND expires_at > NOW()
│
├─ Get own listings
│  └─ Uses: (user_id)
│     SELECT * FROM buddy_listings WHERE user_id = auth.uid()
│
├─ Search by location
│  └─ Uses: (location)
│     SELECT * FROM buddy_listings WHERE location LIKE '%אילת%'
│
├─ Search by date range
│  └─ Uses: (date_from, date_to)
│     SELECT * FROM buddy_listings
│     WHERE date_from <= $1 AND date_to >= $2
│
├─ Filter by diving level
│  └─ Uses: (diving_level)
│     SELECT * FROM buddy_listings WHERE diving_level = 'advanced'
│
└─ Sort by creation date
   └─ Uses: (created_at DESC)
      SELECT * FROM buddy_listings ORDER BY created_at DESC


buddy_interests Queries
│
├─ Get interests on my listings
│  └─ Uses: (listing_id)
│     SELECT * FROM buddy_interests WHERE listing_id = $1
│
├─ Get my interests
│  └─ Uses: (interested_user_id)
│     SELECT * FROM buddy_interests WHERE interested_user_id = auth.uid()
│
└─ Get pending interests
   └─ Uses: (status) + (created_at)
      SELECT * FROM buddy_interests
      WHERE status = 'pending' ORDER BY created_at DESC


buddy_connections Queries
│
├─ Get my connections
│  └─ Uses: (user_id_1) OR (user_id_2)
│     SELECT * FROM buddy_connections
│     WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid()
│
└─ Check connection exists
   └─ Uses: (user_id_1, user_id_2)
      SELECT 1 FROM buddy_connections
      WHERE (user_id_1 = ? AND user_id_2 = ?)
         OR (user_id_2 = ? AND user_id_1 = ?)


buddy_messages Queries
│
├─ Get unread messages
│  └─ Uses: (receiver_id, read_at) WHERE read_at IS NULL
│     SELECT * FROM buddy_messages
│     WHERE receiver_id = auth.uid() AND read_at IS NULL
│
├─ Get conversation
│  └─ Uses: (sender_id, receiver_id)
│     SELECT * FROM buddy_messages
│     WHERE (sender_id = ? AND receiver_id = ?)
│        OR (sender_id = ? AND receiver_id = ?)
│
└─ Get all messages for user
   └─ Uses: (sender_id) OR (receiver_id)
      SELECT * FROM buddy_messages
      WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
```

---

## 6. State Machine: Interest Status Flow

```
                    ┌─────────────┐
                    │  INTEREST   │
                    │  CREATED    │
                    └──────┬──────┘
                           │
                    INSERT interest
                    status='pending'
                           │
                           ▼
                    ┌──────────────┐
                    │   PENDING    │◄────────────────────┐
                    │ (Awaiting    │                     │
                    │  Response)   │                     │
                    └────┬────┬────┘                     │
                         │    │                         │
                    [Owner Reviews]                     │
                    Clicks Accept? Reject?           Withdraw by
                         │    │                     interested user
                         ▼    ▼                         │
            ┌────────────────────────────────┐         │
            │        DECISION MADE            │         │
            └──┬──────────────────────────┬───┘         │
               │                          │            │
         ACCEPT                      REJECT          CANCEL
         (create              (interest removed)   (interest removed)
          connection)          status='rejected'   status='cancelled'
               │                          │            │
               ▼                          ▼            ▼
        ┌────────────┐      ┌──────────────┐    ┌─────────┐
        │ ACCEPTED   │      │  REJECTED    │    │CANCELLED│
        │(connection │      │(no connection│    │(no      │
        │ created)   │      │created)      │    │connection
        └──────┬─────┘      └──────────────┘    │created) │
               │                                 └─────────┘
        Contact info                                  │
        now REVEALED                    User can express
        auth.uid() can                   interest again
        message partner
               │
               ▼
        ┌────────────────┐
        │  CONNECTED &   │
        │  MESSAGING     │
        │  (ongoing      │
        │   relationship)│
        └────────────────┘


Legend:
- PENDING: Interest waiting for listing owner decision
- ACCEPTED: Interest accepted, connection created, messaging available
- REJECTED: Owner declined, no connection
- CANCELLED: User withdrew interest before owner responded
- CONNECTED: After acceptance, users can message and coordinate dives
```

---

## 7. Security Layers Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATION                           │
│              (Next.js, React Components)                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ HTTP/HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SUPABASE EDGE (Realtime)                        │
│                                                                  │
│  - API Gateway                                                  │
│  - Auth Verification                                            │
│  - Token Validation                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
    ┌──────────────┐     ┌──────────────┐
    │ Service Role │     │  Anon Key    │
    │   (Backend)  │     │  (Client)    │
    └──────┬───────┘     └──────┬───────┘
           │                    │
           │ Full Access        │ Limited by RLS
           │                    │
           ▼                    ▼
    ┌─────────────────────────────────────────────┐
    │           PostgreSQL Database                │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  auth.users (Supabase Auth)          │   │
    │ │  ├─ id                               │   │
    │ │  ├─ email (encrypted)                │   │
    │ │  └─ raw_user_meta_data (encrypted)   │   │
    │ │     └─ phone (encrypted)             │   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  buddy_listings (RLS Protected)      │   │
    │ │  ├─ Own: Always visible              │   │
    │ │  ├─ Others' active: Visible if auth  │   │
    │ │  ├─ Contact info: NOT in this table  │   │
    │ │  └─ Status: active/archived/expired  │   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  buddy_interests (RLS Protected)     │   │
    │ │  ├─ Owner: See on their listings    │   │
    │ │  ├─ User: See their own             │   │
    │ │  └─ Status: pending/accepted/etc    │   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  buddy_connections (RLS Protected)   │   │
    │ │  ├─ Both users: See their conn       │   │
    │ │  ├─ Create: System only (SP)         │   │
    │ │  └─ user_id_1 < user_id_2 (normal)  │   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  buddy_messages (RLS Protected)      │   │
    │ │  ├─ Sent: View own sent msgs         │   │
    │ │  ├─ Received: View own received      │   │
    │ │  ├─ Send: Only to connected buddies  │   │
    │ │  └─ connection_id: Links to BuddyConn   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  Stored Procedures (SECURITY DEFINER)   │
    │ │  ├─ accept_buddy_interest()          │   │
    │ │  ├─ reject_buddy_interest()          │   │
    │ │  └─ get_buddy_profile()              │   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  Triggers & Functions                 │   │
    │ │  ├─ auto_expire_listings              │   │
    │ │  ├─ update_timestamp                 │   │
    │ │  └─ Enforcement: age, check constraints│   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    │ ┌──────────────────────────────────────┐   │
    │ │  Data Encryption                      │   │
    │ │  ├─ auth.users.email (Supabase)       │   │
    │ │  ├─ raw_user_meta_data.phone (SB)     │   │
    │ │  └─ TLS in transit (HTTPS)            │   │
    │ └──────────────────────────────────────┘   │
    │                                              │
    └─────────────────────────────────────────────┘
           │                    │
           │ All Checks Pass    │ Violates RLS
           │                    │
           ▼                    ▼
      [SUCCESS]            [DENIED]
      Execute Query        Return Error
      Return Data          "Row-level security policy"
```

---

## 8. Migration Execution Timeline

```
Before Migration
└─ No buddy matching schema
   └─ No tables, no RLS, no indexes

              ↓ Run Migration ↓
              supabase migration up

After Migration (Atomic - All or Nothing)
├─ ENUMS created (4)
│  ├─ diving_level (beginner, intermediate, advanced, divemaster)
│  ├─ dive_type (reef, boat, cave, wreck, deep, technical)
│  ├─ listing_status (active, archived, expired)
│  └─ interest_status (pending, accepted, rejected, cancelled)
│
├─ TABLES created (4)
│  ├─ buddy_listings (RLS enabled)
│  ├─ buddy_interests (RLS enabled)
│  ├─ buddy_connections (RLS enabled)
│  └─ buddy_messages (RLS enabled)
│
├─ INDEXES created (18)
│  ├─ buddy_listings (8 indexes)
│  ├─ buddy_interests (4 indexes)
│  ├─ buddy_connections (3 indexes)
│  └─ buddy_messages (5 indexes)
│
├─ TRIGGERS created (5)
│  ├─ auto_expire_listings (BEFORE INSERT/UPDATE)
│  └─ update_timestamp (BEFORE UPDATE - 3 tables)
│
├─ FUNCTIONS created (5)
│  ├─ accept_buddy_interest (SECURITY DEFINER)
│  ├─ reject_buddy_interest
│  ├─ get_buddy_profile
│  ├─ auto_expire_listings
│  └─ update_timestamp
│
└─ RLS POLICIES created (21)
   ├─ buddy_listings (5)
   ├─ buddy_interests (6)
   ├─ buddy_connections (4)
   └─ buddy_messages (6)

             ↓ Migration Complete ↓

Schema Ready for Use
└─ All tables, indexes, triggers, and policies active
   └─ Ready to insert test data
      └─ Ready for application integration
```

---

These diagrams provide visual representations of:
1. Complete table relationships
2. User journey from discovery to messaging
3. RLS policy enforcement
4. Contact info visibility timeline
5. Query to index mapping
6. Interest status state machine
7. Security layers and encryption
8. Migration execution

For more details, refer to ARCHITECTURE.md and RELATIONSHIPS_AND_RLS.md
