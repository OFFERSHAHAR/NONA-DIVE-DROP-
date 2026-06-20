-- Audit Logs Schema
-- Comprehensive audit trail for admin actions and compliance
-- Created: 2026-06-20

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT DEFAULT '',
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT '',
  status TEXT DEFAULT 'success' NOT NULL,
  error_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'partial'))
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_admin_user ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at_range ON audit_logs(created_at DESC) WHERE status = 'success';

-- 2. Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only auditors and super admins can view logs
CREATE POLICY "auditor_view_logs"
  ON audit_logs FOR SELECT
  USING (
    user_has_admin_role(auth.uid(), 'super_admin')
    OR
    user_has_admin_role(auth.uid(), 'auditor')
  );

-- Only authenticated admins can insert logs
CREATE POLICY "admin_create_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND deleted_at IS NULL
    )
  );

-- Prevent updates and deletes (immutable audit trail)
CREATE POLICY "prevent_log_modification"
  ON audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "prevent_log_deletion"
  ON audit_logs FOR DELETE
  USING (false);

-- 3. Create audit log trigger function
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT '',
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT ''
)
RETURNS void AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- Get current admin user
  SELECT id INTO v_admin_user_id
  FROM admin_users
  WHERE user_id = auth.uid()
  AND is_active = true
  AND deleted_at IS NULL
  LIMIT 1;

  -- Only log if user is an admin
  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO audit_logs (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      status,
      error_message
    ) VALUES (
      v_admin_user_id,
      p_action,
      p_resource_type,
      p_resource_id,
      p_old_values,
      p_new_values,
      p_status,
      p_error_message
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger function for dive_sites changes
CREATE OR REPLACE FUNCTION audit_dive_sites_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Convert old and new records to JSONB
  IF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);

    -- Log update action
    PERFORM log_admin_action(
      'UPDATE',
      'dive_sites',
      NEW.id::TEXT,
      v_old_values,
      v_new_values,
      'success'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dive_sites updates
DROP TRIGGER IF EXISTS audit_dive_sites_changes_trigger ON dive_sites;
CREATE TRIGGER audit_dive_sites_changes_trigger
AFTER UPDATE ON dive_sites
FOR EACH ROW
EXECUTE FUNCTION audit_dive_sites_changes();

-- 5. Trigger function for admin_users changes
CREATE OR REPLACE FUNCTION audit_admin_users_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);

    PERFORM log_admin_action(
      'CREATE',
      'admin_users',
      NEW.id::TEXT,
      NULL,
      v_new_values,
      'success'
    );

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);

    PERFORM log_admin_action(
      'UPDATE',
      'admin_users',
      NEW.id::TEXT,
      v_old_values,
      v_new_values,
      'success'
    );

  ELSIF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);

    PERFORM log_admin_action(
      'DELETE',
      'admin_users',
      OLD.id::TEXT,
      v_old_values,
      NULL,
      'success'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin_users changes
DROP TRIGGER IF EXISTS audit_admin_users_changes_trigger ON admin_users;
CREATE TRIGGER audit_admin_users_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON admin_users
FOR EACH ROW
EXECUTE FUNCTION audit_admin_users_changes();

-- 6. Trigger function for shuttles changes
CREATE OR REPLACE FUNCTION audit_shuttles_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);

    PERFORM log_admin_action(
      'CREATE',
      'shuttles',
      NEW.id::TEXT,
      NULL,
      v_new_values,
      'success'
    );

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);

    PERFORM log_admin_action(
      'UPDATE',
      'shuttles',
      NEW.id::TEXT,
      v_old_values,
      v_new_values,
      'success'
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shuttles changes
DROP TRIGGER IF EXISTS audit_shuttles_changes_trigger ON shuttles;
CREATE TRIGGER audit_shuttles_changes_trigger
AFTER INSERT OR UPDATE ON shuttles
FOR EACH ROW
EXECUTE FUNCTION audit_shuttles_changes();

-- 7. Trigger function for shuttle_bookings changes
CREATE OR REPLACE FUNCTION audit_shuttle_bookings_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);

    PERFORM log_admin_action(
      'CREATE',
      'shuttle_bookings',
      NEW.id::TEXT,
      NULL,
      v_new_values,
      'success'
    );

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);

    PERFORM log_admin_action(
      'UPDATE',
      'shuttle_bookings',
      NEW.id::TEXT,
      v_old_values,
      v_new_values,
      'success'
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shuttle_bookings changes
DROP TRIGGER IF EXISTS audit_shuttle_bookings_changes_trigger ON shuttle_bookings;
CREATE TRIGGER audit_shuttle_bookings_changes_trigger
AFTER INSERT OR UPDATE ON shuttle_bookings
FOR EACH ROW
EXECUTE FUNCTION audit_shuttle_bookings_changes();

-- 8. Helper function to get audit log summary
CREATE OR REPLACE FUNCTION get_audit_summary(
  p_days INT DEFAULT 7,
  p_resource_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  action TEXT,
  resource_type TEXT,
  count BIGINT,
  last_action TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    audit_logs.action,
    audit_logs.resource_type,
    COUNT(*)::BIGINT,
    MAX(audit_logs.created_at)
  FROM audit_logs
  WHERE audit_logs.created_at >= now() - (p_days || ' days')::INTERVAL
  AND (p_resource_type IS NULL OR audit_logs.resource_type = p_resource_type)
  GROUP BY audit_logs.action, audit_logs.resource_type
  ORDER BY MAX(audit_logs.created_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Helper function to get admin activity
CREATE OR REPLACE FUNCTION get_admin_activity(
  p_admin_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    audit_logs.id,
    audit_logs.action,
    audit_logs.resource_type,
    audit_logs.resource_id,
    audit_logs.status,
    audit_logs.created_at
  FROM audit_logs
  WHERE audit_logs.admin_user_id = p_admin_user_id
  ORDER BY audit_logs.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Helper function to get failed actions
CREATE OR REPLACE FUNCTION get_failed_actions(
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  admin_user_id UUID,
  action TEXT,
  resource_type TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    audit_logs.id,
    audit_logs.admin_user_id,
    audit_logs.action,
    audit_logs.resource_type,
    audit_logs.error_message,
    audit_logs.created_at
  FROM audit_logs
  WHERE audit_logs.status IN ('failure', 'partial')
  ORDER BY audit_logs.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all admin actions for compliance and troubleshooting';
COMMENT ON FUNCTION log_admin_action IS 'Log an admin action to the audit trail';
COMMENT ON FUNCTION get_audit_summary IS 'Get summary of audit actions in the last N days';
COMMENT ON FUNCTION get_admin_activity IS 'Get recent activity for a specific admin user';
COMMENT ON FUNCTION get_failed_actions IS 'Get failed or partial admin actions for troubleshooting';
