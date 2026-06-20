# Supabase Index Reference Guide

Complete reference of all indexes created in the optimization, their purposes, and usage patterns.

---

## Index Summary

**Total New Indexes: 25+**
**Total Materialized Views: 5**
**Expected Storage Impact: ~250MB for indexes + ~500MB for views = 750MB total**

---

## User & Profile Indexes

### 1. `idx_users_certified_level`
```sql
CREATE INDEX idx_users_certified_level
  ON users(certified, certification_level)
  WHERE certified = true;
```
**Purpose:** Find certified divers at specific levels
**Query Pattern:**
```sql
SELECT * FROM users WHERE certified = true AND certification_level = 'divemaster';
```
**Use Case:** Instructor discovery, certification filtering
**Expected Usage:** 10-50 scans/day
**Size:** ~5MB

---

### 2. `idx_users_created_at`
```sql
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```
**Purpose:** Time-based sorting and filtering
**Query Pattern:**
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 100;
```
**Use Case:** Recent users list, user growth analytics
**Expected Usage:** 50-100 scans/day
**Size:** ~10MB

---

### 3. `idx_users_experience_level`
```sql
CREATE INDEX idx_users_experience_level ON users(experience_level);
```
**Purpose:** Filter users by diving experience
**Query Pattern:**
```sql
SELECT * FROM users WHERE experience_level = 'advanced' LIMIT 50;
```
**Use Case:** Buddy matching, skill-based filtering
**Expected Usage:** 20-50 scans/day
**Size:** ~3MB

---

### 4. `idx_profiles_certified_experience`
```sql
CREATE INDEX idx_profiles_certified_experience
  ON profiles(certified, experience_level)
  WHERE certified = true;
```
**Purpose:** Find qualified divers with specific experience
**Query Pattern:**
```sql
SELECT * FROM profiles WHERE certified = true AND experience_level IN ('advanced', 'professional');
```
**Use Case:** Guide matching, group composition
**Expected Usage:** 30-60 scans/day
**Size:** ~5MB

---

### 5. `idx_profiles_updated_at`
```sql
CREATE INDEX idx_profiles_updated_at ON profiles(updated_at DESC);
```
**Purpose:** Find recently active profiles
**Query Pattern:**
```sql
SELECT * FROM profiles ORDER BY updated_at DESC LIMIT 20;
```
**Use Case:** Activity feeds, recent updates
**Expected Usage:** 10-30 scans/day
**Size:** ~8MB

---

### 6. `idx_profiles_privacy_level`
```sql
CREATE INDEX idx_profiles_privacy_level
  ON profiles(privacy_level)
  WHERE privacy_level = 'public';
```
**Purpose:** Quickly identify publicly visible profiles
**Query Pattern:**
```sql
SELECT * FROM profiles WHERE privacy_level = 'public' LIMIT 100;
```
**Use Case:** Community discovery, public profile browsing
**Expected Usage:** 100-200 scans/day
**Size:** ~5MB

---

## Dive Log Indexes

### 7. `idx_dive_logs_user_dive_site`
```sql
CREATE INDEX idx_dive_logs_user_dive_site
  ON dive_logs(user_id, dive_site_id);
```
**Purpose:** Find specific user's dives at specific sites
**Query Pattern:**
```sql
SELECT * FROM dive_logs WHERE user_id = $1 AND dive_site_id = $2;
```
**Use Case:** User history, site-specific user analytics, JOIN optimization
**Expected Usage:** 500-1000 scans/day
**Size:** ~20MB
**Performance Impact:** Critical for joins, huge impact

---

### 8. `idx_dive_logs_dive_site_date`
```sql
CREATE INDEX idx_dive_logs_dive_site_date
  ON dive_logs(dive_site_id, dive_date DESC);
```
**Purpose:** Get recent dives at a specific site
**Query Pattern:**
```sql
SELECT * FROM dive_logs WHERE dive_site_id = $1 ORDER BY dive_date DESC LIMIT 20;
```
**Use Case:** Site history, condition tracking, recent activity
**Expected Usage:** 200-500 scans/day
**Size:** ~18MB
**Performance Impact:** Essential for site analytics

---

### 9. `idx_dive_logs_is_public`
```sql
CREATE INDEX idx_dive_logs_is_public
  ON dive_logs(is_public)
  WHERE is_public = true;
