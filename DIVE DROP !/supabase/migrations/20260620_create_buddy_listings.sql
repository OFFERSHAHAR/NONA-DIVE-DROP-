-- Create buddy_listings table
CREATE TABLE IF NOT EXISTS buddy_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  dive_type TEXT NOT NULL,
  max_divers INT DEFAULT 4 NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  contact_hidden BOOLEAN DEFAULT true NOT NULL,
  language_preference TEXT DEFAULT 'he' NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_experience_level CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  CONSTRAINT valid_dive_type CHECK (dive_type IN ('reef', 'wreck', 'open_water', 'cave', 'boat', 'shore'))
);

-- Create indexes for buddy_listings
CREATE INDEX buddy_listings_user_id_idx ON buddy_listings(user_id);
CREATE INDEX buddy_listings_location_idx ON buddy_listings(location);
CREATE INDEX buddy_listings_experience_level_idx ON buddy_listings(experience_level);
CREATE INDEX buddy_listings_dive_type_idx ON buddy_listings(dive_type);
CREATE INDEX buddy_listings_start_date_idx ON buddy_listings(start_date);
CREATE INDEX buddy_listings_is_active_idx ON buddy_listings(is_active);

-- Create buddy_interests table
CREATE TABLE IF NOT EXISTS buddy_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES buddy_listings(id) ON DELETE CASCADE NOT NULL,
  interested_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  contact_request_sent BOOLEAN DEFAULT false NOT NULL,
  contact_request_accepted BOOLEAN DEFAULT false NOT NULL,
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(listing_id, interested_user_id)
);

-- Create indexes for buddy_interests
CREATE INDEX buddy_interests_listing_id_idx ON buddy_interests(listing_id);
CREATE INDEX buddy_interests_interested_user_id_idx ON buddy_interests(interested_user_id);
CREATE INDEX buddy_interests_contact_request_idx ON buddy_interests(contact_request_sent);

-- Create buddy_connections table
CREATE TABLE IF NOT EXISTS buddy_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES buddy_listings(id) ON DELETE CASCADE NOT NULL,
  user_id_1 UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_id_2 UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'matched' NOT NULL,
  connection_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_status CHECK (status IN ('matched', 'active', 'completed')),
  CONSTRAINT different_users CHECK (user_id_1 != user_id_2)
);

-- Create indexes for buddy_connections
CREATE INDEX buddy_connections_listing_id_idx ON buddy_connections(listing_id);
CREATE INDEX buddy_connections_user_id_1_idx ON buddy_connections(user_id_1);
CREATE INDEX buddy_connections_user_id_2_idx ON buddy_connections(user_id_2);
CREATE INDEX buddy_connections_status_idx ON buddy_connections(status);

-- Enable RLS for buddy_listings
ALTER TABLE buddy_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies for buddy_listings
CREATE POLICY "Anyone can view active listings"
  ON buddy_listings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own listings"
  ON buddy_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create listings"
  ON buddy_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
  ON buddy_listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
  ON buddy_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS for buddy_interests
ALTER TABLE buddy_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interests for their listings"
  ON buddy_interests FOR SELECT
  USING (auth.uid() = interested_user_id OR
         listing_id IN (SELECT id FROM buddy_listings WHERE user_id = auth.uid()));

CREATE POLICY "Users can create interests"
  ON buddy_interests FOR INSERT
  WITH CHECK (auth.uid() = interested_user_id);

CREATE POLICY "Users can update their own interests"
  ON buddy_interests FOR UPDATE
  USING (auth.uid() = interested_user_id);

CREATE POLICY "Users can delete their own interests"
  ON buddy_interests FOR DELETE
  USING (auth.uid() = interested_user_id);

-- Enable RLS for buddy_connections
ALTER TABLE buddy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their connections"
  ON buddy_connections FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2 OR
         listing_id IN (SELECT id FROM buddy_listings WHERE user_id = auth.uid()));

CREATE POLICY "System can create connections"
  ON buddy_connections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their connections"
  ON buddy_connections FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
