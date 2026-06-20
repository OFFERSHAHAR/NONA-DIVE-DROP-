# DIVE DROP Service Provider Directory

## Overview

A comprehensive marketplace for dive services (instructors, shops, guides, equipment rental, boat operators, photographers). Users can search, filter, book, and review service providers.

## What's Included

### 1. Complete Design Specification
**File**: `SERVICE_PROVIDER_DIRECTORY.md`

Comprehensive 2000+ line document covering:
- Database schema (7 tables with relationships)
- TypeScript types (40+ interfaces)
- Frontend component architecture
- API route specifications
- RLS security policies
- Moderation workflows
- Wireframes and user flows
- Success metrics
- Future enhancements

### 2. Database Migration
**File**: `supabase/migrations/20260620_create_service_provider_directory.sql`

Production-ready SQL with:
- 7 normalized tables
- 35+ indexes for performance
- Row-level security policies
- Triggers for auto-calculations
- Comprehensive constraints
- Audit logging

**Tables:**
- `service_providers` (profiles)
- `provider_services` (offerings)
- `provider_reviews` (ratings)
- `provider_gallery` (photos/videos)
- `provider_availability` (calendar)
- `provider_bookings` (reservations)
- `provider_moderation_logs` (audit trail)

### 3. TypeScript Schemas
**File**: `src/lib/service-provider/schemas.ts`

Zod validation schemas:
- Provider profile creation/updates
- Service creation/updates
- Booking creation/status updates
- Review creation/updates
- Advanced search filters
- Gallery & availability management
- Admin moderation schemas

**Features:**
- 25+ Zod schemas
- Full input validation
- Type inference for TypeScript
- Custom error messages
- Enum definitions

### 4. Type Definitions
**File**: `src/types/service-provider.ts`

TypeScript interfaces for:
- ServiceProvider (profiles)
- ProviderService (offerings)
- ProviderReview (ratings)
- ProviderBooking (reservations)
- ProviderAvailability (calendar slots)
- ProviderGalleryItem (media)
- Response types (API responses)
- Filter types (search params)
- Analytics types (reporting)

### 5. Implementation Guides
**Files**: 
- `docs/SERVICE_PROVIDER_IMPLEMENTATION_GUIDE.md`
- `docs/API_ROUTE_EXAMPLES.md`

Covers:
- Step-by-step setup instructions
- Database migration application
- API route templates (6 examples with full code)
- Frontend component patterns
- Component hierarchy
- Testing strategy
- Deployment checklist
- Performance optimization
- Security best practices
- Troubleshooting guide

---

## Quick Start

### Step 1: Apply Database Migration
```bash
# Option A: Supabase CLI
supabase db push

# Option B: Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/20260620_create_service_provider_directory.sql
# 3. Paste and execute
```

### Step 2: Generate TypeScript Types
```bash
supabase gen types typescript > src/types/supabase.ts
```

### Step 3: Create API Routes

Follow the templates in `docs/API_ROUTE_EXAMPLES.md`:

```
POST   /api/providers                    # Create profile
GET    /api/providers                    # Search/list
GET    /api/providers/[id]               # Get detail
PATCH  /api/providers/[id]               # Update profile

POST   /api/providers/[id]/services      # Create service
GET    /api/providers/[id]/services      # List services
PATCH  /api/providers/[id]/services/[sid] # Update service
DELETE /api/providers/[id]/services/[sid] # Delete service

POST   /api/providers/[id]/reviews       # Create review
GET    /api/providers/[id]/reviews       # List reviews

POST   /api/bookings                     # Create booking
GET    /api/bookings                     # List user's bookings
PATCH  /api/bookings/[id]                # Update status

POST   /api/providers/[id]/gallery       # Upload photo
GET    /api/providers/[id]/availability  # Get calendar
POST   /api/providers/[id]/availability  # Add slot

PATCH  /api/admin/providers/[id]/status  # Admin approval
```

### Step 4: Create Frontend Components

Component checklist in `SERVICE_PROVIDER_DIRECTORY.md`:

```
DirectorySearch.tsx         # Main search/filter UI
ProviderCard.tsx            # List item display
ProviderProfile.tsx         # Full profile view
ServiceCard.tsx             # Service listing
BookingForm.tsx             # Booking flow
ReviewForm.tsx              # Review submission
AvailabilityCalendar.tsx    # Calendar picker
ProviderDashboard.tsx       # Provider control panel
ProfileForm.tsx             # Edit profile
ProviderStats.tsx           # Analytics display
```

