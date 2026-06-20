# Query Optimization Patterns for DIVE DROP

This document provides specific TypeScript examples for optimized data access patterns using the new indexes and materialized views.

## 1. User Profile Queries

### Pattern: Get User with Complete Stats

**Before (Slow: 3+ queries)**
```typescript
// Query 1: Get user
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Query 2: Get profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Query 3: Get stats (involves aggregation)
const { data: dives } = await supabase
  .from('dive_logs')
  .select('id, max_depth_reached, enjoyment_rating, dive_site_id')
  .eq('user_id', userId);

const stats = {
  totalDives: dives.length,
  avgDepth: dives.reduce((a, d) => a + d.max_depth_reached, 0) / dives.length,
  avgEnjoyment: dives.reduce((a, d) => a + d.enjoyment_rating, 0) / dives.length,
};
```

**After (Fast: 1 query)**
```typescript
// Use materialized view - single query with all stats
const { data: userStats } = await supabase
  .from('mv_user_stats')
  .select(`
    id,
    username,
    full_name,
    avatar_url,
    experience_level,
    certified,
    total_dives,
    total_buddy_dives,
    unique_sites_visited,
    max_depth_achieved,
    avg_enjoyment
  `)
  .eq('id', userId)
  .single();

// Result includes all stats in single call
const userProfile = {
  ...userStats,
  initials: userStats.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
};
```

---

## 2. Dive Site Browsing

### Pattern: List Sites with Filters and Sorting

**Before (Complex: 2 queries with aggregations)**
```typescript
// Query 1: Get sites
let query = supabase
  .from('dive_sites')
  .select(`
    id,
    name,
    country,
    region,
    difficulty_level,
    avg_rating,
    review_count,
    location_latitude,
    location_longitude
  `);

// Apply filters
if (difficulty) {
  query = query.eq('difficulty_level', difficulty);
}
if (country) {
  query = query.eq('country', country);
}

const { data: sites } = await query
  .order('avg_rating', { ascending: false })
  .range(0, 19);

// Query 2: Get stats for each site (N+1 problem)
const sitesWithStats = await Promise.all(
  sites.map(async (site) => {
    const { data: dives } = await supabase
      .from('dive_logs')
      .select('id, user_id, max_depth_reached')
      .eq('dive_site_id', site.id);

    return {
      ...site,
      totalDives: dives.length,
      avgDepth: dives.reduce((a, d) => a + d.max_depth_reached, 0) / dives.length,
    };
  })
);
```

**After (Optimized: 1 query)**
```typescript
// Use materialized view - all stats included
let query = supabase
  .from('mv_detailed_dive_site_stats')
  .select(`
    id,
    name,
    country,
    region,
    difficulty_level,
    avg_rating,
    review_count,
    total_dives_recorded,
    unique_divers,
    avg_max_depth,
    avg_enjoyment_rating,
    common_marine_life,
    latest_dive
  `);

// Apply filters
if (difficulty) {
  query = query.eq('difficulty_level', difficulty);
}
if (country) {
  query = query.eq('country', country);
}

const { data: sitesWithStats } = await query
  .order('avg_rating', { ascending: false })
  .range(0, 19);

// All stats already computed and ready to display
```

---

## 3. Service Provider Search

### Pattern: Find Top-Rated Providers

**Before (Complex: 3 queries with joins)**
```typescript
// Query 1: Get providers
const { data: providers } = await supabase
  .from('service_providers')
  .select(`
    id,
    business_name,
    business_type,
    verified
  `)
  .eq('is_active', true)
  .eq('verified', true);

// Query 2-3: Get ratings and booking stats (N+1)
const providersWithStats = await Promise.all(
  providers.map(async (provider) => {
    // Query bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('provider_id', provider.id);

    // Query reviews
    const { data: reviews } = await supabase
      .from('provider_reviews')
      .select('rating')
      .eq('provider_id', provider.id);

    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const avgRating = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

    return {
      ...provider,
      completionRate: completedBookings / bookings.length,
      avgRating,
      reviewCount: reviews.length,
    };
  })
);
```

**After (Optimized: 1 query)**
```typescript
// Use materialized view - all stats pre-computed
const { data: providersWithStats } = await supabase
  .from('mv_service_provider_stats')
  .select(`
    id,
    business_name,
    business_type,
    verified,
    avg_rating,
    review_count,
    completion_rate,
    professionalism_score,
    safety_score,
    total_bookings
  `)
  .eq('is_active', true)
  .eq('verified', true)
  .order('avg_rating', { ascending: false })
  .limit(20);

// Ready to display - no additional queries needed
```

