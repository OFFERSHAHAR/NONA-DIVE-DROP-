-- Dive Drop: Buddy Matching System Schema
-- Israeli Diving Buddy Matching Platform
-- Created: 2026-06-20

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Diving experience levels
CREATE TYPE diving_level AS ENUM ('beginner', 'intermediate', 'advanced', 'divemaster');

-- Types of dives
CREATE TYPE dive_type AS ENUM ('reef', 'boat', 'cave', 'wreck', 'deep', 'technical');

-- Listing status (soft delete via status instead of deletion)
CREATE TYPE listing_status AS ENUM ('active', 'archived', 'expired');

-- Interest/Request status
CREATE TYPE interest_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. BUDDY_LISTINGS - Main listing table for divers seeking buddies
CREATE TABLE buddy_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Location and dates
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  date_from TIMESTAMP WITH TIME ZONE NOT NULL,
  date_to TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Diving preferences
  diving_level diving_level NOT NULL,
  dive_type dive_type[] NOT NULL DEFAULT ARRAY['reef'],
  description TEXT,

  -- Language (Hebrew, English, or both)
  languages TEXT[] NOT NULL DEFAULT ARRAY['Hebrew', 'English'],

  -- Group size preference
  group_size_min INT DEFAULT 2,
  group_size_max INT DEFAULT 4,

  -- Status management
  status listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Contact info is NOT stored here - revealed only via buddy_interests acceptance

  CONSTRAINT valid_date_range CHECK (date_from < date_to),
  CONSTRAINT valid_group_size CHECK (group_size_min > 0 AND group_size_max >= group_size_min)
);

-- 2. BUDDY_INTERESTS - Interest/match requests from one user to another's listing
CREATE TABLE buddy_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES buddy_listings(id) ON DELETE CASCADE,
  interested_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message from the interested user to the listing owner
  message TEXT,

  -- Status of the interest
  status interest_status NOT NULL DEFAULT 'pending',

  -- Contact info is hidden until explicitly revealed
  contact_info_revealed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_interest_per_user_listing UNIQUE(listing_id, interested_user_id),
  CONSTRAINT cannot_interest_own_listing CHECK (
    interested_user_id != (SELECT user_id FROM buddy_listings WHERE id = listing_id)
  )
);

-- 3. BUDDY_CONNECTIONS - Approved buddy connections (after match accepted)
CREATE TABLE buddy_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Connection details
  meeting_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  dive_type dive_type,

  -- Mutual contact info (both users can see each other)
  contact_info_visible BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT different_users CHECK (user_id_1 < user_id_2),
  CONSTRAINT unique_connection UNIQUE(user_id_1, user_id_2)
);

-- 4. BUDDY_MESSAGES - Direct messages between connected buddies
CREATE TABLE buddy_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES buddy_connections(id) ON DELETE SET NULL,

  message TEXT NOT NULL,

  -- Message metadata
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- buddy_listings indexes
CREATE INDEX idx_buddy_listings_user_id ON buddy_listings(user_id);
CREATE INDEX idx_buddy_listings_status ON buddy_listings(status);
CREATE INDEX idx_buddy_listings_created_at ON buddy_listings(created_at DESC);
CREATE INDEX idx_buddy_listings_expires_at ON buddy_listings(expires_at);
CREATE INDEX idx_buddy_listings_location ON buddy_listings(location);
CREATE INDEX idx_buddy_listings_diving_level ON buddy_listings(diving_level);
CREATE INDEX idx_buddy_listings_date_range ON buddy_listings(date_from, date_to);
CREATE INDEX idx_buddy_listings_status_expires ON buddy_listings(status, expires_at) WHERE status = 'active';

-- buddy_interests indexes
CREATE INDEX idx_buddy_interests_listing_id ON buddy_interests(listing_id);
CREATE INDEX idx_buddy_interests_interested_user_id ON buddy_interests(interested_user_id);
CREATE INDEX idx_buddy_interests_status ON buddy_interests(status);
CREATE INDEX idx_buddy_interests_created_at ON buddy_interests(created_at DESC);

-- buddy_connections indexes
CREATE INDEX idx_buddy_connections_user_id_1 ON buddy_connections(user_id_1);
CREATE INDEX idx_buddy_connections_user_id_2 ON buddy_connections(user_id_2);
CREATE INDEX idx_buddy_connections_created_at ON buddy_connections(created_at DESC);