### Step 5: Create Pages

```
/providers                   # Directory home
/providers/search            # Search results
/providers/[id]              # Provider profile
/providers/[id]/services     # Services list
/providers/[id]/reviews      # Reviews list
/providers/dashboard         # Provider account
/providers/dashboard/profile # Edit profile
/providers/dashboard/services # Manage services
/providers/dashboard/availability # Calendar mgmt
/providers/dashboard/bookings    # Booking list
/providers/dashboard/analytics   # Stats
```

---

## Database Schema Overview

### Core Tables

**service_providers**
- Provider profiles (instructor, shop, guide, etc.)
- Basic info: name, description, phone, email
- Credentials: license, insurance, certifications
- Stats: average_rating, total_reviews
- Status: pending, approved, suspended, archived

**provider_services**
- Services offered by each provider
- Categories: training, guiding, equipment, boat, photography, transport
- Pricing, duration, group size limits
- Availability schedule (days & hours)
- Requirements: min experience, certifications

**provider_reviews**
- User ratings and reviews
- Overall rating + sub-ratings (safety, professionalism, value)
- Verification: is_verified_booking, moderation_status
- Helpful count tracking

**provider_bookings**
- Reservations for services
- Dates, times, group size
- Status: pending, confirmed, completed, cancelled
- Pricing and confirmation codes

**provider_availability**
- Time slots available for booking
- Date-based slots with capacity
- Block-out dates/times
- Current booking count per slot

**provider_gallery**
- Photos and videos
- Display order and featured flag
- Media type tracking

**provider_moderation_logs**
- Audit trail of all moderation actions
- Admin approvals, suspensions, appeals
- Reason tracking

### Security Features

- **Row-Level Security (RLS)**: All tables protected
- **User Isolation**: Users see only approved providers
- **Ownership Verification**: Providers manage only their data
- **Admin Policies**: Admins can view all for moderation
- **Verification Status**: Only approved, verified providers visible to public

---

## Feature Highlights

### For Service Providers

**Profile Management**
- Complete business profile with certifications
- License & insurance tracking
- Photo gallery (avatar, cover, service photos)
- Service creation with detailed info
- Availability calendar management
- Booking management & confirmation

**Credibility**
- Verified badge after admin approval
- Customer ratings & reviews
- Response rate tracking
- Review moderation (spam filtering)

**Operations**
- Booking confirmation workflow
- Calendar availability management
- Special requests handling
- Notes to customers

### For Users

**Discovery**
- Search by provider type, location, service
- Filter by rating, price, distance, verification
- Sort by rating, price, distance, newest
- Map-based location search (ready for implementation)

**Booking**
- Availability calendar view
- Group size selection
- Special requests
- Confirmation codes
- Cancellation management

**Trust & Safety**
- Reviews from verified bookings only
- Moderated content
- Provider verification status
- Response rate visibility
- Report & dispute options

### For Admins

**Moderation**
- Review pending provider applications
- Verify licenses & credentials
- Approve/suspend/appeal workflows
- Review moderation (spam detection)
- Moderation logs & audit trail

**Analytics**
- Provider stats (ratings, reviews, bookings)
- Booking analytics
- User metrics
- Safety incident tracking

---

## Implementation Timeline

**Week 1**: Database & Backend
- Apply migration (4 hours)
- Create API routes (20 hours)
- Unit tests (8 hours)

**Weeks 2-3**: Frontend
- Create components (32 hours)
- Create pages (16 hours)
- Integration testing (8 hours)

**Week 4**: Polish & Launch
- Performance optimization (8 hours)
- Accessibility audit (4 hours)
- Bug fixes & refinement (8 hours)
- Soft launch & UAT (8 hours)

**Total: ~136 hours (4 weeks, 1 developer)**

---

## Key Design Decisions

### 1. Separated Services from Profiles
Allows one provider to offer multiple services with different prices, durations, and requirements. A PADI shop might offer: Beginner Training, Guided Reef Dives, Equipment Rental, etc.

### 2. Availability-Based Booking
Instead of unlimited slots, each time period has configurable capacity. Prevents double-booking and allows load management.

### 3. Review Moderation
Auto-approves reviews from verified bookings, manually reviews others. Prevents fake reviews while maintaining user trust.

### 4. Status-Based Filtering
Providers have status (pending/approved/suspended/archived). Only approved, verified providers appear in public search, reducing moderation burden.

### 5. Comprehensive Audit Trail
All moderation actions logged for compliance, appeals, and dispute resolution.

---

## Security Implementation

