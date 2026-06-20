# Find Buddy - Database Schema Documentation

## Tables Overview

### 1. `buddy_listings`
Main table for buddy listing posts.

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key, auto-generated |
| user_id | UUID | Yes | References users table, deletes cascade |
| title | TEXT | Yes | Listing title |
| description | TEXT | No | Detailed description |
| location | TEXT | Yes | Dive location |
| experience_level | TEXT | Yes | beginner/intermediate/advanced/professional |
| dive_type | TEXT | Yes | reef/wreck/open_water/cave/boat/shore |
| max_divers | INT | Yes | Max number of divers (1-20) |
| start_date | TIMESTAMP | Yes | When dive starts |
| end_date | TIMESTAMP | Yes | When dive ends |
| is_active | BOOLEAN | Yes | Default true, soft delete via setting false |
| contact_email | TEXT | No | Email for contact |
| contact_phone | TEXT | No | Phone for contact |
| contact_hidden | BOOLEAN | Yes | Default true, hides contact until revealed |
| language_preference | TEXT | No | Language preference |
| notes | TEXT | No | Additional notes |
| created_at | TIMESTAMPTZ | Yes | Auto-set to current time |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated on changes |

**Constraints:**
- `experience_level` must be one of: beginner, intermediate, advanced, professional
- `dive_type` must be one of: reef, wreck, open_water, cave, boat, shore
- Only one listing per user at a time (managed in application logic)

**Indexes:**
- Primary: `id`
- Foreign: `user_id`
- Performance: `location`, `experience_level`, `dive_type`, `start_date`, `is_active`

**RLS Policies:**
- Anyone can SELECT if `is_active = true`
- Owner can SELECT their own listings
- Only owner can INSERT for their own user_id
- Only owner can UPDATE their listings
- Only owner can DELETE their listings

---

### 2. `buddy_interests`
Tracks which users are interested in which listings.

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| listing_id | UUID | Yes | References buddy_listings, cascade delete |
| interested_user_id | UUID | Yes | User expressing interest, cascade delete |
| contact_request_sent | BOOLEAN | Yes | Default false, marked true when contact revealed |
| contact_request_accepted | BOOLEAN | Yes | Default false, for future messaging |
| message | TEXT | No | Optional message from interested user |
| created_at | TIMESTAMPTZ | Yes | When interest created |
| updated_at | TIMESTAMPTZ | Yes | Updated on status changes |

**Constraints:**
- Unique constraint on (listing_id, interested_user_id) - prevents duplicate interests

**Indexes:**
- Primary: `id`
- Foreign: `listing_id`
- Foreign: `interested_user_id`
- Performance: `contact_request_sent`

**RLS Policies:**
- Interested user can SELECT their own interests
- Listing owner can SELECT interests on their listings
- Only interested user can INSERT
- Only interested user can UPDATE their own interests
- Only interested user can DELETE their interests

---

### 3. `buddy_connections`
Records when two divers successfully connect/match.

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| listing_id | UUID | Yes | References buddy_listings, cascade delete |
| user_id_1 | UUID | Yes | First user, cascade delete |
| user_id_2 | UUID | Yes | Second user (interested), cascade delete |
| status | TEXT | Yes | matched/active/completed |
| connection_date | TIMESTAMPTZ | Yes | Auto-set when created |
| created_at | TIMESTAMPTZ | Yes | Record creation time |

**Constraints:**
- `status` must be one of: matched, active, completed
- `user_id_1 != user_id_2` - can't match with self

**Indexes:**
- Primary: `id`
- Foreign: `listing_id`
- Foreign: `user_id_1` and `user_id_2`
- Performance: `status`

**RLS Policies:**
- Users can VIEW connections they're part of
- Users can VIEW connections from listings they own
- System can INSERT connections
- Users can UPDATE their own connections

---

## Enum Values