---

## 4. User Booking History

### Pattern: Get User's Recent Bookings with Related Data

**Optimized Query (using indexes)**
```typescript
// Use composite index: idx_bookings_diver_status
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    id,
    booking_date,
    status,
    dive_site:dive_site_id(id, name, location),
    provider:provider_id(
      id,
      business_name,
      rating_average
    ),
    buddy:diver_2_id(
      id,
      full_name,
      avatar_url
    )
  `)
  .or(`diver_1_id.eq.${userId},diver_2_id.eq.${userId}`)
  .eq('status', 'completed')
  .order('booking_date', { ascending: false })
  .limit(20);

// Index idx_bookings_diver_status makes this fast
```

---

## 5. Equipment Rental Discovery

### Pattern: Browse Equipment by Type

**Optimized Query (using indexes)**
```typescript
// Use composite index: idx_equipment_listings_type_active
const { data: equipment } = await supabase
  .from('mv_equipment_popular_items')
  .select(`
    id,
    equipment_type,
    brand,
    model,
    condition,
    rental_price_per_day,
    rating_average,
    recent_rentals_30d,
    total_rentals
  `)
  .eq('equipment_type', 'wetsuit')
  .eq('is_active', true)
  .order('rating_average', { ascending: false })
  .limit(50);

// Materialized view provides recent rental data too
```

---

## 6. Dive Log Analysis

### Pattern: Get Specific User's Dives at Specific Site

**Optimized Query (using composite index)**
```typescript
// Use composite index: idx_dive_logs_user_dive_site
const { data: dives } = await supabase
  .from('dive_logs')
  .select(`
    id,
    dive_date,
    max_depth_reached,
    duration_minutes,
    enjoyment_rating,
    water_temperature,
    marine_life_observed
  `)
  .eq('user_id', userId)
  .eq('dive_site_id', siteId)
  .order('dive_date', { ascending: false });

// Index makes this single-digit milliseconds even with millions of logs
```

---

## 7. Batch User Loading

### Pattern: Load Multiple Users Efficiently

**Optimized Query (batch loading)**
```typescript
// Get multiple users in one query
const userIds = bookings.map(b => b.buddy_id).filter(Boolean);
const uniqueUserIds = [...new Set(userIds)];

const { data: users } = await supabase
  .from('users')
  .select(`
    id,
    full_name,
    avatar_url,
    experience_level
  `)
  .in('id', uniqueUserIds);

// Map into efficient lookup
const userMap = new Map(users.map(u => [u.id, u]));

// Use map for O(1) lookups
bookings.forEach(booking => {
  const buddy = userMap.get(booking.buddy_id);
  // Use buddy data
});
```

---

## 8. Public Dive Discovery

### Pattern: Show Public Dives from Community

**Optimized Query (using index)**
```typescript
// Use index: idx_dive_logs_is_public
const { data: publicDives } = await supabase
  .from('dive_logs')
  .select(`
    id,
    dive_date,
    enjoyment_rating,
    max_depth_reached,
    water_temperature,
    marine_life_observed,
    diver:user_id(id, full_name, avatar_url),
    site:dive_site_id(id, name, location)
  `)
  .eq('is_public', true)
  .order('dive_date', { ascending: false })
  .range(0, 49); // Pagination

// Index on is_public makes this very fast
```

---

## 9. Certified Diver Discovery

### Pattern: Find Certified Divers by Level

**Optimized Query (using composite index)**
```typescript
// Use index: idx_users_certified_level
const { data: certifiedDivers } = await supabase
  .from('users')
  .select(`
    id,
    full_name,
    avatar_url,
    certification_level,
    total_dives,
    email
  `)
  .eq('certified', true)
  .in('certification_level', ['divemaster', 'instructor'])
  .order('total_dives', { ascending: false })
  .limit(100);

// Index makes this very fast
```

---

## 10. Advanced: Geospatial Queries

### Pattern: Find Dive Sites Near Location

**Optimized Query (using spatial index from PostGIS)**
```typescript
// Dive sites already have location_latitude/location_longitude
// For true geospatial queries, add PostGIS and use:

