# Live Tracking Map System - Implementation Guide

## Overview

A complete real-time shuttle tracking system for dive trip coordination. Users can track their assigned shuttle driver in real-time with live ETA, distance calculations, and status notifications.

## Architecture

### Page Structure
```
[locale]/tracking/[trip_id]/
├── page.tsx                    # Server component with auth + SSR
└── LiveTrackingContainer       # Client-side tracking orchestrator
```

### Core Components

#### 1. **TrackingMap** (`src/components/tracking/TrackingMap.tsx`)
- Leaflet-based interactive map (open-source, no API keys needed)
- Real-time marker updates for user and shuttle
- Dynamic route polyline rendering
- Zoom/pan controls with geolocation centering
- Fallback support for when Leaflet unavailable

**Key Features:**
- Auto-centers on user location
- Displays user marker (blue dot)
- Displays shuttle marker (red car icon)
- Shows dashed route line between points
- Responsive and mobile-optimized

**Map Provider Options:**
```
- Leaflet (OSM) ✅ Recommended - Free, open-source
- Google Maps - Paid, accurate, but requires API key
- Mapbox GL - Freemium, good styling
```

#### 2. **ShuttleInfoCard** (`src/components/tracking/ShuttleInfoCard.tsx`)
- Driver profile with avatar and rating
- Vehicle details (plate, capacity, passengers)
- Live distance and ETA display
- One-tap call driver functionality
- Message button for in-app chat
- Status indicators and arrival alerts

**Status States:**
```
- pending          → Waiting for driver assignment
- driver_assigned → Driver allocated, not moving yet
- driver_en_route → Driver actively approaching
- driver_arrived  → Driver at pickup location (< 50m)
- en_route_to_site → Traveling to dive site
- completed       → Trip finished
```

#### 3. **NotificationCenter** (`src/components/tracking/NotificationCenter.tsx`)
- Toast-style notifications with auto-dismiss
- Type-specific styling and icons
- Smart triggering based on distance/ETA thresholds
- Persistent notifications for arrival events

**Notification Types:**
```
- driver_arrived  → Driver within 50m
- driver_nearby   → Driver within 500m
- eta_5min        → Arriving in 5 minutes
- eta_1min        → Arriving in 1 minute
- status_change   → Trip status updated
```

### Hooks

#### `useTrackingMap`
```typescript
const {
  trip,                    // DiveTrip data
  shuttle,                 // Shuttle with driver info
  userLocation,           // Browser geolocation
  shuttleLocation,        // Real-time shuttle coordinates
  distance,               // Distance in meters
  etaMinutes,             // Estimated arrival in minutes
  routeMetrics,           // Full route calculations
  isLoading,              // Initial data fetch state
  error,                  // Any errors
  calculateDistance,      // Haversine calculator
  calculateRouteMetrics,  // Full route analysis
} = useTrackingMap({
  tripId: 'trip-uuid',
  updateInterval: 3000,   // ms
  onStatusChange: (status) => {},
  onError: (error) => {}
});
```

**Features:**
- Automatic geolocation watching with high accuracy
- Real-time Supabase subscription to shuttle location updates
- Distance calculations via Haversine formula
- ETA calculations based on speed
- Automatic cleanup on unmount

#### `useNotifications`
```typescript
const {
  notifications,          // Array of active notifications
  permission,             // 'granted' | 'denied' | 'default'
  triggerNotification,    // Manual notification trigger
  clearNotification,      // Dismiss by ID
  resetTriggers,         // Reset already-triggered state
} = useNotifications({
  tripId: 'trip-uuid',
  shuttleDistance: 500,   // meters
  etaMinutes: 5,
  enabled: true
});
```

**Smart Triggers:**
```
Distance < 50m   → Driver arrived notification
Distance < 500m  → Driver nearby notification
ETA < 1 min      → One minute away notification
ETA < 5 min      → Five minutes away notification
```

### Types

```typescript
// Main types in src/types/tracking.ts

type TripStatus =
  | 'pending'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'driver_arrived'
  | 'en_route_to_site'
  | 'completed';

interface ShuttleDriver {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  license_number?: string;
  rating?: number;
  reviews_count?: number;
}

interface Shuttle {
  id: string;
  plate_number: string;
  model: string;
  driver: ShuttleDriver;
  capacity: number;
  current_passengers: number;
  location: ShuttleLocation;
  route_points?: Location[];
}

interface DiveTrip {
  id: string;
  user_id: string;
  dive_site_id: string;
  shuttle_id?: string | null;
  status: TripStatus;
  pickup_location: Location;
  destination_location: Location;
  scheduled_time: string;
  pickup_time?: string | null;
  eta_arrival?: string | null;
  created_at: string;
  updated_at: string;
}
```