### Experience Levels
```
'beginner'       - No PADI certification or PADI Open Water
'intermediate'   - PADI Advanced Open Water or equivalent
'advanced'       - PADI Rescue Diver or equivalent
'professional'   - PADI Divemaster or higher
```

### Dive Types
```
'reef'           - Coral reef diving
'wreck'          - Wreck diving
'open_water'     - Deep/open water diving
'cave'           - Cave diving (certification required)
'boat'           - Boat diving
'shore'          - Shore diving
```

### Connection Status
```
'matched'        - Initial match when contact revealed
'active'         - Currently diving together
'completed'      - Dive completed
```

---

## Data Relationships

```
┌─────────────────┐
│     users       │ (Supabase auth)
└────────┬────────┘
         │ (1:N)
         │
    ┌────▼──────────────────────┐
    │   buddy_listings           │
    │ ├─ id (UUID)              │
    │ ├─ user_id (FK → users)   │
    │ ├─ title, location, etc.  │
    │ └─ contact_hidden         │
    └────┬──────────┬────────────┘
         │ (1:N)    │ (1:N)
         │          │
         │    ┌─────▼──────────────┐
         │    │ buddy_interests    │
         │    │ ├─ id (UUID)       │
         │    │ ├─ listing_id (FK) │
         │    │ ├─ interested_user_id (FK) │
         │    │ └─ contact_request_sent │
         │    └────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ buddy_connections          │
    │ ├─ id (UUID)              │
    │ ├─ listing_id (FK)        │
    │ ├─ user_id_1 (FK → users) │
    │ ├─ user_id_2 (FK → users) │
    │ └─ status                 │
    └────────────────────────────┘
```

---

## Query Examples

### Find Active Listings
```sql
SELECT * FROM buddy_listings
WHERE is_active = true
AND start_date > NOW()
ORDER BY created_at DESC;
```

### Find User's Listings
```sql
SELECT * FROM buddy_listings
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Find Listings by Experience Level
```sql
SELECT * FROM buddy_listings
WHERE is_active = true
AND experience_level = 'advanced'
AND start_date > NOW();
```

### Count Interests Per Listing
```sql
SELECT listing_id, COUNT(*) as interest_count
FROM buddy_interests
GROUP BY listing_id;
```

### Find Who's Interested in My Listings
```sql
SELECT 
  bl.id,
  bl.title,
  COUNT(bi.id) as interested_count
FROM buddy_listings bl
LEFT JOIN buddy_interests bi ON bl.id = bi.listing_id
WHERE bl.user_id = 'user-uuid'
GROUP BY bl.id, bl.title;
```

### Find Listings Near a Location
```sql
SELECT * FROM buddy_listings
WHERE is_active = true
AND location ILIKE '%Eilat%'
ORDER BY created_at DESC;
```

### Find Connections for a User
```sql
SELECT * FROM buddy_connections
WHERE user_id_1 = 'user-uuid' OR user_id_2 = 'user-uuid'
AND status = 'active';
```

---

## Security Considerations

### Row-Level Security (RLS)
All tables have RLS enabled. Policies ensure:
1. Users can only see active listings or their own
2. Users can only modify their own listings/interests
3. Listing owners see interests on their listings
4. Interested users see their own interests

### Contact Privacy
- Contact information stored in plain text (consider encryption in production)
- Hidden by default (`contact_hidden = true`)
- Only revealed to listing owner when someone expresses interest
- Can be made public by user

### Ownership Validation
- All mutations validate user ownership
- Foreign keys use CASCADE DELETE for cleanup
- Duplicate interests prevented with UNIQUE constraint

---

## Cascade Delete Behavior

When a user is deleted:
- All `buddy_listings` created by them are deleted
- All `buddy_interests` from/to them are deleted
- All `buddy_connections` involving them are deleted

When a listing is deleted:
- All `buddy_interests` for that listing are deleted
- All `buddy_connections` for that listing are deleted

---

## Performance Optimizations

### Indexes Created
```sql
CREATE INDEX buddy_listings_user_id_idx ON buddy_listings(user_id);
CREATE INDEX buddy_listings_location_idx ON buddy_listings(location);
CREATE INDEX buddy_listings_experience_level_idx ON buddy_listings(experience_level);
CREATE INDEX buddy_listings_dive_type_idx ON buddy_listings(dive_type);
CREATE INDEX buddy_listings_start_date_idx ON buddy_listings(start_date);
CREATE INDEX buddy_listings_is_active_idx ON buddy_listings(is_active);

