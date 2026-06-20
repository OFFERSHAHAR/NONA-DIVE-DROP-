-- Enhanced Dive Sites Schema
-- Adds moderation and content management capabilities
-- Created: 2026-06-20

-- 1. Create dive_sites_enhanced table
CREATE TABLE IF NOT EXISTS dive_sites_enhanced (
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  moderation_status TEXT DEFAULT 'pending' NOT NULL,
  featured BOOLEAN DEFAULT false NOT NULL,
  published BOOLEAN DEFAULT true NOT NULL,
  view_count INT DEFAULT 0 NOT NULL,
  booking_count INT DEFAULT 0 NOT NULL,
  moderation_notes TEXT DEFAULT '',
  last_moderated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  last_moderated_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_moderation_status CHECK (moderation_status IN (
    'pending', 'approved', 'rejected', 'needs_revision'
  ))
);

-- Indexes for common queries
CREATE INDEX idx_dive_sites_enhanced_status ON dive_sites_enhanced(moderation_status, published);
CREATE INDEX idx_dive_sites_enhanced_featured ON dive_sites_enhanced(featured) WHERE published = true;
CREATE INDEX idx_dive_sites_enhanced_moderated_by ON dive_sites_enhanced(last_moderated_by);
CREATE INDEX idx_dive_sites_enhanced_moderated_at ON dive_sites_enhanced(last_moderated_at DESC);

-- 2. Create dive_site_images table
CREATE TABLE IF NOT EXISTS dive_site_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_storage_path TEXT NOT NULL,
  alt_text_en TEXT DEFAULT '',
  alt_text_he TEXT DEFAULT '',
  order_index INT DEFAULT 0 NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  uploaded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  moderation_status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_moderation_status CHECK (moderation_status IN (
    'pending', 'approved', 'rejected'
  )),
  CONSTRAINT valid_order_index CHECK (order_index >= 0)
);

-- Indexes for common queries
CREATE INDEX idx_dive_site_images_site ON dive_site_images(dive_site_id, order_index);
CREATE INDEX idx_dive_site_images_primary ON dive_site_images(dive_site_id) WHERE is_primary = true;
CREATE INDEX idx_dive_site_images_moderation ON dive_site_images(moderation_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dive_site_images_uploaded_by ON dive_site_images(uploaded_by);

-- 3. Enable RLS on enhanced tables
ALTER TABLE dive_sites_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_site_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy for dive_sites_enhanced: Everyone can view published sites
CREATE POLICY "view_published_dive_sites_enhanced"
  ON dive_sites_enhanced FOR SELECT
  USING (
    published = true AND moderation_status IN ('approved', 'needs_revision')
  );

-- Admins with site_manager role can view all enhanced dive site data
CREATE POLICY "site_manager_view_all_dive_sites_enhanced"
  ON dive_sites_enhanced FOR SELECT
  USING (
    has_admin_permission(auth.uid(), 'dive_sites', 'view')
  );

-- Site managers can create enhanced metadata
CREATE POLICY "site_manager_create_dive_sites_enhanced"
  ON dive_sites_enhanced FOR INSERT
  WITH CHECK (
    has_admin_permission(auth.uid(), 'dive_sites', 'create')
  );

-- Site managers can update enhanced metadata
CREATE POLICY "site_manager_update_dive_sites_enhanced"
  ON dive_sites_enhanced FOR UPDATE
  USING (
    has_admin_permission(auth.uid(), 'dive_sites', 'update')
  );

-- RLS Policy for dive_site_images: Public can view approved images of published sites
CREATE POLICY "view_approved_dive_site_images"
  ON dive_site_images FOR SELECT
  USING (
    deleted_at IS NULL
    AND moderation_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM dive_sites_enhanced
      WHERE dive_site_id = dive_site_images.dive_site_id
      AND published = true
      AND moderation_status IN ('approved', 'needs_revision')
    )
  );

-- Admins can view all images
CREATE POLICY "admin_view_all_dive_site_images"
  ON dive_site_images FOR SELECT
  USING (
    has_admin_permission(auth.uid(), 'dive_sites', 'view')
  );

-- Admins can upload/manage images
CREATE POLICY "admin_create_dive_site_images"
  ON dive_site_images FOR INSERT
  WITH CHECK (
    has_admin_permission(auth.uid(), 'dive_sites', 'update')
  );

CREATE POLICY "admin_update_dive_site_images"
  ON dive_site_images FOR UPDATE
  USING (
    has_admin_permission(auth.uid(), 'dive_sites', 'update')
  );

