# Photo Gallery + Dynamic Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete photo gallery system with hero image rotation, dynamic displays, filters, lightbox view, ratings, and RTL/LTR support across dive site pages.

**Architecture:** 
- Extends existing `dive_sites` table with photo metadata (photos table + junction)
- Hero image rotates every 3 days with indicator showing last update
- Gallery page at `/dive-sites/[id]/gallery` with filters, pagination, and lightbox
- Homepage hero slider shows random featured sites with rotating images
- Components: HeroImageWithRotationIndicator, PhotoGallery, PhotoLightbox, PhotoCard, RotationBadge
- Uses Next.js Image optimization, Supabase Storage for images, server/client components where appropriate
- Lazy loading with skeleton placeholders, error boundaries

**Tech Stack:**
- Next.js 15+ (with Turbopack)
- React 19+ (Server/Client Components)
- Supabase (PostgreSQL + Storage)
- TypeScript (strict mode)
- Tailwind CSS
- next-intl (i18n with RTL/LTR)

## Global Constraints

- All code must be TypeScript with strict mode enabled
- Hebrew (RTL) and English (LTR) support required on all components
- Image paths via Supabase Storage: `dive-sites/{site_id}/photos/{photo_id}`
- Database tables use `_at` suffix for timestamps (created_at, updated_at)
- Follow existing DiveSite pattern: server-side data fetch + client interactivity
- Pagination: 12 items per page
- Rotation check: every 3 days (hero + homepage)
- Use existing `AppIcon` component for all icons
- Responsive: 1 col mobile, 2 cols tablet, 3-4 cols desktop

---

## File Structure

```
src/
├── app/[locale]/
│   ├── dive-sites/
│   │   └── [id]/
│   │       └── gallery/
│   │           ├── page.tsx (Gallery page - server)
│   │           └── client.tsx (Gallery client logic)
│   ├── page.tsx (Updated: add hero slider)
│   └── components/
│       └── HomeHeroSlider.tsx
├── components/
│   ├── gallery/
│   │   ├── HeroImageWithRotationIndicator.tsx
│   │   ├── PhotoGallery.tsx
│   │   ├── PhotoLightbox.tsx
│   │   ├── PhotoCard.tsx
│   │   ├── RotationBadge.tsx
│   │   ├── PhotoSkeleton.tsx
│   │   └── GalleryFilters.tsx
│   └── index.ts (export gallery components)
├── hooks/
│   ├── usePhotos.ts (Fetch & cache photos)
│   ├── usePhotoLightbox.ts (Lightbox state)
│   └── usePhotoRotation.ts (Detect rotation updates)
├── lib/
│   ├── gallery/
│   │   ├── schemas.ts (Zod schemas for photo)
│   │   ├── storage.ts (Supabase Storage operations)
│   │   ├── photos-service.ts (Photo fetch/filter logic)
│   │   └── rotation-service.ts (Hero rotation logic)
│   └── supabase/
│       └── database.ts (Database operations)
├── app/api/
│   ├── photos/
│   │   ├── route.ts (GET photos - paginated/filtered)
│   │   └── [id]/
│   │       ├── route.ts (GET single photo)
│   │       ├── like/route.ts (POST like)
│   │       └── rating/route.ts (POST rating)
│   └── gallery/
│       ├── rotation-check/route.ts (Check if rotation needed)
│       └── featured-sites/route.ts (Get random featured)
└── types/
    ├── supabase.ts (Updated: add photos table)
    └── gallery.ts (Photo, PhotoFilter, PhotoRating types)
```

---

## Task 1: Update Supabase Types & Create Photo Schema

**Files:**
- Modify: `src/types/supabase.ts`
- Create: `src/types/gallery.ts`
- Create: `src/lib/gallery/schemas.ts`

**Interfaces:**
- Produces: 
  - `Photo` table Row type
  - `PhotoInsert` / `PhotoUpdate` types
  - `PhotoRating` table Row type
  - Zod schemas: `photoInsertSchema`, `photoUpdateSchema`, `photoFilterSchema`

- [ ] **Step 1: Update supabase.ts with photos table**

Open `src/types/supabase.ts` and add these table definitions inside the `Tables` object (before the closing brace of `Tables`):

```typescript
      dive_site_photos: {
        Row: {
          id: string;
          dive_site_id: string;
          photo_url: string;
          storage_path: string;
          photographer_name: string;
          photographer_avatar_url: string | null;
          caption: string | null;
          taken_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dive_site_id: string;
          photo_url: string;
          storage_path: string;
          photographer_name: string;
          photographer_avatar_url?: string | null;
          caption?: string | null;
          taken_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dive_site_id?: string;
          photo_url?: string;
          storage_path?: string;
          photographer_name?: string;
          photographer_avatar_url?: string | null;
          caption?: string | null;
          taken_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photo_ratings: {
        Row: {
          id: string;
          photo_id: string;
          user_id: string;
          rating: number; // 1-5
          liked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photo_id: string;
          user_id: string;
          rating?: number;
          liked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string;
          user_id?: string;
          rating?: number;
          liked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_hero_rotation: {
        Row: {
          id: string;
          dive_site_id: string;
          current_photo_id: string;
          last_rotated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dive_site_id: string;
          current_photo_id: string;
          last_rotated_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dive_site_id?: string;
          current_photo_id?: string;
          last_rotated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
```

- [ ] **Step 2: Create gallery.ts types**

Create `src/types/gallery.ts` with:

```typescript
import type { Database } from './supabase';

export type Photo = Database['public']['Tables']['dive_site_photos']['Row'];
export type PhotoInsert = Database['public']['Tables']['dive_site_photos']['Insert'];
export type PhotoUpdate = Database['public']['Tables']['dive_site_photos']['Update'];

export type PhotoRating = Database['public']['Tables']['photo_ratings']['Row'];
export type PhotoRatingInsert = Database['public']['Tables']['photo_ratings']['Insert'];
export type PhotoRatingUpdate = Database['public']['Tables']['photo_ratings']['Update'];

export type SiteHeroRotation = Database['public']['Tables']['site_hero_rotation']['Row'];
export type SiteHeroRotationInsert = Database['public']['Tables']['site_hero_rotation']['Insert'];

export interface PhotoWithStats extends Photo {
  rating_avg: number | null;
  rating_count: number;
  like_count: number;
  is_liked: boolean;
  user_rating: number | null;
}

export interface PhotoFilter {
  dive_site_id: string;
  sort_by: 'recent' | 'popular' | 'top-rated' | 'oldest';
  page: number;
  per_page: number;
  search?: string;
}

export interface GalleryResponse {
  photos: PhotoWithStats[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}
```

- [ ] **Step 3: Create gallery schemas**

Create `src/lib/gallery/schemas.ts` with Zod validators:

```typescript
import { z } from 'zod';

export const photoInsertSchema = z.object({
  dive_site_id: z.string().uuid(),
  photo_url: z.string().url(),
  storage_path: z.string().min(1),
  photographer_name: z.string().min(1).max(100),
  photographer_avatar_url: z.string().url().optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  taken_at: z.string().datetime(),
});

export const photoUpdateSchema = photoInsertSchema.partial();

export const photoFilterSchema = z.object({
  dive_site_id: z.string().uuid(),
  sort_by: z.enum(['recent', 'popular', 'top-rated', 'oldest']).default('recent'),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(12),
  search: z.string().optional(),
});

export const photoRatingSchema = z.object({
  photo_id: z.string().uuid(),
  user_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  liked: z.boolean().default(false),
});

export type PhotoInsertSchema = z.infer<typeof photoInsertSchema>;
export type PhotoFilterSchema = z.infer<typeof photoFilterSchema>;
export type PhotoRatingSchema = z.infer<typeof photoRatingSchema>;
```

- [ ] **Step 4: Verify types compile**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/types/supabase.ts src/types/gallery.ts src/lib/gallery/schemas.ts
git commit -m "feat: add photo gallery database schema and types"
```

---

## Task 2: Create Photo Storage & Database Service Layer

**Files:**
- Create: `src/lib/gallery/storage.ts`
- Create: `src/lib/gallery/photos-service.ts`
- Create: `src/lib/gallery/rotation-service.ts`

**Interfaces:**
- Consumes: 
  - `Photo`, `PhotoWithStats`, `PhotoFilter` from Task 1
  - `createClient()` from `@/lib/supabase/server`
- Produces:
  - `getPhotosForSite(siteId, filter): Promise<GalleryResponse>`
  - `getPhotoById(id): Promise<PhotoWithStats>`
  - `getHeroPhoto(siteId): Promise<Photo>`
  - `checkRotationNeeded(siteId): Promise<boolean>`
  - `rotateHeroPhoto(siteId): Promise<Photo>`

- [ ] **Step 1: Create storage.ts for Supabase Storage operations**

Create `src/lib/gallery/storage.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Photo } from '@/types/gallery';

export const STORAGE_BUCKET = 'dive-site-photos';

