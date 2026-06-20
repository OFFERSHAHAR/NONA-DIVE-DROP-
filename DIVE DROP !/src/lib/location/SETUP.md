# Location Tracking Setup Guide

## 1. Database Setup

### Run Migrations

Option A: Using Supabase CLI (recommended)

```bash
# Create migration file
supabase migration new create_location_tracking

# Copy content from src/lib/location/migrations.sql to the migration file

# Apply migration
supabase db push
```

Option B: Using Supabase Dashboard

1. Go to SQL Editor
2. Create new query
3. Paste the SQL from `src/lib/location/migrations.sql`
4. Run all statements

### Verify Tables Created

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'trip%';

-- Should return:
-- trip_locations
-- trip_live_status
-- trip_participants
```

## 2. Environment Variables

Update `.env.local`:

```bash
# These should already exist
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Optional: Location tracking specific
NEXT_PUBLIC_LOCATION_UPDATE_INTERVAL_DRIVER=10000
NEXT_PUBLIC_LOCATION_UPDATE_INTERVAL_PASSENGER=5000
NEXT_PUBLIC_LOCATION_HIGH_ACCURACY=true
NEXT_PUBLIC_LOCATION_RETENTION_DAYS=7
```

## 3. Required API Routes

Ensure these exist in your project:

- ✓ `/api/tracking/shuttle/batch-location` (POST) - created in this setup
- ✓ `/api/tracking/shuttle/batch-location` (GET) - created in this setup

## 4. Supabase Realtime Configuration

### Enable Realtime

```bash
# Via Supabase CLI
supabase db push

# Or manually in dashboard:
# 1. Go to Database > Replication
# 2. Enable replication for trip_locations table
# 3. Enable replication for trip_live_status table
```

### Verify Realtime Works

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

const channel = supabase
  .channel('test:123')
  .on('broadcast', { event: 'test' }, (payload) => {
    console.log('Received:', payload);
  })
  .subscribe((status) => {
    console.log('Status:', status);
  });

// Test broadcast
setTimeout(() => {
  channel.send('broadcast', {
    event: 'test',
    payload: { message: 'Hello' },
  });
}, 1000);
```

## 5. Frontend Integration

### Step 1: Add Type Definitions

```typescript
// src/types/location.ts
export type LocationUpdate = {
  tripId: string;
  userId: string;
  userType: 'driver' | 'passenger';
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
};
```

### Step 2: Create Trip with Participants

```typescript
// Create trip in trips table
const { data: trip, error } = await supabase
  .from('trips')
  .insert({
    start_location: { lat: 40.7128, lng: -74.0060 },
    destination: { lat: 40.7589, lng: -73.9851 },
    driver_id: driverId,
    status: 'active',
  })
  .select()
  .single();

// Add participants
const { error: participantError } = await supabase
  .from('trip_participants')
  .insert([
    { trip_id: trip.id, user_id: driverId, user_type: 'driver' },
    { trip_id: trip.id, user_id: passengerId, user_type: 'passenger' },
  ]);
```

### Step 3: Use Driver Component

```tsx
// pages/trips/[id].tsx (or app/trips/[id]/page.tsx)
import { DriverLocationTracker } from '@/components/DriverLocationTracker';
import { PassengerMapView } from '@/components/PassengerMapView';
import { useAuth } from '@/hooks/useAuth';

export default function TripPage({ params: { id } }) {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver'; // adjust based on your auth

  return (
    <div className="p-4">
      <h1>Trip Details</h1>

      {isDriver ? (
        <DriverLocationTracker
          tripId={id}
          userId={user.id}
          isActive={true}
        />
      ) : (
        <PassengerMapView
          tripId={id}
          userId={user.id}
          driverId={trip.driver_id}
        />
      )}
    </div>
  );
}
```

### Step 4: Handle Permissions

Add permission request on trip start:

```tsx
import { useLocationTracking } from '@/hooks/useLocationTracking';

export function TripStartPage() {
  const { requestPermission } = useLocationTracking({
    tripId: 'temp',
    userId: 'temp',
    userType: 'driver',
    enabled: false,
  });

  const handleStartTrip = async () => {
    // Request location permission before starting
    try {
      await requestPermission();
      // Proceed with trip start
    } catch (error) {
      // Handle permission denied
    }
  };

  return <button onClick={handleStartTrip}>Start Trip</button>;
}
```

## 6. Testing Location Tracking

### Manual Test: Desktop Browser

```typescript
// In browser console while on trip page
const service = window.__locationService;

// Get current position
service.getCurrentPosition().then((pos) => {
  console.log('Current position:', pos);
});

// Watch position
navigator.geolocation.watchPosition(
  (pos) => console.log('Position:', pos.coords),
  (err) => console.error('Error:', err)
);
```

### Manual Test: Mobile Browser

1. Open trip page on mobile device (iOS Safari or Android Chrome)
2. Grant location permission when prompted
3. Open DevTools (if available)
4. Monitor network tab for POST requests to `/api/tracking/shuttle/batch-location`
5. Should see requests every 10 seconds (driver) or 5 seconds (passenger)

