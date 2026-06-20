-- Instructor Credential & Insurance Verification System

-- ============================================================================
-- INSTRUCTOR CERTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Certification Details
  certification_type VARCHAR(100) NOT NULL CHECK (certification_type IN (
    'AIDA',
    'IANTD',
    'PADI',
    'SSI',
    'CMAS',
    'AACR',
    'OTHER'
  )),
  certification_number VARCHAR(100) NOT NULL,
  issuing_organization VARCHAR(200),

  -- Dates
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,

  -- Verification Status
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN (
    'pending',
    'approved',
    'rejected',
    'expired',
    'revoked'
  )),

  -- Documents
  document_url VARCHAR(2048),
  document_type VARCHAR(50) CHECK (document_type IN ('image', 'pdf')),

  -- Verification Details
  verified_by_admin_id UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(provider_id, certification_type, certification_number)
);

CREATE INDEX idx_instructor_certifications_provider_id
  ON instructor_certifications(provider_id);
CREATE INDEX idx_instructor_certifications_verification_status
  ON instructor_certifications(verification_status);
CREATE INDEX idx_instructor_certifications_expiry_date
  ON instructor_certifications(expiry_date);
CREATE INDEX idx_instructor_certifications_certification_type
  ON instructor_certifications(certification_type);

-- ============================================================================
-- INSTRUCTOR INSURANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_insurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Insurance Details
  insurance_provider VARCHAR(200) NOT NULL,
  policy_number VARCHAR(100) NOT NULL,
  coverage_type VARCHAR(100),
  coverage_amount_shekel DECIMAL(12, 2),

  -- Dates
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,

  -- Verification Status
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN (
    'pending',
    'approved',
    'rejected',
    'expired',
    'revoked'
  )),
  is_active BOOLEAN DEFAULT TRUE,

  -- Documents
  document_url VARCHAR(2048),
  document_type VARCHAR(50) CHECK (document_type IN ('image', 'pdf')),

  -- Verification Details
  verified_by_admin_id UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Alerts
  expiry_alert_sent BOOLEAN DEFAULT FALSE,
  expiry_alert_sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(provider_id, policy_number)
);

CREATE INDEX idx_instructor_insurance_provider_id
  ON instructor_insurance(provider_id);
CREATE INDEX idx_instructor_insurance_verification_status
  ON instructor_insurance(verification_status);
CREATE INDEX idx_instructor_insurance_expiry_date
  ON instructor_insurance(expiry_date);
CREATE INDEX idx_instructor_insurance_is_active
  ON instructor_insurance(is_active);

-- ============================================================================
-- VERIFICATION LOGS (AUDIT TRAIL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,

  -- Action Details
  action_type VARCHAR(100) NOT NULL CHECK (action_type IN (
    'certification_uploaded',
    'certification_approved',
    'certification_rejected',
    'certification_revoked',
    'certification_expired',
    'insurance_uploaded',
    'insurance_approved',
    'insurance_rejected',
    'insurance_revoked',
    'insurance_expired',
    'document_reviewed',
    'instructor_status_changed'
  )),

  -- References
  certification_id UUID REFERENCES instructor_certifications(id) ON DELETE SET NULL,
  insurance_id UUID REFERENCES instructor_insurance(id) ON DELETE SET NULL,

  -- Performed By
  admin_user_id UUID REFERENCES auth.users(id),

  -- Details
  notes TEXT,
  metadata JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45)
);

CREATE INDEX idx_verification_logs_provider_id
  ON instructor_verification_logs(provider_id);
CREATE INDEX idx_verification_logs_action_type
  ON instructor_verification_logs(action_type);
CREATE INDEX idx_verification_logs_admin_user_id
  ON instructor_verification_logs(admin_user_id);
CREATE INDEX idx_verification_logs_created_at
  ON instructor_verification_logs(created_at DESC);

