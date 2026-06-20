# DIVE DROP Booking System - Complete Design Specification

## Executive Summary

This document defines a comprehensive marketplace booking system connecting recreational divers with professional service providers (dive centers, instructors, boat operators). The system facilitates the complete lifecycle from buddy matching through post-dive reviews.

---

## 1. System Architecture & Booking Flow

### 1.1 Core Booking Flow (8 Steps)

```
STEP 1: Buddy Match
  └─ Two divers find each other via "Find a Buddy" feature
  └─ Connection established, both can see each other's profiles
  
STEP 2: Select Parameters
  └─ Choose date, location, desired service type
  └─ Define group size, difficulty level, duration
  
STEP 3: Browse Providers
  └─ List available service providers for selected date/location
  └─ View provider details, ratings, availability, pricing
  └─ Compare services and pricing tiers
  
STEP 4: Create Booking Request
  └─ Divers initiate booking with selected provider
  └─ Request shows both divers' profiles
  └─ Provider receives notification
  
STEP 5: Provider Decision
  └─ Provider reviews request
  └─ Confirms (booking proceeds) OR Declines (with reason)
  └─ Both divers notified of decision
  
STEP 6: Payment Processing
  └─ Payment collected from divers (50/50 split or other arrangement)
  └─ DIVE DROP commission deducted
  └─ Provider receives net payment
  
STEP 7: Booking Confirmation
  └─ Booking locked, all parties notified
  └─ Calendar updated, itinerary provided
  └─ Provider sends pre-dive briefing/requirements
  
STEP 8: Post-Dive Review
  └─ After dive completion, divers and provider exchange reviews
  └─ Ratings (1-5 stars) + written feedback
  └─ Reviews visible on profiles for future bookings
```

### 1.2 Booking State Machine

```
CREATED
  ├─ Pending Provider Review (24-48 hours)
  │
  ├─→ CONFIRMED
  │    ├─ In Progress (dive happening)
  │    ├─→ COMPLETED
  │    │    ├─ Awaiting Diver Review
  │    │    ├─ Awaiting Provider Review
  │    │    └─→ REVIEWED (both sides reviewed)
  │    │
  │    ├─→ CANCELLED (diver/provider cancels)
  │    │    ├─ Refund Processing
  │    │    └─→ REFUNDED
  │    │
  │    └─→ NO_SHOW
  │         ├─ Dispute/Cancellation
  │         └─→ RESOLVED
  │
  └─→ DECLINED (provider rejected)
       ├─ Reason Recorded
       └─→ Can Rebook with Different Provider
```

---

## 2. Database Schema

### 2.1 Core Tables

#### `bookings` - Main booking record
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Party Information
  diver_1_id UUID NOT NULL REFERENCES users(id),
  diver_2_id UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  
  -- Booking Details
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL, -- 30-180 min
  max_depth DECIMAL(4,1),
  difficulty_level 'beginner'|'intermediate'|'advanced'|'instructor' NOT NULL,
  group_size INTEGER DEFAULT 2,
  special_requests TEXT,
  
  -- Service Details
  service_type 'recreational'|'technical'|'rescue'|'photography' NOT NULL,
  equipment_provided BOOLEAN DEFAULT true,
  guide_type 'group'|'private' DEFAULT 'group',
  
  -- Status & Timestamps
  status booking_status NOT NULL DEFAULT 'pending',
  provider_response_at TIMESTAMP,
  provider_response 'confirmed'|'declined',
  decline_reason TEXT,
  
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  -- Pricing
  service_price DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(4,2) DEFAULT 15.00,
  
  -- Review Status
  diver_1_reviewed BOOLEAN DEFAULT false,
  diver_2_reviewed BOOLEAN DEFAULT false,
  provider_reviewed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_bookings_diver_1 ON bookings(diver_1_id);
CREATE INDEX idx_bookings_diver_2 ON bookings(diver_2_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
```

#### `booking_items` - Services included in booking
```sql
CREATE TABLE booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  service_id UUID NOT NULL REFERENCES services(id),
  service_name VARCHAR(255) NOT NULL,
  service_category 'guide'|'equipment'|'boat'|'transportation'|'certification'|'specialty' NOT NULL,
  
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
```

#### `booking_messages` - Communication thread
```sql
CREATE TABLE booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_type 'diver'|'provider' NOT NULL,
  
  message_type 'text'|'system'|'update'|'attachment' DEFAULT 'text',
  content TEXT NOT NULL,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_messages_booking ON booking_messages(booking_id);
CREATE INDEX idx_booking_messages_sender ON booking_messages(sender_id);
CREATE INDEX idx_booking_messages_unread ON booking_messages(booking_id, is_read);
```

#### `booking_status_history` - Audit trail
```sql
CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  old_status booking_status,
  new_status booking_status NOT NULL,
  
  changed_by_user_id UUID REFERENCES users(id),
  changed_by_type 'diver'|'provider'|'admin'|'system' NOT NULL,
  
  reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id);
```

### 2.2 Service Provider Tables

#### `service_providers` - Main provider record
```sql
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Basic Info
  business_name VARCHAR(255) NOT NULL UNIQUE,
  business_type 'dive_center'|'instructor'|'boat_operator'|'rental_shop' NOT NULL,
  description TEXT,
  
  -- Location & Service Area
  primary_location POINT NOT NULL, -- PostGIS
  service_radius_km INTEGER DEFAULT 50,
  cities_served TEXT[], -- array of city names
  
  -- Contact
  phone VARCHAR(20),
  website_url VARCHAR(255),
  social_media JSONB, -- {instagram, facebook, etc}
  
  -- Verification & Credentials
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  
  certifications TEXT[], -- PADI, IANTD, etc
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(255),
  
  -- Ratings & Stats
  rating_average DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  response_time_hours DECIMAL(4,1),
  
  -- Business Settings
  commission_percentage DECIMAL(4,2) DEFAULT 15.00,
  bank_account_verified BOOLEAN DEFAULT false,
  payout_frequency 'weekly'|'monthly' DEFAULT 'weekly',
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_providers_user ON service_providers(user_id);
CREATE INDEX idx_service_providers_type ON service_providers(business_type);
CREATE INDEX idx_service_providers_rating ON service_providers(rating_average DESC);
CREATE INDEX idx_service_providers_location ON service_providers USING GIST(primary_location);
```

#### `services` - Service offerings
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  service_name VARCHAR(255) NOT NULL,
  service_category 'recreational_dive'|'technical_dive'|'rescue_training'|'certification'|'specialty'|'equipment_rental'|'boat_charter' NOT NULL,
  
  description TEXT,
  
  -- Duration & Availability
  min_duration_minutes INTEGER DEFAULT 60,
  max_duration_minutes INTEGER DEFAULT 240,
  
  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  price_per_extra_diver DECIMAL(10,2),
  
  -- Requirements
  min_certification_level 'beginner'|'intermediate'|'advanced'|'instructor',
  max_group_size INTEGER,
  
  -- Details
  equipment_provided BOOLEAN DEFAULT true,
  includes_guide BOOLEAN DEFAULT true,
  includes_photography BOOLEAN DEFAULT false,
  special_features TEXT[], -- e.g., ["night dive", "wreck dive", "reef dive"]
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(service_category);
CREATE INDEX idx_services_active ON services(is_active);
```