### Authentication
- All mutations require valid JWT
- RLS policies verify user identity at database level
- Provider ownership verified before updates

### Authorization
- Public: See approved, verified providers only
- Authenticated Users: Create own profile, book services, review
- Providers: Manage own data only
- Admins: Full moderation access

### Input Validation
- Zod schemas on all endpoints
- Database constraints as backup
- Phone, email, date formats validated
- Group size within service limits

### Data Protection
- Contact info hidden until booking confirmed
- Email/phone encrypted in database (ready for implementation)
- Soft deletes maintain audit trail
- Rate limiting on bookings endpoint

---

## Performance Optimization

### Indexing Strategy
- User ID on all tables (tenant isolation)
- Status columns (filtering approved only)
- Created_at DESC (sorting by newest)
- Location (future PostGIS integration)
- Rating (sorting by best rated)

### Caching Opportunities
- Provider profiles (5 min TTL)
- Search results (1 min TTL, hash include filters)
- Availability (real-time for bookings)
- Reviews (2 min TTL)

### Query Patterns
- Pagination enforced (max 50 per request)
- Status filter applied early
- Compound indexes for common filters
- Denormalized rating fields (calculated via trigger)

---

## Moderation Workflows

### Provider Approval
```
1. User registers → status: pending
2. Email verification
3. Document submission (license, insurance)
4. Admin review (auto or manual)
5. Approval → status: approved, is_verified: true
6. Rejection → status: archived, appeal available
```

### Review Moderation
```
1. User submits review
2. Auto-checks: spam, profanity, uniqueness
3. If verified booking → auto-approve
4. If unverified → pending, manual review
5. Admin decision: approve, reject, request revision
```

### Complaint Resolution
```
1. User reports provider/review
2. Report logged with evidence
3. Admin investigation
4. Decision: warning, suspension, ban, appeal
5. Communication: transparent outcome email
```

---

## Compliance & Legal

### Privacy
- Only approved data visible to public
- Contact info hidden until booking confirmed
- Users can control profile visibility
- GDPR-ready RLS policies

### Terms & Safety
- Content guidelines (no spam, no harassment)
- Refund policy transparency
- Dispute resolution process
- Report & block functionality

### Audit Trail
- All moderation actions logged
- Admin identity recorded
- Reason tracking for appeals
- Timestamps on all changes

---

## Files Created

1. **SERVICE_PROVIDER_DIRECTORY.md** (2000+ lines)
   - Complete design specification
   - Database schema with SQL
   - Component architecture
   - API specifications
   - Wireframes & flows

2. **supabase/migrations/20260620_create_service_provider_directory.sql**
   - Production-ready schema
   - 7 tables, 35+ indexes
   - RLS policies
   - Triggers & functions

3. **src/lib/service-provider/schemas.ts**
   - 25+ Zod validation schemas
   - Enums for types/categories/statuses
   - Type inference for TypeScript

4. **src/types/service-provider.ts**
   - 15+ TypeScript interfaces
   - Response types
   - Filter types
   - Analytics types

5. **docs/SERVICE_PROVIDER_IMPLEMENTATION_GUIDE.md**
   - Step-by-step setup
   - Architecture decisions
   - API design patterns
   - Security strategy
   - Testing checklist
   - Deployment guide

6. **docs/API_ROUTE_EXAMPLES.md**
   - 6 complete route implementations
   - Error handling patterns
   - Validation examples
   - Real-world code templates

---

## Next Steps

1. **Read the main specification** (`SERVICE_PROVIDER_DIRECTORY.md`) for complete design
2. **Apply the database migration** using Supabase dashboard or CLI
3. **Review the implementation guide** (`SERVICE_PROVIDER_IMPLEMENTATION_GUIDE.md`)
4. **Use API route examples** as templates for your routes
5. **Create components** following the component hierarchy
6. **Run tests** per the testing checklist
7. **Deploy & launch** following the deployment checklist

---

## Support & Questions

For implementation questions:
1. Check the comprehensive design document
2. Review the API route examples
3. Reference the RLS policies in the migration
4. Check the troubleshooting section in the implementation guide

For architecture questions:
1. Review the "Architecture Decisions" section in the implementation guide
2. Consider the trade-offs explained in each section
3. Adapt patterns to your project's needs

---

## Version & Attribution

- **Version**: 1.0
- **Created**: 2026-06-20
- **Type**: Service Provider Directory for Dive Drop
- **Scope**: Complete marketplace platform design
- **Implementation Time**: ~136 hours (1 developer, 4 weeks)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
