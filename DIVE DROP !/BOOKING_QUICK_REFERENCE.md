# DIVE DROP Booking System - Quick Reference Guide

## 🎯 System Overview

**Purpose**: Connect 2 recreational divers with professional service providers (dive centers, instructors, boat operators) for coordinated dive experiences.

**Core Model**: 2 Divers + 1 Service Provider = 1 Booking

---

## 📊 Database Tables at a Glance

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `service_providers` | Dive businesses | id, user_id, business_type, verified, rating_average |
| `services` | Service offerings | id, provider_id, service_category, base_price |
| `provider_availability` | Calendar | id, provider_id, availability_date, available_slots |
| `bookings` | Main booking record | id, diver_1_id, diver_2_id, provider_id, status, total_price |
| `booking_items` | Line items | id, booking_id, service_id, unit_price |
| `booking_messages` | Chat | id, booking_id, sender_id, content |
| `booking_status_history` | Audit trail | id, booking_id, old_status, new_status |
| `booking_payments` | Transactions | id, booking_id, payer_id, payment_status |
| `provider_payouts` | Provider earnings | id, provider_id, gross_earnings, net_earnings |
| `provider_reviews` | Ratings | id, booking_id, provider_id, rating, comment |

---

## 🔄 Booking Lifecycle

```
CREATED → PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → REVIEWED
         ↓
      DECLINED
         ↓
      (can rebook)

Alternative paths:
- PENDING → DECLINED (provider rejects)
- CONFIRMED → CANCELLED (either party)
- IN_PROGRESS → NO_SHOW (no appearance)
- CANCELLED → REFUNDED (after processing)
```

---

## 💰 Pricing Model

```
Service Price (per diver): $100
× 2 Divers: $200

Commission (15%): $30
├─ DIVE DROP keeps: $30
└─ Provider keeps: $170

Total Price: $230
├─ Per diver: $115
└─ Provider earnings: $85 each diver
```

### Refund Timeline
```
>7 days before:   100% refund to diver, 100% to provider
3-7 days before:   75% refund to diver,  75% to provider
24-72 hours:       50% refund to diver,  50% to provider
<24 hours:          0% refund (no refund)
After no-show:      0% refund (no refund)
```

---

## 📱 Key API Endpoints

### Diver Operations
```
POST   /api/bookings                    # Create booking
GET    /api/bookings                    # List my bookings
GET    /api/bookings/:id                # Get booking details
POST   /api/bookings/:id/cancel         # Cancel booking
GET    /api/providers/search             # Search providers
GET    /api/bookings/:id/messages       # Get messages
POST   /api/bookings/:id/messages       # Send message
POST   /api/bookings/:id/review         # Post review
POST   /api/bookings/:id/payment        # Make payment
```

### Provider Operations
```
GET    /api/providers/dashboard         # Provider dashboard
GET    /api/providers/bookings          # My booking requests
PUT    /api/bookings/:id/status         # Confirm/decline request
POST   /api/providers/availability      # Set availability
POST   /api/providers/availability/block # Block dates
GET    /api/providers/payouts           # Payout history
POST   /api/reviews/:id/response        # Respond to review
```

---

## 🎬 User Stories

### Diver Booking Journey
```
1. Search buddy → Found match ✓
2. Select date/location/service type
3. Browse available providers
4. View provider details & reviews
5. Create booking request
6. Wait for provider confirmation (24-48h)
7. Process payment (2 options)
8. Confirmation ✓
9. Receive pre-dive info
10. Complete dive
11. Leave review
12. View complete booking record
```

### Provider Workflow
```
1. Set availability (days/times)
2. Receive booking request notification
3. Review divers' profiles
4. Confirm or decline
5. Receive payment
6. Send pre-dive briefing
7. Conduct dive
8. Post dive (optional response to review)
9. Receive payout (weekly/monthly)
10. View earnings dashboard
```

---

## 🔒 Security Layers

| Layer | Method | Details |
|-------|--------|---------|
| **Authentication** | Supabase Auth | Email/password, OAuth |
| **Authorization** | Row-Level Security | Users see only relevant data |
| **Data Validation** | Zod Schemas | Type-safe input validation |
| **Encryption** | TLS 1.3 | All data in transit encrypted |
| **Storage** | AES-256 | At-rest encryption |
| **Audit Trail** | Status History | All changes tracked |

