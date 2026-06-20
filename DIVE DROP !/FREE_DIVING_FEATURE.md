# Free Diving Partner Matching - Complete Feature Implementation

## Overview

A comprehensive free diving partner matching system built into DIVE DROP that allows users to:
- Find free diving partners (בן זוג) 
- Find instructors (מחפש מדריך)
- Create and manage listings
- Express interest and reveal contact information
- Browse filtered listings by location, level, date, and listing type

## File Structure

### Types & Validations
```
src/types/free-diving.ts                          # Type definitions
src/lib/validations/free-diving.ts               # Zod validation schemas
```

### API Routes
```
src/app/api/free-diving/
├── listings/route.ts                             # GET/POST listings
├── listings/[id]/route.ts                        # GET/PUT/DELETE specific listing
├── interests/route.ts                            # GET/POST interest records
├── interests/[id]/route.ts                       # GET/PUT/DELETE interest (reveal contact)
└── my-listings/route.ts                          # GET user's listings
```

### Frontend Components
```
src/components/free-diving/
├── FreeDivingListingCard.tsx                     # Display single listing
├── FreeDivingListingForm.tsx                     # Create/edit listing form
├── FreeDivingFilters.tsx                         # Search/filter panel
├── ContactRevealModal.tsx                        # Confirm contact reveal
└── index.ts                                      # Component exports
```

### Pages
```
src/app/[locale]/free-diving/
├── page.tsx                                      # Main page (browse & manage)
├── FreeDivingClient.tsx                          # Client component with logic
├── my-listings/
│   └── page.tsx                                  # User's listings page (SSR)
```

### Store
```
src/store/free-diving-store.ts                    # Zustand state management
```

## Features

### 1. Listing Types
Three main types of listings users can create:

**Instructor (מחפש מדריך)**
- Subtypes: apnea-training, courses, competition, depth
- For those seeking professional instruction
- Displays instructor type badge

**Partner (מחפש בן זוג)**
- Looking for a dive partner
- Most common listing type
- Configurable participant count

**Group Session (זימון קבוצה)**
- Organizing a group event
- Allows multiple participants
- Ideal for club or community events

### 2. Filters
Users can filter by:
- Listing type (instructor/partner/group)
- Instructor type (if applicable)
- Location (free text search)
- Experience level (beginner/intermediate/advanced/professional)
- Date range (start and end dates)

### 3. Contact Management
Secure contact reveal system:
- Contacts hidden by default
- Must express interest first
- User can reveal contact after expressing interest
- System tracks which contacts have been revealed

### 4. Interest System
- Express interest in a listing
- Track who's interested in your listing
- View interest count on your listings
- Message when expressing interest (optional)

## Database Schema Requirements

Create these tables in Supabase:

```sql
-- Free diving listings table
CREATE TABLE free_diving_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  listing_type VARCHAR NOT NULL CHECK (listing_type IN ('instructor', 'partner', 'group-session')),
  instructor_type VARCHAR CHECK (instructor_type IN ('apnea-training', 'courses', 'competition', 'depth')),
  title VARCHAR(100) NOT NULL,
  description VARCHAR(1000),
  location VARCHAR(100) NOT NULL,
  experience_level VARCHAR NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  max_participants INTEGER DEFAULT 4,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  contact_email VARCHAR,
  contact_phone VARCHAR,
  contact_hidden BOOLEAN DEFAULT true,
  language_preference VARCHAR DEFAULT 'he',
  notes VARCHAR(500),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Interest/request table
CREATE TABLE free_diving_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES free_diving_listings(id),
  interested_user_id UUID NOT NULL REFERENCES auth.users(id),
  contact_revealed BOOLEAN DEFAULT false,
  message VARCHAR(500),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(listing_id, interested_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_free_diving_listings_user ON free_diving_listings(user_id);
CREATE INDEX idx_free_diving_listings_type ON free_diving_listings(listing_type);
CREATE INDEX idx_free_diving_listings_active ON free_diving_listings(is_active);
CREATE INDEX idx_free_diving_interests_user ON free_diving_interests(interested_user_id);
CREATE INDEX idx_free_diving_interests_listing ON free_diving_interests(listing_id);
```

## API Endpoints

### Listings

**GET /api/free-diving/listings**
- List all active listings with optional filters
- Query params: listing_type, instructor_type, location, experience_level, start_date, end_date, page, limit
- Returns: { data: [], pagination: { page, limit, total, totalPages } }

**POST /api/free-diving/listings**
- Create new listing
- Requires: title, location, listing_type, experience_level, start_date, end_date
- Returns: created listing object
- Auth: Required

**GET /api/free-diving/listings/[id]**
- Get specific listing with user profile
- Returns: listing object with relations
- Auth: Public

**PUT /api/free-diving/listings/[id]**
- Update listing (owner only)
- Returns: updated listing
- Auth: Required + ownership check

**DELETE /api/free-diving/listings/[id]**
- Delete listing (owner only)
- Returns: { success: true }
- Auth: Required + ownership check

### Interests

**GET /api/free-diving/interests**
- Get user's interests (what they're interested in)
- Returns: array of interests with related listings
- Auth: Required

