-- Live Tracking System Tables
-- Enables real-time shuttle location tracking with history and analytics

-- ============================================================================
-- SHUTTLE LOCATION HISTORY TABLE
-- Stores all GPS locations captured from drivers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shuttle_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.shuttle_trips(id) ON DELETE CASCADE,
  shuttle_id uuid NOT NULL REFERENCES public.shuttles(id) ON DELETE CASCADE,

  -- Location coordinates
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,

  -- GPS accuracy metadata
  accuracy DECIMAL(8, 2),        -- meters
  altitude DECIMAL(8, 2),        -- meters above sea level
  speed DECIMAL(5, 2),           -- m/s
  bearing DECIMAL(6, 2),         -- degrees 0-360

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes for fast lookups
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT valid_bearing CHECK (bearing IS NULL OR (bearing >= 0 AND bearing <= 360))
);

-- Create indexes for efficient queries
CREATE INDEX idx_shuttle_location_history_trip_id
  ON public.shuttle_location_history(trip_id, timestamp DESC);
CREATE INDEX idx_shuttle_location_history_shuttle_id
  ON public.shuttle_location_history(shuttle_id, timestamp DESC);
CREATE INDEX idx_shuttle_location_history_timestamp
  ON public.shuttle_location_history(timestamp DESC);

-- Create GiST index for geographic queries (if needed)
CREATE INDEX idx_shuttle_location_history_geo
  ON public.shuttle_location_history USING GIST (
    public.ll_to_earth(latitude, longitude)
  );

-- ============================================================================
-- PASSENGER LOCATION VIEW
-- Shows passenger's current location for driver's benefit
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.passenger_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL UNIQUE REFERENCES public.shuttle_trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pickup location (passenger's current location)
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  accuracy DECIMAL(8, 2),

  -- Metadata
  is_visible_to_driver BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_passenger_locations_trip_id
  ON public.passenger_locations(trip_id);
CREATE INDEX idx_passenger_locations_user_id
  ON public.passenger_locations(user_id);

-- ============================================================================
-- REALTIME SUBSCRIPTION VIEW
-- For live location updates via Supabase Realtime
-- ============================================================================
CREATE VIEW public.live_shuttle_tracking AS
SELECT
  st.id AS trip_id,
  st.shuttle_id,
  st.status,

  -- Latest shuttle location
  (SELECT latitude FROM public.shuttle_location_history
   WHERE shuttle_id = st.shuttle_id
   ORDER BY timestamp DESC LIMIT 1) AS shuttle_latitude,
  (SELECT longitude FROM public.shuttle_location_history
   WHERE shuttle_id = st.shuttle_id
   ORDER BY timestamp DESC LIMIT 1) AS shuttle_longitude,
  (SELECT accuracy FROM public.shuttle_location_history
   WHERE shuttle_id = st.shuttle_id
   ORDER BY timestamp DESC LIMIT 1) AS shuttle_accuracy,
  (SELECT speed FROM public.shuttle_location_history
   WHERE shuttle_id = st.shuttle_id
   ORDER BY timestamp DESC LIMIT 1) AS shuttle_speed,
  (SELECT bearing FROM public.shuttle_location_history
   WHERE shuttle_id = st.shuttle_id
   ORDER BY timestamp DESC LIMIT 1) AS shuttle_bearing,
  (SELECT timestamp FROM public.shuttle_location_history
   WHERE shuttle_id = st.shuttle_id
   ORDER BY timestamp DESC LIMIT 1) AS shuttle_last_update,

  -- Passenger location
  pl.latitude AS passenger_latitude,
  pl.longitude AS passenger_longitude,
  pl.accuracy AS passenger_accuracy,

  st.started_at,
  st.estimated_arrival,
  st.updated_at
FROM public.shuttle_trips st
LEFT JOIN public.passenger_locations pl ON pl.trip_id = st.id
WHERE st.status = 'en_route';

-- ============================================================================
-- ENABLE REALTIME REPLICATION
-- ============================================================================
ALTER TABLE public.shuttle_location_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shuttle_location_history;

ALTER TABLE public.passenger_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.passenger_locations;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update shuttle_trips.updated_at when location changes
CREATE OR REPLACE FUNCTION public.update_shuttle_trip_on_location_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shuttle_trips
  SET
    current_latitude = NEW.latitude,
    current_longitude = NEW.longitude,
    accuracy = NEW.accuracy,
    altitude = NEW.altitude,
    updated_at = now()
  WHERE id = NEW.trip_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shuttle_trip_on_location
AFTER INSERT ON public.shuttle_location_history
FOR EACH ROW
EXECUTE FUNCTION public.update_shuttle_trip_on_location_change();

-- ============================================================================
-- CLEANUP: Remove old location history (keep last 30 days)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_location_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.shuttle_location_history
  WHERE timestamp < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily via Supabase cron or scheduled functions)
