# Live Location Tracking API Documentation

## Overview

The Live Location Tracking API enables real-time tracking of shuttle/vehicle locations for the DIVE DROP platform. It provides endpoints for drivers to send location updates and for passengers to track their ride in real-time.

## Architecture

### Components

1. **Location Updates** - Drivers send GPS location at regular intervals (max 1 per 5 seconds)
2. **Real-time Streaming** - Passengers receive live location updates via Supabase Realtime
3. **ETA Calculation** - Distance + speed-based ETA estimation with buffer
4. **Trip Management** - Start, track, and complete trips
5. **Location History** - Stores all location updates for analytics

### Database Schema

#### shuttle_trips
```sql
-- Main trip record
CREATE TABLE shuttle_trips (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES shuttle_drivers(id),
  shuttle_id UUID NOT NULL REFERENCES shuttles(id),
  passenger_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL, -- pending, in_progress, arrived_at_pickup, picked_up, completed, cancelled
  pickup_location JSONB NOT NULL, -- { lat, lng, address? }
  dropoff_location JSONB NOT NULL,
  current_location GEOGRAPHY(POINT, 4326), -- PostGIS point
  current_location_accuracy DECIMAL,
  current_location_speed DECIMAL, -- km/h
  current_location_heading DECIMAL, -- degrees
  last_location_update TIMESTAMP,
  estimated_arrival_time TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shuttle_trips_driver_id ON shuttle_trips(driver_id);
CREATE INDEX idx_shuttle_trips_passenger_id ON shuttle_trips(passenger_id);
CREATE INDEX idx_shuttle_trips_status ON shuttle_trips(status);
CREATE INDEX idx_shuttle_trips_created_at ON shuttle_trips(created_at);
```

#### shuttle_location_history
```sql
-- Location history for analytics
CREATE TABLE shuttle_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES shuttle_trips(id) ON DELETE CASCADE,
  shuttle_id UUID NOT NULL REFERENCES shuttles(id),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  accuracy DECIMAL,
  speed DECIMAL,
  heading DECIMAL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_location_history_trip_id ON shuttle_location_history(trip_id);
CREATE INDEX idx_location_history_shuttle_id ON shuttle_location_history(shuttle_id);
CREATE INDEX idx_location_history_recorded_at ON shuttle_location_history(recorded_at);
CREATE INDEX idx_location_history_location ON shuttle_location_history USING GIST(location);
```

## API Endpoints

### 1. Location Updates

#### POST /api/tracking/location
Driver sends their current location

**Authentication:** Driver Bearer token

**Query Parameters:**
- `trip_id` (required) - UUID of active trip

**Request Body:**
```json
{
  "lat": 32.0853,
  "lng": 34.7818,
  "accuracy": 10,
  "speed": 45,
  "heading": 180,
  "timestamp": 1719888000000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "trip_id": "123e4567-e89b-12d3-a456-426614174000",
    "location": {
      "lat": 32.0853,
      "lng": 34.7818
    },
    "updated_at": "2026-06-20T10:00:00Z"
  }
}
```

**Rate Limit:** 1 update per 5 seconds (12 per minute per driver)

---

### 2. Get Trip Details with Real-time Location

#### GET /api/tracking/trip/:tripId
Get full trip details including current shuttle location and ETA

**Authentication:** User (driver or passenger) Bearer token

**Response:**
```json
{
  "success": true,
  "data": {
    "trip_id": "123e4567-e89b-12d3-a456-426614174000",
    "shuttle_location": {
      "lat": 32.0853,
      "lng": 34.7818,
      "accuracy": 10,
      "speed": 45,
      "heading": 180,
      "updated_at": "2026-06-20T10:00:30Z"
    },
    "dropoff_location": {
      "lat": 32.1234,
      "lng": 34.8567
    },
    "pickup_location": {
      "lat": 32.0700,
      "lng": 34.7700
    },
    "eta_seconds": 720,
    "eta_minutes": 12,
    "eta_formatted": "12 minutes",
    "distance_meters": 8500,
    "distance_formatted": "8.5 km",
    "status": "in_progress",
    "driver_info": {
      "id": "driver-123",
      "user_id": "user-456",
      "name": "John Driver",
      "avatar_url": "https://...",
      "vehicle_name": "Shuttle #1",
      "vehicle_color": "Blue",
      "vehicle_plate": "AA-123-BB",
      "phone": "+1234567890"
    },
    "last_update": "2026-06-20T10:00:30Z"
  }
}
```

