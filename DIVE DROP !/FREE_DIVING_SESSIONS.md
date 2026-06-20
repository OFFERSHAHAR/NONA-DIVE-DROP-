# Free Diving Sessions & Booking System

Complete booking system for free diving sessions with instructors, participants, payments, and reviews.

## Features Implemented

### 1. Browse Sessions (`/free-diving/sessions`)
- Browse all available free diving sessions
- Filter by:
  - Session type (Group Apnea Training, Certification Course, Competition Prep, Depth Training, Partner Sessions)
  - Difficulty level (Beginner, Intermediate, Advanced, Expert)
  - Location
  - Maximum price
- Session cards show:
  - Title, type, and level
  - Location, date, and time
  - Capacity and available spots
  - Price
  - Average rating

### 2. My Sessions / Bookings (`/free-diving/my-sessions`)
- View all personal bookings and registrations
- Tabs for:
  - Upcoming sessions
  - Completed sessions
  - Cancelled sessions
- Shows:
  - Session details
  - Payment status
  - Days until session starts
- Link to full session details

### 3. Session Details (`/free-diving/sessions/[id]`)
- Full session information
- Session description
- Instructor details
- Participant count and capacity indicator
- Reviews section with:
  - Average rating
  - User reviews
  - Review writing form (for completed sessions)
- Booking functionality
- Rich session information:
  - Max depth
  - Session type and level
  - Full location details

### 4. Create Session (`/free-diving/create`)
- Instructors can create new sessions
- Form fields:
  - Title and description
  - Session type
  - Difficulty level
  - Location
  - Date and time
  - Capacity
  - Price
  - Optional: duration, max depth, image URL
- Form validation
- Success redirect to session details

### 5. Instructor Dashboard (`/free-diving/instructor`)
- View all instructor's sessions
- Organized by status:
  - Scheduled
  - In Progress
  - Completed
  - Cancelled
- Session roster with:
  - Participant list
  - Attendance tracking
  - Instructor notes
  - Total revenue
- Session management controls

### 6. Session Reviews & Ratings
- Create reviews after session completion
- Rating system with:
  - Overall rating (1-5 stars)
  - Sub-ratings: instruction quality, safety, value for money
- Review title and comment
- Reviews require moderation (pending approval)
- Display approved reviews on session page

### 7. Payment Integration
- Price per session in Israeli Shekels (₪)
- Payment method: Bit (Israeli payment platform)
- Payment status tracking:
  - Pending
  - Completed
  - Failed
  - Refunded

## Database Schema

### `free_diving_sessions`
Main sessions table with:
- Session type, level, location
- Date/time and duration
- Capacity and current participants
- Pricing (Israeli Shekels)
- Status (scheduled, in_progress, completed, cancelled)
- Instructor ID reference
- Session metadata

### `free_diving_session_bookings`
Booking records with:
- User and session reference
- Booking status (pending, confirmed, completed, cancelled)
- Payment status and transaction ID
- Price paid
- Payment method
- Attendance tracking

### `free_diving_session_reviews`
Reviews with:
- Rating and sub-ratings
- Review title and comment
- Moderation status
- Helpful count tracking
- Reference to booking

### `free_diving_session_roster`
Participant roster for instructors with:
- Session and user reference
- Attendance tracking
- Check-in/check-out times
- Instructor notes
- Booking reference

## API Endpoints

### Sessions
- `GET /api/free-diving-sessions` - List sessions with filters
- `POST /api/free-diving-sessions` - Create new session (instructor only)
- `GET /api/free-diving-sessions/[id]` - Get session details
- `PATCH /api/free-diving-sessions/[id]` - Update session (instructor only)
- `DELETE /api/free-diving-sessions/[id]` - Cancel session (instructor only)

### Bookings
- `POST /api/free-diving-sessions/[id]/book` - Book a session
- `GET /api/my-bookings` - Get user's bookings

### Reviews
- `GET /api/free-diving-sessions/[id]/reviews` - Get session reviews
- `POST /api/free-diving-sessions/[id]/reviews` - Submit review

### Instructor
- `GET /api/instructor/sessions` - Get instructor's sessions and roster

## Components

### `SessionCard.tsx`
Reusable session card displaying:
- Session image
- Level badge
- Full/available indicator
- Session type, title, location
- Rating and reviews
- Price and booking button

### `SessionForm.tsx`
Form for creating/editing sessions with:
- Text inputs (title, description, location)
- Select dropdowns (type, level)
- Date/time inputs
- Number inputs (capacity, price)
- Validation and error handling

### `ReviewForm.tsx`
Form for submitting reviews with:
- Star rating selector
- Sub-rating inputs
- Title and comment fields
- Validation (minimum comment length)
- Visual feedback

## Pages

### Public Pages
- `/[locale]/free-diving/sessions` - Browse sessions
- `/[locale]/free-diving/sessions/[id]` - Session details

### User Pages (Authenticated)
- `/[locale]/free-diving/my-sessions` - My bookings
- `/[locale]/free-diving/create` - Create new session
- `/[locale]/free-diving/instructor` - Instructor dashboard

## Internationalization (i18n)

All pages and components support:
- English (en)
- Hebrew (he) with RTL layout

Labels and text are defined in i18n objects within each component.