CREATE INDEX buddy_interests_listing_id_idx ON buddy_interests(listing_id);
CREATE INDEX buddy_interests_interested_user_id_idx ON buddy_interests(interested_user_id);
CREATE INDEX buddy_interests_contact_request_idx ON buddy_interests(contact_request_sent);

CREATE INDEX buddy_connections_listing_id_idx ON buddy_connections(listing_id);
CREATE INDEX buddy_connections_user_id_1_idx ON buddy_connections(user_id_1);
CREATE INDEX buddy_connections_user_id_2_idx ON buddy_connections(user_id_2);
CREATE INDEX buddy_connections_status_idx ON buddy_connections(status);
```

### Query Optimization Tips
1. Always filter by `is_active = true` first
2. Use experience_level or dive_type for early filtering
3. Pagination with LIMIT/OFFSET on large result sets
4. Create composite indexes for common filter combinations

---

## Monitoring & Maintenance

### Check Database Health
```sql
-- Check for orphaned interests
SELECT bi.* FROM buddy_interests bi
LEFT JOIN buddy_listings bl ON bi.listing_id = bl.id
WHERE bl.id IS NULL;

-- Check for orphaned connections
SELECT bc.* FROM buddy_connections bc
LEFT JOIN buddy_listings bl ON bc.listing_id = bl.id
WHERE bl.id IS NULL;

-- Count listings per user
SELECT user_id, COUNT(*) as listing_count
FROM buddy_listings
WHERE is_active = true
GROUP BY user_id
ORDER BY listing_count DESC;
```

### Backup Recommendations
- Daily backups for production
- Test restore procedures regularly
- Keep backup history for 30 days minimum

---

## Migration & Deployment

### Fresh Database
Run migration in order:
1. Existing auth tables (from Supabase)
2. Existing profile tables
3. This buddy feature migration

### Existing Database
Apply migration safely:
```bash
supabase migration up --dry-run  # Preview changes
supabase migration up            # Apply changes
```

### Rollback (if needed)
```bash
supabase migration down
```

---

## Future Schema Enhancements

### Buddy Reviews (not included)
```sql
CREATE TABLE buddy_reviews (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES buddy_listings,
  reviewer_id UUID REFERENCES users,
  reviewed_user_id UUID REFERENCES users,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ
);
```

### Messaging (not included)
```sql
CREATE TABLE buddy_messages (
  id UUID PRIMARY KEY,
  from_user_id UUID REFERENCES users,
  to_user_id UUID REFERENCES users,
  listing_id UUID REFERENCES buddy_listings,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
);
```

### Activity Logging (not included)
```sql
CREATE TABLE buddy_activity_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  action TEXT,
  listing_id UUID REFERENCES buddy_listings,
  created_at TIMESTAMPTZ
);
```

---

## Troubleshooting

### RLS Policy Errors
- Ensure user is authenticated
- Check that operations match allowed policies
- Verify user IDs match ownership requirements

### Cascade Delete Issues
- Verify foreign key constraints
- Check parent records exist
- Review orphaned records query above

### Migration Failed
- Check migration file syntax
- Verify table doesn't already exist
- Review Supabase logs for errors
- Try applying migration manually via console

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [UUID Generation](https://www.postgresql.org/docs/current/uuid-ossp.html)