```
**Purpose:** Discover public dives from community
**Query Pattern:**
```sql
SELECT * FROM dive_logs WHERE is_public = true ORDER BY dive_date DESC LIMIT 50;
```
**Use Case:** Community feed, dive discovery, social features
**Expected Usage:** 100-300 scans/day
**Size:** ~8MB

---

### 10. `idx_dive_logs_instructor_id`
```sql
CREATE INDEX idx_dive_logs_instructor_id ON dive_logs(instructor_id);
```
**Purpose:** Find all dives led by specific instructor
**Query Pattern:**
```sql
SELECT * FROM dive_logs WHERE instructor_id = $1;
```
**Use Case:** Instructor profile, training history, certification tracking
**Expected Usage:** 50-100 scans/day
**Size:** ~5MB

---

## Dive Site Indexes

### 11. `idx_dive_sites_location_idx`
```sql
CREATE INDEX dive_sites_location_idx
  ON dive_sites(location_latitude, location_longitude);
```
**Purpose:** Geographic-based lookups and proximity searches
**Query Pattern:**
```sql
SELECT * FROM dive_sites
  WHERE location_latitude BETWEEN $1 AND $2
  AND location_longitude BETWEEN $3 AND $4;
```
**Use Case:** Map-based browsing, nearby sites
**Expected Usage:** 50-150 scans/day
**Size:** ~8MB

---

### 12. `idx_dive_sites_difficulty_idx`
```sql
CREATE INDEX dive_sites_difficulty_idx ON dive_sites(difficulty_level);
```
**Purpose:** Filter sites by difficulty level
**Query Pattern:**
```sql
SELECT * FROM dive_sites WHERE difficulty_level = 'beginner' LIMIT 50;
```
**Use Case:** Skill-based site discovery, level-appropriate recommendations
**Expected Usage:** 100-200 scans/day
**Size:** ~3MB

---

### 13. `idx_dive_sites_country_idx`
```sql
CREATE INDEX dive_sites_country_idx ON dive_sites(country);
```
**Purpose:** Browse sites by country
**Query Pattern:**
```sql
SELECT * FROM dive_sites WHERE country = 'Thailand' ORDER BY avg_rating DESC;
```
**Use Case:** Destination browsing, location-based search
**Expected Usage:** 200-500 scans/day
**Size:** ~8MB

---

### 14. `idx_dive_sites_rating_idx`
```sql
CREATE INDEX dive_sites_rating_idx ON dive_sites(avg_rating DESC);
```
**Purpose:** Sort and filter by popularity
**Query Pattern:**
```sql
SELECT * FROM dive_sites ORDER BY avg_rating DESC LIMIT 50;
```
**Use Case:** Best-rated sites listing, quality-based discovery
**Expected Usage:** 50-150 scans/day
**Size:** ~8MB

---

### 15. `idx_dive_sites_region_country`
```sql
CREATE INDEX idx_dive_sites_region_country
  ON dive_sites(region, country);
```
**Purpose:** Hierarchical location-based filtering
**Query Pattern:**
```sql
SELECT * FROM dive_sites WHERE country = 'Mexico' AND region = 'Baja';
```
**Use Case:** Regional browsing, geographic refinement
**Expected Usage:** 50-100 scans/day
**Size:** ~8MB

---

### 16. `idx_dive_sites_difficulty_rating`
```sql
CREATE INDEX idx_dive_sites_difficulty_rating
  ON dive_sites(difficulty_level, avg_rating DESC);
```
**Purpose:** Find best-rated sites at specific difficulty
**Query Pattern:**
```sql
SELECT * FROM dive_sites
  WHERE difficulty_level = 'advanced'
  ORDER BY avg_rating DESC LIMIT 20;
```
**Use Case:** Quality filtering by difficulty, expert site discovery
**Expected Usage:** 100-200 scans/day
**Size:** ~8MB

---

### 17. `idx_dive_sites_suitability`
```sql
CREATE INDEX idx_dive_sites_suitability
  ON dive_sites(suitability_beginner, suitability_intermediate, suitability_advanced);
