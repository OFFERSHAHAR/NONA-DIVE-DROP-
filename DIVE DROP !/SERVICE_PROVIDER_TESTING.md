# Service Provider Directory - Testing Guide

## Quick Start

### 1. Database Setup

```bash
# In Supabase SQL Editor:
# Copy and paste migrations/001_service_provider_tables.sql
# Then copy and paste migrations/002_admin_moderation_tables.sql
```

### 2. Insert Sample Data

```sql
-- Create sample providers
INSERT INTO service_providers (
  id, user_id, business_name, description, provider_type,
  phone, email, primary_location, service_radius_km,
  average_rating, total_reviews, status, is_verified, latitude, longitude
) VALUES
  (
    gen_random_uuid(),
    'auth-user-id-1',
    'Eilat Diving School',
    'Professional PADI certified diving instruction for all levels. 20+ years experience in the Red Sea.',
    'instructor',
    '0501234567',
    'info@eilatdiving.com',
    'Eilat',
    50,
    4.8,
    45,
    'approved',
    true,
    29.5581,
    34.2655
  ),
  (
    gen_random_uuid(),
    'auth-user-id-2',
    'Red Sea Equipment Rental',
    'Complete diving equipment rental with maintenance and inspection. Latest gear available.',
    'rental',
    '0502345678',
    'rentals@redsea.com',
    'Eilat',
    30,
    4.5,
    28,
    'approved',
    true,
    29.5600,
    34.2670
  ),
  (
    gen_random_uuid(),
    'auth-user-id-3',
    'Coral Reef Photography',
    'Professional underwater photography for divers. High-resolution images, drone footage available.',
    'photography',
    '0503456789',
    'photos@coralreef.com',
    'Eilat',
    100,
    4.9,
    32,
    'approved',
    true,
    29.5550,
    34.2600
  );

-- Create sample services
INSERT INTO provider_services (
  provider_id, name, description, service_category, price_shekel,
  duration_minutes, group_size_min, group_size_max,
  available_mon, available_tue, available_wed, available_thu,
  available_fri, available_sat, available_sun,
  start_hour, end_hour, min_experience_level, booking_required
) VALUES
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    'PADI Open Water Certification',
    'Complete 3-day PADI certification course. Includes classroom, pool, and open water dives.',
    'training',
    2500,
    480,
    2,
    4,
    true, true, true, true, true, true, false,
    '08:00', '17:00',
    'beginner',
    true
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    'Guided Reef Dive',
    'Guided dive to local coral reefs. Perfect for experienced divers.',
    'guiding',
    350,
    120,
    2,
    8,
    true, true, true, true, true, true, true,
    '09:00', '16:00',
    'intermediate',
    true
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Red Sea Equipment Rental' LIMIT 1),
    'Complete Equipment Set',
    'Full diving equipment rental: tank, BCD, regulator, fins, mask, wetsuit.',
    'equipment',
    150,
    1440,
    1,
    10,
    true, true, true, true, true, true, true,
    '06:00', '19:00',
    'beginner',
    false
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Coral Reef Photography' LIMIT 1),
    'Underwater Photo Session',
    'Professional underwater photography session. High-resolution digital images included.',
    'photography',
    800,
    120,
    1,
    4,
    true, true, true, true, true, true, false,
    '08:00', '17:00',
    'beginner',
    true
  );

-- Create sample reviews
INSERT INTO provider_reviews (
  provider_id, reviewer_user_id, rating, title, comment,
  safety_rating, professionalism_rating, value_rating,
  is_verified_booking, moderation_status, is_helpful_count
) VALUES
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    'auth-user-id-4',
    5,
    'Best diving course ever!',
    'The instructors were very professional and patient. Highly recommended for beginners.',
    5,
    5,
    5,
    true,
    'approved',
    12
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    'auth-user-id-5',
    4,
    'Great experience',
    'Good course but a bit pricey. Still worth it for the experience and certification.',
    5,
    4,
    4,
    true,
    'approved',
    8
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Red Sea Equipment Rental' LIMIT 1),
    'auth-user-id-6',
    5,
    'Perfect rental experience',
    'Equipment was clean and well-maintained. Staff was helpful and knowledgeable.',
    5,
    5,
    5,
    true,
    'approved',
    15
  );

-- Create sample gallery items
INSERT INTO provider_gallery (
  provider_id, url, media_type, title, description, is_featured
) VALUES
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    'image',
    'Students in Training',
    'PADI certification course in progress',
    true
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Coral Reef Photography' LIMIT 1),
    'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800',
    'image',
    'Coral Reef Beauty',
    'Beautiful underwater coral formation',
    true
  );

-- Create sample availability
INSERT INTO provider_availability (
  provider_id, available_date, start_time, end_time, max_bookings
) VALUES
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    CURRENT_DATE + INTERVAL '7 days',
    '08:00',
    '17:00',
    2
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    CURRENT_DATE + INTERVAL '8 days',
    '08:00',
    '17:00',
    2
  ),
  (
    (SELECT id FROM service_providers WHERE business_name = 'Eilat Diving School' LIMIT 1),
    CURRENT_DATE + INTERVAL '9 days',
    '08:00',
    '17:00',
    1
  );
```

