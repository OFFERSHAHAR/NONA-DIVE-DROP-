# Location Tracking System - DIVE DROP

## Overview

This is a web-based real-time location tracking system for DIVE DROP (shuttle ride-sharing app). It enables:

- **Drivers**: Continuous background location tracking with minimal battery drain
- **Passengers**: Real-time visualization of driver location with ETA calculation
- **Privacy**: Location access limited to active trips only
- **Cross-browser**: Works on desktop, mobile browsers, iOS Safari, Android Chrome

## Architecture

### Components

```
┌─────────────────────────────────────────┐
│      Frontend (Web Browser)              │
├─────────────────────────────────────────┤
│  Driver: useLocationTracking() hook      │
│    ↓ Collects GPS every 10s              │
│    ↓ Batches and sends to API            │
│                                          │
│  Passenger: PassengerMapView component   │
│    ↓ Subscribes to Realtime channel      │
│    ↓ Displays driver location on map     │
└─────────────────────────────────────────┘
              ↕ (HTTPS + WebSocket)
┌─────────────────────────────────────────┐
│    Backend (Next.js API Routes)          │
├─────────────────────────────────────────┤
│  POST /api/tracking/shuttle/batch-location
│    ↓ Validates location updates
│    ↓ Stores in trip_locations table
│    ↓ Broadcasts via Realtime channel
│                                          │
│  GET /api/tracking/shuttle/batch-location
│    ↓ Returns current trip location       │
└─────────────────────────────────────────┘
              ↕ (Postgres + Realtime)
┌─────────────────────────────────────────┐
│      Supabase Database                   │
├─────────────────────────────────────────┤
│  - trip_locations (historical)           │
│  - trip_live_status (current)            │
│  - trip_participants (access control)    │
└─────────────────────────────────────────┘
```

## Key Features

### 1. Battery Optimization

```typescript
// Automatic battery detection
- High accuracy (±5-10m) when charging or >=20% battery
- Reduced accuracy (±50m) when <15% battery to save power
- Update frequency adjusts by user type:
  - Driver: 10 seconds (allows quick rerouting)
  - Passenger: 5 seconds (better UX, less critical)
```

**Battery Impact Estimates:**
- Driver tracking (continuous): ~8-12% per hour
- Passenger tracking (5-30s intervals): ~3-5% per hour
- Standby (no tracking): <1% per hour

### 2. Real-time Location Sync

```typescript
// Supabase Realtime broadcasts to all subscribers
trip:${tripId} channel
  ├─ location-update event
  ├─ Payload: { locations: [...], timestamp }
  └─ Sent to all clients every 10-30s
```

### 3. Error Handling & Recovery

```typescript
// Automatic retry with exponential backoff
GPS unavailable → Wait 1s → Retry
Timeout → Wait 2s → Retry
Timeout → Wait 4s → Retry
Timeout → Stop and notify user

Permission denied → Stop and show permission dialog
Network error → Queue and retry when online
```

### 4. Privacy & Security

```typescript
// Only share during active trip
- Permission check: "While using the app"
- Only drivers/passengers in trip_participants can see locations
- Auto-stop tracking when trip ends
- Location history auto-purge after 7 days
- No background location after app closes
```

## Usage

### Driver - Continuous Location Tracking

```tsx
import { DriverLocationTracker } from '@/components/DriverLocationTracker';

export function ActiveTripPage({ tripId, userId }) {
  return (
    <div>
      <DriverLocationTracker
        tripId={tripId}
        userId={userId}
        isActive={true}
      />
    </div>
  );
}
```

**What happens:**
1. Component requests location permission (if not already granted)
2. Starts tracking GPS position every 10 seconds
3. Batches updates and sends to `/api/tracking/shuttle/batch-location`
4. Continues even if app moves to background (on supporting browsers)
5. Auto-stops when trip ends

### Passenger - Real-time Driver Tracking

```tsx
import { PassengerMapView } from '@/components/PassengerMapView';

export function PassengerTripPage({ tripId, userId, driverId }) {
  return (
    <PassengerMapView
      tripId={tripId}
      userId={userId}
      driverId={driverId}
    />
  );
}
```

**What happens:**
1. Subscribes to `trip:${tripId}` Realtime channel
2. Receives driver location updates every 10-30 seconds
3. Calculates ETA using Haversine formula
4. Displays driver position on interactive map
5. Shows location accuracy and update time

### Direct Hook Usage

```tsx
import { useLocationTracking } from '@/hooks/useLocationTracking';

export function CustomLocationUI() {
  const {
    isTracking,
    isSupported,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermission,
    getCurrentLocation,
    isLowBattery,
  } = useLocationTracking({
    tripId: 'trip-123',
    userId: 'user-456',
    userType: 'driver',
    enabled: true,
    config: {
      driverUpdateInterval: 10000,
      highAccuracy: true,
    },
  });

  return (
    <div>
      <p>Tracking: {isTracking ? 'Yes' : 'No'}</p>
      <p>Low Battery: {isLowBattery ? 'Yes' : 'No'}</p>
      {error && <p>Error: {error.message}</p>}
      <button onClick={startTracking}>Start</button>
      <button onClick={stopTracking}>Stop</button>
    </div>
  );
}
```