## Security

### Row Level Security (RLS) Policies
- **Sessions**: Public can view non-cancelled sessions
- **Instructors**: Can only update their own sessions
- **Bookings**: Users can only view/create their own bookings
- **Reviews**: Users can only create reviews for completed sessions
- **Roster**: Only instructors can view their session rosters

## Payment Integration

Currently uses placeholder payment processing. To integrate with Bit API:

1. Update `/api/free-diving-sessions/[id]/book` route
2. Call Bit API with booking details
3. Handle payment response
4. Update `payment_status` and `payment_transaction_id`

Example integration:
```typescript
// Process payment via Bit API
const bitResponse = await fetch('https://bit.co.il/api/payment', {
  method: 'POST',
  headers: { Authorization: `Bearer ${BIT_API_KEY}` },
  body: JSON.stringify({
    amount: session.price_shekel,
    description: session.title,
    returnUrl: `${baseUrl}/[locale]/free-diving/sessions/${id}`,
  }),
});
```

## Features Ready for Enhancement

1. **Payment Processing**: Integrate with Bit or other payment providers
2. **Email Notifications**: Send confirmation emails on booking
3. **Capacity Management**: Add waitlist functionality
4. **Session Reschedule**: Allow instructor to reschedule sessions
5. **Cancellation Policy**: Implement refund logic
6. **Search & Sort**: Add full-text search and advanced sorting
7. **Maps Integration**: Show session location on map
8. **Admin Moderation**: Moderate reviews and manage sessions
9. **Certificates**: Issue completion certificates
10. **Session Templates**: Create repeating sessions

## Setup Instructions

### 1. Apply Database Migration
```bash
# Using Supabase CLI
supabase db push migrations/003_free_diving_sessions.sql

# Or manually in Supabase dashboard
# Copy and paste the SQL from migrations/003_free_diving_sessions.sql
```

### 2. Environment Variables
No additional env vars needed (uses existing Supabase setup)

### 3. Testing Locally
```bash
npm run dev

# Visit:
# - http://localhost:3000/en/free-diving/sessions
# - http://localhost:3000/he/free-diving/sessions
```

### 4. Create Test Data
```typescript
// Using API
const response = await fetch('/api/free-diving-sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Beginner Apnea Training',
    description: 'Learn basic apnea techniques safely',
    sessionType: 'group_apnea_training',
    level: 'beginner',
    location: 'Red Sea Beach',
    startDate: '2026-07-15',
    startTime: '09:00',
    capacity: 10,
    price: 250,
    durationMinutes: 120,
    maxDepth: 20,
  }),
});
```

## File Structure

```
src/
├── app/[locale]/free-diving/
│   ├── sessions/
│   │   ├── page.tsx                 # Browse sessions
│   │   └── [id]/
│   │       ├── page.tsx             # Session details
│   │       └── reviews/
│   │           └── route.ts         # Review API
│   ├── my-sessions/
│   │   └── page.tsx                 # User's bookings
│   ├── create/
│   │   └── page.tsx                 # Create session
│   ├── instructor/
│   │   └── page.tsx                 # Instructor dashboard
│   └── (layout and shared)
├── components/free-diving/
│   ├── SessionCard.tsx              # Session card component
│   ├── SessionForm.tsx              # Session creation form
│   └── ReviewForm.tsx               # Review submission form
└── app/api/
    ├── free-diving-sessions/
    │   ├── route.ts                 # Sessions CRUD
    │   ├── [id]/
    │   │   ├── route.ts             # Session details
    │   │   ├── book/
    │   │   │   └── route.ts         # Booking endpoint
    │   │   └── reviews/
    │   │       └── route.ts         # Reviews endpoint
    │   └── (other endpoints)
    ├── my-bookings/
    │   └── route.ts                 # User bookings
    └── instructor/
        └── sessions/
            └── route.ts             # Instructor sessions
```

## Testing Checklist

- [ ] Browse sessions with filters
- [ ] View session details
- [ ] Create a new session (as instructor)
- [ ] Book a session
- [ ] View my bookings
- [ ] Write a review (after session completes)
- [ ] View session reviews
- [ ] Instructor dashboard shows roster
- [ ] Payment status displays correctly
- [ ] RTL layout works (Hebrew)
- [ ] Responsive on mobile/tablet

## Deployment Checklist

- [ ] Run database migration on production
- [ ] Set up email service for notifications
- [ ] Configure payment provider (Bit API)
- [ ] Set up monitoring/logging
- [ ] Configure CDN for images
- [ ] Test all flows end-to-end
- [ ] Verify RLS policies
- [ ] Enable backups

## Performance Considerations

- Sessions list is paginated (10 per page)
- Reviews are lazy-loaded on session detail page
- Roster is loaded on demand in instructor dashboard
- Indexes on frequently filtered columns:
  - `session_type`, `level`, `location`, `start_date`
  - `user_id`, `status`, `payment_status`

## Future Roadmap

1. Q3 2026: Payment integration with Bit/credit cards
2. Q3 2026: Email notifications and confirmations
3. Q4 2026: Instructor analytics and reporting
4. Q4 2026: Automatic session cancellation with refunds
5. Q1 2027: Certification tracking and badges
6. Q1 2027: Session templates and recurring sessions
