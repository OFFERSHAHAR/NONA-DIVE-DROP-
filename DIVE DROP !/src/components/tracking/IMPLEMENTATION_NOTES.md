# Live Tracking Implementation Notes

## Quick Start

### 1. Import and Use
```typescript
// In your page or component
import { LiveTrackingContainer } from '@/components/tracking';

export default function TrackingPage({ tripId }: { tripId: string }) {
  return <LiveTrackingContainer tripId={tripId} />;
}
```

### 2. Database Setup
Run the migration:
```bash
supabase migration up
# or manually run: supabase/migrations/tracking_schema.sql
```

### 3. Seed Test Data
```sql
-- Create test driver
INSERT INTO drivers (id, name, phone, license_number, rating, reviews_count)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'משה כהן',
  '+972-50-1234567',
  '123456789',
  4.8,
  42
);

-- Create test shuttle
INSERT INTO shuttles (id, plate_number, model, capacity, driver_id)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'קק-123-45',
  'Mercedes Sprinter 2024',
  8,
  '550e8400-e29b-41d4-a716-446655440000'::uuid
);

-- Add to trip
UPDATE dive_trips
SET shuttle_id = '550e8400-e29b-41d4-a716-446655440001'::uuid,
    status = 'driver_en_route',
    pickup_location = '{"latitude": 32.0853, "longitude": 34.7818}'::jsonb,
    destination_location = '{"latitude": 32.8755, "longitude": 34.7674}'::jsonb,
    scheduled_time = NOW() + INTERVAL '1 hour'
WHERE id = 'your-trip-id';
```

## Component Architecture

### Data Flow
```
Page (Server)
  ↓ (auth check + trip verification)
LiveTrackingContainer (Client Boundary)
  ├── useTrackingMap hook
  │   ├── fetches trip + shuttle data
  │   ├── watches geolocation
  │   └── subscribes to shuttle location updates
  ├── useNotifications hook
  │   └── monitors distance/ETA thresholds
  ├── TrackingMap
  │   └── renders map with markers/polyline
  ├── ShuttleInfoCard
  │   └── displays driver info + metrics
  └── NotificationCenter
      └── shows toasts based on events
```

### State Management

**Using hooks instead of Redux/Zustand for:**
- Simpler codebase
- Better performance (no extra re-renders)
- Smaller bundle size
- Easier testing

**If you need persistent state (e.g., tracking history):**
```typescript
// Add Zustand store
import create from 'zustand';

interface TrackingStore {
  trackingHistory: ShuttleLocation[];
  addLocation: (location: ShuttleLocation) => void;
}

const useTrackingStore = create<TrackingStore>((set) => ({
  trackingHistory: [],
  addLocation: (location) => 
    set((state) => ({
      trackingHistory: [...state.trackingHistory, location]
    }))
}));
```

## Map Library Comparison

### Leaflet (Current Implementation) ✅
**Pros:**
- Free and open-source
- No API key needed
- Lightweight (39KB)
- Simple API
- Mobile-optimized
- Good for basic tracking

**Cons:**
- Limited styling options
- No native clustering
- Routing via external API

**When to use:** MVP, cost-sensitive, simple tracking

### Google Maps
**Pros:**
- Excellent routing/directions
- Real-time traffic
- Street view
- Advanced clustering
- Native marker animations

**Cons:**
- Paid service ($7/month per 1000 views)
- Requires API key
- Larger bundle (>500KB)
- More complex setup

**When to use:** Production app, route optimization needed

**Integration:**
```typescript
// Install
npm install @googlemaps/js-api-loader

// In component
const { Loader } = await import('@googlemaps/js-api-loader');

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

const { Map } = await loader.importLibrary('maps');
const map = new Map(containerRef.current, {
  center: { lat, lng },
  zoom: 15,
});
```

### Mapbox GL
**Pros:**
- Beautiful maps
- Advanced styling (custom layers)
- Excellent performance
- Native clustering
- Heatmaps