## Testing Scenarios

### 1. Search Functionality

**Test: Search by name**
```
GET /api/service-providers/search?search=Eilat
Expected: Returns Eilat Diving School
```

**Test: Filter by provider type**
```
GET /api/service-providers/search?provider_type=instructor
Expected: Returns only instructor type providers
```

**Test: Filter by rating**
```
GET /api/service-providers/search?min_rating=4
Expected: Returns providers with rating >= 4
```

**Test: Filter by price range**
```
GET /api/service-providers/search?price_min=100&price_max=500
Expected: Returns providers with services in range
```

**Test: Sort by rating**
```
GET /api/service-providers/search?sort_by=rating
Expected: Returns providers sorted by rating (highest first)
```

**Test: Pagination**
```
GET /api/service-providers/search?page=1&limit=10
Expected: Returns 10 providers with pagination info
```

### 2. Provider Details

**Test: Get provider details**
```
GET /api/service-providers/:provider_id
Expected: Returns provider info, services, reviews, gallery
```

**Test: Get provider services**
```
GET /api/service-providers/:provider_id/services
Expected: Returns all active services for provider
```

**Test: Get provider reviews**
```
GET /api/service-providers/:provider_id/reviews?page=1&limit=10
Expected: Returns approved reviews with pagination
```

**Test: Get provider gallery**
```
GET /api/service-providers/:provider_id/gallery
Expected: Returns gallery items sorted by display order
```

### 3. Reviews

**Test: Submit review (authenticated user)**
```bash
curl -X POST /api/service-providers/:provider_id/reviews \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Great!",
    "comment": "Excellent service and professional staff",
    "safety_rating": 5,
    "professionalism_rating": 5,
    "value_rating": 4
  }'
```

Expected: Review created with status "pending" (for moderation)

### 4. UI Testing

**Browse Page**
1. Navigate to `/en/service-providers`
2. See list of providers
3. Search by name
4. Apply filters
5. Sort results
6. Paginate through results

**Provider Profile**
1. Click on provider card
2. See full profile information
3. View services with prices
4. Read reviews and ratings
5. View gallery (click thumbnails)
6. See availability

**Responsive Design**
1. Test on mobile (375px width)
2. Test on tablet (768px width)
3. Test on desktop (1200px width)
4. Check touch targets are >= 44px

**RTL Support**
1. Switch to Hebrew locale
2. Verify text direction is right-to-left
3. Check components are mirrored correctly
4. Verify form inputs work properly

### 5. Admin Functions

**Test: Get moderation queue**
```
GET /api/admin/service-providers/moderation?status=pending
Expected: Returns pending providers (admin only)
```

**Test: Approve provider**
```bash
curl -X POST /api/admin/service-providers/:provider_id/approve \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason": "All documents verified"}'
```

Expected: Provider status changes to "approved"