---

## 📊 Key Metrics

### Operational
- Booking completion rate target: >80%
- Provider response time: <2 hours
- Payment success rate: >99%
- Refund processing: <5 business days

### Quality
- Customer satisfaction: >4.5/5 stars
- Provider average rating: >3.5/5 stars
- Cancellation rate (provider): <5%
- Message response time: <1 hour

### Business
- Commission percentage: 15%
- Weekly/monthly payouts
- Zero chargebacks policy
- Fraud detection enabled

---

## 🎯 Status Codes & Meanings

```
HTTP Status Codes:
200 OK              ✓ Success
201 Created         ✓ New resource created
400 Bad Request     ✗ Invalid input
401 Unauthorized    ✗ Not logged in
403 Forbidden       ✗ Not authorized
404 Not Found       ✗ Resource missing
409 Conflict        ✗ Invalid state transition
500 Server Error    ✗ Internal error
```

---

## 🚀 Quick Implementation Tips

### 1. Database Setup
```sql
-- Apply migration
psql -d your_db < migrations/20260625_booking_system_schema.sql

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 2. Type Checking
```bash
# Copy types to project
cp src/types/booking.ts ./

# Verify compilation
npm run type-check
```

### 3. API Creation
```bash
# Create route files based on guide
# Reference: BOOKING_API_IMPLEMENTATION_GUIDE.md

# Key patterns:
# 1. Get authenticated user
# 2. Validate input with Zod
# 3. Check authorization
# 4. Execute database operation
# 5. Return response
```

### 4. Component Creation
```bash
# See component list in BOOKING_SYSTEM_DESIGN.md section 10
# Recommended approach:
# 1. Start with card components
# 2. Build form components
# 3. Create workflow components
# 4. Integrate into pages
```

---

## ⚠️ Common Pitfalls to Avoid

| Issue | Solution |
|-------|----------|
| Double booking same slot | Use availability check before create |
| Missing authorization | Check user on every endpoint |
| Invalid state transitions | Validate against state machine |
| Race conditions | Use transactions for complex operations |
| N+1 queries | Use select() with joins |
| Stale availability data | Invalidate cache after changes |
| Missing notifications | Implement after each status change |
| Incorrect refund amounts | Use timeline-based calculation logic |
| Unhandled payment failures | Implement retry logic |
| Lost audit trail | Record all status changes |

---

## 📈 Scaling Considerations

### For 1K Bookings/Day
- Add index on booking.created_at
- Cache provider search results
- Queue notification processing
- Monitor database connection pool

### For 10K Bookings/Day
- Implement read replicas for search
- Use caching layer (Redis) for providers
- Async payment processing
- Connection pooling essential

### For 100K Bookings/Day
- Database sharding consideration
- Dedicated search service (Elasticsearch)
- Message queue for notifications (AWS SQS)
- CDN for static content
- API rate limiting required

---

## 🔧 Useful Queries

### Find Available Providers for Date
```sql
SELECT sp.*, count(pa.id) as available_dates
FROM service_providers sp
LEFT JOIN provider_availability pa 
  ON sp.id = pa.provider_id 
  AND pa.availability_date = '2026-07-15'
  AND NOT pa.is_blocked
WHERE sp.is_active = true
GROUP BY sp.id
HAVING available_dates > 0
ORDER BY sp.rating_average DESC;
```

### Calculate Provider Earnings
```sql
SELECT 
  provider_id,
  COUNT(*) as completed_bookings,
  SUM(service_price) as gross_earnings,
  SUM(commission_amount) as commission_paid,
  SUM(service_price) - SUM(commission_amount) as net_earnings
FROM bookings
WHERE status = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days'
GROUP BY provider_id;
```

### Find Problem Providers
```sql
SELECT 
  sp.id,
  sp.business_name,
  COUNT(b.id) FILTER (WHERE b.status = 'declined') as declined,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled,
  ROUND(100.0 * COUNT(b.id) FILTER (WHERE b.status = 'declined') 
    / NULLIF(COUNT(b.id), 0), 2) as decline_rate
