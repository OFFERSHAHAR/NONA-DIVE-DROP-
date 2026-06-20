# Dive Drop Buddy Matching - Setup & Deployment Guide

## Prerequisites

1. **Supabase Project**: Create one at https://supabase.com
2. **Supabase CLI**: Install from https://supabase.com/docs/guides/cli
3. **Node.js**: v16+ for local development
4. **Git**: For version control

---

## Local Development Setup

### 1. Initialize Supabase Locally

```bash
# Navigate to project root
cd "DIVE DROP !"

# Initialize Supabase
supabase init

# Start local Supabase stack (requires Docker)
supabase start
```

This starts:
- PostgreSQL database (localhost:5432)
- Supabase API (localhost:3000)
- Supabase Studio (localhost:3000)

### 2. Apply Migrations

```bash
# Apply migration
supabase migration up

# Or push to local database
supabase db push
```

### 3. Verify Schema

```bash
# Connect to local PostgreSQL
psql postgresql://postgres:postgres@localhost:5432/postgres

# Check tables
\dt public.*;

# Check RLS policies
SELECT policyname, tablename FROM pg_policies;

# Check triggers
SELECT trigger_name, event_manipulation, table_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

### 4. Seed Test Data (Optional)

Create `supabase/seeds/001_test_data.sql`:

```sql
-- Insert test users (via auth.users)
-- Note: In local dev, you can manually create users via Supabase Studio

-- Insert test listings
INSERT INTO buddy_listings (
  user_id, location, date_from, date_to, diving_level, 
  dive_type, description, languages, expires_at, status
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'אילת',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '14 days',
  'advanced',
  ARRAY['reef', 'boat'],
  'דולף צוללים עם ניסיון בטכני',
  ARRAY['Hebrew', 'English'],
  NOW() + INTERVAL '30 days',
  'active'
);

-- Run seed
supabase seed run
```

---

## Production Deployment

### 1. Configure Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Also create .env.production if needed
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Link Supabase Project

```bash
# Link to remote project
supabase link --project-ref your-project-id

# Verify connection
supabase status
```

### 3. Run Migrations

```bash
# Preview migration
supabase migration push --dry-run

# Apply migration to production
supabase migration push --remote

# Verify remote schema
supabase db pull
```

### 4. Set Up Authentication

In Supabase Dashboard:

1. **Auth > Providers**: Enable email/password or OAuth
2. **Auth > Policies**: Configure redirect URLs
3. **Auth > Email**: Configure email templates for Hebrew support

```html
<!-- Example Hebrew email template for confirmation -->
<h2>אימות המייל שלך</h2>
<p>לחץ על הלינק להלן לאימות המייל שלך:</p>
<a href="{{ .ConfirmationURL }}">אימות</a>
```

### 5. Enable RLS Enforcement

In Supabase Dashboard:

1. Navigate to **Authentication > Policies**
2. Verify RLS is enabled on all tables:
   - buddy_listings
   - buddy_interests
   - buddy_connections
   - buddy_messages

```sql
-- Verify RLS is enabled (via SQL)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- All should show rowsecurity = true
```

### 6. Backup Database

```bash
# Create backup
pg_dump -h your-db-host -U postgres database_name > backup.sql

# Or use Supabase CLI
supabase db backup create --ref your-project-id
```

---

## Development Workflow

### TypeScript Type Generation (Optional)

Supabase can auto-generate TypeScript types:

```bash
# Generate types from schema
supabase gen types typescript --local > src/types/supabase.ts

# Or from remote
supabase gen types typescript --project-id your-project-id > src/types/supabase.ts
```

### Testing RLS Policies

Create `tests/rls.test.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

// Test user 1 (cannot see user 2's private data)
const user1Client = createClient(url, anonKey);

// Simulate user 1 login
await user1Client.auth.signInWithPassword({
  email: 'user1@example.com',
  password: 'password',
});

// Try to view all listings (should only see active ones from others)
const { data: listings, error } = await user1Client
  .from('buddy_listings')
  .select('*');

expect(listings).toBeDefined();
expect(listings?.every(l => l.status === 'active')).toBe(true);
expect(listings?.every(l => l.user_id !== user1.id)).toBe(true);
```

### Integration Tests

Create `tests/buddy-client.integration.test.ts`:

```typescript
import { BuddyClient } from '@/lib/supabase-buddy-client';

describe('BuddyClient Integration Tests', () => {
  let client1: BuddyClient;
  let client2: BuddyClient;

  beforeEach(() => {
    // Initialize clients with different users
    client1 = new BuddyClient(createClientForUser('user1'));
    client2 = new BuddyClient(createClientForUser('user2'));
  });

  test('User can express interest in another user\'s listing', async () => {
    // User 2 creates listing
    const listing = await client2.createListing({
      location: 'אילת',
      date_from: '2026-07-01',
      date_to: '2026-07-07',
      diving_level: 'advanced',
      dive_type: ['reef'],
    });

    // User 1 expresses interest
    const interest = await client1.expressInterest({
      listing_id: listing.id,
      message: 'Let\'s dive together!',
    });

    expect(interest.status).toBe('pending');
    expect(interest.listing_id).toBe(listing.id);
  });

  test('Listing owner can accept interest and create connection', async () => {
    // ... setup listing and interest ...

    // User 2 accepts
    const result = await client2.acceptInterest(interest.id);

    expect(result.connection_id).toBeDefined();

    // Verify connection exists for both users
    const connections1 = await client1.getConnections();
    const connections2 = await client2.getConnections();

    expect(connections1.length).toBeGreaterThan(0);
    expect(connections2.length).toBeGreaterThan(0);
  });

  test('Connected users can send messages', async () => {
    // ... setup and accept interest ...

    // User 1 sends message
    const message = await client1.sendMessage({
      receiver_id: user2.id,
      message: 'When shall we dive?',
    });

    // User 2 receives
    const received = await client2.getConversation(user1.id);
    expect(received.length).toBeGreaterThan(0);
    expect(received[0].message).toBe('When shall we dive?');
  });
});
```

---

## Monitoring & Maintenance

### 1. Check Database Health

```bash
# View database size
supabase status

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Monitor RLS Performance

