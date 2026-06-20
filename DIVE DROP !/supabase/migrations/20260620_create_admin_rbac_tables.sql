-- Admin RBAC Schema
-- Provides role-based access control for admin panel
-- Created: 2026-06-20

-- 1. Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  display_name_en TEXT NOT NULL,
  display_name_he TEXT NOT NULL,
  priority INT DEFAULT 100 NOT NULL,
  is_system BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 1000),
  CONSTRAINT name_no_spaces CHECK (name ~ '^[a-z_]+$')
);

CREATE INDEX idx_admin_roles_name ON admin_roles(name);
CREATE INDEX idx_admin_roles_active ON admin_roles(deleted_at) WHERE deleted_at IS NULL;

-- 2. Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_resource CHECK (resource IN (
    'users', 'dive_sites', 'shuttles', 'profiles',
    'reviews', 'audit_logs', 'admin_users', 'reports'
  )),
  CONSTRAINT valid_action CHECK (action IN (
    'view', 'create', 'update', 'delete', 'approve', 'export'
  ))
);

CREATE INDEX idx_admin_permissions_name ON admin_permissions(name);
CREATE INDEX idx_admin_permissions_resource ON admin_permissions(resource);

-- 3. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- 4. Enable RLS on admin tables
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view admin roles and permissions (needed for UI)
CREATE POLICY "view_admin_roles"
  ON admin_roles FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "view_admin_permissions"
  ON admin_permissions FOR SELECT
  USING (true);

CREATE POLICY "view_role_permissions"
  ON role_permissions FOR SELECT
  USING (true);

-- RLS Policies for modification (restricted to super_admin, handled in app layer)
CREATE POLICY "prevent_roles_modification_for_non_super_admin"
  ON admin_roles FOR UPDATE
  USING (false);

CREATE POLICY "prevent_roles_deletion_for_non_super_admin"
  ON admin_roles FOR DELETE
  USING (false);

-- Seed predefined system roles
INSERT INTO admin_roles (name, display_name_en, display_name_he, description, is_system, priority) VALUES
  ('super_admin', 'Super Administrator', 'מנהל עליון', 'Full system access', true, 1),
  ('site_manager', 'Dive Site Manager', 'מנהל אתרי צלילה', 'Manage dive sites and content', true, 10),
  ('shuttle_manager', 'Shuttle Manager', 'מנהל הסעות', 'Manage shuttles and bookings', true, 20),
  ('user_admin', 'User Administrator', 'מנהל משתמשים', 'Manage user accounts and profiles', true, 30),
  ('content_moderator', 'Content Moderator', 'מנהל תוכן', 'Approve and moderate content', true, 40),
  ('auditor', 'Auditor', 'מבקר', 'Read-only access and audit reports', true, 100),
  ('viewer', 'Viewer', 'צופה', 'Limited read-only access', true, 150)
ON CONFLICT (name) DO NOTHING;

-- Seed core permissions
INSERT INTO admin_permissions (name, resource, action, description) VALUES
  -- User permissions
  ('users_view', 'users', 'view', 'View user accounts and profiles'),
  ('users_update', 'users', 'update', 'Update user information'),
  ('users_delete', 'users', 'delete', 'Delete or deactivate user accounts'),

  -- Dive Site permissions
  ('dive_sites_view', 'dive_sites', 'view', 'View all dive sites'),
  ('dive_sites_create', 'dive_sites', 'create', 'Create new dive sites'),
  ('dive_sites_update', 'dive_sites', 'update', 'Update dive site information'),
  ('dive_sites_delete', 'dive_sites', 'delete', 'Delete dive sites'),
  ('dive_sites_approve', 'dive_sites', 'approve', 'Approve pending dive sites'),

  -- Shuttle permissions
  ('shuttles_view', 'shuttles', 'view', 'View shuttles and schedules'),
  ('shuttles_create', 'shuttles', 'create', 'Create new shuttles'),
  ('shuttles_update', 'shuttles', 'update', 'Update shuttle information'),
  ('shuttles_delete', 'shuttles', 'delete', 'Delete shuttles'),

  -- Profile permissions
  ('profiles_view', 'profiles', 'view', 'View user profiles'),
  ('profiles_update', 'profiles', 'update', 'Update user profiles'),

  -- Review/Content permissions
  ('reviews_approve', 'reviews', 'approve', 'Approve user reviews'),

  -- Audit permissions
  ('audit_logs_view', 'audit_logs', 'view', 'View audit logs'),
  ('audit_logs_export', 'audit_logs', 'export', 'Export audit logs'),

  -- Admin user permissions
  ('admin_users_view', 'admin_users', 'view', 'View admin users'),
  ('admin_users_create', 'admin_users', 'create', 'Create admin users'),
  ('admin_users_update', 'admin_users', 'update', 'Update admin users'),

  -- Report permissions
  ('reports_view', 'reports', 'view', 'View reports'),
  ('reports_export', 'reports', 'export', 'Export reports')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Super Admin: All permissions