```
**Purpose:** Identify sites suitable for specific skill levels
**Query Pattern:**
```sql
SELECT * FROM dive_sites WHERE suitability_beginner = true;
```
**Use Case:** Skill-level recommendations, appropriate site filtering
**Expected Usage:** 30-80 scans/day
**Size:** ~5MB

---

## Booking Indexes

### 18. `idx_bookings_diver_1`
```sql
CREATE INDEX idx_bookings_diver_1 ON bookings(diver_1_id);
```
**Purpose:** Find all bookings for a user
**Query Pattern:**
```sql
SELECT * FROM bookings WHERE diver_1_id = $1;
```
**Use Case:** User's booking history, booking retrieval
**Expected Usage:** 1000-5000 scans/day
**Size:** ~15MB
**Performance Impact:** Critical

---

### 19. `idx_bookings_diver_2`
```sql
CREATE INDEX idx_bookings_diver_2 ON bookings(diver_2_id);
```
**Purpose:** Find bookings where user is second diver
**Query Pattern:**
```sql
SELECT * FROM bookings WHERE diver_2_id = $1;
```
**Use Case:** Buddy's booking history, role-specific queries
**Expected Usage:** 1000-5000 scans/day
**Size:** ~15MB
**Performance Impact:** Critical

---

### 20. `idx_bookings_provider`
```sql
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
```
**Purpose:** Get all bookings for a service provider
**Query Pattern:**
```sql
SELECT * FROM bookings WHERE provider_id = $1;
```
**Use Case:** Provider's booking list, business analytics
**Expected Usage:** 100-500 scans/day
**Size:** ~10MB

---

### 21. `idx_bookings_status`
```sql
CREATE INDEX idx_bookings_status ON bookings(status);
```
**Purpose:** Filter bookings by status
**Query Pattern:**
```sql
SELECT * FROM bookings WHERE status = 'completed';
```
**Use Case:** Status-based filtering, workflow queries
**Expected Usage:** 200-500 scans/day
**Size:** ~8MB

---

### 22. `idx_bookings_date`
```sql
CREATE INDEX idx_bookings_date ON bookings(booking_date);
```
**Purpose:** Time-based filtering
**Query Pattern:**
```sql
SELECT * FROM bookings WHERE booking_date >= $1;
```
**Use Case:** Upcoming bookings, calendar views
**Expected Usage:** 100-300 scans/day
**Size:** ~10MB

---

### 23. `idx_bookings_diver_status`
```sql
CREATE INDEX idx_bookings_diver_status
  ON bookings(diver_1_id, status);
```
**Purpose:** Composite search: user's bookings with specific status
**Query Pattern:**
```sql
SELECT * FROM bookings
  WHERE diver_1_id = $1 AND status = 'pending';
```
**Use Case:** Filtered booking history, user dashboard
**Expected Usage:** 500-1000 scans/day
**Size:** ~12MB
**Performance Impact:** High

---

### 24. `idx_bookings_diver_2_status`
```sql
CREATE INDEX idx_bookings_diver_2_status
  ON bookings(diver_2_id, status);
```
**Purpose:** Composite search for second diver
**Query Pattern:**
```sql
SELECT * FROM bookings
  WHERE diver_2_id = $1 AND status = 'confirmed';
```
**Use Case:** Buddy booking status, bilateral view
**Expected Usage:** 500-1000 scans/day
**Size:** ~12MB
**Performance Impact:** High

---

### 25. `idx_bookings_provider_date`
```sql
CREATE INDEX idx_bookings_provider_date
  ON bookings(provider_id, booking_date DESC);
```
**Purpose:** Get provider's calendar
**Query Pattern:**
```sql
SELECT * FROM bookings
  WHERE provider_id = $1
  ORDER BY booking_date DESC;
```
**Use Case:** Provider calendar, schedule management
**Expected Usage:** 100-300 scans/day
**Size:** ~12MB
**Performance Impact:** High

---

### 26. `idx_bookings_dive_site_date`
```sql
CREATE INDEX idx_bookings_dive_site_date
  ON bookings(dive_site_id, booking_date);
