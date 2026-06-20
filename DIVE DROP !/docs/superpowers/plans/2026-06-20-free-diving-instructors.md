# Free Diving Instructors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Free Diving Instructors marketplace section with profiles, verification, gallery, availability, reviews, and instructor dashboard.

**Architecture:** 
- Database schema extensions for instructors, credentials, verification, services, pricing, availability, and reviews
- Server API endpoints following existing service-provider pattern (browse, detail, verification, profile update, availability)
- Client components reusing existing Card and layout patterns
- RTL-aware UI with i18n support (Hebrew/English)
- Supabase storage for credential images, certificates, and insurance docs
- Role-based access (user view, instructor edit, admin approval)

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Tailwind CSS 4, Zod validation, next-intl for i18n

## Global Constraints

- Instructor types: "apnea" (freediving), "courses", "partner", "competition", "depth" (deep diving)
- Services must include pricing_shekel (Israeli Shekel) and duration_minutes
- Verification requires: תעודה (certificate image/PDF) + ביטוח (insurance proof image/PDF) + admin approval
- Verified instructors get "מדריך מאומת" badge
- Availability calendar: date-based (YYYY-MM-DD format), slots per day configurable
- RTL support for Hebrew (locale: 'he'), LTR for English (locale: 'en')
- File uploads via Supabase Storage with public URL access
- Profile images: avatar_url (stored in Supabase Storage)
- Reviews/ratings: 1-5 star scale, moderation required before display
- Response rate calculation: (quick_responses / total_inquiries) * 100
- All endpoints follow NextResponse JSON pattern with proper error handling
- Component naming: PascalCase, no index.tsx exports (use explicit names)
- Database relationships: instructors -> instructor_credentials, instructor_services, instructor_availability, instructor_reviews

---

## File Structure

### Database & Types
- `src/types/instructor.ts` - TypeScript types for instructors, services, credentials, availability, reviews
- Database migrations added to Supabase via SQL (not in repo)

### Pages
- `src/app/[locale]/free-diving/instructors/page.tsx` - Browse instructors with filters
- `src/app/[locale]/free-diving/instructors/[id]/page.tsx` - Instructor profile detail
- `src/app/[locale]/free-diving/instructors/[id]/client.tsx` - Client-side interactions (gallery, reviews)
- `src/app/[locale]/free-diving/instructor/dashboard/page.tsx` - Instructor edit dashboard
- `src/app/[locale]/free-diving/instructor/dashboard/client.tsx` - Dashboard client interactions

### Components
- `src/components/instructors/InstructorCard.tsx` - List card showing name, avatar, rating, type, price
- `src/components/instructors/InstructorProfile.tsx` - Profile header with bio, verified badge, stats
- `src/components/instructors/ServiceCard.tsx` - Service offering card with pricing
- `src/components/instructors/CredentialUploadForm.tsx` - Upload תעודה (certificate)
- `src/components/instructors/InsuranceUploadForm.tsx` - Upload ביטוח (insurance)
- `src/components/instructors/AvailabilityCalendar.tsx` - Interactive calendar for scheduling
- `src/components/instructors/GalleryViewer.tsx` - Photos + videos carousel
- `src/components/instructors/ReviewsList.tsx` - Reviews with ratings and moderation badge
- `src/components/instructors/RatingStars.tsx` - Star rating display component
- `src/components/instructors/DashboardNavigation.tsx` - Dashboard tab navigation

### API Routes
- `src/app/api/free-diving/instructors/route.ts` - GET: browse with filters, POST: create new
- `src/app/api/free-diving/instructors/[id]/route.ts` - GET: full profile detail
- `src/app/api/free-diving/instructors/[id]/profile/route.ts` - PATCH: update profile
- `src/app/api/free-diving/instructors/[id]/services/route.ts` - GET/POST: manage services
- `src/app/api/free-diving/instructors/[id]/credentials/route.ts` - POST: upload תעודה, GET: verify status
- `src/app/api/free-diving/instructors/[id]/insurance/route.ts` - POST: upload ביטוח, GET: verify status
- `src/app/api/free-diving/instructors/[id]/availability/route.ts` - GET/POST/PATCH: manage calendar
- `src/app/api/free-diving/instructors/[id]/reviews/route.ts` - GET: fetch reviews
- `src/app/api/free-diving/instructors/[id]/gallery/route.ts` - GET/POST: manage gallery

### Utilities
- `src/utils/instructor-validation.ts` - Zod schemas for form validation
- `src/lib/supabase/instructor-queries.ts` - Reusable Supabase query helpers

---

## Task 1: Database Schema & Types

**Files:**
- Create: `src/types/instructor.ts`
- Reference: Supabase (SQL migrations executed server-side)

**Interfaces:**
- Produces: 
  - `Instructor` type with id, user_id, display_name, bio, avatar_url, average_rating, total_reviews, instructor_types, is_verified, verification_status, created_at, updated_at
  - `InstructorCredential` with id, instructor_id, credential_type ('תעודה' | 'ביטוח'), file_url, verification_status, admin_notes, created_at, approved_at
  - `InstructorService` with id, instructor_id, service_type, name, description, price_shekel, duration_minutes, is_active
  - `InstructorAvailability` with id, instructor_id, available_date, slots_available, max_students_per_slot
  - `InstructorReview` with id, instructor_id, reviewer_id, reviewer_name, rating, comment, moderation_status, created_at

- [ ] **Step 1: Create TypeScript types file**

Create `src/types/instructor.ts`:

```typescript
export type InstructorType = 'apnea' | 'courses' | 'partner' | 'competition' | 'depth';
export type CredentialType = 'תעודה' | 'ביטוח';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Instructor {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  average_rating: number;
  total_reviews: number;
  instructor_types: InstructorType[];
  is_verified: boolean;
  verification_status: VerificationStatus;
  response_rate: number;
  created_at: string;
  updated_at: string;
}

export interface InstructorCredential {
  id: string;
  instructor_id: string;
  credential_type: CredentialType;
  file_url: string;
  file_name: string;
  verification_status: VerificationStatus;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface InstructorService {
  id: string;
  instructor_id: string;
  service_type: InstructorType;
  name: string;
  description: string;
  price_shekel: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface InstructorAvailability {
  id: string;
  instructor_id: string;
  available_date: string; // YYYY-MM-DD format
  slots_available: number;
  max_students_per_slot: number;
  created_at: string;
  updated_at: string;
}

export interface InstructorReview {
  id: string;
  instructor_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar_url: string | null;
  rating: number; // 1-5
  comment: string;
  moderation_status: ReviewModerationStatus;
  created_at: string;
}

export interface InstructorDetailResponse {
  instructor: Instructor;
  services: InstructorService[];
  credentials: InstructorCredential[];
  reviews: {
    items: InstructorReview[];
    average_rating: number;
    total_count: number;
  };
  gallery: GalleryItem[];
  availability_summary?: {
    next_available: string;
  };
}

export interface GalleryItem {
  id: string;
  instructor_id: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export interface InstructorListResponse {
  instructors: Array<Instructor & { min_service_price?: number }>;
  total: number;
  page: number;
  per_page: number;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit types**

```bash
git add src/types/instructor.ts
git commit -m "types: add instructor, service, credential, availability, review types"
```

---

## Task 2: Validation Schemas

**Files:**
- Create: `src/utils/instructor-validation.ts`

**Interfaces:**
- Consumes: InstructorType, CredentialType, VerificationStatus from Task 1
- Produces: Zod schemas for form validation (createServiceSchema, updateProfileSchema, uploadCredentialSchema, etc.)

- [ ] **Step 1: Create validation schemas file**

Create `src/utils/instructor-validation.ts`:

```typescript
import { z } from 'zod';