#### `provider_availability` - Calendar system
```sql
CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  availability_date DATE NOT NULL,
  
  -- Time slots (30-min granularity)
  available_slots JSONB NOT NULL, -- [{start: "08:00", end: "12:00", capacity: 4}, ...]
  
  -- Overrides
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  
  -- Capacity
  max_daily_bookings INTEGER,
  current_bookings INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_availability_provider_date ON provider_availability(provider_id, availability_date);
```

#### `provider_reviews` - Reviews & ratings
```sql
CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  reviewer_id UUID NOT NULL REFERENCES users(id), -- diver who reviewed
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Breakdown ratings
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  safety_rating INTEGER CHECK (safety_rating >= 1 AND safety_rating <= 5),
  instruction_quality_rating INTEGER CHECK (instruction_quality_rating >= 1 AND instruction_quality_rating <= 5),
  equipment_condition_rating INTEGER CHECK (equipment_condition_rating >= 1 AND equipment_condition_rating <= 5),
  
  title VARCHAR(255),
  comment TEXT,
  
  -- Tags
  experience_tags TEXT[], -- e.g., ["professional", "safe", "fun", "expensive"]
  
  response_from_provider TEXT,
  responded_at TIMESTAMP,
  
  is_verified_booking BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_reviews_provider ON provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_reviewer ON provider_reviews(reviewer_id);
CREATE INDEX idx_provider_reviews_booking ON provider_reviews(booking_id);
```

### 2.3 Payment & Payout Tables

#### `booking_payments` - Payment records
```sql
CREATE TABLE booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Payment source
  payer_id UUID NOT NULL REFERENCES users(id), -- diver paying
  payer_type 'diver_1'|'diver_2' NOT NULL,
  
  -- Amount
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Payment method
  payment_method 'stripe'|'paypal'|'bank_transfer'|'credit_card' NOT NULL,
  payment_reference VARCHAR(255) UNIQUE,
  
  -- Status
  payment_status 'pending'|'processing'|'succeeded'|'failed'|'refunded' NOT NULL DEFAULT 'pending',
  payment_gateway_response JSONB,
  
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  paid_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_payments_booking ON booking_payments(booking_id);
CREATE INDEX idx_booking_payments_payer ON booking_payments(payer_id);
CREATE INDEX idx_booking_payments_status ON booking_payments(payment_status);
```

#### `provider_payouts` - Provider earnings
```sql
CREATE TABLE provider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  
  -- Payout period
  payout_period_start DATE NOT NULL,
  payout_period_end DATE NOT NULL,
  
  -- Earnings
  gross_earnings DECIMAL(10,2) NOT NULL,
  commission_paid DECIMAL(10,2) NOT NULL,
  net_earnings DECIMAL(10,2) NOT NULL,
  
  -- Completed bookings
  booking_count INTEGER NOT NULL,
  
  -- Payout details
  payout_method 'bank_transfer'|'stripe_connect' NOT NULL,
  account_reference VARCHAR(255),
  
  -- Status
  payout_status 'pending'|'processing'|'completed'|'failed' NOT NULL DEFAULT 'pending',
  gateway_response JSONB,
  
  processed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_payouts_provider ON provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON provider_payouts(payout_status);
```

---

## 3. TypeScript Type Definitions

```typescript
// types/booking.ts

// Status Enums
export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'no_show'
  | 'reviewed';

export type ServiceType = 
  | 'recreational'
  | 'technical'
  | 'rescue'
  | 'photography';

export type DifficultLevel = 
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'instructor';

export type GuideType = 'group' | 'private';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type PayoutStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

// Core Booking Type
export interface Booking {
  id: string;
  diver_1_id: string;
  diver_2_id: string;
  provider_id: string;
  dive_site_id: string;
  
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM
  duration_minutes: number;
  max_depth?: number;
  difficulty_level: DifficultLevel;
  group_size: number;
  special_requests?: string;
  
  service_type: ServiceType;
  equipment_provided: boolean;
  guide_type: GuideType;
  
  status: BookingStatus;
  provider_response?: 'confirmed' | 'declined';
  provider_response_at?: string;
  decline_reason?: string;
  
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  
  service_price: number;
  commission_amount: number;
  total_price: number;
  commission_percentage: number;
  
  diver_1_reviewed: boolean;
  diver_2_reviewed: boolean;
  provider_reviewed: boolean;
  
  created_at: string;
  updated_at: string;
}

// Service Provider Types
export interface ServiceProvider {
  id: string;
  user_id: string;
  business_name: string;
  business_type: 'dive_center' | 'instructor' | 'boat_operator' | 'rental_shop';
  description?: string;
  
  primary_location: {
    lat: number;
    lng: number;
  };
  service_radius_km: number;
  cities_served: string[];
  
  phone?: string;
  website_url?: string;
  social_media?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  
  verified: boolean;
  verified_at?: string;
  
  certifications: string[];
  insurance_provider?: string;
  insurance_policy_number?: string;
  
  rating_average?: number;
  review_count: number;
  completed_bookings: number;
  response_time_hours: number;
  
  commission_percentage: number;
  bank_account_verified: boolean;
  payout_frequency: 'weekly' | 'monthly';
  
  is_active: boolean;
  onboarding_completed: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  service_name: string;
  service_category: 'recreational_dive' | 'technical_dive' | 'rescue_training' | 'certification' | 'specialty' | 'equipment_rental' | 'boat_charter';
  description?: string;
  
  min_duration_minutes: number;
  max_duration_minutes: number;
  
  base_price: number;
  price_per_extra_diver?: number;
  
  min_certification_level?: DifficultLevel;
  max_group_size?: number;
  
  equipment_provided: boolean;
  includes_guide: boolean;
  includes_photography: boolean;
  special_features: string[];
  
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

// Payment Types
export interface BookingPayment {
  id: string;
  booking_id: string;
  payer_id: string;
  payer_type: 'diver_1' | 'diver_2';
  
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  tax_amount: number;
  
  payment_method: 'stripe' | 'paypal' | 'bank_transfer' | 'credit_card';
  payment_reference?: string;
  
  payment_status: PaymentStatus;
  payment_gateway_response?: Record<string, any>;
  
  error_message?: string;
  retry_count: number;
  
  paid_at?: string;
  
  created_at: string;
  updated_at: string;
}

// Review Type
export interface ProviderReview {
  id: string;
  booking_id: string;
  provider_id: string;
  reviewer_id: string;
  
  rating: 1 | 2 | 3 | 4 | 5;
  
  professionalism_rating?: 1 | 2 | 3 | 4 | 5;
  safety_rating?: 1 | 2 | 3 | 4 | 5;
  instruction_quality_rating?: 1 | 2 | 3 | 4 | 5;
  equipment_condition_rating?: 1 | 2 | 3 | 4 | 5;
  
  title?: string;
  comment?: string;
  
  experience_tags?: string[];
  
  response_from_provider?: string;
  responded_at?: string;
  
  is_verified_booking: boolean;
  
  created_at: string;
  updated_at: string;
}

// Request/Form Types
export interface CreateBookingRequest {
  diver_1_id: string;
  diver_2_id: string;
  provider_id: string;
  dive_site_id: string;
  
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  max_depth?: number;
  difficulty_level: DifficultLevel;
  
  service_type: ServiceType;
  guide_type: GuideType;
  special_requests?: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  reason?: string;
  provider_response?: 'confirmed' | 'declined';
  decline_reason?: string;
}
```