```
**Purpose:** Site-based booking history
**Query Pattern:**
```sql
SELECT * FROM bookings
  WHERE dive_site_id = $1
  ORDER BY booking_date;
```
**Use Case:** Site popularity, booking trends
**Expected Usage:** 50-150 scans/day
**Size:** ~10MB

---

## Service Provider Indexes

### 27. `idx_service_providers_verified_active`
```sql
CREATE INDEX idx_service_providers_verified_active
  ON service_providers(verified, is_active)
  WHERE verified = true AND is_active = true;
```
**Purpose:** Find verified, active service providers
**Query Pattern:**
```sql
SELECT * FROM service_providers
  WHERE verified = true AND is_active = true;
```
**Use Case:** Provider marketplace, verified listings
**Expected Usage:** 100-300 scans/day
**Size:** ~5MB
**Performance Impact:** High (marketplace critical)

---

### 28. `idx_service_providers_business_type_active`
```sql
CREATE INDEX idx_service_providers_business_type_active
  ON service_providers(business_type, is_active)
  WHERE is_active = true;
```
**Purpose:** Filter providers by type
**Query Pattern:**
```sql
SELECT * FROM service_providers
  WHERE business_type = 'dive_center' AND is_active = true;
```
**Use Case:** Type-based search, business category browsing
**Expected Usage:** 200-500 scans/day
**Size:** ~8MB

---

### 29. `idx_service_providers_rating`
```sql
CREATE INDEX idx_service_providers_rating
  ON service_providers(rating_average DESC);
```
**Purpose:** Sort by reputation
**Query Pattern:**
```sql
SELECT * FROM service_providers
  ORDER BY rating_average DESC LIMIT 50;
```
**Use Case:** Top-rated providers, quality-based ranking
**Expected Usage:** 50-100 scans/day
**Size:** ~5MB

---

### 30. `idx_service_providers_created_at`
```sql
CREATE INDEX idx_service_providers_created_at
  ON service_providers(created_at DESC);
```
**Purpose:** Find newest providers
**Query Pattern:**
```sql
SELECT * FROM service_providers
  ORDER BY created_at DESC LIMIT 20;
```
**Use Case:** New provider discovery, growth tracking
**Expected Usage:** 20-50 scans/day
**Size:** ~5MB

---

## Service & Availability Indexes

### 31. `idx_services_provider`
```sql
CREATE INDEX idx_services_provider ON services(provider_id);
```
**Purpose:** Get all services from a provider
**Query Pattern:**
```sql
SELECT * FROM services WHERE provider_id = $1;
```
**Use Case:** Provider's service listing, service discovery
**Expected Usage:** 200-500 scans/day
**Size:** ~8MB

---

### 32. `idx_services_category`
```sql
CREATE INDEX idx_services_category
  ON services(service_category);
```
**Purpose:** Browse services by category
**Query Pattern:**
```sql
SELECT * FROM services WHERE service_category = 'certification';
```
**Use Case:** Category browsing, service type filtering
**Expected Usage:** 100-300 scans/day
**Size:** ~5MB

---

### 33. `idx_services_provider_active`
```sql
CREATE INDEX idx_services_provider_active
  ON services(provider_id, is_active)
  WHERE is_active = true;
```
**Purpose:** Find active services from provider
**Query Pattern:**
```sql
SELECT * FROM services
  WHERE provider_id = $1 AND is_active = true;
```
**Use Case:** Active service listings, booking availability
**Expected Usage:** 200-400 scans/day
**Size:** ~8MB

---

### 34. `idx_services_category_active`
```sql
CREATE INDEX idx_services_category_active
  ON services(service_category, is_active)
  WHERE is_active = true;
```
**Purpose:** Browse active services by category
**Query Pattern:**
```sql
SELECT * FROM services
  WHERE service_category = 'guide' AND is_active = true;
```
**Use Case:** Marketplace browsing, type-based filtering
**Expected Usage:** 150-300 scans/day
**Size:** ~8MB

---

### 35. `idx_provider_availability_provider_date`
```sql
CREATE INDEX idx_provider_availability_provider_date
  ON provider_availability(provider_id, availability_date);
