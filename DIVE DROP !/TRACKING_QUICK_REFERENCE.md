# Live Location Tracking - Quick Reference Guide

## File Quick Links

### Core Libraries
| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/tracking/schemas.ts` | Zod validation schemas | 100 |
| `src/lib/tracking/utils.ts` | Distance, ETA, formatting | 200 |
| `src/lib/tracking/middleware.ts` | Auth, rate limiting | 300 |
| `src/lib/tracking/database.ts` | Supabase operations | 250 |

### API Routes
| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/tracking/location?trip_id=<uuid>` | POST | `location/route.ts` | Driver sends GPS |
| `/api/tracking/trip/:tripId` | GET | `trip/[tripId]/route.ts` | Get trip details + ETA |
| `/api/tracking/trip/start` | POST | `trip/start/route.ts` | Start new trip |
| `/api/tracking/trip/status` | POST | `trip/status/route.ts` | Update trip status |
| `/api/tracking/eta` | POST/GET | `eta/route.ts` | Calculate ETA |

### React Components
| Component | File | Purpose |
|-----------|------|---------|
| `LiveMap` | `components/tracking/LiveMap.tsx` | Map placeholder |
| `TripTracker` | `components/tracking/TripTracker.tsx` | Passenger tracking UI |
| `DriverLocationShare` | `components/tracking/DriverLocationShare.tsx` | Driver sharing UI |

### React Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useDriverLocationTracking()` | `hooks/useLocationTracking.ts` | Driver GPS streaming |
| `usePassengerTracking()` | `hooks/useLocationTracking.ts` | Passenger trip polling |
| `useETACalculation()` | `hooks/useLocationTracking.ts` | ETA calculator |

### Documentation
| Document | Purpose | Length |
|----------|---------|--------|
| `TRACKING_SETUP_GUIDE.md` | Step-by-step integration | 500 lines |
| `LIVE_LOCATION_TRACKING_SUMMARY.md` | Complete overview | 400 lines |
| `src/lib/tracking/DOCUMENTATION.md` | API reference | 1000 lines |

---

## API Endpoints at a Glance

### 1. POST /api/tracking/location
**Driver sends location**
```bash
curl -X POST "http://localhost:3000/api/tracking/location?trip_id=UUID" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": 32.0853, "lng": 34.7818}'
```
**Rate limit:** 12/minute | **Auth:** Required

---

### 2. GET /api/tracking/trip/:tripId
**Get trip with current location & ETA**
```bash
curl "http://localhost:3000/api/tracking/trip/UUID" \
  -H "Authorization: Bearer TOKEN"
```
**Response includes:**
- `shuttle_location` (lat, lng, accuracy, speed, heading)
- `eta_seconds`, `eta_minutes`, `eta_formatted`
- `distance_meters`, `distance_formatted`
- `driver_info` (name, avatar, vehicle details)

**Rate limit:** 30/minute | **Auth:** Required

---

### 3. POST /api/tracking/trip/start
**Driver starts trip**
```bash
curl -X POST "http://localhost:3000/api/tracking/trip/start" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shuttle_id": "UUID",
    "passenger_id": "UUID",
    "pickup_location": {"lat": 32.0853, "lng": 34.7818},
    "dropoff_location": {"lat": 32.1234, "lng": 34.8567}
  }'
```
**Returns:** `trip_id`, `estimated_eta_minutes`

**Rate limit:** 10/minute | **Auth:** Required (Driver)

---

### 4. POST /api/tracking/trip/status
**Update trip status**
```bash
curl -X POST "http://localhost:3000/api/tracking/trip/status" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "UUID",
    "status": "arrived_at_pickup",
    "notes": "Arrived at location"
  }'
```
**Valid statuses:**
- `in_progress` (heading to pickup)
- `arrived_at_pickup` (at pickup location)
- `picked_up` (passenger boarded)
- `completed` (trip finished)
- `cancelled` (any time)

**Rate limit:** 10/minute | **Auth:** Required (Driver)

---

### 5. POST /api/tracking/eta
**Calculate ETA (public, no auth)**
```bash
curl -X POST "http://localhost:3000/api/tracking/eta" \
  -H "Content-Type: application/json" \
  -d '{
    "from_lat": 32.0853,
    "from_lng": 34.7818,
    "to_lat": 32.1234,
    "to_lng": 34.8567,
    "average_speed_kmh": 50,
    "buffer_minutes": 5
  }'
```
**OR with GET:**
```bash
curl "http://localhost:3000/api/tracking/eta?from_lat=32.0853&from_lng=34.7818&to_lat=32.1234&to_lng=34.8567"
```
**Returns:** distance, eta_minutes, eta_formatted

**Rate limit:** 30/minute | **Auth:** None

---

## Component Usage

### For Passengers (Track their ride)
```tsx
import { TripTracker } from '@/components/tracking/TripTracker';

<TripTracker 
  tripId="trip-uuid"
  token={userToken}
  pollingInterval={3000}
/>
```

### For Drivers (Share their location)
```tsx
import { DriverLocationShare } from '@/components/tracking/DriverLocationShare';

<DriverLocationShare
  tripId="trip-uuid"
  token={driverToken}
  onError={(error) => console.error(error)}
  onSuccess={() => console.log('Tracking started')}
/>
```

### Custom Map Integration
```tsx
import { LiveMap } from '@/components/tracking/LiveMap';

<LiveMap 
  tripDetails={tripData}
  height="400px"
/>
```

---

## React Hooks Usage

### Driver Tracking
```tsx
const tracking = useDriverLocationTracking({
  tripId: 'trip-uuid',
  token: userToken,
  interval: 5000,
  enableHighAccuracy: true
});

// Start sending location
tracking.startTracking();

// Stop
tracking.stopTracking();

// Current state
console.log(tracking.currentLocation); // { lat, lng, accuracy, speed, heading }
console.log(tracking.isTracking); // boolean
console.log(tracking.error); // null or error message
```

