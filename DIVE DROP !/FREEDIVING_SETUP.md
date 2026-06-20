# Free Diving Schema - Quick Setup Guide

## 1. Apply the Migration

### Using Supabase CLI

```bash
# Navigate to project directory
cd "c:\Users\GamingPC\Desktop\DIVE DROP !"

# Link to Supabase project (if not already linked)
supabase link

# Apply migration
supabase migration up

# Or push to remote
supabase db push
```

### Manual: Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Create new query
3. Copy entire contents of `supabase/migrations/20260620_create_freediving_schema.sql`
4. Execute

## 2. Verify Installation

### Check Tables Created

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'freediving_%' OR tablename LIKE 'instructor_%')
ORDER BY tablename;
```

Expected tables:
```
freediving_bookings
freediving_buddy_listings
freediving_reviews
freediving_services
freediving_session_participants
freediving_sessions
instructor_credentials
instructor_insurance
freediving_instructors
```

### Check RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'freediving_%' OR tablename LIKE 'instructor_%')
ORDER BY tablename;
```

All should show `rowsecurity = true`

### Check Triggers Exist

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND (event_object_table LIKE 'freediving_%' OR event_object_table LIKE 'instructor_%')
ORDER BY event_object_table;
```

Expected triggers:
- `trigger_update_*_timestamp` on each table
- `trigger_recalculate_instructor_rating` on freediving_reviews

## 3. Test RLS Policies

### Test as Anonymous User (Public Access)

```sql
-- Clear auth context (simulate anonymous)
SET request.jwt.claims = '{}';

-- Should return 0 rows (no verified instructors yet)
SELECT COUNT(*) FROM freediving_instructors;
```

### Test as Authenticated User

```sql
-- Simulate authenticated user
SET request.jwt.claims = '{"sub":"test-user-uuid","email":"test@example.com"}';

-- Should allow insert
INSERT INTO freediving_instructors (user_id, primary_location)
VALUES ('test-user-uuid', 'Test Location');

-- Should see own profile
SELECT * FROM freediving_instructors WHERE user_id = 'test-user-uuid';
```

## 4. Create Storage Buckets (Optional)

For credential and insurance documents:

```sql
-- Create bucket for credentials
INSERT INTO storage.buckets (id, name, public)
VALUES ('credentials', 'credentials', false);

-- Create bucket for insurance documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance', 'insurance', false);
```

### Set RLS on Storage

In Supabase Dashboard → Storage → Policies:

**Credentials Bucket**:
```sql
-- Allow users to upload/view own credentials
CREATE POLICY "Users can manage own credentials"
ON storage.objects FOR ALL
USING (bucket_id = 'credentials' AND (select auth.uid()::text) = owner)
WITH CHECK (bucket_id = 'credentials' AND (select auth.uid()::text) = owner);
```

## 5. Update TypeScript Types

Copy types to your project:

```bash
# Types already created at src/types/freediving.ts
# No additional setup needed
```

Test in your app:

```typescript
import type { FreedivingInstructor, FreedivingService } from '@/types/freediving';
```

## 6. Initialize Client Library

The client utilities are in `src/lib/freediving-client.ts`:

```typescript
import { 
  getVerifiedInstructorDirectory,
  createInstructorProfile,
  validateInstructorCredentials,
  createBooking,
  getInstructorStats
} from '@/lib/freediving-client';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Ready to use!
const instructors = await getVerifiedInstructorDirectory(supabase, {
  location: 'Eilat'
});
```

## 7. Create Test Data (Development)

### Add Test Instructor

```sql
-- 1. Create test user (via auth first, or use existing)
-- Use Supabase Auth UI or create via SQL

-- 2. Create instructor profile
INSERT INTO freediving_instructors (
  user_id,
  primary_location,
  bio,
  years_experience,
  is_verified,
  insurance_verified
) VALUES (
  'YOUR_TEST_USER_ID',
  'Test Location',
  'Test Instructor',
  5,
  true,
  true
);

-- 3. Create credential
INSERT INTO instructor_credentials (
  credential_type,
  level,
  certification_number,
  issue_date,
  expiry_date,
  issuing_organization,
  is_verified
) VALUES (
  'AIDA',
  'instructor',
  'TEST-12345',
  '2020-01-01',
  '2028-01-01',
  'AIDA',
  true
);

-- 4. Create insurance
INSERT INTO instructor_insurance (
  provider_name,
  policy_number,
  coverage_type,
  coverage_amount_shekel,
  issue_date,
  expiry_date,
  status,
  is_active
) VALUES (
  'Test Insurance',
  'TEST-INS-001',
  'Liability',
  500000,
  '2026-01-01',
  '2027-01-01',
  'active',
  true
);

-- 5. Link to instructor
UPDATE freediving_instructors
SET primary_credential_id = (SELECT id FROM instructor_credentials LIMIT 1),
    primary_insurance_id = (SELECT id FROM instructor_insurance LIMIT 1)
