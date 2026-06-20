# DIVE DROP - Service Provider Directory
## Complete Architecture & Implementation Guide

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [TypeScript Types](#typescript-types)
3. [Frontend Components](#frontend-components)
4. [API Routes](#api-routes)
5. [RLS Policies](#rls-policies)
6. [Implementation Checklist](#implementation-checklist)
7. [Moderation & Safety](#moderation--safety)

---

## Database Schema

### Overview
The Service Provider Directory extends DIVE DROP's existing marketplace with a provider-centric model. Providers (instructors, shops, guides, etc.) create profiles and list services. Users can search, filter, review, and book these services.

### Tables

#### 1. `service_providers` - Core Provider Profile
```sql
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  business_name TEXT NOT NULL,
  description TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website_url TEXT,
  
  -- Profile
  avatar_url TEXT,
  cover_image_url TEXT,
  
  -- Business Details
  provider_type TEXT NOT NULL, -- 'instructor', 'shop', 'guide', 'boat_operator', 'rental', 'photography'
  license_number TEXT,
  license_expiry DATE,
  insurance_provider TEXT,
  insurance_expiry DATE,
  years_experience INT,
  certifications TEXT[], -- Array of cert names/IDs
  
  -- Service Area
  primary_location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_radius_km INT DEFAULT 50,
  
  -- Rating & Stats
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  response_rate DECIMAL(3, 2), -- Percentage of responded bookings
  
  -- Status & Moderation
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'suspended', 'archived'
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_provider_type CHECK (provider_type IN ('instructor', 'shop', 'guide', 'boat_operator', 'rental', 'photography')),
  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5)
);

CREATE INDEX idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX idx_service_providers_provider_type ON service_providers(provider_type);
CREATE INDEX idx_service_providers_status ON service_providers(status);
CREATE INDEX idx_service_providers_location ON service_providers(primary_location);
CREATE INDEX idx_service_providers_average_rating ON service_providers(average_rating DESC);
CREATE INDEX idx_service_providers_created_at ON service_providers(created_at DESC);
CREATE INDEX idx_service_providers_is_verified ON service_providers(is_verified);
```

#### 2. `provider_services` - Services Offered
```sql
CREATE TABLE provider_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  -- Service Details
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  service_category TEXT NOT NULL, -- 'training', 'guiding', 'equipment', 'boat', 'photography', 'transport'
  
  -- Pricing & Duration
  price_shekel DECIMAL(8, 2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  duration_minutes INT,
  group_size_min INT DEFAULT 1,
  group_size_max INT DEFAULT 10,
  
  -- Availability
  available_mon BOOLEAN DEFAULT TRUE,
  available_tue BOOLEAN DEFAULT TRUE,
  available_wed BOOLEAN DEFAULT TRUE,
  available_thu BOOLEAN DEFAULT TRUE,
  available_fri BOOLEAN DEFAULT TRUE,
  available_sat BOOLEAN DEFAULT TRUE,
  available_sun BOOLEAN DEFAULT TRUE,
  
  start_hour TIME,
  end_hour TIME,
  
  -- Requirements
  min_experience_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  certification_required TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  booking_required BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_group_size CHECK (group_size_min > 0 AND group_size_max >= group_size_min),
  CONSTRAINT valid_price CHECK (price_shekel > 0)
);

CREATE INDEX idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX idx_provider_services_category ON provider_services(service_category);
CREATE INDEX idx_provider_services_is_active ON provider_services(is_active);
```

#### 3. `provider_reviews` - Reviews & Ratings
```sql
CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID, -- Optional reference to booking
  
  -- Review Content
  rating INT NOT NULL,
  title TEXT,
  comment TEXT,
  
  -- Review Categories
  safety_rating INT, -- 1-5
  professionalism_rating INT, -- 1-5
  value_rating INT, -- 1-5
  
  -- Moderation
  is_verified_booking BOOLEAN DEFAULT FALSE, -- Did reviewer actually book?
  is_helpful_count INT DEFAULT 0,
  is_reported BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT unique_review_per_user_booking UNIQUE(provider_id, reviewer_user_id, booking_id)
);

CREATE INDEX idx_provider_reviews_provider_id ON provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_reviewer_user_id ON provider_reviews(reviewer_user_id);
CREATE INDEX idx_provider_reviews_rating ON provider_reviews(rating);
CREATE INDEX idx_provider_reviews_created_at ON provider_reviews(created_at DESC);
CREATE INDEX idx_provider_reviews_moderation_status ON provider_reviews(moderation_status);
```

#### 4. `provider_gallery` - Photos & Videos
```sql
CREATE TABLE provider_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  -- Media
  url TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'image', 'video'
  title TEXT,
  description TEXT,
  
  -- Metadata
  display_order INT,
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_gallery_provider_id ON provider_gallery(provider_id);
CREATE INDEX idx_provider_gallery_display_order ON provider_gallery(display_order);
```

#### 5. `provider_availability` - Detailed Availability Calendar
```sql
CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  -- Date & Time
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Capacity
  max_bookings INT DEFAULT 1,
  current_bookings INT DEFAULT 0,
  
  -- Block out / Special Hours
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT unique_availability UNIQUE(provider_id, available_date, start_time)
);

CREATE INDEX idx_provider_availability_provider_id ON provider_availability(provider_id);
CREATE INDEX idx_provider_availability_date ON provider_availability(available_date);
```

#### 6. `provider_bookings` - Service Bookings/Reservations
```sql
CREATE TABLE provider_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES provider_services(id) ON DELETE RESTRICT,
  booker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Booking Details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  group_size INT NOT NULL,
  
  -- Special Requests
  special_requests TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  confirmation_code TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  
  -- Pricing
  total_price_shekel DECIMAL(8, 2),
  
  -- Communication
  provider_notes TEXT,
  customer_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_group_size CHECK (group_size > 0)
);

CREATE INDEX idx_provider_bookings_service_id ON provider_bookings(service_id);
CREATE INDEX idx_provider_bookings_booker_user_id ON provider_bookings(booker_user_id);
CREATE INDEX idx_provider_bookings_status ON provider_bookings(status);
CREATE INDEX idx_provider_bookings_booking_date ON provider_bookings(booking_date);
```

#### 7. `provider_moderation_logs` - Audit Trail
```sql
CREATE TABLE provider_moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  -- Action
  action TEXT NOT NULL, -- 'created', 'updated', 'approved', 'suspended', 'report_filed', 'review_removed'
  reason TEXT,
  
  -- Admin
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_moderation_logs_provider_id ON provider_moderation_logs(provider_id);
CREATE INDEX idx_provider_moderation_logs_action ON provider_moderation_logs(action);
CREATE INDEX idx_provider_moderation_logs_created_at ON provider_moderation_logs(created_at DESC);
```

---

## TypeScript Types

### File: `src/lib/service-provider/schemas.ts`

```typescript
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum ProviderType {
  INSTRUCTOR = 'instructor',
  SHOP = 'shop',
  GUIDE = 'guide',
  BOAT_OPERATOR = 'boat_operator',
  RENTAL = 'rental',
  PHOTOGRAPHY = 'photography',
}

export enum ServiceCategory {
  TRAINING = 'training',
  GUIDING = 'guiding',
  EQUIPMENT = 'equipment',
  BOAT = 'boat',
  PHOTOGRAPHY = 'photography',
  TRANSPORT = 'transport',
}

export enum ProviderStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// SERVICE PROVIDER SCHEMAS
// ============================================================================

export const createProviderProfileSchema = z.object({
  business_name: z.string().min(3).max(200),
  description: z.string().min(50).max(5000),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  website_url: z.string().url().optional().nullable(),
  provider_type: z.nativeEnum(ProviderType),
  
  license_number: z.string().optional().nullable(),
  license_expiry: z.string().datetime().optional().nullable(),
  insurance_provider: z.string().optional().nullable(),
  insurance_expiry: z.string().datetime().optional().nullable(),
  years_experience: z.number().int().min(0).max(100).optional(),
  certifications: z.array(z.string()).optional(),
  
  primary_location: z.string().min(5).max(255),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  service_radius_km: z.number().int().min(1).max(500).default(50),
});

export type CreateProviderProfileInput = z.infer<typeof createProviderProfileSchema>;

export const updateProviderProfileSchema = createProviderProfileSchema.partial();
export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;

// ============================================================================
// SERVICE SCHEMAS
// ============================================================================

export const createServiceSchema = z.object({
  name: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  service_category: z.nativeEnum(ServiceCategory),
  price_shekel: z.number().min(0.01).max(100000),
  duration_minutes: z.number().int().min(15).max(1440).optional(),
  
  group_size_min: z.number().int().min(1).max(100).default(1),
  group_size_max: z.number().int().min(1).max(100).default(10),
  
  available_mon: z.boolean().default(true),
  available_tue: z.boolean().default(true),
  available_wed: z.boolean().default(true),
  available_thu: z.boolean().default(true),
  available_fri: z.boolean().default(true),
  available_sat: z.boolean().default(true),
  available_sun: z.boolean().default(true),
  
  start_hour: z.string().time().optional(),
  end_hour: z.string().time().optional(),
  
  min_experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  certification_required: z.string().optional(),
  
  booking_required: z.boolean().default(true),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const createReviewSchema = z.object({
  provider_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().min(10).max(5000),
  safety_rating: z.number().int().min(1).max(5).optional(),
  professionalism_rating: z.number().int().min(1).max(5).optional(),
  value_rating: z.number().int().min(1).max(5).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

export const createBookingSchema = z.object({
  service_id: z.string().uuid(),
  booking_date: z.string().date(),
  start_time: z.string().time(),
  group_size: z.number().int().min(1).max(100),
  special_requests: z.string().max(1000).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  provider_notes: z.string().max(1000).optional(),
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

// ============================================================================
// SEARCH & FILTER SCHEMAS
// ============================================================================

export const searchProvidersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  
  search: z.string().max(255).optional(),
  provider_type: z.nativeEnum(ProviderType).optional(),
  service_category: z.nativeEnum(ServiceCategory).optional(),
  
  location: z.string().max(255).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius_km: z.number().int().default(50),
  
  min_rating: z.number().min(0).max(5).default(0),
  price_min: z.number().min(0).default(0),
  price_max: z.number().min(0).default(100000),
  
  is_verified: z.boolean().optional(),
  sort_by: z.enum(['rating', 'price_asc', 'price_desc', 'distance', 'newest']).default('rating'),
});

export type SearchProvidersInput = z.infer<typeof searchProvidersSchema>;

// ============================================================================
// AVAILABILITY SCHEMAS
// ============================================================================

export const createAvailabilitySchema = z.object({
  available_date: z.string().date(),
  start_time: z.string().time(),
  end_time: z.string().time(),
  max_bookings: z.number().int().min(1).default(1),
});

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
```

### File: `src/types/service-provider.ts`

```typescript
export interface ServiceProvider {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  phone: string;
  email: string;
  website_url?: string;
  avatar_url?: string;
  cover_image_url?: string;
  provider_type: 'instructor' | 'shop' | 'guide' | 'boat_operator' | 'rental' | 'photography';
  license_number?: string;
  license_expiry?: string;
  insurance_provider?: string;
  insurance_expiry?: string;
  years_experience?: number;
  certifications?: string[];
  primary_location: string;
  latitude?: number;
  longitude?: number;
  service_radius_km: number;
  average_rating: number;
  total_reviews: number;
  response_rate?: number;
  status: 'pending' | 'approved' | 'suspended' | 'archived';
  is_verified: boolean;
  verification_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  name: string;
  description: string;
  service_category: string;
  price_shekel: number;
  currency: string;
  duration_minutes?: number;
  group_size_min: number;
  group_size_max: number;
  available_mon: boolean;
  available_tue: boolean;
  available_wed: boolean;
  available_thu: boolean;
  available_fri: boolean;
  available_sat: boolean;
  available_sun: boolean;
  start_hour?: string;
  end_hour?: string;
  min_experience_level?: string;
  certification_required?: string;
  is_active: boolean;
  booking_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderReview {
  id: string;
  provider_id: string;
  reviewer_user_id: string;
  rating: number;
  title?: string;
  comment: string;
  safety_rating?: number;
  professionalism_rating?: number;
  value_rating?: number;
  is_verified_booking: boolean;
  is_helpful_count: number;
  is_reported: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ProviderBooking {
  id: string;
  service_id: string;
  booker_user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  group_size: number;
  special_requests?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  confirmation_code: string;
  total_price_shekel?: number;
  provider_notes?: string;
  customer_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderGalleryItem {
  id: string;
  provider_id: string;
  url: string;
  media_type: 'image' | 'video';
  title?: string;
  description?: string;
  display_order?: number;
  is_featured: boolean;
  created_at: string;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  current_bookings: number;
  is_blocked: boolean;
  block_reason?: string;
  created_at: string;
}
```

---

## Frontend Components

### Component Hierarchy

```
src/app/[locale]/providers/
├── page.tsx                          # Directory home page
├── layout.tsx                        # Provider routes layout
├── search/
│   └── page.tsx                      # Search & filter results
├── [id]/                             # Individual provider profile
│   ├── page.tsx                      # Provider profile view
│   ├── services/
│   │   └── page.tsx                 # All services by provider
│   └── reviews/
│       └── page.tsx                 # All reviews
├── dashboard/
│   ├── page.tsx                      # Provider dashboard (my account)
│   ├── profile/
│   │   └── page.tsx                 # Edit profile
│   ├── services/
│   │   ├── page.tsx                 # Manage services
│   │   └── [id]/edit.tsx            # Edit service
│   ├── availability/
│   │   └── page.tsx                 # Manage availability
│   ├── bookings/
│   │   └── page.tsx                 # Manage bookings
│   └── analytics/
│       └── page.tsx                 # Reviews, stats

src/components/providers/
├── DirectorySearch.tsx               # Search bar & filters
├── ProviderCard.tsx                  # List item card
├── ProviderGrid.tsx                  # Grid layout
├── ProviderProfile.tsx               # Full profile view
├── ProviderGallery.tsx               # Photo gallery
├── ServiceCard.tsx                   # Service listing card
├── ServiceList.tsx                   # Services grid
├── ReviewCard.tsx                    # Review item
├── ReviewsList.tsx                   # Reviews section
├── ReviewForm.tsx                    # Write review form
├── BookingForm.tsx                   # Booking modal/form
├── AvailabilityCalendar.tsx          # Calendar picker
├── ProfileForm.tsx                   # Provider profile editor
├── ServiceForm.tsx                   # Service editor
├── ProviderDashboard.tsx             # Dashboard layout
└── ProviderStats.tsx                 # Analytics cards
```

### Key Components

#### 1. DirectorySearch.tsx - Search & Filter Interface

```typescript
interface DirectorySearchProps {
  onSearch: (filters: SearchProvidersInput) => void;
  isLoading?: boolean;
}

// Features:
// - Location search (map picker or text)
// - Provider type filter (instructor, shop, guide, etc.)
// - Service category filter
// - Rating filter (min)
// - Price range slider
// - Verified badge filter
// - Sort options (rating, price, distance, newest)
// - Location-based search (GPS or address)
// - Real-time suggestions
```

#### 2. ProviderCard.tsx - Directory Listing Card

```typescript
interface ProviderCardProps {
  provider: ServiceProvider;
  services?: ProviderService[];
  onViewDetails?: () => void;
}

// Displays:
// - Avatar & cover image
// - Business name & type badge
// - Average rating & review count
// - Short description (truncated)
// - Primary location & distance (if geolocation available)
// - Top service (name + price)
// - Quick actions (View Details, Book Now, Contact)
// - Verified badge (if applicable)
// - Response rate
```

#### 3. ProviderProfile.tsx - Full Profile View

```typescript
interface ProviderProfileProps {
  provider: ServiceProvider;
  services: ProviderService[];
  reviews: ProviderReview[];
  gallery: ProviderGalleryItem[];
  currentUserId?: string;
  onBookService?: (serviceId: string) => void;
  onWriteReview?: () => void;
}

// Sections:
// - Hero (cover image, avatar, verified badge, rating)
// - About (description, certifications, experience)
// - Contact info (email, phone, website, location)
// - Services (grid of available services)
// - Gallery (carousel or grid of photos/videos)
// - Availability (mini calendar)
// - Reviews section (sorted, filterable by rating)
// - CTA buttons (Book, Message, Contact)
```

#### 4. BookingForm.tsx - Service Booking

```typescript
interface BookingFormProps {
  service: ProviderService;
  provider: ServiceProvider;
  onSubmit?: (booking: CreateBookingInput) => void;
  isLoading?: boolean;
}

// Features:
// - Date picker (availability-aware)
// - Time picker (service hours)
// - Group size selector
// - Duration display
// - Total price calculation
// - Special requests textarea
// - Terms acceptance checkbox
// - Submit & cancel buttons
// - Loading state with estimated confirmation time
```

#### 5. ReviewForm.tsx - Submit Review

```typescript
interface ReviewFormProps {
  providerId: string;
  onSubmit?: (review: CreateReviewInput) => void;
  isLoading?: boolean;
}

// Features:
// - Star rating picker (overall)
// - Sub-ratings (safety, professionalism, value)
// - Review title field
// - Review comment textarea
// - Character count
// - Photo upload (optional)
// - Submit button
// - Success message
```

#### 6. AvailabilityCalendar.tsx - Booking Calendar

```typescript
interface AvailabilityCalendarProps {
  availability: ProviderAvailability[];
  blockedDates?: string[];
  onDateSelect: (date: string, time: string) => void;
}

// Features:
// - Month/week view toggle
// - Green for available slots
// - Red for booked/blocked
// - Time slot grid
// - Next available indicator
// - Tooltip on hover
```

#### 7. ProviderDashboard.tsx - Provider Control Panel

```typescript
interface ProviderDashboardProps {
  provider: ServiceProvider;
  stats: {
    totalBookings: number;
    pendingBookings: number;
    totalReviews: number;
    averageRating: number;
    responseRate: number;
  };
}

// Sections:
// - Navigation tabs (Profile, Services, Availability, Bookings, Analytics)
// - Quick stats cards
// - Recent bookings table
// - Recent reviews list
// - Edit profile quick links
// - Upload gallery modal
```

---

## API Routes

### File: `src/app/api/providers/route.ts`

```typescript
// GET /api/providers
// Search & list providers with filters
// Query params: page, limit, search, provider_type, service_category, 
//               location, min_rating, price_min, price_max, sort_by

// POST /api/providers
// Create new provider profile (authenticated)
// Body: CreateProviderProfileInput

// PATCH /api/providers/[id]
// Update provider profile (own profile only)
// Body: UpdateProviderProfileInput
```

### File: `src/app/api/providers/[id]/route.ts`

```typescript
// GET /api/providers/[id]
// Get single provider details with services, reviews, gallery

// DELETE /api/providers/[id]
// Archive provider profile (soft delete)
```

### File: `src/app/api/providers/[id]/services/route.ts`

```typescript
// GET /api/providers/[id]/services
// List all services by provider

// POST /api/providers/[id]/services
// Create new service (provider only)
// Body: CreateServiceInput

// PATCH /api/providers/[id]/services/[serviceId]
// Update service (provider only)
// Body: UpdateServiceInput

// DELETE /api/providers/[id]/services/[serviceId]
// Delete service (provider only)
```

### File: `src/app/api/providers/[id]/reviews/route.ts`

```typescript
// GET /api/providers/[id]/reviews
// List provider reviews with pagination & filters
// Query params: page, limit, min_rating, sort_by

// POST /api/providers/[id]/reviews
// Submit review (authenticated, verified booking only)
// Body: CreateReviewInput
```

### File: `src/app/api/providers/[id]/gallery/route.ts`

```typescript
// GET /api/providers/[id]/gallery
// List gallery items

// POST /api/providers/[id]/gallery
// Upload gallery item (provider only)
// Body: FormData with file

// DELETE /api/providers/[id]/gallery/[itemId]
// Delete gallery item (provider only)
```

### File: `src/app/api/providers/[id]/availability/route.ts`

```typescript
// GET /api/providers/[id]/availability
// Get availability slots for next 90 days
// Query params: date_from, date_to

// POST /api/providers/[id]/availability
// Create availability slot (provider only)
// Body: CreateAvailabilityInput

// DELETE /api/providers/[id]/availability/[slotId]
// Delete availability slot (provider only)
```

### File: `src/app/api/bookings/route.ts`

```typescript
// GET /api/bookings
// List user's bookings (authenticated)
// Query params: status, page, limit

// POST /api/bookings
// Create booking (authenticated)
// Body: CreateBookingInput

// PATCH /api/bookings/[id]
// Update booking status (provider or user)
// Body: UpdateBookingStatusInput

// GET /api/bookings/[id]/confirmation
// Get booking confirmation details
```

### File: `src/app/api/admin/providers/route.ts`

```typescript
// GET /api/admin/providers
// List all providers for moderation (admin only)

// PATCH /api/admin/providers/[id]/status
// Update provider status (admin only)
// Body: { status, reason }

// POST /api/admin/providers/[id]/verify
// Verify provider (admin only)
```

---

## RLS Policies

### File: `src/lib/service-provider/rls-policies.sql`

```sql
-- ============================================================================
-- SERVICE PROVIDERS RLS POLICIES
-- ============================================================================

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view approved providers
CREATE POLICY "Public can view approved providers"
  ON service_providers
  FOR SELECT
  USING (status = 'approved' AND is_verified = true);

-- Policy: Providers can view their own profile
CREATE POLICY "Providers can view own profile"
  ON service_providers
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Admins can view all providers
CREATE POLICY "Admins can view all providers"
  ON service_providers
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Policy: Users can create own provider profile
CREATE POLICY "Users can create own provider profile"
  ON service_providers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Providers can update own profile
CREATE POLICY "Providers can update own profile"
  ON service_providers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status != 'suspended');

-- ============================================================================
-- PROVIDER SERVICES RLS POLICIES
-- ============================================================================

ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active services of approved providers
CREATE POLICY "Public can view active services"
  ON provider_services
  FOR SELECT
  USING (
    is_active = true
    AND provider_id IN (
      SELECT id FROM service_providers 
      WHERE status = 'approved' AND is_verified = true
    )
  );

-- Policy: Providers can view their own services
CREATE POLICY "Providers can view own services"
  ON provider_services
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Policy: Providers can create/update/delete own services
CREATE POLICY "Providers can manage own services"
  ON provider_services
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own services"
  ON provider_services
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROVIDER REVIEWS RLS POLICIES
-- ============================================================================

ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view approved reviews
CREATE POLICY "Public can view approved reviews"
  ON provider_reviews
  FOR SELECT
  USING (moderation_status = 'approved');

-- Policy: Reviewers can view their own reviews
CREATE POLICY "Reviewers can view own reviews"
  ON provider_reviews
  FOR SELECT
  USING (reviewer_user_id = auth.uid());

-- Policy: Providers can view reviews on their profile
CREATE POLICY "Providers can view reviews on their profile"
  ON provider_reviews
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create reviews
CREATE POLICY "Users can create reviews"
  ON provider_reviews
  FOR INSERT
  WITH CHECK (
    reviewer_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM provider_bookings
      WHERE service_id IN (
        SELECT id FROM provider_services 
        WHERE provider_id = provider_reviews.provider_id
      )
      AND booker_user_id = auth.uid()
      AND status = 'completed'
    )
  );

-- ============================================================================
-- PROVIDER BOOKINGS RLS POLICIES
-- ============================================================================

ALTER TABLE provider_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON provider_bookings
  FOR SELECT
  USING (booker_user_id = auth.uid());

-- Policy: Providers can view bookings for their services
CREATE POLICY "Providers can view bookings for their services"
  ON provider_bookings
  FOR SELECT
  USING (
    service_id IN (
      SELECT id FROM provider_services
      WHERE provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can create bookings
CREATE POLICY "Users can create bookings"
  ON provider_bookings
  FOR INSERT
  WITH CHECK (booker_user_id = auth.uid());

-- Policy: Users can update own bookings
CREATE POLICY "Users can update own bookings"
  ON provider_bookings
  FOR UPDATE
  USING (booker_user_id = auth.uid())
  WITH CHECK (booker_user_id = auth.uid());

-- Policy: Providers can update bookings for their services
CREATE POLICY "Providers can update bookings for their services"
  ON provider_bookings
  FOR UPDATE
  USING (
    service_id IN (
      SELECT id FROM provider_services
      WHERE provider_id IN (
        SELECT id FROM service_providers WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PROVIDER GALLERY RLS POLICIES
-- ============================================================================

ALTER TABLE provider_gallery ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view gallery of approved providers
CREATE POLICY "Public can view provider gallery"
  ON provider_gallery
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers 
      WHERE status = 'approved' AND is_verified = true
    )
  );

-- Policy: Providers can manage their gallery
CREATE POLICY "Providers can manage own gallery"
  ON provider_gallery
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own gallery"
  ON provider_gallery
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete own gallery"
  ON provider_gallery
  FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROVIDER AVAILABILITY RLS POLICIES
-- ============================================================================

ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view availability of approved providers
CREATE POLICY "Public can view provider availability"
  ON provider_availability
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers 
      WHERE status = 'approved' AND is_verified = true
    )
  );

-- Policy: Providers can manage their availability
CREATE POLICY "Providers can manage own availability"
  ON provider_availability
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own availability"
  ON provider_availability
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete own availability"
  ON provider_availability
  FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );
```

---

## Implementation Checklist

### Phase 1: Database Setup (Week 1)
- [ ] Create migration file with all tables
- [ ] Add indexes for performance
- [ ] Set up RLS policies
- [ ] Create stored procedures for complex operations
- [ ] Generate TypeScript types from Supabase
- [ ] Test data seeding (5-10 test providers)

### Phase 2: Backend API (Week 2)
- [ ] Setup /api/providers routes (CRUD)
- [ ] Setup /api/providers/[id]/services routes
- [ ] Setup /api/providers/[id]/reviews routes
- [ ] Setup /api/providers/[id]/availability routes
- [ ] Setup /api/bookings routes
- [ ] Setup /api/admin/providers (moderation routes)
- [ ] Input validation with Zod
- [ ] Error handling & logging
- [ ] Unit tests for business logic

### Phase 3: Frontend Components (Weeks 3-4)
- [ ] Directory search page with filters
- [ ] Provider card component
- [ ] Provider grid layout
- [ ] Provider profile page
- [ ] Service listing & details
- [ ] Booking form & modal
- [ ] Review form & list
- [ ] Availability calendar
- [ ] Provider dashboard layout

### Phase 4: Provider Dashboard (Week 4)
- [ ] Profile editor form
- [ ] Service manager (CRUD)
- [ ] Availability calendar editor
- [ ] Booking management page
- [ ] Analytics/stats dashboard
- [ ] Gallery upload
- [ ] Notification system

### Phase 5: Admin & Moderation (Week 5)
- [ ] Admin provider approval panel
- [ ] Verification workflow
- [ ] Suspension/appeal system
- [ ] Review moderation
- [ ] Audit logs & reporting
- [ ] Analytics dashboard

### Phase 6: Testing & Optimization (Week 6)
- [ ] Integration testing
- [ ] Performance testing (load, pagination)
- [ ] Accessibility audit (WCAG 2.2)
- [ ] Mobile responsiveness
- [ ] Image optimization
- [ ] SEO optimization (meta tags)
- [ ] User acceptance testing (UAT)

### Phase 7: Launch & Monitoring (Week 7)
- [ ] Soft launch to test users
- [ ] Bug fixes & refinements
- [ ] Analytics setup
- [ ] Monitoring & alerting
- [ ] Public launch
- [ ] Marketing materials

---

## Moderation & Safety

### Verification Process

#### New Provider Onboarding (Required Steps)
1. **Email Verification** - Confirm email address
2. **Business Documentation**
   - License number (instructor/shop) or proof of operation
   - Insurance certificate (valid for 12 months)
   - Business registration (for shops)
3. **Identity Verification**
   - Government ID
   - Selfie match verification
4. **Background Check** (Optional)
   - Previous incident history
   - Safety certifications
5. **Admin Review**
   - Auto-approve if all docs valid
   - Manual review for edge cases
   - Rejection with appeal option

#### Status Levels
- **Pending**: Awaiting verification
- **Approved**: Verified, can accept bookings
- **Suspended**: Temporary suspension (7-30 days)
- **Archived**: Permanent removal

### Review Moderation

#### Automatic Detection
- Spam detection (AI-powered)
- Profanity filtering
- Fake review detection (unusual patterns)
- Duplicate review detection

#### Moderation Actions
- Approve (publish)
- Reject (hidden, reason sent to reviewer)
- Flag for manual review
- Request revision (ask reviewer to edit)

#### Appeal Process
- Reviewer can appeal rejection
- Admin reviews appeal within 72 hours
- Transparent communication

### Safety Measures

#### Provider Level
- Phone number verification
- Business license validation
- Annual insurance check
- Customer review moderation
- Response rate tracking (follow-up on low responders)
- Automated suspension for:
  - Multiple negative reviews (< 2 stars)
  - Multiple complaints
  - Missed/cancelled bookings (> 30%)
  - Expired licenses/insurance

#### Booking Level
- Confirmation code system
- Double opt-in (provider confirms)
- Cancellation policy (fair, transparent)
- Dispute resolution system
- Ratings validation (verified bookings only)

#### User Level
- Report provider function
- Block provider option
- Dispute/complaint system
- Privacy controls (email/phone visibility)

### Content Guidelines

#### Provider Profiles
- No contact info outside profile (email, phone, WhatsApp)
- No external links (website only)
- No inappropriate images
- Factual business info only
- No competitor bashing
- No false claims (certifications, experience)

#### Reviews
- Booking-verified only (users who actually booked)
- No profanity or hate speech
- No personal attacks
- No spam/promotional content
- No external links
- Constructive criticism encouraged
- Fake reviews auto-detected & removed

#### Services
- Clear, accurate descriptions
- Real pricing (no bait-and-switch)
- Honest group size limits
- Accurate experience requirements
- No misleading photos

### Penalties & Escalation

#### First Violation
- Warning + content removal
- Explanation email with guidelines

#### Second Violation
- 7-day suspension
- Potential manual review

#### Third Violation
- 30-day suspension
- Appeal process available

#### Severe Violations
- Immediate suspension
- Account review for potential ban
- Content removal
- Law enforcement referral (if applicable)

### Dispute Resolution

#### Provider vs. User Conflicts
1. Automatic: Automated refund/rescheduling options
2. Negotiation: 48-hour period for direct resolution
3. Escalation: Admin review & mediation
4. Final: Binding decision with explanation

#### Refund Policy
- Cancel > 48hrs before: Full refund
- Cancel 24-48hrs: 50% refund
- Cancel < 24hrs: No refund (provider discretion)
- Provider cancels: Full refund + 5% credit
- Dispute: Admin decides based on evidence

---

## Wireframes & User Flows

### Directory Search Page
```
[Header] [Search Bar with Filters dropdown]
┌─────────────────────────────────────┐
│ Filter Sidebar    │  Provider Cards  │
│ ────────────────  │  ────────────────│
│ ☐ Provider Type   │  [Card 1]        │
│   ☐ Instructor    │  ┌──────────────┐│
│   ☐ Shop          │  │[IMG] ⭐4.8    ││
│   ☐ Guide         │  │John's Diving ││
│   ☐ Boat Op       │  │PADI Instruc.  ││
│                    │  │₪200/person    ││
│ Location:          │  │[Details] [Book]│
│ [Tel Aviv     🔍]  │  └──────────────┘│
│ [Radius: 50km] │  [Card 2]        │
│                    │  [Card 3]        │
│ Price Range:       │  [Card 4]        │
│ ₪[___]₪[___]      │                  │
│                    │  [Pagination]    │
│ Min Rating:        │                  │
│ ⭐⭐⭐⭐☆          │                  │
│                    │                  │
│ [Verified Only] ☑  │                  │
│ [Sort: Rating  ▼] │                  │
└─────────────────────────────────────┘
```

### Provider Profile Page
```
[Header] [Back] [Share] [Report]
┌─────────────────────────────────────┐
│    [Cover Image]              [🔵]   │
│  [Avatar]                           │
│  Business Name                      │
│  ⭐4.8 (34 reviews) ✓Verified       │
│  "Type: PADI Instructor"            │
│  "Exp: 15 years"                    │
│                                      │
│  About                              │
│  Certified diving instructor with.. │
│  • PADI Master Instructor          │
│  • First Aid                        │
│  • Advanced Rescue                  │
│                                      │
│  Contact                            │
│  📧 john@email.com  [Send Message] │
│  📞 05X-XXXXXXX     [Copy]         │
│  🌐 www.example.com                │
│  📍 Tel Aviv, 15km                  │
│                                      │
│  Services (4 available)             │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Beg.  │ │Inter.│ │Tech. │       │
│  │₪200  │ │₪350  │ │₪500  │       │
│  │ 2hrs │ │ 4hrs │ │ 8hrs │       │
│  │[Book]│ │[Book]│ │[Book]│       │
│  └──────┘ └──────┘ └──────┘       │
│                                      │
│  Availability                        │
│  ☐ Mon ☐ Tue ☐ Wed ☑ Thu          │
│  ☑ Fri ☑ Sat ☑ Sun                │
│  Next available: Tomorrow 08:00     │
│  [View Calendar]                    │
│                                      │
│  Gallery (8 photos)                 │
│  [Img] [Img] [Img]  [+5 more]      │
│                                      │
│  Reviews (4.8/5 from 34)            │
│  [Filters] ⭐⭐⭐⭐⭐ (10)           │
│           ⭐⭐⭐⭐☆ (15)           │
│                                      │
│  ┌─────────────────────────────────┐│
│  │ Jane D. ⭐⭐⭐⭐⭐              ││
│  │ "Amazing experience!"            ││
│  │ Great instructor, safe...        ││
│  │ 2 weeks ago   Helpful: 5         ││
│  └─────────────────────────────────┘│
│                                      │
│           [Write Review] [Book Now] │
└─────────────────────────────────────┘
```

### Provider Dashboard
```
[Header] Logged in: John Doe
┌───────────────────────────────────────┐
│  [Profile] [Services] [Availability]   │
│  [Bookings] [Reviews] [Analytics]     │
├───────────────────────────────────────┤
│                                        │
│  Quick Stats                           │
│  ┌─────────┐ ┌──────────┐             │
│  │ Rating  │ │ Reviews  │             │
│  │ 4.8/5   │ │ 34 total │             │
│  └─────────┘ └──────────┘             │
│  ┌─────────┐ ┌──────────┐             │
│  │Bookings │ │Response  │             │
│  │12 pend. │ │ 95%      │             │
│  └─────────┘ └──────────┘             │
│                                        │
│  Pending Bookings                      │
│  ┌────────────────────────────────────┐│
│  │Date: 2026-07-15 | 3 people       ││
│  │Service: Beginner Course | ₪200   ││
│  │[Confirm] [Reject] [Message]      ││
│  └────────────────────────────────────┘│
│                                        │
│  Recent Reviews                        │
│  ┌────────────────────────────────────┐│
│  │Sarah M. ⭐⭐⭐⭐⭐               ││
│  │"Best diving experience ever!"     ││
│  │Helpful: 8  [Reply] [Report]      ││
│  └────────────────────────────────────┘│
│                                        │
│           [View All] [View Stats]     │
└───────────────────────────────────────┘
```

---

## Success Metrics

### Discovery Metrics
- Search volume & conversion rate
- Provider listing views
- Filter usage patterns
- Average time on provider profile

### Booking Metrics
- Booking volume & revenue
- Booking cancellation rate
- Average group size
- Repeat booking rate (loyalty)

### Quality Metrics
- Average provider rating
- Review volume & sentiment
- Response time (provider to inquiry)
- Booking confirmation rate

### Safety Metrics
- Dispute/complaint rate
- Provider suspension rate
- Review removal rate
- User report volume

---

## Future Enhancements

1. **Smart Matching** - AI-powered provider recommendations
2. **Pricing Intelligence** - Dynamic pricing suggestions
3. **Multi-language Support** - Hebrew, English, Russian (for Russian immigrants)
4. **Messaging/Chat** - In-app messaging between users and providers
5. **Certification Verification** - Auto-verify through PADI/SSI APIs
6. **Payment Processing** - Integrated payment with Stripe/2Checkout
7. **Scheduling API** - iCal/Google Calendar integration
8. **Mobile App** - Native iOS/Android apps
9. **Analytics Dashboard** - Detailed insights for providers
10. **Insurance Integration** - Digital insurance verification

---

Generated: 2026-06-20
Version: 1.0
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
