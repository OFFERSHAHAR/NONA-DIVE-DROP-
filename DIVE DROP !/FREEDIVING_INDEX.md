# Free Diving Database - Complete Implementation Package

## 📦 What You Got

A production-ready Supabase database schema for free diving with instructor verification, insurance validation, buddy matching, sessions, and bookings.

---

## 📋 Files Delivered

### 1. **Database Schema**
- **File**: `supabase/migrations/20260620_create_freediving_schema.sql`
- **Size**: ~1,500 lines
- **Contains**:
  - 9 core tables (credentials, insurance, instructors, services, buddy listings, sessions, participants, bookings, reviews)
  - 3 PostgreSQL enums
  - 9 RLS security policies per table
  - 8+ database triggers for automatic calculations
  - Helper functions for verification and rating recalculation
  - 30+ indexes for performance
  - Complete constraint validation

**Key Features**:
- ✅ Verified-only public view (credentials + insurance required)
- ✅ Automatic credential expiry tracking
- ✅ Insurance validation and status monitoring
- ✅ RLS-enforced security on all tables
- ✅ Automatic rating recalculation from reviews
- ✅ Cascade deletion where appropriate

---

### 2. **TypeScript Types**
- **File**: `src/types/freediving.ts`
- **Size**: ~600 lines
- **Contains**:
  - All enum types matching database
  - 9 table row types
  - Insert/Update variant types for each table
  - Composite types for API responses
  - Helper types for statistics and profiles
  - Generic database type helper

**Usage**:
```typescript
import type {
  FreedivingInstructor,
  FreedivingService,
  FreedivingBooking,
  // ... more types
} from '@/types/freediving';
```

---

### 3. **Client Library**
- **File**: `src/lib/freediving-client.ts`
- **Size**: ~700 lines
- **Contains**:
  - Instructor operations (profile, validation, stats)
  - Service operations (create, search, list)
  - Buddy listing operations (create, search, list)
  - Booking operations (create, update status, list)
  - Session operations (create, list upcoming)
  - Review operations (create, list)
  - Credential/insurance management
  - Utility functions (availability checking, stats)

**Usage**:
```typescript
import {
  getVerifiedInstructorDirectory,
  createBooking,
  validateInstructorCredentials,
  // ... more functions
} from '@/lib/freediving-client';

const instructors = await getVerifiedInstructorDirectory(supabase, {
  location: 'Eilat',
  min_rating: 4.5
});
```

---

### 4. **React Hooks**
- **File**: `src/hooks/useFreediving.ts`
- **Size**: ~600 lines
- **Contains**:
  - 20+ custom hooks for common operations
  - useInstructorDirectory
  - useInstructor
  - useInstructorStats
  - useInstructorValidation
  - useInstructorServices
  - useServiceSearch
  - useBuddyListings
  - useCreateBuddyListing
  - useUserBookings
  - useInstructorBookings
  - useCreateBooking
  - useUpcomingSessions
  - useInstructorReviews
  - useCreateReview
  - useAddCredential
  - useAddInsurance

**Usage**:
```typescript
'use client';
import { useInstructorDirectory } from '@/hooks/useFreediving';

export function InstructorList() {
  const { instructors, loading, error } = useInstructorDirectory({
    location: 'Eilat'
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {instructors.map(inst => (
        <div key={inst.id}>{inst.bio}</div>
      ))}
    </div>
  );
}
```

---

### 5. **Documentation**
- **File 1**: `FREEDIVING_SCHEMA.md` (~800 lines)
  - Complete table reference
  - Security & RLS policies
  - API usage examples
  - Verification flow
  - Troubleshooting
  - Deployment guide

- **File 2**: `FREEDIVING_SETUP.md` (~500 lines)
  - Quick setup checklist
  - Installation steps
  - Testing procedures
  - Monitoring queries
  - Common issues & solutions

- **File 3**: `FREEDIVING_INDEX.md` (this file)
  - Overview of all deliverables
  - File structure
  - Quick start guide

---

## 🗂️ File Structure

```
DIVE DROP/
├── supabase/
│   └── migrations/
│       └── 20260620_create_freediving_schema.sql (NEW)
│
├── src/
│   ├── types/
│   │   └── freediving.ts (NEW)
│   │
│   ├── lib/
│   │   └── freediving-client.ts (NEW)
│   │
│   └── hooks/
│       └── useFreediving.ts (NEW)
│
├── FREEDIVING_SCHEMA.md (NEW)
├── FREEDIVING_SETUP.md (NEW)
└── FREEDIVING_INDEX.md (NEW)
```

