# Instructor Verification System Documentation

## Overview

The Instructor Verification System is a comprehensive security and compliance solution for managing Free Diving Instructor certifications and insurance verification. It ensures that only properly credentialed and insured instructors can teach on the platform.

## Key Features

### 1. Credential Verification
- **Support for Multiple Certifications:**
  - AIDA (International Association for Development of Apnea)
  - IANTD (International Association of Nitrox and Technical Divers)
  - PADI (Professional Association of Diving Instructors)
  - SSI (Scuba Schools International)
  - CMAS (Confédération Mondiale des Activités Subaquatiques)
  - AACR (Association of Canadian Underwater Professionals)
  - Other recognized certifications

- **Document Upload:** PDF and image (JPEG/PNG/WebP) support, up to 10MB
- **Expiry Tracking:** Automatic expiry date monitoring
- **Verification Status:** Pending, Approved, Rejected, Expired, Revoked

### 2. Insurance Verification
- **Proof of Insurance:** Upload insurance documentation
- **Expiry Monitoring:** Automatic tracking of insurance validity
- **Auto-Disable:** Instructors automatically suspended if insurance expires
- **30-Day Alerts:** Notification system for expiring insurance
- **Coverage Tracking:** Store coverage type and amount

### 3. Admin Panel
- **Pending Reviews:** Centralized view of all pending verifications
- **Batch Actions:** Approve/reject multiple verifications
- **Revocation:** Ability to revoke active certifications/insurance with reason
- **Audit Trail:** Complete verification logs with admin actions and timestamps
- **Search & Filter:** Find verifications by instructor, type, or status

### 4. Instructor Dashboard
- **Self-Service Upload:** Easy document upload interface
- **Status Tracking:** Real-time verification status
- **Alert System:** Warnings for expiring documents
- **Document History:** View all uploaded certifications and insurance

## Database Schema

### Tables

#### `instructor_certifications`
Stores instructor certification records
- `id` - UUID primary key
- `provider_id` - FK to service_providers
- `certification_type` - Type of certification (AIDA, IANTD, etc.)
- `certification_number` - Unique certification number
- `issuing_organization` - Organization that issued the cert
- `issue_date` - When the cert was issued
- `expiry_date` - When the cert expires
- `verification_status` - pending, approved, rejected, expired, revoked
- `document_url` - Link to uploaded document
- `verified_by_admin_id` - Admin who verified
- `verified_at` - When verification occurred
- `rejection_reason` - Why it was rejected (if applicable)

#### `instructor_insurance`
Stores instructor insurance records
- `id` - UUID primary key
- `provider_id` - FK to service_providers
- `insurance_provider` - Name of insurance company
- `policy_number` - Insurance policy number
- `coverage_type` - Type of coverage
- `coverage_amount_shekel` - Coverage amount in ILS
- `issue_date` - Policy start date
- `expiry_date` - Policy end date
- `verification_status` - pending, approved, rejected, expired, revoked
- `is_active` - Whether insurance is currently active
- `document_url` - Link to insurance proof
- `expiry_alert_sent` - Whether 30-day alert was sent
- `verified_by_admin_id` - Admin who verified

#### `instructor_verification_logs`
Audit trail for all verification actions
- `id` - UUID primary key
- `provider_id` - Which instructor
- `action_type` - Type of action performed
- `certification_id` - FK to certification (if applicable)
- `insurance_id` - FK to insurance (if applicable)
- `admin_user_id` - Which admin performed action
- `notes` - Reason or details
- `metadata` - Additional JSON data
- `created_at` - Timestamp
- `ip_address` - IP address of actor

#### `instructor_verification_status` (View)
SQL view that provides current verification status
- Shows active certifications
- Shows pending items
- Shows insurance expiry status
- Calculates overall verification status

## API Endpoints

### Instructor Endpoints

#### Upload Certification
```
POST /api/instructor-verification/upload-credential
Headers: Authorization: Bearer <token>
Body: {
  provider_id: string,
  certification_type: string,
  certification_number: string,
  issuing_organization: string,
  issue_date: string (YYYY-MM-DD),
  expiry_date: string (YYYY-MM-DD),
  document_file?: string (base64 encoded),
  document_type: 'image' | 'pdf'
}
```

#### Upload Insurance
```
POST /api/instructor-verification/upload-insurance
Headers: Authorization: Bearer <token>
Body: {
  provider_id: string,
  insurance_provider: string,
  policy_number: string,
  coverage_type?: string,
  coverage_amount_shekel?: number,
  issue_date: string (YYYY-MM-DD),
  expiry_date: string (YYYY-MM-DD),
  document_file?: string (base64 encoded),
  document_type: 'image' | 'pdf'
}
```

#### Get Verification Status
```
GET /api/instructor-verification/status?provider_id=<id>
Headers: Authorization: Bearer <token>

Response: {
  is_verified: boolean,
  verification_status: string,
  summary: {
    active_certifications: number,
    pending_certifications: number,
    has_valid_insurance: boolean,
    insurance_expires_in_days: number | null,
    insurance_expiry_date: string | null
  },
  certifications: Array,
  alerts: {
    expiring_insurance: Array
  }
}
```

### Admin Endpoints

#### List Pending Verifications
```
GET /api/admin/instructor-verification?type=certification|insurance|all
Headers: Authorization: Bearer <token>
Response: {
  total_pending: number,
  pending: {
    certifications: Array,
    insurance: Array
  }
}
```

#### Approve/Reject Verification
```
POST /api/admin/instructor-verification
Headers: Authorization: Bearer <token>
Body: {
  action: 'approve' | 'reject',
  verification_type: 'certification' | 'insurance',
  certification_id?: string,
  insurance_id?: string,
  notes?: string
}
```