```
**Purpose:** Check provider availability on specific dates
**Query Pattern:**
```sql
SELECT * FROM provider_availability
  WHERE provider_id = $1 AND availability_date >= $2;
```
**Use Case:** Calendar checking, booking availability
**Expected Usage:** 200-600 scans/day
**Size:** ~10MB
**Performance Impact:** High (booking critical)

---

## Equipment Indexes

### 36. `idx_equipment_listings_owner_id`
```sql
CREATE INDEX idx_equipment_listings_owner_id
  ON equipment_listings(owner_id);
```
**Purpose:** Find all listings from an owner
**Query Pattern:**
```sql
SELECT * FROM equipment_listings WHERE owner_id = $1;
```
**Use Case:** Owner's inventory, listing management
**Expected Usage:** 100-300 scans/day
**Size:** ~8MB

---

### 37. `idx_equipment_listings_type_active`
```sql
CREATE INDEX idx_equipment_listings_type_active
  ON equipment_listings(equipment_type, is_active)
  WHERE is_active = true;
```
**Purpose:** Browse active equipment by type
**Query Pattern:**
```sql
SELECT * FROM equipment_listings
  WHERE equipment_type = 'wetsuit' AND is_active = true
  ORDER BY rating_average DESC;
```
**Use Case:** Equipment marketplace, type-based browsing
**Expected Usage:** 200-500 scans/day
**Size:** ~8MB
**Performance Impact:** High (marketplace)

---

### 38. `idx_equipment_listings_rating`
```sql
CREATE INDEX idx_equipment_listings_rating
  ON equipment_listings(rating_average DESC);
```
**Purpose:** Sort by quality/popularity
**Query Pattern:**
```sql
SELECT * FROM equipment_listings
  ORDER BY rating_average DESC LIMIT 50;
```
**Use Case:** Top-rated rentals, quality filtering
**Expected Usage:** 50-100 scans/day
**Size:** ~5MB

---

### 39. `idx_equipment_rentals_lister_id`
```sql
CREATE INDEX idx_equipment_rentals_lister_id
  ON equipment_rentals(lister_id);
```
**Purpose:** Get all rentals of lister's equipment
**Query Pattern:**
```sql
SELECT * FROM equipment_rentals WHERE lister_id = $1;
```
**Use Case:** Lister's rental history, business analytics
**Expected Usage:** 100-300 scans/day
**Size:** ~8MB

---

### 40. `idx_equipment_rentals_renter_id`
```sql
CREATE INDEX idx_equipment_rentals_renter_id
  ON equipment_rentals(renter_id);
```
**Purpose:** Get renter's rental history
**Query Pattern:**
```sql
SELECT * FROM equipment_rentals WHERE renter_id = $1;
```
**Use Case:** User's rentals, rental history
**Expected Usage:** 200-500 scans/day
**Size:** ~8MB

---

### 41. `idx_equipment_rentals_lister_status`
```sql
CREATE INDEX idx_equipment_rentals_lister_status
  ON equipment_rentals(lister_id, status);
```
**Purpose:** Get lister's rentals with specific status
**Query Pattern:**
```sql
SELECT * FROM equipment_rentals
  WHERE lister_id = $1 AND status = 'active';
```
**Use Case:** Lister's active rentals, status management
**Expected Usage:** 150-300 scans/day
**Size:** ~8MB

---

### 42. `idx_equipment_rentals_rental_period`
```sql
CREATE INDEX idx_equipment_rentals_rental_period
  ON equipment_rentals(rental_start, rental_end);
```
**Purpose:** Find rentals within date range
**Query Pattern:**
```sql
SELECT * FROM equipment_rentals
  WHERE rental_start >= $1 AND rental_end <= $2;
