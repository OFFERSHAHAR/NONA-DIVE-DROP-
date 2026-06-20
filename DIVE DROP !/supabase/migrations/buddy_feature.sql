-- Buddy Feature Database Schema
-- Run this migration to set up all tables needed for the buddy feature

-- ============================================================================
-- BUDDY LISTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS buddy_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  experience_level VARCHAR(50) NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  number_of_divers INT NOT NULL CHECK (number_of_divers >= 1 AND number_of_divers <= 10),
  dive_date TIMESTAMPTZ NOT NULL,
  dive_duration INT NOT NULL CHECK (dive_duration > 0 AND dive_duration <= 480), -- minutes, max 8 hours
  dive_site_id UUID REFERENCES public.dive_sites(id) ON DELETE SET NULL,
  custom_location VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  available_contact_after TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_location CHECK (dive_site_id IS NOT NULL OR custom_location IS NOT NULL)
);

CREATE INDEX idx_buddy_listings_user_id ON buddy_listings(user_id);
CREATE INDEX idx_buddy_listings_dive_date ON buddy_listings(dive_date);
CREATE INDEX idx_buddy_listings_is_active ON buddy_listings(is_active);
CREATE INDEX idx_buddy_listings_experience_level ON buddy_listings(experience_level);

-- ============================================================================
-- BUDDY INTERESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS buddy_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES buddy_listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_users_different CHECK (requester_id != owner_id),
  CONSTRAINT check_message_length CHECK (LENGTH(message) <= 500),
  CONSTRAINT check_response_message_length CHECK (LENGTH(response_message) <= 500)
);

CREATE INDEX idx_buddy_interests_listing_id ON buddy_interests(listing_id);
CREATE INDEX idx_buddy_interests_requester_id ON buddy_interests(requester_id);
CREATE INDEX idx_buddy_interests_owner_id ON buddy_interests(owner_id);
CREATE INDEX idx_buddy_interests_status ON buddy_interests(status);
CREATE UNIQUE INDEX idx_buddy_interests_unique ON buddy_interests(listing_id, requester_id);

-- ============================================================================
-- BUDDY BLOCKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS buddy_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_not_self CHECK (user_id != blocked_user_id)
);

CREATE INDEX idx_buddy_blocks_user_id ON buddy_blocks(user_id);
CREATE INDEX idx_buddy_blocks_blocked_user_id ON buddy_blocks(blocked_user_id);
CREATE UNIQUE INDEX idx_buddy_blocks_unique ON buddy_blocks(user_id, blocked_user_id);

-- ============================================================================
-- BUDDY CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS buddy_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES buddy_listings(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  rating_from_user1 SMALLINT CHECK (rating_from_user1 IS NULL OR (rating_from_user1 >= 1 AND rating_from_user1 <= 5)),
  rating_from_user2 SMALLINT CHECK (rating_from_user2 IS NULL OR (rating_from_user2 >= 1 AND rating_from_user2 <= 5)),
  review_from_user1 TEXT CHECK (LENGTH(review_from_user1) <= 500),
  review_from_user2 TEXT CHECK (LENGTH(review_from_user2) <= 500),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT check_users_different CHECK (user_id_1 != user_id_2)
);

CREATE INDEX idx_buddy_connections_user1 ON buddy_connections(user_id_1);
CREATE INDEX idx_buddy_connections_user2 ON buddy_connections(user_id_2);
CREATE INDEX idx_buddy_connections_listing ON buddy_connections(listing_id);
CREATE INDEX idx_buddy_connections_status ON buddy_connections(status);

-- ============================================================================
-- BUDDY MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS buddy_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES buddy_listings(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_message_length CHECK (LENGTH(message) <= 5000),
  CONSTRAINT check_users_different CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_buddy_messages_recipient ON buddy_messages(recipient_id);
CREATE INDEX idx_buddy_messages_sender ON buddy_messages(sender_id);
CREATE INDEX idx_buddy_messages_conversation ON buddy_messages(sender_id, recipient_id);
CREATE INDEX idx_buddy_messages_created_at ON buddy_messages(created_at);

-- ============================================================================
-- BUDDY REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS buddy_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('inappropriate_content', 'harassment', 'spam', 'fake_profile', 'safety_concern', 'other')),
  description TEXT NOT NULL,
  attachment_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_description_length CHECK (LENGTH(description) >= 20 AND LENGTH(description) <= 1000)
);

CREATE INDEX idx_buddy_reports_reporter ON buddy_reports(reporter_id);
CREATE INDEX idx_buddy_reports_reported_user ON buddy_reports(reported_user_id);
CREATE INDEX idx_buddy_reports_status ON buddy_reports(status);
CREATE INDEX idx_buddy_reports_created_at ON buddy_reports(created_at);

-- ============================================================================
-- BUDDY AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS buddy_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buddy_audit_logs_user_id ON buddy_audit_logs(user_id);
CREATE INDEX idx_buddy_audit_logs_action ON buddy_audit_logs(action);
CREATE INDEX idx_buddy_audit_logs_resource_type ON buddy_audit_logs(resource_type);
CREATE INDEX idx_buddy_audit_logs_created_at ON buddy_audit_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE buddy_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_audit_logs ENABLE ROW LEVEL SECURITY;

-- BUDDY LISTINGS POLICIES
CREATE POLICY "Listings are viewable if active" ON buddy_listings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own listings" ON buddy_listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create listings" ON buddy_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" ON buddy_listings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" ON buddy_listings
  FOR DELETE USING (auth.uid() = user_id);

