-- Create users table (application-level user profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT DEFAULT '' NOT NULL,
  bio TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  location TEXT DEFAULT '',
  experience_level TEXT DEFAULT 'beginner' NOT NULL,
  certified BOOLEAN DEFAULT false NOT NULL,
  certification_level TEXT DEFAULT 'open_water',
  certifications_count INT DEFAULT 0 NOT NULL,
  total_dives INT DEFAULT 0 NOT NULL,
  avatar_url TEXT DEFAULT '',
  birth_date DATE,
  gender TEXT DEFAULT '',
  medical_conditions TEXT DEFAULT '',
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  language TEXT DEFAULT 'en' NOT NULL,
  timezone TEXT DEFAULT 'UTC' NOT NULL,
  preferences JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Check constraints for enums
  CONSTRAINT valid_experience_level CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  CONSTRAINT valid_certification_level CHECK (certification_level IN ('open_water', 'advanced', 'rescue', 'divemaster', 'instructor', 'none'))
);

-- Create index on auth_id for fast lookups
CREATE INDEX users_auth_id_idx ON users(auth_id);

-- Create index on email for authentication
CREATE INDEX users_email_idx ON users(email);

-- Create index on username for user discovery
CREATE INDEX users_username_idx ON users(username);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public profile information
CREATE POLICY "Users can view public profiles"
  ON users FOR SELECT
  USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Policy: Users cannot insert (profiles created via auth trigger)
CREATE POLICY "Profile creation via auth"
  ON users FOR INSERT
  WITH CHECK (false);
