-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create ENUM types
CREATE TYPE shuttle_trip_status AS ENUM ('en_route', 'arrived', 'completed', 'cancelled');
CREATE TYPE passenger_status AS ENUM ('waiting', 'picked_up', 'dropped_off', 'cancelled');
CREATE TYPE shuttle_status AS ENUM ('active', 'offline', 'maintenance');

-- ============================================================================
-- SHUTTLES TABLE
-- ============================================================================
CREATE TABLE shuttles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  driver_id UUID NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status shuttle_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SHUTTLE_TRIPS TABLE (Main tracking table)
-- ============================================================================
CREATE TABLE shuttle_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shuttle_id UUID NOT NULL REFERENCES shuttles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,

  -- Trip locations
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,

  -- Current location (PostGIS point for spatial queries)
  current_location GEOMETRY(POINT, 4326),

  -- Location metadata
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2), -- meters
  altitude DECIMAL(10, 2), -- meters

  -- Trip status
  status shuttle_trip_status NOT NULL DEFAULT 'en_route',

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- ETA tracking
  initial_eta_minutes INTEGER,
  estimated_arrival TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- Spatial index for efficient geolocation queries
CREATE INDEX idx_shuttle_trips_current_location
ON shuttle_trips USING GIST(current_location);

-- Standard indexes for queries
CREATE INDEX idx_shuttle_trips_shuttle_id ON shuttle_trips(shuttle_id);
CREATE INDEX idx_shuttle_trips_driver_id ON shuttle_trips(driver_id);
CREATE INDEX idx_shuttle_trips_status ON shuttle_trips(status);
CREATE INDEX idx_shuttle_trips_started_at ON shuttle_trips(started_at DESC);

-- ============================================================================
-- SHUTTLE_PASSENGERS TABLE
-- ============================================================================
CREATE TABLE shuttle_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES shuttle_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Passenger locations
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,

  -- Location coordinates
  pickup_latitude DECIMAL(10, 8),
  pickup_longitude DECIMAL(11, 8),

  dropoff_latitude DECIMAL(10, 8),
  dropoff_longitude DECIMAL(11, 8),

  -- Status tracking
  status passenger_status NOT NULL DEFAULT 'waiting',

  -- Timestamps
  pickup_requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  dropped_off_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- ETA
  estimated_pickup TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_shuttle_passengers_trip_id ON shuttle_passengers(trip_id);
CREATE INDEX idx_shuttle_passengers_user_id ON shuttle_passengers(user_id);
CREATE INDEX idx_shuttle_passengers_status ON shuttle_passengers(status);

-- ============================================================================
-- SHUTTLE_LOCATION_HISTORY TABLE (Analytics & diagnostics)
-- ============================================================================
CREATE TABLE shuttle_location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES shuttle_trips(id) ON DELETE CASCADE,
  shuttle_id UUID NOT NULL REFERENCES shuttles(id) ON DELETE CASCADE,

  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  altitude DECIMAL(10, 2),

  -- Spatial point for queries
  location GEOMETRY(POINT, 4326),

  speed DECIMAL(8, 2), -- km/h
  bearing DECIMAL(6, 2), -- degrees (0-360)

  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for geospatial queries
CREATE INDEX idx_location_history_location
ON shuttle_location_history USING GIST(location);