WHERE user_id = 'YOUR_TEST_USER_ID';
```

### Add Test Service

```sql
INSERT INTO freediving_services (
  instructor_id,
  name,
  description,
  service_type,
  price_shekel,
  duration_minutes,
  min_level,
  max_participants
) VALUES (
  (SELECT id FROM freediving_instructors LIMIT 1),
  'Beginner Freediving Course',
  'Introduction to freediving basics',
  'courses',
  500,
  120,
  'recreational',
  4
);
```

### Add Test Buddy Listing

```sql
INSERT INTO freediving_buddy_listings (
  user_id,
  title,
  location,
  start_date,
  end_date,
  experience_level,
  description
) VALUES (
  'ANY_USER_ID',
  'Looking for dive buddy',
  'Eilat, Israel',
  NOW(),
  NOW() + INTERVAL '7 days',
  'intermediate',
  'Looking for safe, relaxed diving'
);
```

## 8. Security Checklist

- [ ] All RLS policies enabled
- [ ] Credentials verified only by admins
- [ ] Insurance documents stored in private bucket
- [ ] Public view shows only verified instructors with active insurance
- [ ] User can't modify other users' profiles
- [ ] Reviews only allowed after booking completion
- [ ] Booking dates validated against service availability

## 9. Monitoring & Maintenance

### Monitor Expiring Credentials

```sql
SELECT 
  fi.id,
  ic.certification_number,
  ic.expiry_date,
  (ic.expiry_date - NOW()::DATE) as days_until_expiry
FROM freediving_instructors fi
JOIN instructor_credentials ic ON ic.id = fi.primary_credential_id
WHERE ic.expiry_date < NOW()::DATE + INTERVAL '30 days'
AND ic.expiry_date > NOW()::DATE
ORDER BY ic.expiry_date;
```

### Monitor Expiring Insurance

```sql
SELECT 
  fi.id,
  ii.policy_number,
  ii.expiry_date,
  (ii.expiry_date - NOW()::DATE) as days_until_expiry
FROM freediving_instructors fi
JOIN instructor_insurance ii ON ii.id = fi.primary_insurance_id
WHERE ii.expiry_date < NOW()::DATE + INTERVAL '30 days'
AND ii.expiry_date > NOW()::DATE
ORDER BY ii.expiry_date;
```

### Monitor Unverified Instructors

```sql
SELECT 
  id,
  user_id,
  primary_location,
  is_verified,
  insurance_verified,
  created_at
FROM freediving_instructors
WHERE is_verified = FALSE
OR insurance_verified = FALSE
ORDER BY created_at DESC;
```

### Check Average Ratings

```sql
SELECT 
  fi.id,
  fi.average_rating,
  fi.total_reviews,
  COUNT(DISTINCT fb.id) as total_bookings
FROM freediving_instructors fi
LEFT JOIN freediving_services fs ON fs.instructor_id = fi.id
LEFT JOIN freediving_bookings fb ON fb.service_id = fs.id
GROUP BY fi.id
ORDER BY fi.average_rating DESC;
```

## 10. Performance Optimization

### Add Composite Indexes (Optional)

```sql
-- For common searches
CREATE INDEX idx_instructors_verified_location 
ON freediving_instructors(is_verified, insurance_verified, primary_location);

CREATE INDEX idx_services_instructor_active 
ON freediving_services(instructor_id, is_active);

CREATE INDEX idx_bookings_user_date 
ON freediving_bookings(booker_user_id, booking_date);

CREATE INDEX idx_sessions_date_status 
ON freediving_sessions(session_date, status);

-- Check index usage
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename LIKE 'freediving_%' OR tablename LIKE 'instructor_%')
ORDER BY tablename, indexname;
```

## 11. Backups & Recovery

### Create Backup

```bash
# Export schema
pg_dump -h db.xxxx.supabase.co -U postgres -d postgres \
  --schema-only \
  --table='freediving_*' \
  --table='instructor_*' \
  > freediving_schema_backup.sql
```

### Restore from Backup

```bash
psql -h db.xxxx.supabase.co -U postgres -d postgres \
  < freediving_schema_backup.sql
```

## 12. Common Issues & Solutions

### Issue: Instructors not visible to public

**Solution**:
```sql
-- Check status
SELECT is_verified, insurance_verified, is_active
FROM freediving_instructors
WHERE user_id = 'test-user-uuid';

-- Both should be TRUE
UPDATE freediving_instructors
SET is_verified = TRUE, insurance_verified = TRUE
WHERE user_id = 'test-user-uuid';
```

### Issue: RLS blocking queries

**Solution**:
```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'freediving_instructors';

-- If FALSE, enable
ALTER TABLE freediving_instructors ENABLE ROW LEVEL SECURITY;
```

### Issue: Credentials not appearing

**Solution**:
```sql
-- Check if credential exists and is verified
SELECT * FROM instructor_credentials
WHERE certification_number = 'TEST-12345';

-- Verify connection to instructor
SELECT primary_credential_id FROM freediving_instructors
WHERE id = 'instructor-uuid';
```

## 13. Next Steps

1. ✅ Apply migration
2. ✅ Verify tables and RLS
3. ✅ Set up storage buckets (optional)
4. ✅ Create test data
5. ✅ Test RLS policies
6. ✅ Build UI components
7. ✅ Integrate with app
8. ✅ Set up monitoring

---

**Setup Complete!** Your Free Diving database is ready for production.

For detailed usage, see `FREEDIVING_SCHEMA.md`

**Questions?** Check the troubleshooting section or review RLS policies in migration file.