**Rate Limit:** 30 requests per minute

---

### 3. Trip Location History

#### GET /api/tracking/trip/:tripId/history
Get paginated location history for a trip

**Authentication:** User Bearer token

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "trip_id": "123e4567-e89b-12d3-a456-426614174000",
    "locations": [
      {
        "timestamp": "2026-06-20T10:00:30Z",
        "location": {
          "lat": 32.0853,
          "lng": 34.7818
        },
        "accuracy": 10,
        "speed": 45,
        "heading": 180
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

### 4. Start Trip

#### POST /api/tracking/trip/start
Driver starts a new trip

**Authentication:** Driver Bearer token

**Request Body:**
```json
{
  "shuttle_id": "shuttle-123",
  "passenger_id": "passenger-456",
  "pickup_location": {
    "lat": 32.0700,
    "lng": 34.7700,
    "address": "123 Main St, Tel Aviv"
  },
  "dropoff_location": {
    "lat": 32.1234,
    "lng": 34.8567,
    "address": "456 Beach Ave, Tel Aviv"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trip started successfully",
  "data": {
    "trip_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending",
    "estimated_eta_seconds": 720,
    "estimated_eta_minutes": 12,
    "estimated_arrival_time": "2026-06-20T10:12:00Z",
    "distance_meters": 8500,
    "created_at": "2026-06-20T10:00:00Z"
  }
}
```

---

### 5. Update Trip Status

#### POST /api/tracking/trip/status
Update trip progress (arrived at pickup, picked up, completed, etc.)

**Authentication:** Driver Bearer token

**Request Body:**
```json
{
  "trip_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "arrived_at_pickup",
  "notes": "Arrived at pickup location, waiting for passenger"
}
```

**Valid Status Transitions:**
- `pending` → `in_progress` (driver starts heading)
- `in_progress` → `arrived_at_pickup` (driver arrives at pickup)
- `arrived_at_pickup` → `picked_up` (passenger boarded)
- `picked_up` → `completed` (trip finished)
- Any status → `cancelled` (trip cancelled)

**Response:**
```json
{
  "success": true,
  "message": "Trip status updated to arrived_at_pickup",
  "data": {
    "trip_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "arrived_at_pickup",
    "updated_at": "2026-06-20T10:05:00Z",
    "notes": "Arrived at pickup location, waiting for passenger"
  }
}
```

---

### 6. Calculate ETA

#### POST /api/tracking/eta
Calculate ETA between two points (public endpoint, no auth required)

**Request Body:**
```json
{
  "from_lat": 32.0853,
  "from_lng": 34.7818,
  "to_lat": 32.1234,
  "to_lng": 34.8567,
  "average_speed_kmh": 50,
  "buffer_minutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "distance_meters": 8500,
    "distance_kilometers": "8.50",
    "distance_formatted": "8.5 km",
    "eta_seconds": 720,
    "eta_minutes": 12,
    "eta_formatted": "12 minutes",
    "breakdown": {
      "travel_time_seconds": 612,
      "buffer_seconds": 300,
      "average_speed_kmh": 50
    },
    "calculation_time_ms": 2
  }
}
```

#### GET /api/tracking/eta
Same as POST, accepts query parameters

**Query Parameters:**
- `from_lat` (required)
- `from_lng` (required)
- `to_lat` (required)
- `to_lng` (required)
- `average_speed_kmh` (default: 50)
- `buffer_minutes` (default: 5)

---

## Authentication

All endpoints except ETA calculation require Bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

Token is obtained from Supabase Auth. Driver endpoints require the user to be registered in `shuttle_drivers` table.

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Location Update | 12 | 1 minute |
| Trip Management | 10 | 1 minute |
| General Tracking | 30 | 1 minute |
| ETA Calculation | 30 | 1 minute |

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Error description"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (user doesn't own trip)
- `404` - Not Found (trip doesn't exist)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Real-time Updates (Supabase Realtime)

Subscribe to trip location updates using Supabase Realtime:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, KEY);

// Subscribe to location updates for a trip
const subscription = supabase
  .channel(`trip:${tripId}`)
  .on('broadcast', { event: 'location_update' }, (payload) => {
    console.log('Location update:', payload);
  })
  .subscribe();

// Unsubscribe when done
supabase.removeChannel(subscription);
```

## ETA Calculation

ETA is calculated using the Haversine formula:

1. **Distance Calculation:** Haversine formula between two points
2. **Speed Factor:** Uses driver's current speed or default 50 km/h
3. **Buffer Time:** Adds configurable buffer (default 5 minutes)
4. **Final ETA:** `time_seconds = (distance_meters / speed_ms) + buffer_seconds`

### Example
- Distance: 10 km
- Speed: 50 km/h
- Travel time: 10 km ÷ 50 km/h = 12 minutes
- Buffer: 5 minutes
- **Total ETA: 17 minutes**

## Security Considerations

1. **Coordinate Sanity Checks:**
   - Latitude: -90 to 90
   - Longitude: -180 to 180
   - Speed: 0-200 km/h (reasonable vehicle speed)
   - Accuracy: 0-1000 meters

2. **Rate Limiting:** Prevents abuse and excessive database writes

3. **Ownership Verification:** Users can only access their own trips

4. **GPS Spoofing Detection:** Implemented via speed validation and distance checks

## Testing

Run unit tests:
```bash
npm test -- src/lib/tracking/__tests__/
```

### Test Coverage

- Haversine distance calculation
- ETA calculation with buffer
- Location validation
- Bearing calculation
- Location smoothing (noise reduction)
- Rate limiting

### Mock Location Updates

```typescript
import { calculateDistance, calculateETA } from '@/lib/tracking/utils';

// Test distance calculation
const distance = calculateDistance(32.0853, 34.7818, 32.1234, 34.8567);
console.log(`Distance: ${distance / 1000} km`);

// Test ETA calculation
const eta = calculateETA(distance, 50, 5);
console.log(`ETA: ${Math.ceil(eta / 60)} minutes`);
```

## Client Integration Example

### Driver (sending location)

```typescript
// Start tracking location
function startLocationTracking(tripId: string) {
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy, heading } = position.coords;
      
      // Send to API
      fetch(`/api/tracking/location?trip_id=${tripId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
          accuracy,
          heading,
          timestamp: Date.now()
        })
      });
    },
    (error) => console.error(error),
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );
}
```

### Passenger (receiving updates)

```typescript
// Subscribe to real-time updates
function watchTrip(tripId: string) {
  const subscription = supabase
    .channel(`trip:${tripId}`)
    .on('broadcast', { event: 'location_update' }, (payload) => {
      updateMapLocation(payload.payload.location);
      updateETA(payload.payload.eta);
    })
    .subscribe();
    
  return () => supabase.removeChannel(subscription);
}

// Or fetch periodically
async function pollTripStatus(tripId: string) {
  const response = await fetch(`/api/tracking/trip/${tripId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  updateUI(data.data);
}
```

## Future Enhancements

1. **Traffic Integration:** Use Mapbox/Google Maps for real traffic-based ETA
2. **Historical Analytics:** Generate heatmaps of driver behavior
3. **Geofencing:** Automatic notifications when entering/leaving zones
4. **Offline Mode:** Queue location updates when offline
5. **Mobile Optimization:** Battery-efficient location tracking
6. **Driver Performance:** Track metrics like speed compliance, route efficiency
7. **Analytics Dashboard:** Real-time fleet tracking and reporting

## Troubleshooting

### Location not updating
- Check GPS is enabled on device
- Verify trip_id is correct and trip is active
- Check rate limit not exceeded (12 per minute)

### ETA seems wrong
- Verify coordinates are correct (lat/lng not swapped)
- Check average_speed_kmh is realistic (default 50)
- Consider traffic delays with buffer_minutes

### Real-time updates not working
- Verify Supabase Realtime is enabled
- Check channel subscription is correct format
- Ensure Bearer token is valid
