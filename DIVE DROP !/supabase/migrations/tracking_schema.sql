-- Enable PostGIS for geospatial queries (if using Supabase with PostGIS)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Shuttles table
CREATE TABLE IF NOT EXISTS public.shuttles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  current_passengers INTEGER DEFAULT 0 CHECK (current_passengers >= 0),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  avatar_url VARCHAR(500),
  rating NUMERIC(3, 2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shuttle locations table (real-time updates)
CREATE TABLE IF NOT EXISTS public.shuttle_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shuttle_id UUID NOT NULL REFERENCES public.shuttles(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy NUMERIC(6, 2),
  bearing NUMERIC(5, 2),
  speed NUMERIC(5, 2), -- km/h
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Extend dive_trips with shuttle tracking
ALTER TABLE IF EXISTS public.dive_trips ADD COLUMN IF NOT EXISTS shuttle_id UUID REFERENCES public.shuttles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.dive_trips ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE IF EXISTS public.dive_trips ADD COLUMN IF NOT EXISTS pickup_location JSONB; -- {"latitude": number, "longitude": number}
ALTER TABLE IF EXISTS public.dive_trips ADD COLUMN IF NOT EXISTS destination_location JSONB; -- {"latitude": number, "longitude": number}
ALTER TABLE IF EXISTS public.dive_trips ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.dive_trips ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.dive_trips ADD COLUMN IF NOT EXISTS eta_arrival TIMESTAMP WITH TIME ZONE;

-- Trip notifications table
CREATE TABLE IF NOT EXISTS public.trip_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.dive_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'driver_nearby', 'driver_arrived', 'eta_5min', 'eta_1min', 'status_change'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trip route history table
CREATE TABLE IF NOT EXISTS public.trip_routes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.dive_trips(id) ON DELETE CASCADE,
  shuttle_id UUID NOT NULL REFERENCES public.shuttles(id) ON DELETE CASCADE,
  route_points JSONB NOT NULL, -- Array of {latitude, longitude, timestamp}
  total_distance NUMERIC(10, 2), -- meters
  estimated_duration INTEGER, -- seconds
  actual_duration INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shuttle_locations_shuttle_id ON public.shuttle_locations(shuttle_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_locations_timestamp ON public.shuttle_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dive_trips_shuttle_id ON public.dive_trips(shuttle_id);
CREATE INDEX IF NOT EXISTS idx_dive_trips_user_id ON public.dive_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_trips_status ON public.dive_trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_user_id ON public.trip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_trip_id ON public.trip_notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_is_read ON public.trip_notifications(is_read);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
DROP TRIGGER IF EXISTS update_shuttles_updated_at ON public.shuttles;
CREATE TRIGGER update_shuttles_updated_at BEFORE UPDATE ON public.shuttles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_notifications_updated_at ON public.trip_notifications;
CREATE TRIGGER update_trip_notifications_updated_at BEFORE UPDATE ON public.trip_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row-level security policies
ALTER TABLE public.shuttles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shuttle_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_routes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active shuttles
CREATE POLICY "shuttle_view_public" ON public.shuttles
  FOR SELECT USING (is_active = true);

-- Policy: Only authenticated users can view driver info
CREATE POLICY "driver_view_authenticated" ON public.drivers
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Policy: Only owner can view their notifications
CREATE POLICY "notification_view_own" ON public.trip_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only system can insert shuttle locations
CREATE POLICY "shuttle_location_insert_system" ON public.shuttle_locations
  FOR INSERT WITH CHECK (true);

-- Policy: Trips are viewable by their owner
CREATE POLICY "trip_view_own" ON public.dive_trips
  FOR SELECT USING (auth.uid() = user_id);
