# Service Provider Directory - Implementation Guide

## Quick Start

### Files Created
1. **`SERVICE_PROVIDER_DIRECTORY.md`** - Complete design specification
2. **`supabase/migrations/20260620_create_service_provider_directory.sql`** - Database schema
3. **`src/lib/service-provider/schemas.ts`** - Zod validation schemas
4. **`src/types/service-provider.ts`** - TypeScript type definitions

### Next Steps

#### 1. Apply Database Migration
```bash
# Push schema to Supabase
supabase db push

# Or manually run migration in Supabase dashboard:
# - Copy SQL from 20260620_create_service_provider_directory.sql
# - Paste into SQL editor
# - Execute
```

#### 2. Update Supabase Types
```bash
# Generate TypeScript types from Supabase schema
supabase gen types typescript > src/types/supabase.ts

# Update the Database interface in src/types/supabase.ts with:
# - service_providers
# - provider_services
# - provider_reviews
# - provider_gallery
# - provider_availability
# - provider_bookings
# - provider_moderation_logs
```

#### 3. Create API Routes

Create the following files following Next.js 16 App Router pattern:

```
src/app/api/providers/
├── route.ts                     # GET (search), POST (create)
├── [id]/
│   ├── route.ts                # GET (detail), PATCH, DELETE
│   ├── services/
│   │   ├── route.ts            # GET (list), POST (create)
│   │   └── [serviceId]/
│   │       └── route.ts        # PATCH (update), DELETE
│   ├── reviews/
│   │   ├── route.ts            # GET (list), POST (create)
│   │   └── [reviewId]/
│   │       └── route.ts        # PATCH (update), DELETE
│   ├── availability/
│   │   ├── route.ts            # GET (list), POST (create)
│   │   └── [slotId]/
│   │       └── route.ts        # DELETE
│   └── gallery/
│       ├── route.ts            # GET (list), POST (upload)
│       └── [itemId]/
│           └── route.ts        # DELETE
├── bookings/
│   ├── route.ts                # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts            # PATCH (status update)
│       └── confirmation/
│           └── route.ts        # GET
└── admin/
    └── providers/
        ├── route.ts            # GET (list for moderation)
        └── [id]/
            ├── status/
            │   └── route.ts    # PATCH
            └── verify/
                └── route.ts    # POST
```

#### 4. Create Frontend Components

```
src/components/providers/
├── DirectorySearch.tsx         # Search & filter UI
├── ProviderCard.tsx            # List item
├── ProviderGrid.tsx            # Grid layout wrapper
├── ProviderProfile.tsx         # Full profile view
├── ProviderGallery.tsx         # Photo gallery
├── ServiceCard.tsx             # Service listing
├── ServiceList.tsx             # Services grid
├── ReviewCard.tsx              # Individual review
├── ReviewsList.tsx             # Reviews section
├── ReviewForm.tsx              # Write review
├── BookingForm.tsx             # Booking flow
├── AvailabilityCalendar.tsx    # Calendar picker
├── ProfileForm.tsx             # Provider profile editor
├── ServiceForm.tsx             # Service editor
├── ProviderDashboard.tsx       # Dashboard layout
└── ProviderStats.tsx           # Analytics cards
```

#### 5. Create Pages

```
src/app/[locale]/providers/
├── page.tsx                    # Directory homepage
├── layout.tsx                  # Shared layout
├── search/
│   └── page.tsx               # Search results
├── [id]/
│   ├── page.tsx               # Provider profile
│   ├── services/
│   │   └── page.tsx           # Services detail
│   └── reviews/
│       └── page.tsx           # Reviews detail
├── dashboard/
│   ├── page.tsx               # Provider dashboard
│   ├── profile/
│   │   └── page.tsx           # Edit profile
│   ├── services/
│   │   ├── page.tsx           # Manage services
│   │   └── [id]/
│   │       └── page.tsx       # Edit service
│   ├── availability/
│   │   └── page.tsx           # Calendar management
│   ├── bookings/
│   │   ├── page.tsx           # Booking list
│   │   └── [id]/
│   │       └── page.tsx       # Booking detail
│   └── analytics/
│       └── page.tsx           # Stats dashboard
└── onboarding/
    └── page.tsx               # Provider signup flow
```

---

## Architecture Decisions

### 1. Database Design

**Key Principles:**
- **Normalization**: Services, reviews, bookings are separate tables for flexibility
- **Soft Deletes**: Status field instead of hard deletes for audit trails
- **RLS**: Row-level security policies enforce access control at database level
- **Performance**: Strategic indexes on frequently filtered columns
- **Triggers**: Auto-calculated ratings, timestamp updates

**Why This Structure:**
- Providers have 1:N relationship with services (a shop offers multiple services)
- Reviews are decoupled from bookings (optional booking validation)
- Availability is time-based for booking validation
- Moderation logs provide audit trail for compliance

### 2. Service Categories

The 6 service categories cover dive tourism's main offerings:
- **Training**: Certification courses, skill development
- **Guiding**: Guided dives, buddy matching with professionals
- **Equipment**: Rental gear, BCD, tanks, wetsuits
- **Boat**: Boat rental, charter services
- **Photography**: Underwater photography services
- **Transport**: Shuttle services to dive sites

### 3. Provider Types

- **Instructor**: PADI/SSI certified dive trainers
- **Shop**: Dive centers, retail stores
- **Guide**: Professional dive guides (may not be instructors)
- **Boat Operator**: Boat captains, charter companies
- **Rental**: Gear rental facilities
- **Photography**: Underwater photographers

### 4. Verification Workflow

**Two-Tier Verification:**

1. **Automatic**: Email verification, basic info validation
2. **Manual**: Admin review of documents for trust/credibility

Benefits:
- Fast onboarding for legitimate providers
- Human review catches fraud/misrepresentation
- Appeal process for wrongly rejected applications

### 5. Review Moderation

**Why Required:**
- Prevents fake positive reviews (competitors can't artificially boost rating)
- Prevents fake negative reviews (competitors can't sabotage)
- Maintains data integrity for search/sort algorithms
- Protects platform reputation

**Moderation Status Values:**
- `pending`: Waiting for moderation
- `approved`: Published, visible to public
- `rejected`: Hidden, user can appeal

---

## API Design Patterns

### Search Endpoint

```
GET /api/providers?
  search=yoga&
  provider_type=instructor&
  location=Tel+Aviv&
  latitude=32.0853&
  longitude=34.7818&
  radius_km=50&
  min_rating=4&
  price_min=100&
  price_max=500&
  is_verified=true&
  sort_by=rating&
  page=1&
  limit=20
```

**Response:**
```json
{
  "providers": [...],
  "total": 145,
  "page": 1,
  "limit": 20,
  "has_more": true
}
```

### Booking Flow

```
1. GET /api/providers/[id]/availability?date_from=2026-07-01&date_to=2026-07-31
   -> Returns available slots

2. POST /api/bookings
   Body: {
     "service_id": "uuid",
     "booking_date": "2026-07-15",
     "start_time": "08:00",
     "group_size": 3,
     "special_requests": "..."
   }
   -> Returns booking with confirmation_code

3. Provider: PATCH /api/bookings/[id]
   Body: { "status": "confirmed" }
   -> Booking confirmed, notification sent

4. GET /api/bookings/[id]/confirmation
   -> Returns confirmation details for email/SMS
```

### Review Flow

```
1. User must have completed booking (status = 'completed')
2. POST /api/providers/[id]/reviews
3. Review enters moderation queue (status = 'pending')
4. Admin approves/rejects via /api/admin/providers/[id]/reviews/[id]/status
5. If approved, rating recalculation trigger fires
6. Provider average_rating updated via RLS
```

---

## RLS Policy Strategy

### Public Access
- View approved, verified providers
- View approved reviews
- View gallery of approved providers
- View availability of approved providers

### Authenticated Access
- Create own provider profile
- Manage own services, availability, gallery
- Create bookings
- Create reviews (if verified booking)
- View own bookings

### Provider Access
- View own profile (even if not approved)
- View all interests/bookings for own services
- View reviews on own profile
- Update booking status

### Admin Access
- View all providers (pending, suspended, archived)
- Approve/suspend providers
- Verify licenses
- Moderate reviews
- View moderation logs

**All policies are at database level**, enforced by Supabase RLS, not application logic.

---

## Booking & Payment Considerations

### Current Implementation
This design creates bookings with status tracking:
- `pending`: Awaiting provider confirmation
- `confirmed`: Provider accepted, user can proceed to payment
- `completed`: Service delivery confirmed
- `cancelled`: Cancelled by either party

### Future Payment Integration
When adding Stripe/2Checkout:
1. Create payment row after booking confirmation
2. Payment can be `pending` → `captured` → `completed`
3. Booking status remains separate from payment status
4. Refunds trigger via API after payment check
5. Disputes are resolved with payment adjustments

### Refund Policy
Stored in provider profile or separate policies table:
- Cancel > 48hrs: 100% refund
- Cancel 24-48hrs: 50% refund
- Cancel < 24hrs: 0% refund (provider discretion)
- Provider cancels: 100% + 5% credit

---

## Moderation Workflow

### New Provider Registration
```
1. User fills profile form
   ↓
2. Email verification → status: 'pending'
   ↓
3. Admin reviews documents
   ↓
4. If approved → status: 'approved', is_verified: true
   If rejected → status: 'archived', reason sent, appeal available
```

### Review Moderation
```
1. User submits review
   ↓
2. Auto-checks: spam, profanity, length, uniqueness
   ↓
3. If flagged → moderation_status: 'pending'
   If clean → moderation_status: 'approved'
   ↓
4. Admin manually reviews pending reviews
   ↓
5. Final decision: approved, rejected, or request revision
```

### Complaint Resolution
```
1. User reports provider/review via report endpoint
   ↓
2. Report logged in provider_moderation_logs
   ↓
3. Admin reviews evidence
   ↓
4. Decision: warning, temporary suspension, permanent ban
   ↓
5. Communication: automated email with reason & appeal info
```

---

## Performance Optimization

### Indexes Strategy
- **User Access**: `user_id` on every table with multi-tenant data
- **Status Filtering**: Index on status columns (for approval workflows)
- **Location Search**: Latitude/longitude fields (prepare for PostGIS)
- **Time Filtering**: Date/created_at fields (range queries)
- **Sorting**: `average_rating`, `created_at DESC` for common sorts

### Query Optimization Tips
1. Use pagination (limit 20-50) always
2. Filter by status early (approved providers only)
3. Cache provider profiles (5-10 min TTL)
4. Cache availability (real-time in bookings, cache elsewhere)
5. Use compound indexes for common filter combinations

### Caching Strategy
```typescript
// Provider profile (5 min)
cache.get(`provider:${id}`) 
  || fetchProvider(id).then(p => cache.set(..., p, 300))

// Search results (1 min, include params hash)
cache.get(`search:${hash(filters)}`)

// Availability (real-time for bookings, 10 min elsewhere)
// On booking creation, invalidate provider's availability cache
```

---

## Security Considerations

### Input Validation
- Zod schemas on all endpoints (frontend + backend)
- Phone number format validation
- Date range validation (booking_date >= today)
- Group size within service limits

### Access Control
- RLS policies enforce who can view/create/update
- Middleware validates JWT before route handler
- Providers can only update own profiles/services
- Admins identified via admin_users table

### HTTPS & Data
- All traffic encrypted (Vercel default)
- Sensitive fields (insurance_expiry, license) not exposed in public APIs
- Contact info (phone, email) hidden until booking confirmed
- Reviews anonymous option (show username only)

### Rate Limiting
```typescript
// Per user, per endpoint
const rateLimit = {
  '/api/providers': '10 req/min',
  '/api/providers/[id]/reviews': '5 req/hour per user',
  '/api/bookings': '20 req/day per user',
  '/api/admin/*': '100 req/min per admin',
}
```

### Dispute Prevention
- Booking confirmation required (double opt-in)
- Booking cancellation policies transparent
- Review verification (must be completed booking)
- Reporting system for false reviews

---

## Testing Checklist

### Unit Tests
- [ ] Zod schema validation (valid/invalid inputs)
- [ ] Review rating calculation logic
- [ ] Availability slot conflict detection
- [ ] Booking status transitions

### Integration Tests
- [ ] Create provider → services → availability → booking flow
- [ ] Review submission → moderation → rating update
- [ ] Search with various filter combinations
- [ ] Availability calendar (no double-booking)
- [ ] RLS policies (unauthorized access blocked)

### E2E Tests
- [ ] User browse providers → view profile → book service
- [ ] Provider login → edit profile → manage bookings
- [ ] Admin approve provider → moderate reviews

### Performance Tests
- [ ] Search 1000 providers (pagination)
- [ ] Load provider profile with 100+ reviews
- [ ] Concurrent bookings for same slot (conflict detection)

### Manual Testing
- [ ] Mobile responsiveness (directory cards, booking form)
- [ ] Calendar UI (date/time selection)
- [ ] Gallery carousel (performance with 50+ images)
- [ ] Error handling (network, validation, conflicts)

---

## Deployment Checklist

### Pre-Launch
- [ ] Database migration applied to production
- [ ] RLS policies tested in production
- [ ] All API routes deployed
- [ ] Frontend components deployed
- [ ] Admin panel accessible and functional
- [ ] Monitoring & alerting configured
- [ ] Logging enabled for auditing
- [ ] Backup strategy verified

### Soft Launch (Beta)
- [ ] 10-50 test providers onboarded
- [ ] 50-100 test bookings created
- [ ] Reviews submitted & moderated
- [ ] Load test with concurrent searches
- [ ] Admin workflows tested end-to-end

### Public Launch
- [ ] Marketing materials ready (screenshots, descriptions)
- [ ] Help/FAQ documentation
- [ ] Community guidelines published
- [ ] Privacy policy updated
- [ ] Support workflow established
- [ ] Analytics dashboard active

### Post-Launch
- [ ] Monitor error rates & latency
- [ ] Gather user feedback
- [ ] Weekly provider onboarding review
- [ ] Monthly moderation report
- [ ] Quarterly feature roadmap update

---

## Future Enhancements

### Phase 2 (Months 4-6)
- [ ] Messaging system (in-app chat between users & providers)
- [ ] Payment integration (Stripe for bookings)
- [ ] Certification verification (auto-verify PADI/SSI)
- [ ] Multi-language support (Hebrew, English, Russian)
- [ ] Provider analytics dashboard (views, conversion, revenue)

### Phase 3 (Months 7-12)
- [ ] Smart recommendations (ML-based provider matching)
- [ ] Dynamic pricing (surge pricing during peak season)
- [ ] Calendar integrations (sync to Google/Outlook)
- [ ] Mobile app (iOS/Android natives)
- [ ] Insurance integration (digital proof of insurance)

### Phase 4 (Year 2)
- [ ] Affiliate program (referral commissions)
- [ ] White-label API (for other diving platforms)
- [ ] Advanced analytics (cohort analysis, churn prediction)
- [ ] Marketing automation (email sequences for providers)

---

## Support & Troubleshooting

### Common Issues

**Issue**: Provider profile not appearing in search
- [ ] Status must be 'approved'
- [ ] is_verified must be true
- [ ] No RLS policy preventing access

**Issue**: Booking shows availability but error on submit
- [ ] Check current_bookings < max_bookings
- [ ] Verify group_size within service limits
- [ ] Confirm booking_date >= today

**Issue**: Review not visible after submission
- [ ] moderation_status should be 'approved' or 'pending'
- [ ] Check reviewer_user_id is not null
- [ ] Verify booking_id points to completed booking

**Issue**: Dashboard stats not updating
- [ ] Recalculate_provider_rating trigger may have failed
- [ ] Check provider_moderation_logs for errors
- [ ] Manually refresh dashboard (clear cache)

### Support Escalation
1. Check application logs (Vercel/CloudWatch)
2. Check Supabase logs (query errors, auth issues)
3. Verify RLS policies allow operation
4. Test in Supabase SQL editor directly
5. Contact Supabase support if database issue

---

## Document Versions

- **v1.0** (2026-06-20): Initial comprehensive design
  - Database schema with 7 tables
  - 100+ TypeScript types & validators
  - API route specifications
  - RLS policy strategy
  - Moderation workflows
  - Component architecture

---

## Contact & Questions

For questions about this implementation:
1. Review the `SERVICE_PROVIDER_DIRECTORY.md` file (comprehensive spec)
2. Check the SQL migration file for exact table structures
3. Reference `src/lib/service-provider/schemas.ts` for validation patterns
4. Review RLS policies in migration file for security patterns

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