### Passenger Tracking
```tsx
const tracking = usePassengerTracking({
  tripId: 'trip-uuid',
  token: userToken,
  interval: 3000
});

// Auto-start on mount, auto-stop on unmount
useEffect(() => {
  tracking.startTracking();
  return () => tracking.stopTracking();
}, []);

// Current state
console.log(tracking.tripDetails); // Full trip details with ETA
console.log(tracking.currentLocation); // Shuttle location
console.log(tracking.error); // null or error
```

### ETA Calculation
```tsx
const eta = useETACalculation();

const result = await eta.calculateETA(
  32.0853, 34.7818,  // from
  32.1234, 34.8567,  // to
  50,                // average_speed_kmh
  5                  // buffer_minutes
);

console.log(result.eta_minutes);       // number
console.log(result.distance_formatted); // "13.5 km"
```

---

## Database Queries

### Get active trip for driver
```sql
SELECT * FROM shuttle_trips 
WHERE driver_id = ? AND status IN ('pending', 'in_progress', 'arrived_at_pickup', 'picked_up')
ORDER BY created_at DESC LIMIT 1;
```

### Get passenger's current trip
```sql
SELECT * FROM shuttle_trips 
WHERE passenger_id = ? AND status IN ('in_progress', 'arrived_at_pickup', 'picked_up');
```

### Get location history for trip
```sql
SELECT * FROM shuttle_location_history 
WHERE trip_id = ? 
ORDER BY recorded_at DESC 
LIMIT 20 OFFSET 0;
```

### Calculate distance to dropoff (PostGIS)
```sql
SELECT ST_Distance(
  current_location::geography, 
  ST_GeomFromText('POINT(' || dropoff_location->>'lng' || ' ' || dropoff_location->>'lat' || ')', 4326)::geography
) as distance_meters
FROM shuttle_trips WHERE id = ?;
```

---

## Authentication

All endpoints except ETA require Bearer token:

```
Authorization: Bearer <JWT_TOKEN_FROM_SUPABASE>
```

Get token from Supabase Auth:
```tsx
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST location | 12 | 1 minute |
| POST trip/start, trip/status | 10 | 1 minute |
| GET trip details | 30 | 1 minute |
| POST/GET eta | 30 | 1 minute |

**In production:** Use Redis instead of in-memory store.

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Error description"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (no access to trip)
- `404` - Not found
- `429` - Too many requests (rate limited)
- `500` - Server error

**Rate limit response includes:**
```
Retry-After: 30
X-RateLimit-Reset: 2026-06-20T10:05:30Z
```

---

## Validation Rules

### Location Coordinates
- Latitude: -90 to +90
- Longitude: -180 to +180
- Accuracy: 0-1000 meters
- Speed: 0-200 km/h (realistic vehicle)
- Heading: 0-360 degrees

### Trip Status
Valid transitions:
```
pending
  ├→ in_progress
  │  └→ arrived_at_pickup
  │     └→ picked_up
  │        └→ completed
  └→ cancelled
```

---

## Testing Commands

```bash
# Test ETA (public)
curl -X POST http://localhost:3000/api/tracking/eta \
  -H "Content-Type: application/json" \
  -d '{"from_lat":32,"from_lng":34,"to_lat":32.1,"to_lng":34.1}'

# Test location update (requires auth)
TOKEN="your_token"
TRIP="trip-uuid"
curl -X POST "http://localhost:3000/api/tracking/location?trip_id=$TRIP" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":32.0853,"lng":34.7818,"accuracy":10}'

# Test trip details (requires auth)
curl "http://localhost:3000/api/tracking/trip/$TRIP" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Performance Tips

1. **Location Updates:** Default to 5-10 second interval
2. **Polling:** Use 3-5 second interval for passengers
3. **ETA Buffer:** Set to 5-10 minutes for real traffic
4. **GPS Accuracy:** Enable high accuracy on highways, disable in city
5. **Battery:** Use passive updates when app is background

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Check Bearer token is valid |
| 403 Forbidden | User doesn't own trip |
| 429 Too Many Requests | Wait before next request |
| Location not updating | Check GPS enabled, trip is active |
| ETA seems wrong | Verify coordinates, check traffic |
| Map not showing | Ensure map library integrated |

---

## Checklist for Integration

- [ ] Database tables created with PostGIS
- [ ] RLS policies configured
- [ ] Test ETA endpoint (public)
- [ ] Test location endpoint with auth
- [ ] Integrate `TripTracker` component
- [ ] Integrate `DriverLocationShare` component
- [ ] Choose map library (Leaflet/Mapbox/Google)
- [ ] Test with real devices (need HTTPS for geolocation)
- [ ] Configure rate limiting for production (Redis)
- [ ] Add error monitoring (Sentry)
- [ ] Load test with multiple drivers/passengers
- [ ] Update privacy policy

---

## Support & References

- **Full API Docs:** `src/lib/tracking/DOCUMENTATION.md`
- **Setup Guide:** `TRACKING_SETUP_GUIDE.md`
- **Summary:** `LIVE_LOCATION_TRACKING_SUMMARY.md`
- **Tests:** `src/lib/tracking/__tests__/utils.test.ts`

---

## Statistics

- **6 API endpoints** - Location, Trip, ETA
- **3 React components** - Map, Tracker, Sharing
- **3 React hooks** - Driver, Passenger, ETA
- **4 libraries** - Schemas, Utils, Middleware, Database
- **Comprehensive tests** - Distance, ETA, Validation
- **2000+ lines** of documentation

**Implementation time:** 1-2 days to full integration
**Maintenance:** Minimal, fully documented