---

## 4. API Endpoints Specification

### 4.1 Booking Management

#### `POST /api/bookings` - Create Booking
```
Request:
{
  "diver_1_id": "uuid",
  "diver_2_id": "uuid",
  "provider_id": "uuid",
  "dive_site_id": "uuid",
  "booking_date": "2026-07-15",
  "booking_time": "08:30",
  "duration_minutes": 120,
  "difficulty_level": "intermediate",
  "service_type": "recreational",
  "guide_type": "group",
  "max_depth": 30,
  "special_requests": "Photography during dive"
}

Response: 201 Created
{
  "id": "uuid",
  "status": "pending",
  "total_price": 250,
  "service_price": 200,
  "commission_amount": 50,
  ...
}

Errors:
- 400: Invalid input or divers not matched
- 402: Provider not available for date/time
- 404: Provider or dive site not found
```

#### `GET /api/bookings` - List My Bookings
```
Query Parameters:
- role: 'diver' | 'provider' (required)
- status: BookingStatus (optional, comma-separated)
- from_date: YYYY-MM-DD (optional)
- to_date: YYYY-MM-DD (optional)
- limit: number (default 20, max 100)
- offset: number (default 0)

Response: 200 OK
{
  "data": [
    { booking object... },
    ...
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}

Errors:
- 401: Unauthorized
- 403: Can only view own bookings
```

#### `GET /api/bookings/:id` - Get Booking Details
```
Response: 200 OK
{
  id: "uuid",
  diver_1: { user object },
  diver_2: { user object },
  provider: { provider object },
  dive_site: { dive_site object },
  services: [ service items... ],
  messages: [ messages... ],
  payments: [ payment records... ],
  reviews: [ review records... ],
  ...
}

Errors:
- 404: Booking not found
- 403: Not authorized to view this booking
```

#### `PUT /api/bookings/:id/status` - Update Booking Status
```
Request:
{
  "status": "confirmed" | "cancelled" | "declined",
  "reason": "optional reason",
  "provider_response": "confirmed" | "declined" (provider only),
  "decline_reason": "booking full" (if declined)
}

Response: 200 OK
{ updated booking object }

Errors:
- 400: Invalid status transition
- 403: Not authorized to change status
- 409: Booking in wrong state for this operation
```

#### `POST /api/bookings/:id/cancel` - Cancel Booking
```
Request:
{
  "cancellation_reason": "string",
  "cancelled_by": "diver" | "provider"
}

Response: 200 OK
{
  "status": "cancelled",
  "refund_status": "processing",
  "refund_amount": 200,
  ...
}

Errors:
- 409: Cannot cancel booking in current state
- 422: Cancellation within non-refundable window
```

### 4.2 Provider Management

#### `GET /api/providers/search` - Search Available Providers
```
Query Parameters:
- dive_site_id: uuid (required)
- booking_date: YYYY-MM-DD (required)
- booking_time: HH:MM (required)
- difficulty_level: DifficultLevel
- group_size: number
- radius_km: number (default 50)
- page: number
- limit: number (default 20)

Response: 200 OK
{
  "data": [
    {
      "provider": { provider object },
      "availability_status": "available",
      "available_slots": ["08:00", "08:30", "09:00", ...],
      "services": [ service objects... ],
      "reviews": [ latest reviews... ],
      "rating_summary": { avg: 4.8, count: 245 }
    },
    ...
  ],
  "total": 45
}
```

#### `GET /api/providers/:id` - Get Provider Details
```
Response: 200 OK
{
  "provider": { provider object },
  "services": [ services... ],
  "reviews": [ reviews... ],
  "availability_calendar": {
    "2026-07-15": { available: true, slots_available: 3 },
    "2026-07-16": { available: false, reason: "booked" },
    ...
  },
  "rating_breakdown": {
    "professionalism": 4.9,
    "safety": 4.95,
    "instruction_quality": 4.8,
    "equipment_condition": 4.7
  },
  "response_time": 2.5, // hours
  "cancellation_rate": 0.02 // 2%
}
```

#### `POST /api/provider/bookings` - Get Provider's Bookings
```
Query Parameters:
- status: BookingStatus (comma-separated)
- from_date: YYYY-MM-DD
- to_date: YYYY-MM-DD
- limit: number
- offset: number

Response: 200 OK
{
  "data": [ booking objects... ],
  "total": 85,
  "awaiting_response": 3,
  "confirmed": 45,
  "completed": 37
}
```

#### `POST /api/provider/availability` - Set Availability
```
Request:
{
  "date": "2026-07-15",
  "slots": [
    { "start": "08:00", "end": "12:00", "capacity": 4 },
    { "start": "14:00", "end": "18:00", "capacity": 3 }
  ],
  "is_blocked": false
}

Response: 200 OK
{ availability record }
```

#### `POST /api/provider/availability/block` - Block Time
```
Request:
{
  "date_from": "2026-07-15",
  "date_to": "2026-07-17",
  "reason": "Personal vacation"
}

Response: 200 OK
{ confirmation }
```

### 4.3 Messaging

#### `POST /api/bookings/:id/messages` - Send Message
```
Request:
{
  "content": "string",
  "message_type": "text" | "system" | "attachment"
}

Response: 201 Created
{ message object }

Errors:
- 400: Empty message
- 403: Not participant in booking
```

#### `GET /api/bookings/:id/messages` - Get Messages
```
Query Parameters:
- limit: number (default 50)
- offset: number
- unread_only: boolean

Response: 200 OK
{
  "data": [ message objects... ],
  "total": 145,
  "unread_count": 3
}
```

#### `PUT /api/messages/:id/read` - Mark as Read
```
Response: 200 OK
```