-- 4. Backfill existing dive sites
-- Backfill dive_sites_enhanced for existing sites
INSERT INTO dive_sites_enhanced (
  dive_site_id,
  published,
  moderation_status,
  created_at
)
SELECT
  id,
  true,
  'approved',
  created_at
FROM dive_sites
ON CONFLICT (dive_site_id) DO NOTHING;

-- 5. Backfill dive_site_images from the images array column
-- This assumes the images column in dive_sites contains URLs
INSERT INTO dive_site_images (
  dive_site_id,
  image_url,
  image_storage_path,
  order_index,
  is_primary,
  moderation_status,
  created_at
)
SELECT
  dive_sites.id,
  unnest(dive_sites.images),
  '',
  row_number() OVER (PARTITION BY dive_sites.id ORDER BY 1) - 1,
  row_number() OVER (PARTITION BY dive_sites.id ORDER BY 1) = 1,
  'approved',
  dive_sites.created_at
FROM dive_sites
WHERE images IS NOT NULL
AND array_length(images, 1) > 0
ON CONFLICT DO NOTHING;

-- 6. Update dive_sites RLS policies to reference enhanced table
-- Drop old policies if they exist
DROP POLICY IF EXISTS "View all dive sites" ON dive_sites;
DROP POLICY IF EXISTS "Create dive sites" ON dive_sites;
DROP POLICY IF EXISTS "Update own dive sites" ON dive_sites;

-- New policies that respect moderation status
CREATE POLICY "view_approved_dive_sites"
  ON dive_sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dive_sites_enhanced
      WHERE dive_site_id = dive_sites.id
      AND published = true
      AND moderation_status IN ('approved', 'needs_revision')
    )
    OR
    -- Admins can view all
    has_admin_permission(auth.uid(), 'dive_sites', 'view')
  );

CREATE POLICY "site_manager_create_dive_sites"
  ON dive_sites FOR INSERT
  WITH CHECK (
    has_admin_permission(auth.uid(), 'dive_sites', 'create')
  );

CREATE POLICY "site_manager_update_dive_sites"
  ON dive_sites FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    has_admin_permission(auth.uid(), 'dive_sites', 'update')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    has_admin_permission(auth.uid(), 'dive_sites', 'update')
  );

-- 7. Create helper functions for moderation workflow
CREATE OR REPLACE FUNCTION approve_dive_site(
  p_site_id UUID,
  p_admin_user_id UUID,
  p_notes TEXT DEFAULT ''
)
RETURNS void AS $$
BEGIN
  UPDATE dive_sites_enhanced
  SET
    moderation_status = 'approved',
    last_moderated_by = p_admin_user_id,
    last_moderated_at = now(),
    moderation_notes = p_notes,
    updated_at = now()
  WHERE dive_site_id = p_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_dive_site(
  p_site_id UUID,
  p_admin_user_id UUID,
  p_notes TEXT DEFAULT ''
)
RETURNS void AS $$
BEGIN
  UPDATE dive_sites_enhanced
  SET
    moderation_status = 'rejected',
    published = false,
    last_moderated_by = p_admin_user_id,
    last_moderated_at = now(),
    moderation_notes = p_notes,
    updated_at = now()
  WHERE dive_site_id = p_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION flag_dive_site_needs_revision(
  p_site_id UUID,
  p_admin_user_id UUID,
  p_notes TEXT DEFAULT ''
)
RETURNS void AS $$
BEGIN
  UPDATE dive_sites_enhanced
  SET
    moderation_status = 'needs_revision',
    last_moderated_by = p_admin_user_id,
    last_moderated_at = now(),
    moderation_notes = p_notes,
    updated_at = now()
  WHERE dive_site_id = p_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_dive_site_featured(
  p_site_id UUID,
  p_featured BOOLEAN,
  p_admin_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE dive_sites_enhanced
  SET
    featured = p_featured,
    updated_at = now()
  WHERE dive_site_id = p_site_id
  AND moderation_status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE dive_sites_enhanced IS 'Extends dive_sites with moderation and content management metadata';
COMMENT ON TABLE dive_site_images IS 'Manages multiple images per dive site with ordering and moderation';
COMMENT ON FUNCTION approve_dive_site IS 'Approve a dive site for public viewing';
COMMENT ON FUNCTION reject_dive_site IS 'Reject a dive site and hide from public';
COMMENT ON FUNCTION flag_dive_site_needs_revision IS 'Flag a site that needs revision';
COMMENT ON FUNCTION toggle_dive_site_featured IS 'Toggle featured status of approved dive sites';