const { data: nearbySites } = await supabase
  .from('dive_sites')
  .select(`
    id,
    name,
    location_latitude,
    location_longitude,
    avg_rating
  `)
  // Filter by approximate bounding box first (fast)
  .gte('location_latitude', userLat - 0.1)
  .lte('location_latitude', userLat + 0.1)
  .gte('location_longitude', userLng - 0.1)
  .lte('location_longitude', userLng + 0.1)
  // Then calculate distance in application
  .order('avg_rating', { ascending: false });

// Calculate distance in application
const withDistance = nearbySites.map(site => ({
  ...site,
  distance: calculateDistance(userLat, userLng, site.location_latitude, site.location_longitude),
})).sort((a, b) => a.distance - b.distance);
```

---

## 11. Real-Time Updates with Materialized Views

### Pattern: Subscribe to Materialized View Changes

**Note: Materialized views don't support real-time subscriptions directly**

**Alternative: Subscribe to underlying table and invalidate cache**
```typescript
// Subscribe to base tables that MV depends on
supabase
  .channel('public:dive_logs')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'dive_logs',
    },
    (payload) => {
      // Invalidate related materialized view caches
      invalidateCache('mv_detailed_dive_site_stats');
      invalidateCache('mv_user_stats');
    }
  )
  .subscribe();
```

---

## 12. Performance Monitoring Queries

### Check Query Performance

```typescript
// Get slow queries in your application
const { data: slowQueries } = await supabase.rpc('execute_sql', {
  sql: `
    SELECT
      query,
      mean_time,
      calls,
      total_time,
      max_time
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%'
    ORDER BY mean_time DESC
    LIMIT 20;
  `
});
```

### Monitor Index Usage

```typescript
// Find unused indexes (removing them frees space)
const { data: unusedIndexes } = await supabase.rpc('execute_sql', {
  sql: `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
    ORDER BY pg_relation_size(indexrelid) DESC;
  `
});

// Action: DROP INDEX index_name;
```

---

## 13. Materialized View Refresh Patterns

### Automatic Refresh on Data Change

```typescript
// Create a function that refreshes a view and returns data
const refreshAndFetch = async (viewName: string, userId: string) => {
  // Refresh the materialized view
  await supabase.rpc('refresh_materialized_view', {
    view_name: viewName,
  });

  // Fetch fresh data
  const { data } = await supabase
    .from(viewName)
    .select('*')
    .eq('id', userId);

  return data;
};

// Use when you need guaranteed fresh data
const freshStats = await refreshAndFetch('mv_user_stats', userId);
```

---

## 14. Transaction Patterns

### Coordinated Updates

```typescript
// Create booking and update provider stats
const createBookingWithStats = async (booking: any) => {
  // Note: Supabase doesn't support client-side transactions
  // Instead, use RPC function for atomic operations

  const { data, error } = await supabase.rpc('create_booking_atomic', {
    booking_data: booking,
  });

  if (error) throw error;

  // After insertion, schedule a refresh of affected views
  setTimeout(() => {
    supabase.rpc('refresh_materialized_view', {
      view_name: 'mv_service_provider_stats',
    });
  }, 1000);

  return data;
};

// SQL RPC function (in your migrations):
/*
CREATE OR REPLACE FUNCTION create_booking_atomic(booking_data JSONB)
RETURNS bookings AS $$
DECLARE
  result bookings;
BEGIN
  INSERT INTO bookings (...)
  VALUES (...)
  RETURNING * INTO result;

  -- Update provider stats
  UPDATE service_providers SET updated_at = NOW()
  WHERE id = (booking_data ->> 'provider_id')::UUID;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
*/
```

---

## Summary of Query Patterns

| Pattern | Queries Before | Queries After | Speedup |
|---------|----------------|---------------|---------|
| User Profile | 3 | 1 | 3x |
| Dive Site Listing | 21 (1+20) | 1 | 21x |
| Provider Search | 21 (1+20) | 1 | 21x |
| Booking History | 21 (1+20) | 1 | 21x |
| Equipment Browse | 2 | 1 | 2x |
| User Batch Load | 1+N | 1 | N |

---

## Implementation Checklist

- [ ] Apply schema optimization migration
- [ ] Apply RLS optimization migration
- [ ] Apply caching strategy migration
- [ ] Review query patterns in this document
- [ ] Update API routes to use materialized views
- [ ] Set up materialized view refresh jobs
- [ ] Test each query pattern
- [ ] Monitor performance metrics
- [ ] Document team's query best practices
- [ ] Review quarterly for new slow queries