### 4.4 Reviews & Ratings

#### `POST /api/bookings/:id/review` - Leave Review
```
Request:
{
  "reviewer_id": "uuid",
  "rating": 5,
  "professionalism_rating": 5,
  "safety_rating": 5,
  "instruction_quality_rating": 4,
  "equipment_condition_rating": 5,
  "title": "Amazing dive!",
  "comment": "Best dive experience I've had",
  "experience_tags": ["professional", "fun", "safe"]
}

Response: 201 Created
{ review object }

Errors:
- 404: Booking not found or not completed
- 409: Already reviewed
```

#### `PUT /api/reviews/:id` - Edit Review
```
Request: { updated review fields }

Response: 200 OK
{ updated review }

Errors:
- 404: Review not found
- 403: Only reviewer can edit
- 409: Review older than 30 days
```

#### `POST /api/reviews/:id/response` - Provider Response
```
Request:
{
  "response": "Thank you for the kind words...",
}

Response: 200 OK
{ review with response }
```

### 4.5 Payments

#### `POST /api/bookings/:id/payment` - Process Payment
```
Request:
{
  "payment_method": "stripe" | "paypal",
  "amount": 100,
  "currency": "USD" | "ILS",
  "payer_type": "diver_1" | "diver_2",
  "token": "stripe_token_or_payment_token"
}

Response: 200 OK
{
  "payment_id": "uuid",
  "status": "processing",
  "amount": 100,
  "reference": "stripe_charge_id"
}

Errors:
- 400: Invalid payment data
- 402: Payment failed
- 409: Booking not in correct state for payment
```

#### `GET /api/bookings/:id/payment-status` - Check Payment Status
```
Response: 200 OK
{
  "diver_1_paid": true,
  "diver_2_paid": false,
  "total_paid": 100,
  "remaining": 100,
  "status": "partial_payment"
}
```

---

## 5. UI/UX Wireframes & Components

### 5.1 Diver Experience Flow

#### Screen 1: Booking Start (Select Buddy)
```
┌─────────────────────────────────┐
│  Your matched divers            │
├─────────────────────────────────┤
│                                 │
│  [Avatar] John D.               │
│  Advanced | 150+ dives          │
│  ☆☆☆☆☆ Verified                │
│                                 │
│  [Avatar] Sarah M.              │
│  Intermediate | 45 dives        │
│  ☆☆☆☆☆ Verified                │
│                                 │
│  [ Continue with John & Sarah ] │
│  [ Browse other matches ]       │
└─────────────────────────────────┘
```

#### Screen 2: Booking Parameters
```
┌─────────────────────────────────┐
│  Dive Details                   │
├─────────────────────────────────┤
│ Date: [picker] 15 July 2026    │
│ Time: [picker] 08:30            │
│ Duration: [○●○] 2 hours        │
│ Location: [Shark Reef ▼]       │
│ Difficulty: [Intermediate ▼]   │
│ Max Depth: 30m                  │
│                                 │
│ Special Requests:               │
│ [Photography wanted?   ]        │
│ [Equipment rental needed]       │
│                                 │
│ [ Browse Providers ]            │
└─────────────────────────────────┘
```

#### Screen 3: Provider Search Results
```
┌─────────────────────────────────┐
│  Providers Near Shark Reef      │
│  July 15, 2026 - 08:30          │
├─────────────────────────────────┤
│                                 │
│  🏢 Deep Blue Dive Center       │
│  ☆☆☆☆☆ 4.9 (342 reviews)      │
│  ⏱ Avg response: 1 hour        │
│  📍 2.3 km away                │
│  💰 $120 per person            │
│  ✓ Equipment included          │
│  ✓ Certified instructor        │
│                                 │
│  [ View Details ] [ Book ]     │
│                                 │
│  🏖️ Captain Joe's Boat Tours    │
│  ☆☆☆☆☆ 4.7 (198 reviews)      │
│  ⏱ Avg response: 2 hours       │
│  📍 4.1 km away                │
│  💰 $95 per person             │
│  ✓ Boat with 6 divers max      │
│                                 │
│  [ View Details ] [ Book ]     │
│                                 │
│  [ Load More ]                  │
└─────────────────────────────────┘
```

#### Screen 4: Provider Detail View
```
┌─────────────────────────────────┐
│ < Deep Blue Dive Center         │
├─────────────────────────────────┤
│                                 │
│  [Hero Image]                   │
│                                 │
│  ☆☆☆☆☆ 4.9 (342 reviews)      │
│  🏢 PADI Gold Palm Certified    │
│  📍 Eilat, Israel               │
│  ✓ Verified Insurance           │
│                                 │
│  Services:                      │
│  • Recreational Dive - $120     │
│  • Night Dive - $150            │
│  • Wreck Dive - $140            │
│  • Certification Course - $300  │
│                                 │
│  Ratings Breakdown:             │
│  • Professionalism: ☆☆☆☆☆ 4.9 │
│  • Safety: ☆☆☆☆☆ 4.95         │
│  • Instruction: ☆☆☆☆☆ 4.8    │
│  • Equipment: ☆☆☆☆☆ 4.7      │
│                                 │
│  Recent Reviews:                │
│  "Amazing experience!" - John   │
│  "Professional and safe" - Sarah│
│                                 │
│  [ Send Message ] [ Book Now ]  │
└─────────────────────────────────┘
```

#### Screen 5: Booking Confirmation
```
┌─────────────────────────────────┐
│  Booking Request Sent!          │
├─────────────────────────────────┤
│                                 │
│  ✓ Deep Blue Dive Center       │
│  ✓ Shark Reef                  │
│  ✓ 15 July 2026 - 08:30        │
│  ✓ 2 hours                     │
│                                 │
│  Participants:                  │
│  • You (Sarah M.)              │
│  • John D.                      │
│                                 │
│  Cost per person: $120         │
│  Your total: $120              │
│                                 │
│  Status: ⏳ Awaiting Confirmation│
│  Expected: Within 2 hours       │
│                                 │
│  [ Message Provider ]           │
│  [ Cancel Request ]             │
│  [ Back ]                       │
└─────────────────────────────────┘
```

#### Screen 6: Booking Status - Confirmed
```
┌─────────────────────────────────┐
│  Booking Confirmed! ✓           │
├─────────────────────────────────┤
│                                 │
│  Deep Blue Dive Center         │
│  📍 Shark Reef                  │
│  📅 15 July 2026               │
│  🕐 08:30 - 10:30              │
│                                 │
│  Pre-Dive Requirements:         │
│  [ ] Sign waiver               │
│  [ ] Provide emergency contact  │
│  [ ] Medical questionnaire      │
│  [ ] Confirm equipment size     │
│                                 │
│  Status: 🟢 CONFIRMED          │
│  Payment: 💳 Awaiting Payment  │
│                                 │
│  [ Process Payment ]            │
│  [ Share with John ]            │
│  [ Set Reminder ]               │
│  [ Message Provider ]           │
│  [ Booking Details ]            │
└─────────────────────────────────┘
```