-- Partitioning by date for large datasets (optional, improves query performance)
CREATE INDEX idx_location_history_timestamp ON shuttle_location_history(timestamp DESC);
CREATE INDEX idx_location_history_trip_id ON shuttle_location_history(trip_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shuttles_updated_at BEFORE UPDATE
  ON shuttles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shuttle_trips_updated_at BEFORE UPDATE
  ON shuttle_trips FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shuttle_passengers_updated_at BEFORE UPDATE
  ON shuttle_passengers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Update current_location point when lat/lng change
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_latitude IS NOT NULL AND NEW.current_longitude IS NOT NULL THEN
    NEW.current_location = ST_SetSRID(
      ST_MakePoint(NEW.current_longitude, NEW.current_latitude),
      4326
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_shuttle_trips_location BEFORE INSERT OR UPDATE
  ON shuttle_trips FOR EACH ROW
  EXECUTE FUNCTION sync_location_point();

-- ============================================================================
-- TRIGGER: Auto-insert location history on shuttle_trips update
-- ============================================================================
CREATE OR REPLACE FUNCTION log_location_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if location changed and trip is still en_route
  IF (OLD.current_latitude IS DISTINCT FROM NEW.current_latitude OR
      OLD.current_longitude IS DISTINCT FROM NEW.current_longitude) AND
     NEW.status = 'en_route' THEN

    INSERT INTO shuttle_location_history (
      trip_id, shuttle_id, latitude, longitude,
      accuracy, altitude, location
    )
    VALUES (
      NEW.id, NEW.shuttle_id,
      NEW.current_latitude, NEW.current_longitude,
      NEW.accuracy, NEW.altitude,
      ST_SetSRID(
        ST_MakePoint(NEW.current_longitude, NEW.current_latitude),
        4326
      )
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_shuttle_location_on_update AFTER UPDATE
  ON shuttle_trips FOR EACH ROW
  EXECUTE FUNCTION log_location_history();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE shuttles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_location_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: SHUTTLES
-- ============================================================================
-- Drivers can see their own shuttle
CREATE POLICY "Drivers can view their shuttle" ON shuttles
  FOR SELECT
  USING (driver_id = auth.uid());

-- Drivers can update their shuttle
CREATE POLICY "Drivers can update their shuttle" ON shuttles
  FOR UPDATE
  USING (driver_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: SHUTTLE_TRIPS
-- ============================================================================
-- Drivers can see their own trips
CREATE POLICY "Drivers can view their trips" ON shuttle_trips
  FOR SELECT
  USING (driver_id = auth.uid());

-- Drivers can update their trips
CREATE POLICY "Drivers can update their trips" ON shuttle_trips
  FOR UPDATE
  USING (driver_id = auth.uid());

-- Passengers can see trips they're booked on
CREATE POLICY "Passengers can view their trip" ON shuttle_trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shuttle_passengers
      WHERE shuttle_passengers.trip_id = shuttle_trips.id
      AND shuttle_passengers.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: SHUTTLE_PASSENGERS
-- ============================================================================
-- Passengers can view their own bookings
CREATE POLICY "Passengers can view their bookings" ON shuttle_passengers
  FOR SELECT
  USING (user_id = auth.uid());

-- Drivers can view passengers on their trips
CREATE POLICY "Drivers can view passengers on their trips" ON shuttle_passengers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shuttle_trips
      WHERE shuttle_trips.id = shuttle_passengers.trip_id
      AND shuttle_trips.driver_id = auth.uid()
    )
  );

-- Passengers can update their own bookings (status, etc)
CREATE POLICY "Passengers can update their bookings" ON shuttle_passengers
  FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: SHUTTLE_LOCATION_HISTORY
-- ============================================================================
-- Drivers can view history of their trips
CREATE POLICY "Drivers can view location history of their trips" ON shuttle_location_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shuttle_trips
      WHERE shuttle_trips.id = shuttle_location_history.trip_id
      AND shuttle_trips.driver_id = auth.uid()
    )
  );

-- Passengers can view history of their trips
CREATE POLICY "Passengers can view location history of their trips" ON shuttle_location_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shuttle_trips
      JOIN shuttle_passengers ON shuttle_trips.id = shuttle_passengers.trip_id
      WHERE shuttle_trips.id = shuttle_location_history.trip_id
      AND shuttle_passengers.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate distance between two points (in meters)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  point1 GEOMETRY;
  point2 GEOMETRY;
BEGIN
  point1 := ST_SetSRID(ST_MakePoint(lon1, lat1), 4326);
  point2 := ST_SetSRID(ST_MakePoint(lon2, lat2), 4326);
  RETURN ST_Distance(point1, point2) * 111000; -- Convert degrees to meters
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find nearby shuttles (within radius in meters)
CREATE OR REPLACE FUNCTION find_nearby_shuttles(
  user_lat DECIMAL,
  user_lon DECIMAL,
  radius_meters INTEGER
)
RETURNS TABLE(
  shuttle_id UUID,
  trip_id UUID,
  distance_meters DECIMAL,
  current_latitude DECIMAL,
  current_longitude DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.shuttle_id,
    st.id,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326),
      st.current_location
    ) * 111000,
    st.current_latitude,
    st.current_longitude
  FROM shuttle_trips st
  WHERE st.status = 'en_route'
    AND st.current_location IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326),
      st.current_location,
      radius_meters / 111000.0 -- Convert meters to degrees
    )
  ORDER BY ST_Distance(
    ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326),
    st.current_location
  );
END;
$$ LANGUAGE plpgsql;

-- Estimate ETA based on current location and dropoff
CREATE OR REPLACE FUNCTION estimate_eta(
  current_lat DECIMAL,
  current_lon DECIMAL,
  dropoff_lat DECIMAL,
  dropoff_lon DECIMAL
)
RETURNS INTERVAL AS $$
DECLARE
  distance_meters DECIMAL;
  avg_speed_mps DECIMAL := 15; -- Average shuttle speed: 15 m/s (54 km/h)
  seconds_estimated INTEGER;
BEGIN
  distance_meters := calculate_distance(current_lat, current_lon, dropoff_lat, dropoff_lon);
  seconds_estimated := CAST(distance_meters / avg_speed_mps AS INTEGER);
  RETURN seconds_estimated * INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