```
**Use Case:** Calendar-based queries, availability checking
**Expected Usage:** 50-150 scans/day
**Size:** ~10MB

---

## Feedback & Conditions Indexes

### 43. `idx_feedback_dive_site_id`
```sql
CREATE INDEX idx_feedback_dive_site_id ON feedback(dive_site_id);
```
**Purpose:** Get feedback for a dive site
**Query Pattern:**
```sql
SELECT * FROM feedback WHERE dive_site_id = $1;
```
**Use Case:** Condition aggregation, site feedback
**Expected Usage:** 100-300 scans/day
**Size:** ~8MB

---

### 44. `idx_feedback_diver_id`
```sql
CREATE INDEX idx_feedback_diver_id ON feedback(diver_id);
```
**Purpose:** Get diver's submitted feedback
**Query Pattern:**
```sql
SELECT * FROM feedback WHERE diver_id = $1;
```
**Use Case:** Diver's contribution history, personal stats
**Expected Usage:** 50-150 scans/day
**Size:** ~5MB

---

### 45. `idx_feedback_created_at`
```sql
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
```
**Purpose:** Recent feedback queries
**Query Pattern:**
```sql
SELECT * FROM feedback ORDER BY created_at DESC LIMIT 100;
```
**Use Case:** Recent updates, trending conditions
**Expected Usage:** 50-100 scans/day
**Size:** ~8MB

---

### 46. `idx_feedback_dive_site_created`
```sql
CREATE INDEX idx_feedback_dive_site_created
  ON feedback(dive_site_id, created_at DESC);
```
**Purpose:** Recent feedback for specific site
**Query Pattern:**
```sql
SELECT * FROM feedback
  WHERE dive_site_id = $1
  ORDER BY created_at DESC LIMIT 50;
```
**Use Case:** Current conditions, recent feedback
**Expected Usage:** 200-500 scans/day
**Size:** ~10MB

---

### 47. `idx_aggregated_conditions_site_date`
```sql
CREATE INDEX idx_aggregated_conditions_site_date
  ON aggregated_conditions(dive_site_id, date DESC);
```
**Purpose:** Get aggregated conditions for site/date
**Query Pattern:**
```sql
SELECT * FROM aggregated_conditions
  WHERE dive_site_id = $1
  ORDER BY date DESC LIMIT 10;
```
**Use Case:** Condition history, trends, forecasting
**Expected Usage:** 500-1000 scans/day
**Size:** ~8MB
**Performance Impact:** Critical (aggregation)

---

## Materialized View Indexes

### 48-52. Materialized View Indexes
```sql
CREATE INDEX idx_mv_user_stats_id ON mv_user_stats(id);
CREATE INDEX idx_mv_user_stats_experience ON mv_user_stats(experience_level);

CREATE INDEX idx_mv_dive_site_stats_id ON mv_detailed_dive_site_stats(id);
CREATE INDEX idx_mv_dive_site_stats_rating ON mv_detailed_dive_site_stats(avg_rating DESC);
CREATE INDEX idx_mv_dive_site_stats_location ON mv_detailed_dive_site_stats(country, region);

CREATE INDEX idx_mv_provider_stats_id ON mv_service_provider_stats(id);
CREATE INDEX idx_mv_provider_stats_rating ON mv_service_provider_stats(avg_rating DESC);
CREATE INDEX idx_mv_provider_stats_completion ON mv_service_provider_stats(completion_rate DESC);

CREATE INDEX idx_mv_equipment_popular_type ON mv_equipment_popular_items(equipment_type);
CREATE INDEX idx_mv_equipment_popular_rating ON mv_equipment_popular_items(rating_average DESC);
CREATE INDEX idx_mv_equipment_popular_rentals ON mv_equipment_popular_items(total_rentals DESC);
```
**Purpose:** Fast lookups on materialized views
**Expected Usage:** 1000-5000 scans/day (very high)
**Size:** ~80MB total
**Performance Impact:** Critical (replaces join queries)

---

## Index Monitoring

### Check Index Size
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  idx_scan as scans
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Check Unused Indexes
```sql
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname LIKE 'idx_%';
```

### Check Index Efficiency
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE WHEN idx_tup_read > 0
    THEN ROUND(idx_tup_fetch::numeric / idx_tup_read, 2)
    ELSE 0
  END as efficiency
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC;
```

---

## Summary

**Total Indexes: 47**
**Total Storage: ~250MB**
**Expected Performance Improvement: 30-80%**

These indexes cover all common query patterns in the DIVE DROP application and should eliminate most full-table scans.

