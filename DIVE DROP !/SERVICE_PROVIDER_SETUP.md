# Service Provider Directory - Setup Guide

A complete service provider directory system for discovering and booking instructors, guides, rentals, and other dive-related services.

## Features

✅ **Browse & Search**
- Full-text search by name, description
- Filter by service type, category, location, rating, price
- Sort by rating, price, distance, newest
- Pagination support
- RTL/LTR support (Hebrew & English)

✅ **Provider Profiles**
- Complete provider information (name, contact, description)
- Certifications and licensing info
- Insurance verification status
- Years of experience
- Service radius

✅ **Services Management**
- Service listings with pricing
- Duration and group size limits
- Availability schedule (days & hours)
- Experience level requirements
- Booking requirements

✅ **Reviews & Ratings**
- 5-star rating system
- Detailed sub-ratings (safety, professionalism, value)
- Review moderation
- Verified booking badges
- Helpful count tracking

✅ **Gallery**
- Photo and video gallery
- Featured images
- Lightbox viewer
- Thumbnail navigation

✅ **Bookings**
- Service booking system
- Confirmation codes
- Status tracking
- Special requests
- Booking history

✅ **Admin Moderation**
- Approve/reject new providers
- Suspend providers with reason
- Moderate reviews
- Audit logging
- Verification status tracking

## Database Setup

### 1. Run Migrations

Execute these migrations in Supabase SQL editor:

```bash
# First migration - Core tables
/migrations/001_service_provider_tables.sql

# Second migration - Admin moderation tables
/migrations/002_admin_moderation_tables.sql
```

### 2. Tables Created

**Core Tables:**
- `service_providers` - Provider profiles
- `provider_services` - Services offered
- `provider_reviews` - Customer reviews
- `provider_bookings` - Booking records
- `provider_gallery` - Photos and videos
- `provider_availability` - Availability calendar

**Admin Tables:**
- `provider_moderation_queue` - Moderation requests
- `provider_suspensions` - Suspension records
- `provider_reports` - User reports
- `review_moderation_queue` - Review moderation
- `admin_audit_log` - Admin actions log
- `provider_verifications` - Verification status
- `provider_analytics` - Analytics data

## Installation

### 1. Install Dependencies

All dependencies are already in `package.json`:
```bash
npm install
```

### 2. Create Service Provider Profile

Enable the feature flag or create a user role:

```sql
-- Add admin role to a user
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE id = 'USER_ID';
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── service-providers/
│   │   │   ├── search/route.ts
│   │   │   ├── [id]/route.ts
│   │   │   ├── [id]/reviews/route.ts
│   │   │   ├── [id]/services/route.ts
│   │   │   └── [id]/gallery/route.ts
│   │   └── admin/
│   │       └── service-providers/
│   │           ├── moderation/route.ts
│   │           └── [id]/
│   │               ├── approve/route.ts
│   │               ├── reject/route.ts
│   │               └── suspend/route.ts
│   └── [locale]/
│       └── service-providers/
│           ├── page.tsx
│           ├── client.tsx
│           └── [id]/
│               ├── page.tsx
│               └── client.tsx
├── components/
│   ├── ServiceProviderCard.tsx
│   ├── ServiceProviderSearch.tsx
│   ├── ServiceProviderGallery.tsx
│   ├── ReviewList.tsx
│   └── ProviderModerationPanel.tsx
├── lib/
│   └── service-provider/
│       ├── client.ts
│       └── schemas.ts
├── store/
│   └── serviceProviderStore.ts
└── types/
    └── service-provider.ts
migrations/
├── 001_service_provider_tables.sql
└── 002_admin_moderation_tables.sql
```

## API Endpoints

### Search Providers
```
GET /api/service-providers/search?search=...&provider_type=...&min_rating=4&price_max=500
```

**Query Parameters:**
- `search` - Search term
- `provider_type` - instructor|shop|guide|boat_operator|rental|photography
- `service_category` - training|guiding|equipment|boat|photography|transport
- `location` - Location string
- `latitude`, `longitude` - For distance filtering
- `radius_km` - Search radius (default 50)
- `min_rating` - Minimum rating (0-5)
- `price_min`, `price_max` - Price range
- `is_verified` - Verified providers only
- `sort_by` - rating|price_asc|price_desc|distance|newest
- `page`, `limit` - Pagination

### Get Provider Details
```
GET /api/service-providers/:id
```

### Get Provider Reviews
```
GET /api/service-providers/:id/reviews?page=1&limit=10
POST /api/service-providers/:id/reviews
```

**POST Body:**
```json
{
  "rating": 5,
  "title": "Great instructor!",
  "comment": "Very professional and knowledgeable...",
  "safety_rating": 5,
  "professionalism_rating": 5,
  "value_rating": 4
}
```

### Get Provider Services
```
GET /api/service-providers/:id/services
```

### Get Provider Gallery
```
GET /api/service-providers/:id/gallery
```

### Admin: Get Moderation Queue
```
GET /api/admin/service-providers/moderation?status=pending
```

### Admin: Approve Provider
```
POST /api/admin/service-providers/:id/approve
Body: { "reason": "..." }
```

### Admin: Reject Provider
```
POST /api/admin/service-providers/:id/reject
Body: { "reason": "..." }
```

