# Instructor Verification System - Integration Guide

## Quick Start

### 1. Database Setup

Run the migration in order:
```sql
-- Apply in Supabase SQL editor
-- Order matters!
1. migrations/001_service_provider_tables.sql
2. migrations/002_admin_moderation_tables.sql
3. migrations/003_instructor_verification_system.sql
```

### 2. Configure Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-secret-cron-token
```

### 3. Set Up Storage Bucket

Create a storage bucket in Supabase:
```
Bucket name: instructor-documents
Visibility: Private
Max size: 10 MB per file
```

Add RLS policy to bucket:
```sql
-- Allow authenticated users to upload to their own path
CREATE POLICY "Users can upload credentials"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  bucket_id = 'instructor-documents' AND
  (storage.foldername(name))[1] = 'credentials' OR
  (storage.foldername(name))[1] = 'insurance'
);

-- Allow users to read their own documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'instructor-documents' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow admins full access
CREATE POLICY "Admins can manage all documents"
ON storage.objects
USING (
  (SELECT auth.jwt()->>'role')::text = 'admin' OR
  (SELECT auth.jwt()->'user_metadata'->>'role')::text = 'admin'
);
```

## Component Integration

### 1. Add Instructor Verification Manager to Instructor Dashboard

```tsx
// src/app/[locale]/instructor/dashboard/page.tsx
import { InstructorVerificationManager } from '@/components/instructor/InstructorVerificationManager';

export default function InstructorDashboardPage() {
  const [providerId, setProviderId] = useState(''); // Get from context/auth
  
  return (
    <div>
      <h1>My Profile</h1>
      {providerId && (
        <InstructorVerificationManager providerId={providerId} />
      )}
    </div>
  );
}
```

### 2. Add Admin Panel to Admin Dashboard

```tsx
// src/app/[locale]/admin/verification/page.tsx
import { InstructorVerificationPanel } from '@/components/admin/InstructorVerificationPanel';

export default function AdminVerificationPage() {
  return (
    <div>
      <InstructorVerificationPanel />
    </div>
  );
}
```

### 3. Add Verification Status Check to Booking Page

```tsx
// src/app/[locale]/booking/[instructorId]/page.tsx
import { checkInstructorVerification } from '@/lib/verification';

export default async function BookingPage() {
  const instructorStatus = await checkInstructorVerification(providerId);
  
  if (!instructorStatus?.is_verified) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800">
        This instructor cannot currently accept bookings.
      </div>
    );
  }
  
  return <BookingForm />;
}
```

## Database Permissions Setup

### 1. Create Admin Role (if not exists)

In Supabase, add admin metadata to user:
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'admin@example.com';
```

### 2. Verify RLS Policies

Check policies are applied:
```sql
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE tablename LIKE 'instructor_%'
ORDER BY tablename, policyname;
```

## Cron Job Setup

### Option 1: Vercel Cron

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-insurance-expiry",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Option 2: External Cron Service (n8n, IFTTT, etc.)

Set up HTTP request:
```
POST https://yourdomain.com/api/cron/check-insurance-expiry
Headers:
  Authorization: Bearer YOUR_CRON_SECRET
  Content-Type: application/json
```

### Option 3: GitHub Actions

Create `.github/workflows/check-insurance-expiry.yml`:
```yaml
name: Check Insurance Expiry
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  check-expiry:
    runs-on: ubuntu-latest
    steps:
      - name: Check insurance expiry
        run: |
          curl -X POST ${{ secrets.DEPLOYMENT_URL }}/api/cron/check-insurance-expiry \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

## Testing in Development

### 1. Test Credential Upload

```bash
curl -X POST http://localhost:3000/api/instructor-verification/upload-credential \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "uuid-here",
    "certification_type": "AIDA",
    "certification_number": "AIDA-123456",
    "issuing_organization": "AIDA International",
    "issue_date": "2021-01-01",
    "expiry_date": "2026-12-31",
    "document_type": "pdf"
  }'
```

### 2. Test Verification Status

```bash
curl -X GET "http://localhost:3000/api/instructor-verification/status?provider_id=uuid-here" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Admin Approval

```bash
curl -X POST http://localhost:3000/api/admin/instructor-verification \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "verification_type": "certification",
    "certification_id": "uuid-here",
    "notes": "Verified with AIDA database"
  }'
```

### 4. Test Expiry Cron

```bash
curl -X POST http://localhost:3000/api/cron/check-insurance-expiry \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## UI Customization

### Colors and Badges

The components use Tailwind CSS classes. Customize in your components:

```tsx
// Change verification status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified':
      return 'text-green-600 bg-green-50'; // Edit these
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    // ...
  }
};
```

### Certification Types

Add more certification types:

```tsx
const CERTIFICATION_TYPES = [
  { value: 'AIDA', label: 'AIDA - ...' },
  { value: 'CUSTOM', label: 'My Custom Certification' }, // Add here
  // ...
];
```

## Error Handling

### Common Errors and Fixes

```tsx
// Error: "Certification not found"
// Fix: Verify provider_id belongs to authenticated user

