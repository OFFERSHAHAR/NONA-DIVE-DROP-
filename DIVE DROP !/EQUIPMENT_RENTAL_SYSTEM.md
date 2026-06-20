# Equipment Rental System - DIVE DROP

Complete marketplace system for renting dive equipment (fins, wetsuits, tanks, etc.) between users with integrated Bit payment processing.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Payment Flow](#payment-flow)
6. [Components](#components)
7. [Configuration](#configuration)
8. [Deployment](#deployment)

---

## Overview

The Equipment Rental System is a peer-to-peer marketplace that allows divers to:

- **List equipment** they want to rent out
- **Browse available equipment** by type, condition, and location
- **Request rentals** with flexible dates
- **Process payments** via Bit (Israeli payment system)
- **Track active rentals** and manage returns
- **Report damage** and handle disputes
- **Review equipment** and owners

### Key Features

- **Flexible Pricing**: Per-day rates with optional weekly discounts
- **Geographic Search**: Find equipment near you
- **Damage Assessment**: Post-rental damage tracking with photo evidence
- **Commission System**: DIVE DROP takes 15% commission from rental fees
- **Payment Integration**: Seamless Bit payment processing
- **Review System**: Ratings and feedback for equipment and owners
- **Messaging**: In-app chat between renters and listers
- **Insurance Support**: Claims process for damaged equipment

---

## Architecture

### Technology Stack

- **Framework**: Next.js 16 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Payment**: Bit API integration
- **Validation**: Zod schemas
- **Styling**: Tailwind CSS
- **State**: React hooks + Context

### File Structure

```
src/
├── types/
│   └── equipment.ts              # TypeScript types & interfaces
├── lib/
│   └── equipment/
│       ├── schemas.ts             # Zod validation schemas
│       ├── equipment-client.ts     # Database operations
│       └── equipment-service.ts    # Business logic (optional)
├── components/equipment/
│   ├── EquipmentCard.tsx           # Equipment listing display
│   ├── EquipmentListingForm.tsx     # Create/edit listing form
│   ├── RentalRequestModal.tsx       # Request rental modal
│   └── MyEquipmentDashboard.tsx     # Lister dashboard
├── app/api/equipment/
│   ├── listings/route.ts           # Browse & create listings
│   ├── listings/mine/route.ts       # My listings
│   ├── rentals/route.ts            # My rentals & requests
│   ├── rentals/[id]/route.ts        # Rental actions
│   ├── rentals/payment/route.ts     # Payment processing
│   └── reviews/route.ts            # Equipment reviews
└── supabase/
    └── migrations/
        └── 001_equipment_rental_system.sql  # Database schema
```

---

## Database Schema

### Tables

#### `equipment_listings`
Equipment available for rent, posted by owners.

```sql
- id (UUID)
- owner_id (UUID) → auth.users
- equipment_type (VARCHAR) -- fins, wetsuit, tank, etc.
- brand, model (VARCHAR)
- description (TEXT)
- size, condition (VARCHAR)
- available_from, available_until (TIMESTAMPTZ)
- location (JSONB) -- {lat, lng}
- location_name (VARCHAR)
- rental_price_per_day (INTEGER) -- cents
- min/max_rental_days (INTEGER)
- discount_per_week (NUMERIC)
- delivery_fee (INTEGER)
- photo_urls (TEXT[])
- is_active (BOOLEAN)
- total_rentals, review_count (INTEGER)
- rating_average (NUMERIC)
- created_at, updated_at
```

#### `equipment_rentals`
Rental requests and active rentals.

```sql
- id (UUID)
- lister_id, renter_id (UUID)
- listing_id (UUID)
- rental_start, rental_end (TIMESTAMPTZ)
- rental_days (INTEGER)
- daily_rate, rental_cost, commission_amount (INTEGER)
- renter_total, lister_payout (INTEGER)
- delivery_method (VARCHAR) -- pickup, delivery, shipped
- status (VARCHAR) -- pending, approved, active, returned, etc.
- damage_level, damage_cost (VARCHAR/INTEGER)
- payment_request_id, transaction_id (VARCHAR)
- created_at, updated_at
```

#### `equipment_reviews`
Reviews posted after rental completion.

```sql
- id (UUID)
- listing_id, rental_id, reviewer_id (UUID)
- rating (SMALLINT) -- 1-5
- condition_rating, communication_rating (SMALLINT)
- comment (TEXT)
- tags (TEXT[])
```

#### `equipment_messages`
In-app chat between renters and listers.

```sql
- id (UUID)
- rental_id (UUID)
- sender_id (UUID)
- sender_role (VARCHAR) -- lister, renter
- message_type (VARCHAR) -- text, image, status_update
- content (TEXT)
- image_url (VARCHAR)
- is_read (BOOLEAN)
```

#### `equipment_disputes`
Dispute records between parties.

```sql
- id (UUID)
- rental_id (UUID)
- initiated_by (VARCHAR)
- dispute_type (VARCHAR) -- damage, non_return, other
- description (TEXT)
- evidence (TEXT[])
- status (VARCHAR) -- open, in_review, resolved
```

#### `equipment_insurance_claims`
Insurance claims for damaged equipment.

```sql
- id (UUID)
- rental_id (UUID)
- claim_type (VARCHAR) -- damage, loss, theft
- claim_status (VARCHAR)
- damage_description (TEXT)
- damage_photos (TEXT[])
- damage_cost_estimate, claim_amount (INTEGER)
- insurance_provider (VARCHAR)
```

---

## API Endpoints

### Listings

#### GET `/api/equipment/listings`
Browse all active equipment listings.

```bash
curl "http://localhost:3000/api/equipment/listings?equipment_type=fins&condition=excellent&price_max=10000&page=1&limit=20&sort_by=newest"
```

**Query Parameters:**
- `equipment_type` - Filter by type (optional)
- `condition` - Filter by condition (optional)
- `location_lat`, `location_lng` - Search center (optional)
- `max_distance_km` - Search radius (default: 50)
- `price_min`, `price_max` - Price range in cents (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `sort_by` - `newest|price_low|price_high|rating|distance`

**Response:**
```json
{
  "success": true,
  "data": [/* EquipmentListing[] */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

#### POST `/api/equipment/listings`
Create a new equipment listing (requires auth).

```bash
curl -X POST "http://localhost:3000/api/equipment/listings" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_type": "fins",
    "brand": "Mares",
    "description": "High-quality diving fins in excellent condition",
    "condition": "excellent",
    "available_from": "2026-06-20T10:00:00Z",
    "available_until": "2026-08-20T10:00:00Z",
    "location_name": "Tel Aviv, Israel",
    "location_lat": 32.087,
    "location_lng": 34.767,
    "rental_price_per_day": 5000,
    "min_rental_days": 1,
    "max_rental_days": 30,
    "discount_per_week": 10,
    "photo_urls": ["https://example.com/fins1.jpg"]
  }'
```

#### GET `/api/equipment/listings/mine`
Get my equipment listings (requires auth).

**Query Parameters:**
- `status` - `active|inactive|all` (default: all)
- `page`, `limit`, `sort_by`

---

### Rentals

#### POST `/api/equipment/rentals`
Request a rental (requires auth).

```bash
curl -X POST "http://localhost:3000/api/equipment/rentals" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": "550e8400-e29b-41d4-a716-446655440000",
    "rental_start": "2026-06-21T10:00:00Z",
    "rental_end": "2026-06-28T10:00:00Z",
    "delivery_method": "delivery",
    "delivery_address": "123 Rothschild St, Tel Aviv",
    "renter_contact": "renter@example.com"
  }'
```

#### GET `/api/equipment/rentals`
Get my rentals (requires auth).

**Query Parameters:**
- `status` - `pending|active|returned|completed|all`
- `page`, `limit`, `sort_by`

#### GET `/api/equipment/rentals/[id]`
Get rental details.

#### POST `/api/equipment/rentals/[id]?action=approve`
Approve rental request (lister only).

#### POST `/api/equipment/rentals/[id]?action=reject`
Reject rental request (lister only).

```json
{
  "reason": "Equipment not available on those dates"
}
```

#### POST `/api/equipment/rentals/[id]?action=return`
Return equipment (renter only).

```json
{
  "damage_level": "minor",
  "damage_description": "Small scratch on the left fin",
  "damage_photos": ["https://example.com/damage1.jpg"],
  "damage_cost": 50000
}
```

#### POST `/api/equipment/rentals/[id]?action=complete`
Complete rental after damage assessment (lister only).

---

### Payments

#### POST `/api/equipment/rentals/payment`
Create Bit payment request (requires auth).

```bash
curl -X POST "http://localhost:3000/api/equipment/rentals/payment" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rental_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rental_id": "550e8400-e29b-41d4-a716-446655440000",
    "payment_request_id": "req_12345",
    "amount_cents": 35000,
    "payment_link": "https://bit.org.il/pay/...",
    "qr_code": "data:image/png;base64,...",
    "expires_at": "2026-06-20T10:15:00Z"
  }
}
```

#### GET `/api/equipment/rentals/payment?request_id=...`
Verify payment status.

---

### Reviews

#### POST `/api/equipment/reviews`
Create equipment review (requires completed rental).

```bash
curl -X POST "http://localhost:3000/api/equipment/reviews" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rental_id": "550e8400-e29b-41d4-a716-446655440000",
    "listing_id": "550e8400-e29b-41d4-a716-446655440001",
    "rating": 5,
    "condition_rating": 5,
    "communication_rating": 4,
    "comment": "Great equipment, fast delivery!",
    "tags": ["clean", "durable", "quick_delivery"]
  }'
