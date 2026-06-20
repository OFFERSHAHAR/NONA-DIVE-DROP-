# Email Verification System Integration Guide

Complete guide to integrating the bilingual email verification system into your signup flow.

## Quick Start (5 minutes)

### 1. Environment Setup

Add to `.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@divedrop.com

# App URLs
NEXT_PUBLIC_APP_URL=https://divedrop.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cron Jobs
CRON_SECRET=your-secure-random-key
```

### 2. Database Setup

Run this SQL in Supabase SQL Editor:

```sql
-- Copy from src/lib/email/migrations.sql and run in Supabase
```

### 3. Install Package

```bash
npm install resend
```

That's it! You're ready to integrate.

---

## Integration Points

### A. Registration Form Integration

**File:** `src/app/[locale]/auth/register/page.tsx`

```typescript
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations();
  const { sendVerificationEmail, loading, error } = useEmailVerification();

  const handleRegisterSuccess = async (userData: {
    id: string;
    email: string;
    firstName: string;
    locale: 'en' | 'he';
  }) => {
    // After user is created in Supabase, send verification email
    const success = await sendVerificationEmail({
      userId: userData.id,
      email: userData.email,
      userName: userData.firstName,
      locale: userData.locale,
    });

    if (success) {
      // Redirect to verification page
      router.push(`/${userData.locale}/auth/verify-email?email=${userData.email}`);
    }
  };

  return (
    // Your registration form JSX
    <>
      {error && <div className="text-red-600">{error}</div>}
      {/* Form fields */}
    </>
  );
}
```

### B. Signup API Route Integration

**File:** `src/app/api/auth/register/route.ts`

```typescript
import { sendVerificationEmail } from '@/lib/email/service';
import { createEmailVerificationToken } from '@/lib/email/tokens';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, locale } = body;

    // 1. Create user in Supabase
    const { data: user, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // 2. Create email verification token
    const token = await createEmailVerificationToken(user.user.id, email);
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to create verification token' },
        { status: 500 }
      );
    }

    // 3. Send verification email
    const emailResult = await sendVerificationEmail({
      email,
      userId: user.user.id,
      userName: firstName,
      locale,
      verificationToken: token.token,
      baseUrl: request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Verification email sent.',
      user: { id: user.user.id, email },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
```

### C. Profile Page Update Email

**File:** `src/app/[locale]/profile/page.tsx`

```typescript
import { useEmailVerification } from '@/hooks/useEmailVerification';

export default function ProfilePage() {
  const { sendVerificationEmail } = useEmailVerification();

  const handleEmailChange = async (newEmail: string) => {
    // Send new verification email
    await sendVerificationEmail({
      userId: user.id,
      email: newEmail,
      userName: user.firstName,
      locale: locale as 'en' | 'he',
    });

    // Show: "Verification email sent to newEmail"
  };

  return (
    // Profile form
  );
}
```

---

## Email Verification Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ 1. User Fills Registration Form                      │
│    - Email, Password, Name                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. POST /api/auth/register                          │
│    - Create user in Supabase                         │
│    - Get user ID                                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Create Verification Token                         │
│    - generateRandomToken()                           │
│    - Store in email_verification_tokens table        │
│    - Set 24-hour expiry                             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Send Verification Email (via Resend)             │
│    - Get bilingual HTML template                     │
│    - Include verification link with token & email   │
│    - Send to user                                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Redirect to Verification Page                     │
│    - /auth/verify-email?email=user@example.com      │
│    - Show "Check your email" message                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. User Clicks Verification Link in Email            │
│    - GET /api/auth/verify-email?token=X&email=Y    │
│    - Or Resend link input manually                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 7. Verify Token & Email                             │
│    - Check token exists                             │
│    - Check token hasn't expired                     │
│    - Check token matches email                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 8. Mark Verified & Update User                       │
│    - Mark token as verified                         │
│    - Update users.email_verified = true             │
│    - Update users.email_verified_at = NOW()         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 9. Send Welcome Email                                │
│    - Get bilingual welcome template                 │
│    - Send to verified email                         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 10. Redirect to Dashboard                            │
│     - /dashboard                                    │
│     - User can now explore                          │
└─────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Manual Testing

- [ ] Sign up with English locale (en)
- [ ] Sign up with Hebrew locale (he)
- [ ] Verify email via link
- [ ] Check Resend dashboard for sent emails
- [ ] Check database for token records
- [ ] Test with expired token
- [ ] Test with invalid token
- [ ] Verify user.email_verified is true after verification
- [ ] Receive welcome email after verification

### Test Cases

```typescript
// Test 1: Send verification email
POST /api/auth/send-verification-email
{
  "userId": "123",
  "email": "test@example.com",
  "userName": "Test User",
  "locale": "en"
}
// Expected: 200, success: true, expiresAt: valid date

// Test 2: Verify valid token
POST /api/auth/verify-email
{
  "token": "valid-token-from-db",
  "email": "test@example.com"
}
// Expected: 200, success: true, userId: "123"

// Test 3: Verify expired token
POST /api/auth/verify-email
{
  "token": "expired-token",
  "email": "test@example.com"
}
// Expected: 410, success: false, expired: true

// Test 4: Verify invalid token
POST /api/auth/verify-email
{
  "token": "invalid-token",
  "email": "test@example.com"
}
// Expected: 401, success: false
```

---

## Database Health Checks

### View all pending verifications

```sql
SELECT 
  user_id,
  email,
  created_at,
  expires_at,
  CURRENT_TIMESTAMP AT TIME ZONE 'UTC' as now,
  EXTRACT(HOUR FROM (expires_at - CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) as hours_left
FROM email_verification_tokens
WHERE verified = FALSE
AND invalidated = FALSE
ORDER BY created_at DESC;
```

### Check for expired tokens

```sql
SELECT COUNT(*) as expired_count
FROM email_verification_tokens
WHERE expires_at < CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
AND verified = FALSE;
```

### View email activity by user

```sql
SELECT 
  el.email,
  el.type,
  el.locale,
  el.status,
  el.sent_at
FROM email_logs el
WHERE el.user_id = 'user-uuid'
ORDER BY el.sent_at DESC
LIMIT 10;
```

---

## Monitoring & Alerts

### What to monitor

1. **Email Delivery Rate**
   - Track success vs. failed sends
   - Query: `SELECT status, COUNT(*) FROM email_logs GROUP BY status;`

2. **Verification Rate**
   - Percentage of emails that result in verification
   - Query: `SELECT COUNT(DISTINCT user_id) FROM email_verification_tokens WHERE verified = TRUE;`

3. **Token Expiry Rate**
   - Users who don't verify within 24 hours
   - Query: `SELECT COUNT(*) FROM email_verification_tokens WHERE verified = FALSE AND expires_at < NOW();`

4. **Resend API Status**
   - Check Resend status page: https://status.resend.com
   - Monitor API key quota

---

## Troubleshooting

### Issue: Emails not arriving

**Diagnosis:**
```sql
SELECT * FROM email_logs WHERE status = 'failed' ORDER BY sent_at DESC LIMIT 5;
```

**Solutions:**
1. Verify RESEND_API_KEY is correct
2. Check domain verification in Resend dashboard
3. Check user's spam folder
4. View Resend logs: https://app.resend.com/emails

### Issue: Token verification failing

**Diagnosis:**
```sql
SELECT token, email, expires_at, verified, CURRENT_TIMESTAMP
FROM email_verification_tokens
WHERE email = 'user@example.com'
ORDER BY created_at DESC LIMIT 1;
```

**Solutions:**
1. Check token hasn't expired: `expires_at > NOW()`
2. Check token matches request
3. Check email matches exactly
4. Look for typos in token

### Issue: User marked verified but didn't receive welcome email

**Solution:**
Manually resend welcome email:
```typescript
import { sendWelcomeEmail } from '@/lib/email/service';

await sendWelcomeEmail({
  email: 'user@example.com',
  userId: 'user-id',
  userName: 'User Name',
  locale: 'en'
});
```

---

## Production Checklist

Before going live:

- [ ] RESEND_API_KEY is set and valid
- [ ] RESEND_FROM_EMAIL is verified in Resend
- [ ] NEXT_PUBLIC_APP_URL points to production domain
- [ ] Database migrations applied to production
- [ ] Cron job scheduled for daily cleanup
  ```bash
  # Call daily at 2 AM UTC
  0 2 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://divedrop.com/api/cron/cleanup-verification-tokens
  ```
- [ ] Email templates tested in production domain
- [ ] Verification link generates correct production URLs
- [ ] Monitor email delivery rates
- [ ] Set up error alerting for failed sends
- [ ] Document support process for "didn't receive email" requests

---

## Advanced Features

### Custom Email Templates

Edit `src/lib/email/templates.ts` to customize:
- Colors (COLORS object)
- Branding (logo, tagline)
- Copy (CONTENT object)
- Layout

### Email Tracking

Add Resend webhook to track opens/clicks:

```typescript
// src/app/api/webhooks/resend/route.ts
export async function POST(request: NextRequest) {
  const event = await request.json();
  
  if (event.type === 'email.opened') {
    // Update email_logs with opened status
  }
  if (event.type === 'email.clicked') {
    // Update email_logs with clicked status
  }
}
```

### Rate Limiting

Add rate limiting to prevent abuse:

```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
});

export async function POST(request: NextRequest) {
  const { success } = await ratelimit.limit(request.ip || 'unknown');
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  // ...
}
```

---

## Support & Help

- **Resend Docs:** https://resend.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Email Preview:** https://resend.com/emails
- **Community Forum:** https://github.com/resend/resend/discussions
