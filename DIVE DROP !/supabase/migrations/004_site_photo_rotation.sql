-- Site Photo Rotation Schema
-- Tracks site photos and rotation history for automatic hero image updates

-- Create site_photos table (if not exists)
CREATE TABLE IF NOT EXISTS site_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File info
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL, -- 'image/jpeg', 'image/png', etc

  -- Photo metadata
  title VARCHAR(255),
  description TEXT,

  -- Approval/Moderation
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),

  -- Engagement tracking
  rating NUMERIC(2,1) DEFAULT 0, -- 0-5 stars
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  uploaded_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT positive_counts CHECK (comment_count >= 0 AND view_count >= 0 AND file_size >= 0)
);

-- Create site_photo_rotation_logs table (audit trail)
CREATE TABLE IF NOT EXISTS site_photo_rotation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,

  -- Photo tracking
  previous_photo_id UUID REFERENCES site_photos(id) ON DELETE SET NULL,
  new_photo_id UUID NOT NULL REFERENCES site_photos(id) ON DELETE RESTRICT,

  -- Who/what made the change
  set_by VARCHAR(50) NOT NULL DEFAULT 'system', -- 'system', 'admin', 'user_id'

  -- When and why
  set_at TIMESTAMP DEFAULT NOW(),
  reason TEXT,

  -- Indexes
  CONSTRAINT valid_photo_ids CHECK (previous_photo_id != new_photo_id)
);

-- Create site_photo_rotation_current table (for quick hero image lookup)
CREATE TABLE IF NOT EXISTS site_photo_rotation_current (
  site_id UUID PRIMARY KEY REFERENCES dive_sites(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES site_photos(id) ON DELETE RESTRICT,
  set_at TIMESTAMP DEFAULT NOW(),
  set_by VARCHAR(50) NOT NULL DEFAULT 'system'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_photos_site_id ON site_photos(site_id);
CREATE INDEX IF NOT EXISTS idx_site_photos_is_approved ON site_photos(is_approved);
CREATE INDEX IF NOT EXISTS idx_site_photos_uploaded_at ON site_photos(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_site_photos_rating ON site_photos(rating DESC);

CREATE INDEX IF NOT EXISTS idx_rotation_logs_site_id ON site_photo_rotation_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_rotation_logs_set_at ON site_photo_rotation_logs(set_at DESC);
CREATE INDEX IF NOT EXISTS idx_rotation_logs_new_photo_id ON site_photo_rotation_logs(new_photo_id);

-- Triggers for automatic timestamp management
CREATE OR REPLACE FUNCTION update_site_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_photos_updated_at_trigger
BEFORE UPDATE ON site_photos
FOR EACH ROW
EXECUTE FUNCTION update_site_photos_updated_at();

-- Trigger to update current rotation table when logging a rotation
CREATE OR REPLACE FUNCTION update_current_rotation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO site_photo_rotation_current (site_id, photo_id, set_at, set_by)
  VALUES (NEW.site_id, NEW.new_photo_id, NEW.set_at, NEW.set_by)
  ON CONFLICT (site_id) DO UPDATE
  SET photo_id = EXCLUDED.photo_id,
      set_at = EXCLUDED.set_at,
      set_by = EXCLUDED.set_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rotation_logs_update_current_trigger
AFTER INSERT ON site_photo_rotation_logs
FOR EACH ROW
EXECUTE FUNCTION update_current_rotation();

-- Enable RLS on tables
ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_photo_rotation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_photo_rotation_current ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_photos
-- Everyone can see approved photos
CREATE POLICY "Anyone can view approved photos"
  ON site_photos FOR SELECT
  USING (is_approved = TRUE);

-- Users can view their own photos (approved or not)
CREATE POLICY "Users can view their own photos"
  ON site_photos FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all photos
CREATE POLICY "Admins can view all photos"
  ON site_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Users can insert their own photos
CREATE POLICY "Users can upload photos"
  ON site_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos (if not approved)
CREATE POLICY "Users can update own unapproved photos"
  ON site_photos FOR UPDATE
  USING (auth.uid() = user_id AND is_approved = FALSE)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update approval status
CREATE POLICY "Admins can manage photos"
  ON site_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policies for site_photo_rotation_logs
-- Everyone can view rotation history
CREATE POLICY "Anyone can view rotation logs"
  ON site_photo_rotation_logs FOR SELECT
  USING (TRUE);

-- Only admins and system can insert logs
CREATE POLICY "System can insert rotation logs"
  ON site_photo_rotation_logs FOR INSERT
  WITH CHECK (set_by = 'system');

CREATE POLICY "Admins can insert rotation logs"
  ON site_photo_rotation_logs FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policies for site_photo_rotation_current
-- Everyone can view current rotation
CREATE POLICY "Anyone can view current rotation"
  ON site_photo_rotation_current FOR SELECT
  USING (TRUE);

-- Only system and admins can manage
CREATE POLICY "System can update current rotation"
  ON site_photo_rotation_current FOR UPDATE
  USING (set_by = 'system');

CREATE POLICY "Admins can update current rotation"
  ON site_photo_rotation_current FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );
