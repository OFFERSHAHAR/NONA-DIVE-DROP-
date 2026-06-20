-- Email Verification Tables
-- Create these tables in your Supabase database

-- Email Verification Tokens Table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN DEFAULT FALSE,
  invalidated BOOLEAN DEFAULT FALSE,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  invalidation_reason VARCHAR(100),

  -- Indexes for fast lookups
  CONSTRAINT token_not_expired CHECK (expires_at > created_at),
  INDEX idx_token (token),
  INDEX idx_email (email),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_verified (verified)
);

-- Email Logs Table (optional, for tracking)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'verification', 'welcome', 'password_reset', etc.
  locale VARCHAR(10), -- 'en', 'he'
  message_id VARCHAR(255), -- Resend message ID
  status VARCHAR(50) NOT NULL DEFAULT 'sent', -- 'sent', 'bounced', 'opened', etc.
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_email (email),
  INDEX idx_type (type),
  INDEX idx_sent_at (sent_at),
  INDEX idx_status (status)
);

-- Add email_verified column to users table (if not exists)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on email_verification_tokens
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own tokens
CREATE POLICY "Users can view their own verification tokens"
  ON email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only service role can insert/update
CREATE POLICY "Service role can manage verification tokens"
  ON email_verification_tokens
  USING (auth.role() = 'service_role');

-- Enable RLS on email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
  ON email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can manage email logs
CREATE POLICY "Service role can manage email logs"
  ON email_logs
  USING (auth.role() = 'service_role');

-- Cleanup function for expired tokens (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TABLE(deleted_count INT) AS $$
BEGIN
  DELETE FROM email_verification_tokens
  WHERE expires_at < NOW()
  AND verified = FALSE
  AND invalidated = FALSE;

  RETURN QUERY SELECT COUNT(*)::INT FROM email_verification_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index for faster cleanup
CREATE INDEX IF NOT EXISTS idx_expired_tokens
ON email_verification_tokens(expires_at, verified)
WHERE verified = FALSE AND invalidated = FALSE;