**Test: Reject provider**
```bash
curl -X POST /api/admin/service-providers/:provider_id/reject \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Missing required documents"}'
```

Expected: Provider status changes to "archived"

**Test: Suspend provider**
```bash
curl -X POST /api/admin/service-providers/:provider_id/suspend \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Inappropriate behavior", "duration_days": 30}'
```

Expected: Provider status changes to "suspended", suspension record created

## Performance Testing

### Search Performance

```sql
-- Test search with 1000 providers
EXPLAIN ANALYZE
SELECT * FROM service_providers
WHERE status = 'approved'
  AND average_rating >= 4
  AND business_name ILIKE '%diving%'
ORDER BY average_rating DESC
LIMIT 20;
```

Expected: Uses indexes efficiently

### Review Aggregation

```sql
-- Test review count and rating updates
SELECT 
  provider_id,
  COUNT(*) as review_count,
  AVG(rating) as avg_rating
FROM provider_reviews
WHERE moderation_status = 'approved'
GROUP BY provider_id
LIMIT 10;
```

### Pagination Performance

```bash
# Test paginating through 1000+ results
for page in {1..50}; do
  curl "http://localhost:3000/api/service-providers/search?page=$page&limit=20"
done
```

## Error Scenarios

### Test: Invalid provider ID
```
GET /api/service-providers/invalid-id
Expected: 404 - Provider not found
```

### Test: Unauthorized admin access
```
GET /api/admin/service-providers/moderation
Expected: 401 - Unauthorized
```

### Test: Invalid search filters
```
GET /api/service-providers/search?min_rating=10
Expected: 400 - Validation error
```

### Test: Duplicate review
```bash
# Submit review twice from same user
curl -X POST /api/service-providers/:id/reviews \
  -d '{"rating": 5, "comment": "Great!"}'
curl -X POST /api/service-providers/:id/reviews \
  -d '{"rating": 5, "comment": "Great!"}'
Expected: 400 - Unique constraint violation or 409 - Conflict
```

## Browser Console Testing

Open browser DevTools (F12) and check:

1. No console errors
2. No network 5xx errors
3. Network requests are < 2 seconds
4. Images load properly
5. Responsive layout adjusts correctly

## Automated Testing (Optional)

```typescript
// Example Playwright test
import { test, expect } from '@playwright/test';

test('search providers', async ({ page }) => {
  await page.goto('/en/service-providers');
  
  // Search
  await page.fill('input[placeholder*="Search"]', 'diving');
  await page.click('button:has-text("Search")');
  
  // Wait for results
  await page.waitForSelector('[data-testid="provider-card"]');
  
  // Verify results
  const cards = await page.$$('[data-testid="provider-card"]');
  expect(cards.length).toBeGreaterThan(0);
});

test('view provider profile', async ({ page }) => {
  await page.goto('/en/service-providers');
  
  // Click first provider
  await page.click('[data-testid="provider-card"]:first-child');
  
  // Wait for profile to load
  await page.waitForSelector('h1');
  
  // Verify details
  const name = await page.textContent('h1');
  expect(name).toBeTruthy();
});
```

## Checklist Before Launch

- [ ] Database migrations applied
- [ ] Sample data inserted
- [ ] Search works with all filters
- [ ] Provider profiles display correctly
- [ ] Reviews show and can be submitted
- [ ] Gallery displays and lightbox works
- [ ] Pagination works properly
- [ ] RTL/LTR works for both languages
- [ ] Responsive design on all breakpoints
- [ ] Admin approval/rejection works
- [ ] Error handling works correctly
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] RLS policies are secure

## Troubleshooting

**Providers not showing:**
1. Check if status = 'approved' in DB
2. Verify RLS policies allow SELECT
3. Check user authentication

**Reviews not displaying:**
1. Verify moderation_status = 'approved'
2. Check provider_reviews table has data
3. Verify foreign key constraints

**Gallery not loading:**
1. Check image URLs are valid
2. Verify CORS settings if external images
3. Check display_order values

**Search returning nothing:**
1. Verify search parameters
2. Check if providers exist with matching criteria
3. Enable query logging to debug
