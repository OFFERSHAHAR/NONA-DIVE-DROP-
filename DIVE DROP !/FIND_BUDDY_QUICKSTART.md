# Find Buddy Feature - Quick Start Guide

## Setup Instructions

### 1. Run Database Migration
```bash
# Using Supabase CLI
supabase migration up

# Or manually run the SQL in Supabase console
# Copy-paste contents of: supabase/migrations/20260620_create_buddy_listings.sql
```

### 2. Verify Installation
All files are already created and ready to use:
```
✓ Database migration (20260620_create_buddy_listings.sql)
✓ Type definitions (src/types/buddy.ts)
✓ Validations (src/lib/validations/buddy.ts)
✓ Zustand store (src/store/buddy-store.ts)
✓ API routes (src/app/api/buddy/*)
✓ Components (src/components/find-buddy/*)
✓ Pages (src/app/[locale]/find-buddy/*)
```

### 3. Access the Feature
Navigate to:
- Hebrew: `http://localhost:3000/he/find-buddy`
- English: `http://localhost:3000/en/find-buddy`

## Usage

### For Users

#### Browse Listings
1. Click "Browse Listings" tab
2. (Optional) Use filters to narrow results
3. Click "Reveal Contact" to see buddy's info
4. Click "Interested" to express interest
5. They'll see your interest in their "My Listings"

#### Create a Listing
1. Click "My Listings" tab
2. Click "Create New Listing" button
3. Fill in details:
   - Title (required)
   - Location (required)
   - Experience level (required)
   - Dive type (required)
   - Max divers
   - Dates (required)
   - Contact info (optional, hidden by default)
4. Submit form

#### Manage Listings
1. View all your listings in "My Listings" tab
2. Click "Delete" to remove a listing
3. See who's expressed interest (shown as interest count)

### For Developers

#### API Usage

**Browse Listings:**
```bash
GET /api/buddy/listings?location=Eilat&experience_level=advanced&dive_type=reef
```

**Create Listing:**
```bash
POST /api/buddy/listings
Content-Type: application/json

{
  "title": "Looking for advanced reef divers",
  "description": "Weekend trip to Eilat",
  "location": "Eilat",
  "experience_level": "advanced",
  "dive_type": "reef",
  "max_divers": 4,
  "start_date": "2024-06-22T08:00:00",
  "end_date": "2024-06-22T14:00:00",
  "contact_email": "user@example.com",
  "contact_phone": "+972501234567",
  "contact_hidden": true
}
```

**Express Interest:**
```bash
POST /api/buddy/interests
Content-Type: application/json

{
  "listing_id": "uuid-here",
  "message": "Hi! I'm interested in this dive"
}
```

**Get My Listings:**
```bash
GET /api/buddy/my-listings
```

#### Component Usage

```tsx
import { BuddyListingCard } from '@/components/find-buddy';

<BuddyListingCard
  listing={listingData}
  isRTL={true}
  onExpressInterest={handleInterest}
  onRevealContact={handleReveal}
  isContactRevealed={false}
  isInterested={false}
/>
```

## Key Features

### Security
- Contact info hidden until revealed
- Ownership checks on all operations
- Row-level security on database
- Zod validation on all inputs

### Internationalization
- Full Hebrew/English support
- RTL layout handling
- Locale-aware formatting
- Automatic date localization

### Responsive
- Mobile-first design
- Works on all devices
- Touch-friendly interfaces
- Adaptive layouts

## Common Tasks

### Filter by Experience Level
```bash
GET /api/buddy/listings?experience_level=intermediate
```

### Find Boat Dives Only
```bash
GET /api/buddy/listings?dive_type=boat
```

### Search by Location
```bash
GET /api/buddy/listings?location=Dead%20Sea
```

### Combine Filters
```bash
GET /api/buddy/listings?location=Eilat&experience_level=advanced&dive_type=reef
```

### Check Who's Interested
```bash
GET /api/buddy/my-listings
# Returns your listings with interest_count property
```

### Reveal Contact Info
Your contact info is automatically revealed when someone clicks "Reveal Contact" on your listing. You'll see them in "My Listings" tab.

## Troubleshooting

### "Unauthorized" Error
- Make sure you're signed in
- Check browser's developer console for auth errors

### No Listings Showing
- Create a test listing first
- Check if you have any active listings
- Try removing filters

### Contact Info Not Showing
- Click "Reveal Contact" button
- Contact modal will appear
- Click "Reveal" in the modal

### Form Won't Submit
- Check all required fields (marked with *)
- Ensure end date is after start date
- Check browser console for validation errors

### RTL Issues
- Check if locale is 'he' (Hebrew)
- Refresh page to reload component
- Clear browser cache

## Environment Check

Verify everything works:
```bash
# 1. Check database connection
supabase status

# 2. Check migrations are applied
supabase migration list

# 3. Run dev server
npm run dev

# 4. Navigate to feature
# http://localhost:3000/he/find-buddy (Hebrew)
# http://localhost:3000/en/find-buddy (English)

# 5. Test authentication
# (Must be signed in to use feature)
```

## Database Verification

In Supabase console, verify tables exist:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('buddy_listings', 'buddy_interests', 'buddy_connections');

-- Should return 3 rows

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('buddy_listings', 'buddy_interests', 'buddy_connections');

-- Should show 't' for rowsecurity
```

## Performance Tips

1. **Filters**: Use location or experience level first for fastest results
2. **Pagination**: Results limited to 12 per page (configurable)
3. **Caching**: Clear browser cache if seeing stale data
4. **Database**: Monitor RLS policy performance in production

## Next Steps

1. Test in development
2. Deploy to staging
3. Monitor error logs
4. Gather user feedback
5. Consider enhancements:
   - User reviews/ratings
   - Messaging system
   - Notification emails
   - Buddy verification

## Support

For issues:
1. Check browser console for errors
2. Check Supabase logs
3. Verify migration ran successfully
4. Check user authentication status
5. Verify RLS policies in Supabase

## Documentation Files

- `FIND_BUDDY_IMPLEMENTATION.md` - Complete technical docs
- `FIND_BUDDY_QUICKSTART.md` - This file
- `/src/types/buddy.ts` - TypeScript types
- `/src/lib/validations/buddy.ts` - Zod schemas
- `/src/store/buddy-store.ts` - State management