-- buddy_messages indexes
CREATE INDEX idx_buddy_messages_sender_id ON buddy_messages(sender_id);
CREATE INDEX idx_buddy_messages_receiver_id ON buddy_messages(receiver_id);
CREATE INDEX idx_buddy_messages_connection_id ON buddy_messages(connection_id);
CREATE INDEX idx_buddy_messages_created_at ON buddy_messages(created_at DESC);
CREATE INDEX idx_buddy_messages_read_at ON buddy_messages(read_at) WHERE read_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-expire listings when expiration date passes
CREATE OR REPLACE FUNCTION auto_expire_listings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_expire_listings
BEFORE INSERT OR UPDATE ON buddy_listings
FOR EACH ROW
EXECUTE FUNCTION auto_expire_listings();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_buddy_listings_timestamp
BEFORE UPDATE ON buddy_listings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_buddy_interests_timestamp
BEFORE UPDATE ON buddy_interests
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_buddy_connections_timestamp
BEFORE UPDATE ON buddy_connections
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE buddy_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- buddy_listings RLS Policies
-- ============================================================================

-- Policy: Users can see their own listings (for editing)
CREATE POLICY "Users can see own listings"
  ON buddy_listings
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Authenticated users can see OTHER users' ACTIVE and UNEXPIRED listings
CREATE POLICY "Authenticated users can see active listings from others"
  ON buddy_listings
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id != auth.uid()
    AND status = 'active'
    AND expires_at > NOW()
  );

-- Policy: Users can create listings if authenticated
CREATE POLICY "Users can create own listings"
  ON buddy_listings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own listings
CREATE POLICY "Users can update own listings"
  ON buddy_listings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete (soft delete via status) their own listings
CREATE POLICY "Users can archive own listings"
  ON buddy_listings
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- buddy_interests RLS Policies
-- ============================================================================

-- Policy: Listing owner can see all interests in their listings
CREATE POLICY "Listing owner can see interests on their listings"
  ON buddy_interests
  FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM buddy_listings WHERE user_id = auth.uid()
    )
  );

-- Policy: Interested user can see their own interests
CREATE POLICY "Users can see their own interests"
  ON buddy_interests
  FOR SELECT
  USING (interested_user_id = auth.uid());

-- Policy: Users can create interest records
CREATE POLICY "Users can create interests"
  ON buddy_interests
  FOR INSERT
  WITH CHECK (interested_user_id = auth.uid());

-- Policy: Only interested user can update their own interest
CREATE POLICY "Users can update their own interests"
  ON buddy_interests
  FOR UPDATE
  USING (interested_user_id = auth.uid())
  WITH CHECK (interested_user_id = auth.uid());

-- Policy: Listing owner can update interest status (accept/reject)
CREATE POLICY "Listing owner can update interest status"
  ON buddy_interests
  FOR UPDATE
  USING (
    listing_id IN (
      SELECT id FROM buddy_listings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM buddy_listings WHERE user_id = auth.uid()
    )
  );

-- Policy: Interested user can delete their own interests
CREATE POLICY "Users can delete their own interests"
  ON buddy_interests
  FOR DELETE
  USING (interested_user_id = auth.uid());

-- ============================================================================
-- buddy_connections RLS Policies
-- ============================================================================

-- Policy: Users can see connections they're part of
CREATE POLICY "Users can see their connections"
  ON buddy_connections
  FOR SELECT
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

-- Policy: Only the system can create connections (via stored procedure)
-- Connections created after buddy_interests accepted
CREATE POLICY "System creates connections"
  ON buddy_connections
  FOR INSERT
  WITH CHECK (true);

-- Policy: Both users can update their connection
CREATE POLICY "Connection users can update"
  ON buddy_connections
  FOR UPDATE
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
  WITH CHECK (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

-- Policy: Both users can delete their connection
CREATE POLICY "Connection users can delete"
  ON buddy_connections
  FOR DELETE
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

-- ============================================================================
-- buddy_messages RLS Policies
-- ============================================================================

-- Policy: Users can see messages they sent
CREATE POLICY "Users can see sent messages"
  ON buddy_messages
  FOR SELECT
  USING (sender_id = auth.uid());

-- Policy: Users can see messages they received
CREATE POLICY "Users can see received messages"
  ON buddy_messages
  FOR SELECT
  USING (receiver_id = auth.uid());

-- Policy: Users can send messages to connected buddies
CREATE POLICY "Users can send messages to connected buddies"
  ON buddy_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM buddy_connections
        WHERE (user_id_1 = auth.uid() AND user_id_2 = receiver_id)
           OR (user_id_2 = auth.uid() AND user_id_1 = receiver_id)
      )
    )
  );