**Cons:**
- Freemium model ($500 free/month, then charged)
- Requires access token
- Larger bundle
- Steeper learning curve

**When to use:** High-end design, complex map needs

## Performance Considerations

### Rendering
```typescript
// TrackingMap uses ref-based updates to avoid re-renders
const mapInstanceRef = useRef<L.Map | null>(null);

// Markers update without re-rendering entire map
markersRef.current.get('user')?.setLatLng([lat, lng]);
```

### Memory Management
```typescript
// Clean up watchers and subscriptions
useEffect(() => {
  return () => {
    navigator.geolocation.clearWatch(watchId);
    supabase.channel().unsubscribe();
  };
}, []);
```

### Network Optimization
```typescript
// Update intervals are conservative to reduce bandwidth
updateInterval = 3000; // 3 second updates

// For production with high load:
updateInterval = 5000; // 5 seconds
// Or implement smart sampling:
if (distance < 500) {
  updateInterval = 2000; // Closer = faster updates
} else if (distance < 2000) {
  updateInterval = 5000; // Medium distance
} else {
  updateInterval = 10000; // Far away
}
```

## Customization

### Change Map Provider
```typescript
// In TrackingMap.tsx, replace Leaflet import with Google Maps

// Before (Leaflet)
import('leaflet').then(L => {
  const map = L.map(...);
});

// After (Google Maps)
const { Map } = google.maps;
const map = new Map(containerRef.current, options);
```

### Customize Markers
```typescript
// In TrackingMap.tsx, modify icon HTML

// Current: Blue dot for user
<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white" />

// Custom: User avatar
<img src={userAvatar} class="w-6 h-6 rounded-full border-4 border-white" />

// Animated shuttle
<div class="animate-bounce w-7 h-7 bg-red-500 rounded-full" />
```

### Notification Triggers
```typescript
// In useNotifications.ts, change thresholds

const NOTIFICATION_TRIGGERS = {
  DRIVER_NEARBY: 300,      // was 500m
  DRIVER_ARRIVED: 25,      // was 50m
  ETA_5_MIN: 5 * 60,       // was 5 min
  ETA_1_MIN: 2 * 60,       // was 1 min
};
```

### Translation Keys
```typescript
// Add more languages in src/i18n/locales/[locale]/tracking.json

// Example: French
{
  "tracking": {
    "live": "En direct",
    "vehicle": "Véhicule",
    ...
  }
}

// Update routing.ts
export const routing = defineRouting({
  locales: ['en', 'he', 'fr'],  // Add 'fr'
  defaultLocale: 'he',
});
```

## Testing Strategy

### Unit Tests
```typescript
// tests/lib/tracking/tracking-utils.test.ts

describe('calculateDistance', () => {
  it('should calculate distance between two coordinates', () => {
    const distance = calculateDistance(32, 34, 32.1, 34.1);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20000); // ~15km
  });

  it('should return 0 for same coordinates', () => {
    const distance = calculateDistance(32, 34, 32, 34);
    expect(distance).toBe(0);
  });
});

describe('calculateETA', () => {
  it('should calculate ETA based on distance and speed', () => {
    const eta = calculateETA(15000, 15); // 15km at 15km/h
    expect(eta).toBe(60); // 1 hour
  });
});
```

### Integration Tests
```typescript
// tests/hooks/useTrackingMap.test.tsx

describe('useTrackingMap', () => {
  it('should fetch trip and shuttle data', async () => {
    const { result } = renderHook(
      () => useTrackingMap({ tripId: 'test-trip-id' }),
      { wrapper: SupabaseProvider }
    );

    await waitFor(() => {
      expect(result.current.trip).toBeDefined();
      expect(result.current.shuttle).toBeDefined();
    });
  });

  it('should update distance when shuttle location changes', async () => {
    // ...
  });
});
```

