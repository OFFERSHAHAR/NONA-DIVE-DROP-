# Free Diving Database Schema - DIVE DROP

Complete Supabase database schema for Free Diving features with instructor verification, insurance validation, buddy matching, sessions, and bookings.

## Table of Contents

1. [Overview](#overview)
2. [Database Tables](#database-tables)
3. [Security & RLS Policies](#security--rls-policies)
4. [Key Features](#key-features)
5. [API Usage](#api-usage)
6. [Verification Flow](#verification-flow)
7. [Deployment](#deployment)

---

## Overview

The Free Diving schema provides a complete ecosystem for:

- **Instructor Management**: Registration, credentials, insurance tracking
- **Service Listings**: Freediving courses, buddy programs, competitions
- **Buddy Matching**: Users finding dive partners
- **Session Management**: Scheduling and participant tracking
- **Booking System**: Service reservations and confirmations
- **Reviews & Ratings**: Quality assurance and reputation

### Key Principles

- ✅ **Verified-Only Public View**: Only instructors with valid credentials AND active insurance are visible
- ✅ **RLS Enforcement**: Row-Level Security on all tables
- ✅ **Comprehensive Validation**: Database constraints + application-level checks
- ✅ **Automatic Status Updates**: Triggers for rating calculations, timestamps
- ✅ **Safety Focus**: Insurance, credentials, depth tracking, medical clearance

---

## Database Tables

### 1. `instructor_credentials`

Stores certification data from recognized bodies (AIDA, IANTD, PADI, CMAS, SSI).

```sql
Fields:
- id (UUID, PK)
- credential_type (AIDA | IANTD | PADI | CMAS | SSI | OTHER)
- level (recreational | intermediate | advanced | instructor | master_instructor)
- certification_number (TEXT, UNIQUE)
- issue_date, expiry_date (DATE)
- issuing_organization (TEXT)
- is_verified (BOOLEAN) - Only admin/system can set
- verified_by, verified_at (audit trail)
- credential_document_url (storage link)
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: credential_type, level, is_verified, expiry_date, certification_number

**Constraints**:
- `issue_date < expiry_date`
- Unique certification_number per credential type

**RLS**:
- Public: View verified, non-expired credentials only
- Instructors: View own credentials
- Instructors: Create credentials
- System only: Verify/update credentials

---

### 2. `instructor_insurance`

Tracks active insurance policies required for instructor operation.

```sql
Fields:
- id (UUID, PK)
- provider_name, policy_number (UNIQUE)
- coverage_type (TEXT: e.g., "Liability", "Medical")
- coverage_amount_shekel (DECIMAL)
- issue_date, expiry_date (DATE)
- status (active | expired | pending_renewal)
- is_active (BOOLEAN)
- insurance_document_url (storage link)
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: status, is_active, expiry_date, policy_number

**Constraints**:
- `issue_date < expiry_date`
- `coverage_amount_shekel > 0`

**RLS**:
- Public: View active, non-expired insurance status only
- Instructors: View own insurance
- Instructors: Create/update own insurance

---

### 3. `freediving_instructors`

Main instructor profile table linking credentials and insurance.

```sql
Fields:
- id (UUID, PK)
- user_id (UUID, FK to auth.users, UNIQUE)
- bio, phone, years_experience
- avatar_url, cover_image_url
- primary_location, latitude, longitude, service_radius_km
- primary_credential_id (FK to instructor_credentials)
- primary_insurance_id (FK to instructor_insurance)
- is_verified (BOOLEAN) - Has valid credentials
- insurance_verified (BOOLEAN) - Has active insurance
- average_rating, total_reviews, total_sessions_completed
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: user_id, is_verified, insurance_verified, is_active, primary_location, average_rating, created_at

**RLS**:
- **Public**: View ONLY if `is_verified = TRUE AND insurance_verified = TRUE AND is_active = TRUE`
- Instructors: View own profile
- Users: Create instructor profile
- Instructors: Update own profile

---

### 4. `freediving_services`

Services offered by verified instructors.

```sql
Fields:
- id (UUID, PK)
- instructor_id (FK to freediving_instructors)
- name, description
- service_type (apnea | courses | partner | competition | depth | meditation | safety | rescue)
- price_shekel, currency, duration_minutes
- min_level (recreational | intermediate | advanced | instructor | master_instructor)
- max_participants
- available_mon-sun (BOOLEAN for each day)
- start_hour, end_hour (TIME)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: instructor_id, service_type, is_active, created_at

**RLS**:
- **Public**: View ONLY if `is_active = TRUE` AND instructor is verified with active insurance
- Instructors: View own services
- Instructors: Create/update/delete own services

---

### 5. `freediving_buddy_listings`

User-created listings searching for dive partners.

```sql
Fields:
- id (UUID, PK)
- user_id (FK to auth.users)
- title, description
- location
- start_date, end_date (TIMESTAMP)
- experience_level (FreedivingLevel enum)
- max_depth_meters
- max_participants
- contact_method, contact_hidden
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: user_id, location, experience_level, is_active, start_date, created_at

**RLS**:
- Public: View active listings only
- Users: View own listings
- Users: Create/update/delete own listings

---

### 6. `freediving_sessions`

Structured training/meetup sessions organized by instructors.

```sql
Fields:
- id (UUID, PK)
- instructor_id (FK to freediving_instructors, nullable)
- service_id (FK to freediving_services, nullable)
- title, description, location
- session_date (TIMESTAMPTZ)
- duration_minutes
- max_participants, current_participants
- planned_depth_meters
- safety_coordinator_id (FK to auth.users)
- status (scheduled | in_progress | completed | cancelled)
- notes
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: instructor_id, service_id, session_date, status, created_at

**RLS**:
- Public: View scheduled sessions from verified instructors
- Participants: View their sessions
- Instructors: Create/update own sessions

---

### 7. `freediving_session_participants`

Junction table for session participation.

```sql
Fields:
- id (UUID, PK)
- session_id (FK to freediving_sessions)
- user_id (FK to auth.users)
- is_instructor (BOOLEAN)
- role (participant | safety_diver | instructor | assistant)
- max_depth_certified
- medical_clearance (BOOLEAN)
- joined_at, left_at (TIMESTAMPTZ)
```

**Indexes**: session_id, user_id, role

**Constraints**:
- UNIQUE(session_id, user_id)
- role IN (participant, safety_diver, instructor, assistant)

**RLS**:
- Users: View own participations
- Instructors: View participants in their sessions

---

### 8. `freediving_bookings`

Bookings for services offered by instructors.

```sql
Fields:
- id (UUID, PK)
- service_id (FK to freediving_services)
- booker_user_id (FK to auth.users)
- booking_date (DATE)
- start_time, end_time (TIME)
- participant_count
- special_requests, medical_notes
- status (pending | confirmed | completed | cancelled)
- confirmation_code (UNIQUE, auto-generated UUID)
- total_price_shekel
- instructor_notes, customer_notes
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: service_id, booker_user_id, status, booking_date, created_at

**RLS**:
- Users: View own bookings
- Instructors: View bookings for their services
- Users: Create/update own bookings
- Instructors: Update bookings for their services

---

### 9. `freediving_reviews`

Reviews of instructors after completed bookings.

```sql
Fields:
- id (UUID, PK)
- instructor_id (FK to freediving_instructors)
- reviewer_user_id (FK to auth.users)
- booking_id (FK to freediving_bookings, nullable)
- rating (INT, 1-5)
- title, comment
- safety_rating, professionalism_rating, instruction_quality_rating (1-5)
- is_verified_booking (BOOLEAN)
- is_helpful_count (INT)
- created_at, updated_at (TIMESTAMPTZ)
```

**Indexes**: instructor_id, reviewer_user_id, rating, created_at

**Constraints**:
- rating, safety_rating, professionalism_rating, instruction_quality_rating IN 1-5
- UNIQUE(instructor_id, reviewer_user_id, booking_id)

**RLS**:
- Public: View all reviews
- Users: Create reviews only after completed bookings
- Users: Update own reviews

---

## Security & RLS Policies

### Public View (Unauthenticated Users)

**Can see**:
- ✅ Verified instructors with active insurance (`freediving_instructors` where `is_verified = TRUE AND insurance_verified = TRUE AND is_active = TRUE`)
- ✅ Services from verified instructors
- ✅ Active buddy listings
- ✅ Scheduled sessions from verified instructors
- ✅ All reviews
- ✅ Verified credentials (summary)
- ✅ Active insurance status (summary)

**Cannot see**:
- ❌ Unverified instructor profiles
- ❌ Instructors without active insurance
- ❌ Private/unpublished services
- ❌ Inactive listings
- ❌ Personal contact info (if contact_hidden = true)
- ❌ Medical notes or special requests

### Authenticated Users (Divers)

**Can do**:
- ✅ Create buddy listings
- ✅ Create bookings for services
- ✅ Leave reviews after completing bookings
- ✅ View own bookings and sessions
- ✅ Update own buddy listings
- ✅ Create instructor profile (to become instructor)

**Cannot do**:
- ❌ Verify credentials (admin/system only)
- ❌ Modify other users' profiles
- ❌ See unverified instructors
- ❌ Book services from unverified instructors

### Instructors (Special Role)

**Can do**:
- ✅ Create/manage instructor profile
- ✅ Upload credentials and insurance documents
- ✅ Create and manage services
- ✅ Create and manage sessions
- ✅ View bookings for their services
- ✅ Update booking status
- ✅ View reviews of their services
- ✅ See ratings and statistics

**Cannot do**:
- ❌ Verify own credentials (admin only)
- ❌ View other instructors' private data
- ❌ Modify reviews
- ❌ Access unverified status if credentials/insurance expire

---

## Key Features

### 1. Automatic Verification Status

- Instructors become "verified" only when:
  - They have a primary credential with `is_verified = TRUE` AND `expiry_date > TODAY`
  - They have a primary insurance with `status = 'active'` AND `expiry_date > TODAY`

- Application-level function: `validate_instructor_verification(instructor_id)` returns:
  ```typescript
  {
    has_valid_credential: boolean,
    has_valid_insurance: boolean,
    is_eligible: boolean,
    issues: string[]
  }
  ```

### 2. Rating Recalculation

- Trigger `trigger_recalculate_instructor_rating` runs after every review insert/update
- Automatically updates `average_rating` and `total_reviews` in `freediving_instructors`
- Only counts published reviews

### 3. Automatic Timestamps

- All tables have `created_at` and `updated_at` fields
- `updated_at` automatically set via `update_timestamp()` trigger

### 4. Confirmation Codes

- Each booking gets a unique `confirmation_code` (UUID string)
- Used for booking verification and reference

### 5. Geolocation

- Instructors can set `latitude`, `longitude`, `service_radius_km`
- Enables location-based search (application-side filtering)

### 6. Availability Calendar

- Services have day-of-week availability flags
- Optional start_hour / end_hour for daily schedules
- Bookings must fall within these windows

### 7. Safety Tracking

- Sessions track `safety_coordinator_id` and `planned_depth_meters`
- Session participants have `medical_clearance` and `max_depth_certified`
- Bookings can include `medical_notes`

---

## API Usage

### Getting Verified Instructors (Public)

```typescript
// Direct Supabase query
const { data } = await supabase
  .from('freediving_instructors')
  .select(`
    id,
    user_id,
    bio,
    average_rating,
    primary_location,
    freediving_services(*)
  `)
  .eq('is_verified', true)
  .eq('insurance_verified', true)
  .eq('is_active', true)
  .order('average_rating', { ascending: false });

// Using client library
import { getVerifiedInstructorDirectory } from '@/lib/freediving-client';

const instructors = await getVerifiedInstructorDirectory(supabase, {
  location: 'Eilat',
  service_type: 'courses',
  min_rating: 4.5,
  limit: 10
});
```

### Creating a Booking

```typescript
import { createBooking, checkAvailability } from '@/lib/freediving-client';

// Check availability first
const available = await checkAvailability(
  supabase,
  serviceId,
  '2026-06-25',
  '09:00',
  '11:00',
  2
);

if (available.available) {
  const booking = await createBooking(supabase, {
    service_id: serviceId,
    booking_date: '2026-06-25',
    start_time: '09:00',
    end_time: '11:00',
    participant_count: 2,
    medical_notes: 'No restrictions'
  });
}
```

### Leaving a Review

```typescript
import { createReview } from '@/lib/freediving-client';

// Can only create after booking is completed
const review = await createReview(supabase, {
  instructor_id: instructorId,
  booking_id: bookingId,
  rating: 5,
  title: 'Excellent instruction!',
  comment: 'Very safe and professional',
  safety_rating: 5,
  professionalism_rating: 5,
  instruction_quality_rating: 5
});
```

### Creating a Buddy Listing

```typescript
import { createBuddyListing } from '@/lib/freediving-client';

const listing = await createBuddyListing(supabase, {
  user_id: userId,
  title: 'Looking for dive buddy in Eilat',
  location: 'Eilat, Israel',
  start_date: '2026-06-25T08:00:00Z',
  end_date: '2026-06-25T16:00:00Z',
  experience_level: 'intermediate',
  max_depth_meters: 30,
  max_participants: 2,
  description: 'Safe, relaxed diving. Looking for someone around intermediate level.'
});
```

### Creating a Session

```typescript
import { createSession } from '@/lib/freediving-client';

const session = await createSession(supabase, {
  instructor_id: instructorId,
  service_id: serviceId,
  title: 'Morning Static Apnea Training',
  location: 'Dead Sea, Ein Gedi',
  session_date: '2026-06-25T09:00:00Z',
  duration_minutes: 120,
  max_participants: 4,
  planned_depth_meters: 5,
  safety_coordinator_id: instructorId
});
```

### Validating Instructor Credentials

```typescript
import { validateInstructorCredentials } from '@/lib/freediving-client';

const validation = await validateInstructorCredentials(supabase, instructorId);
// {
//   has_valid_credential: true,
//   has_valid_insurance: true,
//   is_eligible: true,
//   issues: []
// }
```

---

## Verification Flow

### Step 1: User Creates Instructor Profile

```typescript
// User creates profile
const instructor = await createInstructorProfile(supabase, {
  user_id: userId,
  primary_location: 'Eilat, Israel',
  bio: 'AIDA certified freediving instructor with 10+ years experience'
});
```

**Result**: `is_verified = FALSE`, `insurance_verified = FALSE`  
**Public visibility**: Hidden ❌

### Step 2: Instructor Adds Credentials

```typescript
// Instructor uploads AIDA certification
const credential = await addInstructorCredential(supabase, {
  credential_type: 'AIDA',
  level: 'instructor',
  certification_number: 'AIDA-123456',
  issue_date: '2020-01-15',
  expiry_date: '2028-01-15',
  issuing_organization: 'AIDA',
  credential_document_url: 'storage://credentials/...'
});

// Link to instructor profile
await updateInstructorProfile(supabase, instructorId, {
  primary_credential_id: credential.id
});
```

**Result**: Credentials exist, but not yet verified  
**Public visibility**: Still hidden ❌

### Step 3: Admin/System Verifies Credentials

Only admin/system can set `is_verified = TRUE` on credentials (after verification):

```sql
-- Admin updates
UPDATE instructor_credentials
SET is_verified = TRUE, verified_by = admin_user_id, verified_at = NOW()
WHERE id = credential_id;
```

**Result**: Now `is_verified = TRUE` on credential  
**Public visibility**: Still hidden (needs insurance) ❌

### Step 4: Instructor Adds Insurance

```typescript
const insurance = await addInstructorInsurance(supabase, {
  provider_name: 'Diving Safety Insurance Ltd',
  policy_number: 'DSI-2026-123456',
  coverage_type: 'Liability & Medical',
  coverage_amount_shekel: 500000,
  issue_date: '2026-01-01',
  expiry_date: '2027-01-01',
  insurance_document_url: 'storage://insurance/...'
});

// Link to instructor profile
await updateInstructorProfile(supabase, instructorId, {
  primary_insurance_id: insurance.id
});
```

**Result**: Insurance set with `status = 'active'`  
**Automatic**: `is_active = TRUE` on insurance  
**Public visibility**: NOW VISIBLE ✅

---

## Database Constraints & Validations

### Data Integrity

| Table | Constraint | Check |
|-------|-----------|-------|
| instructor_credentials | issue_date < expiry_date | Dates must be valid |
| instructor_insurance | issue_date < expiry_date | Dates must be valid |
| freediving_instructors | average_rating >= 0 AND <= 5 | Rating range |
| freediving_instructors | service_radius_km > 0 | Positive radius |
| freediving_services | price_shekel > 0 | Positive price |
| freediving_services | max_participants > 0 | At least 1 participant |
| freediving_buddy_listings | start_date < end_date | Valid range |
| freediving_sessions | max_participants > 0 | At least 1 participant |
| freediving_sessions | current_participants <= max_participants | Capacity constraint |
| freediving_bookings | participant_count > 0 | At least 1 participant |
| freediving_reviews | rating IN (1-5) | Valid rating |

### Unique Constraints

| Table | Unique Fields | Purpose |
|-------|---|---|
| instructor_credentials | certification_number | One cert per number |
| instructor_insurance | policy_number | One policy per number |
| freediving_instructors | user_id | One profile per user |
| freediving_session_participants | (session_id, user_id) | One role per session |
| freediving_reviews | (instructor_id, reviewer_user_id, booking_id) | One review per booking |
| freediving_bookings | confirmation_code | Unique reference |

---

## Deployment

### 1. Create Migration

The migration file `20260620_create_freediving_schema.sql` contains the complete schema.

```bash
# Using Supabase CLI
supabase migration up

# Or manually execute in Supabase dashboard
```

### 2. Apply RLS Policies

All RLS policies are included in the migration. After applying:

```bash
# Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'freediving%'
  OR tablename LIKE 'instructor%';
```

Expected result: All tables show `rowsecurity = true`

### 3. Test Public Access

```sql
-- Anonymous user (no auth.uid())
SELECT * FROM freediving_instructors;
-- Should return: 0 rows (unless instructors are verified + insured)

-- After verification + insurance:
SELECT * FROM freediving_instructors;
-- Should return: Verified instructors only
```

### 4. Create Indexes

All indexes are created in the migration. Verify:

```bash
SELECT indexname FROM pg_indexes
WHERE tablename LIKE 'freediving%'
  OR tablename LIKE 'instructor%'
ORDER BY tablename, indexname;
```

### 5. Enable Realtime (Optional)

For real-time updates on bookings/sessions:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE freediving_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE freediving_sessions;
```

### 6. Set Up Storage Buckets

Create storage buckets for:

```sql
-- Bucket: credentials
-- Path pattern: credentials/{instructor_id}/*

-- Bucket: insurance
-- Path pattern: insurance/{instructor_id}/*

-- RLS policies on buckets:
-- Public: No access
-- Instructors: Full access to own files
```

---

## Type Definitions

See `src/types/freediving.ts` for complete TypeScript types:

- `FreedivingInstructor`
- `FreedivingService`
- `FreedivingBuddyListing`
- `FreedivingSession`
- `FreedivingBooking`
- `FreedivingReview`
- `InstructorCredential`
- `InstructorInsurance`

All types include Insert and Update variants for database operations.

---

## Common Queries

### Find instructors near a location (with search)

```typescript
const { data } = await supabase
  .from('freediving_instructors')
  .select(`
    id,
    user_id,
    bio,
    average_rating,
    primary_location,
    latitude,
    longitude,
    freediving_services(id, name, service_type)
  `)
  .eq('is_verified', true)
  .eq('insurance_verified', true)
  .ilike('primary_location', '%Eilat%')
  .order('average_rating', { ascending: false });
```

### Get instructor with all details

```typescript
const { data } = await supabase
  .from('freediving_instructors')
  .select(`
    *,
    instructor_credentials(id, credential_type, level, certification_number, is_verified),
    instructor_insurance(id, provider_name, status, expiry_date),
    freediving_services(id, name, service_type, price_shekel),
    freediving_reviews(id, rating, comment, created_at)
  `)
  .eq('id', instructorId)
  .single();
```

### Get user's upcoming bookings

```typescript
const { data } = await supabase
  .from('freediving_bookings')
  .select(`
    *,
    freediving_services(
      id,
      name,
      price_shekel,
      freediving_instructors(id, user_id, bio, average_rating)
    )
  `)
  .eq('booker_user_id', userId)
  .gte('booking_date', new Date().toISOString().split('T')[0])
  .order('booking_date', { ascending: true });
```

---

## Troubleshooting

### Instructors not appearing in public view

**Check**:
1. `is_verified = TRUE` on freediving_instructors
2. `insurance_verified = TRUE` on freediving_instructors
3. Primary credential has `is_verified = TRUE` and `expiry_date > TODAY`
4. Primary insurance has `status = 'active'` and `expiry_date > TODAY`

```sql
SELECT id, is_verified, insurance_verified,
  (SELECT is_verified FROM instructor_credentials 
   WHERE id = primary_credential_id) as cred_verified,
  (SELECT status FROM instructor_insurance
   WHERE id = primary_insurance_id) as ins_status
FROM freediving_instructors
WHERE user_id = 'user-uuid';
```

### Bookings not showing for instructors

**Check**:
1. Service is linked to instructor
2. User has correct role (`booker_user_id`)
3. RLS policy allows viewing

```sql
SELECT COUNT(*) FROM freediving_bookings fb
JOIN freediving_services fs ON fs.id = fb.service_id
WHERE fs.instructor_id = 'instructor-uuid';
```

### Reviews not calculating average rating

**Check**:
1. Review status (no explicit status, just created)
2. Trigger executed: `trigger_recalculate_instructor_rating`
3. Function `recalculate_instructor_rating()` exists

```sql
SELECT * FROM freediving_reviews
WHERE instructor_id = 'instructor-uuid';

-- Check instructor stats
SELECT id, average_rating, total_reviews
FROM freediving_instructors
WHERE id = 'instructor-uuid';
```

---

## Future Enhancements

1. **Availability Calendar**: Dedicated table for slot availability (beyond day-of-week)
2. **Waitlist System**: Queue management for fully-booked services
3. **Payment Integration**: Connect to payment provider for bookings
4. **Certification Renewal Notifications**: Email reminders for expiring credentials/insurance
5. **Insurance Verification API**: Auto-verify against insurance provider databases
6. **Depth Limits**: Enforce depth limits based on certification level
7. **Carbon Offset**: Track environmental impact of diving
8. **Weather Integration**: Schedule sessions based on conditions

---

## Support

For issues or questions:
1. Check RLS policies: Are you authenticated? Is the record accessible?
2. Review constraints: Do your values meet the CHECK constraints?
3. Verify dates: Are credential/insurance dates valid and in the future?
4. Check indexes: Are queries using appropriate indexes?

---

**Last Updated**: 2026-06-20  
**Schema Version**: 1.0  
**Compatibility**: Supabase (PostgreSQL 15+)