```

#### GET `/api/equipment/reviews?listing_id=...`
Get reviews for a listing.

---

## Payment Flow

### 1. Request Rental
```
Renter → POST /api/equipment/rentals
         Create rental request (status: pending)
         ↓
Lister ← Notification of new request
```

### 2. Lister Approves
```
Lister → POST /api/equipment/rentals/[id]?action=approve
         Update status to "approved"
         ↓
Renter ← Notification that rental was approved
```

### 3. Renter Pays
```
Renter → POST /api/equipment/rentals/payment
         Creates Bit payment request
         ↓
         Receives payment link & QR code
         ↓
         Scans QR or clicks link
         ↓
         Pays via Bit (₪ renter_total)
         ↓
         Webhook confirms payment
         ↓
         Rental status: "active"
         ↓
Lister ← Notification that payment received
```

### 4. Equipment Transfer
```
Renter → Picks up / receives equipment
Lister → Confirms delivery
```

### 5. Return & Damage Assessment
```
Renter → POST /api/equipment/rentals/[id]?action=return
         Reports any damage
         Uploads damage photos
         ↓
         Rental status: "damage_pending"
         ↓
Lister ← Notification of return
         ↓
Lister → Reviews damage
         POST /api/equipment/rentals/[id]?action=complete
         ↓
