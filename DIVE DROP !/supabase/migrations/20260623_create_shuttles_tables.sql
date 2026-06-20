-- Shuttles and Bookings Schema
-- Manages dive shuttles/transport with scheduling and reservations
-- Created: 2026-06-20

-- 1. Create shuttles table
CREATE TABLE IF NOT EXISTS shuttles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'boat' NOT NULL,
  capacity INT NOT NULL,
  current_occupancy INT DEFAULT 0 NOT NULL,

  -- Location Details
  departure_location TEXT NOT NULL,
  departure_latitude FLOAT NOT NULL,
  departure_longitude FLOAT NOT NULL,
  destination_dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,

  -- Scheduling
  departure_time TIME NOT NULL,
  return_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  frequency TEXT DEFAULT 'daily' NOT NULL,
  operating_days TEXT DEFAULT 'Mo,Tu,We,Th,Fr,Sa,Su' NOT NULL,

  -- Pricing
  price_per_person FLOAT NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_full BOOLEAN DEFAULT false NOT NULL,

  -- Metadata
  amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
  equipment_provided TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',

  -- Audit
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_type CHECK (type IN ('boat', 'van', 'bus', 'other')),
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'custom')),
  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_occupancy CHECK (current_occupancy >= 0 AND current_occupancy <= capacity),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0),
  CONSTRAINT valid_price CHECK (price_per_person >= 0)
);

-- Indexes for shuttles
CREATE INDEX idx_shuttles_active ON shuttles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_shuttles_dive_site ON shuttles(destination_dive_site_id) WHERE is_active = true;
CREATE INDEX idx_shuttles_location ON shuttles(departure_latitude, departure_longitude);
CREATE INDEX idx_shuttles_created_by ON shuttles(created_by);

-- 2. Create shuttle_schedules table
CREATE TABLE IF NOT EXISTS shuttle_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shuttle_id UUID REFERENCES shuttles(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_departure TIMESTAMPTZ NOT NULL,
  scheduled_return TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'scheduled' NOT NULL,
  current_occupancy INT DEFAULT 0 NOT NULL,
  is_full BOOLEAN DEFAULT false NOT NULL,

  -- Metadata
  notes TEXT DEFAULT '',
  captain_name TEXT DEFAULT '',
  weather_forecast TEXT DEFAULT '',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cancelled_at TIMESTAMPTZ DEFAULT NULL,
  cancelled_reason TEXT DEFAULT '',

  CONSTRAINT valid_status CHECK (status IN (
    'scheduled', 'confirmed', 'boarding', 'departed', 'returned', 'cancelled'
  )),
  CONSTRAINT valid_occupancy CHECK (current_occupancy >= 0),
  UNIQUE (shuttle_id, scheduled_date, scheduled_departure)
);

-- Indexes for shuttle_schedules
CREATE INDEX idx_shuttle_schedules_shuttle ON shuttle_schedules(shuttle_id);
CREATE INDEX idx_shuttle_schedules_date ON shuttle_schedules(scheduled_date) WHERE status != 'cancelled';
CREATE INDEX idx_shuttle_schedules_status ON shuttle_schedules(status);
CREATE INDEX idx_shuttle_schedules_departure ON shuttle_schedules(scheduled_departure DESC);

-- 3. Create shuttle_bookings table
CREATE TABLE IF NOT EXISTS shuttle_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shuttle_schedule_id UUID REFERENCES shuttle_schedules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Booking Details
  number_of_persons INT DEFAULT 1 NOT NULL,
  total_price FLOAT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NULL,
  cancelled_at TIMESTAMPTZ DEFAULT NULL,

  -- Payment
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  payment_method TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',

  -- Contact
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,

  -- Notes
  special_requests TEXT DEFAULT '',
  dietary_restrictions TEXT DEFAULT '',
  medical_notes TEXT DEFAULT '',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_persons CHECK (number_of_persons > 0),
  CONSTRAINT valid_price CHECK (total_price >= 0),
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled'
  )),
  CONSTRAINT valid_payment_status CHECK (payment_status IN (
    'pending', 'completed', 'failed', 'refunded'
  )),
  UNIQUE (shuttle_schedule_id, user_id)
);

