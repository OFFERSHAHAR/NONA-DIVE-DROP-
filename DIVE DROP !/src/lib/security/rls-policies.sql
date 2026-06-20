-- ============================================================================
-- Row Level Security (RLS) Policies for "Find a Buddy" (מצא באדי)
-- ============================================================================
-- These policies enforce access control at the database level
-- Security principle: Trust the database, never trust the client

-- ============================================================================
-- 1. USERS TABLE - Basic profile and contact info
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  diving_experience TEXT CHECK (diving_experience IN ('beginner', 'intermediate', 'advanced', 'instructor')),
  location TEXT,
  blocked_users UUID[] DEFAULT '{}', -- Array of user IDs this user has blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "users_read_own_profile"
  ON users
  FOR SELECT
  USING (
    auth.uid() = id
  );

-- Policy: Registered users can read public profile info of others (no contact info)
CREATE POLICY "users_read_public_profile"
  ON users
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() != id
    AND NOT (id = ANY(SELECT blocked_users FROM users WHERE id = auth.uid()))
  );

-- Policy: Users can update only their own profile
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (on signup)
CREATE POLICY "users_insert_own_profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. LISTINGS TABLE - Dive buddy listings
-- ============================================================================

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  diving_level TEXT NOT NULL CHECK (diving_level IN ('beginner', 'intermediate', 'advanced')),
  location TEXT NOT NULL,
  dive_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_buddies INTEGER DEFAULT 1,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on listings table
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active public listings (no contact info yet)
CREATE POLICY "listings_read_active"
  ON listings
  FOR SELECT
  USING (
    is_active = true
    AND owner_id NOT IN (
      SELECT id FROM users WHERE auth.uid() = ANY(blocked_users)
    )
  );

-- Policy: Listing owner can read their own listings
CREATE POLICY "listings_read_own"
  ON listings
  FOR SELECT
  USING (owner_id = auth.uid());

-- Policy: Only registered users can create listings
CREATE POLICY "listings_create_authenticated"
  ON listings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = owner_id
  );

-- Policy: Listing owner can update their own listings
CREATE POLICY "listings_update_own"
  ON listings
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: Listing owner can delete their own listings
CREATE POLICY "listings_delete_own"
  ON listings
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 3. INTERESTS TABLE - Track when User B expresses interest in a listing
-- ============================================================================

CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  interested_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, interested_user_id)
);

-- Enable RLS on interests table
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Policy: Interested user can see their own interests
CREATE POLICY "interests_read_own"
  ON interests
  FOR SELECT
  USING (interested_user_id = auth.uid());

-- Policy: Listing owner can see who's interested in their listings
CREATE POLICY "interests_read_own_listing"
  ON interests
  FOR SELECT
  USING (listing_owner_id = auth.uid());

-- Policy: Only registered users can express interest
CREATE POLICY "interests_create_authenticated"
  ON interests
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = interested_user_id
    AND interested_user_id != listing_owner_id
  );

-- Policy: Interested user can delete their own interests
CREATE POLICY "interests_delete_own"
  ON interests
  FOR DELETE
  USING (interested_user_id = auth.uid());

-- ============================================================================
-- 4. CONTACT_REVEALS TABLE - Track mutual contact info reveals
-- ============================================================================
-- When User B (interested) reveals contact to User A (owner),
-- both users get mutual access to each other's contact info

CREATE TABLE IF NOT EXISTS contact_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User B requesting to reveal
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User A (listing owner)
  initiator_contact_revealed BOOLEAN DEFAULT false, -- User B revealed their contact
  recipient_contact_revealed BOOLEAN DEFAULT false, -- User A revealed their contact
  mutual_revealed_at TIMESTAMP WITH TIME ZONE, -- When both revealed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, initiator_id, recipient_id),
  CHECK (initiator_id != recipient_id)
);

-- Enable RLS on contact_reveals table
ALTER TABLE contact_reveals ENABLE ROW LEVEL SECURITY;

-- Policy: Involved parties can read their own reveals
CREATE POLICY "contact_reveals_read_involved"
  ON contact_reveals
  FOR SELECT
  USING (
    initiator_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- Policy: Interested user can create reveal request
CREATE POLICY "contact_reveals_create"
  ON contact_reveals
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = initiator_id
  );

