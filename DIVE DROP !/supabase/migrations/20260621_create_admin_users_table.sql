-- Admin Users Table
-- Links application users to admin roles
-- Created: 2026-06-20

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role_id UUID REFERENCES admin_roles(id) ON DELETE RESTRICT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deactivated_at TIMESTAMPTZ DEFAULT NULL,
  last_login_at TIMESTAMPTZ DEFAULT NULL,
  login_count INT DEFAULT 0 NOT NULL,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_login_count CHECK (login_count >= 0)
);

-- Indexes for common queries
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role_id ON admin_users(role_id);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_users_deleted_at ON admin_users(deleted_at);
CREATE INDEX idx_admin_users_created_by ON admin_users(created_by);
CREATE INDEX idx_admin_users_last_login ON admin_users(last_login_at DESC) WHERE is_active = true;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Super admins can view all admin users
CREATE POLICY "super_admin_view_all_admin_users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name = 'super_admin'
      AND au.is_active = true
      AND au.deleted_at IS NULL
    )
  );

-- Admins can view themselves
CREATE POLICY "admin_view_own_admin_account"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid() AND is_active = true AND deleted_at IS NULL);

-- Only super admins can insert admin users
CREATE POLICY "super_admin_create_admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name = 'super_admin'
      AND au.is_active = true
      AND au.deleted_at IS NULL
    )
  );

-- Only super admins can update admin users
CREATE POLICY "super_admin_update_admin_users"
  ON admin_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name = 'super_admin'
      AND au.is_active = true
      AND au.deleted_at IS NULL
    )
  );

-- Prevent hard deletion (use soft delete via deleted_at)
CREATE POLICY "prevent_admin_user_delete"
  ON admin_users FOR DELETE
  USING (false);

-- Create helper function to check if user has permission
CREATE OR REPLACE FUNCTION has_admin_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM admin_users au
    JOIN admin_roles ar ON au.role_id = ar.id
    JOIN role_permissions rp ON ar.id = rp.role_id
    JOIN admin_permissions ap ON rp.permission_id = ap.id
    WHERE au.user_id = p_user_id
    AND ap.resource = p_resource
    AND ap.action = p_action
    AND au.is_active = true
    AND au.deleted_at IS NULL
    AND ar.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user has admin role
CREATE OR REPLACE FUNCTION user_has_admin_role(
  p_user_id UUID,
  p_role_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM admin_users au
    JOIN admin_roles ar ON au.role_id = ar.id
    WHERE au.user_id = p_user_id
    AND ar.name = p_role_name
    AND au.is_active = true
    AND au.deleted_at IS NULL
    AND ar.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get admin user role (returns NULL if not admin)
CREATE OR REPLACE FUNCTION get_user_admin_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT ar.name INTO v_role
  FROM admin_users au
  JOIN admin_roles ar ON au.role_id = ar.id
  WHERE au.user_id = p_user_id
  AND au.is_active = true
  AND au.deleted_at IS NULL
  AND ar.deleted_at IS NULL
  LIMIT 1;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table and functions
COMMENT ON TABLE admin_users IS 'Tracks admin users and their role assignments. Use soft delete via deleted_at.';
COMMENT ON FUNCTION has_admin_permission IS 'Check if a user has a specific permission (resource + action)';
COMMENT ON FUNCTION user_has_admin_role IS 'Check if a user has a specific admin role';
COMMENT ON FUNCTION get_user_admin_role IS 'Get the admin role name for a user, or NULL if not an admin';