-- Indexes for shuttle_bookings
CREATE INDEX idx_shuttle_bookings_user ON shuttle_bookings(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shuttle_bookings_schedule ON shuttle_bookings(shuttle_schedule_id) WHERE status IN ('pending', 'confirmed', 'checked_in');
CREATE INDEX idx_shuttle_bookings_status ON shuttle_bookings(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_shuttle_bookings_payment ON shuttle_bookings(payment_status) WHERE status != 'cancelled';

-- 4. Enable RLS on shuttle tables
ALTER TABLE shuttles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shuttles
CREATE POLICY "view_active_shuttles"
  ON shuttles FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "shuttle_manager_view_all_shuttles"
  ON shuttles FOR SELECT
  USING (
    has_admin_permission(auth.uid(), 'shuttles', 'view')
  );

CREATE POLICY "shuttle_manager_create_shuttles"
  ON shuttles FOR INSERT
  WITH CHECK (
    has_admin_permission(auth.uid(), 'shuttles', 'create')
  );

CREATE POLICY "shuttle_manager_update_shuttles"
  ON shuttles FOR UPDATE
  USING (
    has_admin_permission(auth.uid(), 'shuttles', 'update')
  );

-- RLS Policies for shuttle_schedules
CREATE POLICY "view_published_shuttle_schedules"
  ON shuttle_schedules FOR SELECT
  USING (
    status != 'cancelled'
    AND EXISTS (
      SELECT 1 FROM shuttles
      WHERE shuttles.id = shuttle_schedules.shuttle_id
      AND shuttles.is_active = true
      AND shuttles.deleted_at IS NULL
    )
  );

CREATE POLICY "shuttle_manager_view_all_schedules"
  ON shuttle_schedules FOR SELECT
  USING (
    has_admin_permission(auth.uid(), 'shuttles', 'view')
  );

CREATE POLICY "shuttle_manager_create_schedule"
  ON shuttle_schedules FOR INSERT
  WITH CHECK (
    has_admin_permission(auth.uid(), 'shuttles', 'create')
  );

CREATE POLICY "shuttle_manager_update_schedule"
  ON shuttle_schedules FOR UPDATE
  USING (
    has_admin_permission(auth.uid(), 'shuttles', 'update')
  );

-- RLS Policies for shuttle_bookings
CREATE POLICY "user_view_own_bookings"
  ON shuttle_bookings FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "shuttle_manager_view_all_bookings"
  ON shuttle_bookings FOR SELECT
  USING (
    has_admin_permission(auth.uid(), 'shuttles', 'view')
  );

CREATE POLICY "user_create_booking"
  ON shuttle_bookings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "user_update_own_booking"
  ON shuttle_bookings FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status IN ('pending', 'confirmed')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('pending', 'confirmed')
    AND deleted_at IS NULL
  );

CREATE POLICY "shuttle_manager_update_booking"
  ON shuttle_bookings FOR UPDATE
  USING (
    has_admin_permission(auth.uid(), 'shuttles', 'update')
  );

-- 5. Helper functions for shuttle operations
CREATE OR REPLACE FUNCTION get_shuttle_availability(
  p_shuttle_id UUID,
  p_date DATE
)
RETURNS TABLE(
  available_seats INT,
  total_bookings INT,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (s.capacity - COALESCE(SUM(sb.number_of_persons), 0))::INT,
    COALESCE(COUNT(sb.id), 0)::INT,
    (s.capacity - COALESCE(SUM(sb.number_of_persons), 0)) > 0
  FROM shuttles s
  LEFT JOIN shuttle_schedules ss ON s.id = ss.shuttle_id
    AND ss.scheduled_date = p_date
    AND ss.status != 'cancelled'
  LEFT JOIN shuttle_bookings sb ON ss.id = sb.shuttle_schedule_id
    AND sb.status IN ('confirmed', 'checked_in')
    AND sb.deleted_at IS NULL
  WHERE s.id = p_shuttle_id;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION can_book_shuttle(
  p_shuttle_schedule_id UUID,
  p_number_of_persons INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_shuttle_capacity INT;
  v_current_bookings INT;
BEGIN
  SELECT s.capacity INTO v_shuttle_capacity
  FROM shuttles s
  JOIN shuttle_schedules ss ON s.id = ss.shuttle_id
  WHERE ss.id = p_shuttle_schedule_id;

  SELECT COALESCE(SUM(number_of_persons), 0) INTO v_current_bookings
  FROM shuttle_bookings
  WHERE shuttle_schedule_id = p_shuttle_schedule_id
  AND status IN ('confirmed', 'checked_in')
  AND deleted_at IS NULL;

  RETURN (v_current_bookings + p_number_of_persons) <= v_shuttle_capacity;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION confirm_booking(
  p_booking_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE shuttle_bookings
  SET
    status = 'confirmed',
    confirmed_at = now(),
    updated_at = now()
  WHERE id = p_booking_id
  AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT ''
)
RETURNS void AS $$
BEGIN
  UPDATE shuttle_bookings
  SET
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now(),
    special_requests = CASE WHEN p_reason != '' THEN p_reason ELSE special_requests END
  WHERE id = p_booking_id
  AND status IN ('pending', 'confirmed');
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE shuttles IS 'Defines shuttle/transport logistics with recurring schedules';
COMMENT ON TABLE shuttle_schedules IS 'Individual shuttle runs on specific dates';
COMMENT ON TABLE shuttle_bookings IS 'User reservations for specific shuttle runs';
COMMENT ON FUNCTION get_shuttle_availability IS 'Get available seats for a shuttle on a specific date';
COMMENT ON FUNCTION can_book_shuttle IS 'Check if booking is possible for given number of persons';
COMMENT ON FUNCTION confirm_booking IS 'Confirm a pending booking';
COMMENT ON FUNCTION cancel_booking IS 'Cancel an active booking';