## Database Schema

### Tables Created

#### `shuttles`
```sql
- id (UUID, PK)
- plate_number (VARCHAR, UNIQUE)
- model (VARCHAR)
- capacity (INTEGER)
- current_passengers (INTEGER)
- driver_id (FK → drivers)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPS)
```

#### `drivers`
```sql
- id (UUID, PK)
- name, email, phone (VARCHAR)
- license_number (VARCHAR, UNIQUE)
- avatar_url (VARCHAR)
- rating (NUMERIC 3,2)
- reviews_count (INTEGER)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPS)
```

#### `shuttle_locations` (Real-time)
```sql
- id (UUID, PK)
- shuttle_id (FK → shuttles)
- latitude, longitude (NUMERIC 10,8)
- accuracy, bearing, speed (NUMERIC)
- timestamp (TIMESTAMP, indexed DESC)
- created_at (TIMESTAMP)
```

#### `trip_notifications`
```sql
- id (UUID, PK)
- trip_id (FK → dive_trips)
- user_id (FK → users)
- type (VARCHAR) - 'driver_nearby', 'driver_arrived', etc.
- title, message (VARCHAR, TEXT)
- is_read (BOOLEAN)
- created_at, updated_at (TIMESTAMPS)
```

#### `trip_routes` (Historical)
```sql
- id (UUID, PK)
- trip_id (FK → dive_trips)
- shuttle_id (FK → shuttles)
- route_points (JSONB) - Array of {lat, lng, timestamp}
- total_distance (NUMERIC, meters)
- estimated_duration (INTEGER, seconds)
- actual_duration (INTEGER)
- completed_at (TIMESTAMP)
```

### Row-Level Security (RLS)

```sql
-- Shuttles: Public read (active only)
-- Drivers: Authenticated users only
-- Shuttle Locations: System only (insert)
-- Notifications: Own records only
-- Trips: Owner only
```

## Real-Time Data Flow

```
Browser Geolocation (every 1-3 seconds)
  ↓
useTrackingMap hook
  ↓
Supabase INSERT → shuttle_locations table
  ↓
PostgreSQL REALTIME trigger
  ↓
Supabase Channel subscription
  ↓
useTrackingMap receives update
  ↓
Calculate distance, ETA
  ↓
useNotifications checks thresholds
  ↓
Trigger notifications if conditions met
  ↓
UI updates automatically
```

## API Endpoints

### POST `/api/tracking/[trip_id]/location`
**Updates shuttle location (for driver app)**
```json
{
  "latitude": 32.8755,
  "longitude": 34.7674,
  "accuracy": 10,
  "bearing": 45,
  "speed": 25
}
```

### GET `/api/tracking/[trip_id]/location`
**Retrieves latest shuttle location**
```json
{
  "location": {
    "id": "uuid",
    "shuttle_id": "uuid",
    "latitude": 32.8755,
    "longitude": 34.7674,
    "timestamp": "2026-06-20T12:00:00Z"
  }
}
```

## Internationalization (i18n)

Translations in `src/i18n/locales/[locale]/tracking.json`

**Supported Languages:**
- `he` (Hebrew) - RTL
- `en` (English) - LTR

All UI text is translatable:
- Status labels
- Button text
- Notification titles/messages
- Error messages

## Accessibility Features

✅ **Implemented:**
- ARIA labels on buttons and landmarks
- Semantic HTML (button, main, section)
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Focus management in modals
- Screen reader friendly notifications

✅ **Mobile Optimized:**
- Touch-friendly button sizes (48px min)
- Responsive map and card layout
- Swipe gestures on bottom sheet
- Landscape/portrait orientation handling
- High DPI display support

## Performance Optimization

### Map Rendering
```typescript
// Lazy load Leaflet only when component mounts
import('leaflet').then(L => {
  // Initialize map
});
```

### Notification Deduplification
```typescript
// Use Set to track already-triggered notifications
const triggeredRef = useRef<Set<string>>(new Set());
// Only trigger each notification type once per trip
```