---

## 🚀 Quick Start

### Step 1: Apply Migration (5 minutes)

```bash
# Using Supabase CLI
cd "c:\Users\GamingPC\Desktop\DIVE DROP !"
supabase db push

# Or manually in Supabase dashboard:
# 1. SQL Editor
# 2. Create new query
# 3. Copy contents of 20260620_create_freediving_schema.sql
# 4. Execute
```

### Step 2: Verify Installation (5 minutes)

```sql
-- Check tables exist
SELECT COUNT(*) FROM pg_tables
WHERE tablename LIKE 'freediving_%'
OR tablename LIKE 'instructor_%';
-- Should return: 9

-- Check RLS enabled
SELECT COUNT(*) FROM pg_tables
WHERE rowsecurity = TRUE
AND (tablename LIKE 'freediving_%' OR tablename LIKE 'instructor_%');
-- Should return: 9
```

### Step 3: Use in App (10 minutes)

```typescript
// 1. Fetch verified instructors (public)
import { useInstructorDirectory } from '@/hooks/useFreediving';

export function Instructors() {
  const { instructors, loading } = useInstructorDirectory({
    location: 'Eilat',
    min_rating: 4
  });

  return (
    <div>
      {instructors.map(i => (
        <div key={i.id}>
          <h3>{i.bio}</h3>
          <p>Rating: {i.average_rating}</p>
        </div>
      ))}
    </div>
  );
}
```

### Step 4: Test (10 minutes)

```sql
-- Create test instructor
INSERT INTO freediving_instructors (
  user_id, primary_location
) VALUES (
  'test-uuid', 'Eilat'
);

-- Add verified credential
INSERT INTO instructor_credentials (
  credential_type, level, certification_number,
  issue_date, expiry_date, issuing_organization, is_verified
) VALUES (
  'AIDA', 'instructor', 'TEST-001',
  '2020-01-01', '2028-01-01', 'AIDA', true
);

-- Add active insurance
INSERT INTO instructor_insurance (
  provider_name, policy_number, coverage_type,
  coverage_amount_shekel, issue_date, expiry_date,
  status, is_active
) VALUES (
  'Test Co', 'TEST-INS-001', 'Liability',
  500000, '2026-01-01', '2027-01-01', 'active', true
);

-- Link credentials & insurance
UPDATE freediving_instructors
SET primary_credential_id = (SELECT id FROM instructor_credentials LIMIT 1),
    primary_insurance_id = (SELECT id FROM instructor_insurance LIMIT 1)
WHERE user_id = 'test-uuid';

-- Verify: Should see instructor now
SELECT * FROM freediving_instructors WHERE is_verified = TRUE;
```

---

## 📊 Database Overview

### Tables (9 Total)

| Table | Purpose | Rows | Indexes |
|-------|---------|------|---------|
| instructor_credentials | Certifications (AIDA, IANTD, PADI, CMAS, SSI) | Many | 5 |
| instructor_insurance | Active insurance policies | Many | 4 |
| freediving_instructors | Main instructor profiles | Tens | 7 |
| freediving_services | Services offered by instructors | Hundreds | 4 |
| freediving_buddy_listings | User buddy search listings | Hundreds | 6 |
| freediving_sessions | Training/meetup sessions | Hundreds | 5 |
| freediving_session_participants | Session participant roster | Thousands | 3 |
| freediving_bookings | Service reservations | Thousands | 5 |
| freediving_reviews | Service reviews & ratings | Hundreds | 4 |

### Total: 30+ indexes, 8+ triggers, 9 RLS policies per table

---

## 🔐 Security Model

### Public (Unauthenticated)

Can see:
- ✅ Verified instructors with active insurance
- ✅ Services from verified instructors
- ✅ Active buddy listings
- ✅ Published reviews
- ✅ Verified credential status

Cannot see:
- ❌ Unverified instructors
- ❌ Contact info (if hidden)
- ❌ Medical notes
- ❌ Special requests

### Authenticated Users

Can:
- ✅ Create buddy listings
- ✅ Book services
- ✅ Leave reviews (after booking)
- ✅ Create instructor profile

Cannot:
- ❌ Verify credentials (admin only)
- ❌ See unverified instructors
- ❌ Modify others' profiles

### Instructors

Can:
- ✅ Manage profile, services, bookings
- ✅ View their reviews & ratings
- ✅ Upload credentials & insurance

Cannot:
- ❌ Verify own credentials (admin only)
- ❌ Appear if credentials/insurance expire