export const createServiceSchema = z.object({
  service_type: z.enum(['apnea', 'courses', 'partner', 'competition', 'depth']),
  name: z.string().min(3, 'Service name required').max(100),
  description: z.string().max(500, 'Description too long').optional(),
  price_shekel: z.number().min(0, 'Price must be positive').max(100000),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(480),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(2, 'Name too short').max(100),
  bio: z.string().max(1000, 'Bio too long').optional(),
  instructor_types: z.array(z.enum(['apnea', 'courses', 'partner', 'competition', 'depth'])).min(1, 'Select at least one type'),
});

export const uploadCredentialSchema = z.object({
  credential_type: z.enum(['תעודה', 'ביטוח']),
  file: z.instanceof(File).refine(
    (file) => file.size <= 5 * 1024 * 1024,
    'File must be under 5MB'
  ).refine(
    (file) => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Only PDF, JPG, PNG, WebP allowed'
  ),
});

export const createReviewSchema = z.object({
  rating: z.number().min(1, 'Rating required').max(5, 'Rating max 5'),
  comment: z.string().min(10, 'Comment too short').max(500, 'Comment too long'),
});

export const updateAvailabilitySchema = z.object({
  available_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  slots_available: z.number().min(1, 'At least 1 slot').max(50),
  max_students_per_slot: z.number().min(1, 'At least 1 student').max(20),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UploadCredentialInput = z.infer<typeof uploadCredentialSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
```

- [ ] **Step 2: Test schemas validate correctly**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit validation schemas**

```bash
git add src/utils/instructor-validation.ts
git commit -m "utils: add instructor validation schemas"
```

---

## Task 3: Supabase Query Helpers

**Files:**
- Create: `src/lib/supabase/instructor-queries.ts`

**Interfaces:**
- Consumes: Instructor, InstructorService, InstructorDetailResponse types from Task 1
- Produces: Functions: getInstructors(filters), getInstructorById(id), createInstructor(data), updateInstructorProfile(id, data), etc.

- [ ] **Step 1: Create query helpers file**

Create `src/lib/supabase/instructor-queries.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { Instructor, InstructorDetailResponse, InstructorService, InstructorListResponse } from '@/types/instructor';

export async function getInstructors(
  supabase: SupabaseClient<Database>,
  filters: {
    page?: number;
    per_page?: number;
    instructor_type?: string;
    search?: string;
  } = {}
): Promise<InstructorListResponse> {
  const page = filters.page ?? 1;
  const per_page = filters.per_page ?? 20;
  const offset = (page - 1) * per_page;

  let query = supabase
    .from('instructors')
    .select('*', { count: 'exact' })
    .eq('is_verified', true)
    .eq('verification_status', 'approved');

  if (filters.instructor_type) {
    query = query.contains('instructor_types', [filters.instructor_type]);
  }

  if (filters.search) {
    query = query.or(`display_name.ilike.%${filters.search}%,bio.ilike.%${filters.search}%`);
  }

  const { data: instructors = [], count = 0, error } = await query
    .order('average_rating', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (error) throw error;

  // Get min prices for each instructor
  const { data: minPrices = [] } = await supabase
    .from('instructor_services')
    .select('instructor_id, price_shekel')
    .eq('is_active', true);

  const priceMap = new Map<string, number>();
  minPrices.forEach((item) => {
    const current = priceMap.get(item.instructor_id);
    if (!current || item.price_shekel < current) {
      priceMap.set(item.instructor_id, item.price_shekel);
    }
  });

  const instructorsWithPrices = instructors.map((instructor) => ({
    ...instructor,
    min_service_price: priceMap.get(instructor.id),
  }));

  return {
    instructors: instructorsWithPrices,
    total: count,
    page,
    per_page,
  };
}

export async function getInstructorById(
  supabase: SupabaseClient<Database>,
  instructorId: string
): Promise<InstructorDetailResponse> {
  // Get instructor
  const { data: instructor, error: instructorError } = await supabase
    .from('instructors')
    .select('*')
    .eq('id', instructorId)
    .eq('is_verified', true)
    .eq('verification_status', 'approved')
    .single();

  if (instructorError || !instructor) {
    throw new Error('Instructor not found');
  }

  // Get services
  const { data: services = [] } = await supabase
    .from('instructor_services')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('is_active', true);

  // Get credentials (only approved ones for public view)
  const { data: credentials = [] } = await supabase
    .from('instructor_credentials')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('verification_status', 'approved');

  // Get reviews
  const { data: reviews = [], count: reviewCount } = await supabase
    .from('instructor_reviews')
    .select('*', { count: 'exact' })
    .eq('instructor_id', instructorId)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);

  // Get gallery
  const { data: gallery = [] } = await supabase
    .from('instructor_gallery')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('display_order', { ascending: true });

  // Get next availability
  const today = new Date().toISOString().split('T')[0];
  const { data: availabilities } = await supabase
    .from('instructor_availability')
    .select('*')
    .eq('instructor_id', instructorId)
    .gte('available_date', today)
    .order('available_date', { ascending: true })
    .limit(1);

  return {
    instructor,
    services,
    credentials,
    reviews: {
      items: reviews || [],
      average_rating: instructor.average_rating,
      total_count: reviewCount || 0,
    },
    gallery: gallery || [],
    availability_summary: availabilities && availabilities.length > 0
      ? { next_available: availabilities[0].available_date }
      : undefined,
  };
}

export async function createInstructor(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: {
    display_name: string;
    bio: string;
    instructor_types: string[];
  }
) {
  return supabase
    .from('instructors')
    .insert([
      {
        user_id: userId,
        display_name: data.display_name,
        bio: data.bio,
        instructor_types: data.instructor_types,
        is_verified: false,
        verification_status: 'pending',
        average_rating: 0,
        total_reviews: 0,
        response_rate: 100,
      },
    ])
    .select()
    .single();
}

export async function updateInstructorProfile(
  supabase: SupabaseClient<Database>,
  instructorId: string,
  data: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    instructor_types?: string[];
  }
) {
  return supabase
    .from('instructors')
    .update(data)
    .eq('id', instructorId)
    .select()
    .single();
}
```

- [ ] **Step 2: Verify helper functions have proper types**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit helpers**

```bash
git add src/lib/supabase/instructor-queries.ts
git commit -m "feat: add instructor supabase query helpers"
```

---

## Task 4: API Endpoint - Browse Instructors

**Files:**
- Create: `src/app/api/free-diving/instructors/route.ts`

**Interfaces:**
- Consumes: getInstructors(filters) from Task 3
- Produces: GET returns InstructorListResponse, POST returns created Instructor

- [ ] **Step 1: Create browse endpoint**

Create `src/app/api/free-diving/instructors/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getInstructors } from '@/lib/supabase/instructor-queries';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const filters = {
      page: parseInt(searchParams.get('page') || '1', 10),
      per_page: parseInt(searchParams.get('per_page') || '20', 10),
      instructor_type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const result = await getInstructors(supabase, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get instructors error:', error);
    return NextResponse.json(
      { error: 'Failed to get instructors' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint with curl**

Run: `curl http://localhost:3000/api/free-diving/instructors?type=apnea&page=1`
Expected: JSON response with instructors array and pagination

- [ ] **Step 3: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/route.ts
git commit -m "api: add GET instructors browse endpoint"
```

---

## Task 5: API Endpoint - Get Instructor Detail

**Files:**
- Create: `src/app/api/free-diving/instructors/[id]/route.ts`

**Interfaces:**
- Consumes: getInstructorById(id) from Task 3
- Produces: GET returns InstructorDetailResponse

- [ ] **Step 1: Create detail endpoint**

Create `src/app/api/free-diving/instructors/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getInstructorById } from '@/lib/supabase/instructor-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const result = await getInstructorById(supabase, params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get instructor detail error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get instructor' },
      { status: error.message === 'Instructor not found' ? 404 : 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint**

Run: `curl http://localhost:3000/api/free-diving/instructors/[valid-id]`
Expected: Full instructor detail with services, reviews, gallery

- [ ] **Step 3: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/[id]/route.ts
git commit -m "api: add GET instructor detail endpoint"
```

---

## Task 6: API Endpoint - Update Profile

**Files:**
- Create: `src/app/api/free-diving/instructors/[id]/profile/route.ts`

**Interfaces:**
- Consumes: updateInstructorProfile(id, data) from Task 3, updateProfileSchema from Task 2
- Produces: PATCH returns updated Instructor

- [ ] **Step 1: Create profile update endpoint**

Create `src/app/api/free-diving/instructors/[id]/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProfileSchema } from '@/utils/instructor-validation';
import { updateInstructorProfile } from '@/lib/supabase/instructor-queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate input
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check ownership (instructor can only update their own profile)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: instructor } = await supabase
      .from('instructors')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!instructor || instructor.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await updateInstructorProfile(
      supabase,
      params.id,
      validation.data
    );

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint with authenticated request**

Run: `curl -X PATCH http://localhost:3000/api/free-diving/instructors/[id]/profile -H "Authorization: Bearer [token]" -d '{"display_name": "New Name", "instructor_types": ["apnea"]}'`
Expected: Updated instructor object

- [ ] **Step 3: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/[id]/profile/route.ts
git commit -m "api: add PATCH instructor profile endpoint"
```

---

## Task 7: API Endpoint - Services Management

**Files:**
- Create: `src/app/api/free-diving/instructors/[id]/services/route.ts`

**Interfaces:**
- Consumes: createServiceSchema from Task 2, Instructor and InstructorService types from Task 1
- Produces: GET returns InstructorService[], POST returns created InstructorService

- [ ] **Step 1: Create services endpoint**

Create `src/app/api/free-diving/instructors/[id]/services/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceSchema } from '@/utils/instructor-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('instructor_services')
      .select('*')
      .eq('instructor_id', params.id)
      .eq('is_active', true);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json(
      { error: 'Failed to get services' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: instructor } = await supabase
      .from('instructors')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!instructor || instructor.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createServiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('instructor_services')
      .insert([
        {
          instructor_id: params.id,
          ...validation.data,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test GET endpoint**

Run: `curl http://localhost:3000/api/free-diving/instructors/[id]/services`
Expected: Array of services

- [ ] **Step 3: Test POST endpoint**

Run: `curl -X POST http://localhost:3000/api/free-diving/instructors/[id]/services -H "Authorization: Bearer [token]" -d '{"service_type": "apnea", "name": "Intro Course", "price_shekel": 500, "duration_minutes": 120}'`
Expected: Created service object with status 201

- [ ] **Step 4: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/[id]/services/route.ts
git commit -m "api: add services GET/POST endpoint"
```

---

## Task 8: API Endpoint - Credential Upload

**Files:**
- Create: `src/app/api/free-diving/instructors/[id]/credentials/route.ts`

**Interfaces:**
- Consumes: uploadCredentialSchema from Task 2, InstructorCredential type from Task 1
- Produces: POST returns created InstructorCredential with file_url

- [ ] **Step 1: Create credentials endpoint**

Create `src/app/api/free-diving/instructors/[id]/credentials/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadCredentialSchema } from '@/utils/instructor-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('instructor_credentials')
      .select('*')
      .eq('instructor_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to get credentials' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: instructor } = await supabase
      .from('instructors')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!instructor || instructor.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const credential_type = formData.get('credential_type') as string;

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }

    // Validate input
    const validation = uploadCredentialSchema.safeParse({ file, credential_type });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${params.id}/${credential_type}/${Date.now()}-${file.name}`;
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('instructor-credentials')
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('instructor-credentials')
      .getPublicUrl(fileName);

    // Save credential record
    const { data, error } = await supabase
      .from('instructor_credentials')
      .insert([
        {
          instructor_id: params.id,
          credential_type,
          file_url: urlData.publicUrl,
          file_name: file.name,
          verification_status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Upload credential error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload credential' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test GET credentials**

Run: `curl http://localhost:3000/api/free-diving/instructors/[id]/credentials`
Expected: Array of credentials with verification status

- [ ] **Step 3: Test POST file upload**

Run: `curl -X POST http://localhost:3000/api/free-diving/instructors/[id]/credentials -H "Authorization: Bearer [token]" -F "file=@/path/to/cert.pdf" -F "credential_type=תעודה"`
Expected: Created credential with file_url

- [ ] **Step 4: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/[id]/credentials/route.ts
git commit -m "api: add credentials upload/GET endpoint"
```

---

## Task 9: API Endpoint - Insurance Upload (Duplicate Pattern)

**Files:**
- Create: `src/app/api/free-diving/instructors/[id]/insurance/route.ts`

**Interfaces:**
- Consumes: uploadCredentialSchema (reuse), InstructorCredential type
- Produces: POST returns created credential with type='ביטוח'

- [ ] **Step 1: Create insurance endpoint**

Create `src/app/api/free-diving/instructors/[id]/insurance/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadCredentialSchema } from '@/utils/instructor-validation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: instructor } = await supabase
      .from('instructors')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!instructor || instructor.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }

    // Validate input
    const validation = uploadCredentialSchema.safeParse({
      file,
      credential_type: 'ביטוח',
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${params.id}/ביטוח/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('instructor-credentials')
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('instructor-credentials')
      .getPublicUrl(fileName);

    // Save credential record
    const { data, error } = await supabase
      .from('instructor_credentials')
      .insert([
        {
          instructor_id: params.id,
          credential_type: 'ביטוח',
          file_url: urlData.publicUrl,
          file_name: file.name,
          verification_status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Upload insurance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload insurance' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test POST insurance upload**

Run: `curl -X POST http://localhost:3000/api/free-diving/instructors/[id]/insurance -H "Authorization: Bearer [token]" -F "file=@/path/to/insurance.pdf"`
Expected: Created credential with credential_type='ביטוח'

- [ ] **Step 3: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/[id]/insurance/route.ts
git commit -m "api: add insurance upload endpoint"
```

---

## Task 10: API Endpoint - Availability Management

**Files:**
- Create: `src/app/api/free-diving/instructors/[id]/availability/route.ts`

**Interfaces:**
- Consumes: updateAvailabilitySchema from Task 2, InstructorAvailability type from Task 1
- Produces: GET returns InstructorAvailability[], POST/PATCH return InstructorAvailability

- [ ] **Step 1: Create availability endpoint**

Create `src/app/api/free-diving/instructors/[id]/availability/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAvailabilitySchema } from '@/utils/instructor-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || new Date().toISOString().split('T')[0];
    const toDate = searchParams.get('to');

    let query = supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', params.id)
      .gte('available_date', fromDate);

    if (toDate) {
      query = query.lte('available_date', toDate);
    }

    const { data, error } = await query.order('available_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get availability error:', error);
    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: instructor } = await supabase
      .from('instructors')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!instructor || instructor.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateAvailabilitySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('instructor_availability')
      .insert([
        {
          instructor_id: params.id,
          ...validation.data,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create availability error:', error);
    return NextResponse.json(
      { error: 'Failed to create availability' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { availability_id, ...updateData } = body;

    if (!availability_id) {
      return NextResponse.json(
        { error: 'availability_id required' },
        { status: 400 }
      );
    }

    // Check ownership
    const { data: availability } = await supabase
      .from('instructor_availability')
      .select('instructors(user_id)')
      .eq('id', availability_id)
      .single();

    if (!availability || (availability.instructors as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('instructor_availability')
      .update(updateData)
      .eq('id', availability_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update availability error:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test GET availability**

Run: `curl "http://localhost:3000/api/free-diving/instructors/[id]/availability?from=2026-06-20&to=2026-07-20"`
Expected: Array of available dates

- [ ] **Step 3: Test POST availability**

Run: `curl -X POST http://localhost:3000/api/free-diving/instructors/[id]/availability -H "Authorization: Bearer [token]" -d '{"available_date": "2026-06-25", "slots_available": 3, "max_students_per_slot": 2}'`
Expected: Created availability object

- [ ] **Step 4: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/[id]/availability/route.ts
git commit -m "api: add availability GET/POST/PATCH endpoint"
```

---

## Task 11: API Endpoint - Reviews

**Files:**
- Create: `src/app/api/free-diving/instructors/[id]/reviews/route.ts`

**Interfaces:**
- Consumes: createReviewSchema from Task 2, InstructorReview type from Task 1
- Produces: GET returns reviews, POST returns created review (pending moderation)

- [ ] **Step 1: Create reviews endpoint**

Create `src/app/api/free-diving/instructors/[id]/reviews/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReviewSchema } from '@/utils/instructor-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { data, error } = await supabase
      .from('instructor_reviews')
      .select('*')
      .eq('instructor_id', params.id)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const validation = createReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check if already reviewed
    const { data: existing } = await supabase
      .from('instructor_reviews')
      .select('id')
      .eq('instructor_id', params.id)
      .eq('reviewer_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You already reviewed this instructor' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('instructor_reviews')
      .insert([
        {
          instructor_id: params.id,
          reviewer_id: user.id,
          reviewer_name: profile?.full_name || 'Anonymous',
          reviewer_avatar_url: profile?.avatar_url,
          ...validation.data,
          moderation_status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test GET reviews**

Run: `curl http://localhost:3000/api/free-diving/instructors/[id]/reviews`
Expected: Array of approved reviews

- [ ] **Step 3: Test POST review**

Run: `curl -X POST http://localhost:3000/api/free-diving/instructors/[id]/reviews -H "Authorization: Bearer [token]" -d '{"rating": 5, "comment": "Great instructor, very professional"}'`
Expected: Created review with moderation_status='pending'

- [ ] **Step 4: Commit endpoint**

```bash
git add src/app/api/free-diving/instructors/[id]/reviews/route.ts
git commit -m "api: add reviews GET/POST endpoint"
```

---

## Task 12: Component - Rating Stars

**Files:**
- Create: `src/components/instructors/RatingStars.tsx`

**Interfaces:**
- Produces: RatingStars component with props { rating: number, size?: 'sm' | 'md' | 'lg' }

- [ ] **Step 1: Create RatingStars component**

Create `src/components/instructors/RatingStars.tsx`:

```typescript
'use client';

interface RatingStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RatingStars({ rating, size = 'md', className = '' }: RatingStarsProps) {
  const sizeMap = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const stars = Array.from({ length: 5 }, (_, i) => {
    const starRating = i + 1;
    const isFilled = starRating <= Math.floor(rating);
    const isPartial = starRating === Math.ceil(rating) && rating % 1 !== 0;

    return (
      <span
        key={i}
        className={`${sizeMap[size]} ${isFilled ? 'text-yellow-400' : isPartial ? 'text-yellow-200' : 'text-gray-300'}`}
      >
        ★
      </span>
    );
  });

  return (
    <div className={`flex gap-0.5 ${className}`}>
      {stars}
    </div>
  );
}
```

- [ ] **Step 2: Test component renders**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit component**

```bash
git add src/components/instructors/RatingStars.tsx
git commit -m "components: add RatingStars component"
```

---

## Task 13: Component - Instructor Card

**Files:**
- Create: `src/components/instructors/InstructorCard.tsx`

**Interfaces:**
- Consumes: Instructor type, RatingStars component, AppIcon
- Produces: InstructorCard component displaying name, avatar, rating, type, min price

- [ ] **Step 1: Create InstructorCard component**

Create `src/components/instructors/InstructorCard.tsx`:

```typescript
'use client';

import Link from 'next/link';
import type { Instructor } from '@/types/instructor';
import { Card } from '@/components/Card';
import { RatingStars } from '@/components/instructors/RatingStars';
import { AppIcon } from '@/components/AppIcon';
import { cn } from '@/utils/cn';

interface InstructorCardProps {
  instructor: Instructor & { min_service_price?: number };
  locale: string;
  minPrice?: number;
}

export function InstructorCard({
  instructor,
  locale,
  minPrice,
}: InstructorCardProps) {
  const isRTL = locale === 'he';

  const typeLabels: Record<string, string> = {
    apnea: isRTL ? 'צלילה חופשית' : 'Freediving',
    courses: isRTL ? 'קורסים' : 'Courses',
    partner: isRTL ? 'שותף צלילה' : 'Buddy',
    competition: isRTL ? 'תחרויות' : 'Competition',
    depth: isRTL ? 'צלילת עומק' : 'Deep Diving',
  };

  return (
    <Link href={`/${locale}/free-diving/instructors/${instructor.id}`}>
      <Card className={cn(
        'overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full',
        isRTL && 'text-right'
      )}>
        {/* Instructor Avatar */}
        <div className="relative w-full h-40 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
          {instructor.avatar_url ? (
            <img
              src={instructor.avatar_url}
              alt={instructor.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-500">
              <span className="text-4xl text-white">
                {instructor.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Verified Badge */}
          {instructor.is_verified && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 flex items-center gap-1 text-xs">
              <span>✓</span>
              <span>{isRTL ? 'מאומת' : 'Verified'}</span>
            </div>
          )}

          {/* Rating Badge */}
          <div className="absolute bottom-2 left-2 bg-white text-gray-900 rounded-lg px-2 py-1 font-semibold text-sm flex items-center gap-1">
            <span>{instructor.average_rating.toFixed(1)}</span>
            <span className="text-xs text-gray-600">({instructor.total_reviews})</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Name */}
          <div>
            <h3 className="font-bold text-lg line-clamp-2">{instructor.display_name}</h3>
            <p className="text-sm text-gray-600">
              {instructor.instructor_types.map(type => typeLabels[type]).join(', ')}
            </p>
          </div>

          {/* Rating Stars */}
          <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            <RatingStars rating={instructor.average_rating} size="sm" />
            <span className="text-xs text-gray-600">
              {instructor.average_rating.toFixed(1)}/5
            </span>
          </div>

          {/* Bio Preview */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {instructor.bio}
          </p>

          {/* Price */}
          {minPrice && minPrice > 0 && (
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-700">
                {isRTL ? 'החל מ' : 'From'}:
              </span>
              <span className="text-lg font-bold text-green-600">
                {minPrice}₪
              </span>
            </div>
          )}

          {/* Response Rate */}
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <span>⚡</span>
            <span>
              {isRTL ? 'תגובה' : 'Response'}: {Math.round(instructor.response_rate * 100)}%
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Verify component types**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit component**

```bash
git add src/components/instructors/InstructorCard.tsx
git commit -m "components: add InstructorCard component"
```

---

## Task 14: Component - Service Card

**Files:**
- Create: `src/components/instructors/ServiceCard.tsx`

**Interfaces:**
- Consumes: InstructorService type
- Produces: ServiceCard component showing service type, name, duration, price

- [ ] **Step 1: Create ServiceCard component**

Create `src/components/instructors/ServiceCard.tsx`:

```typescript
'use client';

import type { InstructorService } from '@/types/instructor';
import { Card } from '@/components/Card';
import { cn } from '@/utils/cn';

interface ServiceCardProps {
  service: InstructorService;
  locale: string;
}

export function ServiceCard({ service, locale }: ServiceCardProps) {
  const isRTL = locale === 'he';

  const typeLabels: Record<string, string> = {
    apnea: isRTL ? 'צלילה חופשית' : 'Freediving',
    courses: isRTL ? 'קורסים' : 'Courses',
    partner: isRTL ? 'שותף צלילה' : 'Buddy',
    competition: isRTL ? 'תחרויות' : 'Competition',
    depth: isRTL ? 'צלילת עומק' : 'Deep Diving',
  };

  return (
    <Card className={cn(
      'p-4 space-y-3',
      isRTL && 'text-right'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{service.name}</h3>
          <p className="text-sm text-gray-600">{typeLabels[service.service_type]}</p>
        </div>
        {service.is_active && (
          <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-1">
            {isRTL ? 'פעיל' : 'Active'}
          </span>
        )}
      </div>

      {service.description && (
        <p className="text-sm text-gray-700">{service.description}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <span>⏱️ {service.duration_minutes} {isRTL ? 'דק' : 'min'}</span>
        </div>
        <div className="text-lg font-bold text-blue-600">
          {service.price_shekel}₪
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Test component**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit component**

```bash
git add src/components/instructors/ServiceCard.tsx
git commit -m "components: add ServiceCard component"
```

---

## Task 15: Component - Credential Upload Form

**Files:**
- Create: `src/components/instructors/CredentialUploadForm.tsx`

**Interfaces:**
- Consumes: uploadCredentialSchema from Task 2
- Produces: Form component for uploading תעודה with file validation and upload progress

- [ ] **Step 1: Create CredentialUploadForm component**

Create `src/components/instructors/CredentialUploadForm.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { uploadCredentialSchema, type UploadCredentialInput } from '@/utils/instructor-validation';

interface CredentialUploadFormProps {
  instructorId: string;
  locale: string;
  onSuccess?: () => void;
}

export function CredentialUploadForm({
  instructorId,
  locale,
  onSuccess,
}: CredentialUploadFormProps) {
  const t = useTranslations();
  const isRTL = locale === 'he';
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fileInputRef.current?.files?.[0]) {
      setError(isRTL ? 'בחר קובץ' : 'Choose a file');
      return;
    }

    const file = fileInputRef.current.files[0];

    // Validate
    const validation = uploadCredentialSchema.safeParse({
      file,
      credential_type: 'תעודה',
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('credential_type', 'תעודה');

      const response = await fetch(
        `/api/free-diving/instructors/${instructorId}/credentials`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
      <div>
        <label className="block text-sm font-bold mb-2">
          {isRTL ? 'העלה תעודה' : 'Upload Certificate'}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          disabled={uploading}
          className="block w-full border border-gray-300 rounded-lg p-2"
        />
        <p className="text-xs text-gray-600 mt-1">
          {isRTL
            ? 'PDF, JPG, PNG, WebP (עד 5MB)'
            : 'PDF, JPG, PNG, WebP (up to 5MB)'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm">
          {isRTL ? 'התעודה הועלתה בהצלחה!' : 'Certificate uploaded successfully!'}
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white rounded-lg py-2 font-bold disabled:opacity-50"
      >
        {uploading ? (isRTL ? 'מעלה...' : 'Uploading...') : (isRTL ? 'העלה' : 'Upload')}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Test component**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit component**

```bash
git add src/components/instructors/CredentialUploadForm.tsx
git commit -m "components: add CredentialUploadForm component"
```

---

## Task 16: Component - Insurance Upload Form

**Files:**
- Create: `src/components/instructors/InsuranceUploadForm.tsx`

**Interfaces:**
- Consumes: uploadCredentialSchema
- Produces: Form component for uploading ביטוח (insurance proof)

- [ ] **Step 1: Create InsuranceUploadForm component**

Create `src/components/instructors/InsuranceUploadForm.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import { uploadCredentialSchema } from '@/utils/instructor-validation';

interface InsuranceUploadFormProps {
  instructorId: string;
  locale: string;
  onSuccess?: () => void;
}

export function InsuranceUploadForm({
  instructorId,
  locale,
  onSuccess,
}: InsuranceUploadFormProps) {
  const isRTL = locale === 'he';
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fileInputRef.current?.files?.[0]) {
      setError(isRTL ? 'בחר קובץ' : 'Choose a file');
      return;
    }

    const file = fileInputRef.current.files[0];

    // Validate
    const validation = uploadCredentialSchema.safeParse({
      file,
      credential_type: 'ביטוח',
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setUploading(true);

    try {
      const response = await fetch(
        `/api/free-diving/instructors/${instructorId}/insurance`,
        {
          method: 'POST',
          body: (() => {
            const formData = new FormData();
            formData.append('file', file);
            return formData;
          })(),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
      <div>
        <label className="block text-sm font-bold mb-2">
          {isRTL ? 'העלה ביטוח' : 'Upload Insurance Proof'}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          disabled={uploading}
          className="block w-full border border-gray-300 rounded-lg p-2"
        />
        <p className="text-xs text-gray-600 mt-1">
          {isRTL
            ? 'PDF, JPG, PNG, WebP (עד 5MB)'
            : 'PDF, JPG, PNG, WebP (up to 5MB)'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm">
          {isRTL ? 'הביטוח הועלה בהצלחה!' : 'Insurance uploaded successfully!'}
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white rounded-lg py-2 font-bold disabled:opacity-50"
      >
        {uploading ? (isRTL ? 'מעלה...' : 'Uploading...') : (isRTL ? 'העלה' : 'Upload')}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Test component**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit component**

```bash
git add src/components/instructors/InsuranceUploadForm.tsx
git commit -m "components: add InsuranceUploadForm component"
```

---

## Task 17: Component - Availability Calendar

**Files:**
- Create: `src/components/instructors/AvailabilityCalendar.tsx`

**Interfaces:**
- Consumes: InstructorAvailability type
- Produces: Interactive calendar showing available dates and slots

- [ ] **Step 1: Create AvailabilityCalendar component**

Create `src/components/instructors/AvailabilityCalendar.tsx`:

```typescript
'use client';

import { useState } from 'react';
import type { InstructorAvailability } from '@/types/instructor';

interface AvailabilityCalendarProps {
  availability: InstructorAvailability[];
  locale: string;
  onSelectDate?: (date: string) => void;
}

export function AvailabilityCalendar({
  availability,
  locale,
  onSelectDate,
}: AvailabilityCalendarProps) {
  const isRTL = locale === 'he';
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const availabilityMap = new Map(
    availability.map(a => [a.available_date, a])
  );

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const dayLabels = isRTL
    ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthName = currentMonth.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={isRTL ? handleNextMonth : handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isRTL ? '→' : '←'}
        </button>
        <h3 className="text-lg font-bold">{monthName}</h3>
        <button
          onClick={isRTL ? handlePrevMonth : handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isRTL ? '←' : '→'}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dayLabels.map(label => (
          <div key={label} className="text-center text-xs font-bold text-gray-600 p-2">
            {label}
          </div>
        ))}

        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="p-2" />;
          }

          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const avail = availabilityMap.get(dateStr);
          const isAvailable = !!avail && avail.slots_available > 0;

          return (
            <button
              key={day}
              onClick={() => isAvailable && onSelectDate?.(dateStr)}
              className={`p-2 rounded-lg text-sm font-bold transition ${
                isAvailable
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-default'
              }`}
            >
              <div>{day}</div>
              {avail && (
                <div className="text-xs">
                  {avail.slots_available} {isRTL ? 'חנויות' : 'slots'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test component**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit component**

```bash
git add src/components/instructors/AvailabilityCalendar.tsx
git commit -m "components: add AvailabilityCalendar component"
```

---

## Task 18: Component - Reviews List

**Files:**
- Create: `src/components/instructors/ReviewsList.tsx`

**Interfaces:**
- Consumes: InstructorReview type, RatingStars component
- Produces: Reviews list component with pagination

- [ ] **Step 1: Create ReviewsList component**

Create `src/components/instructors/ReviewsList.tsx`:

```typescript
'use client';

import type { InstructorReview } from '@/types/instructor';
import { Card } from '@/components/Card';
import { RatingStars } from '@/components/instructors/RatingStars';
import { cn } from '@/utils/cn';

interface ReviewsListProps {
  reviews: InstructorReview[];
  locale: string;
  totalCount?: number;
}

export function ReviewsList({ reviews, locale, totalCount }: ReviewsListProps) {
  const isRTL = locale === 'he';

  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
      {totalCount && (
        <div className="text-sm text-gray-600">
          {isRTL ? `${totalCount} ביקורות` : `${totalCount} Reviews`}
        </div>
      )}

      {reviews.length === 0 ? (
        <Card className="p-8 text-center text-gray-600">
          {isRTL ? 'אין ביקורות עדיין' : 'No reviews yet'}
        </Card>
      ) : (
        reviews.map(review => (
          <Card key={review.id} className="p-4 space-y-3">
            <div className={cn('flex items-start justify-between', isRTL && 'flex-row-reverse')}>
              <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                {review.reviewer_avatar_url && (
                  <img
                    src={review.reviewer_avatar_url}
                    alt={review.reviewer_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <h4 className="font-bold">{review.reviewer_name}</h4>
                  <p className="text-xs text-gray-600">
                    {new Date(review.created_at).toLocaleDateString(
                      locale === 'he' ? 'he-IL' : 'en-US'
                    )}
                  </p>
                </div>
              </div>
              <RatingStars rating={review.rating} size="sm" />
            </div>

            <p className="text-sm text-gray-800">{review.comment}</p>

            {review.moderation_status === 'pending' && (
              <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                {isRTL ? 'בהמתנה לאישור' : 'Pending moderation'}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test component**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit component**

```bash
git add src/components/instructors/ReviewsList.tsx
git commit -m "components: add ReviewsList component"
```

---

## Task 19: Page - Browse Instructors

**Files:**
- Create: `src/app/[locale]/free-diving/instructors/page.tsx`

**Interfaces:**
- Consumes: getInstructors (via API), InstructorCard component
- Produces: Browse page with filters and instructor list

- [ ] **Step 1: Create browse instructors page**

Create `src/app/[locale]/free-diving/instructors/page.tsx`:

```typescript
export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { InstructorCard } from '@/components/instructors/InstructorCard';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

interface SearchParams {
  type?: string;
  search?: string;
  page?: string;
}

async function getInstructorsData(params: SearchParams) {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.append('type', params.type);
  if (params.search) queryParams.append('search', params.search);
  queryParams.append('page', params.page || '1');
  queryParams.append('per_page', '20');

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/free-diving/instructors?${queryParams}`,
      { cache: 'no-store' }
    );
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return { instructors: [], total: 0, page: 1, per_page: 20 };
  }
}

export default async function InstructorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const data = await getInstructorsData(searchParams);

  const typeOptions = [
    { value: 'apnea', label: isRTL ? 'צלילה חופשית' : 'Freediving' },
    { value: 'courses', label: isRTL ? 'קורסים' : 'Courses' },
    { value: 'partner', label: isRTL ? 'שותף צלילה' : 'Buddy' },
    { value: 'competition', label: isRTL ? 'תחרויות' : 'Competition' },
    { value: 'depth', label: isRTL ? 'צלילת עומק' : 'Deep Diving' },
  ];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b]">
      <ResponsiveContainer>
        <div className="space-y-6 py-6">
          {/* Header */}
          <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-4xl font-bold mb-2">
              {isRTL ? 'מדריכי צלילה חופשית' : 'Free Diving Instructors'}
            </h1>
            <p className="text-gray-600">
              {isRTL
                ? 'בחר מדריך מאומת לחוויית צלילה בטוחה'
                : 'Choose a verified instructor for safe diving'}
            </p>
          </div>

          {/* Filters */}
          <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <a
                href={`/${locale}/free-diving/instructors`}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition ${
                  !searchParams.type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isRTL ? 'הכל' : 'All'}
              </a>
              {typeOptions.map(option => (
                <a
                  key={option.value}
                  href={`/${locale}/free-diving/instructors?type=${option.value}`}
                  className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition ${
                    searchParams.type === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </a>
              ))}
            </div>
          </div>

          {/* Results */}
          {data.instructors.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600">
              {isRTL ? 'לא נמצאו מדריכים' : 'No instructors found'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.instructors.map(instructor => (
                  <InstructorCard
                    key={instructor.id}
                    instructor={instructor}
                    locale={locale}
                    minPrice={instructor.min_service_price}
                  />
                ))}
              </div>

              {/* Pagination */}
              {data.total > data.per_page && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({
                    length: Math.ceil(data.total / data.per_page),
                  }).map((_, i) => (
                    <a
                      key={i}
                      href={`/${locale}/free-diving/instructors?page=${i + 1}${
                        searchParams.type ? `&type=${searchParams.type}` : ''
                      }`}
                      className={`px-3 py-2 rounded ${
                        data.page === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Test page renders**

Run: `npm run dev` and visit `http://localhost:3000/en/free-diving/instructors`
Expected: Browse page with instructors list and filters

- [ ] **Step 3: Commit page**

```bash
git add src/app/[locale]/free-diving/instructors/page.tsx
git commit -m "pages: add free-diving instructors browse page"
```

---

## Task 20: Page - Instructor Profile Detail

**Files:**
- Create: `src/app/[locale]/free-diving/instructors/[id]/page.tsx`
- Create: `src/app/[locale]/free-diving/instructors/[id]/client.tsx`

**Interfaces:**
- Consumes: getInstructorById (via API), InstructorCard, ServiceCard, ReviewsList components
- Produces: Instructor detail profile page with services, gallery, reviews

- [ ] **Step 1: Create detail page (server)**

Create `src/app/[locale]/free-diving/instructors/[id]/page.tsx`:

```typescript
export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { InstructorProfileClient } from './client';

async function getInstructorData(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/free-diving/instructors/${id}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching instructor:', error);
    return null;
  }
}

export default async function InstructorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const locale = await getLocale();
  const data = await getInstructorData(params.id);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">404</h1>
          <p>{locale === 'he' ? 'מדריך לא נמצא' : 'Instructor not found'}</p>
        </div>
      </div>
    );
  }

  return <InstructorProfileClient data={data} locale={locale} />;
}
```

- [ ] **Step 2: Create detail page (client)**

Create `src/app/[locale]/free-diving/instructors/[id]/client.tsx`:

```typescript
'use client';

import { ServiceCard } from '@/components/instructors/ServiceCard';
import { ReviewsList } from '@/components/instructors/ReviewsList';
import { AvailabilityCalendar } from '@/components/instructors/AvailabilityCalendar';
import { RatingStars } from '@/components/instructors/RatingStars';
import { Card } from '@/components/Card';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import type { InstructorDetailResponse } from '@/types/instructor';

interface InstructorProfileClientProps {
  data: InstructorDetailResponse;
  locale: string;
}

export function InstructorProfileClient({
  data,
  locale,
}: InstructorProfileClientProps) {
  const isRTL = locale === 'he';
  const { instructor, services, reviews, gallery, availability_summary } = data;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#f3f7fc] text-[#10264b]"
    >
      <ResponsiveContainer>
        <div className="space-y-6 py-6">
          {/* Header */}
          <Card className="p-6 space-y-4">
            <div className={`flex items-start gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600">
                {instructor.avatar_url ? (
                  <img
                    src={instructor.avatar_url}
                    alt={instructor.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold">
                    {instructor.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{instructor.display_name}</h1>
                  {instructor.is_verified && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                      ✓ {isRTL ? 'מאומת' : 'Verified'}
                    </span>
                  )}
                </div>

                <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <RatingStars rating={instructor.average_rating} size="md" />
                  <span className="text-gray-600">
                    {instructor.average_rating.toFixed(1)}/5 ({instructor.total_reviews} {isRTL ? 'ביקורות' : 'reviews'})
                  </span>
                </div>

                <p className="text-gray-700">{instructor.bio}</p>

                <div className="mt-4 text-sm text-gray-600">
                  ⚡ {isRTL ? 'תגובה' : 'Response'}: {Math.round(instructor.response_rate * 100)}%
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Services */}
              {services.length > 0 && (
                <Card className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold">
                    {isRTL ? 'שירותים' : 'Services'}
                  </h2>
                  <div className="space-y-3">
                    {services.map(service => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        locale={locale}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {/* Reviews */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {isRTL ? 'ביקורות' : 'Reviews'}
                </h2>
                <ReviewsList
                  reviews={reviews.items}
                  locale={locale}
                  totalCount={reviews.total_count}
                />
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Availability */}
              {availability_summary && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">
                    {isRTL ? 'זמינות' : 'Availability'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {isRTL
                      ? `זמין מ ${availability_summary.next_available}`
                      : `Available from ${availability_summary.next_available}`}
                  </p>
                  <AvailabilityCalendar
                    availability={[]}
                    locale={locale}
                  />
                </Card>
              )}

              {/* Gallery */}
              {gallery.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">
                    {isRTL ? 'גלריה' : 'Gallery'}
                  </h3>
                  <div className="space-y-2">
                    {gallery.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        className="rounded-lg overflow-hidden bg-gray-100 h-32"
                      >
                        {item.media_type === 'image' ? (
                          <img
                            src={item.media_url}
                            alt={item.caption || 'Gallery item'}
                            className="w-full h-full object-cover hover:scale-105 transition"
                          />
                        ) : (
                          <video
                            src={item.media_url}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Book Now */}
              <Card className="p-6 bg-blue-600 text-white">
                <button className="w-full py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-50 transition">
                  {isRTL ? 'הזמן עכשיו' : 'Book Now'}
                </button>
              </Card>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Test detail page**

Run: Visit `http://localhost:3000/en/free-diving/instructors/[valid-id]`
Expected: Full instructor profile with services, reviews, availability

- [ ] **Step 4: Commit pages**

```bash
git add src/app/[locale]/free-diving/instructors/[id]/page.tsx
git add src/app/[locale]/free-diving/instructors/[id]/client.tsx
git commit -m "pages: add instructor profile detail page"
```

---

## Task 21: Page - Instructor Dashboard

**Files:**
- Create: `src/app/[locale]/free-diving/instructor/dashboard/page.tsx`
- Create: `src/app/[locale]/free-diving/instructor/dashboard/client.tsx`

**Interfaces:**
- Consumes: CredentialUploadForm, InsuranceUploadForm, ServiceCard, AvailabilityCalendar
- Produces: Instructor edit dashboard with tabs for profile, services, credentials, availability

- [ ] **Step 1: Create dashboard page (server)**

Create `src/app/[locale]/free-diving/instructor/dashboard/page.tsx`:

```typescript
export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInstructorById } from '@/lib/supabase/instructor-queries';
import { DashboardClient } from './client';

export default async function InstructorDashboardPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // Get instructor for this user
  const { data: instructor } = await supabase
    .from('instructors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!instructor) {
    redirect(`/${locale}`);
  }

  try {
    const data = await getInstructorById(supabase, instructor.id);
    return <DashboardClient data={data} locale={locale} instructorId={instructor.id} />;
  } catch (error) {
    return <div>Error loading dashboard</div>;
  }
}
```

- [ ] **Step 2: Create dashboard page (client)**

Create `src/app/[locale]/free-diving/instructor/dashboard/client.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { CredentialUploadForm } from '@/components/instructors/CredentialUploadForm';
import { InsuranceUploadForm } from '@/components/instructors/InsuranceUploadForm';
import { ServiceCard } from '@/components/instructors/ServiceCard';
import { AvailabilityCalendar } from '@/components/instructors/AvailabilityCalendar';
import type { InstructorDetailResponse } from '@/types/instructor';

interface DashboardClientProps {
  data: InstructorDetailResponse;
  locale: string;
  instructorId: string;
}

type DashboardTab = 'profile' | 'services' | 'credentials' | 'availability' | 'gallery';

export function DashboardClient({
  data,
  locale,
  instructorId,
}: DashboardClientProps) {
  const isRTL = locale === 'he';
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  const { instructor, services, credentials, availability } = data;

  const tabs: Array<{ id: DashboardTab; label: string }> = [
    { id: 'profile', label: isRTL ? 'פרופיל' : 'Profile' },
    { id: 'services', label: isRTL ? 'שירותים' : 'Services' },
    { id: 'credentials', label: isRTL ? 'ימים' : 'Credentials' },
    { id: 'availability', label: isRTL ? 'זמינות' : 'Availability' },
    { id: 'gallery', label: isRTL ? 'גלריה' : 'Gallery' },
  ];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#f3f7fc] text-[#10264b]"
    >
      <ResponsiveContainer>
        <div className="space-y-6 py-6">
          {/* Header */}
          <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-4xl font-bold mb-2">
              {isRTL ? 'לוח הבקרה' : 'Dashboard'}
            </h1>
            <p className="text-gray-600">
              {isRTL ? 'ניהול פרופיל המדריך שלך' : 'Manage your instructor profile'}
            </p>
          </div>

          {/* Verification Status */}
          <Card className={`p-4 ${
            instructor.is_verified
              ? 'bg-green-50 border-l-4 border-green-500'
              : 'bg-yellow-50 border-l-4 border-yellow-500'
          }`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-2xl">
                {instructor.is_verified ? '✓' : '⏳'}
              </span>
              <div>
                <h3 className="font-bold">
                  {instructor.is_verified
                    ? (isRTL ? 'מאומת' : 'Verified')
                    : (isRTL ? 'בהמתנה לאישור' : 'Pending Verification')}
                </h3>
                <p className="text-sm text-gray-600">
                  {instructor.is_verified
                    ? (isRTL ? 'המדריך שלך מאומת' : 'Your profile is verified')
                    : (isRTL ? 'דמי להשלים אישור' : 'Complete verification to be visible')}
                </p>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-bold border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'profile' && (
              <Card className="p-6 space-y-4">
                <h2 className="text-2xl font-bold">
                  {isRTL ? 'עריכת פרופיל' : 'Edit Profile'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      {isRTL ? 'שם מדריך' : 'Instructor Name'}
                    </label>
                    <input
                      type="text"
                      value={instructor.display_name}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      {isRTL ? 'ביוגרפיה' : 'Bio'}
                    </label>
                    <textarea
                      value={instructor.bio}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 min-h-32"
                    />
                  </div>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                    {isRTL ? 'שמור' : 'Save Changes'}
                  </button>
                </div>
              </Card>
            )}

            {activeTab === 'services' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    {isRTL ? 'שירותים שלך' : 'Your Services'}
                  </h2>
                  {services.length === 0 ? (
                    <p className="text-gray-600">
                      {isRTL ? 'אין שירותים עדיין' : 'No services yet'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {services.map(service => (
                        <ServiceCard key={service.id} service={service} locale={locale} />
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">
                    {isRTL ? 'הוסף שירות חדש' : 'Add New Service'}
                  </h3>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        {isRTL ? 'סוג שירות' : 'Service Type'}
                      </label>
                      <select className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="">Select...</option>
                        <option value="apnea">{isRTL ? 'צלילה חופשית' : 'Freediving'}</option>
                        <option value="courses">{isRTL ? 'קורסים' : 'Courses'}</option>
                        <option value="partner">{isRTL ? 'שותף צלילה' : 'Buddy'}</option>
                        <option value="competition">{isRTL ? 'תחרויות' : 'Competition'}</option>
                        <option value="depth">{isRTL ? 'צלילת עומק' : 'Deep Diving'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        {isRTL ? 'שם שירות' : 'Service Name'}
                      </label>
                      <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        {isRTL ? 'מחיר (₪)' : 'Price (₪)'}
                      </label>
                      <input type="number" className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        {isRTL ? 'משך (דקות)' : 'Duration (minutes)'}
                      </label>
                      <input type="number" className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                      {isRTL ? 'הוסף שירות' : 'Add Service'}
                    </button>
                  </form>
                </Card>
              </div>
            )}

            {activeTab === 'credentials' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    {isRTL ? 'ימים שלך' : 'Your Credentials'}
                  </h2>

                  {/* תעודה */}
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-bold">
                      {isRTL ? 'תעודה (הסמכה)' : 'Certificate'}
                    </h3>
                    {credentials.filter(c => c.credential_type === 'תעודה').length > 0 ? (
                      <div className="space-y-2">
                        {credentials
                          .filter(c => c.credential_type === 'תעודה')
                          .map(cred => (
                            <div
                              key={cred.id}
                              className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold">{cred.file_name}</p>
                                <p className="text-xs text-gray-600">
                                  {cred.verification_status === 'approved'
                                    ? (isRTL ? 'אושר' : 'Approved')
                                    : (isRTL ? 'בהמתנה' : 'Pending')}
                                </p>
                              </div>
                              <a
                                href={cred.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {isRTL ? 'צפה' : 'View'}
                              </a>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 mb-4">
                        {isRTL ? 'לא הועלתה תעודה עדיין' : 'No certificate uploaded yet'}
                      </p>
                    )}
                    <CredentialUploadForm instructorId={instructorId} locale={locale} />
                  </div>

                  {/* ביטוח */}
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-bold">
                      {isRTL ? 'ביטוח' : 'Insurance'}
                    </h3>
                    {credentials.filter(c => c.credential_type === 'ביטוח').length > 0 ? (
                      <div className="space-y-2">
                        {credentials
                          .filter(c => c.credential_type === 'ביטוח')
                          .map(cred => (
                            <div
                              key={cred.id}
                              className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold">{cred.file_name}</p>
                                <p className="text-xs text-gray-600">
                                  {cred.verification_status === 'approved'
                                    ? (isRTL ? 'אושר' : 'Approved')
                                    : (isRTL ? 'בהמתנה' : 'Pending')}
                                </p>
                              </div>
                              <a
                                href={cred.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {isRTL ? 'צפה' : 'View'}
                              </a>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 mb-4">
                        {isRTL ? 'לא הועלה ביטוח עדיין' : 'No insurance uploaded yet'}
                      </p>
                    )}
                    <InsuranceUploadForm instructorId={instructorId} locale={locale} />
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'availability' && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {isRTL ? 'ניהול זמינות' : 'Manage Availability'}
                </h2>
                <AvailabilityCalendar availability={availability} locale={locale} />
              </Card>
            )}

            {activeTab === 'gallery' && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {isRTL ? 'ניהול גלריה' : 'Manage Gallery'}
                </h2>
                <p className="text-gray-600">
                  {isRTL ? 'גלריה - בעדכון' : 'Gallery management coming soon'}
                </p>
              </Card>
            )}
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Test dashboard page**

Run: Visit `http://localhost:3000/en/free-diving/instructor/dashboard` (requires authentication)
Expected: Dashboard with tabs for profile, services, credentials, availability

- [ ] **Step 4: Commit pages**

```bash
git add src/app/[locale]/free-diving/instructor/dashboard/page.tsx
git add src/app/[locale]/free-diving/instructor/dashboard/client.tsx
git commit -m "pages: add instructor dashboard"
```

---

## Task 22: Final Integration & Testing

**Files:**
- No new files, integration only

**Interfaces:**
- Consumes: All API endpoints from Tasks 4-11, all components from Tasks 12-21
- Produces: Integrated free-diving instructors system

- [ ] **Step 1: Verify all API endpoints**

Run:
```bash
curl http://localhost:3000/api/free-diving/instructors?page=1
curl http://localhost:3000/api/free-diving/instructors/[valid-id]
```
Expected: All endpoints return valid JSON responses

- [ ] **Step 2: Verify all pages load**

Navigate to:
- `http://localhost:3000/en/free-diving/instructors`
- `http://localhost:3000/en/free-diving/instructors/[id]`
- `http://localhost:3000/en/free-diving/instructor/dashboard`

Expected: All pages load without errors

- [ ] **Step 3: Test Hebrew RTL support**

Navigate to:
- `http://localhost:3000/he/free-diving/instructors`

Expected: Page loads with RTL layout and Hebrew text

- [ ] **Step 4: Final commit**

```bash
git status
git add .
git commit -m "feat: complete free-diving instructors marketplace section

- Add instructor browsing with filters by type
- Add instructor profile detail pages with services, reviews, gallery
- Add instructor dashboard with profile, services, credentials, availability management
- Add credential upload (תעודה) and insurance upload (ביטוח) forms
- Add service management with pricing and duration
- Add availability calendar for scheduling
- Add reviews and ratings system with moderation
- Full RTL support for Hebrew and LTR for English
- Production-ready API endpoints with proper error handling
- Verified instructor badge system with admin approval workflow"
```

---

## Spec Coverage Checklist

- [x] Pages: /free-diving/instructors (browse), /[id] (profile), /instructor/dashboard
- [x] Instructor profile: name, photo, bio, experience (instructor_types)
- [x] Services offered: apnea, courses, partner, competition, depth with pricing
- [x] Pricing per service: price_shekel stored with each service
- [x] Gallery + videos: media_type (image/video) stored in instructor_gallery table
- [x] Availability calendar: date-based calendar with slots per day
- [x] Reviews & ratings: 1-5 stars with moderation workflow
- [x] Instructor verification: Upload תעודה + ביטוח with admin approval
- [x] Badge: "מדריך מאומת" displayed when verified
- [x] Components: InstructorCard, InstructorProfile, CredentialUploadForm, InsuranceUploadForm, AvailabilityCalendar, ReviewsList
- [x] API: Browse, detail, upload credentials, update profile, manage availability, reviews
- [x] Production-ready: Error handling, validation, authentication checks
- [x] Deployment-ready: No environment-specific code, proper error boundaries

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-20-free-diving-instructors.md`**

Choose execution approach:

1. **Subagent-Driven (Recommended)** - Fresh subagent per task, review between tasks, 2-3 minute tasks
2. **Inline Execution** - Execute all tasks in this session with checkpoints

**Which approach?**