-- ============================================================================
-- INSTRUCTOR VERIFICATION STATUS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW instructor_verification_status AS
SELECT
  sp.id as provider_id,
  sp.user_id,
  sp.business_name,
  sp.status as provider_status,

  -- Certifications Summary
  (SELECT COUNT(*) FROM instructor_certifications
   WHERE provider_id = sp.id AND verification_status = 'approved'
   AND expiry_date > NOW()) as active_certifications_count,

  (SELECT COUNT(*) FROM instructor_certifications
   WHERE provider_id = sp.id AND verification_status = 'pending') as pending_certifications_count,

  (SELECT json_agg(json_build_object(
    'id', id,
    'type', certification_type,
    'number', certification_number,
    'status', verification_status,
    'expiry_date', expiry_date
  )) FROM instructor_certifications
   WHERE provider_id = sp.id
   ORDER BY created_at DESC) as certifications,

  -- Insurance Summary
  (SELECT id FROM instructor_insurance
   WHERE provider_id = sp.id
   AND verification_status = 'approved'
   AND is_active = TRUE
   AND expiry_date > NOW()
   ORDER BY created_at DESC
   LIMIT 1) as active_insurance_id,

  (SELECT expiry_date FROM instructor_insurance
   WHERE provider_id = sp.id
   AND verification_status = 'approved'
   AND is_active = TRUE
   AND expiry_date > NOW()
   ORDER BY created_at DESC
   LIMIT 1) as insurance_expiry_date,

  (SELECT CASE
    WHEN expiry_date IS NOT NULL THEN (expiry_date - NOW())::integer / 86400
    ELSE NULL
   END FROM instructor_insurance
   WHERE provider_id = sp.id
   AND verification_status = 'approved'
   AND is_active = TRUE
   AND expiry_date > NOW()
   ORDER BY created_at DESC
   LIMIT 1) as days_until_insurance_expiry,

  -- Overall Status
  CASE
    WHEN (SELECT COUNT(*) FROM instructor_certifications
          WHERE provider_id = sp.id
          AND verification_status = 'approved'
          AND expiry_date > NOW()) = 0 THEN 'no_valid_certification'
    WHEN (SELECT COUNT(*) FROM instructor_insurance
          WHERE provider_id = sp.id
          AND verification_status = 'approved'
          AND is_active = TRUE
          AND expiry_date > NOW()) = 0 THEN 'no_valid_insurance'
    WHEN (SELECT COUNT(*) FROM instructor_certifications
          WHERE provider_id = sp.id
          AND verification_status = 'pending') > 0
      OR (SELECT COUNT(*) FROM instructor_insurance
          WHERE provider_id = sp.id
          AND verification_status = 'pending') > 0 THEN 'pending_verification'
    ELSE 'verified'
  END as verification_status,

  sp.created_at
FROM service_providers sp
WHERE sp.provider_type = 'instructor';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE instructor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_verification_logs ENABLE ROW LEVEL SECURITY;

-- Certifications: Instructors can view their own, admins can view all
CREATE POLICY "instructor_view_own_certifications"
  ON instructor_certifications FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    ) OR auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Certifications: Instructors can upload
CREATE POLICY "instructor_upload_certifications"
  ON instructor_certifications FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Certifications: Only admins can approve/reject
CREATE POLICY "admin_verify_certifications"
  ON instructor_certifications FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insurance: Instructors can view their own, admins can view all
CREATE POLICY "instructor_view_own_insurance"
  ON instructor_insurance FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    ) OR auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insurance: Instructors can upload
CREATE POLICY "instructor_upload_insurance"
  ON instructor_insurance FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Insurance: Only admins can approve/reject
CREATE POLICY "admin_verify_insurance"
  ON instructor_insurance FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Verification Logs: Instructors can view their own, admins can view all
CREATE POLICY "view_verification_logs"
  ON instructor_verification_logs FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    ) OR auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Verification Logs: Admins can create logs
CREATE POLICY "admin_create_verification_logs"
  ON instructor_verification_logs FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- FUNCTION TO CHECK INSTRUCTOR VERIFICATION STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_instructor_verification_status(p_provider_id UUID)
RETURNS json AS $$
DECLARE
  v_result json;
  v_has_valid_cert BOOLEAN;
  v_has_valid_insurance BOOLEAN;
  v_cert_count INTEGER;
  v_insurance_data RECORD;