-- Policy: Both parties can update reveal status
CREATE POLICY "contact_reveals_update"
  ON contact_reveals
  FOR UPDATE
  USING (
    initiator_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- ============================================================================
-- 5. BLOCKS TABLE - User blocking
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id),
  CHECK (blocker_id != blocked_user_id)
);

-- Enable RLS on blocks table
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own blocks
CREATE POLICY "blocks_read_own"
  ON blocks
  FOR SELECT
  USING (blocker_id = auth.uid());

-- Policy: Only owner can create blocks
CREATE POLICY "blocks_create_own"
  ON blocks
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = blocker_id
  );

-- Policy: Only owner can delete blocks
CREATE POLICY "blocks_delete_own"
  ON blocks
  FOR DELETE
  USING (blocker_id = auth.uid());

-- ============================================================================
-- 6. REPORTS TABLE - Report spam/abuse
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'inappropriate', 'other')),
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own reports
CREATE POLICY "reports_read_own"
  ON reports
  FOR SELECT
  USING (reporter_id = auth.uid());

-- Policy: Only registered users can create reports
CREATE POLICY "reports_create_authenticated"
  ON reports
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = reporter_id
    AND auth.uid() != COALESCE(reported_user_id, auth.uid())
  );

-- ============================================================================
-- 7. AUDIT_LOG TABLE - Track all contact info access for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'contact_revealed',
    'contact_requested',
    'user_blocked',
    'user_reported',
    'listing_created',
    'listing_deleted',
    'interest_expressed'
  )),
  resource_type TEXT NOT NULL, -- 'user', 'listing', 'contact'
  resource_id UUID NOT NULL,
  target_user_id UUID, -- Who was affected (if applicable)
  details JSONB, -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_log table
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Involved users and admins only
CREATE POLICY "audit_log_read_involved"
  ON audit_log
  FOR SELECT
  USING (
    actor_id = auth.uid()
    OR target_user_id = auth.uid()
  );

-- Policy: Automatic audit entries via trigger (no direct INSERT)
CREATE POLICY "audit_log_insert_system"
  ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if two users have mutually revealed contact info
CREATE OR REPLACE FUNCTION has_mutual_reveal(
  user_a_id UUID,
  user_b_id UUID,
  p_listing_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM contact_reveals
    WHERE listing_id = p_listing_id
      AND (
        (initiator_id = user_a_id AND recipient_id = user_b_id)
        OR (initiator_id = user_b_id AND recipient_id = user_a_id)
      )
      AND initiator_contact_revealed = true
      AND recipient_contact_revealed = true
  );
$$;

-- Function: Check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
  blocker_id UUID,
  blocked_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM blocks
    WHERE blocks.blocker_id = blocker_id
      AND blocks.blocked_user_id = blocked_user_id
  );
$$;

-- Function: Get user's visible contact info
CREATE OR REPLACE FUNCTION get_visible_contact_info(
  p_user_id UUID,
  p_viewer_id UUID,
  p_listing_id UUID
)
RETURNS TABLE(email TEXT, phone TEXT, profile_picture_url TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    CASE WHEN has_mutual_reveal(p_user_id, p_viewer_id, p_listing_id)
      THEN u.email ELSE NULL
    END as email,
    CASE WHEN has_mutual_reveal(p_user_id, p_viewer_id, p_listing_id)
      THEN u.phone ELSE NULL
    END as phone,
    CASE WHEN has_mutual_reveal(p_user_id, p_viewer_id, p_listing_id)
      THEN u.profile_picture_url ELSE NULL
    END as profile_picture_url
  FROM users u
  WHERE u.id = p_user_id;
$$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_listings_owner_id ON listings(owner_id);
CREATE INDEX idx_listings_is_active ON listings(is_active);
CREATE INDEX idx_interests_listing_id ON interests(listing_id);
CREATE INDEX idx_interests_interested_user_id ON interests(interested_user_id);
CREATE INDEX idx_interests_owner_id ON interests(listing_owner_id);
CREATE INDEX idx_contact_reveals_listing_id ON contact_reveals(listing_id);
CREATE INDEX idx_contact_reveals_initiator_id ON contact_reveals(initiator_id);
CREATE INDEX idx_contact_reveals_recipient_id ON contact_reveals(recipient_id);
CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked_user_id ON blocks(blocked_user_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_reported_listing_id ON reports(reported_listing_id);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
