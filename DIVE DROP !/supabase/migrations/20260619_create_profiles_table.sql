-- Create profiles table (detailed diver profile information)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  cover_photo_url TEXT DEFAULT '',
  certified BOOLEAN DEFAULT false NOT NULL,
  certification_agency TEXT DEFAULT 'PADI',
  certification_date DATE,
  certification_number TEXT DEFAULT '',
  experience_level TEXT DEFAULT 'beginner' NOT NULL,
  total_dives_logged INT DEFAULT 0 NOT NULL,
  favorite_dive_sites TEXT[] DEFAULT ARRAY[]::TEXT[],
  favorite_fish_species TEXT[] DEFAULT ARRAY[]::TEXT[],
  special_interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_depth_recorded INT DEFAULT 0 NOT NULL,
  max_depth_certified INT DEFAULT 18 NOT NULL,
  preferred_water_temperature TEXT DEFAULT 'tropical',
  preferred_environment TEXT DEFAULT 'reef',
  dive_suit_type TEXT DEFAULT 'wetsuit',
  dive_computer_brand TEXT DEFAULT '',
  camera_type TEXT DEFAULT '',
  equipment_notes TEXT DEFAULT '',
  medical_conditions TEXT DEFAULT '',
  allergies TEXT DEFAULT '',
  physical_limitations TEXT DEFAULT '',
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  emergency_contact_relationship TEXT DEFAULT '',
  insurance_provider TEXT DEFAULT '',
  insurance_policy_number TEXT DEFAULT '',
  insurance_expiry_date DATE,
  language_preference TEXT DEFAULT 'en' NOT NULL,
  timezone TEXT DEFAULT 'UTC' NOT NULL,
  newsletter_subscription BOOLEAN DEFAULT true NOT NULL,
  notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  privacy_level TEXT DEFAULT 'public' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Check constraints for enums
  CONSTRAINT valid_experience_level CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  CONSTRAINT valid_water_temperature CHECK (preferred_water_temperature IN ('tropical', 'temperate', 'cold')),
  CONSTRAINT valid_environment CHECK (preferred_environment IN ('reef', 'wreck', 'open_water', 'cave', 'lake')),
  CONSTRAINT valid_privacy_level CHECK (privacy_level IN ('public', 'friends_only', 'private'))
);

-- Create index on user_id for profile lookups
CREATE INDEX profiles_user_id_idx ON profiles(user_id);

-- Create index on experience_level for filtering
CREATE INDEX profiles_experience_level_idx ON profiles(experience_level);

-- Create index on certified for filtering certified divers
CREATE INDEX profiles_certified_idx ON profiles(certified);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view profiles based on privacy level
CREATE POLICY "View public profiles"
  ON profiles FOR SELECT
  USING (privacy_level = 'public' OR auth.uid() = user_id);

-- Policy: Users can only update their own profile
CREATE POLICY "Update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot insert profiles directly
CREATE POLICY "Profile creation via auth"
  ON profiles FOR INSERT
  WITH CHECK (false);
