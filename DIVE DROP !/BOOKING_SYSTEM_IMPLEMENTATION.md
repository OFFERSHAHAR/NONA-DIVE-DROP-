# DiveDrop Booking System - Complete Implementation Guide

## Overview
This document describes the complete booking system implementation for DiveDrop, including database schema, API routes, state management, and UI components.

## System Architecture

### State Machine (Zustand Store)
The booking system uses a state machine approach with the following workflow:

```
draft
  ↓
selecting_date
  ↓
selecting_location
  ↓
selecting_provider
  ↓
payment
  ↓
confirmed → completed → (review)
```

### Booking Status Flow
```
draft (initial state)
  ↓
pending_confirmation (awaiting provider confirmation)
  ↓
confirmed (provider accepted)
  ↓
completed (dive finished)
  ↓
(review submitted)

Alternative paths:
- rejected (provider rejected)
- cancelled (user cancelled)
```

## Database Schema

### Tables

#### `bookings`
Primary table for booking records.

**Columns:**
- `id` (UUID): Primary key
- `user_id` (UUID): Diver creating the booking
- `buddy_user_id` (UUID): Buddy diver
- `dive_date` (TIMESTAMP): When the dive is scheduled
- `dive_site_id` (UUID): Reference to dive site
- `custom_location` (TEXT): Custom location if not using predefined site
- `service_provider_id` (UUID): Optional service provider
- `max_depth` (INTEGER): Maximum dive depth in meters
- `water_temp` (DECIMAL): Water temperature in Celsius
- `equipment_needed` (TEXT[]): Array of needed equipment
- `special_requirements` (TEXT): Any special requirements
- `number_of_divers` (INTEGER): Number of participants
- `estimated_duration` (INTEGER): Duration in minutes
- `status` (VARCHAR): Current status
- `notes` (TEXT): Booking notes
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `confirmed_at` (TIMESTAMP): When confirmed
- `completed_at` (TIMESTAMP): When completed
- `cancelled_at` (TIMESTAMP): When cancelled
- `cancellation_reason` (TEXT): Reason for cancellation

**Indexes:**
- `idx_bookings_user_id`: For querying user's bookings
- `idx_bookings_buddy_user_id`: For finding buddy's bookings
- `idx_bookings_service_provider_id`: For provider queries
- `idx_bookings_status`: For filtering by status
- `idx_bookings_dive_date`: For date-based queries
- `idx_bookings_created_at`: For sorting

#### `booking_items`
Individual diver records within a booking (one per participant).

**Columns:**
- `id` (UUID): Primary key
- `booking_id` (UUID): Foreign key to bookings
- `diver_user_id` (UUID): Foreign key to users
- `status` (VARCHAR): 'pending', 'confirmed', 'completed', 'cancelled'
- `actual_depth` (DECIMAL): Actual depth achieved
- `notes` (TEXT): Notes about this diver's participation
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

#### `booking_status_history`
Audit trail of status changes.

**Columns:**
- `id` (UUID): Primary key
- `booking_id` (UUID): Foreign key to bookings
- `old_status` (VARCHAR): Previous status
- `new_status` (VARCHAR): New status
- `changed_by` (UUID): User who made the change
- `notes` (TEXT): Notes about the change
- `created_at` (TIMESTAMP): When the change occurred

#### `booking_messages`
Messages between booking participants and providers.

**Columns:**
- `id` (UUID): Primary key
- `booking_id` (UUID): Foreign key to bookings
- `sender_user_id` (UUID): Who sent the message
- `message` (TEXT): Message content
- `is_provider_message` (BOOLEAN): Whether from provider
- `created_at` (TIMESTAMP): Creation timestamp

#### `booking_reviews`
Post-dive reviews and ratings.

**Columns:**
- `id` (UUID): Primary key
- `booking_id` (UUID): Foreign key to bookings
- `reviewer_user_id` (UUID): Who wrote the review
- `reviewed_user_id` (UUID): Who is being reviewed
- `rating` (INTEGER): 1-5 stars
- `review_text` (TEXT): Review content
- `would_recommend` (BOOLEAN): Would recommend this person
- `review_type` (VARCHAR): 'diver_to_diver' or 'provider_review'
- `created_at` (TIMESTAMP): When written
- `updated_at` (TIMESTAMP): When updated
- `UNIQUE(booking_id, reviewer_user_id, reviewed_user_id)`: Prevent duplicate reviews

#### `booking_payments`
Payment records for bookings.