-- BUDDY INTERESTS POLICIES
CREATE POLICY "Users can view their interests" ON buddy_interests
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = owner_id
  );

CREATE POLICY "Authenticated users can create interests" ON buddy_interests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Owners can accept/reject interests, requesters can cancel" ON buddy_interests
  FOR UPDATE USING (
    (auth.uid() = owner_id AND status = 'pending') OR
    (auth.uid() = requester_id)
  );

CREATE POLICY "Requesters can delete their interests" ON buddy_interests
  FOR DELETE USING (auth.uid() = requester_id);

-- BUDDY BLOCKS POLICIES
CREATE POLICY "Users can view their blocks" ON buddy_blocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can block others" ON buddy_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unblock" ON buddy_blocks
  FOR DELETE USING (auth.uid() = user_id);

-- BUDDY MESSAGES POLICIES
CREATE POLICY "Users can view messages sent to them" ON buddy_messages
  FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

CREATE POLICY "Authenticated users can send messages" ON buddy_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- BUDDY REPORTS POLICIES
CREATE POLICY "Users can view their reports" ON buddy_reports
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    auth.uid() = reported_user_id OR
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

CREATE POLICY "Users can create reports" ON buddy_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- BUDDY AUDIT LOGS POLICIES
CREATE POLICY "Admins can view all audit logs" ON buddy_audit_logs
  FOR SELECT USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

CREATE POLICY "Users can view their own audit logs" ON buddy_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Automatic update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables that have updated_at
CREATE TRIGGER update_buddy_listings_updated_at BEFORE UPDATE ON buddy_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buddy_interests_updated_at BEFORE UPDATE ON buddy_interests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buddy_reports_updated_at BEFORE UPDATE ON buddy_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get mutual interests between two users
CREATE OR REPLACE FUNCTION get_mutual_interests(user1_id UUID, user2_id UUID)
RETURNS TABLE (
  id UUID,
  listing_id UUID,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT bi.id, bi.listing_id, bi.status::VARCHAR
  FROM buddy_interests bi
  WHERE (
    (bi.requester_id = user1_id AND bi.owner_id = user2_id) OR
    (bi.requester_id = user2_id AND bi.owner_id = user1_id)
  ) AND bi.status = 'accepted';
END;
$$ LANGUAGE plpgsql;

-- Function to check if two users have mutual interest
CREATE OR REPLACE FUNCTION has_mutual_interest(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  count INT;
BEGIN
  SELECT COUNT(*) INTO count
  FROM get_mutual_interests(user1_id, user2_id);
  RETURN count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  count INT;
BEGIN
  SELECT COUNT(*) INTO count
  FROM buddy_blocks
  WHERE user_id = user1_id AND blocked_user_id = user2_id;
  RETURN count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP VIEWS (for admin dashboards)
-- ============================================================================

-- View for upcoming expirations (automatic listing cleanup)
CREATE OR REPLACE VIEW upcoming_expired_listings AS
SELECT
  bl.id,
  bl.user_id,
  bl.title,
  bl.dive_date,
  bl.created_at,
  EXTRACT(DAY FROM bl.dive_date - now()) as days_until_dive
FROM buddy_listings bl
WHERE bl.is_active = true
  AND bl.dive_date < now() + INTERVAL '30 days'
ORDER BY bl.dive_date ASC;

-- View for pending reports
CREATE OR REPLACE VIEW pending_buddy_reports AS
SELECT
  br.id,
  br.reporter_id,
  br.reported_user_id,
  br.reason,
  br.description,
  br.created_at,
  u_reporter.first_name as reporter_name,
  u_reported.first_name as reported_user_name
FROM buddy_reports br
LEFT JOIN auth.users u_reporter ON br.reporter_id = u_reporter.id
LEFT JOIN auth.users u_reported ON br.reported_user_id = u_reported.id
WHERE br.status = 'pending'
ORDER BY br.created_at ASC;

-- ============================================================================
-- GRANT PERMISSIONS (if using separate auth schema)
-- ============================================================================

-- Users should not have direct table access in production
-- All access goes through API routes and RLS policies

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON buddy_listings TO authenticated;
GRANT SELECT ON buddy_interests TO authenticated;
GRANT SELECT ON buddy_blocks TO authenticated;
GRANT SELECT ON buddy_messages TO authenticated;
GRANT SELECT ON buddy_reports TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE buddy_listings IS 'Buddy search listings created by users';
COMMENT ON TABLE buddy_interests IS 'Expressions of interest in diving together';
COMMENT ON TABLE buddy_blocks IS 'Users blocked by other users';
COMMENT ON TABLE buddy_connections IS 'Established buddy connections with post-dive ratings';
COMMENT ON TABLE buddy_messages IS 'Direct messages between users';
COMMENT ON TABLE buddy_reports IS 'Safety reports and abuse complaints';
COMMENT ON TABLE buddy_audit_logs IS 'Audit trail for compliance and security';

COMMENT ON COLUMN buddy_listings.is_active IS 'Soft delete - set to false instead of hard delete';
COMMENT ON COLUMN buddy_interests.status IS 'pending | accepted | rejected | cancelled';
COMMENT ON COLUMN buddy_reports.status IS 'pending | under_review | resolved | dismissed';
COMMENT ON COLUMN buddy_audit_logs.metadata IS 'Additional context like target user ID for contact reveals';