**POST /api/free-diving/interests**
- Express interest in a listing
- Body: { listing_id: string, message?: string }
- Returns: created interest object
- Auth: Required

**GET /api/free-diving/interests/[id]**
- Get interest details with full listing info
- Returns: interest with listing and contact info
- Auth: Required + ownership check

**PUT /api/free-diving/interests/[id]**
- Reveal contact for this interest
- Body: { contact_revealed: true }
- Returns: updated interest
- Auth: Required + ownership check

**DELETE /api/free-diving/interests/[id]**
- Remove interest
- Returns: { success: true }
- Auth: Required + ownership check

### My Listings

**GET /api/free-diving/my-listings**
- Get current user's listings with interest count
- Returns: array of listings with interest_count field
- Auth: Required

## UI/UX Features

### Browse Listings Tab
- Grid display of available listings
- Color-coded listing type badges
- Quick details: location, level, dates, participant count
- Action buttons: "Express Interest" or "Reveal Contact"
- Responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)

### My Listings Tab
- List view of user's listings
- Shows interest count prominently
- Quick delete action
- "Create New Listing" button
- Form creation with inline validation

### Listing Form
- All required fields with validation
- Conditional instructor_type field for instructor listings
- Date-time pickers
- Contact privacy toggle
- Experience level and max participants dropdowns

### Contact Reveal Modal
- Confirmation dialog before revealing contact
- Shows listing title
- Clear action buttons
- Explains what happens (listing owner will be notified)

## State Management (Zustand)

The feature uses Zustand for client-side state:

```typescript
useFreeDivingStore provides:
- listings: all fetched listings
- myListings: current user's listings
- myInterests: interests user has expressed
- filters: current filter state
- revealedContacts: set of revealed contact IDs
- UI state: isLoading, showContactModal, etc.

Actions:
- Listing management (set, add, update, remove)
- Interest management (set, add, remove)
- Filter management (set, clear)
- Contact reveal tracking
```

## Navigation Integration

The feature is integrated into the header navigation:
- Menu item: "Free Diving" / "צלילה חופשית"
- Icon: wave
- Location: `/[locale]/free-diving`
- Added to Header.tsx navigationItems array

## Bilingual Support

Full Hebrew (he) and English (en) support:
- All labels and messages translated
- RTL layout support for Hebrew
- ISO locale detection via next-intl

### Language Keys Used:
- Listing types: instructor, partner, group-session
- Instructor types: apnea-training, courses, competition, depth
- Experience levels: beginner, intermediate, advanced, professional

## Error Handling

- Zod validation on all inputs (client + server)
- Clear error messages in both languages
- Permission checks (ownership verification)
- Graceful handling of network errors
- User-friendly fallback UI

## Performance Optimizations

- Pagination support (limit: 1-50, default 12)
- Database indexes on frequently queried fields
- Efficient component re-renders with React hooks
- Lazy loading of listings on demand
- Client-side store for offline state management

## Security Features

- Owner-only modifications (PUT/DELETE)
- Contact info hidden until explicitly revealed
- Interest system prevents spam
- User authentication required for write operations
- CORS and standard Next.js security practices

## Mobile Responsiveness

- Grid layout adapts to screen size
- Form fields optimize for mobile input
- Touch-friendly button sizing
- Modal adapts to viewport
- Bottom navigation not blocking content

## Future Enhancement Ideas

1. **Messaging System**: Direct messaging between interested parties
2. **Rating/Reviews**: Review system for completed dives
3. **Safe Buddy Network**: Trust connections with verified buddies
4. **Calendar Integration**: Sync with calendar apps
5. **Map View**: Show listings on map by location
6. **Notifications**: Push notifications for new interests
7. **Advanced Matching**: Algorithm-based buddy suggestions
8. **Certification Verification**: Verify diving certifications
9. **Equipment Sharing**: Equipment requirement/availability tracking
10. **Social Profiles**: Linked social media for verification

## Testing Checklist

Before deployment:

- [ ] Create listing with all types (instructor/partner/group)
- [ ] Filter listings by type, location, level
- [ ] Express interest in a listing
- [ ] Reveal contact and verify info displayed
- [ ] Edit own listing
- [ ] Delete own listing
- [ ] View interest count on my listings
- [ ] Verify cannot delete other user's listings
- [ ] Test responsive design on mobile
- [ ] Test RTL layout in Hebrew
- [ ] Test form validation errors
- [ ] Test pagination (12+ listings)
- [ ] Verify contact info stays hidden until revealed

## Deployment Checklist

1. Create Supabase tables (see schema above)
2. Create indexes on tables
3. Set up RLS (Row Level Security) policies
4. Test API routes with Postman/curl
5. Deploy to Vercel
6. Test in production environment
7. Monitor error logs
8. Gather user feedback

## Code Quality

- TypeScript throughout for type safety
- Consistent error handling patterns
- Follows project conventions (AppIcon, clsx, etc.)
- Zod validation schemas for data integrity
- Clean component composition
- Proper async/await patterns

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

---

**Status**: Ready for deployment
**Created**: June 20, 2026
**Language Support**: Hebrew, English
**Estimated LOC**: ~2,500 lines
