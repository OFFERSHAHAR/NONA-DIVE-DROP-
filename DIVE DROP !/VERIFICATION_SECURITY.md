# Instructor Verification System - Security Implementation

## Executive Summary

The Instructor Verification System implements enterprise-grade security for managing Free Diving Instructor certifications and insurance. This document details all security measures implemented.

## 1. Authentication & Authorization

### User Authentication
- **JWT Tokens:** All API endpoints require Bearer token authentication
- **Token Validation:** Each request validates token with Supabase Auth
- **User ID Extraction:** Verified user ID from token to prevent spoofing

```typescript
// Example from API routes
const token = authHeader.substring(7);
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
```

### Role-Based Access Control (RBAC)
- **Admin Role:** User metadata flag `role: 'admin'`
- **Permission Checks:** Every admin endpoint verifies admin status
- **RLS Enforcement:** Database-level Row Level Security prevents unauthorized access

```sql
-- Admin-only policy example
CREATE POLICY "admin_view_moderation_queue"
  ON provider_moderation_queue FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  ));
```

## 2. Data Access Control

### Row Level Security (RLS)

#### Instructor Certifications
- **Instructors:** Can only view their own certifications
- **Admins:** Can view all certifications for verification
- **Upload:** Only instructors can create new certifications
- **Verification:** Only admins can approve/reject

```sql
-- Instructor can view own
CREATE POLICY "instructor_view_own_certifications"
  ON instructor_certifications FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    ) OR auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can verify
CREATE POLICY "admin_verify_certifications"
  ON instructor_certifications FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );
```

#### Insurance Records
- **Instructors:** Can view their own insurance
- **Admins:** Can view all for verification
- **Upload:** Only instructors can submit
- **Activation:** Only admins can approve

#### Verification Logs
- **Instructors:** Can view logs related to their provider
- **Admins:** Can view all logs
- **Create:** Only admins can create new logs
- **Immutable:** Logs cannot be updated or deleted

### Public Data Access
- Public cannot access any verification data
- Verification status only exposed through API endpoints with auth
- Document URLs are signed and expire after 1 hour

## 3. Input Validation & Sanitization

### API Input Validation

#### Certification Upload
```typescript
// Validate required fields
if (!body.provider_id || !body.certification_type || !body.certification_number) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}

// Validate dates
const issueDate = new Date(body.issue_date);
const expiryDate = new Date(body.expiry_date);
if (expiryDate <= issueDate) {
  return error('Expiry must be after issue date');
}
```

#### File Upload Validation
```typescript
export function validateDocument(file: File) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large' };
  }
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }
  return { valid: true };
}
```

### Database Input Constraints
```sql
-- Certificate type whitelist
certification_type VARCHAR(100) NOT NULL CHECK (certification_type IN (
  'AIDA', 'IANTD', 'PADI', 'SSI', 'CMAS', 'AACR', 'OTHER'
))

-- Status whitelist
verification_status VARCHAR(50) DEFAULT 'pending' CHECK (
  verification_status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')
)

-- Amount validation
coverage_amount_shekel DECIMAL(12, 2),
  -- Must validate > 0 in application logic
```

## 4. Document Security

### File Upload Security

#### Secure Storage
- Files stored in Supabase Storage (isolated from database)
- Separate bucket for instructor documents
- Private bucket (not publicly accessible)
- Max file size: 10MB enforced

#### File Type Validation
```typescript
// Only allow safe formats
const allowedTypes = [
  'application/pdf',     // PDF
  'image/jpeg',          // JPEG
  'image/png',           // PNG
  'image/webp'           // WebP
];
```

#### Access Control
```sql
-- RLS on storage bucket
CREATE POLICY "Users can upload credentials"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  bucket_id = 'instructor-documents' AND
  (storage.foldername(name))[1] IN ('credentials', 'insurance')
);

-- Users can only read their own
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'instructor-documents' AND
  auth.uid()::text = (storage.foldername(name))[2]
);
```

#### Signed URLs
- Document URLs are signed and expire
- Only downloadable by authorized users
- Cannot be shared permanently
- Requests tracked in logs

## 5. Audit Logging

### Comprehensive Audit Trail

Every verification action is logged:

```sql
CREATE TABLE instructor_verification_logs (
  id UUID PRIMARY KEY,
  provider_id UUID,
  action_type VARCHAR(100),     -- certification_uploaded, approved, rejected, etc.
  certification_id UUID,        -- Which cert (if applicable)
  insurance_id UUID,            -- Which insurance (if applicable)
  admin_user_id UUID,           -- Who did it
  notes TEXT,                   -- Why
  metadata JSONB,               -- Additional context
  created_at TIMESTAMP,         -- When
  ip_address VARCHAR(45)        -- Where from
);
```

### Audit Actions Logged
- Certificate uploaded
- Certificate approved/rejected
- Certificate revoked
- Insurance uploaded
- Insurance approved/rejected
- Insurance revoked
- Insurance expired (auto)
- Verification status changed
- Admin access

### Log Access Control
- Only admins can view all logs
- Instructors can view logs for their provider
- Logs are append-only (no updates/deletes)
- IP addresses stored for forensics

## 6. Data Integrity

### Immutability
- Verification logs cannot be modified
- Old approvals archived when revoked
- Complete history preserved

### Uniqueness Constraints
```sql
-- Prevent duplicate certifications
UNIQUE(provider_id, certification_type, certification_number)

-- Prevent duplicate insurance
UNIQUE(provider_id, policy_number)
```

### Referential Integrity
```sql
-- Foreign keys ensure consistency
provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE
verified_by_admin_id UUID REFERENCES auth.users(id)
```

## 7. Automation & Safety

### Automatic Status Management
```sql
-- Trigger to auto-update provider status
CREATE TRIGGER update_verification_after_cert_change
  AFTER UPDATE ON instructor_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_verification_status();
```

### Auto-Disable on Expiry
```sql
-- If insurance is revoked, instructor is automatically suspended
IF NEW.is_active = FALSE OR NEW.expiry_date <= NOW() THEN
  UPDATE service_providers SET status = 'suspended'
  WHERE id = NEW.provider_id;
END IF;
```

### 30-Day Alert System
```sql
-- Auto-send alerts before expiry
CREATE OR REPLACE FUNCTION send_insurance_expiry_alerts()
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT ... FROM instructor_insurance ii
  WHERE ii.expiry_date > NOW()
  AND ii.expiry_date <= NOW() + INTERVAL '30 days'
  AND ii.expiry_alert_sent = FALSE;
END;
$$
```

## 8. Rate Limiting

### Per-Endpoint Rate Limits (Recommended Implementation)
```typescript
// Recommended: Add rate limiting middleware
const rateLimitConfig = {
  uploadCertificate: { window: '15m', limit: 10 },
  uploadInsurance: { window: '15m', limit: 10 },
  adminApprove: { window: '1m', limit: 100 },
};
```

### IP-Based Limiting
```typescript
// Track by IP for abuse prevention
const ip = request.headers.get('x-forwarded-for') || 'unknown';
const isAllowed = await rateLimit(ip, { 
  interval: 60, 
  uniqueTokenPerInterval: 50 
});
```

## 9. Error Handling & Information Disclosure

### Safe Error Messages
```typescript
// Don't leak sensitive info
if (providerError || !provider || provider.user_id !== user.id) {
  return NextResponse.json(
    { error: 'Provider not found or unauthorized' }, // Generic
    { status: 403 }
  );
}

// NOT: { error: `Provider ${provider_id} does not belong to user ${user.id}` }
```

### Logging Without Exposure
```typescript
// Log detailed errors server-side
console.error('Error uploading credential:', error);

// Return generic error to client
return NextResponse.json(
  { error: 'Internal server error' },
  { status: 500 }
);
```

## 10. Database Security

### Encryption
- Transit: HTTPS only (enforced by Supabase)
- At Rest: Supabase handles encryption
- Sensitive Fields: No passwords or PII in verification tables

### Access Control
- Supabase managed authentication
- Service role key only used server-side
- Never expose service role key to client

### Backup & Recovery
```sql
-- Immutable audit trail prevents tampering
-- Can verify integrity by checking:
-- 1. All timestamps in order
-- 2. All admin_user_ids are valid
-- 3. All action_types are valid
```

## 11. Compliance Features

### GDPR Compliance
- Users can request their verification data
- Instructors can download their documents
- Deletion of instructor removes cascade
- Audit logs available for proof

### Data Retention
- Verification logs: 7 years (regulatory requirement)
- Rejected certificates: Archived but retained
- Revoked credentials: Retained for audit trail
- Approved certifications: Retained until revoked

