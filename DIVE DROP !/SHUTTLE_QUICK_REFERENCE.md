# Shuttle Tracking - Quick Reference Card

## File Structure

```
src/
├── types/shuttle.ts                    ← Type definitions
├── lib/
│   ├── supabase/
│   │   ├── shuttle-client.ts          ← DB operations + subscriptions
│   │   └── database.types.ts          ← Auto-generated types
│   └── driver-location-service.ts     ← Driver GPS service
├── hooks/
│   └── useShuttleTracking.ts          ← React hooks
└── components/
    └── ShuttleTracker.tsx             ← Tracking UI
```

---

## Quick API Reference

### Diver: Watch Shuttle Approach

```typescript
// In your component
import { useDiverTracking } from "@/hooks/useShuttleTracking";

export function DiverTrackingScreen({ tripId, dropoffLat, dropoffLon }) {
  const { trip, eta, distance } = useDiverTracking({
    tripId,
    dropoffLat,
    dropoffLon,
  });

  return (
    <div>
      <h2>Shuttle Status: {trip?.status}</h2>
      <p>Distance: {distance?.distance_km.toFixed(1)} km</p>
      <p>ETA: {eta?.eta_minutes} minutes</p>
    </div>
  );
}
```

### Driver: Send Location Updates

```typescript
// In driver app
import { useLocationTracking } from "@/lib/driver-location-service";

export function DriverApp({ tripId }) {
  const { isTracking, lastPosition, error } = useLocationTracking({
    tripId,
    updateIntervalMs: 15000, // Every 15 seconds
  });

  return (
    <div>
      {isTracking && <p>📍 Tracking active</p>}
      {error && <p>⚠️ {error}</p>}
    </div>
  );
}
```

### Manual Operations

```typescript
import {
  createShuttleTrip,
  createPassengerBooking,
  getTripPassengers,
  subscribeTripUpdates,
} from "@/lib/supabase/shuttle-client";

// Create trip
const trip = await createShuttleTrip(
  shuttleId,
  driverId,
  "Start Location",
  "End Location"
);

// Add passenger
const booking = await createPassengerBooking(
  trip.id,
  userId,
  "Pickup",
  "Dropoff"
);

// Subscribe to updates
const unsubscribe = subscribeTripUpdates(trip.id, (updatedTrip) => {
  console.log("Shuttle at:", updatedTrip.current_latitude);
});

// Clean up
unsubscribe();
```

---

## Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Location update frequency (milliseconds)
NEXT_PUBLIC_LOCATION_UPDATE_INTERVAL=15000
```

---

## Database Tables

| Table | Records | Purpose |
|-------|---------|---------|
| `shuttles` | 1 per vehicle | Metadata (name, capacity) |
| `shuttle_trips` | 1 per active trip | Current location, status |
| `shuttle_passengers` | 1 per booking | Diver booking info |
| `shuttle_location_history` | ~6/minute per shuttle | Analytics trail |

---

## React Hooks

### useDiverTracking
```typescript
const { trip, passengers, distance, eta, status, error } = useDiverTracking({
  tripId: "uuid",
  userLat: 20.8,
  userLon: -87.0,
  dropoffLat: 21.0,
  dropoffLon: -87.2,
  enabled: true,
});
```

### useUserBookings
```typescript
const { bookings, loading, error } = useUserBookings(userId);
// bookings = ShuttlePassenger[]
```

### useNearbyShuttles
```typescript
const { shuttles, loading, error } = useNearbyShuttles({
  latitude: 20.8,
  longitude: -87.0,
  radiusMeters: 5000,
  pollIntervalMs: 30000,
});
```

### useETACalculator
```typescript
const { eta, distance, loading, error } = useETACalculator({
  shuttleLatitude: 20.8,
  shuttleLongitude: -87.0,
  destinationLatitude: 21.0,
  destinationLongitude: -87.2,
});
```

### useLocationTracking (Driver)
```typescript
const { isTracking, lastPosition, error } = useLocationTracking({
  tripId: "uuid",
  updateIntervalMs: 15000,
});
```

---

## Common Status Values

```typescript
// Trip Status
"en_route"      // Moving to destination
"arrived"       // At destination
"completed"     // Trip finished
"cancelled"     // Cancelled

// Passenger Status
"waiting"       // Waiting for pickup
"picked_up"     // In vehicle
"dropped_off"   // Completed
"cancelled"     // Cancelled

// Shuttle Status
"active"        // Available
"offline"       // Not available
"maintenance"   // Being serviced
```

---

## RLS Policies

✅ **Diver**: Can only see trips they're booked on
✅ **Driver**: Can only see/update their own trips
✅ **Driver**: Can see passengers on their trips
✅ **Diver**: Can only update their own booking status

---

## Performance Tips

| Goal | Action |
|------|--------|
| Reduce latency | Use realtime subscriptions (not polling) |
| Reduce bandwidth | Update every 10-30 seconds (not every second) |
| Reduce DB load | Filter subscriptions by trip ID |
| Prevent memory leak | Always cleanup subscriptions in useEffect |
| Batch updates | Use `batchUpdateLocations()` for 2+ trips |

---

## Error Handling

```typescript
try {
  await updateDriverLocation(update);
} catch (error) {
  if (error.message.includes("RLS")) {
    // User not authorized
  } else if (error.message.includes("not found")) {
    // Trip doesn't exist
  } else if (error.message.includes("network")) {
    // Offline - queue for retry
  }
}
```

---

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Load test realtime
artillery run artillery-config.yml

# Check performance
npm run analyze
```

---

## Deployment Checklist

- [ ] Migration applied: `supabase db push`
- [ ] Realtime enabled for 3 tables
- [ ] RLS policies verified
- [ ] Environment variables set
- [ ] Auth configured (email/password or OAuth)
- [ ] Location service integrated
- [ ] Tracking components tested
- [ ] Load tested with realistic data
- [ ] Monitoring configured
- [ ] Backups enabled

---

## Debugging

```typescript
// Check subscription status
console.log(supabase.realtime);

// Check RLS
// - Try query as authenticated user
// - Try as unauthenticated user
// - Should get different results

// Check location history
SELECT * FROM shuttle_location_history 
WHERE trip_id = 'xxx' 
ORDER BY timestamp DESC 
LIMIT 10;

// Check active subscriptions
SELECT * FROM pg_stat_activity;
```

---

## Key Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Update frequency | 10-15s | Per GPS update |
| Realtime latency | 250-1000ms | Total |
| Location history | 86M rows/year | At 10s intervals |
| Free tier realtime | 100 connections | Use Pro for more |
| Coordinate precision | ±1.1mm | DECIMAL(10, 8) |
| Typical ETA error | 5-10% | Depends on speed stability |

---

## Support

📚 Full docs: `docs/SHUTTLE_TRACKING_GUIDE.md`
🏗️ Architecture: `docs/SHUTTLE_ARCHITECTURE_SUMMARY.md`
🚀 Setup: `SHUTTLE_SETUP.md`
💻 This reference: `SHUTTLE_QUICK_REFERENCE.md`

---

## License

Built for DIVE DROP! 🤿