Renter ← Can now review equipment
```

### 6. Commission Settlement
```
Bit Webhook → Updates payout status
              ↓
Lister → Receives payout after commission:
         lister_payout = rental_cost - (rental_cost * 0.15)
         ↓
         Funds go to linked bank account (T+1)
```

---

## Components

### `<EquipmentCard />`
Displays a single equipment listing card.

```tsx
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import type { EquipmentListing } from '@/types/equipment';

export function EquipmentGrid({ listings }: { listings: EquipmentListing[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <EquipmentCard
          key={listing.id}
          listing={listing}
          onRent={(id) => handleRentClick(id)}
          distance={5.2}
        />
      ))}
    </div>
  );
}
```

### `<EquipmentListingForm />`
Form to create/edit equipment listings.

```tsx
import { EquipmentListingForm } from '@/components/equipment/EquipmentListingForm';
import type { CreateEquipmentListingRequest } from '@/types/equipment';

export function CreateListingPage() {
  const handleSubmit = async (data: CreateEquipmentListingRequest) => {
    const response = await fetch('/api/equipment/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to create listing');
    const result = await response.json();
    return result.data;
  };

  return <EquipmentListingForm onSubmit={handleSubmit} />;
}
```

### `<RentalRequestModal />`
Modal to request a rental (to be created).

```tsx
// Coming soon - implement similar to booking request flow
```

### `<MyEquipmentDashboard />`
Dashboard for equipment owners (to be created).

```tsx
// Features:
// - View all listings with rental stats
// - Pending rental requests
// - Active rentals
// - Earnings & payouts
// - Reviews & ratings
```

---

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Bit Payment API
BIT_API_URL=https://api.bit.org.il/v1
BIT_API_KEY=your_bit_api_key
BIT_API_SECRET=your_bit_api_secret
BIT_MERCHANT_ID=your_merchant_id
BIT_BUSINESS_ID=your_business_id
BIT_BUSINESS_NAME=DIVE DROP

# Logging (optional)
BIT_LOG_API_CALLS=true
BIT_LOG_WEBHOOKS=true
```

### Commission Settings

Edit in `src/lib/payments/bit.config.ts`:

```typescript
commission: {
  rate: 0.15,        // 15% default
  minCommission: 50, // ₪0.50 minimum
  tiers: [
    // Tiered commissions based on amount
  ]
}
```

---

## Deployment

### 1. Database Migration

```bash
# Apply migration to Supabase
supabase db push

# Or manually run SQL in Supabase dashboard
```

### 2. Environment Variables

Set environment variables in your hosting platform:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
BIT_API_KEY=...
BIT_API_SECRET=...
BIT_MERCHANT_ID=...
```

### 3. Webhook Configuration

Configure Bit webhook URL in Bit dashboard:

```
https://yourdomain.com/api/webhooks/bit/payment
```

### 4. Build & Deploy

```bash
npm run build
npm start
```

---

## Testing

### Create Test Listing

```bash
curl -X POST "http://localhost:3000/api/equipment/listings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_type": "fins",
    "brand": "TestBrand",
    "description": "Test equipment for development",
    "condition": "excellent",
    "available_from": "2026-06-20T00:00:00Z",
    "available_until": "2026-12-31T23:59:59Z",
    "location_name": "Test Location",
    "location_lat": 32.087,
    "location_lng": 34.767,
    "rental_price_per_day": 5000,
    "photo_urls": ["https://via.placeholder.com/300"]
  }'
```

### Search Listings

```bash
curl "http://localhost:3000/api/equipment/listings?equipment_type=fins&condition=excellent&price_max=10000"
```

---

## Support & Documentation

- **Bit API Docs**: https://www.bit.org.il/
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Status**: 🚀 Ready for deployment

**Last Updated**: June 20, 2026
