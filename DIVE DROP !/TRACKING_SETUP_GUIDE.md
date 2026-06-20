# Live Location Tracking - Setup & Integration Guide

## Quick Start

### 1. Database Setup

Run these SQL migrations in your Supabase project:

```sql
-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Main trips table
CREATE TABLE IF NOT EXISTS shuttle_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES shuttle_drivers(id) ON DELETE RESTRICT,
  shuttle_id UUID NOT NULL REFERENCES shuttles(id) ON DELETE RESTRICT,
  passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'arrived_at_pickup', 'picked_up', 'completed', 'cancelled')),
  pickup_location JSONB NOT NULL,
  dropoff_location JSONB NOT NULL,
  current_location GEOGRAPHY(POINT, 4326),
  current_location_accuracy DECIMAL,
  current_location_speed DECIMAL,
  current_location_heading DECIMAL,
  last_location_update TIMESTAMP WITH TIME ZONE,
  estimated_arrival_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shuttle_trips_driver_id ON shuttle_trips(driver_id) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_shuttle_trips_passenger_id ON shuttle_trips(passenger_id) WHERE status IN ('pending', 'in_progress', 'arrived_at_pickup', 'picked_up');
CREATE INDEX IF NOT EXISTS idx_shuttle_trips_status ON shuttle_trips(status);
CREATE INDEX IF NOT EXISTS idx_shuttle_trips_created_at ON shuttle_trips(created_at DESC);

-- Location history table
CREATE TABLE IF NOT EXISTS shuttle_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES shuttle_trips(id) ON DELETE CASCADE,
  shuttle_id UUID NOT NULL REFERENCES shuttles(id) ON DELETE RESTRICT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  accuracy DECIMAL,
  speed DECIMAL,
  heading DECIMAL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for location history
CREATE INDEX IF NOT EXISTS idx_location_history_trip_id ON shuttle_location_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_history_shuttle_id ON shuttle_location_history(shuttle_id);
CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at ON shuttle_location_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_location ON shuttle_location_history USING GIST(location);

-- Row-level security policies (optional but recommended)
ALTER TABLE shuttle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_location_history ENABLE ROW LEVEL SECURITY;

-- Drivers can only see their own trips
CREATE POLICY "drivers_can_view_own_trips" ON shuttle_trips FOR SELECT
  USING (driver_id = auth.uid());

-- Passengers can only see their own trips
CREATE POLICY "passengers_can_view_own_trips" ON shuttle_trips FOR SELECT
  USING (passenger_id = auth.uid());

-- Only drivers can update their trips
CREATE POLICY "drivers_can_update_own_trips" ON shuttle_trips FOR UPDATE
  USING (driver_id = auth.uid());

-- Location history visibility
CREATE POLICY "users_can_view_trip_history" ON shuttle_location_history FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM shuttle_trips 
      WHERE driver_id = auth.uid() OR passenger_id = auth.uid()
    )
  );
```

### 2. Update your existing shuttle_drivers and shuttles tables

Ensure these tables have the required columns:

```sql
-- shuttle_drivers table (if doesn't exist)
CREATE TABLE IF NOT EXISTS shuttle_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- shuttles table (if doesn't exist)
CREATE TABLE IF NOT EXISTS shuttles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  license_plate TEXT,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Environment Variables

Make sure your `.env.local` has Supabase config:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## API Usage Examples

### Driver: Start Sharing Location

```typescript
import { useDriverLocationTracking } from '@/hooks/useLocationTracking';

export function DriverApp() {
  const tracking = useDriverLocationTracking({
    tripId: 'trip-uuid-here',
    token: userToken,
    interval: 5000, // Update every 5 seconds
    enableHighAccuracy: true,
  });

  return (
    <div>
      <button onClick={() => tracking.startTracking()}>
        Start Sharing Location
      </button>
      {tracking.currentLocation && (
        <p>Location: {tracking.currentLocation.lat}, {tracking.currentLocation.lng}</p>
      )}
      {tracking.error && <p>Error: {tracking.error}</p>}
    </div>
  );
}
```

### Passenger: Track Trip

```typescript
import { TripTracker } from '@/components/tracking/TripTracker';