#### Revoke Verification
```
POST /api/admin/instructor-verification/revoke
Headers: Authorization: Bearer <token>
Body: {
  verification_type: 'certification' | 'insurance',
  certification_id?: string,
  insurance_id?: string,
  reason: string
}
```

#### Check Expiring Insurance
```
GET /api/admin/insurance-expiry-alerts
Headers: Authorization: Bearer <token>
Response: {
  total: number,
  expiring_soon: Array of insurance records
}
```

### Cron Endpoints

#### Check Insurance Expiry (Automated)
```
POST /api/cron/check-insurance-expiry
Headers: Authorization: Bearer <CRON_SECRET>
Response: {
  success: boolean,
  results: {
    expired_disabled: number,
    alerts_sent: number,
    errors: number
  }
}
```

## Security Features

### Row-Level Security (RLS)
All verification tables have RLS enabled:
- **Instructors:** Can only view/upload their own documents
- **Admins:** Can view all documents and perform verification actions
- **Public:** Cannot access verification data

### Document Security
- **File Validation:** Size limits (10MB), type validation (PDF/images only)
- **Secure Upload:** Files stored in Supabase Storage with signed URLs
- **Access Control:** Only authorized users can access documents

### Audit Logging
Every verification action is logged:
- Who performed the action (admin_user_id)
- What action was performed (action_type)
- When it occurred (created_at)
- IP address of actor
- Additional notes and metadata

### Automatic Status Management
- Instructors automatically suspended if insurance expires
- Triggers update provider status based on verification requirements
- Automatic expiry detection and handling

## Verification Workflow

### Instructor's Journey
1. Upload certification document
2. Document enters "pending" status
3. Admin reviews and approves/rejects
4. If approved, certification is active
5. System monitors expiry date
6. 30 days before expiry, alert is sent
7. If not renewed, certificate expires automatically
8. Instructor cannot teach with expired cert

### Insurance Journey
1. Upload insurance proof
2. Document enters "pending" status
3. Admin reviews and approves/rejects
4. If approved, insurance is active
5. System monitors expiry date continuously
6. 30 days before expiry, alert is sent
7. If insurance expires, instructor is automatically suspended
8. Instructor cannot accept bookings while suspended

## Deployment Configuration

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
CRON_SECRET=<secret-for-cron-jobs>
```

### Database Migrations
Run in order:
1. `001_service_provider_tables.sql` - Base provider tables
2. `002_admin_moderation_tables.sql` - Admin and moderation
3. `003_instructor_verification_system.sql` - Verification tables

### Cron Setup (Vercel)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-insurance-expiry",
    "schedule": "0 2 * * *"
  }]
}
```

Or use external service (e.g., IFTTT, n8n):
```bash
curl -X POST https://yourdomain.com/api/cron/check-insurance-expiry \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Admin Panel Usage

### Accessing the Panel
1. Navigate to `/admin/verification`
2. Ensure user has admin role in metadata
3. View pending certifications and insurance

### Reviewing Documents
1. Click on pending item
2. View document link to verify authenticity
3. Check expiry dates are reasonable
4. Review issuing organization is legitimate

### Approving/Rejecting
1. Select item from list
2. Click "Approve" or "Reject"
3. Add notes for rejection
4. System auto-updates instructor status

### Revoking Credentials
1. Click on approved item
2. Click "Revoke"
3. Enter reason for revocation
4. System suspends instructor if insurance revoked

## Testing

### Test Scenarios
1. **Valid Certification Upload:** Upload valid cert, verify status transitions to pending, then approved
2. **Expired Certificate:** Upload cert with past expiry date, should reject
3. **Insurance Expiry:** Set expiry to 25 days in future, run cron, verify alert sent
4. **Insurance Disabled:** Set expiry to past date, run cron, verify instructor suspended
5. **Admin Revocation:** Approve then revoke cert, verify logs created

### Sample Test Data
```
Certification: AIDA-123456
Organization: AIDA International
Issue: 2021-01-01
Expiry: 2026-12-31

Insurance: ALLIANZ-POL-2024-001
Provider: Allianz Insurance
Issue: 2024-01-01
Expiry: 2025-12-31
Coverage: ₪500,000
```

## Troubleshooting

### Issue: "Certification not found" error
- Verify provider_id belongs to current user
- Check instructor_certifications table has the record

### Issue: Insurance not auto-expiring
- Check cron job is running (check logs)
- Verify CRON_SECRET is correct
- Manually run: `POST /api/cron/check-insurance-expiry`

### Issue: Document upload fails
- Check file size (must be < 10MB)
- Verify file type (PDF or image)
- Check Supabase Storage bucket exists and is accessible

### Issue: Admin can't verify documents
- Verify user has `role: 'admin'` in auth.users metadata
- Check RLS policies are enabled
- Verify admin_view_moderation_queue policy exists

## Compliance Notes

### Data Retention
- Verification logs retained for 7 years (regulatory requirement)
- Rejected certifications archived but not deleted
- Revoked certifications marked and retained for audit trail

### Privacy
- Documents stored in separate bucket from user data
- Signed URLs expire after 1 hour
- No personal data in logs except admin user ID

### Audit Trail
- Every action logged with timestamp and IP
- Admin actions traceable to user account
- Complete history available for compliance reviews

## Future Enhancements

1. **Email Notifications:** Send alerts to instructors when docs expire
2. **Document OCR:** Auto-extract certification numbers from images
3. **Background Checks:** Integration with background check services
4. **Recurring Verification:** Force re-verification every N years
5. **Bulk Import:** Admin interface to bulk upload certifications
6. **Certificate Registry:** Query external databases (AIDA, IANTD, etc.)