FROM service_providers sp
LEFT JOIN bookings b ON sp.id = b.provider_id
WHERE sp.is_active = true
GROUP BY sp.id
HAVING COUNT(b.id) > 10
ORDER BY decline_rate DESC
LIMIT 10;
```

---

## 📞 Notification Events

```
Booking Created          → Provider (in-app, email, SMS)
Booking Confirmed        → Divers (in-app, email)
Booking Declined         → Divers (in-app, email)
Payment Received         → Provider (in-app, email)
Payment Failed           → Diver (in-app, email)
24h Dive Reminder        → All parties (push, SMS)
Dive Completed           → All parties (in-app, email)
Review Posted            → Provider (in-app, email)
Refund Processed         → Diver (in-app, email)
Payout Completed         → Provider (in-app, email)
Message Received         → Recipient (in-app, push)
Booking Cancelled        → All parties (in-app, email)
```

---

## 🎨 UI Component Hierarchy

```
Page
├─ BookingsList
│  ├─ BookingCard
│  │  ├─ BookingStatusBadge
│  │  ├─ ProviderInfo
│  │  └─ ActionButtons
│  └─ FilterPanel
│
├─ BookingDetail
│  ├─ BookingTimeline
│  ├─ DiversInfo
│  ├─ ProviderCard
│  ├─ MessageThread
│  ├─ PaymentStatus
│  └─ ReviewSection
│
└─ ProviderSearch
   ├─ SearchFilters
   ├─ ProviderList
   │  ├─ ProviderCard
   │  │  ├─ Rating
   │  │  ├─ AvailabilityBadge
   │  │  └─ BookButton
   │  └─ LoadMore
   └─ Map (optional)
```

---

## 📋 Validation Rules

### Booking Creation
```
✓ Both divers must be authenticated
✓ Divers cannot book themselves
✓ Provider must be active & verified
✓ Date must be ≥24 hours in future
✓ Time slot must be available
✓ Divers must have required certification
```

### Provider Operations
```
✓ Provider must own their profile
✓ Response time <12 hours
✓ Cancellation rate <5%
✓ Rating ≥3.5 stars to accept bookings
✓ Availability slots cannot overlap
✓ Block dates must be ≥1 day in future
```

### Payments
```
✓ Amount matches booking total
✓ No duplicate payments
✓ Currency supported (USD/ILS/EUR/GBP)
✓ Payment method valid
✓ No payments for cancelled bookings
✓ Refund only if eligibility criteria met
```

### Reviews
```
✓ Only after booking completion
✓ Only by verified participants
✓ Rating between 1-5
✓ No duplicate reviews
✓ Comment min 10 chars max 1000
✓ Editable within 30 days
```

---

## 🎓 Learning Path

1. **Read**: BOOKING_SYSTEM_DESIGN.md (full context)
2. **Understand**: Database schema and relationships
3. **Learn**: TypeScript type definitions
4. **Review**: API implementation examples
5. **Plan**: Component architecture
6. **Implement**: Following the roadmap phases
7. **Test**: Write tests as you build
8. **Deploy**: To staging first, then production

---

## 🆘 Troubleshooting

| Problem | Check |
|---------|-------|
| Booking not appearing | User authorization in RLS policy |
| Payment not processing | Stripe API keys configured |
| Availability not showing | provider_availability table has data |
| Refund not calculated | Timeline logic and booking dates |
| Messages not sending | booking_messages RLS policy |
| Reviews not visible | Both parties reviewed status |
| Provider search slow | Index on availability_date |
| Status update fails | Valid state transition |

---

## 📚 Document Locations

| Document | Purpose | Read Time |
|----------|---------|-----------|
| BOOKING_SYSTEM_DESIGN.md | Complete specification | 45 min |
| BOOKING_API_IMPLEMENTATION_GUIDE.md | Code examples | 30 min |
| src/types/booking.ts | Type reference | 10 min |
| Database schema SQL | Table structure | 20 min |
| BOOKING_QUICK_REFERENCE.md | This guide | 15 min |

---

**Last Updated**: 2026-06-25
**Version**: 1.0
**Status**: Ready for Development