export function PassengerApp() {
  return (
    <TripTracker 
      tripId="trip-uuid-here" 
      token={userToken}
      pollingInterval={3000}
    />
  );
}
```

### Start a Trip (Driver)

```typescript
async function startTrip() {
  const response = await fetch('/api/tracking/trip/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      shuttle_id: 'shuttle-uuid',
      passenger_id: 'passenger-uuid',
      pickup_location: {
        lat: 32.0853,
        lng: 34.7818,
        address: 'Tel Aviv, Israel',
      },
      dropoff_location: {
        lat: 32.1234,
        lng: 34.8567,
        address: 'Jaffa, Israel',
      },
    }),
  });

  const trip = await response.json();
  console.log(`Trip started: ${trip.data.trip_id}`);
}
```

### Update Trip Status (Driver)

```typescript
async function updateStatus(tripId: string, status: 'in_progress' | 'arrived_at_pickup' | 'picked_up' | 'completed') {
  const response = await fetch('/api/tracking/trip/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      trip_id: tripId,
      status,
      notes: 'Arrived at pickup location',
    }),
  });

  const result = await response.json();
  console.log(`Status updated to: ${result.data.status}`);
}
```

### Calculate ETA (Public)

```typescript
async function getETA(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const response = await fetch('/api/tracking/eta', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from_lat: fromLat,
      from_lng: fromLng,
      to_lat: toLat,
      to_lng: toLng,
      average_speed_kmh: 50,
      buffer_minutes: 5,
    }),
  });

  const eta = await response.json();
  console.log(`ETA: ${eta.data.eta_minutes} minutes (${eta.data.distance_formatted})`);
}
```

## Component Integration

### Using TripTracker in Your App

```tsx
'use client';

import { TripTracker } from '@/components/tracking/TripTracker';
import { useSession } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';

export default function TripPage() {
  const session = useSession();
  const params = useParams();
  const tripId = params.tripId as string;

  if (!session?.user) {
    return <div>Please login</div>;
  }

  return (
    <div className="p-4">
      <h1>Track Your Ride</h1>
      <TripTracker 
        tripId={tripId}
        token={session.access_token}
        pollingInterval={3000}
      />
    </div>
  );
}
```

### Using DriverLocationShare in Driver App

```tsx
'use client';

import { DriverLocationShare } from '@/components/tracking/DriverLocationShare';
import { useSession } from '@supabase/auth-helpers-react';
import { useState } from 'react';

