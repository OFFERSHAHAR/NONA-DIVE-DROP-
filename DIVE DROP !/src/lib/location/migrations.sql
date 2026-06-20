-- Location Tracking Tables

-- Trip Locations Table
CREATE TABLE IF NOT EXISTS trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('driver', 'passenger')),

  -- Location data
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy DECIMAL(8, 2),
  altitude DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(8, 2),

  -- Device info
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  is_charging BOOLEAN,
  network_type TEXT CHECK (network_type IN ('wifi', '4g', '5g', 'cellular', 'unknown')),

  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT unique_location_per_trip_per_user UNIQUE (trip_id, user_id, recorded_at)
);

-- Indexes for common queries
CREATE INDEX idx_trip_locations_trip_id ON trip_locations(trip_id);
CREATE INDEX idx_trip_locations_user_id ON trip_locations(user_id);
CREATE INDEX idx_trip_locations_recorded_at ON trip_locations(recorded_at DESC);
CREATE INDEX idx_trip_locations_trip_recorded ON trip_locations(trip_id, recorded_at DESC);
CREATE INDEX idx_trip_locations_coordinates ON trip_locations USING GIST (
  ll_to_earth(latitude, longitude)
); -- PostGIS index for distance queries

-- Trip Participants Table (for access control)
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('driver', 'passenger')),

  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(trip_id, user_id)
);

CREATE INDEX idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX idx_trip_participants_user_id ON trip_participants(user_id);

-- Trip Live Status Table (for fast current location lookup)
CREATE TABLE IF NOT EXISTS trip_live_status (
  trip_id UUID PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,

  -- Current position
  current_location JSONB NOT NULL DEFAULT '{"latitude": null, "longitude": null}',

  -- Last update timestamp
  last_location_update TIMESTAMP WITH TIME ZONE,
  last_driver_update TIMESTAMP WITH TIME ZONE,

  -- Participants online status
  participants_online JSONB NOT NULL DEFAULT '{}',

  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_live_status_updated ON trip_live_status(updated_at DESC);

-- RLS Policies

-- Enable RLS on trip_locations
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- Users can read locations from trips they're in
CREATE POLICY "Users can read trip locations they participate in" ON trip_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_participants.trip_id = trip_locations.trip_id
      AND trip_participants.user_id = auth.uid()
    )
  );

-- Users can insert their own locations
CREATE POLICY "Users can insert their own locations" ON trip_locations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Enable RLS on trip_participants
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Users can read participants of trips they're in
CREATE POLICY "Users can read trip participants they're in" ON trip_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp2
      WHERE tp2.trip_id = trip_participants.trip_id
      AND tp2.user_id = auth.uid()
    )
  );

-- Enable RLS on trip_live_status
ALTER TABLE trip_live_status ENABLE ROW LEVEL SECURITY;

-- Users can read live status of trips they participate in
CREATE POLICY "Users can read trip live status they're in" ON trip_live_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_participants.trip_id = trip_live_status.trip_id
      AND trip_participants.user_id = auth.uid()
    )
  );

-- Function to update trip live status on new location insert
CREATE OR REPLACE FUNCTION update_trip_live_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trip_live_status
  SET
    current_location = jsonb_build_object(
      'latitude', NEW.latitude,
      'longitude', NEW.longitude,
      'accuracy', NEW.accuracy
    ),
    last_location_update = NEW.recorded_at,
    last_driver_update = CASE
      WHEN NEW.user_type = 'driver' THEN NEW.recorded_at
      ELSE last_driver_update
    END,
    updated_at = NOW()
  WHERE trip_id = NEW.trip_id;

  -- If no row exists, create it
  IF NOT FOUND THEN
    INSERT INTO trip_live_status (trip_id, current_location, last_location_update)
    VALUES (
      NEW.trip_id,
      jsonb_build_object(
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'accuracy', NEW.accuracy
      ),
      NEW.recorded_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update live status
CREATE TRIGGER trigger_update_trip_live_status
AFTER INSERT ON trip_locations
FOR EACH ROW
EXECUTE FUNCTION update_trip_live_status();

-- Function to cleanup old location data (optional, for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_locations(days_to_keep INT DEFAULT 7)
RETURNS INT AS $$
DECLARE
  deleted_rows INT;
BEGIN
  DELETE FROM trip_locations
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON trip_locations TO anon, authenticated;
GRANT SELECT ON trip_participants TO anon, authenticated;
GRANT SELECT ON trip_live_status TO anon, authenticated;