WITH all_perms AS (
  SELECT id FROM admin_permissions
),
super_admin_role AS (
  SELECT id FROM admin_roles WHERE name = 'super_admin'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT super_admin_role.id, all_perms.id
FROM all_perms, super_admin_role
ON CONFLICT DO NOTHING;

-- Site Manager: Dive sites + view users
WITH site_perms AS (
  SELECT id FROM admin_permissions
  WHERE resource = 'dive_sites'
  OR (resource = 'users' AND action = 'view')
  OR (resource = 'profiles' AND action IN ('view', 'update'))
),
site_manager_role AS (
  SELECT id FROM admin_roles WHERE name = 'site_manager'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT site_manager_role.id, site_perms.id
FROM site_perms, site_manager_role
ON CONFLICT DO NOTHING;

-- Shuttle Manager: Shuttles + bookings
WITH shuttle_perms AS (
  SELECT id FROM admin_permissions
  WHERE resource IN ('shuttles')
  OR (resource = 'users' AND action = 'view')
),
shuttle_manager_role AS (
  SELECT id FROM admin_roles WHERE name = 'shuttle_manager'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT shuttle_manager_role.id, shuttle_perms.id
FROM shuttle_perms, shuttle_manager_role
ON CONFLICT DO NOTHING;

-- User Admin: User management
WITH user_perms AS (
  SELECT id FROM admin_permissions
  WHERE resource IN ('users', 'profiles')
),
user_admin_role AS (
  SELECT id FROM admin_roles WHERE name = 'user_admin'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_admin_role.id, user_perms.id
FROM user_perms, user_admin_role
ON CONFLICT DO NOTHING;

-- Content Moderator: Approve content
WITH mod_perms AS (
  SELECT id FROM admin_permissions
  WHERE action = 'approve'
  OR (resource = 'dive_sites' AND action = 'view')
  OR (resource = 'profiles' AND action = 'view')
),
moderator_role AS (
  SELECT id FROM admin_roles WHERE name = 'content_moderator'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT moderator_role.id, mod_perms.id
FROM mod_perms, moderator_role
ON CONFLICT DO NOTHING;

-- Auditor: Read-only + export
WITH audit_perms AS (
  SELECT id FROM admin_permissions
  WHERE action IN ('view', 'export')
),
auditor_role AS (
  SELECT id FROM admin_roles WHERE name = 'auditor'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT auditor_role.id, audit_perms.id
FROM audit_perms, auditor_role
ON CONFLICT DO NOTHING;

-- Viewer: Limited read-only
WITH viewer_perms AS (
  SELECT id FROM admin_permissions
  WHERE resource IN ('dive_sites', 'profiles')
  AND action = 'view'
),
viewer_role AS (
  SELECT id FROM admin_roles WHERE name = 'viewer'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT viewer_role.id, viewer_perms.id
FROM viewer_perms, viewer_role
ON CONFLICT DO NOTHING;