### Admin: Suspend Provider
```
POST /api/admin/service-providers/:id/suspend
Body: { "reason": "...", "duration_days": 30 }
```

## Usage

### Browse Providers Page

```tsx
import { ServiceProviderBrowse } from '@/app/[locale]/service-providers/client';

export default function Page() {
  return <ServiceProviderBrowse />;
}
```

Routes:
- `/:locale/service-providers` - Browse all providers
- `/:locale/service-providers/:id` - Provider profile

### Using the Store

```tsx
import { useServiceProviderStore } from '@/store/serviceProviderStore';

function MyComponent() {
  const { providers, setSearchResults, currentFilters, setFilters } = 
    useServiceProviderStore();

  const handleSearch = async (filters) => {
    const results = await serviceProviderClient.searchProviders(filters);
    setSearchResults(results);
  };

  return (
    // Your component JSX
  );
}
```

### Service Provider Client

```tsx
import { serviceProviderClient } from '@/lib/service-provider/client';

// Search providers
const results = await serviceProviderClient.searchProviders({
  search: 'instructor',
  provider_type: 'instructor',
  min_rating: 4,
});

// Get provider details
const details = await serviceProviderClient.getProviderDetails(providerId);

// Submit review
const review = await serviceProviderClient.submitReview(providerId, {
  rating: 5,
  comment: 'Great service!',
});

// Create booking
const booking = await serviceProviderClient.createBooking(serviceId, {
  booking_date: '2024-01-15',
  start_time: '09:00',
  group_size: 4,
});
```

## Customization

### Add i18n Messages

Edit `src/i18n/messages/he.json` and `en.json`:

```json
{
  "service_providers": {
    "title": "Service Providers",
    "description": "Find instructors, guides, and services",
    "search_placeholder": "Search by name..."
  }
}
```

### Provider Types

Edit `src/lib/service-provider/schemas.ts`:

```typescript
export enum ProviderType {
  INSTRUCTOR = 'instructor',
  SHOP = 'shop',
  GUIDE = 'guide',
  BOAT_OPERATOR = 'boat_operator',
  RENTAL = 'rental',
  PHOTOGRAPHY = 'photography',
}
```

### Service Categories

```typescript
export enum ServiceCategory {
  TRAINING = 'training',
  GUIDING = 'guiding',
  EQUIPMENT = 'equipment',
  BOAT = 'boat',
  PHOTOGRAPHY = 'photography',
  TRANSPORT = 'transport',
}
```

## Admin Panel

Access at `/:locale/admin/service-providers/moderation` (requires admin role)

**Features:**
- View pending approvals
- Approve/reject providers
- Suspend providers
- View moderation history
- Monitor reviews

## Security

### Row Level Security (RLS)

All tables have RLS enabled:
- Public: Can view approved providers and services
- Authenticated: Can create reviews and bookings
- Admin: Can approve/reject/suspend providers

### Validation

All endpoints use Zod schemas for validation:
- Input validation on all API endpoints
- Type-safe client and server code
- Automatic error messages

### Audit Logging

All admin actions are logged in `provider_moderation_log`:
- Approvals, rejections, suspensions
- Admin user ID and timestamp
- Action reason

## Testing

### Sample Data

Insert sample providers:

```sql
INSERT INTO service_providers (
  user_id, business_name, description, provider_type,
  phone, email, primary_location, status, is_verified
) VALUES (
  'user-uuid', 'Expert Diving School', 'Professional diving instruction',
  'instructor', '0501234567', 'info@school.com', 'Eilat',
  'approved', true
);
```

### Manual Testing

1. Browse to `/:locale/service-providers`
2. Search and filter providers
3. Click on a provider card
4. View profile, services, reviews, gallery
5. Submit a review
6. Admin: Approve/reject in moderation panel

## Performance Optimization

### Indexes

Indexes are created on:
- `status`, `provider_type`, `is_verified` - For filtering
- `average_rating` - For sorting
- `created_at` - For sorting by newest
- `provider_id` - For related queries

### Pagination

Default pagination: 20 items per page
Max limit: 100 items per page

### Caching

Implement Next.js ISR for provider pages:

```tsx
export const revalidate = 3600; // Revalidate every hour
```

## Troubleshooting

### RLS Issues

If you get "row level security" errors:
1. Check user authentication with `SELECT auth.uid()`
2. Verify RLS policies are enabled
3. Check user role in profiles table

### Missing Data

If provider details are empty:
1. Verify provider status is "approved"
2. Check provider_id foreign keys
3. Ensure user has access to data

### Search Not Working

1. Verify search filters are valid
2. Check URL parameters encoding
3. Ensure provider has approved status

## Future Enhancements

- [ ] Geographic/map view
- [ ] Booking confirmation emails
- [ ] Provider verification workflow
- [ ] Advanced analytics dashboard
- [ ] Dispute resolution system
- [ ] Payment integration (Stripe)
- [ ] Real-time notifications
- [ ] Provider rating aggregation
- [ ] Review authenticity detection
- [ ] Multi-language provider names

## Support

For issues or questions:
1. Check migrations are applied
2. Verify RLS policies
3. Check browser console for errors
4. Review API response status codes

## License

Part of DIVE DROP application