**Columns:**
- `id` (UUID): Primary key
- `booking_id` (UUID): Foreign key to bookings
- `user_id` (UUID): Who made the payment
- `amount` (DECIMAL): Payment amount
- `currency` (VARCHAR): Currency code (default: ILS)
- `payment_method` (VARCHAR): 'credit_card', 'paypal', 'bank_transfer'
- `payment_status` (VARCHAR): 'pending', 'completed', 'failed', 'refunded'
- `transaction_id` (VARCHAR): External transaction ID
- `notes` (TEXT): Payment notes
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

### Row Level Security (RLS)

**Bookings:**
- SELECT: Users can see their own bookings or bookings they're part of
- INSERT: Only the initiating user can create
- UPDATE: Only the initiating user can update their own bookings

**Booking Messages:**
- SELECT: Only booking participants can see
- INSERT: Only authenticated users can send messages to their bookings

**Booking Reviews:**
- SELECT: Only booking participants can see reviews
- INSERT: Only booking participants can submit reviews

**Booking Payments:**
- SELECT: Users can see only their own payments
- INSERT: Users can create payments for their bookings

## API Endpoints

### Core Booking Endpoints

#### `GET /api/bookings`
List user's bookings with filtering.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `status` (enum: all, draft, pending_confirmation, confirmed, completed, cancelled, rejected)
- `date_from` (ISO datetime)
- `date_to` (ISO datetime)
- `dive_site_id` (UUID)
- `sort_by` (enum: date, status, created)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": "2026-06-20T12:00:00Z"
}
```

#### `POST /api/bookings`
Create a new booking.

**Request Body:**
```json
{
  "buddy_user_id": "uuid",
  "dive_date": "2026-07-01T10:00:00Z",
  "dive_site_id": "uuid",
  "custom_location": null,
  "service_provider_id": "uuid",
  "max_depth": 30,
  "water_temp": 20,
  "equipment_needed": ["tank", "weights"],
  "special_requirements": "Need left-handed regulator",
  "number_of_divers": 2,
  "estimated_duration": 60
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-06-20T12:00:00Z"
}
```

#### `GET /api/bookings/:id`
Get detailed booking information.

**Response includes:**
- Booking details
- User and buddy information
- Messages
- Reviews
- Status history

#### `PATCH /api/bookings/:id`
Update booking (only for draft bookings).

**Request Body:**
```json
{
  "dive_date": "2026-07-01T10:00:00Z",
  "max_depth": 35
  // ... other fields
}
```

#### `DELETE /api/bookings/:id`
Cancel a booking.

**Request Body:**
```json
{
  "reason": "Found another buddy"
}
```

**Constraints:**
- Cannot cancel within 24 hours of dive date
- Cannot cancel already completed bookings

#### `POST /api/bookings/:id/confirm`
Provider confirms or rejects a booking.

**Request Body:**
```json
{
  "confirm": true,
  "notes": "Looking forward to diving with you!"
}
```

**Requires:** Service provider authentication

#### `POST /api/bookings/:id/complete`
Mark booking as completed after dive.

**Request Body:**
```json
{
  "actual_duration": 55,
  "depth_achieved": 28,
  "location": "Eilat North Reef",
  "notes": "Great dive!"
}
```

#### `POST /api/bookings/:id/reviews`
Submit a review for a booking participant.

**Request Body:**
```json
{
  "rating": 5,
  "review_text": "Amazing diver, very experienced and safety-conscious",
  "would_recommend": true
}
```

#### `GET /api/bookings/:id/reviews`
Get all reviews for a booking.

#### `GET /api/bookings/:id/messages`
Get all messages in a booking conversation.

#### `POST /api/bookings/:id/messages`
Send a message to booking participants.

**Request Body:**
```json
{
  "message": "Looking forward to the dive!"
}
```

### Admin Endpoints

#### `GET /api/admin/bookings`
Admin: List all bookings with advanced filtering.

**Query Parameters:**
- All from `GET /api/bookings` plus:
- `user_id` (UUID): Filter by user
- `provider_id` (UUID): Filter by provider
- `search` (string): Search in booking details

**Requires:** Admin authentication

## State Management (Zustand)

### `useBookingStore`

**State:**
```typescript
{
  draft: BookingDraft;              // Current booking being created
  currentStep: BookingStep;         // Wizard step
  isLoading: boolean;               // Loading state
  error: string | null;             // Error message
}
```

**Actions:**
- `setDraft(updates)`: Update draft booking
- `resetDraft()`: Clear draft
- `nextStep()`: Move to next step (with validation)
- `previousStep()`: Move to previous step
- `goToStep(step)`: Jump to specific step
- `setLoading(loading)`: Set loading state
- `setError(error)`: Set error message
- `canProceed()`: Check if current step is valid
- `getProgress()`: Get wizard completion percentage

## Components

### Booking Wizard
**Location:** `/src/components/bookings/BookingWizard.tsx`

Main wizard component that orchestrates the booking flow:
- Progress bar
- Step indicators
- Dynamic step content
- Navigation buttons

### Wizard Steps
1. **BuddySelection** (`BuddySelection.tsx`)
   - Select buddy diver
   - Shows buddy list with ratings

2. **DateLocationSelection** (`DateLocationSelection.tsx`)
   - Pick dive date and time
   - Enter dive parameters (depth, temp, duration)
   - Select or input location

3. **ProviderSelection** (`ProviderSelection.tsx`)
   - Optional service provider selection
   - Shows certifications and ratings

4. **PaymentStep** (`PaymentStep.tsx`)
   - Set number of divers
   - Review pricing
   - Select payment method

5. **ConfirmationStep** (`ConfirmationStep.tsx`)
   - Show booking confirmation
   - Next steps information
   - Links to view bookings or start new booking

### BookingCard
**Location:** `/src/components/bookings/BookingCard.tsx`

Card component for displaying booking summary:
- Status badge
- Buddy info
- Dive parameters
- Quick view link

### StatusTracker
**Location:** `/src/components/bookings/StatusTracker.tsx`

Visual timeline showing booking status progression:
- Current status
- Historical status changes
- Status timeline

### ReviewForm
**Location:** `/src/components/bookings/ReviewForm.tsx`

Form for submitting reviews:
- Star rating
- Review text
- Would recommend toggle

## Pages

### `/bookings/new`
Wizard page for creating new bookings.

### `/bookings/my-bookings`
List all user's bookings with filters.

### `/bookings/:id`
Detailed view of a single booking:
- Full booking details
- Message center
- Status tracker
- Review form (if eligible)

### `/admin/bookings`
Admin dashboard for viewing all bookings.

## Utility Functions

### State Machine
- `canTransition(from, to)`: Validate status transitions
- `getStatusLabel(status, locale)`: Localized status labels
- `getStatusColor(status)`: CSS classes for status colors

### Dive Safety
- `validateDiveParameters(depth, duration, temp)`: Safety validation
- `canBuddyUp(level1, level2)`: Check buddy compatibility
- `canCancelBooking(status, date)`: Check cancellation eligibility

### Pricing
- `calculateBookingCost(divers, duration, equipment)`: Base cost
- `calculateTotalCost(base)`: With fees and taxes

### Formatting
- `formatBookingDate(date, locale)`: Localized date formatting
- `formatDepth(depth, locale)`: Depth with unit
- `formatTemperature(temp, locale)`: Temperature with unit

## Internationalization

All components support RTL (Hebrew) and LTR (English):
- Flex direction flips for RTL
- Text alignment adjusts
- Date formatting respects locale
- Status labels are translated

## Rate Limiting

API endpoints have rate limiting configured:
- Bookings: 30 requests/minute
- Payment: 10 requests/minute
- Confirmation: 20 requests/minute

## Error Handling

Standard error responses:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  },
  "timestamp": "2026-06-20T12:00:00Z"
}
```

