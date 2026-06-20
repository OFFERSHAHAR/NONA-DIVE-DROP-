# Free Diving Sessions - Quick Start Guide

## Summary

Complete, production-ready free diving sessions and booking system with:

- Browse & filter sessions
- Book sessions with capacity management
- Payment integration (Bit platform)
- Review & rating system
- Instructor dashboard with roster
- Internationalization (Hebrew/English with RTL)
- Full Row-Level Security (RLS)

## Commits

```
c04acf8 feat: Add comprehensive Free Diving Sessions & Booking system
1db6c13 Add API routes for user bookings and instructor management
```

## What's Been Built

### 1. Database (Migration 003)
- `free_diving_sessions` - Session management
- `free_diving_session_bookings` - Booking & payment
- `free_diving_session_reviews` - Ratings & reviews
- `free_diving_session_roster` - Instructor attendance

### 2. API Routes (10 endpoints)
```
GET    /api/free-diving-sessions           - List sessions
POST   /api/free-diving-sessions           - Create session
GET    /api/free-diving-sessions/[id]      - Session details
PATCH  /api/free-diving-sessions/[id]      - Update session
DELETE /api/free-diving-sessions/[id]      - Cancel session
POST   /api/free-diving-sessions/[id]/book - Book session
GET    /api/free-diving-sessions/[id]/reviews - Get reviews
POST   /api/free-diving-sessions/[id]/reviews - Submit review
GET    /api/my-bookings                    - User's bookings
GET    /api/instructor/sessions            - Instructor sessions
```

### 3. React Components (6 components)
- `SessionCard` - Display session with capacity & rating
- `SessionForm` - Create/edit sessions
- `ReviewForm` - Submit reviews with star ratings

### 4. Pages (5 pages)
- `/free-diving/sessions` - Browse & filter
- `/free-diving/sessions/[id]` - Session details & booking
- `/free-diving/my-sessions` - User's bookings
- `/free-diving/create` - Create new session
- `/free-diving/instructor` - Instructor dashboard

## Deployment Steps

### Step 1: Apply Database Migration

**Option A - Using Supabase CLI:**
```bash
supabase db push migrations/003_free_diving_sessions.sql
```

**Option B - Manual (Supabase Dashboard):**
1. Go to SQL Editor
2. Create new query
3. Copy all content from `migrations/003_free_diving_sessions.sql`
4. Click "Run"

### Step 2: Verify Tables Created

In Supabase, check these tables exist:
- ✓ `free_diving_sessions`
- ✓ `free_diving_session_bookings`
- ✓ `free_diving_session_reviews`
- ✓ `free_diving_session_roster`

### Step 3: Test Locally

```bash
npm run dev
```

Visit:
- http://localhost:3000/en/free-diving/sessions
- http://localhost:3000/he/free-diving/sessions

### Step 4: Create Test Session

**As authenticated instructor:**

```bash
curl -X POST http://localhost:3000/api/free-diving-sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Beginner Apnea Training",
    "description": "Learn basic apnea techniques safely with expert guidance",
    "sessionType": "group_apnea_training",
    "level": "beginner",
    "location": "Red Sea Beach, Eilat",
    "startDate": "2026-07-15",
    "startTime": "09:00",
    "capacity": 10,
    "price": 250,
    "durationMinutes": 120,
    "maxDepth": 20,
    "imageUrl": "https://..."
  }'
```

Or use the UI: http://localhost:3000/en/free-diving/create

### Step 5: Deploy to Production

```bash
# Commit changes
git push origin main

# Deploy via Vercel
vercel --prod
```

## Testing Checklist

### User Flow
- [ ] Browse sessions with all filters working
- [ ] View session details (all info displays)
- [ ] Book a session (capacity decreases)
- [ ] View booking in "My Sessions"
- [ ] Payment status shows correctly
- [ ] Write review (after session completed)
- [ ] View reviews on session page
- [ ] RTL layout works (Hebrew)

### Instructor Flow
- [ ] Create new session
- [ ] View all sessions in dashboard
- [ ] View session roster with participants
- [ ] Mark session as complete
- [ ] Cancel session

### Admin/Security
- [ ] Verify RLS policies active
- [ ] Non-authenticated users see only list
- [ ] Can't book twice same session
- [ ] Can't review incomplete sessions
- [ ] Instructors can't edit others' sessions

## File Locations

```
Key Files:
├── migrations/003_free_diving_sessions.sql          [Database schema]
├── src/app/api/free-diving-sessions/               [API endpoints]
├── src/components/free-diving/                      [React components]
├── src/app/[locale]/free-diving/                    [Page components]
└── FREE_DIVING_SESSIONS.md                         [Full documentation]
```

## Key Features

### Session Types
- Group Apnea Training
- Certification Course
- Competition Prep
- Depth Training
- Partner Sessions

### Difficulty Levels
- Beginner
- Intermediate
- Advanced
- Expert

### Payment
- Integration ready for Bit API
- Tracks payment status
- Stores transaction IDs
- Price in Israeli Shekels (₪)

### Reviews
- 1-5 star rating
- Sub-ratings: safety, instruction quality, value
- Moderation system (pending/approved/rejected)
- Shows on session page

### Capacity Management
- Track current participants
- Show available spots
- Prevent overbooking
- Prevent double-booking same user

## Configuration Options

### Internationalization
Supports English (en) and Hebrew (he) with RTL layout.

### Styling
Uses Tailwind CSS with:
- Gradient buttons (blue to cyan)
- Rounded corners (xl, lg, md)
- Shadow effects
- Responsive grid layouts

### Status Values
Sessions: `scheduled`, `in_progress`, `completed`, `cancelled`
Bookings: `pending`, `confirmed`, `completed`, `cancelled`
Reviews: `pending`, `approved`, `rejected`

## Common Tasks

### Add New Session Type
In components/SessionForm.tsx, update:
```typescript
const sessionTypes = [
  { value: 'your_new_type', label: { en: 'Label', he: 'תרגום' } }
];
```

### Customize Capacity
Sessions support any capacity (1+). Default form allows 1-100.

### Change Currency
Replace `₪` with your currency symbol in all price displays.

### Modify Review Form
Edit components/free-diving/ReviewForm.tsx to change rating options.

## Performance

- Pagination: 10 sessions per page
- Indexes on: session_type, level, location, start_date, user_id, status
- Lazy loading: Roster loads on demand
- Caching: Browser cache for images

## Security

### Row-Level Security (RLS)
- ✓ Sessions: Public can view non-cancelled
- ✓ Bookings: Users see only their bookings
- ✓ Reviews: Instructors can view their reviews
- ✓ Roster: Only instructors see their rosters

### Input Validation
- Required fields checked in forms
- API validates all inputs
- Email/phone not exposed
- User IDs hashed in display

## Support & Next Steps

### To enable payments:
1. Get Bit API credentials
2. Update `/api/free-diving-sessions/[id]/book` route
3. Implement payment verification
4. Handle success/failure responses

### To add notifications:
1. Set up email service (SendGrid, Resend, etc.)
2. Add email templates
3. Trigger on: booking, payment, review

### To add analytics:
1. Track events via Firebase/Mixpanel
2. Add to booking/review endpoints
3. Create admin dashboard

## Questions?

See `FREE_DIVING_SESSIONS.md` for complete documentation.