#### Screen 7: Post-Dive Review
```
┌─────────────────────────────────┐
│  How was your dive?             │
├─────────────────────────────────┤
│                                 │
│  [Avatar] Deep Blue Dive Center │
│  15 July 2026 - Shark Reef     │
│                                 │
│  Overall Rating:                │
│  ☆☆☆☆☆ (tap to rate)          │
│                                 │
│  Rate These Aspects:            │
│  Professionalism: ☆☆☆☆☆       │
│  Safety: ☆☆☆☆☆               │
│  Instruction Quality: ☆☆☆☆☆   │
│  Equipment Condition: ☆☆☆☆☆   │
│                                 │
│  Title:                         │
│  [Amazing dive with great guide ]
│                                 │
│  Your Review:                   │
│  [Best experience ever!...]     │
│                                 │
│  Tags: ☑ Professional ☑ Safe    │
│        ☑ Fun  ☐ Expensive      │
│                                 │
│  [ Submit Review ]  [ Skip ]    │
└─────────────────────────────────┘
```

### 5.2 Provider Experience Flow

#### Screen 1: Pending Requests
```
┌─────────────────────────────────┐
│  Booking Requests: 3            │
├─────────────────────────────────┤
│                                 │
│  🔴 John D. & Sarah M.         │
│  📍 Shark Reef - 15 July 08:30  │
│  👥 2 divers (Advanced)         │
│  ⏳ Awaiting your response      │
│  ⏰ Requested 1 hour ago        │
│  💰 $240 commission             │
│                                 │
│  [ View Details ]               │
│  [ Decline ▼ ] [ Confirm ]     │
│                                 │
│  🟡 Mike T. & Lisa H.          │
│  📍 Japanese Gardens - 16 July  │
│  👥 2 divers (Intermediate)    │
│  ⏳ Awaiting your response      │
│  ⏰ Requested 3 hours ago       │
│  💰 $180 commission             │
│                                 │
│  [ View Details ]               │
│  [ Decline ▼ ] [ Confirm ]     │
│                                 │
│  🟢 Tom R. & Emma S.           │
│  📍 Satil Wreck - 17 July      │
│  👥 2 divers (Advanced)         │
│  ✅ You confirmed this          │
│  ✓ Payment received             │
│  💰 $300 earnings               │
│                                 │
│  [ View Details ]               │
│  [ Awaiting Dive ]              │
│                                 │
└─────────────────────────────────┘
```

#### Screen 2: Booking Request Details
```
┌─────────────────────────────────┐
│ < Booking Request Details       │
├─────────────────────────────────┤
│                                 │
│  DIVERS:                        │
│  [Avatar] John D.               │
│  Advanced | 150+ dives          │
│  ☆☆☆☆☆ 4.8 | Verified         │
│                                 │
│  [Avatar] Sarah M.              │
│  Intermediate | 45 dives        │
│  ☆☆☆☆☆ 4.9 | Verified         │
│                                 │
│  DIVE DETAILS:                  │
│  📍 Shark Reef                  │
│  📅 15 July 2026               │
│  🕐 08:30 - 10:30 (2 hours)    │
│  🎯 Max Depth: 30m             │
│  📋 Special: Photography wanted │
│                                 │
│  PRICING:                       │
│  Your Commission: $240          │
│  (2 divers × $120)             │
│  Payout Status: PENDING         │
│                                 │
│  [ Message Divers ]             │
│  [ View Similar Past Bookings ] │
│                                 │
│  [ Decline - Reason ▼ ]        │
│  [ Confirm Booking ]            │
│                                 │
└─────────────────────────────────┘
```

#### Screen 3: Availability Calendar
```
┌─────────────────────────────────┐
│  Your Availability              │
│  July 2026                      │
├─────────────────────────────────┤
│                                 │
│  Mo Tu We Th Fr Sa Su           │
│               1  2  3  4  5     │
│   6  7  8  9 10 11 12           │
│  13 14 [15]16 17 18 19          │
│  20 21 22 23 24 25 26           │
│  27 28 29 30 31                 │
│                                 │
│  15 July (Wed):                 │
│  ☑ 08:00 - 12:00 (4 slots)     │
│  ☑ 14:00 - 18:00 (4 slots)     │
│  ☐ [x] Blocked 12:00 - 14:00   │
│                                 │
│  16 July (Thu):                 │
│  ☑ 08:00 - 17:00 (9 slots)     │
│  ☐ [OFF] Not available          │
│                                 │
│  17 July (Fri):                 │
│  ☐ Blocked - Personal vacation  │
│                                 │
│  [ Edit Selected Date ]         │
│  [ Block Multiple Days ]        │
│  [ Copy from Previous Week ]    │
│                                 │
│  [ Save ]                       │
└─────────────────────────────────┘
```

#### Screen 4: Earnings & Payouts
```
┌─────────────────────────────────┐
│  Your Earnings                  │
├─────────────────────────────────┤
│                                 │
│  July 2026 (In Progress)        │
│  Gross: $2,840                  │
│  Commission (15%): -$426        │
│  Net: $2,414                    │
│                                 │
│  ⚙️ Completed Bookings: 12      │
│  ⏳ Pending Bookings: 3         │
│                                 │
│  Last Payout:                   │
│  📅 1 July 2026                │
│  💰 $1,950                     │
│  📤 To: [Your Bank Account]    │
│  ✓ Completed                    │
│                                 │
│  Next Payout:                   │
│  📅 1 August 2026 (Estimated)  │
│  💰 $2,414 (Pending completion) │
│  📤 To: [Your Bank Account]    │
│                                 │
│  Transaction History:           │
│  • 1 July: $1,950 ✓            │
│  • 1 June: $1,760 ✓            │
│  • 1 May: $1,650 ✓             │
│                                 │
│  [ Update Bank Account ]        │
│  [ View Tax Documents ]         │
│  [ Contact Support ]            │
│                                 │
└─────────────────────────────────┘
```

---

## 6. Status Flow Diagram