export async function getPublicPhotoUrl(storagePath: string): Promise<string> {
  const supabase = await createClient();
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadPhoto(
  file: File,
  siteId: string,
  photoId: string
): Promise<{ path: string; url: string }> {
  const supabase = await createClient();
  const path = `${siteId}/${photoId}/${file.name}`;
  
  const { error, data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file);

  if (error) throw error;

  const url = await getPublicPhotoUrl(path);
  return { path, url };
}

export async function deletePhoto(storagePath: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) throw error;
}
```

- [ ] **Step 2: Create photos-service.ts for photo data operations**

Create `src/lib/gallery/photos-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Photo, PhotoWithStats, PhotoFilter, GalleryResponse } from '@/types/gallery';

export async function getPhotosForSite(
  filter: PhotoFilter
): Promise<GalleryResponse> {
  const supabase = await createClient();
  const offset = (filter.page - 1) * filter.per_page;

  let query = supabase
    .from('dive_site_photos')
    .select('*', { count: 'exact' });

  query = query.eq('dive_site_id', filter.dive_site_id);

  if (filter.search) {
    query = query.or(
      `caption.ilike.%${filter.search}%,photographer_name.ilike.%${filter.search}%`
    );
  }

  // Apply sorting
  const sortConfig = {
    recent: { column: 'created_at', ascending: false },
    oldest: { column: 'created_at', ascending: true },
    popular: { column: 'taken_at', ascending: false },
    'top-rated': { column: 'taken_at', ascending: false },
  };

  const { column, ascending } = sortConfig[filter.sort_by];
  query = query.order(column, { ascending });

  query = query.range(offset, offset + filter.per_page - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  // Fetch stats for each photo (likes, ratings)
  const photos = await Promise.all(
    (data || []).map((photo) => enrichPhotoWithStats(photo))
  );

  return {
    photos,
    total: count || 0,
    page: filter.page,
    per_page: filter.per_page,
    has_next: offset + filter.per_page < (count || 0),
  };
}

async function enrichPhotoWithStats(photo: Photo): Promise<PhotoWithStats> {
  const supabase = await createClient();

  const { data: stats } = await supabase
    .rpc('get_photo_stats', { photo_id: photo.id })
    .single();

  return {
    ...photo,
    rating_avg: stats?.rating_avg || null,
    rating_count: stats?.rating_count || 0,
    like_count: stats?.like_count || 0,
    is_liked: stats?.is_liked || false,
    user_rating: stats?.user_rating || null,
  };
}

export async function getPhotoById(id: string): Promise<PhotoWithStats> {
  const supabase = await createClient();

  const { data: photo, error } = await supabase
    .from('dive_site_photos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!photo) throw new Error('Photo not found');

  return enrichPhotoWithStats(photo);
}

export async function updatePhotoRating(
  photoId: string,
  userId: string,
  rating?: number,
  liked?: boolean
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('photo_ratings').upsert(
    {
      photo_id: photoId,
      user_id: userId,
      rating,
      liked,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'photo_id,user_id' }
  );

  if (error) throw error;
}
```

- [ ] **Step 3: Create rotation-service.ts for hero image rotation**

Create `src/lib/gallery/rotation-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Photo, SiteHeroRotation } from '@/types/gallery';

const ROTATION_INTERVAL_DAYS = 3;

export async function getHeroPhoto(siteId: string): Promise<Photo> {
  const supabase = await createClient();

  // Get current hero rotation
  const { data: rotation } = await supabase
    .from('site_hero_rotation')
    .select('*')
    .eq('dive_site_id', siteId)
    .single();

  if (!rotation) {
    // Initialize with first photo
    return getFirstPhotoForSite(siteId);
  }

  // Check if rotation needed
  const lastRotated = new Date(rotation.last_rotated_at);
  const daysSinceRotation = Math.floor(
    (Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceRotation >= ROTATION_INTERVAL_DAYS) {
    return rotateHeroPhoto(siteId);
  }

  // Get current photo
  const { data: photo, error } = await supabase
    .from('dive_site_photos')
    .select('*')
    .eq('id', rotation.current_photo_id)
    .single();

  if (error || !photo) {
    return rotateHeroPhoto(siteId);
  }

  return photo;
}

export async function checkRotationNeeded(siteId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: rotation } = await supabase
    .from('site_hero_rotation')
    .select('last_rotated_at')
    .eq('dive_site_id', siteId)
    .single();

  if (!rotation) return true;

  const lastRotated = new Date(rotation.last_rotated_at);
  const daysSinceRotation = Math.floor(
    (Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceRotation >= ROTATION_INTERVAL_DAYS;
}

export async function rotateHeroPhoto(siteId: string): Promise<Photo> {
  const supabase = await createClient();

  // Get random photo
  const { data: randomPhoto, error: photoError } = await supabase
    .rpc('get_random_site_photo', { site_id: siteId })
    .single();

  if (photoError || !randomPhoto) {
    return getFirstPhotoForSite(siteId);
  }

  // Update or create rotation record
  const rotation = {
    dive_site_id: siteId,
    current_photo_id: randomPhoto.id,
    last_rotated_at: new Date().toISOString(),
  };

  await supabase
    .from('site_hero_rotation')
    .upsert(rotation, { onConflict: 'dive_site_id' });

  return randomPhoto;
}

export async function getFirstPhotoForSite(siteId: string): Promise<Photo> {
  const supabase = await createClient();

  const { data: photo, error } = await supabase
    .from('dive_site_photos')
    .select('*')
    .eq('dive_site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !photo) {
    throw new Error(`No photos found for site ${siteId}`);
  }

  return photo;
}

export function getLastRotationDisplay(lastRotatedAt: string): string {
  const lastRotated = new Date(lastRotatedAt);
  const daysSince = Math.floor(
    (Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince === 0) return 'today';
  if (daysSince === 1) return '1 day ago';
  return `${daysSince} days ago`;
}
```

- [ ] **Step 4: Test service functions compile**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/gallery/storage.ts src/lib/gallery/photos-service.ts src/lib/gallery/rotation-service.ts
git commit -m "feat: add photo gallery service layer with storage and rotation"
```

---

## Task 3: Create API Routes for Photo Operations

**Files:**
- Create: `src/app/api/photos/route.ts`
- Create: `src/app/api/photos/[id]/route.ts`
- Create: `src/app/api/photos/[id]/like/route.ts`
- Create: `src/app/api/photos/[id]/rating/route.ts`
- Create: `src/app/api/gallery/rotation-check/route.ts`
- Create: `src/app/api/gallery/featured-sites/route.ts`

**Interfaces:**
- Consumes: Services from Task 2
- Produces:
  - `GET /api/photos?site_id=X&sort=recent&page=1`
  - `GET /api/photos/[id]`
  - `POST /api/photos/[id]/like`
  - `POST /api/photos/[id]/rating`
  - `GET /api/gallery/rotation-check?site_id=X`
  - `GET /api/gallery/featured-sites`

- [ ] **Step 1: Create GET /api/photos route**

Create `src/app/api/photos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { photoFilterSchema } from '@/lib/gallery/schemas';
import { getPhotosForSite } from '@/lib/gallery/photos-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filter = photoFilterSchema.parse({
      dive_site_id: searchParams.get('site_id'),
      sort_by: searchParams.get('sort_by') || 'recent',
      page: parseInt(searchParams.get('page') || '1'),
      per_page: parseInt(searchParams.get('per_page') || '12'),
      search: searchParams.get('search'),
    });

    const response = await getPhotosForSite(filter);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create GET /api/photos/[id] route**

Create `src/app/api/photos/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPhotoById } from '@/lib/gallery/photos-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photo = await getPhotoById(params.id);
    return NextResponse.json(photo);
  } catch (error) {
    console.error('Failed to fetch photo:', error);
    return NextResponse.json(
      { error: 'Photo not found' },
      { status: 404 }
    );
  }
}
```

- [ ] **Step 3: Create POST /api/photos/[id]/like route**

Create `src/app/api/photos/[id]/like/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { updatePhotoRating } from '@/lib/gallery/photos-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { liked } = await request.json();
    await updatePhotoRating(params.id, user.id, undefined, liked);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update like:', error);
    return NextResponse.json(
      { error: 'Failed to update like' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create POST /api/photos/[id]/rating route**

Create `src/app/api/photos/[id]/rating/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { updatePhotoRating } from '@/lib/gallery/photos-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { rating } = await request.json();

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    await updatePhotoRating(params.id, user.id, rating, undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update rating:', error);
    return NextResponse.json(
      { error: 'Failed to update rating' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Create GET /api/gallery/rotation-check route**

Create `src/app/api/gallery/rotation-check/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkRotationNeeded, getHeroPhoto } from '@/lib/gallery/rotation-service';

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('site_id');
    
    if (!siteId) {
      return NextResponse.json(
        { error: 'site_id is required' },
        { status: 400 }
      );
    }

    const needed = await checkRotationNeeded(siteId);
    
    if (needed) {
      const hero = await getHeroPhoto(siteId);
      return NextResponse.json({ rotation_needed: true, hero });
    }

    return NextResponse.json({ rotation_needed: false });
  } catch (error) {
    console.error('Rotation check failed:', error);
    return NextResponse.json(
      { error: 'Rotation check failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6: Create GET /api/gallery/featured-sites route**

Create `src/app/api/gallery/featured-sites/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHeroPhoto } from '@/lib/gallery/rotation-service';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get 4 random dive sites
    const { data: sites, error } = await supabase
      .from('dive_sites')
      .select('id, name, description')
      .order('created_at', { ascending: false })
      .limit(4);

    if (error) throw error;

    // Get hero photo for each site
    const featured = await Promise.all(
      sites.map(async (site) => {
        try {
          const hero = await getHeroPhoto(site.id);
          return { ...site, hero_photo: hero };
        } catch {
          return { ...site, hero_photo: null };
        }
      })
    );

    return NextResponse.json(featured);
  } catch (error) {
    console.error('Failed to fetch featured sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured sites' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7: Verify routes compile**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/app/api/photos/ src/app/api/gallery/
git commit -m "feat: add photo API routes for CRUD and rotation"
```

---

## Task 4: Create Photo Gallery Components (Core UI)

**Files:**
- Create: `src/components/gallery/PhotoCard.tsx`
- Create: `src/components/gallery/PhotoSkeleton.tsx`
- Create: `src/components/gallery/RotationBadge.tsx`
- Create: `src/components/gallery/HeroImageWithRotationIndicator.tsx`
- Create: `src/components/gallery/GalleryFilters.tsx`
- Create: `src/components/gallery/index.ts`

**Interfaces:**
- Consumes: 
  - `AppIcon` from `@/components/AppIcon`
  - `Photo`, `PhotoWithStats` types
  - Utilities from `@/utils`
- Produces:
  - PhotoCard component (photo + metadata + interaction)
  - PhotoSkeleton component (loading placeholder)
  - RotationBadge component (3 days ago indicator)
  - HeroImageWithRotationIndicator component (full hero section)
  - GalleryFilters component (filter controls)

- [ ] **Step 1: Create PhotoCard.tsx**

Create `src/components/gallery/PhotoCard.tsx`:

```typescript
'use client';

import React, { useState } from 'react';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import type { PhotoWithStats } from '@/types/gallery';

interface PhotoCardProps {
  photo: PhotoWithStats;
  locale: 'en' | 'he';
  onPhotoClick?: () => void;
  onLikeToggle?: (liked: boolean) => void;
  onRatingSubmit?: (rating: number) => void;
}

export const PhotoCard = React.forwardRef<HTMLDivElement, PhotoCardProps>(
  ({ photo, locale, onPhotoClick, onLikeToggle, onRatingSubmit }, ref) => {
    const isRTL = locale === 'he';
    const [isLiked, setIsLiked] = useState(photo.is_liked);
    const [rating, setRating] = useState(photo.user_rating || 0);
    const [hoveredRating, setHoveredRating] = useState(0);

    const handleLikeClick = async () => {
      const newLiked = !isLiked;
      setIsLiked(newLiked);
      onLikeToggle?.(newLiked);

      try {
        await fetch(`/api/photos/${photo.id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ liked: newLiked }),
        });
      } catch (error) {
        console.error('Failed to update like:', error);
        setIsLiked(!newLiked);
      }
    };

    const handleRatingClick = async (value: number) => {
      setRating(value);
      onRatingSubmit?.(value);

      try {
        await fetch(`/api/photos/${photo.id}/rating`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: value }),
        });
      } catch (error) {
        console.error('Failed to update rating:', error);
      }
    };

    return (
      <div
        ref={ref}
        className="group flex flex-col gap-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
      >
        {/* Image Container */}
        <div
          className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 overflow-hidden cursor-pointer"
          onClick={onPhotoClick}
        >
          <img
            src={photo.photo_url}
            alt={photo.caption || 'Dive site photo'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLikeClick();
            }}
            className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} p-2 rounded-full transition-all ${
              isLiked
                ? 'bg-red-500 text-white'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white'
            }`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <AppIcon
              name={isLiked ? 'heart-filled' : 'heart'}
              className="h-5 w-5"
            />
          </button>

          {/* Like Count */}
          {photo.like_count > 0 && (
            <div
              className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} px-2 py-1 bg-white/80 dark:bg-slate-800/80 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300`}
            >
              {photo.like_count}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 px-3 pb-3 space-y-2">
          {/* Caption */}
          {photo.caption && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {photo.caption}
            </p>
          )}

          {/* Photographer Info */}
          <div
            className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {photo.photographer_avatar_url && (
              <img
                src={photo.photographer_avatar_url}
                alt={photo.photographer_name}
                className="h-6 w-6 rounded-full object-cover"
              />
            )}
            <div className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {photo.photographer_name}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {new Date(photo.taken_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US')}
              </p>
            </div>
          </div>

          {/* Rating */}
          <div
            className={`flex items-center gap-1 ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => handleRatingClick(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
                aria-label={`Rate ${value} stars`}
              >
                <AppIcon
                  name={
                    value <= (hoveredRating || rating)
                      ? 'star-filled'
                      : 'star'
                  }
                  className="h-4 w-4 text-yellow-400"
                />
              </button>
            ))}
            {photo.rating_count > 0 && (
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                ({photo.rating_count})
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {photo.rating_avg && (
              <span className="flex items-center gap-1">
                <AppIcon name="star-filled" className="h-3 w-3 text-yellow-400" />
                {photo.rating_avg.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <AppIcon name="eye" className="h-3 w-3" />
              {photo.like_count}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

PhotoCard.displayName = 'PhotoCard';
export default PhotoCard;
```

- [ ] **Step 2: Create PhotoSkeleton.tsx**

Create `src/components/gallery/PhotoSkeleton.tsx`:

```typescript
export const PhotoSkeleton: React.FC = () => (
  <div className="animate-pulse flex flex-col gap-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
    <div className="h-48 bg-slate-300 dark:bg-slate-700" />
    <div className="px-3 pb-3 space-y-2">
      <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-full" />
      <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-1/2 mt-2" />
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 w-4 bg-slate-300 dark:bg-slate-700 rounded" />
        ))}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Create RotationBadge.tsx**

Create `src/components/gallery/RotationBadge.tsx`:

```typescript
import { getLastRotationDisplay } from '@/lib/gallery/rotation-service';
import { AppIcon } from '@/components/AppIcon';

interface RotationBadgeProps {
  lastRotatedAt: string;
  locale: 'en' | 'he';
}

export const RotationBadge: React.FC<RotationBadgeProps> = ({
  lastRotatedAt,
  locale,
}) => {
  const display = getLastRotationDisplay(lastRotatedAt);
  const isRTL = locale === 'he';
  const labels = {
    today: { en: 'Updated today', he: 'עודכן היום' },
    default: { en: 'Updated', he: 'עודכן' },
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold ${
        isRTL ? 'flex-row-reverse' : ''
      }`}
    >
      <AppIcon name="check-circle" className="h-4 w-4" />
      <span>
        {display === 'today'
          ? labels.today[locale === 'he' ? 'he' : 'en']
          : `${labels.default[locale === 'he' ? 'he' : 'en']} ${display}`}
      </span>
    </div>
  );
};
```

- [ ] **Step 4: Create HeroImageWithRotationIndicator.tsx**

Create `src/components/gallery/HeroImageWithRotationIndicator.tsx`:

```typescript
'use client';

import React from 'react';
import { RotationBadge } from './RotationBadge';
import { AppIcon } from '@/components/AppIcon';
import type { Photo } from '@/types/gallery';

interface HeroImageWithRotationIndicatorProps {
  photo: Photo;
  siteId: string;
  siteName: string;
  locale: 'en' | 'he';
  onOpenGallery?: () => void;
}

export const HeroImageWithRotationIndicator = React.forwardRef<
  HTMLDivElement,
  HeroImageWithRotationIndicatorProps
>(
  (
    { photo, siteId, siteName, locale, onOpenGallery },
    ref
  ) => {
    const isRTL = locale === 'he';

    return (
      <div
        ref={ref}
        className="relative h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden group"
      >
        {/* Image */}
        <img
          src={photo.photo_url}
          alt={siteName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Rotation Badge - Top Right */}
        <div
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-10`}
        >
          <RotationBadge lastRotatedAt={photo.updated_at} locale={locale} />
        </div>

        {/* Photographer Info & Gallery Link - Bottom */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex items-end justify-between ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`text-white space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-sm text-white/80">{isRTL ? 'צילם' : 'Photo by'}</p>
            <p className="font-semibold">{photo.photographer_name}</p>
          </div>

          {/* View Gallery Button */}
          <button
            onClick={onOpenGallery}
            className="group/btn inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/95 hover:bg-white text-slate-900 font-semibold transition-all hover:shadow-lg"
          >
            <AppIcon name="images" className="h-5 w-5" />
            <span className="hidden sm:inline">
              {isRTL ? 'גלריה' : 'Gallery'}
            </span>
          </button>
        </div>
      </div>
    );
  }
);

HeroImageWithRotationIndicator.displayName = 'HeroImageWithRotationIndicator';
export default HeroImageWithRotationIndicator;
```

- [ ] **Step 5: Create GalleryFilters.tsx**

Create `src/components/gallery/GalleryFilters.tsx`:

```typescript
'use client';

import React from 'react';
import { AppIcon, type AppIconName } from '@/components/AppIcon';

interface GalleryFiltersProps {
  sortBy: 'recent' | 'popular' | 'top-rated' | 'oldest';
  onSortChange: (sort: 'recent' | 'popular' | 'top-rated' | 'oldest') => void;
  locale: 'en' | 'he';
}

export const GalleryFilters = React.forwardRef<HTMLDivElement, GalleryFiltersProps>(
  ({ sortBy, onSortChange, locale }, ref) => {
    const isRTL = locale === 'he';

    const filters = [
      { id: 'recent', label: isRTL ? 'הכי חדש' : 'Recent', icon: 'time' as AppIconName },
      { id: 'popular', label: isRTL ? 'פופולרי' : 'Popular', icon: 'heart' as AppIconName },
      { id: 'top-rated', label: isRTL ? 'דירוג גבוה' : 'Top Rated', icon: 'star-filled' as AppIconName },
      { id: 'oldest', label: isRTL ? 'הכי ישן' : 'Oldest', icon: 'archive' as AppIconName },
    ];

    return (
      <div
        ref={ref}
        className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onSortChange(filter.id as typeof sortBy)}
            className={`px-4 py-2 rounded-full border-2 transition-all font-semibold text-sm flex items-center gap-2 ${
              sortBy === filter.id
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-400'
            }`}
          >
            <AppIcon name={filter.icon} className="h-4 w-4" />
            {filter.label}
          </button>
        ))}
      </div>
    );
  }
);

GalleryFilters.displayName = 'GalleryFilters';
```

- [ ] **Step 6: Create index.ts export file**

Create `src/components/gallery/index.ts`:

```typescript
export { PhotoCard } from './PhotoCard';
export { PhotoSkeleton } from './PhotoSkeleton';
export { RotationBadge } from './RotationBadge';
export { HeroImageWithRotationIndicator } from './HeroImageWithRotationIndicator';
export { GalleryFilters } from './GalleryFilters';
```

- [ ] **Step 7: Verify components compile**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/components/gallery/
git commit -m "feat: add photo gallery UI components"
```

---

## Task 5: Create Photo Lightbox Component

**Files:**
- Create: `src/components/gallery/PhotoLightbox.tsx`
- Update: `src/components/gallery/index.ts`

**Interfaces:**
- Consumes:
  - `Photo`, `PhotoWithStats` types
  - `AppIcon` component
- Produces:
  - `PhotoLightbox` modal component with prev/next navigation, info panel, full screen

- [ ] **Step 1: Create PhotoLightbox.tsx**

Create `src/components/gallery/PhotoLightbox.tsx`:

```typescript
'use client';

import React, { useCallback, useEffect } from 'react';
import { AppIcon } from '@/components/AppIcon';
import type { PhotoWithStats } from '@/types/gallery';

interface PhotoLightboxProps {
  photo: PhotoWithStats;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  locale: 'en' | 'he';
}

export const PhotoLightbox = React.forwardRef<HTMLDivElement, PhotoLightboxProps>(
  (
    {
      photo,
      isOpen,
      onClose,
      onNext,
      onPrevious,
      hasPrevious = false,
      hasNext = false,
      locale,
    },
    ref
  ) => {
    const isRTL = locale === 'he';

    // Handle keyboard navigation
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight' && hasNext) onNext?.();
        if (e.key === 'ArrowLeft' && hasPrevious) onPrevious?.();
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, hasNext, hasPrevious, onNext, onPrevious]);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Main Content */}
        <div
          className="flex w-full h-full flex-col lg:flex-row items-center justify-center gap-6 p-4 lg:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center max-h-[70vh] lg:max-h-[90vh] max-w-4xl">
            <img
              src={photo.photo_url}
              alt={photo.caption || 'Photo'}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Info Panel - Right Sidebar on Desktop, Bottom on Mobile */}
          <div className="w-full lg:w-80 bg-slate-900/95 rounded-lg p-6 backdrop-blur-sm text-white space-y-6 max-h-[50vh] lg:max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 lg:hidden p-2 hover:bg-white/20 rounded-lg transition"
              aria-label="Close"
            >
              <AppIcon name="x" className="h-6 w-6" />
            </button>

            {/* Caption */}
            {photo.caption && (
              <div>
                <h3 className="text-lg font-bold mb-2">{isRTL ? 'תיאור' : 'Caption'}</h3>
                <p className="text-white/80 leading-relaxed">{photo.caption}</p>
              </div>
            )}

            {/* Photographer */}
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {photo.photographer_avatar_url && (
                <img
                  src={photo.photographer_avatar_url}
                  alt={photo.photographer_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-sm text-white/60">
                  {isRTL ? 'צילם' : 'Photo by'}
                </p>
                <p className="font-semibold">{photo.photographer_name}</p>
              </div>
            </div>

            {/* Date Taken */}
            <div>
              <p className="text-sm text-white/60 mb-1">
                {isRTL ? 'צולם' : 'Taken on'}
              </p>
              <p className="font-semibold">
                {new Date(photo.taken_at).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/20">
              <div>
                <p className="text-sm text-white/60">
                  {isRTL ? 'דירוג' : 'Rating'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <AppIcon name="star-filled" className="h-5 w-5 text-yellow-400" />
                  <span className="font-bold">
                    {photo.rating_avg?.toFixed(1) || 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-white/60">
                  {isRTL ? 'לייקים' : 'Likes'}
                </p>
                <div className="flex items-center gap-2 mt-1 font-bold">
                  {photo.like_count}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2 pt-4 border-t border-white/20">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                  hasPrevious
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <AppIcon
                  name={isRTL ? 'arrow-right' : 'arrow-left'}
                  className="h-5 w-5"
                />
                {isRTL ? 'הקודמת' : 'Previous'}
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                  hasNext
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isRTL ? 'הבאה' : 'Next'}
                <AppIcon
                  name={isRTL ? 'arrow-left' : 'arrow-right'}
                  className="h-5 w-5"
                />
              </button>
            </div>

            {/* Close Button Desktop */}
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold transition hidden lg:block"
            >
              {isRTL ? 'סגור' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

PhotoLightbox.displayName = 'PhotoLightbox';
export default PhotoLightbox;
```

- [ ] **Step 2: Update index.ts**

Update `src/components/gallery/index.ts`:

```typescript
export { PhotoCard } from './PhotoCard';
export { PhotoSkeleton } from './PhotoSkeleton';
export { RotationBadge } from './RotationBadge';
export { HeroImageWithRotationIndicator } from './HeroImageWithRotationIndicator';
export { GalleryFilters } from './GalleryFilters';
export { PhotoLightbox } from './PhotoLightbox';
```

- [ ] **Step 3: Verify lightbox compiles**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/gallery/PhotoLightbox.tsx src/components/gallery/index.ts
git commit -m "feat: add photo lightbox modal component with navigation"
```

---

## Task 6: Create Custom Hooks for Photo Management

**Files:**
- Create: `src/hooks/usePhotos.ts`
- Create: `src/hooks/usePhotoLightbox.ts`
- Create: `src/hooks/usePhotoRotation.ts`

**Interfaces:**
- Consumes:
  - `PhotoFilter`, `GalleryResponse`, `PhotoWithStats` types
  - API routes from Task 3
- Produces:
  - `usePhotos(siteId, initialFilter)`: Fetch photos with filters/pagination
  - `usePhotoLightbox(photos)`: Manage lightbox state and navigation
  - `usePhotoRotation(siteId)`: Check/trigger hero rotation

- [ ] **Step 1: Create usePhotos.ts**

Create `src/hooks/usePhotos.ts`:

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PhotoWithStats, GalleryResponse } from '@/types/gallery';

interface UsePhotosOptions {
  initialPage?: number;
  initialSort?: 'recent' | 'popular' | 'top-rated' | 'oldest';
}

export function usePhotos(siteId: string, options: UsePhotosOptions = {}) {
  const [photos, setPhotos] = useState<PhotoWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(options.initialPage || 1);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'top-rated' | 'oldest'>(
    options.initialSort || 'recent'
  );
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!siteId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        site_id: siteId,
        sort_by: sortBy,
        page: page.toString(),
        per_page: '12',
      });

      const response = await fetch(`/api/photos?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }

      const data: GalleryResponse = await response.json();
      setPhotos(data.photos);
      setTotal(data.total);
      setHasNext(data.has_next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [siteId, sortBy, page]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const changePage = (newPage: number) => {
    setPage(newPage);
  };

  const changeSortBy = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    setPage(1); // Reset to first page on sort change
  };

  return {
    photos,
    isLoading,
    error,
    page,
    total,
    hasNext,
    changePage,
    changeSortBy,
    refetch: fetchPhotos,
  };
}
```

- [ ] **Step 2: Create usePhotoLightbox.ts**

Create `src/hooks/usePhotoLightbox.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import type { PhotoWithStats } from '@/types/gallery';

export function usePhotoLightbox(photos: PhotoWithStats[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPhoto = photos[currentIndex];

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, photos.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  return {
    isOpen,
    currentPhoto,
    currentIndex,
    openLightbox,
    closeLightbox,
    goToNext,
    goToPrevious,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < photos.length - 1,
  };
}
```

- [ ] **Step 3: Create usePhotoRotation.ts**

Create `src/hooks/usePhotoRotation.ts`:

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Photo } from '@/types/gallery';

export function usePhotoRotation(siteId: string) {
  const [heroPhoto, setHeroPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [rotationNeeded, setRotationNeeded] = useState(false);

  const checkRotation = useCallback(async () => {
    if (!siteId) return;

    try {
      const response = await fetch(`/api/gallery/rotation-check?site_id=${siteId}`);

      if (!response.ok) {
        throw new Error('Failed to check rotation');
      }

      const data = await response.json();
      setRotationNeeded(data.rotation_needed);

      if (data.hero) {
        setHeroPhoto(data.hero);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    checkRotation();

    // Check rotation every 24 hours
    const interval = setInterval(checkRotation, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkRotation]);

  return {
    heroPhoto,
    isLoading,
    error,
    rotationNeeded,
    refetch: checkRotation,
  };
}
```

- [ ] **Step 4: Verify hooks compile**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePhotos.ts src/hooks/usePhotoLightbox.ts src/hooks/usePhotoRotation.ts
git commit -m "feat: add custom hooks for photo management and lightbox"
```

---

## Task 7: Create Photo Gallery Page

**Files:**
- Create: `src/app/[locale]/dive-sites/[id]/gallery/page.tsx`
- Create: `src/app/[locale]/dive-sites/[id]/gallery/client.tsx`

**Interfaces:**
- Consumes:
  - `usePhotos`, `usePhotoLightbox` hooks
  - Gallery components from Task 4-5
  - `Photo`, `PhotoWithStats` types
- Produces:
  - Server-side `/dive-sites/[id]/gallery` page
  - Client component for interactive gallery

- [ ] **Step 1: Create gallery/page.tsx (Server Component)**

Create `src/app/[locale]/dive-sites/[id]/gallery/page.tsx`:

```typescript
export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppIcon } from '@/components/AppIcon';
import GalleryClient from './client';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

async function getDiveSite(id: string): Promise<DiveSite | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dive_sites')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: { params: Promise<{ id: string; locale: string }> }) {
  const params = await props.params;
  const site = await getDiveSite(params.id);
  return {
    title: site ? `${site.name} - Photo Gallery | DiveDrop` : 'Photo Gallery | DiveDrop',
  };
}

export default async function GalleryPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const site = await getDiveSite(params.id);

  if (!site) {
    redirect(`/${locale}`);
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link
              href={`/${locale}/dive-sites/${params.id}`}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <AppIcon
                name={isRTL ? 'arrow-right' : 'arrow-left'}
                className="h-6 w-6"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {site.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isRTL ? 'גלריית תמונות' : 'Photo Gallery'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Gallery Content */}
      <GalleryClient siteId={params.id} locale={locale as 'en' | 'he'} />
    </div>
  );
}
```

- [ ] **Step 2: Create gallery/client.tsx (Client Component)**

Create `src/app/[locale]/dive-sites/[id]/gallery/client.tsx`:

```typescript
'use client';

import { useMemo } from 'react';
import {
  PhotoGallery,
  GalleryFilters,
  PhotoLightbox,
  PhotoSkeleton,
} from '@/components/gallery';
import { usePhotos } from '@/hooks/usePhotos';
import { usePhotoLightbox } from '@/hooks/usePhotoLightbox';
import { AppIcon } from '@/components/AppIcon';

interface GalleryClientProps {
  siteId: string;
  locale: 'en' | 'he';
}

export default function GalleryClient({ siteId, locale }: GalleryClientProps) {
  const isRTL = locale === 'he';
  const { photos, isLoading, error, sortBy, changeSortBy, page, hasNext, changePage, total } =
    usePhotos(siteId);
  const {
    isOpen,
    currentPhoto,
    currentIndex,
    openLightbox,
    closeLightbox,
    goToNext,
    goToPrevious,
    hasPrevious,
    hasNext: lightboxHasNext,
  } = usePhotoLightbox(photos);

  const loadingSkeletons = useMemo(() => Array(12).fill(null), []);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <AppIcon name="alert-circle" className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {isRTL ? 'שגיאה בטעינת תמונות' : 'Error loading photos'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Filters Section */}
      {!isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isRTL ? `${total} תמונות` : `${total} Photos`}
            </h2>
          </div>
          <GalleryFilters
            sortBy={sortBy}
            onSortChange={changeSortBy}
            locale={locale}
          />
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? loadingSkeletons.map((_, i) => (
              <PhotoSkeleton key={i} />
            ))
          : photos.length > 0
          ? photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => openLightbox(index)}
                className="cursor-pointer"
              >
                <PhotoGallery photo={photo} locale={locale} />
              </div>
            ))
          : (
            <div className="col-span-full text-center py-12">
              <AppIcon name="images" className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {isRTL ? 'אין תמונות' : 'No photos'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {isRTL
                  ? 'לא נמצאו תמונות לאתר הצלילה הזה'
                  : 'No photos found for this dive site'}
              </p>
            </div>
          )}
      </div>

      {/* Pagination */}
      {!isLoading && photos.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => changePage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isRTL ? 'הבא' : 'Previous'}
          </button>
          <span className="text-slate-600 dark:text-slate-400">
            {isRTL ? `עמוד ${page}` : `Page ${page}`}
          </span>
          <button
            onClick={() => changePage(page + 1)}
            disabled={!hasNext}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isRTL ? 'הקודם' : 'Next'}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {currentPhoto && (
        <PhotoLightbox
          photo={currentPhoto}
          isOpen={isOpen}
          onClose={closeLightbox}
          onNext={goToNext}
          onPrevious={goToPrevious}
          hasPrevious={hasPrevious}
          hasNext={lightboxHasNext}
          locale={locale}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create PhotoGallery wrapper component**

Create `src/components/gallery/PhotoGallery.tsx`:

```typescript
'use client';

import { PhotoCard } from './PhotoCard';
import type { PhotoWithStats } from '@/types/gallery';

interface PhotoGalleryProps {
  photo: PhotoWithStats;
  locale: 'en' | 'he';
  onPhotoClick?: () => void;
  onLikeToggle?: (liked: boolean) => void;
  onRatingSubmit?: (rating: number) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photo,
  locale,
  onPhotoClick,
  onLikeToggle,
  onRatingSubmit,
}) => (
  <PhotoCard
    photo={photo}
    locale={locale}
    onPhotoClick={onPhotoClick}
    onLikeToggle={onLikeToggle}
    onRatingSubmit={onRatingSubmit}
  />
);

export default PhotoGallery;
```

- [ ] **Step 4: Update gallery/index.ts**

Update `src/components/gallery/index.ts`:

```typescript
export { PhotoCard } from './PhotoCard';
export { PhotoGallery } from './PhotoGallery';
export { PhotoSkeleton } from './PhotoSkeleton';
export { RotationBadge } from './RotationBadge';
export { HeroImageWithRotationIndicator } from './HeroImageWithRotationIndicator';
export { GalleryFilters } from './GalleryFilters';
export { PhotoLightbox } from './PhotoLightbox';
```

- [ ] **Step 5: Test gallery page routing**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/\[locale\]/dive-sites/\[id\]/gallery/ src/components/gallery/PhotoGallery.tsx
git commit -m "feat: add photo gallery page with filters and pagination"
```

---

## Task 8: Add Hero Image to Dive Site Detail Page

**Files:**
- Create: `src/app/[locale]/dive-sites/[id]/page.tsx`
- Update: `src/app/[locale]/page.tsx` (homepage hero slider)

**Interfaces:**
- Consumes:
  - `usePhotoRotation` hook
  - `HeroImageWithRotationIndicator` component
  - `getHeroPhoto` service
- Produces:
  - Dive site detail page with hero image
  - Updated homepage with hero slider

- [ ] **Step 1: Create dive site detail page**

Create `src/app/[locale]/dive-sites/[id]/page.tsx`:

```typescript
export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppIcon } from '@/components/AppIcon';
import { HeroImageWithRotationIndicator } from '@/components/gallery';
import { getHeroPhoto } from '@/lib/gallery/rotation-service';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

async function getDiveSite(id: string): Promise<DiveSite | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dive_sites')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: { params: Promise<{ id: string; locale: string }> }) {
  const params = await props.params;
  const site = await getDiveSite(params.id);
  return {
    title: site ? `${site.name} | DiveDrop` : 'Dive Site | DiveDrop',
    description: site?.description,
  };
}

export default async function DiveSiteDetailPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const site = await getDiveSite(params.id);

  if (!site) {
    redirect(`/${locale}`);
  }

  let heroPhoto = null;
  try {
    heroPhoto = await getHeroPhoto(params.id);
  } catch (error) {
    console.error('Failed to fetch hero photo:', error);
  }

  const labels = {
    location: isRTL ? 'מיקום' : 'Location',
    depth: isRTL ? 'עומק מקסימלי' : 'Max Depth',
    difficulty: isRTL ? 'דרגת קושי' : 'Difficulty',
    description: isRTL ? 'תיאור' : 'Description',
    viewGallery: isRTL ? 'צפה בגלריה' : 'View Gallery',
    bookDive: isRTL ? 'הזמן צלילה' : 'Book Dive',
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Hero Section with Image */}
      {heroPhoto && (
        <HeroImageWithRotationIndicator
          photo={heroPhoto}
          siteId={params.id}
          siteName={site.name}
          locale={locale as 'en' | 'he'}
          onOpenGallery={() => {
            // This would typically navigate to gallery
          }}
        />
      )}

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Back Button & Title */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link
            href={`/${locale}`}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <AppIcon
              name={isRTL ? 'arrow-right' : 'arrow-left'}
              className="h-6 w-6"
            />
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            {site.name}
          </h1>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AppIcon name="location" className="h-5 w-5 text-blue-600" />
              <p className="font-semibold text-slate-900 dark:text-white">
                {labels.location}
              </p>
            </div>
            <p className="text-slate-600 dark:text-slate-400">{site.location}</p>
          </div>

          {/* Depth */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AppIcon name="depth" className="h-5 w-5 text-cyan-600" />
              <p className="font-semibold text-slate-900 dark:text-white">
                {labels.depth}
              </p>
            </div>
            <p className="text-slate-600 dark:text-slate-400">{site.depth}m</p>
          </div>

          {/* Difficulty */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AppIcon name="award" className="h-5 w-5 text-purple-600" />
              <p className="font-semibold text-slate-900 dark:text-white">
                {labels.difficulty}
              </p>
            </div>
            <p className="text-slate-600 dark:text-slate-400 capitalize">
              {site.difficulty}
            </p>
          </div>
        </div>

        {/* Description */}
        {site.description && (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              {labels.description}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {site.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link
            href={`/${locale}/dive-sites/${params.id}/gallery`}
            className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition text-center flex items-center justify-center gap-2"
          >
            <AppIcon name="images" className="h-5 w-5" />
            {labels.viewGallery}
          </Link>
          <button className="flex-1 px-6 py-3 rounded-lg border-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center justify-center gap-2">
            <AppIcon name="calendar" className="h-5 w-5" />
            {labels.bookDive}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update homepage with hero slider**

Update `src/app/[locale]/page.tsx` to add hero slider component. First, create the component:

Create `src/app/[locale]/components/HomeHeroSlider.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/AppIcon';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

interface HomeHeroSliderProps {
  sites: (DiveSite & { hero_photo_url?: string })[];
  locale: 'en' | 'he';
}

export default function HomeHeroSlider({ sites, locale }: HomeHeroSliderProps) {
  const isRTL = locale === 'he';
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sites.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sites.length]);

  if (sites.length === 0) return null;

  const current = sites[currentIndex];

  return (
    <div className="relative h-[500px] sm:h-[600px] lg:h-[700px] rounded-2xl overflow-hidden group">
      {/* Image */}
      <img
        src={current.hero_photo_url || current.image_url || '/divedrop-hero-v2.png'}
        alt={current.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Navigation */}
      <button
        onClick={() =>
          setCurrentIndex((prev) => (prev - 1 + sites.length) % sites.length)
        }
        className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition ${
          isRTL ? 'right-4' : 'left-4'
        }`}
      >
        <AppIcon
          name={isRTL ? 'arrow-right' : 'arrow-left'}
          className="h-6 w-6"
        />
      </button>

      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % sites.length)}
        className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition ${
          isRTL ? 'left-4' : 'right-4'
        }`}
      >
        <AppIcon
          name={isRTL ? 'arrow-left' : 'arrow-right'}
          className="h-6 w-6"
        />
      </button>

      {/* Content */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-12 space-y-4 ${
          isRTL ? 'text-right' : 'text-left'
        }`}
      >
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
          {current.name}
        </h2>
        <p className="text-white/90 max-w-2xl text-sm sm:text-base">
          {current.description}
        </p>
        <Link
          href={`/${locale}/dive-sites/${current.id}/gallery`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition"
        >
          <AppIcon name="images" className="h-5 w-5" />
          {isRTL ? 'צפה בתמונות' : 'View Photos'}
        </Link>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {sites.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition ${
              index === currentIndex
                ? 'w-6 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update homepage to use slider**

Update `src/app/[locale]/page.tsx` - replace the featured sites section with the hero slider:

Find the section starting at line 78 (`<section className="rounded-[28px]...`) and replace it with:

```typescript
          <HomeHeroSlider sites={displaySites} locale={locale} />

          <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_35px_rgba(15,63,110,.08)] sm:p-6">
            {/* ... rest of recommended section ... */}
```

And add the import at the top:

```typescript
import HomeHeroSlider from './components/HomeHeroSlider';
```

- [ ] **Step 4: Verify pages compile**

```bash
npm run type-check
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/dive-sites/\[id\]/page.tsx src/app/\[locale\]/components/HomeHeroSlider.tsx src/app/\[locale\]/page.tsx
git commit -m "feat: add dive site detail page and homepage hero slider"
```

---

## Task 9: Database Setup - Create Supabase Migrations

**Files:**
- Create: `migrations/create_photos_tables.sql`
- Create: `migrations/create_rotation_tables.sql`
- Create: `migrations/create_indexes.sql`
- Create: `migrations/create_rpc_functions.sql`

**Interfaces:**
- Creates database tables matching Task 1 schema
- Produces: SQL migrations ready for Supabase deployment

- [ ] **Step 1: Create photos table migration**

Create `migrations/001_create_photos_tables.sql`:

```sql
-- Create dive_site_photos table
CREATE TABLE IF NOT EXISTS public.dive_site_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dive_site_id uuid NOT NULL REFERENCES public.dive_sites(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  storage_path text NOT NULL,
  photographer_name text NOT NULL,
  photographer_avatar_url text,
  caption text,
  taken_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create photo_ratings table
CREATE TABLE IF NOT EXISTS public.photo_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL REFERENCES public.dive_site_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  liked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

-- Create site_hero_rotation table
CREATE TABLE IF NOT EXISTS public.site_hero_rotation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dive_site_id uuid NOT NULL UNIQUE REFERENCES public.dive_sites(id) ON DELETE CASCADE,
  current_photo_id uuid NOT NULL REFERENCES public.dive_site_photos(id),
  last_rotated_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dive_site_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_hero_rotation ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Photos (read-only for all, write for authenticated)
CREATE POLICY "Enable read access for all users"
  ON public.dive_site_photos FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.dive_site_photos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies - Ratings (users can only edit their own)
CREATE POLICY "Enable read access for all users"
  ON public.photo_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own ratings"
  ON public.photo_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.photo_ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies - Rotation (read-only for all)
CREATE POLICY "Enable read access for all users"
  ON public.site_hero_rotation FOR SELECT
  USING (true);

CREATE POLICY "Enable insert/update for service role"
  ON public.site_hero_rotation FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role"
  ON public.site_hero_rotation FOR UPDATE
  USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Create indexes migration**

Create `migrations/002_create_indexes.sql`:

```sql
-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dive_site_photos_site_id ON public.dive_site_photos(dive_site_id);
CREATE INDEX IF NOT EXISTS idx_dive_site_photos_created_at ON public.dive_site_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dive_site_photos_taken_at ON public.dive_site_photos(taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_photo_ratings_photo_id ON public.photo_ratings(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_ratings_user_id ON public.photo_ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_site_hero_rotation_dive_site_id ON public.site_hero_rotation(dive_site_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_dive_site_photos_caption_search ON public.dive_site_photos USING GIN(to_tsvector('english', caption || ' ' || photographer_name));
```

- [ ] **Step 3: Create RPC functions migration**

Create `migrations/003_create_rpc_functions.sql`:

```sql
-- Function to get photo with stats
CREATE OR REPLACE FUNCTION get_photo_stats(photo_id uuid, current_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  rating_avg numeric,
  rating_count bigint,
  like_count bigint,
  is_liked boolean,
  user_rating integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(CASE WHEN pr.rating IS NOT NULL THEN pr.rating ELSE NULL END)::numeric, 1) as avg_rating,
    COUNT(CASE WHEN pr.rating IS NOT NULL THEN 1 ELSE NULL END) as total_ratings,
    COUNT(CASE WHEN pr.liked THEN 1 ELSE NULL END) as likes,
    MAX(CASE WHEN pr.user_id = current_user_id THEN pr.liked ELSE false END) as user_liked,
    MAX(CASE WHEN pr.user_id = current_user_id THEN pr.rating ELSE NULL END) as user_rating
  FROM public.photo_ratings pr
  WHERE pr.photo_id = get_photo_stats.photo_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get random site photo
CREATE OR REPLACE FUNCTION get_random_site_photo(site_id uuid)
RETURNS TABLE(
  id uuid,
  dive_site_id uuid,
  photo_url text,
  storage_path text,
  photographer_name text,
  photographer_avatar_url text,
  caption text,
  taken_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dsp.id,
    dsp.dive_site_id,
    dsp.photo_url,
    dsp.storage_path,
    dsp.photographer_name,
    dsp.photographer_avatar_url,
    dsp.caption,
    dsp.taken_at,
    dsp.created_at,
    dsp.updated_at
  FROM public.dive_site_photos dsp
  WHERE dsp.dive_site_id = get_random_site_photo.site_id
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
```

- [ ] **Step 4: Document migration application**

Create `docs/DATABASE_MIGRATIONS.md`:

```markdown
# Database Migrations for Photo Gallery

## Applying Migrations

1. **Via Supabase Dashboard:**
   - Go to SQL Editor
   - Create new query
   - Copy and paste each migration file in order
   - Run

2. **Via Supabase CLI:**
   ```bash
   supabase db push
   ```

## Migration Order
1. `001_create_photos_tables.sql` - Create tables and RLS policies
2. `002_create_indexes.sql` - Create performance indexes
3. `003_create_rpc_functions.sql` - Create database functions

## Verification

After applying, verify with:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('dive_site_photos', 'photo_ratings', 'site_hero_rotation');

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('dive_site_photos', 'photo_ratings', 'site_hero_rotation');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('dive_site_photos', 'photo_ratings', 'site_hero_rotation');

-- Check functions
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN ('get_photo_stats', 'get_random_site_photo');
```

## Rollback

If needed, drop tables in reverse order:
```sql
DROP FUNCTION IF EXISTS get_random_site_photo(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_photo_stats(uuid, uuid) CASCADE;
DROP TABLE IF EXISTS public.site_hero_rotation;
DROP TABLE IF EXISTS public.photo_ratings;
DROP TABLE IF EXISTS public.dive_site_photos;
```
```

- [ ] **Step 5: Commit migrations**

```bash
git add migrations/ docs/DATABASE_MIGRATIONS.md
git commit -m "feat: add database migrations for photo gallery system"
```

---

## Task 10: Image Optimization & Next.js Configuration

**Files:**
- Update: `next.config.ts`
- Create: `src/lib/image-optimization.ts`
- Create: `.env.local.example` (document Supabase Storage bucket)

**Interfaces:**
- Configures Next.js Image component for Supabase Storage
- Produces: Optimized image serving with modern formats

- [ ] **Step 1: Update next.config.ts for image optimization**

Update `next.config.ts`:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    unoptimizedOnDemand: false,
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 2: Create image optimization utilities**

Create `src/lib/image-optimization.ts`:

```typescript
/**
 * Image optimization utilities for Supabase Storage images
 */

export function getSupabaseImageUrl(
  storagePath: string,
  width?: number,
  quality = 80
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');

  const url = new URL(`/storage/v1/object/public/dive-site-photos/${storagePath}`, baseUrl);

  // Add image transformation parameters if supported
  if (width) {
    url.searchParams.set('width', width.toString());
  }
  url.searchParams.set('quality', quality.toString());

  return url.toString();
}

export function getImageDimensions(
  context: 'hero' | 'card' | 'lightbox' | 'thumbnail'
): { width: number; height: number; aspectRatio: string } {
  const dimensions = {
    hero: { width: 1200, height: 600, aspectRatio: '2/1' },
    card: { width: 400, height: 300, aspectRatio: '4/3' },
    lightbox: { width: 1400, height: 900, aspectRatio: '16/9' },
    thumbnail: { width: 150, height: 150, aspectRatio: '1/1' },
  };

  return dimensions[context];
}

export function generateImageSrcSet(
  storagePath: string,
  context: 'hero' | 'card' | 'lightbox' | 'thumbnail'
): string {
  const sizes = [480, 800, 1200, 1600];
  const srcSet = sizes
    .map((size) => `${getSupabaseImageUrl(storagePath, size)} ${size}w`)
    .join(', ');

  return srcSet;
}
```

- [ ] **Step 3: Create environment template**

Create `.env.local.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Storage bucket
NEXT_PUBLIC_STORAGE_BUCKET=dive-site-photos

# Optional: Image optimization
NEXT_PUBLIC_IMAGE_QUALITY=80
```

- [ ] **Step 4: Verify configuration**

```bash
npm run type-check && npm run build --dry-run
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add next.config.ts src/lib/image-optimization.ts .env.local.example
git commit -m "feat: add image optimization and Next.js configuration"
```

---

## Task 11: Analytics & Tracking (Optional Enhanced)

**Files:**
- Create: `src/lib/analytics/photo-analytics.ts`
- Create: `src/hooks/usePhotoAnalytics.ts`

**Interfaces:**
- Track photo views, likes, ratings, rotations
- Produces: Analytics service for monitoring gallery usage

- [ ] **Step 1: Create photo analytics service**

Create `src/lib/analytics/photo-analytics.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

interface PhotoEvent {
  photo_id: string;
  site_id: string;
  event_type: 'view' | 'like' | 'rating' | 'share';
  user_id?: string;
  metadata?: Record<string, any>;
}

export async function trackPhotoEvent(event: PhotoEvent): Promise<void> {
  // Could be extended to log to a dedicated analytics table
  console.log('[Photo Analytics]', event);

  // Optional: Log to Supabase table for analytics
  const supabase = await createClient();
  
  try {
    await supabase.from('photo_events').insert({
      photo_id: event.photo_id,
      site_id: event.site_id,
      event_type: event.event_type,
      user_id: event.user_id,
      metadata: event.metadata,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Fail silently - don't block app for analytics
    console.error('Analytics tracking failed:', error);
  }
}

export async function getPhotoPopularity(
  photoId: string
): Promise<{ views: number; likes: number; shares: number }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('photo_events')
    .select('event_type')
    .eq('photo_id', photoId);

  const counts = {
    views: 0,
    likes: 0,
    shares: 0,
  };

  data?.forEach((event: any) => {
    if (event.event_type === 'view') counts.views++;
    if (event.event_type === 'like') counts.likes++;
    if (event.event_type === 'share') counts.shares++;
  });

  return counts;
}
```

- [ ] **Step 2: Create analytics hook**

Create `src/hooks/usePhotoAnalytics.ts`:

```typescript
'use client';

import { useCallback } from 'react';

interface TrackPhotoEventParams {
  photoId: string;
  siteId: string;
  eventType: 'view' | 'like' | 'rating' | 'share';
  metadata?: Record<string, any>;
}

export function usePhotoAnalytics() {
  const trackEvent = useCallback(async (params: TrackPhotoEventParams) => {
    try {
      // Send to analytics endpoint
      await fetch('/api/analytics/photo-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, []);

  return { trackEvent };
}
```

- [ ] **Step 3: Commit analytics**

```bash
git add src/lib/analytics/ src/hooks/usePhotoAnalytics.ts
git commit -m "feat: add photo analytics tracking"
```

---

## Task 12: Final Testing & Documentation

**Files:**
- Create: `docs/PHOTO_GALLERY.md`
- Create: `docs/API_ENDPOINTS.md`
- Update: `README.md`

**Interfaces:**
- Documents the complete photo gallery system
- Provides usage examples and deployment checklist

- [ ] **Step 1: Create comprehensive feature documentation**

Create `docs/PHOTO_GALLERY.md`:

```markdown
# Photo Gallery System Documentation

## Overview

Complete photo gallery system for dive sites with:
- Hero image rotation (updates every 3 days)
- Dynamic gallery pages with filters and pagination
- Lightbox view with keyboard navigation
- User ratings and likes
- Photographer information display
- RTL/LTR language support
- Image optimization via Next.js

## Features

### 1. Hero Image Rotation
- Automatically rotates every 3 days
- "Last updated X days ago" indicator
- Full screen responsive design
- Photographer attribution

### 2. Gallery Pages
- URL: `/dive-sites/[id]/gallery`
- Responsive grid (1/2/3/4 columns)
- Filters: Recent, Popular, Top-Rated, Oldest
- Pagination (12 items per page)
- Lazy loading with skeletons

### 3. Lightbox Modal
- Click photo to expand
- Prev/Next navigation (keyboard: arrow keys)
- Close with Escape key
- Photo info panel with stats
- Photographer details

### 4. Ratings & Likes
- 5-star rating system
- Like/unlike button
- Aggregate statistics
- User's own rating display

### 5. Responsive Design
- Mobile: 1 column, full width
- Tablet: 2 columns
- Desktop: 3-4 columns
- Proper aspect ratios (4:3 for cards)

### 6. RTL/LTR Support
- Automatic text direction based on locale
- Bidirectional layout (flex-row-reverse)
- Hebrew (he) and English (en) support
- Consistent across all components

## API Endpoints

```
GET  /api/photos?site_id=X&sort_by=recent&page=1&per_page=12
GET  /api/photos/[id]
POST /api/photos/[id]/like
POST /api/photos/[id]/rating

GET  /api/gallery/rotation-check?site_id=X
GET  /api/gallery/featured-sites

POST /api/analytics/photo-events
```

## Database Schema

### Tables
- `dive_site_photos` - Photos with metadata
- `photo_ratings` - User ratings and likes
- `site_hero_rotation` - Current hero photo tracking

### Indexes
- `dive_site_id` - Fast filtering
- `created_at`, `taken_at` - Fast sorting
- Full-text search on captions

## Component Usage

### PhotoCard
```tsx
<PhotoCard
  photo={photoWithStats}
  locale="en"
  onPhotoClick={() => {}}
  onLikeToggle={(liked) => {}}
  onRatingSubmit={(rating) => {}}
/>
```

### HeroImageWithRotationIndicator
```tsx
<HeroImageWithRotationIndicator
  photo={heroPhoto}
  siteId={siteId}
  siteName="Blue Hole"
  locale="en"
  onOpenGallery={() => {}}
/>
```

### PhotoLightbox
```tsx
<PhotoLightbox
  photo={currentPhoto}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onNext={() => {}}
  onPrevious={() => {}}
  locale="en"
/>
```

## Hooks Usage

### usePhotos
```tsx
const { photos, isLoading, page, hasNext, changePage, changeSortBy } = usePhotos(siteId);
```

### usePhotoLightbox
```tsx
const { isOpen, currentPhoto, openLightbox, closeLightbox, goToNext, goToPrevious } = usePhotoLightbox(photos);
```

### usePhotoRotation
```tsx
const { heroPhoto, isLoading, rotationNeeded } = usePhotoRotation(siteId);
```

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Supabase Storage bucket created: `dive-site-photos`
- [ ] Environment variables set
- [ ] Images uploaded to storage
- [ ] Test gallery pages locally
- [ ] Test mobile responsiveness
- [ ] Test RTL/LTR rendering
- [ ] Deploy to production
- [ ] Monitor analytics
- [ ] Check image performance

## Performance Considerations

- Lazy loading on image scroll
- Optimized images via Next.js Image component
- Skeleton placeholders during loading
- Pagination (12 items default)
- Caching with Next.js
- Database indexes for fast queries

## Future Enhancements

- Image upload UI for photographers
- Comment system on photos
- User photo tagging
- Advanced filtering (by depth, difficulty)
- Photo location map
- Download original image
- Social sharing
```

- [ ] **Step 2: Create API documentation**

Create `docs/API_ENDPOINTS.md`:

```markdown
# Photo Gallery API Endpoints

## Photos

### GET /api/photos
Fetch paginated, filtered photos for a dive site.

**Query Parameters:**
- `site_id` (required): UUID of dive site
- `sort_by` (optional): 'recent' | 'popular' | 'top-rated' | 'oldest' (default: 'recent')
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page, max 100 (default: 12)
- `search` (optional): Search caption/photographer name

**Response:**
```json
{
  "photos": [
    {
      "id": "uuid",
      "dive_site_id": "uuid",
      "photo_url": "https://...",
      "photographer_name": "John Doe",
      "caption": "Beautiful coral",
      "rating_avg": 4.5,
      "rating_count": 10,
      "like_count": 23,
      "is_liked": true,
      "user_rating": 5
    }
  ],
  "total": 45,
  "page": 1,
  "per_page": 12,
  "has_next": true
}
```

### GET /api/photos/[id]
Fetch single photo with stats.

**Response:**
```json
{
  "id": "uuid",
  "dive_site_id": "uuid",
  "photo_url": "https://...",
  "photographer_name": "John Doe",
  "photographer_avatar_url": "https://...",
  "caption": "Beautiful coral",
  "taken_at": "2024-01-15T10:30:00Z",
  "rating_avg": 4.5,
  "rating_count": 10,
  "like_count": 23
}
```

### POST /api/photos/[id]/like
Toggle like on photo (requires authentication).

**Body:**
```json
{
  "liked": true
}
```

**Response:** `{ "success": true }`

### POST /api/photos/[id]/rating
Submit or update rating (requires authentication).

**Body:**
```json
{
  "rating": 5
}
```

**Response:** `{ "success": true }`

## Gallery

### GET /api/gallery/rotation-check
Check if hero image rotation is needed.

**Query Parameters:**
- `site_id` (required): UUID of dive site

**Response:**
```json
{
  "rotation_needed": false,
  "hero": {
    "id": "uuid",
    "photo_url": "https://..."
  }
}
```

### GET /api/gallery/featured-sites
Get random featured sites with hero photos for homepage slider.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Blue Hole",
    "description": "Famous diving spot",
    "hero_photo": {
      "id": "uuid",
      "photo_url": "https://..."
    }
  }
]
```

## Analytics

### POST /api/analytics/photo-events
Track user interactions with photos.

**Body:**
```json
{
  "photo_id": "uuid",
  "site_id": "uuid",
  "event_type": "view",
  "metadata": {}
}
```

**Response:** `{ "success": true }`

## Error Responses

```json
{
  "error": "Error message",
  "status": 400
}
```

**Status Codes:**
- 200: Success
- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Server error
```

- [ ] **Step 3: Update README**

Update `README.md` - add section for photo gallery:

```markdown
## Photo Gallery System

Complete photo gallery with hero image rotation, filters, lightbox, and user ratings.

**Features:**
- Hero image rotation every 3 days
- Gallery with filters (Recent, Popular, Top-Rated, Oldest)
- Pagination (12 items per page)
- Lightbox modal with navigation
- 5-star rating system & likes
- Responsive design (1/2/3/4 columns)
- Full RTL/LTR support

**Documentation:**
- [Photo Gallery Guide](./docs/PHOTO_GALLERY.md)
- [API Endpoints](./docs/API_ENDPOINTS.md)
- [Database Migrations](./docs/DATABASE_MIGRATIONS.md)

**Quick Start:**
1. Apply database migrations
2. Create Supabase Storage bucket: `dive-site-photos`
3. Upload sample images
4. Test at `/[locale]/dive-sites/[id]/gallery`
```

- [ ] **Step 4: Create deployment guide**

Create `docs/DEPLOYMENT.md` (add to existing or create):

```markdown
# Photo Gallery - Deployment Checklist

## Pre-Deployment

- [ ] All code reviewed and merged to main
- [ ] Database migrations tested locally
- [ ] Environment variables documented
- [ ] Images optimized (next/image configuration)

## Supabase Setup

1. Create Storage bucket:
   ```bash
   supabase storage create dive-site-photos
   ```

2. Apply migrations:
   ```bash
   supabase db push
   ```

3. Verify tables:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

## Environment Variables

Set in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

## Post-Deployment

- [ ] Test gallery pages on production
- [ ] Check mobile responsiveness
- [ ] Verify RTL/LTR rendering
- [ ] Test image loading performance
- [ ] Monitor analytics
- [ ] Check database query performance

## Rollback

If issues:
1. Revert to previous deployment
2. Check database migrations
3. Verify API endpoints
4. Check Supabase Storage bucket access
```

- [ ] **Step 5: Commit documentation**

```bash
git add docs/PHOTO_GALLERY.md docs/API_ENDPOINTS.md docs/DEPLOYMENT.md README.md
git commit -m "docs: add comprehensive photo gallery documentation"
```

---

## Verification Checklist

- [ ] All TypeScript compiles without errors
- [ ] All components render without warnings
- [ ] API endpoints return correct responses
- [ ] Database migrations are ready to apply
- [ ] Image optimization configured
- [ ] RTL/LTR support working on all components
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Lightbox navigation with keyboard support
- [ ] Ratings and likes persist correctly
- [ ] Hero rotation logic working
- [ ] Analytics tracking in place
- [ ] Documentation complete

---

## Final Commit

After all tasks complete:

```bash
git add -A
git commit -m "feat: complete photo gallery + dynamic display system

- Add database schema for photos, ratings, rotations
- Implement API routes for CRUD and filtering
- Create gallery components (PhotoCard, Lightbox, Filters)
- Build custom hooks for photo management
- Add photo gallery page with pagination
- Integrate hero image rotation
- Add homepage hero slider
- Optimize images for performance
- Full RTL/LTR language support
- Comprehensive documentation and deployment guide"

git push origin main
```

---

## Architecture Summary

**Pages:**
- `/dive-sites/[id]/gallery` - Gallery with filters
- `/dive-sites/[id]` - Detail with hero image
- `/` - Homepage with hero slider

**Components:**
- PhotoCard, PhotoGallery, PhotoSkeleton
- HeroImageWithRotationIndicator, RotationBadge
- PhotoLightbox, GalleryFilters

**Hooks:**
- usePhotos (fetch/filter/paginate)
- usePhotoLightbox (modal state)
- usePhotoRotation (hero rotation)
- usePhotoAnalytics (tracking)

**Services:**
- photos-service (CRUD)
- rotation-service (hero rotation)
- storage (Supabase Storage)
- analytics (tracking)

**API Routes:**
- GET /api/photos - Fetch with filters
- POST /api/photos/[id]/like - Toggle like
- POST /api/photos/[id]/rating - Submit rating
- GET /api/gallery/rotation-check - Check rotation
- GET /api/gallery/featured-sites - Featured slider

**Database:**
- dive_site_photos
- photo_ratings
- site_hero_rotation

---

**Plan Status:** Complete and ready for subagent-driven execution.

Plan complete and saved to `docs/superpowers/plans/2026-06-20-photo-gallery-system.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