## Installation Instructions

1. **Run Database Migration:**
```sql
-- Execute migrations.sql in Supabase
\i src/lib/bookings/migrations.sql
```

2. **Create Translation Files:**
Add to your i18n translation files:
```json
{
  "bookings": {
    "createNewBooking": "Create New Booking",
    "myBookings": "My Bookings",
    // ... other translations
  }
}
```

3. **Install Components:**
All files are already in place at:
- `/src/lib/bookings/` - Schemas, middleware, utilities
- `/src/store/bookingStore.ts` - State management
- `/src/components/bookings/` - UI components
- `/src/app/api/bookings/` - API routes
- `/src/app/[locale]/bookings/` - Pages

## Testing Checklist

- [ ] Create new booking through wizard
- [ ] Update draft booking
- [ ] View my bookings list
- [ ] Filter bookings by status
- [ ] Cancel booking (outside 24-hour window)
- [ ] Provider confirms booking
- [ ] Mark booking as completed
- [ ] Submit review
- [ ] View booking details
- [ ] Send and receive messages
- [ ] Admin view all bookings
- [ ] RTL/LTR display correct
- [ ] Rate limiting works
- [ ] Error handling works

## Next Steps

1. **Real-time Updates:** Set up Supabase Real-time for live message updates
2. **Notifications:** Implement SMS/email notifications for status changes
3. **Payment Processing:** Integrate payment gateway (Stripe, etc.)
4. **Provider Matching:** Build smart provider recommendation algorithm
5. **Analytics:** Track booking metrics and user behavior
6. **Mobile Optimization:** Further optimize for mobile devices

## Support

For questions or issues, refer to:
- Booking utils: `/src/lib/bookings/utils.ts`
- Schemas: `/src/lib/bookings/schemas.ts`
- Middleware: `/src/lib/bookings/middleware.ts`