```
                    ┌──────────────┐
                    │   CREATED    │
                    │   status:    │
                    │   'pending'  │
                    └──────┬───────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
        Wait 24-48h        Provider Reviews
        (auto-decline)     Request
                 │                   │
                 ▼                   ▼
         ┌──────────────┐  ┌──────────────┐
         │   DECLINED   │  │  CONFIRMED   │
         │              │  │              │
         │ Can rebook   │  │ Await payment│
         │ with new     │  │ & sign docs  │
         │ provider     │  │              │
         └──────────────┘  └──────┬───────┘
                                   │
                          ┌────────┴────────┐
                          │                 │
                    Payments      Cancellation
                    completed     requested
                          │                 │
                          ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐
                  │ IN_PROGRESS  │  │  CANCELLED   │
                  │              │  │              │
                  │ Dive happens │  │ Refund       │
                  │              │  │ processing   │
                  └──────┬───────┘  └──────┬───────┘
                         │                 │
                         │        Refund completed
                         │        or disputed
                         │                 │
                         │          ┌──────▼────────┐
                         │          │   REFUNDED    │
                         │          │   or DISPUTED │
                         │          └───────────────┘
                         │
                Dive completed
                         │
                         ▼
                 ┌──────────────────┐
                 │    COMPLETED     │
                 │                  │
                 │ Waiting for      │
                 │ reviews from     │
                 │ both divers &    │
                 │ provider         │
                 └────┬─────────────┘
                      │
        ┌─────────────┴────────────────┐
        │      All reviews received    │
        │                              │
        ▼                              ▼
  ┌────────────┐              ┌──────────────────┐
  │  REVIEWED  │              │   NO_SHOW or    │
  │            │              │   DISPUTE       │
  │ Completed  │              │                 │
  │ (final)    │              │ May result in:  │
  └────────────┘              │ • Refunds       │
                              │ • Chargebacks   │
                              │ • Bans          │
                              │ • Ratings       │
                              │   impact        │
                              └─────────────────┘
```

---

## 7. Cancellation & Refund Policy

### 7.1 Timeline-Based Policy

```
Cancellation Window         Provider Refund    Diver Refund    DIVE DROP Fee
┌───────────────────────────┬──────────────────┬──────────────┬──────────────┐
│ >7 days before dive       │ 100% refund      │ 100% refund  │ Keep 50% fee │
├───────────────────────────┼──────────────────┼──────────────┼──────────────┤
│ 3-7 days before dive      │ 75% refund       │ 75% refund   │ Keep 75% fee │
├───────────────────────────┼──────────────────┼──────────────┼──────────────┤
│ 24-72 hours before        │ 50% refund       │ 50% refund   │ Keep 90% fee │
├───────────────────────────┼──────────────────┼──────────────┼──────────────┤
│ <24 hours before          │ No refund        │ No refund    │ 100% fee     │
├───────────────────────────┼──────────────────┼──────────────┼──────────────┤
│ After dive no-show        │ 100% earnings    │ No refund    │ 100% fee     │
└───────────────────────────┴──────────────────┴──────────────┴──────────────┘
```

### 7.2 Refund Process

```
1. INITIATE REFUND
   ├─ Diver/Provider cancels booking
   ├─ System calculates refund based on timeline
   ├─ Booking status → "CANCELLED"
   └─ Notification sent to all parties

2. PROCESS REFUND
   ├─ Stripe initiates refund to original payment method
   ├─ DIVE DROP commission handling determined
   ├─ Provider earnings adjusted if applicable
   └─ Booking status → "REFUND_PROCESSING"

3. COMPLETE REFUND
   ├─ Payment gateway confirms refund (3-5 business days)
   ├─ Diver receives refund
   ├─ Provider sees loss (if applicable)
   ├─ Booking status → "REFUNDED"
   └─ All parties notified

4. DISPUTE HANDLING (if needed)
   ├─ If refund disputes arise
   ├─ Admin reviews booking details
   ├─ May escalate to payment provider
   └─ Manual adjustment if necessary
```

---

## 8. Notification System

### 8.1 Notification Events & Channels

```
EVENT                           TO              CHANNELS              TIMING
─────────────────────────────────────────────────────────────────────────────
Booking Created                 Provider        In-app, Email, SMS    Immediate
Booking Confirmed               Both Divers     In-app, Email         Immediate
Booking Declined                Both Divers     In-app, Email         Immediate
Payment Received                Provider        In-app, Email         Immediate
Payment Failed                  Diver           In-app, Email         Immediate
Dive Reminder                   Both Divers     In-app, SMS, Email    24h before
Dive Reminder                   Provider        In-app, SMS           24h before
Dive Completed                  Both Parties    In-app, Email         Immediate
Review Posted                   Recipient       In-app, Email         Immediate
Review Response Posted          Reviewer        In-app, Email         Immediate
Refund Processed                Diver           In-app, Email         Immediate
Payout Completed                Provider        In-app, Email         Weekly/Monthly
Message Received                Recipient       In-app, SMS           Immediate
Booking Cancelled               All Parties     In-app, Email         Immediate
```

### 8.2 Email Template Categories

- Booking confirmation emails
- Payment receipts and invoices
- Review request reminders
- Cancellation notices with refund details
- Payout summaries for providers
- Customer support escalations

---

## 9. Business Rules & Validation

### 9.1 Booking Rules

```
✓ Both divers must have matching profile
✓ Both divers must have minimum certification for service
✓ Provider must have availability on selected date/time
✓ Maximum group size respected (usually 2 divers + guide)
✓ Booking must be made at least 24 hours in advance
✓ Provider cancellation rate must be <5% to accept bookings
✓ Divers with poor ratings (<3.5 stars) require provider approval
✓ Divers with unresolved disputes cannot book
✓ No duplicate bookings (same divers, same provider, same time)
✓ Both divers must complete payment before confirmation
✓ No bookings during provider blackout dates
```

### 9.2 Payment Rules

```
✓ Payment must be completed within 24 hours of confirmation
✓ Minimum payment amount: $50
✓ Maximum payment amount: $10,000
✓ Currency support: USD, ILS, EUR, GBP
✓ Stripe commission: 2.9% + $0.30 per transaction
✓ Payment token must be valid and not expired
✓ No refunds for fraudulent payment disputes
✓ Chargebacks trigger 30-day account suspension
✓ Multiple failed payments (>3) trigger account review
✓ Recurring payment failures disable account
```

### 9.3 Review Rules

```
✓ Reviews can only be posted after booking completion
✓ Reviewers must be verified participants
✓ Reviews must include rating (1-5 stars)
✓ Comment min length: 10 characters
✓ Comment max length: 1000 characters
✓ No profanity, hate speech, or personal attacks
✓ Provider can respond within 30 days
✓ Reviews visible after both parties complete
✓ Reviews cannot be deleted, only edited within 30 days
✓ Flagged reviews reviewed by moderators
✓ Fake reviews result in account suspension
✓ Historical reviews preserved even after account deletion
```

### 9.4 Provider Rules

```
✓ Must complete verification before accepting bookings
✓ Must maintain response time <12 hours
✓ Must maintain cancellation rate <5%
✓ Must maintain rating >3.5 stars
✓ Must update availability weekly
✓ Must complete insurance verification
✓ Must comply with local dive regulations
✓ Must maintain valid PADI/IANTD certification
✓ Must provide pre-dive safety briefing
✓ Must conduct equipment checks
✓ Must maintain incident log
✓ Must follow DIVE DROP code of conduct
```