### E2E Tests
```typescript
// tests/e2e/tracking.spec.ts

test('Full tracking flow', async ({ page }) => {
  await page.goto('/en/tracking/trip-123');
  
  // Wait for map to load
  await page.waitForSelector('[data-testid="map-container"]');
  
  // Check user marker visible
  expect(await page.locator('[data-testid="user-marker"]').isVisible()).toBeTruthy();
  
  // Check shuttle info card
  expect(await page.locator('[data-testid="shuttle-card"]').isVisible()).toBeTruthy();
  
  // Call driver button
  await page.click('button:has-text("Call Driver")');
  expect(page).toHaveURL(/tel:/);
});
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Geolocation | ✅ | ✅ | ✅ | ✅ |
| Leaflet | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | 🟡 (limited) | ✅ |
| ES6 (target) | ✅ | ✅ | ✅ | ✅ |
| Flexbox Layout | ✅ | ✅ | ✅ | ✅ |

**Mobile Browsers:**
- Chrome Mobile: Full support
- Safari iOS: Full support (notification limited)
- Firefox Mobile: Full support
- Samsung Internet: Full support

## Security Considerations

### 1. Authentication
```typescript
// All tracking endpoints require auth
const { data: { session } } = await supabase.auth.getSession();
if (!session) return error 401;
```

### 2. Authorization
```typescript
// User can only view their own trips
// Enforced via RLS policies
CREATE POLICY "user_view_own_trips" ON dive_trips
FOR SELECT USING (auth.uid() = user_id);
```

### 3. Location Privacy
```typescript
// Locations only stored during active trip
// Auto-deleted after trip completion
// Can be deleted on demand by user
```

### 4. Rate Limiting
```typescript
// Implement rate limiting on location updates
// Use Supabase edge functions or middleware
// Max 1 update per second per shuttle
```

## Monitoring & Analytics

### Events to Track
```typescript
// In production, send to analytics service

const trackEvent = (name: string, data: any) => {
  if (window.gtag) {
    gtag('event', name, data);
  }
};

// Tracking page viewed
trackEvent('tracking_page_view', { tripId, status });

// Driver arrived
trackEvent('driver_arrived', { tripId, etaMinutes });

// Notification shown
trackEvent('notification_shown', { type: 'driver_nearby' });

// Error occurred
trackEvent('tracking_error', { error: error.message });
```

### Performance Metrics
```typescript
// Use Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Known Limitations

1. **Geolocation Accuracy**
   - Depends on device GPS and network
   - Can be 5-50m off in cities
   - Indoor locations unreliable

2. **Real-Time Updates**
   - Supabase uses websockets (can be blocked by some networks)
   - Fallback: HTTP polling every 5 seconds

3. **Map Rendering**
   - Leaflet doesn't support vector tiles (use Mapbox for that)
   - Limited clustering (use Mapbox for advanced clustering)

4. **Battery Usage**
   - High accuracy GPS drains battery quickly
   - Consider reducing update frequency for long trips

## Troubleshooting Checklist

```typescript
// Map not showing
□ Check browser console for errors
□ Verify Leaflet loaded correctly
□ Check map container has height
□ Verify tile layer URL is accessible

// Geolocation not working
□ Check browser permissions
□ Verify HTTPS (required for geolocation)
□ Check device location is enabled
□ Try different browser

// Real-time not updating
□ Check Supabase connection status
□ Verify RLS policies allow reads
□ Check network tab for subscriptions
□ Reload page to re-subscribe

// Notifications not showing
□ Check browser notifications permission
□ Verify distance/ETA thresholds
□ Check browser console for errors
□ Test with manual triggerNotification()

// High battery drain
□ Reduce update frequency
□ Disable high accuracy geolocation
□ Check background processes
□ Implement pause when inactive
```

## Version History

### v1.0.0 (Current)
- Basic real-time tracking
- Leaflet map integration
- Distance/ETA calculations
- Browser notifications
- RTL/LTR i18n support
- Mobile-optimized UI

### v1.1.0 (Planned)
- Google Maps integration
- Offline map caching
- Trip history/replay
- Driver ratings

### v2.0.0 (Future)
- AR navigation
- Multiple shuttle tracking
- Advanced analytics
- API v2 with webhooks