```sql
-- Check slow queries with RLS
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE query LIKE '%SELECT%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 3. View Logs

```bash
# Real-time logs
supabase functions list

# Check edge function logs
supabase functions logs
```

---

## Troubleshooting

### Issue: Migration Fails

```bash
# Check migration status
supabase migration list --remote

# View error details
supabase migration push --remote --dry-run

# Reset local database
supabase db reset
```

### Issue: RLS Policies Not Applied

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies exist
SELECT policyname, tablename, permissive 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test policy
-- As non-owner, try to SELECT from buddy_listings
SELECT * FROM buddy_listings WHERE user_id != auth.uid();
```

### Issue: Foreign Key Constraint Violation

```sql
-- Check constraints
SELECT constraint_name, table_name
FROM information_schema.referential_constraints
WHERE constraint_schema = 'public';

-- Verify auth.users table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'auth' AND table_name = 'users';
```

### Issue: Contact Info Visible When Shouldn't Be

1. Contact info is NOT stored in `buddy_listings` (correct)
2. Contact info is revealed via `get_buddy_profile()` function
3. Check that function has proper authorization checks

```sql
-- Verify function
\df get_buddy_profile
```

---

## Performance Tuning

### 1. Index Usage

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Unused indexes (candidates for removal)
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%pkey%';
```

### 2. Query Analysis

```sql
-- EXPLAIN ANALYZE active listings query
EXPLAIN ANALYZE
SELECT * FROM buddy_listings
WHERE status='active' AND expires_at > NOW()
ORDER BY created_at DESC;

-- Should use: idx_buddy_listings_status_expires
```

### 3. Connection Pooling

In `next.config.ts`:

```typescript
// Use pgBouncer for connection pooling
const dbUrl = process.env.DATABASE_URL;
// Replace ?sslmode=require with ?schema=public&sslmode=require
```

---

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] All policies follow principle of least privilege
- [ ] Contact info never stored in listings table
- [ ] Service role key never exposed in client code
- [ ] Authentication required for all data operations
- [ ] HTTPS enforced (Supabase default)
- [ ] Database backups enabled
- [ ] Audit logging enabled (via triggers)
- [ ] Rate limiting configured (if using Edge Functions)
- [ ] CORS configured correctly

---

## Scaling Considerations

### 1. Database Scaling

As user base grows:

1. **Vertical Scaling**: Upgrade Supabase plan
2. **Horizontal Scaling**: Add read replicas
3. **Archival**: Move old data to cold storage

### 2. Real-Time Subscriptions

For many concurrent users:

1. Use targeted subscriptions (not broadcast)
2. Implement debouncing on client
3. Consider pagination for large datasets

### 3. Caching Strategy

```typescript
// Cache active listings (60 seconds)
const CACHE_KEY = 'browsable_listings';
const cached = await redis.get(CACHE_KEY);
if (!cached) {
  const listings = await buddyClient.getBrowsableListings();
  await redis.setex(CACHE_KEY, 60, JSON.stringify(listings));
}
```

---

## Disaster Recovery

### 1. Database Backup & Restore

```bash
# Create backup
supabase db backup create --ref your-project-id

# List backups
supabase db backup list --ref your-project-id

# Restore from backup (manual via Supabase Dashboard)
```

### 2. Migration Rollback

```bash
# View migrations
supabase migration list --remote

# If needed, create rollback migration
supabase migration new rollback_001

# Then manually add DROP statements in new migration
```

### 3. Data Integrity

```sql
-- Verify no orphaned interests (listing deleted but interest remains)
SELECT COUNT(*) FROM buddy_interests bi
WHERE NOT EXISTS (SELECT 1 FROM buddy_listings bl WHERE bl.id = bi.listing_id);

-- Should return 0 (on cascade delete, this shouldn't happen)
```

---

## Next Steps

1. **Test RLS Policies**: Run integration tests before production
2. **Load Testing**: Use tools like k6 or Artillery to test performance
3. **Monitoring**: Set up alerts for long-running queries
4. **Documentation**: Keep schema docs in sync with changes
5. **Team Training**: Ensure team understands RLS and security model

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Migrations Guide**: https://supabase.com/docs/guides/cli/local-development
- **API Reference**: https://supabase.com/docs/reference/javascript/introduction

---

## Changelog

### v1.0.0 - Initial Release
- Core schema with buddy_listings, buddy_interests, buddy_connections, buddy_messages
- RLS policies for privacy and authorization
- Automatic expiry and timestamp triggers
- Stored procedures for interest acceptance
- Hebrew + English support via metadata
