# Shuttle Tracking System - Complete Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Realtime Subscriptions](#realtime-subscriptions)
4. [RLS Security](#rls-security)
5. [Performance Optimization](#performance-optimization)
6. [ETA Calculation](#eta-calculation)
7. [Geolocation Queries](#geolocation-queries)
8. [Deployment & Monitoring](#deployment--monitoring)

---

## Architecture Overview

### System Components

```
Diver App                    Driver App
    |                            |
    |-- useShuttleTracking       |-- updateDriverLocation()
    |-- useDiverTracking         |-- Periodic GPS updates (10-30s)
    |                            |
    +----────────────────┬───────+
                         |
                    Supabase
                         |
        ┌────────────────┼────────────────┐
        |                |                |
    Database         Realtime         PostGIS
    (Tables)      (Subscriptions)   (Spatial)
        |                |                |
        └────────────────┼────────────────┘
                         |
        ┌────────────────┼────────────────┐
        |                |                |
   shuttle_trips    shuttle_        location_
                   passengers       history
```

### Real-Time Data Flow

1. **Driver sends GPS**: Every 10-30 seconds
2. **Server updates**: `shuttle_trips.current_location` updates
3. **Trigger fires**: `log_location_history()` inserts into history table
4. **Realtime broadcast**: Supabase sends update to all subscribers
5. **Diver receives**: Component re-renders with new location

### Latency Profile
- GPS update send: ~100-500ms
- Database update: ~50-200ms
- Broadcast to subscribers: ~100-300ms
- **Total latency: 250ms - 1000ms** (typically ~500ms)

---

## Database Schema

### Core Tables

#### `shuttles`
```sql
CREATE TABLE shuttles (
  id UUID PRIMARY KEY,
  name TEXT,
  driver_id UUID,
  capacity INTEGER,
  status shuttle_status,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```
**Purpose**: Shuttle metadata. One record per physical vehicle.

#### `shuttle_trips`
```sql
CREATE TABLE shuttle_trips (
  id UUID PRIMARY KEY,
  shuttle_id UUID,
  driver_id UUID,
  pickup_location TEXT,
  dropoff_location TEXT,
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  current_location GEOMETRY(POINT, 4326), -- PostGIS point
  accuracy DECIMAL(10, 2),
  altitude DECIMAL(10, 2),
  status shuttle_trip_status,
  started_at TIMESTAMP,
  arrived_at TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_arrival TIMESTAMP,
  ...
);
```
**Purpose**: Active trip tracking. One record per active shuttle run.
**Indexes**:
- `current_location` (GIST index for spatial queries)
- `shuttle_id, driver_id, status, started_at` (B-tree for filtering)

#### `shuttle_passengers`
```sql
CREATE TABLE shuttle_passengers (
  id UUID PRIMARY KEY,
  trip_id UUID,
  user_id UUID,
  pickup_location TEXT,
  dropoff_location TEXT,
  pickup_latitude DECIMAL(10, 8),
  pickup_longitude DECIMAL(11, 8),
  status passenger_status,
  pickup_requested_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  dropped_off_at TIMESTAMP,
  estimated_pickup TIMESTAMP,
  ...
);
```
**Purpose**: Track individual diver bookings on a trip.
**Indexes**:
- `trip_id, user_id, status`

#### `shuttle_location_history`
```sql
CREATE TABLE shuttle_location_history (
  id UUID PRIMARY KEY,
  trip_id UUID,
  shuttle_id UUID,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOMETRY(POINT, 4326),
  speed DECIMAL(8, 2),
  bearing DECIMAL(6, 2),
  timestamp TIMESTAMP,
  ...
);
```
**Purpose**: Analytics, diagnostics, and historical playback.
**Indexes**:
- `location` (GIST for spatial queries)
- `timestamp DESC` (for recent queries)

---

## Realtime Subscriptions

### How It Works

Supabase Realtime uses WebSocket connections and PostgreSQL's `LISTEN/NOTIFY` mechanism.

```typescript
// Diver subscribes to trip updates
const unsubscribe = subscribeTripUpdates(tripId, (trip) => {
  // Re-render with new location
  setShuttleLocation(trip.current_latitude, trip.current_longitude);
});

// Under the hood:
// 1. Diver's browser opens WebSocket to Supabase
// 2. Subscribes to "shuttle_trips" table for UPDATE events
// 3. Driver updates location: UPDATE shuttle_trips SET current_latitude=...
// 4. PostgreSQL NOTIFY triggers
// 5. Supabase broadcasts to all subscribers
```

### Channel Names & Filtering

```typescript
// Subscribe to specific trip
channel.on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "shuttle_trips",
    filter: `id=eq.${tripId}` // Only this trip
  },
  callback
);

// Subscribe to all driver's trips
channel.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "shuttle_trips",
    filter: `driver_id=eq.${driverId}` // All their trips
  },
  callback
);
```

### Connection Management

```typescript
// Always unsubscribe when component unmounts
useEffect(() => {
  const unsubscribe = subscribeTripUpdates(tripId, onUpdate);
  return () => unsubscribe(); // Clean up
}, [tripId]);

// Unsubscribe all when app closes
window.addEventListener("beforeunload", unsubscribeAll);
```

### Troubleshooting Realtime

| Problem | Cause | Solution |
|---------|-------|----------|
| Updates not appearing | Subscription filter wrong | Check RLS policies & filter syntax |
| Delayed updates (>5s) | Network latency/WebSocket issue | Check connection, consider polling |
| Multiple same events | Race condition in subscriber | Deduplicate in callback |
| Memory leak | Subscriptions not cleaned up | Always call unsubscribe in useEffect cleanup |

---

## RLS Security

### How RLS Works

Row-Level Security ensures users only see data they should:

```sql
-- Diver can only see trips they're booked on
CREATE POLICY "Passengers can view their trip" ON shuttle_trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shuttle_passengers
      WHERE shuttle_passengers.trip_id = shuttle_trips.id
      AND shuttle_passengers.user_id = auth.uid()
    )
  );
```

### Policy Hierarchy

```
User Type       Can See                Can Modify
──────────────────────────────────────────────────
Diver           - Own bookings         - Own status
                - Trip they're on      - (limited)
                
Driver          - Own trips            - Own trip location
                - Passengers on trip   - Trip status
                
Admin           - All data             - Everything
```

### Testing RLS Locally

```bash
# Start Supabase local stack
supabase start

# Test as different users
supabase --user-id "diver-uuid" select from shuttle_trips
supabase --user-id "driver-uuid" select from shuttle_trips

# Should get different results based on RLS
```

---

## Performance Optimization

### Database Indexes

The migration includes optimized indexes:

```sql
-- Spatial index for geolocation queries (GIST)
CREATE INDEX idx_shuttle_trips_current_location
ON shuttle_trips USING GIST(current_location);

-- Standard indexes for common filters
CREATE INDEX idx_shuttle_trips_shuttle_id ON shuttle_trips(shuttle_id);
CREATE INDEX idx_shuttle_trips_driver_id ON shuttle_trips(driver_id);
CREATE INDEX idx_shuttle_trips_status ON shuttle_trips(status);
```

### Query Optimization Tips

**❌ Slow: Full table scan**
```typescript
// This scans entire table!
const all = await supabase.from("shuttle_trips").select("*");
```

**✅ Fast: Use indexes**
```typescript
// Uses index on driver_id
const trips = await supabase
  .from("shuttle_trips")
  .select("*")
  .eq("driver_id", userId)
  .in("status", ["en_route", "arrived"]);
```

### Location Update Batching

**❌ Slow: One update per location**
```typescript
for (const trip of trips) {
  await updateDriverLocation(trip); // N queries
}
```

**✅ Fast: Batch updates**
```typescript
// All in one batch request
await batchUpdateLocations(trips);
```

### Realtime Subscription Optimization

**❌ Bad: Subscribe to entire table**
```typescript
// Receives updates for ALL shuttles globally
channel.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "shuttle_trips"
}, callback);
```

**✅ Good: Filter by trip ID**
```typescript
// Only receives updates for this specific trip
channel.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "shuttle_trips",
  filter: `id=eq.${tripId}`
}, callback);
```

### Caching Strategy

```typescript
// Cache trip for 10 seconds, then refetch
const tripCache = new Map<string, {
  data: ShuttleTrip;
  timestamp: number;
}>();

async function getCachedTrip(tripId: string) {
  const cached = tripCache.get(tripId);
  const now = Date.now();

  if (cached && now - cached.timestamp < 10000) {
    return cached.data; // Return cached
  }

  // Fetch fresh data
  const trip = await getShuttleTrip(tripId);
  tripCache.set(tripId, { data: trip, timestamp: now });
  return trip;
}
```

### Location Update Frequency

Optimal update frequencies:

| Scenario | Frequency | Reasoning |
|----------|-----------|-----------|
| Urban (slow) | Every 30s | Fewer location changes |
| Open water | Every 10-15s | Faster movement visible |
| High accuracy needed | Every 5s | Max realtime smoothness |
| Battery saving | Every 60s | Battery vs. accuracy trade-off |

**Recommended for dive shuttles**: **Every 10-15 seconds**

---

## ETA Calculation

### Algorithm

```sql
CREATE OR REPLACE FUNCTION estimate_eta(
  current_lat DECIMAL,
  current_lon DECIMAL,
  dropoff_lat DECIMAL,
  dropoff_lon DECIMAL
)
RETURNS INTERVAL AS $$
DECLARE
  distance_meters DECIMAL;
  avg_speed_mps DECIMAL := 15; -- 54 km/h (15 m/s)
BEGIN
  distance_meters := calculate_distance(
    current_lat, current_lon,
    dropoff_lat, dropoff_lon
  );
  RETURN (distance_meters / avg_speed_mps) * INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Accuracy Improvements

**Simple (10-15% error)**:
```
ETA = distance / 15 m/s
```

**Medium (5-10% error)** - consider current time:
```
// Speed varies by time of day
avg_speed = 15 m/s (day) or 20 m/s (night)
ETA = distance / avg_speed
```

**Better (2-5% error)** - use speed history:
```sql
-- Calculate average speed from last 5 minutes
SELECT AVG(speed) as avg_speed
FROM shuttle_location_history
WHERE trip_id = $1
  AND timestamp > NOW() - INTERVAL '5 minutes'
```

**Production** - add traffic/route data:
```typescript
// Use Google Maps API for better ETA
const response = await fetch(
  `https://maps.googleapis.com/maps/api/distancematrix/json?` +
  `origins=${shuttleLat},${shuttleLon}` +
  `&destinations=${dropoffLat},${dropoffLon}` +
  `&key=${GOOGLE_MAPS_KEY}`
);
```

### Displaying ETA

```typescript
// Show in human-readable format
function formatETA(eta: ETAData) {
  const now = new Date();
  const arrival = eta.estimated_arrival;

  if (eta.eta_minutes < 1) {
    return "Arriving now";
  } else if (eta.eta_minutes < 60) {
    return `${eta.eta_minutes} min`;
  } else {
    return arrival.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
```

---

## Geolocation Queries

### Finding Nearby Shuttles

```sql
-- Find all shuttles within 5km
SELECT
  shuttle_id,
  trip_id,
  ST_Distance(
    ST_SetSRID(ST_MakePoint($lon, $lat), 4326),
    current_location
  ) * 111000 as distance_meters
FROM shuttle_trips
WHERE status = 'en_route'
  AND current_location IS NOT NULL
  AND ST_DWithin(
    ST_SetSRID(ST_MakePoint($lon, $lat), 4326),
    current_location,
    5000 / 111000.0 -- Convert meters to degrees
  )
ORDER BY distance_meters ASC;
```

### Distance Precision

| Precision | Accuracy | Use Case |
|-----------|----------|----------|
| `DECIMAL(10, 6)` | ±0.1m | High precision (micrometers) |
| `DECIMAL(10, 7)` | ±1cm | Survey grade |
| `DECIMAL(10, 8)` | ±1.1mm | **Used here** |

### Coordinate Systems

**Used**: WGS84 (EPSG:4326) - standard for GPS
```
Latitude: -90 to +90 (N/S)
Longitude: -180 to +180 (E/W)
Format: DECIMAL(10, 8) for ~1mm precision
```

### PostGIS Performance Notes

- GIST indexes are essential for spatial queries
- ST_DWithin is faster than ST_Distance + WHERE
- Use ST_SetSRID(ST_MakePoint(lon, lat), 4326) format

---

## Deployment & Monitoring

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Location update interval (ms)
NEXT_PUBLIC_LOCATION_UPDATE_INTERVAL=15000

# ETA calculation method
NEXT_PUBLIC_ETA_METHOD=postgresql # or 'google_maps'
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...

# Realtime polling fallback (ms)
NEXT_PUBLIC_POLLING_FALLBACK_INTERVAL=30000
```

### Supabase Configuration

**Enable Realtime**:
```bash
# In Supabase Dashboard → Project Settings → Realtime
# Enable for these tables:
# - shuttle_trips
# - shuttle_passengers
```

**Connection Limits**:
```
Free Tier:
  - Max 100 concurrent realtime connections
  - Max 10 locations/second

Pro Tier:
  - Scale with usage
  - Recommended for production
```

### Monitoring & Alerting

**Key Metrics**:
1. **Realtime latency**: Goal <500ms
2. **Location update frequency**: Should be 10-15s
3. **Subscriber count**: Should match active divers
4. **Database query performance**: Should be <100ms

**Monitoring SQL**:
```sql
-- Check active subscriptions
SELECT channel, active_subscriptions FROM realtime.schema_info;

-- Monitor query performance
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%shuttle%'
ORDER BY mean_exec_time DESC;
```

### Error Handling

```typescript
try {
  await updateDriverLocation(update);
} catch (error) {
  if (error.message.includes("RLS")) {
    // User doesn't have permission
    console.error("RLS violation:", error);
  } else if (error.message.includes("network")) {
    // Offline - retry later
    queueLocationUpdate(update);
  } else {
    // Other error
    logError(error);
  }
}
```

### Scaling Considerations

| Metric | Current | Scaling |
|--------|---------|---------|
| Concurrent users | <1000 | Use Pro tier, increase realtime connections |
| Updates/second | <100 | Monitor with pg_stat_statements |
| Location history growth | ~86M rows/year | Implement archival, partition by date |

### Archival Strategy

After 30 days, move location history to cold storage:

```sql
-- Archive old history to separate table
CREATE TABLE shuttle_location_history_archive AS
SELECT * FROM shuttle_location_history
WHERE timestamp < NOW() - INTERVAL '30 days';

DELETE FROM shuttle_location_history
WHERE timestamp < NOW() - INTERVAL '30 days';
```

---

## Summary: Best Practices Checklist

- ✅ Use realtime subscriptions for <500ms latency
- ✅ Filter subscriptions by trip ID for efficiency
- ✅ Update location every 10-15 seconds
- ✅ Batch location updates when possible
- ✅ Use proper indexes on frequently queried columns
- ✅ Implement RLS policies for data security
- ✅ Cache data when appropriate (10s TTL)
- ✅ Use PostGIS for geolocation queries
- ✅ Monitor realtime connection count
- ✅ Handle offline scenarios gracefully
- ✅ Implement ETA with speed history
- ✅ Clean up subscriptions on unmount

---

## Quick Reference: Common Operations

### Start tracking a shuttle
```typescript
const { trip, eta, distance } = useDiverTracking({
  tripId: "123",
  userLat: 20.8,
  userLon: -87.0,
  dropoffLat: 21.0,
  dropoffLon: -87.2,
});
```

### Send driver location update
```typescript
await updateDriverLocation({
  trip_id: "123",
  latitude: 20.8123,
  longitude: -87.0456,
  accuracy: 5, // meters
});
```

### Find nearby shuttles
```typescript
const nearby = await findNearbyShuttles(
  userLat, userLon, 5000 // 5km radius
);
```

### Calculate ETA
```typescript
const etaInterval = await estimateETA(
  shuttleLat, shuttleLon,
  dropoffLat, dropoffLon
);
```