### Automated Test

```typescript
// src/lib/location/__tests__/locationService.test.ts
import { LocationService, LocationSchema } from '../locationService';

describe('LocationService', () => {
  it('validates location coordinates', () => {
    const valid = {
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: Date.now(),
    };

    expect(() => LocationSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid latitude', () => {
    const invalid = {
      latitude: 200, // Out of range
      longitude: 0,
      timestamp: Date.now(),
    };

    expect(() => LocationSchema.parse(invalid)).toThrow();
  });
});
```

Run tests:

```bash
npm test -- locationService.test.ts
```

## 7. Production Deployment

### Before Going Live

#### Security Checklist

- [ ] All locations use HTTPS (automatic with Next.js deployment)
- [ ] Supabase RLS policies enabled on all tables
- [ ] Service role key kept secure (not in frontend code)
- [ ] Location retention policy configured (7-day cleanup)
- [ ] API rate limiting added (optional)

#### Performance Checklist

- [ ] Database indexes created on trip_id, user_id, recorded_at
- [ ] Batch endpoint tested with 100+ updates
- [ ] Realtime channel tested with 50+ concurrent subscribers
- [ ] Battery optimization tested on low-battery device
- [ ] Network reconnection tested (disconnect/reconnect)

#### Monitoring Checklist

- [ ] Set up error logging for API failures
- [ ] Monitor database query performance
- [ ] Track location update latency
- [ ] Set up battery drain alerts

### Scaling Considerations

**Single Region (< 1000 trips/day):**
- Current setup is sufficient
- Monitor database connections (default: 20 concurrent)

**Multi-Region (> 10k trips/day):**

1. Enable database connection pooling:
   ```bash
   # Supabase dashboard:
   # Project Settings > Database > Connection Pooling
   # Mode: Transaction
   # Pool size: 25
   ```

2. Add Redis cache (optional):
   ```typescript
   // Cache current location to avoid DB query
   const cacheKey = `trip:${tripId}:location`;
   const cached = await redis.get(cacheKey);
   if (cached) return cached;
   ```

3. Consider separate location service:
   ```
   POST /api/locations/batch (high throughput)
   GET /api/locations/current/{tripId} (cached)
   Channel: trip:{tripId}:location (realtime)
   ```

## 8. Troubleshooting

### Issue: Permission Always Denied

**Solution:** Clear browser site data and re-grant permission

```typescript
// In browser console
navigator.permissions.query({ name: 'geolocation' }).then((result) => {
  console.log('Permission:', result.state);
});
```

### Issue: No Location Updates

**Debugging steps:**

1. Check network tab:
   ```bash
   # Should see POST to /api/tracking/shuttle/batch-location
   # Status: 200
   # Payload: { updates: [...] }
   ```

2. Check database:
   ```sql
   SELECT COUNT(*) FROM trip_locations
   WHERE trip_id = 'your-trip-id';
   -- Should increase every 10s
   ```

3. Check browser console:
   ```typescript
   window.navigator.geolocation.getCurrentPosition(
     (pos) => console.log('Position:', pos),
     (err) => console.error('Error:', err)
   );
   ```

### Issue: High Battery Drain

**Reduce accuracy and frequency:**

```typescript
const { startTracking } = useLocationTracking({
  tripId,
  userId,
  userType: 'driver',
  config: {
    driverUpdateInterval: 20000, // 20s instead of 10s
    highAccuracy: false,        // Reduce to ±50m
  },
});
```

### Issue: Realtime Not Working

**Check channel status:**

```typescript
const listener = createRealtimeLocationListener(supabase);
const unsubscribe = listener.subscribe(tripId, (payload) => {
  console.log('Received:', payload);
});

// Check if subscribed
setTimeout(() => {
  console.log('Is subscribed:', listener.isSubscribed());
}, 2000);
```

**Fallback to polling:**

```typescript
const refreshLocation = async () => {
  const { locations } = await fetch(
    `/api/tracking/shuttle/batch-location?tripId=${tripId}`
  ).then((r) => r.json());
  return locations;
};

// Poll every 5 seconds if not realtime
setInterval(refreshLocation, 5000);
```

## 9. Next Steps

1. **Add Map Integration:**
   - Install: `npm install mapbox-gl` or `npm install google-maps-react`
   - Update `PassengerMapView.tsx` to show actual map

2. **Add Notifications:**
   - Send push notification when driver arrives
   - Send SMS/email with trip link

3. **Add Analytics:**
   - Track average trip duration
   - Track driver efficiency
   - Analyze location accuracy

4. **Add Offline Support:**
   - Queue updates when offline
   - Sync when connection restored
   - Show offline indicator in UI

5. **Add Mobile Apps:**
   - Create React Native version
   - Use `react-native-geolocation-service`
   - Enable true background tracking

## Support

For issues or questions:

1. Check the main guide: `src/lib/location/LOCATION_TRACKING.md`
2. Review component examples: `src/components/Driver*` and `src/components/Passenger*`
3. Check API implementation: `src/app/api/tracking/shuttle/batch-location/route.ts`
