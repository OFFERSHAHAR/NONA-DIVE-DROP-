-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer')),
  permissions text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  status text CHECK (status IN ('active', 'pending', 'suspended')) DEFAULT 'active',
  
  -- 2FA Fields
  totp_secret text,
  totp_enabled boolean DEFAULT false,
  backup_codes text[],
  
  -- IP Whitelist
  whitelisted_ips text[] DEFAULT ARRAY[]::text[],
  require_ip_whitelist boolean DEFAULT false,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  last_login_at timestamp,
  last_login_ip text,
  login_attempt_count int DEFAULT 0,
  login_attempt_last_at timestamp
);

-- Create admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  device_name text,
  device_type text CHECK (device_type IN ('web', 'mobile')),
  device_fingerprint text,
  ip_address text NOT NULL,
  user_agent text,
  is_trusted boolean DEFAULT false,
  last_activity timestamp DEFAULT now(),
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Create admin_audit_logs table (append-only)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  status text CHECK (status IN ('success', 'failure')) DEFAULT 'success',
  error_message text,
  created_at timestamp DEFAULT now(),
  
  CONSTRAINT meaningful_resource CHECK (
    (resource_type != 'unknown' AND resource_id IS NOT NULL) OR
    resource_type IN ('system', 'auth')
  )
);

-- Create admin_invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  accepted_at timestamp,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Create admin_login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text NOT NULL,
  success boolean NOT NULL,
  reason text,
  created_at timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email);
CREATE INDEX IF NOT EXISTS admin_users_status_idx ON admin_users(status);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_user_id_idx ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_user_id_idx ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS admin_audit_logs_resource_type_idx ON admin_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS admin_invitations_expires_at_idx ON admin_invitations(expires_at);
CREATE INDEX IF NOT EXISTS admin_login_attempts_ip_idx ON admin_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS admin_login_attempts_created_at_idx ON admin_login_attempts(created_at);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY admin_users_super_admin_select
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
      AND au.status = 'active'
    )
  );

CREATE POLICY admin_users_self_select
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY admin_users_super_admin_update
  ON admin_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
      AND au.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
      AND au.status = 'active'
    )
  );

CREATE POLICY admin_users_self_update
  ON admin_users FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (SELECT role FROM admin_users WHERE user_id = auth.uid())
    AND is_active = (SELECT is_active FROM admin_users WHERE user_id = auth.uid())
    AND status = (SELECT status FROM admin_users WHERE user_id = auth.uid())
  );

-- RLS Policies for admin_sessions
CREATE POLICY admin_sessions_self_select
  ON admin_sessions FOR SELECT
  USING (
    admin_user_id IN (
      SELECT id FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY admin_sessions_insert
  ON admin_sessions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for admin_audit_logs (read only)
CREATE POLICY audit_logs_admin_select
  ON admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND status = 'active'
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

CREATE POLICY audit_logs_insert
  ON admin_audit_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for admin_invitations
CREATE POLICY admin_invitations_super_admin_crud
  ON admin_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
      AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
      AND status = 'active'
    )
  );

CREATE POLICY admin_invitations_self_view
  ON admin_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Grant permissions
GRANT SELECT ON admin_users TO authenticated;
GRANT SELECT ON admin_audit_logs TO authenticated;
GRANT SELECT ON admin_sessions TO authenticated;
GRANT INSERT ON admin_sessions TO authenticated;
