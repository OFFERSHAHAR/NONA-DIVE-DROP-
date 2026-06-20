# Get Started with Shuttle Tracking - 5 Minute Setup

## Before You Start

You need:
- ✅ Supabase project (create at supabase.com)
- ✅ Node.js 18+ installed
- ✅ Next.js project with TypeScript

---

## Step 1: Copy Files (1 minute)

All files are already created in your project:

```
✅ supabase/migrations/001_shuttle_tracking.sql
✅ src/types/shuttle.ts
✅ src/lib/supabase/shuttle-client.ts
✅ src/lib/supabase/database.types.ts
✅ src/lib/driver-location-service.ts
✅ src/hooks/useShuttleTracking.ts
✅ src/components/ShuttleTracker.tsx
✅ pages/api/driver/update-location.ts
```

No copying needed!

---

## Step 2: Run Database Migration (2 minutes)

### Option A: Using Supabase CLI (Recommended)

```bash
# Install/Login
npm install -g supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Create migration
supabase migration new shuttle_tracking

# The migration file is already at:
# supabase/migrations/001_shuttle_tracking.sql

# Push to database
supabase db push
```

### Option B: Using Dashboard

1. Go to Supabase Dashboard
2. **SQL Editor** → **New Query**
3. Copy entire `supabase/migrations/001_shuttle_tracking.sql`
4. Paste and click **Run**
5. Done!

**Verify**: Check **Table Editor** - you should see 4 new tables

---

## Step 3: Enable Realtime (1 minute)

In Supabase Dashboard:

1. Go to **Project Settings** → **Realtime**
2. Find and toggle **ON** for:
   - `shuttle_trips`
   - `shuttle_passengers`
   - `shuttle_location_history`
3. Done!

---

## Step 4: Set Environment Variables (30 seconds)

Create `.env.local`:

```bash
# Get these from: Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Location tracking
NEXT_PUBLIC_LOCATION_UPDATE_INTERVAL=15000

# Optional: Google Maps for better ETA
# NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...
```

---

## Step 5: Install Dependencies (30 seconds)

```bash
npm install @supabase/supabase-js
```

---

## Step 6: Test the Connection (30 seconds)

Create a test file `test-shuttle.ts`:

```typescript
import { supabase } from "@/lib/supabase/shuttle-client";

async function test() {
  // This should work if setup is correct
  const { data, error } = await supabase
    .from("shuttle_trips")
    .select("*")
    .limit(1);

  if (error) {
    console.error("❌ Connection failed:", error);
  } else {
    console.log("✅ Connection successful!");
  }
}

test();
```

Run it:
```bash
npx ts-node test-shuttle.ts
```

---

## Done! ✅

Your shuttle tracking system is ready. Now:

### For Divers (View Tracking)

```typescript
import { ShuttleTracker } from "@/components/ShuttleTracker";

export function DiverScreen() {
  return (
    <ShuttleTracker
      tripId="trip-uuid-here"
      userLatitude={20.8123}
      userLongitude={-87.0456}
      dropoffLatitude={21.0}
      dropoffLongitude={-87.2}
    />
  );
}
```

### For Drivers (Send Location)

```typescript
import { useLocationTracking } from "@/lib/driver-location-service";

export function DriverApp() {
  const { isTracking } = useLocationTracking({
    tripId: "trip-uuid-here",
    updateIntervalMs: 15000, // Every 15 seconds
  });

  return (
    <div>
      {isTracking && <p>📍 Location tracking active</p>}
    </div>
  );
}
```

---

## Quick Testing

### Create a Test Trip

```typescript
import { createShuttleTrip } from "@/lib/supabase/shuttle-client";

const trip = await createShuttleTrip(
  "shuttle-1",
  "driver-1",
  "Cozumel Marina",
  "Paradise Reef"
);

console.log("Trip created:", trip.id);
```

### Add a Test Passenger

```typescript
import { createPassengerBooking } from "@/lib/supabase/shuttle-client";

const booking = await createPassengerBooking(
  trip.id,
  "user-1",
  "Hotel Lobby",
  "Dive Site"
);

console.log("Booking created:", booking.id);
```

### Send a Location Update

```typescript
import { updateDriverLocation } from "@/lib/supabase/shuttle-client";

await updateDriverLocation({
  trip_id: trip.id,
  latitude: 20.8456,
  longitude: -87.0789,
  accuracy: 5,
});

console.log("Location updated!");
```

---

## Need Help?

📖 **Quick reference**: `SHUTTLE_QUICK_REFERENCE.md`
🚀 **Full setup guide**: `SHUTTLE_SETUP.md`
📚 **Complete docs**: `docs/SHUTTLE_TRACKING_GUIDE.md`
🏗️ **Architecture**: `docs/SHUTTLE_ARCHITECTURE_SUMMARY.md`

---

## Common Issues

### Issue: Tables don't appear after migration

**Solution**: 
1. Check Supabase dashboard SQL error logs
2. Verify you're in the right project
3. Try running migration again

### Issue: Realtime updates not showing

**Solution**:
1. Confirm Realtime is enabled in settings
2. Check browser WebSocket connection (F12 → Network)
3. Verify user is authenticated

### Issue: RLS errors

**Solution**:
1. Make sure user is logged in with Supabase Auth
2. RLS policies require `auth.uid()` to match user_id or driver_id
3. For testing, you can temporarily disable RLS

---

## Next Steps

1. ✅ Database setup complete
2. ✅ Realtime enabled
3. ✅ Environment variables set
4. 🔄 Add authentication (Supabase Auth)
5. 🔄 Integrate into your diver app
6. 🔄 Integrate into your driver app
7. 🔄 Test with real GPS data
8. 🔄 Deploy to production

---

## Architecture at a Glance

```
Driver sends GPS → API → Database → Trigger → Realtime → Diver's map updates
    (15s)         (API)    (RLS)      (log)    (WebSocket)   (React)
```

That's it! Everything else is handled automatically.

---

## Time to Production

- Setup: 5 minutes ✅
- Integration: 2-4 hours
- Testing: 1-2 hours
- Deployment: 30 minutes

**Total: 4-8 hours to full production**

---

Built for DIVE DROP! 🤿
Let's go live! 🚀