---

## 10. Component Requirements

### 10.1 Diver Components

```
src/app/[locale]/bookings/
├── page.tsx                          # Main bookings list page
├── new/
│   ├── page.tsx                      # Start new booking flow
│   ├── select-buddy/page.tsx         # Choose buddy or solo
│   ├── search-providers/page.tsx     # Provider search & filter
│   ├── booking-details/page.tsx      # Configure booking params
│   ├── review-booking/page.tsx       # Confirm & review
│   └── payment/page.tsx              # Payment page
├── [id]/
│   ├── page.tsx                      # Booking details view
│   ├── messages/page.tsx             # Messaging interface
│   ├── files/page.tsx                # Documents/waivers
│   ├── payment/page.tsx              # Payment status/retry
│   └── review/page.tsx               # Post-dive review form
└── components/
    ├── BookingCard.tsx               # Compact booking summary
    ├── BookingStatusBadge.tsx        # Status indicator
    ├── ProviderSearchResults.tsx     # Provider list view
    ├── ProviderDetailModal.tsx       # Provider profile modal
    ├── BookingTimeline.tsx           # Status flow visualization
    └── PaymentForm.tsx               # Payment input

src/components/
├── BookingFlow/
│   ├── BuddySelector.tsx             # Choose buddy for booking
│   ├── ParameterSelector.tsx         # Date/location/service picker
│   ├── ProviderCard.tsx              # Provider search result card
│   ├── BookingSummary.tsx            # Booking review card
│   └── BookingTimeline.tsx           # Status/step timeline
├── Review/
│   ├── ReviewForm.tsx                # Leave review form
│   ├── RatingStars.tsx               # Interactive star rating
│   ├── ReviewCard.tsx                # Display review
│   └── ReviewResponse.tsx            # Provider response view
├── Payment/
│   ├── PaymentForm.tsx               # Stripe payment form
│   ├── PaymentStatus.tsx             # Payment status display
│   └── PaymentHistory.tsx            # Transaction history
└── Messaging/
    ├── MessageThread.tsx             # Conversation view
    ├── MessageInput.tsx              # Message composer
    └── MessageList.tsx               # Messages list
```

### 10.2 Provider Components

```
src/app/[locale]/provider/
├── dashboard/
│   ├── page.tsx                      # Provider home/dashboard
│   ├── earnings/page.tsx             # Earnings summary
│   └── analytics/page.tsx            # Booking/review stats
├── bookings/
│   ├── page.tsx                      # Provider bookings list
│   ├── [id]/
│   │   ├── page.tsx                  # Booking request detail
│   │   ├── confirm/page.tsx          # Confirm booking action
│   │   ├── decline/page.tsx          # Decline with reason
│   │   └── messages/page.tsx         # Chat with divers
│   └── components/
│       ├── BookingRequestCard.tsx    # Pending request card
│       ├── BookingStatusBadge.tsx    # Status indicator
│       └── DeclineModal.tsx          # Decline reason modal
├── availability/
│   ├── page.tsx                      # Calendar availability
│   ├── calendar/page.tsx             # Full calendar view
│   └── components/
│       ├── CalendarView.tsx          # Month/week calendar
│       ├── TimeSlotPicker.tsx        # Select available hours
│       └── BlockDatesModal.tsx       # Block vacation/events
├── profile/
│   ├── page.tsx                      # Edit provider profile
│   ├── services/page.tsx             # Manage services
│   ├── reviews/page.tsx              # View all reviews
│   └── settings/page.tsx             # Business settings
├── payouts/
│   ├── page.tsx                      # Payout history
│   ├── [id]/page.tsx                 # Payout detail
│   └── bank-account/page.tsx         # Bank details
└── components/
    ├── EarningsChart.tsx             # Revenue visualization
    ├── BookingMetrics.tsx            # Performance stats
    ├── ReviewSummary.tsx             # Rating breakdown
    └── PayoutSchedule.tsx            # Payout timeline

src/components/Provider/
├── Dashboard/
│   ├── PendingRequestsWidget.tsx     # Pending bookings quick view
│   ├── EarningsWidget.tsx            # This week/month earnings
│   ├── RatingWidget.tsx              # Current rating display
│   └── UpcomingDivesWidget.tsx       # Upcoming scheduled dives
├── Bookings/
│   ├── BookingRequestCard.tsx        # Pending request card
│   ├── ConfirmModal.tsx              # Confirm booking modal
│   ├── DeclineModal.tsx              # Decline booking modal
│   └── BookingTimeline.tsx           # Request to completion flow
├── Calendar/
│   ├── AvailabilityCalendar.tsx      # Month view with slots
│   ├── DayDetailView.tsx             # Day with time slots
│   ├── TimeSlotEditor.tsx            # Edit time slots
│   └── BlockDatesForm.tsx            # Block vacation dates
└── Profile/
    ├── ServiceList.tsx               # Services management
    ├── ServiceForm.tsx               # Add/edit service
    ├── ReviewsList.tsx               # All reviews with filter
    └── RatingChart.tsx               # Visual rating breakdown
```

### 10.3 Shared Components

```
src/components/Booking/
├── BookingCard.tsx                   # Compact booking preview
├── BookingDetailView.tsx             # Full booking details
├── BookingStatusBadge.tsx            # Status visual indicator
├── BookingTimeline.tsx               # Step-by-step progress
└── CancellationModal.tsx             # Cancel booking form

src/components/Provider/
├── ProviderCard.tsx                  # Search result card
├── ProviderDetailModal.tsx           # Full provider info modal
├── ProviderHeader.tsx                # Provider info header
├── RatingDisplay.tsx                 # Star rating with count
└── AvailabilityWidget.tsx            # Calendar availability preview

src/components/Messages/
├── MessageThread.tsx                 # Conversation view
├── MessageInput.tsx                  # Message composer
├── MessageList.tsx                   # Messages list
└── UnreadBadge.tsx                   # Unread count

src/components/Payment/
├── PaymentForm.tsx                   # Stripe checkout form
├── PaymentStatus.tsx                 # Success/failure display
├── PaymentDetails.tsx                # Amount breakdown
└── RefundStatus.tsx                  # Refund tracking

src/components/Review/
├── ReviewForm.tsx                    # Post review form
├── ReviewCard.tsx                    # Display review
├── RatingStars.tsx                   # Interactive stars
├── ReviewResponse.tsx                # Provider response
└── ReviewsList.tsx                   # All reviews list
```

---

## 11. Implementation Roadmap

### Phase 1: Core Booking (Weeks 1-4)
- Database schema and migrations
- Booking creation API endpoints
- Booking list and detail views
- Provider search and filtering
- Diver UI for browsing providers