-- SELECT cron.schedule('cleanup-location-history', '0 2 * * *', 'SELECT public.cleanup_old_location_history()');

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.shuttle_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_locations ENABLE ROW LEVEL SECURITY;

-- Passengers can see shuttle location history for their trips
CREATE POLICY passenger_can_view_shuttle_locations
ON public.shuttle_location_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shuttle_trips st
    JOIN public.shuttle_passengers sp ON sp.trip_id = st.id
    WHERE st.id = shuttle_location_history.trip_id
    AND sp.user_id = auth.uid()
  )
);

-- Drivers can see location history for their shuttles
CREATE POLICY driver_can_view_location_history
ON public.shuttle_location_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shuttles s
    JOIN public.drivers d ON d.id = s.driver_id
    WHERE s.id = shuttle_location_history.shuttle_id
    AND d.user_id = auth.uid()
  )
);

-- Drivers can update passenger locations
CREATE POLICY driver_can_update_passenger_locations
ON public.passenger_locations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shuttle_trips st
    JOIN public.shuttles s ON s.id = st.shuttle_id
    JOIN public.drivers d ON d.id = s.driver_id
    WHERE st.id = passenger_locations.trip_id
    AND d.user_id = auth.uid()
  )
);

-- Passengers can view their own location
CREATE POLICY passenger_can_view_own_location
ON public.passenger_locations FOR SELECT
USING (user_id = auth.uid());

-- Passengers can update their own location
CREATE POLICY passenger_can_update_own_location
ON public.passenger_locations FOR UPDATE
USING (user_id = auth.uid());

-- ============================================================================
-- HELPFUL FUNCTIONS
-- ============================================================================

-- Calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  R CONSTANT DECIMAL := 6371000; -- Earth's radius in meters
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := (lat2 - lat1) * PI() / 180;
  dlon := (lon2 - lon1) * PI() / 180;

  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(lat1 * PI() / 180) * cos(lat2 * PI() / 180) *
       sin(dlon / 2) * sin(dlon / 2);

  c := 2 * atan2(sqrt(a), sqrt(1 - a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get nearest shuttle to a location
CREATE OR REPLACE FUNCTION public.get_nearby_shuttles(
  lat DECIMAL,
  lon DECIMAL,
  radius_meters DECIMAL DEFAULT 1000
)
RETURNS TABLE(
  shuttle_id uuid,
  trip_id uuid,
  distance_meters DECIMAL,
  latitude DECIMAL,
  longitude DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    slh.shuttle_id,
    slh.trip_id,
    public.calculate_distance(lat, lon, slh.latitude, slh.longitude) AS distance_meters,
    slh.latitude,
    slh.longitude
  FROM public.shuttle_location_history slh
  WHERE public.calculate_distance(lat, lon, slh.latitude, slh.longitude) <= radius_meters
  AND slh.timestamp > now() - INTERVAL '5 minutes'
  ORDER BY distance_meters
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Estimate ETA based on speed and distance
CREATE OR REPLACE FUNCTION public.estimate_eta(
  distance_meters DECIMAL,
  speed_ms DECIMAL
)
RETURNS INTERVAL AS $$
BEGIN
  IF speed_ms IS NULL OR speed_ms = 0 THEN
    RETURN (distance_meters / 1000 / 15) * INTERVAL '1 minute'; -- Default 15 km/h
  END IF;
  RETURN (distance_meters / speed_ms) * INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