// Error: "Unauthorized"
// Fix: Check Authorization header is valid Bearer token

// Error: "File upload failed"
// Fix: Check file size < 10MB and type is PDF/image

// Error: "Admin access required"
// Fix: Verify user has role: 'admin' in metadata
```

## Monitoring

### Check Verification Logs

```sql
-- View all verification actions
SELECT 
  vl.created_at,
  vl.action_type,
  sp.business_name,
  vl.notes,
  au.email as admin_email
FROM instructor_verification_logs vl
LEFT JOIN service_providers sp ON vl.provider_id = sp.id
LEFT JOIN auth.users au ON vl.admin_user_id = au.id
ORDER BY vl.created_at DESC
LIMIT 100;
```

### Monitor Expiring Insurance

```sql
-- Find insurance expiring soon
SELECT 
  sp.business_name,
  ii.insurance_provider,
  ii.policy_number,
  ii.expiry_date,
  (ii.expiry_date - NOW())::integer / 86400 as days_remaining
FROM instructor_insurance ii
JOIN service_providers sp ON ii.provider_id = sp.id
WHERE ii.is_active = TRUE
AND ii.verification_status = 'approved'
AND ii.expiry_date > NOW()
AND ii.expiry_date <= NOW() + INTERVAL '30 days'
ORDER BY ii.expiry_date ASC;
```

### Verify RLS Policies Working

```sql
-- Test that non-admins can't see other instructors' certs
-- Run as non-admin user
SELECT * FROM instructor_certifications;
-- Should only see own
```

## Performance Optimization

### Indexes Already Added

```sql
-- Certification indexes
CREATE INDEX idx_instructor_certifications_provider_id ON instructor_certifications(provider_id);
CREATE INDEX idx_instructor_certifications_verification_status ON instructor_certifications(verification_status);
CREATE INDEX idx_instructor_certifications_expiry_date ON instructor_certifications(expiry_date);

-- Insurance indexes
CREATE INDEX idx_instructor_insurance_provider_id ON instructor_insurance(provider_id);
CREATE INDEX idx_instructor_insurance_verification_status ON instructor_insurance(verification_status);
CREATE INDEX idx_instructor_insurance_expiry_date ON instructor_insurance(expiry_date);
```

### Query Optimization Tips

1. Always filter by `provider_id` first
2. Use the `instructor_verification_status` view for status checks
3. Paginate large result sets in admin panel
4. Cache verification status in React context for 5 minutes

## API Rate Limiting

Add rate limiting in production:

```tsx
// src/middleware.ts
import { rateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const isAllowed = await rateLimit(ip, {
    interval: 60, // seconds
    uniqueTokenPerInterval: 50, // 50 requests per minute per IP
  });
  
  if (!isAllowed) {
    return new NextResponse('Too many requests', { status: 429 });
  }
}
```

## Backup and Recovery

### Backup Verification Data

```sql
-- Export verification logs for backup
COPY (
  SELECT * FROM instructor_verification_logs
  ORDER BY created_at DESC
) TO PROGRAM 'gzip > /backups/verification_logs_'||NOW()::date||'.csv.gz'
WITH (FORMAT CSV, HEADER);
```

### Recover Rejected Certificate

```sql
-- If a certificate was incorrectly rejected
UPDATE instructor_certifications
SET verification_status = 'pending'
WHERE id = 'cert-id-here';

-- Add recovery note
INSERT INTO instructor_verification_logs (...)
VALUES (..., 'Certificate restored for re-review', ...);
```

## Support and Debugging

### Enable Debug Logging

```tsx
// Add to your verification components
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_VERIFICATION === 'true';

if (DEBUG) {
  console.log('Verification status:', status);
  console.log('Pending items:', pending);
}
```

### Check Supabase Logs

1. Go to Supabase dashboard
2. Navigate to Logs
3. Filter by table name (instructor_certifications, etc.)
4. Check for errors in real-time

### Test RLS Policies

```sql
-- As service role (admin)
SELECT * FROM instructor_certifications;
-- Should see all

-- As specific user
SELECT * FROM instructor_certifications
WHERE provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid());
-- Should only see own
```

## Next Steps

1. ✓ Run database migrations
2. ✓ Set up storage bucket with RLS
3. ✓ Configure environment variables
4. ✓ Integrate components into UI
5. ✓ Set up cron job for expiry checks
6. ✓ Test all flows in development
7. ✓ Deploy to production
8. ✓ Monitor verification logs
9. ✓ Set up email alerts (optional enhancement)
10. ✓ Create instructor onboarding guide

## Support

For issues or questions:
1. Check `VERIFICATION_SYSTEM_DOCS.md` for detailed documentation
2. Review SQL in `migrations/003_instructor_verification_system.sql`
3. Check component source code for implementation details
4. Review API routes in `src/app/api/instructor-verification/`
