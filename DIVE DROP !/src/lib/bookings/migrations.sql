-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dive_date TIMESTAMP NOT NULL,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  custom_location TEXT,
  service_provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  max_depth INTEGER NOT NULL CHECK (max_depth > 0 AND max_depth <= 130),
  water_temp DECIMAL(4,1) NOT NULL CHECK (water_temp >= 0 AND water_temp <= 40),
  equipment_needed TEXT[],
  special_requirements TEXT,
  number_of_divers INTEGER NOT NULL CHECK (number_of_divers > 0 AND number_of_divers <= 10),
  estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_confirmation', 'confirmed', 'completed', 'cancelled', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_buddy_user_id ON bookings(buddy_user_id);
CREATE INDEX idx_bookings_service_provider_id ON bookings(service_provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dive_date ON bookings(dive_date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Booking items (individual diver in a booking)
CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  diver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  actual_depth DECIMAL(4,1),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX idx_booking_items_diver_user_id ON booking_items(diver_user_id);
CREATE INDEX idx_booking_items_status ON booking_items(status);

-- Booking status history
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX idx_booking_status_history_created_at ON booking_status_history(created_at DESC);

-- Booking messages (communication between divers and provider)
CREATE TABLE IF NOT EXISTS booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_provider_message BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_messages_booking_id ON booking_messages(booking_id);
CREATE INDEX idx_booking_messages_sender_user_id ON booking_messages(sender_user_id);
CREATE INDEX idx_booking_messages_created_at ON booking_messages(created_at DESC);

-- Booking reviews and ratings
CREATE TABLE IF NOT EXISTS booking_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  would_recommend BOOLEAN DEFAULT TRUE,
  review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('diver_to_diver', 'provider_review')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_user_id, reviewed_user_id)
);

CREATE INDEX idx_booking_reviews_booking_id ON booking_reviews(booking_id);
CREATE INDEX idx_booking_reviews_reviewed_user_id ON booking_reviews(reviewed_user_id);
CREATE INDEX idx_booking_reviews_created_at ON booking_reviews(created_at DESC);

-- Payment records
CREATE TABLE IF NOT EXISTS booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'ILS',
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_payments_booking_id ON booking_payments(booking_id);
CREATE INDEX idx_booking_payments_user_id ON booking_payments(user_id);
CREATE INDEX idx_booking_payments_payment_status ON booking_payments(payment_status);

-- Enable RLS on new tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
CREATE POLICY "Users can see their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = buddy_user_id OR auth.uid() = service_provider_id);

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for booking items
CREATE POLICY "Users can see booking items for their bookings" ON booking_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_items.booking_id
      AND (auth.uid() = bookings.user_id OR auth.uid() = bookings.buddy_user_id)
    )
  );

-- RLS Policies for booking messages
CREATE POLICY "Booking participants can see messages" ON booking_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_messages.booking_id
      AND (auth.uid() = bookings.user_id OR auth.uid() = bookings.buddy_user_id OR auth.uid() = bookings.service_provider_id)
    )
  );

CREATE POLICY "Users can send messages to their bookings" ON booking_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

-- RLS Policies for booking reviews
CREATE POLICY "Users can see reviews for their bookings" ON booking_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_reviews.booking_id
      AND (auth.uid() = bookings.user_id OR auth.uid() = bookings.buddy_user_id OR auth.uid() = bookings.service_provider_id)
    )
  );

CREATE POLICY "Users can create reviews" ON booking_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_user_id);

-- RLS Policies for booking payments
CREATE POLICY "Users can see their own payments" ON booking_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments for their bookings" ON booking_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_items_updated_at BEFORE UPDATE ON booking_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_reviews_updated_at BEFORE UPDATE ON booking_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_payments_updated_at BEFORE UPDATE ON booking_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to record status changes
CREATE OR REPLACE FUNCTION record_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER record_bookings_status_change AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION record_booking_status_change();