-- Policy: Sender can update their own message (only mark as read not applicable)
CREATE POLICY "Users can update their messages"
  ON buddy_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Policy: Receiver can mark messages as read
CREATE POLICY "Receiver can mark message as read"
  ON buddy_messages
  FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete their messages"
  ON buddy_messages
  FOR DELETE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- ============================================================================
-- STORED PROCEDURES & HELPER FUNCTIONS
-- ============================================================================

-- Function to accept an interest and create a buddy connection
CREATE OR REPLACE FUNCTION accept_buddy_interest(p_interest_id UUID)
RETURNS TABLE (
  connection_id UUID,
  listing_id UUID,
  listing_owner_id UUID,
  interested_user_id UUID
) AS $$
DECLARE
  v_listing_id UUID;
  v_listing_owner_id UUID;
  v_interested_user_id UUID;
  v_connection_id UUID;
BEGIN
  -- Get interest details
  SELECT bi.listing_id, bl.user_id, bi.interested_user_id
  INTO v_listing_id, v_listing_owner_id, v_interested_user_id
  FROM buddy_interests bi
  JOIN buddy_listings bl ON bi.listing_id = bl.id
  WHERE bi.id = p_interest_id
  AND bl.user_id = auth.uid(); -- Only listing owner can accept

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Interest not found or you are not authorized';
  END IF;

  -- Update interest status
  UPDATE buddy_interests
  SET status = 'accepted', contact_info_revealed_at = NOW()
  WHERE id = p_interest_id;

  -- Create buddy connection (normalize user IDs so user_id_1 < user_id_2)
  INSERT INTO buddy_connections (user_id_1, user_id_2)
  VALUES (
    LEAST(v_listing_owner_id, v_interested_user_id),
    GREATEST(v_listing_owner_id, v_interested_user_id)
  )
  ON CONFLICT (user_id_1, user_id_2) DO NOTHING
  RETURNING buddy_connections.id INTO v_connection_id;

  RETURN QUERY
  SELECT v_connection_id, v_listing_id, v_listing_owner_id, v_interested_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject an interest
CREATE OR REPLACE FUNCTION reject_buddy_interest(p_interest_id UUID)
RETURNS TABLE (
  interest_id UUID,
  status interest_status
) AS $$
BEGIN
  UPDATE buddy_interests
  SET status = 'rejected'
  WHERE id = p_interest_id
  AND listing_id IN (
    SELECT id FROM buddy_listings WHERE user_id = auth.uid()
  )
  RETURNING buddy_interests.id, buddy_interests.status INTO RETURN QUERY;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's profile including contact info (only when authorized)
CREATE OR REPLACE FUNCTION get_buddy_profile(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  diving_level diving_level,
  bio TEXT,
  phone TEXT,
  show_contact_info BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    CASE
      WHEN auth.uid() = u.id OR
           EXISTS (SELECT 1 FROM buddy_connections
                   WHERE (user_id_1 = auth.uid() AND user_id_2 = u.id)
                      OR (user_id_2 = auth.uid() AND user_id_1 = u.id)
                      OR contact_info_visible = TRUE)
      THEN u.email
      ELSE NULL
    END,
    (u.raw_user_meta_data ->> 'full_name')::TEXT,
    (u.raw_user_meta_data ->> 'avatar_url')::TEXT,
    (u.raw_user_meta_data ->> 'diving_level')::diving_level,
    (u.raw_user_meta_data ->> 'bio')::TEXT,
    CASE
      WHEN auth.uid() = u.id OR
           EXISTS (SELECT 1 FROM buddy_connections
                   WHERE (user_id_1 = auth.uid() AND user_id_2 = u.id)
                      OR (user_id_2 = auth.uid() AND user_id_1 = u.id)
                      OR contact_info_visible = TRUE)
      THEN (u.raw_user_meta_data ->> 'phone')::TEXT
      ELSE NULL
    END,
    auth.uid() = u.id OR
    EXISTS (SELECT 1 FROM buddy_connections
            WHERE (user_id_1 = auth.uid() AND user_id_2 = u.id)
               OR (user_id_2 = auth.uid() AND user_id_1 = u.id))
  FROM auth.users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions on stored procedures to authenticated users
GRANT EXECUTE ON FUNCTION accept_buddy_interest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_buddy_interest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_buddy_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_expire_listings() TO authenticated;