### Phase 2: Provider Management (Weeks 5-6)
- Provider registration and verification
- Service management
- Availability calendar system
- Provider dashboard
- Booking request acceptance/decline

### Phase 3: Payments (Weeks 7-8)
- Stripe integration
- Payment processing
- Payout system for providers
- Refund handling
- Payment status tracking

### Phase 4: Reviews & Ratings (Weeks 9-10)
- Post-dive review system
- Rating calculations and display
- Provider response capability
- Review moderation
- Reputation system

### Phase 5: Messaging & Notifications (Weeks 11-12)
- Real-time messaging
- Email notifications
- SMS alerts
- Push notifications
- Notification preferences

### Phase 6: Advanced Features (Weeks 13+)
- Dispute resolution
- Advanced analytics
- Marketing tools
- Compliance reporting
- Multi-language support

---

## 12. Technical Specifications

### 12.1 Technology Stack

```
Frontend:
├─ Next.js 16.2.9
├─ React 19.2.4
├─ TailwindCSS 4
├─ Zustand (state management)
├─ TypeScript 5

Backend:
├─ Next.js API routes
├─ Supabase (PostgreSQL)
├─ Stripe for payments
├─ SendGrid/Twilio for notifications

Infrastructure:
├─ Vercel for hosting
├─ Supabase for database
├─ Stripe for payments
├─ AWS S3 for file storage
```

### 12.2 Database Indexing Strategy

```
Primary Indexes (Performance-critical):
├─ bookings(status, created_at DESC)
├─ bookings(provider_id, booking_date)
├─ bookings(diver_1_id, diver_2_id)
├─ service_providers(rating_average DESC)
├─ provider_availability(provider_id, availability_date)
├─ booking_payments(booking_id, payment_status)
├─ provider_reviews(provider_id, created_at DESC)

Secondary Indexes (Filtering/Sorting):
├─ services(provider_id, is_active)
├─ booking_messages(booking_id, created_at DESC)
├─ booking_status_history(booking_id, created_at DESC)
├─ provider_payouts(provider_id, created_at DESC)

Geospatial Index:
├─ service_providers USING GIST(primary_location)
```

### 12.3 API Rate Limiting

```
Anonymous Users:
├─ 100 requests/hour
├─ 10 requests/minute

Authenticated Users:
├─ 1000 requests/hour
├─ 100 requests/minute

Providers:
├─ 2000 requests/hour (higher for management)
├─ 200 requests/minute

Admin:
├─ Unlimited
```

---

## 13. Security Considerations

### 13.1 Data Protection

```
✓ All sensitive data encrypted at rest (AES-256)
✓ TLS 1.3 for all data in transit
✓ PCI-DSS compliance for payment data
✓ No credit card storage (Stripe tokenization)
✓ PII encryption in database
✓ Regular security audits
✓ Penetration testing quarterly
```

### 13.2 Access Control

```
Row-Level Security (RLS):
├─ Users see only their own bookings
├─ Providers see their own requests
├─ Admins see all data
├─ Messages only visible to participants
├─ Reviews visible to relevant parties

Role-Based Access Control:
├─ Diver: Can create, view, manage own bookings
├─ Provider: Can manage bookings, services, earnings
├─ Admin: Full system access
├─ Moderator: Can review reports, manage disputes
```

### 13.3 Fraud Prevention

```
✓ Payment fraud detection via Stripe Radar
✓ Duplicate booking prevention
✓ Unusual activity monitoring
✓ Account verification requirements
✓ Manual review for high-value bookings
✓ Dispute handling process
✓ Chargeback monitoring
```

---

## 14. Compliance & Legal

### 14.1 Regulations

```
✓ GDPR compliance (EU users)
✓ CCPA compliance (California)
✓ Payment Card Industry Data Security Standard (PCI-DSS)
✓ Local diving safety regulations
✓ Insurance requirements
✓ Tax reporting (1099 for providers)
✓ Terms of Service enforcement
```

### 14.2 Documentation Required

```
Diver:
├─ Profile verification (email)
├─ Medical questionnaire
├─ Dive waiver signature
├─ Certification verification
└─ Emergency contact

Provider:
├─ Business registration
├─ Insurance certificate
├─ PADI/IANTD certification
├─ Background check
├─ Bank account verification
└─ Tax identification
```

---

## 15. Monitoring & Analytics

### 15.1 Key Metrics

```
Booking Metrics:
├─ Total bookings per day/week/month
├─ Booking completion rate
├─ Cancellation rate
├─ Average booking value
├─ Peak booking times
├─ Geographic distribution

Provider Metrics:
├─ Response time (avg hours)
├─ Acceptance rate
├─ Cancellation rate
├─ Average rating
├─ Revenue per week/month
├─ Booking frequency

Payment Metrics:
├─ Success rate
├─ Average transaction time
├─ Refund rate
├─ Chargeback rate
├─ Revenue by payment method

User Metrics:
├─ User acquisition
├─ Retention rate
├─ Active users (daily/monthly)
├─ Repeat bookers
├─ User lifetime value
```

### 15.2 Dashboards

```
Admin Dashboard:
├─ System health (API/DB uptime)
├─ Booking volume trends
├─ Revenue summary
├─ Provider performance
├─ Payment health
├─ Dispute trends
├─ User growth

Provider Dashboard:
├─ This month's earnings
├─ Upcoming bookings
├─ Current rating
├─ Recent reviews
├─ Response time
├─ Cancellation rate
```

---

## 16. Future Enhancements

```
Phase 7+: Advanced Features
├─ Group booking for >2 divers
├─ Multi-day dive trips
├─ Equipment rental marketplace
├─ Dive certification tracking
├─ Training course marketplace
├─ Live GPS tracking for dives
├─ Emergency incident reporting
├─ Insurance integration
├─ Sponsorship programs
├─ Affiliate marketing
├─ Mobile app (native iOS/Android)
├─ Video reviews
├─ Blockchain verification
└─ AI-powered matching recommendations
```

---

## Summary

This booking system design provides:

1. **Complete user flows** for both divers and providers
2. **Comprehensive database schema** with proper relationships and indexing
3. **TypeScript definitions** for type safety
4. **Detailed API specifications** with request/response formats
5. **UI/UX wireframes** for all critical screens
6. **State machine** for booking lifecycle
7. **Business rules** and validation logic
8. **Payment and payout** infrastructure
9. **Notification system** across multiple channels
10. **Component architecture** for React implementation
11. **Implementation roadmap** with prioritized phases
12. **Security** and compliance considerations
13. **Monitoring** and analytics setup

The system is designed to be:
- **Scalable**: Handles growth from 100 to 100,000+ bookings
- **Reliable**: Idempotent operations, robust error handling
- **Secure**: PCI-DSS compliant, encrypted data, RLS
- **User-friendly**: Clear flows, real-time feedback
- **Provider-friendly**: Easy management, quick payouts