BEGIN
  -- Check for valid certifications
  SELECT EXISTS(
    SELECT 1 FROM instructor_certifications
    WHERE provider_id = p_provider_id
    AND verification_status = 'approved'
    AND expiry_date > NOW()
  ) INTO v_has_valid_cert;

  -- Check for valid insurance
  SELECT id, expiry_date,
    EXTRACT(DAY FROM (expiry_date - NOW())) as days_remaining
  INTO v_insurance_data
  FROM instructor_insurance
  WHERE provider_id = p_provider_id
  AND verification_status = 'approved'
  AND is_active = TRUE
  AND expiry_date > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  v_has_valid_insurance := v_insurance_data.id IS NOT NULL;

  -- Count certifications
  SELECT COUNT(*) INTO v_cert_count
  FROM instructor_certifications
  WHERE provider_id = p_provider_id
  AND verification_status = 'approved'
  AND expiry_date > NOW();

  -- Build result JSON
  v_result := json_build_object(
    'is_verified', v_has_valid_cert AND v_has_valid_insurance,
    'has_valid_certification', v_has_valid_cert,
    'has_valid_insurance', v_has_valid_insurance,
    'active_certifications_count', v_cert_count,
    'insurance_expires_in_days', COALESCE(v_insurance_data.days_remaining::integer, NULL),
    'insurance_expiry_date', COALESCE(v_insurance_data.expiry_date::text, NULL)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION TO SEND EXPIRY ALERTS
-- ============================================================================

CREATE OR REPLACE FUNCTION send_insurance_expiry_alerts()
RETURNS TABLE(insurance_id UUID, provider_id UUID, days_until_expiry INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ii.id,
    ii.provider_id,
    (EXTRACT(DAY FROM (ii.expiry_date - NOW())))::integer
  FROM instructor_insurance ii
  WHERE ii.expiry_date > NOW()
  AND ii.expiry_date <= NOW() + INTERVAL '30 days'
  AND ii.expiry_alert_sent = FALSE
  AND ii.verification_status = 'approved'
  AND ii.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER TO AUTO-UPDATE INSTRUCTOR STATUS BASED ON VERIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_instructor_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update service_providers status based on verification
  IF TG_TABLE_NAME = 'instructor_certifications' THEN
    UPDATE service_providers
    SET status = CASE
      WHEN (SELECT COUNT(*) FROM instructor_certifications
            WHERE provider_id = NEW.provider_id
            AND verification_status = 'approved'
            AND expiry_date > NOW()) > 0
      AND (SELECT COUNT(*) FROM instructor_insurance
           WHERE provider_id = NEW.provider_id
           AND verification_status = 'approved'
           AND is_active = TRUE
           AND expiry_date > NOW()) > 0
      THEN 'approved'
      ELSE 'pending'
    END
    WHERE id = NEW.provider_id AND status = 'pending';
  END IF;

  IF TG_TABLE_NAME = 'instructor_insurance' THEN
    UPDATE service_providers
    SET status = CASE
      WHEN (SELECT COUNT(*) FROM instructor_certifications
            WHERE provider_id = NEW.provider_id
            AND verification_status = 'approved'
            AND expiry_date > NOW()) > 0
      AND (SELECT COUNT(*) FROM instructor_insurance
           WHERE provider_id = NEW.provider_id
           AND verification_status = 'approved'
           AND is_active = TRUE
           AND expiry_date > NOW()) > 0
      THEN 'approved'
      ELSE 'pending'
    END
    WHERE id = NEW.provider_id AND status = 'pending';

    -- Disable instructor if insurance expired
    IF NEW.is_active = FALSE OR NEW.expiry_date <= NOW() THEN
      UPDATE service_providers
      SET status = 'suspended'
      WHERE id = NEW.provider_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_verification_after_cert_change
  AFTER UPDATE ON instructor_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_verification_status();

CREATE TRIGGER update_verification_after_insurance_change
  AFTER UPDATE ON instructor_insurance
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_verification_status();