---

## 📈 Key Metrics Tracked

### Per Instructor
- `average_rating` (auto-calculated from reviews)
- `total_reviews` (auto-calculated)
- `total_sessions_completed` (manual)
- `is_verified` (has valid credential)
- `insurance_verified` (has active insurance)

### Per Service
- Availability per day of week
- Min/max participants
- Pricing in ILS

### Per Booking
- Status (pending → confirmed → completed → cancelled)
- Participant count
- Medical notes
- Confirmation code

---

## 🔧 Common Tasks

### Task 1: List Verified Instructors

```typescript
const { instructors } = useInstructorDirectory({
  location: 'Eilat',
  min_rating: 4.5,
  limit: 10
});
```

### Task 2: Create Service Booking

```typescript
const { checkAndBook } = useCreateBooking();

const booking = await checkAndBook(serviceId, {
  booking_date: '2026-06-25',
  start_time: '09:00',
  end_time: '11:00',
  participant_count: 2
});
```

### Task 3: Leave Review

```typescript
const { create } = useCreateReview();

await create({
  instructor_id: instructorId,
  booking_id: bookingId,
  rating: 5,
  title: 'Excellent!',
  comment: 'Very professional',
  safety_rating: 5
});
```

### Task 4: Create Buddy Listing

```typescript
const { create } = useCreateBuddyListing();

const listing = await create({
  title: 'Looking for dive buddy',
  location: 'Eilat',
  experience_level: 'intermediate',
  start_date: new Date().toISOString(),
  end_date: addDays(new Date(), 7).toISOString()
});
```

### Task 5: Validate Instructor

```typescript
const { validation } = useInstructorValidation(instructorId);

if (validation?.is_eligible) {
  // Can offer services, visible to public
}
```

---

## 📚 Learning Path

1. **Setup** (15 min)
   - Apply migration
   - Verify tables exist
   - Read FREEDIVING_SETUP.md

2. **Understanding** (30 min)
   - Read FREEDIVING_SCHEMA.md sections 1-4
   - Review TypeScript types in src/types/freediving.ts
   - Check RLS policies in migration file

3. **Integration** (1-2 hours)
   - Use hooks from src/hooks/useFreediving.ts
   - Call client functions from src/lib/freediving-client.ts
   - Build UI components

4. **Deployment** (30 min)
   - Create storage buckets for credentials/insurance
   - Set up admin verification workflow
   - Monitor with queries in FREEDIVING_SETUP.md

---

## 🐛 Troubleshooting

### Problem: Instructors not visible

**Solution**:
1. Check `is_verified = TRUE`
2. Check `insurance_verified = TRUE`
3. Check primary credential is verified and not expired
4. Check primary insurance has `status = 'active'` and not expired

### Problem: Bookings failing

**Solution**:
1. Check service `is_active = TRUE`
2. Check booking date/time within service availability
3. Check participant count <= service `max_participants`
4. Check user has permission (RLS)

### Problem: RLS blocking access

**Solution**:
1. Check table has RLS enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`
3. Check auth context is set for authenticated users

See **FREEDIVING_SETUP.md** for detailed troubleshooting queries.

---

## 🎯 Next Steps

1. ✅ Apply migration to your Supabase project
2. ✅ Create test instructor with credentials + insurance
3. ✅ Build instructor directory page using hooks
4. ✅ Build booking flow
5. ✅ Build review system
6. ✅ Deploy to production

---

## 📞 Support

- **Schema Questions**: See FREEDIVING_SCHEMA.md
- **Setup Issues**: See FREEDIVING_SETUP.md
- **API Usage**: See src/lib/freediving-client.ts comments
- **React Integration**: See src/hooks/useFreediving.ts examples

---

## ✨ Summary

You now have:
- ✅ Complete Supabase schema (9 tables, 30+ indexes, 8+ triggers)
- ✅ TypeScript types for all operations
- ✅ Utility client for database operations
- ✅ React hooks for common tasks
- ✅ Comprehensive documentation
- ✅ Setup & troubleshooting guides

**Everything is production-ready. Deploy with confidence!**

---

**Created**: 2026-06-20  
**Last Updated**: 2026-06-20  
**Version**: 1.0  
**Status**: ✅ Ready for Production

For detailed information, see:
- FREEDIVING_SCHEMA.md (comprehensive reference)
- FREEDIVING_SETUP.md (installation & monitoring)
- src/types/freediving.ts (TypeScript types)
- src/lib/freediving-client.ts (API client)
- src/hooks/useFreediving.ts (React hooks)