### Privacy by Design
- No storing personal details beyond requirements
- Document URLs are temporary (1 hour expiry)
- Verification logs don't include full names
- No tracking of viewing/downloading

## 12. Deployment Security

### Environment Variables
```env
# Never commit these
SUPABASE_SERVICE_ROLE_KEY=sk_...
CRON_SECRET=...

# Safe to commit
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Cron Job Security
```typescript
// Cron endpoint validates secret
const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '');
if (cronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Storage Bucket Policies
- Separate buckets for different document types
- RLS applied at bucket level
- Public access disabled
- Signed URLs with expiration

## 13. Testing Security

### Security Test Checklist
- [ ] Cannot access other instructors' certifications
- [ ] Cannot approve/reject without admin role
- [ ] Cannot upload files > 10MB
- [ ] Cannot upload non-PDF/image files
- [ ] Expired certificates automatically revoke
- [ ] Admin actions create audit logs
- [ ] Revoked instructor cannot accept bookings
- [ ] Logs are immutable
- [ ] IP address is recorded
- [ ] No sensitive data in error messages

### Manual Testing Commands
```bash
# Test unauthorized access
curl -X GET http://localhost:3000/api/instructor-verification/status
# Expected: 401 Unauthorized

# Test with wrong provider
curl -X POST http://localhost:3000/api/instructor-verification/upload-credential \
  -H "Authorization: Bearer TOKEN" \
  -d '{"provider_id": "OTHER_USER_PROVIDER_ID"}'
# Expected: 403 Unauthorized

# Test admin-only endpoint as user
curl -X GET http://localhost:3000/api/admin/instructor-verification
# Expected: 403 Admin access required
```

## 14. Security Monitoring

### Alerts to Set Up
1. **Multiple Failed Logins:** Track suspicious auth attempts
2. **Bulk Document Rejections:** Admin rejecting many documents
3. **Unusual Download Patterns:** Document accessed many times
4. **Data Export Attempts:** Large result sets from logs
5. **Policy Violations:** Access denied logs

### Metrics to Track
```sql
-- Failed verification attempts
SELECT COUNT(*), rejection_reason
FROM instructor_certifications
WHERE verification_status = 'rejected'
GROUP BY rejection_reason;

-- Admin activity
SELECT admin_user_id, action_type, COUNT(*)
FROM instructor_verification_logs
GROUP BY admin_user_id, action_type
ORDER BY COUNT(*) DESC;

-- Failed access attempts
SELECT provider_id, action_type, COUNT(*)
FROM instructor_verification_logs
WHERE action_type LIKE '%error%'
GROUP BY provider_id;
```

## 15. Incident Response

### Suspected Unauthorized Access
1. Review IP addresses in logs
2. Check for bulk approvals by unknown admin
3. Verify document downloads
4. Audit provider status changes
5. Contact affected instructors

### Document Tampering
1. Review document URLs and hashes
2. Check upload timestamps
3. Verify admin who approved
4. Request instructor re-upload
5. Check if used in teaching

### Revocation Procedures
```sql
-- If evidence of fraud:
UPDATE service_providers SET status = 'suspended' WHERE id = 'provider_id';
UPDATE instructor_certifications SET verification_status = 'revoked'
  WHERE provider_id = 'provider_id';
INSERT INTO instructor_verification_logs VALUES (
  ..., 'fraud_detected', 'Security review: possible document fraud'
);
```

## Security Checklist for Deployment

- [ ] All migrations applied in correct order
- [ ] RLS policies created and tested
- [ ] Storage bucket has RLS policies
- [ ] Environment variables set (not in .env.local)
- [ ] Cron job configured with secret
- [ ] Admin users have role metadata set
- [ ] Certificate whitelist matches requirements
- [ ] Insurance expiry alerts configured
- [ ] Audit logging verified working
- [ ] Rate limiting implemented
- [ ] Error messages don't leak info
- [ ] HTTPS enforced in production
- [ ] Backups configured for logs
- [ ] Monitoring alerts set up
- [ ] Security training for admins

## References

- [OWASP Top 10 - API Security](https://owasp.org/www-project-api-security/)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [GDPR Compliance Guide](https://gdpr-info.eu/)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

## Support

For security issues or vulnerabilities:
1. Do NOT post publicly
2. Email security@yourdomain.com
3. Provide details and impact
4. We will acknowledge within 24 hours