### Geolocation Efficiency
```typescript
// High accuracy with reasonable timeout
navigator.geolocation.watchPosition(
  (pos) => {},
  (err) => {},
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0  // Always fresh
  }
);
```

### Distance Calculation
- Uses Haversine formula (faster than API calls)
- Client-side calculations prevent API overhead
- Cached in React state with memoization

## Battery Saver Mode (Future)

```typescript
// Detect if device in low power mode
const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

if (mediaQuery.matches) {
  // Reduce update frequency to 10s
  updateInterval = 10000;
  // Reduce map refresh rate
  // Disable animations
}
```

## Testing

### Unit Tests
```typescript
// Distance calculation
expect(calculateDistance(0, 0, 0, 0)).toBe(0);
expect(calculateDistance(32, 34, 32, 34)).toBe(0);

// ETA calculation
expect(calculateETA(15000, 15)).toBe(1); // 1 minute
expect(calculateETA(30000, 15)).toBe(2); // 2 minutes

// Bounds checking
expect(isLocationWithinBounds(loc, bounds)).toBe(true);
```

### Integration Tests
```typescript
// Map marker updates
// Notification triggers
// Real-time subscriptions
// Permission handling
```

### E2E Tests (Playwright)
```typescript
// Full tracking flow
// Notification display
// Map interactions
// Mobile responsiveness
```

## Production Deployment

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

### Monitoring
```typescript
// Error tracking (Sentry)
Sentry.captureException(error);

// Performance monitoring
console.time('tracking-render');
// ... code ...
console.timeEnd('tracking-render');
```

### Scaling Considerations

**Current Limits:**
- ~1000 concurrent tracking sessions
- Real-time updates every 3 seconds
- Geolocation polling every 1-3 seconds

**For Higher Scale:**
1. Implement location sampling (update every 10m movement)
2. Use bucket-based real-time subscriptions
3. Add Redis caching for shuttle locations
4. Implement connection pooling
5. Consider vector tiles for map optimization

## Troubleshooting

### Map Not Loading
```typescript
// Check if Leaflet installed
npm install leaflet @types/leaflet

// Check browser console for import errors
// Fallback to canvas-based map included
```

### Geolocation Denied
```typescript
// User denied permission
// Browser shows permission prompt on first request
// Can be re-requested in settings

// For testing: Use browser dev tools to mock location
```

### Real-Time Not Updating
```typescript
// Check Supabase connection
// Verify RLS policies allow reads
// Check browser network tab
// Verify subscription filter is correct
```

### High Battery Drain
```typescript
// Disable high accuracy when not needed
// Reduce update frequency during idle time
// Implement background tracking pause
// Use battery status API to detect low power
```

## Future Enhancements

### Priority 1
- [ ] Google Maps integration for better routing
- [ ] Offline map caching with service workers
- [ ] Voice notifications for accessibility
- [ ] Driver location history/replay

### Priority 2
- [ ] Mapbox integration with custom styling
- [ ] Estimated fare calculation
- [ ] Scheduled trip notifications (pre-pickup)
- [ ] Multi-language driver communication

### Priority 3
- [ ] AR-based turn-by-turn navigation
- [ ] Social sharing of tracking link
- [ ] Driver rating/feedback system
- [ ] Trip statistics and analytics

## File Structure Reference

```
src/
├── types/
│   └── tracking.ts                    # All type definitions
├── hooks/
│   ├── useTrackingMap.ts              # Main tracking hook
│   └── useNotifications.ts            # Notification management
├── components/tracking/
│   ├── TrackingMap.tsx                # Map component
│   ├── ShuttleInfoCard.tsx            # Driver/shuttle info
│   ├── NotificationCenter.tsx         # Notification display
│   ├── LiveTrackingContainer.tsx      # Orchestrator
│   └── index.ts                       # Exports
├── lib/tracking/
│   └── tracking-utils.ts              # Utility functions
├── app/[locale]/tracking/[trip_id]/
│   └── page.tsx                       # Page component
├── app/api/tracking/[trip_id]/
│   └── location/route.ts              # Location API
└── i18n/locales/
    ├── en/tracking.json               # English translations
    └── he/tracking.json               # Hebrew translations

supabase/
└── migrations/
    └── tracking_schema.sql            # Database setup
```

## Support & Debugging

For issues, check:
1. Browser console for errors
2. Network tab for API failures
3. Supabase dashboard for RLS/subscription issues
4. Device location settings (permissions)
5. Map provider API limits (if using Google/Mapbox)
