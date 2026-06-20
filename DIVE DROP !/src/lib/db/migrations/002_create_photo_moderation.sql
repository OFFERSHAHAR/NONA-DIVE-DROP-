-- Photo Moderation System
-- This migration creates tables and functions for managing photo uploads with moderation

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  title TEXT,
  description TEXT,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create photo rejections table (for tracking rejection reasons)
CREATE TABLE IF NOT EXISTS photo_rejections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  rejection_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create photo approvals table (for tracking approvals)
CREATE TABLE IF NOT EXISTS photo_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create photo moderation audit table
CREATE TABLE IF NOT EXISTS photo_moderation_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'approved', 'rejected', 'flagged')),
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_dive_site_id ON photos(dive_site_id);
CREATE INDEX IF NOT EXISTS idx_photos_instructor_id ON photos(instructor_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_photo_rejections_photo_id ON photo_rejections(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_rejections_admin_id ON photo_rejections(admin_id);
CREATE INDEX IF NOT EXISTS idx_photo_approvals_photo_id ON photo_approvals(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_moderation_audit_photo_id ON photo_moderation_audit(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_moderation_audit_admin_id ON photo_moderation_audit(admin_id);

-- Enable RLS (Row Level Security)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_moderation_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photos
-- Users can see their own photos and approved photos
CREATE POLICY photos_user_policy ON photos
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    status = 'approved' OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can insert their own photos
CREATE POLICY photos_insert_policy ON photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can update photos
CREATE POLICY photos_admin_update_policy ON photos
  FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Admin-only policies for rejection and approval tables
CREATE POLICY photo_rejections_admin_policy ON photo_rejections
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY photo_approvals_admin_policy ON photo_approvals
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY photo_moderation_audit_admin_policy ON photo_moderation_audit
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Create function to get photo moderation stats
CREATE OR REPLACE FUNCTION get_photo_moderation_stats()
RETURNS TABLE (
  pending_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  today_uploads BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT,
    COUNT(*) FILTER (WHERE uploaded_at::DATE = CURRENT_DATE)::BIGINT
  FROM photos;
END;
$$ LANGUAGE plpgsql;

-- Create function to log moderation action
CREATE OR REPLACE FUNCTION log_photo_moderation_action(
  p_photo_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO photo_moderation_audit (photo_id, admin_id, action, details)
  VALUES (p_photo_id, auth.uid(), p_action, p_details)
  RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on photos
CREATE OR REPLACE FUNCTION update_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_updated_at_trigger
BEFORE UPDATE ON photos
FOR EACH ROW
EXECUTE FUNCTION update_photos_updated_at();
