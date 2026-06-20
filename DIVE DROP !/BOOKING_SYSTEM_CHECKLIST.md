# Booking System - Deployment Checklist

## Pre-Deployment (Database Setup)

### ✅ Database Migration
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `src/lib/bookings/migrations.sql`
- [ ] Execute migration
- [ ] Verify tables exist:
  - [ ] `bookings`
  - [ ] `booking_items`
  - [ ] `booking_status_history`
  - [ ] `booking_messages`
  - [ ] `booking_reviews`
  - [ ] `booking_payments`
- [ ] Verify RLS policies are enabled
- [ ] Verify triggers created successfully
- [ ] Test RLS with different users

### ✅ Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] No sensitive data in client-side code

## Frontend Setup

### ✅ Dependencies Installed
```bash
npm install
```

### ✅ Translation Files Updated
Add to `messages/en.json`, `messages/he.json`:
- [ ] All `bookings.*` keys added (see BOOKING_SYSTEM_QUICKSTART.md)
- [ ] RTL text tested in Hebrew
- [ ] LTR text tested in English
- [ ] Date formatting works for both locales

### ✅ Components Created
- [ ] BookingWizard renders
- [ ] BookingCard displays correctly
- [ ] StatusTracker shows timeline
- [ ] ReviewForm validates input
- [ ] All step components load

### ✅ Pages Created
- [ ] `/bookings/new` loads
- [ ] `/bookings/my-bookings` loads
- [ ] `/bookings/[id]` loads

### ✅ State Management
- [ ] useBookingStore works
- [ ] Zustand persistence enabled (optional)
- [ ] No console errors

## API Testing

### ✅ Authentication
- [ ] `/api/bookings` requires auth
- [ ] `/api/bookings` POST requires auth
- [ ] `/api/admin/bookings` requires admin role
- [ ] Unauthorized requests return 401

### ✅ Create Booking
- [ ] POST `/api/bookings` with valid data succeeds
- [ ] POST `/api/bookings` with invalid data returns 400
- [ ] Cannot book with yourself
- [ ] Rate limiting works (30/min)

### ✅ Get Bookings
- [ ] GET `/api/bookings` returns paginated list
- [ ] Status filter works
- [ ] Date filter works
- [ ] Sorting works (date, status, created)

### ✅ Get Booking Details
- [ ] GET `/api/bookings/:id` returns full details
- [ ] GET `/api/bookings/:id` for someone else's booking fails
- [ ] Messages included in response
- [ ] Reviews included in response

### ✅ Update Booking
- [ ] PATCH `/api/bookings/:id` updates draft only
- [ ] Cannot update confirmed booking
- [ ] Changes tracked in history

### ✅ Cancel Booking
- [ ] DELETE `/api/bookings/:id` cancels booking
- [ ] Cannot cancel within 24 hours
- [ ] Cannot cancel completed booking
- [ ] Status history updated

### ✅ Provider Confirmation
- [ ] POST `/api/bookings/:id/confirm` works for provider
- [ ] Cannot confirm as non-provider
- [ ] Cannot confirm non-pending booking
- [ ] Message sent with confirmation

### ✅ Complete Booking
- [ ] POST `/api/bookings/:id/complete` marks complete
- [ ] Only confirmed bookings can be completed
- [ ] Actual depth recorded
- [ ] Status history updated

### ✅ Messages
- [ ] GET `/api/bookings/:id/messages` returns all messages
- [ ] POST `/api/bookings/:id/messages` sends message
- [ ] Non-participants can't see messages
- [ ] Rate limiting works (30/min)

### ✅ Reviews
- [ ] POST `/api/bookings/:id/reviews` creates review
- [ ] Cannot review non-completed booking
- [ ] Cannot review twice (UNIQUE constraint)
- [ ] Rating validated (1-5)
- [ ] Review text validated (10+ chars)
- [ ] GET `/api/bookings/:id/reviews` returns reviews

### ✅ Admin Endpoint
- [ ] GET `/api/admin/bookings` requires admin
- [ ] Lists all bookings
- [ ] Filtering works
- [ ] Pagination works

## UI/UX Testing

### ✅ Wizard Flow
- [ ] Can proceed through all steps
- [ ] Cannot skip required fields
- [ ] Progress bar updates correctly
- [ ] Previous button works
- [ ] Confirmation step shows booking details

### ✅ Form Validation
- [ ] Buddy required for step 1
- [ ] Date required for step 2
- [ ] Location required for step 3
- [ ] Provider required for step 4
- [ ] Terms accepted for step 5
- [ ] Error messages clear

### ✅ Responsive Design
- [ ] Mobile: Wizard displays correctly
- [ ] Mobile: Cards stack vertically
- [ ] Mobile: Navigation accessible
- [ ] Tablet: 2-column layout works
- [ ] Desktop: 3-column layout works

### ✅ Dark Mode
- [ ] All colors correct in dark mode
- [ ] Text readable
- [ ] Inputs visible
- [ ] Buttons contrast sufficient

### ✅ RTL/LTR
- [ ] Hebrew page flows right-to-left
- [ ] English page flows left-to-right
- [ ] Icons flip correctly in RTL
- [ ] Flex direction correct in both
- [ ] Borders/padding correct

### ✅ Accessibility
- [ ] Form labels present
- [ ] Buttons have proper text
- [ ] Color not only differentiator
- [ ] Focus visible
- [ ] Keyboard navigation works

## Performance Testing

### ✅ Load Times
- [ ] `/bookings/new` loads < 2s
- [ ] `/bookings/my-bookings` loads < 2s
- [ ] `/bookings/:id` loads < 2s

### ✅ API Performance
- [ ] GET `/api/bookings` responds < 500ms
- [ ] POST `/api/bookings` responds < 1s
- [ ] List with 100 items still responsive

### ✅ Database Queries
- [ ] Indexes used (check EXPLAIN)
- [ ] No N+1 queries
- [ ] RLS doesn't slow queries

## Error Handling

### ✅ Network Errors
- [ ] Shows error message
- [ ] Allows retry
- [ ] Doesn't lose form data

### ✅ Validation Errors
- [ ] Clear error messages
- [ ] Fields highlighted
- [ ] Suggestions provided

### ✅ Edge Cases
- [ ] Booking deleted before view
- [ ] User loses auth mid-action
- [ ] Concurrent modifications
- [ ] Database connection lost

## Security Testing

### ✅ Authentication
- [ ] Cannot access bookings without token
- [ ] Token expiration handled
- [ ] Refresh token works

### ✅ Authorization
- [ ] Cannot see other user's bookings
- [ ] Cannot update other's bookings
- [ ] Cannot confirm as non-provider
- [ ] RLS prevents unauthorized access

### ✅ Input Validation
- [ ] XSS attempts blocked
- [ ] SQL injection impossible
- [ ] Large inputs handled
- [ ] Special characters escaped

### ✅ Rate Limiting
- [ ] 30 requests/minute for bookings
- [ ] 10 requests/minute for payments
- [ ] 20 requests/minute for confirmations
- [ ] 429 response when exceeded

## Browser Testing

- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Edge latest
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Integration Testing

### ✅ With Buddy System
- [ ] Buddy status updates reflected
- [ ] Buddy ratings shown
- [ ] Buddy connections validated

### ✅ With Payment System
- [ ] Payment required before booking
- [ ] Amount calculated correctly
- [ ] Payment status tracked

### ✅ With Notification System
- [ ] Status change notifications sent
- [ ] Message notifications sent
- [ ] Review request sent after completion

### ✅ With Authentication
- [ ] User roles enforced
- [ ] Provider role checked
- [ ] Admin role checked

## Documentation

- [ ] README updated with booking info
- [ ] API docs generated
- [ ] Component docs created
- [ ] Database schema documented
- [ ] Deployment guide created

## Post-Deployment

### ✅ Monitoring
- [ ] Error logging configured
- [ ] API metrics tracked
- [ ] Database performance monitored
- [ ] User metrics collected

### ✅ Backup
- [ ] Database backups enabled
- [ ] Automated backup schedule set
- [ ] Restore procedure tested

### ✅ Rollback Plan
- [ ] Previous version tagged
- [ ] Rollback procedure documented
- [ ] Quick rollback possible

## Sign-Off

- [ ] QA approved
- [ ] Product approved
- [ ] Security reviewed
- [ ] Performance acceptable
- [ ] Documentation complete

---

## Test Scenarios

### Scenario 1: Complete Booking Flow
1. User creates account
2. Creates new booking
3. Selects buddy
4. Selects date/location
5. Selects provider
6. Completes payment
7. Views booking
8. Provider confirms
9. Marks complete
10. Submits review
11. Reviews visible

### Scenario 2: Booking Cancellation
1. Create booking
2. Request cancellation outside 24hr window
3. Verify cancellation succeeds
4. Status changes to cancelled
5. History updated
6. Cannot rebook with same details

### Scenario 3: Provider Workflow
1. Provider logs in
2. Views pending confirmations
3. Reviews booking
4. Confirms booking
5. Sends message to divers
6. After dive, completes booking
7. Receives review

### Scenario 4: Messaging
1. Booking pending
2. Diver sends message
3. Provider receives message
4. Provider replies
5. Diver sees reply
6. Full conversation visible

### Scenario 5: Admin Panel
1. Admin logs in
2. Views all bookings
3. Filters by status
4. Filters by provider
5. Filters by date
6. Views audit trail
7. Can see payment info

---

## Known Issues / Limitations

- [ ] Payment integration not included (placeholder only)
- [ ] SMS/Email notifications not integrated
- [ ] Real-time updates require Supabase subscriptions
- [ ] File uploads for documents not included
- [ ] Insurance verification not implemented
- [ ] Certification verification not automated

## Future Enhancements

- [ ] Buddy matching algorithm
- [ ] Provider recommendation engine
- [ ] Automatic reminder notifications
- [ ] Weather integration
- [ ] Tidal data integration
- [ ] Equipment rental integration
- [ ] Insurance verification
- [ ] Video support for messages
- [ ] Group bookings (3+ divers)
- [ ] Recurring bookings

---

**Last Updated:** 2026-06-20
**Status:** Ready for Testing