export default function DriverDashboard() {
  const session = useSession();
  const [tripId, setTripId] = useState<string>();
  const [error, setError] = useState<string>();

  if (!session?.user) {
    return <div>Please login</div>;
  }

  return (
    <div className="p-4">
      <h1>Driver Dashboard</h1>
      
      {tripId ? (
        <DriverLocationShare
          tripId={tripId}
          token={session.access_token}
          onError={setError}
          onSuccess={() => console.log('Location sharing started')}
        />
      ) : (
        <div className="text-gray-600">No active trip</div>
      )}

      {error && <div className="text-red-600 mt-4">{error}</div>}
    </div>
  );
}
```

## Adding Map Integration

The LiveMap component is a placeholder. Choose your preferred mapping library:

### Option 1: Leaflet + OpenStreetMap (Free)

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Update `LiveMap.tsx`:

```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export function LiveMap({ tripDetails, isLoading, height = '400px', className = '' }: LiveMapProps) {
  if (!tripDetails?.shuttle_location) {
    return <div style={{ height }} className={`bg-gray-100 rounded-lg ${className}`} />;
  }

  const { lat, lng } = tripDetails.shuttle_location;

  return (
    <MapContainer center={[lat, lng]} zoom={15} style={{ height }} className={className}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]}>
        <Popup>Shuttle</Popup>
      </Marker>
      {tripDetails.passenger_location && (
        <Marker position={[tripDetails.passenger_location.lat, tripDetails.passenger_location.lng]}>
          <Popup>You</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
```

### Option 2: Mapbox

```bash
npm install mapbox-gl react-map-gl
npm install -D @types/mapbox-gl
```

Add your Mapbox token to `.env.local`:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_token
```

### Option 3: Google Maps

```bash
npm install @react-google-maps/api
```

## Testing the API

### Test ETA Calculation

```bash
curl -X POST http://localhost:3000/api/tracking/eta \
  -H "Content-Type: application/json" \
  -d '{
    "from_lat": 32.0853,
    "from_lng": 34.7818,
    "to_lat": 32.1234,
    "to_lng": 34.8567
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "distance_meters": 13456,
    "distance_kilometers": "13.46",
    "distance_formatted": "13.5 km",
    "eta_seconds": 1512,
    "eta_minutes": 25,
    "eta_formatted": "25 minutes"
  }
}
```

### Test Location Update (requires auth)

```bash
# Get your token from Supabase
TOKEN="your_jwt_token"
TRIP_ID="trip-uuid"

curl -X POST "http://localhost:3000/api/tracking/location?trip_id=$TRIP_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "lat": 32.0853,
    "lng": 34.7818,
    "accuracy": 10,
    "speed": 45,
    "heading": 180
  }'
```

## Rate Limiting

Default limits:
- Location updates: 12 per minute (1 per 5 seconds)
- Trip management: 10 per minute
- General tracking: 30 per minute

For production, replace in-memory rate limiter with Redis:

```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
});

export function withRedisRateLimit(config: RateLimitConfig) {
  return async (key: string): Promise<{ allowed: boolean; retryAfter?: number }> => {
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000));
    }
    
    if (count > config.maxRequests) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfter: ttl };
    }
    
    return { allowed: true };
  };
}
```

## Monitoring

Add observability with your preferred provider:

```typescript
// Example with Sentry
import * as Sentry from "@sentry/nextjs";

export async function updateShuttleLocation(...) {
  try {
    // ... implementation
    Sentry.captureMessage(`Location updated for trip ${tripId}`);
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

## Production Checklist

- [ ] Database tables created with proper indexes
- [ ] Row-level security policies configured
- [ ] API routes deployed to production
- [ ] Map library integrated (Leaflet/Mapbox/Google)
- [ ] Rate limiting configured with Redis
- [ ] Error monitoring setup (Sentry/LogRocket)
- [ ] Performance monitoring enabled
- [ ] Geolocation permission flows tested
- [ ] Network error handling verified
- [ ] Load testing completed
- [ ] Accessibility audit passed
- [ ] GDPR/privacy policy updated

## Troubleshooting

### Geolocation Permission Denied
- Ensure HTTPS (required for geolocation)
- Check browser permissions settings
- Request permission explicitly before starting tracking

### Location Updates Not Being Received
- Check trip_id is valid and trip is active
- Verify Bearer token is valid
- Check rate limit hasn't been exceeded
- Enable browser console for error messages

### ETA Seems Incorrect
- Verify latitude/longitude aren't swapped
- Check average_speed_kmh is realistic
- Consider traffic delays in buffer_minutes
- Compare with Google Maps for verification

### Map Not Displaying
- Ensure map library is installed
- Check map container has height
- Verify API keys if using paid provider
- Check console for library errors

## Support & References

- **API Documentation**: `/src/lib/tracking/DOCUMENTATION.md`
- **Implementation Summary**: `/TRACKING_API_IMPLEMENTATION.md`
- **Supabase Docs**: https://supabase.io/docs
- **PostGIS Guide**: https://postgis.net/documentation
- **Leaflet Docs**: https://leafletjs.com/
- **React Leaflet**: https://react-leaflet.js.org/