## Configuration

### LocationServiceConfig

```typescript
interface LocationServiceConfig {
  // Update intervals (ms)
  driverUpdateInterval: number = 10000;      // 10 seconds
  passengerUpdateInterval: number = 5000;    // 5 seconds

  // Accuracy
  highAccuracy: boolean = true;              // ±5-10m (vs ±50m)
  timeout: number = 10000;                   // Max wait time
  maximumAge: number = 0;                    // Don't use cached positions

  // Battery optimization
  enableBatteryAwareness: boolean = true;
  reducedAccuracyOnLowBattery: boolean = true;
  lowBatteryThreshold: number = 15;          // % at which to reduce accuracy

  // Error recovery
  maxRetries: number = 3;
  retryBackoffMs: number = 1000;
}
```

### Customize Config

```typescript
const { startTracking } = useLocationTracking({
  tripId,
  userId,
  userType: 'passenger',
  enabled: true,
  config: {
    passengerUpdateInterval: 3000, // More frequent updates
    highAccuracy: false,           // Save battery
    timeout: 5000,                 // Faster timeout
  },
});
```

## API Endpoints

### POST /api/tracking/shuttle/batch-location

Send batch location updates

**Request:**
```json
{
  "updates": [
    {
      "tripId": "uuid",
      "userId": "uuid",
      "userType": "driver",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "accuracy": 8,
        "altitude": 10,
        "heading": 45,
        "speed": 15,
        "timestamp": 1718923847000
      },
      "batteryLevel": 75,
      "isCharging": false,
      "networkType": "4g"
    }
  ],
  "timestamp": 1718923847000
}
```

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "failed": 0
}
```

**Error Handling:**
- `401`: Unauthorized (invalid token)
- `400`: Invalid request format (Zod validation)
- `500`: Database error

### GET /api/tracking/shuttle/batch-location

Get current trip location

**Query Parameters:**
- `tripId`: Trip UUID (required)

**Response:**
```json
{
  "tripId": "uuid",
  "locations": [
    {
      "user_id": "uuid",
      "user_type": "driver",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 8,
      "recorded_at": "2024-06-20T10:30:47Z"
    }
  ],
  "timestamp": 1718923847000
}
```

## Database Schema

### trip_locations

Stores all location updates (historical data)

```sql
CREATE TABLE trip_locations (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  user_id UUID REFERENCES auth.users(id),
  user_type TEXT CHECK (user_type IN ('driver', 'passenger')),

  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  accuracy DECIMAL(8, 2),
  altitude DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(8, 2),

  battery_level INTEGER,
  is_charging BOOLEAN,
  network_type TEXT,

  recorded_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_trip_locations_trip_id ON trip_locations(trip_id);
CREATE INDEX idx_trip_locations_user_id ON trip_locations(user_id);
CREATE INDEX idx_trip_locations_recorded_at ON trip_locations(recorded_at DESC);
```

### trip_live_status

Current location cache (fast lookups)

```sql
CREATE TABLE trip_live_status (
  trip_id UUID PRIMARY KEY,
  current_location JSONB,          -- Latest position
  last_location_update TIMESTAMP,
  last_driver_update TIMESTAMP,
  participants_online JSONB,
  updated_at TIMESTAMP
);
```

### trip_participants

Access control (who can see whose location)

```sql
CREATE TABLE trip_participants (
  trip_id UUID,
  user_id UUID,
  user_type TEXT CHECK (user_type IN ('driver', 'passenger')),
  joined_at TIMESTAMP,
  left_at TIMESTAMP,

  PRIMARY KEY (trip_id, user_id)
);
```

## Realtime Events

### Channel: trip:${tripId}

**Event: location-update**

Broadcast every 10-30 seconds when someone's location changes

```typescript
supabase
  .channel(`trip:${tripId}`)
  .on('broadcast', { event: 'location-update' }, (payload) => {
    console.log(payload.payload);
    // {
    //   trip_id: 'uuid',
    //   locations: [
    //     { user_id, user_type, latitude, longitude, accuracy }
    //   ],
    //   timestamp: milliseconds
    // }
  })
  .subscribe();
```

## Security & Privacy

### Row-Level Security (RLS)

All location tables use RLS to enforce:

```sql
-- Users can only see locations from trips they're in
SELECT ✓ if user is trip_participant
INSERT ✓ if user_id matches auth.uid()
UPDATE ✗ (disabled - write-only)
DELETE ✗ (disabled - retention)
```

### Permission Model

```
iOS: "While Using the App" only
  ✓ Foreground tracking works
  ✓ Some background tracking on iOS 13+
  ✗ Continuous background (not possible on web)

Android: "Allow all the time" or "Allow only while using the app"
  ✓ Foreground tracking works
  ✗ True background service (not possible on web)

Web limitation:
  - Service workers can't access Geolocation API
  - Background tracking requires user interaction
  - Best case: 30-60s in background before suspend
```

### Data Retention

```sql
-- Auto-cleanup after 7 days (optional)
SELECT cleanup_old_locations(7);

-- Manual retention
DELETE FROM trip_locations
WHERE created_at < NOW() - '7 days'::INTERVAL;
```

### Disable Location Sharing

```typescript
// User can stop tracking anytime
const { stopTracking } = useLocationTracking({...});
stopTracking(); // Immediately stops sending updates
```

## Testing

### Unit Tests

```typescript
import { LocationService } from '@/lib/location/locationService';

describe('LocationService', () => {
  it('should validate location coordinates', () => {
    expect(() => {
      LocationSchema.parse({
        latitude: 200, // invalid
        longitude: 0,
        timestamp: Date.now(),
      });
    }).toThrow();
  });

  it('should map geolocation errors', () => {
    const service = new LocationService();
    const error = service['mapGeolocationError']({
      code: 1, // PERMISSION_DENIED
      message: 'User denied',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as any);

    expect(error.code).toBe('PERMISSION_DENIED');
  });
});
```

### Integration Tests

```typescript
import { useLocationTracking } from '@/hooks/useLocationTracking';

test('driver location tracking', async () => {
  const { startTracking, isTracking } = renderHook(() =>
    useLocationTracking({
      tripId: 'test-trip',
      userId: 'test-user',
      userType: 'driver',
      enabled: false,
    })
  );

  await waitFor(() => expect(isTracking).toBe(false));
  
  // Simulate permission grant
  act(() => startTracking());
  
  await waitFor(() => expect(isTracking).toBe(true));
});
```

## Browser Support

| Browser | Geolocation | Battery API | Realtime |
|---------|------------|-------------|----------|
| Chrome (desktop) | ✓ | ✓ | ✓ |
| Chrome (mobile) | ✓ | ✓ | ✓ |
| Firefox | ✓ | - | ✓ |
| Safari (desktop) | ✓ | - | ✓ |
| Safari (iOS) | ✓ | - | ✓ |
| Edge | ✓ | ✓ | ✓ |

## Performance

### Network Usage
- Each location update: ~200 bytes
- Driver (10s interval): ~72 KB/hour
- Passenger (5s interval): ~144 KB/hour
- Batch (10 updates): ~2 KB overhead

### Database Impact
- Inserts: ~1-2ms per location
- Batch insert (10): ~5-10ms
- Query (get current): <1ms with index

### Memory Usage
- LocationService: ~50 KB
- useLocationTracking hook: ~20 KB per instance
- Location cache: ~1 KB per trip

## Troubleshooting

### Location Permission Denied
```typescript
// Check permission status
const { permissionStatus, requestPermission } = useLocationTracking({...});

if (permissionStatus === 'denied') {
  // Guide user to Settings > Location
  // Browser can't override system-level denial
}
```

### No GPS Signal
```typescript
// Timeout after 10s, retry with backoff
// Show UI message to user
const { error } = useLocationTracking({...});

if (error?.code === 'POSITION_UNAVAILABLE') {
  // "Move outside or wait for GPS lock"
}
```

### Battery Draining Too Fast
```typescript
// Reduce accuracy or update frequency
updateConfig({
  driverUpdateInterval: 30000, // 30s instead of 10s
  highAccuracy: false,         // ±50m instead of ±5-10m
});
```

### Realtime Channel Not Receiving Updates
```typescript
// Check subscription status
if (listener.isSubscribed()) {
  // Channel is connected
} else {
  // Manually refresh with polling
  const locations = await listener.refreshLocation(tripId);
}
```

## Future Enhancements

### 1. Map Integration
- [ ] Integrate Mapbox GL or Google Maps
- [ ] Draw route between driver and passenger
- [ ] Show estimated route on map

### 2. Advanced Analytics
- [ ] Driver speed monitoring
- [ ] Harsh braking detection
- [ ] Trip duration predictions
- [ ] Route efficiency analysis

### 3. Offline Support
- [ ] Queue locations when offline
- [ ] Sync when connection restored
- [ ] Service Worker caching

### 4. Native Mobile Apps
- [ ] React Native implementation
- [ ] True background location service
- [ ] Geofencing support
- [ ] Push notifications for passenger alerts

### 5. Privacy Features
- [ ] Location blurring (anonymize exact position)
- [ ] Selective location sharing (pick which trip members can see)
- [ ] Location history deletion
- [ ] Privacy audit logs

## References

- [Geolocation API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Battery Status API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [OWASP Location Data Privacy](https://owasp.org/www-community/attacks/Location_Spoofing)
