# Email Verification System - DIVE DROP

Professional bilingual (English/Hebrew) email verification system with Resend integration.

## Features

✅ **Bilingual Support** - English and Hebrew email templates  
✅ **Professional Design** - Modern, responsive HTML emails with DIVE DROP branding  
✅ **Secure Token Management** - 32-character cryptographic tokens with 24-hour expiry  
✅ **Email Verification Flow** - Send verification → Verify token → Send welcome email  
✅ **Database Tracking** - Log all email activity for compliance and debugging  
✅ **Automatic Cleanup** - Periodic cron job to clean expired tokens  
✅ **Type-Safe** - Full TypeScript support with comprehensive types  

## Architecture

```
src/lib/email/
├── templates.ts        # HTML email template generator (EN/HE)
├── service.ts          # Email sending logic with Resend
├── tokens.ts           # Token generation, validation, expiry
├── migrations.sql      # Database schema setup
└── README.md          # This file

src/app/api/auth/
├── send-verification-email/route.ts  # POST endpoint to send verification email
├── verify-email/route.ts              # POST/GET endpoints to verify token
└── ...

src/app/api/cron/
└── cleanup-verification-tokens/route.ts  # Daily cleanup job
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install resend
```

### 2. Environment Variables

Add these to your `.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@divedrop.com

# App URLs
NEXT_PUBLIC_APP_URL=https://divedrop.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cron Jobs
CRON_SECRET=your-secure-cron-secret
```

### 3. Resend Setup

1. Sign up at https://resend.com
2. Create an API key
3. Verify your sending domain
4. Add the API key to environment variables

### 4. Database Setup

Run the migration SQL in Supabase:

```sql
-- Navigate to: SQL Editor → New Query
-- Copy content from src/lib/email/migrations.sql
```

This creates:
- `email_verification_tokens` table
- `email_logs` table (optional)
- Updates to `users` table
- RLS policies
- Cleanup functions

## API Endpoints

### Send Verification Email

**POST** `/api/auth/send-verification-email`

Request:
```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "userName": "John Doe",
  "locale": "en"  // or "he"
}
```

Response:
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "messageId": "resend-message-id",
  "expiresAt": "2024-12-21T10:00:00Z"
}
```

### Verify Email Token

**POST** `/api/auth/verify-email`

Request:
```json
{
  "token": "verification-token",
  "email": "user@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "userId": "user-uuid",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John"
  }
}
```

**GET** `/api/auth/verify-email?token=TOKEN&email=EMAIL`

Handles verification link clicks from email. Redirects with success/error status.

### Cleanup Cron Job

**GET** `/api/cron/cleanup-verification-tokens`

Headers:
```
Authorization: Bearer your-cron-secret
```

Response:
```json
{
  "success": true,
  "message": "Cleanup completed",
  "deletedTokens": 42,
  "timestamp": "2024-12-21T10:00:00Z"
}
```

## Usage Examples

### 1. On User Registration

```typescript
import { sendVerificationEmail } from '@/lib/email/service';
import { createEmailVerificationToken } from '@/lib/email/tokens';

// Create token
const token = await createEmailVerificationToken(
  userId,
  userEmail,
  24 // hours
);

// Send email
const result = await sendVerificationEmail({
  email: userEmail,
  userId,
  userName: firstName,
  locale: userLocale, // 'en' or 'he'
  verificationToken: token.token,
  baseUrl: 'https://divedrop.com'
});
```

### 2. On Email Verification

```typescript
import { verifyEmailToken } from '@/lib/email/tokens';

const verification = await verifyEmailToken(token, email);

if (verification.valid) {
  // Update user.email_verified = true
  // Send welcome email
  // Redirect to dashboard
}
```

### 3. Schedule Cleanup Job

Use a service like Vercel Cron, GitHub Actions, or AWS Lambda:

```bash
# Call daily at 2 AM UTC
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://divedrop.com/api/cron/cleanup-verification-tokens
```

## Email Templates

### Verification Email

**English:**
- Subject: "Verify your DIVE DROP email address"
- Includes verification button
- 24-hour expiry notice
- Professional DIVE DROP branding

**Hebrew:**
- Subject: "אמת את כתובת הדוא"ל של DIVE DROP שלך"
- RTL layout support
- Hebrew content and branding

### Welcome Email

Sent after successful email verification

**English:**
- Subject: "Welcome to DIVE DROP!"
- Personalized greeting
- Call-to-action to explore

**Hebrew:**
- Subject: "ברוכים הבאים ל-DIVE DROP!"
- RTL layout
- Hebrew messaging

## Security Considerations

✅ **Token Generation** - Uses cryptographically secure random tokens  
✅ **Token Expiry** - 24-hour expiry with automatic cleanup  
✅ **One-Time Use** - Tokens marked as verified after use  
✅ **Database RLS** - Row-level security prevents unauthorized access  
✅ **API Validation** - Input validation on all endpoints  
✅ **Secure Links** - Verification links include email to prevent hijacking  

## Database Schema

### email_verification_tokens

```sql
id              UUID           PRIMARY KEY
user_id         UUID           FOREIGN KEY (users)
email           VARCHAR(255)   NOT NULL
token           VARCHAR(255)   UNIQUE NOT NULL
expires_at      TIMESTAMP      NOT NULL
created_at      TIMESTAMP      DEFAULT NOW()
verified_at     TIMESTAMP      NULL
verified        BOOLEAN        DEFAULT FALSE
invalidated     BOOLEAN        DEFAULT FALSE
invalidated_at  TIMESTAMP      NULL
invalidation_reason VARCHAR(100) NULL
```

### email_logs (Optional)

```sql
id              UUID           PRIMARY KEY
user_id         UUID           FOREIGN KEY (users)
email           VARCHAR(255)   NOT NULL
type            VARCHAR(50)    NOT NULL
locale          VARCHAR(10)    (en/he)
message_id      VARCHAR(255)   (Resend ID)
status          VARCHAR(50)    (sent/bounced/opened)
sent_at         TIMESTAMP      DEFAULT NOW()
error_message   TEXT           NULL
```

## Monitoring & Debugging

### View Verification Tokens

```sql
SELECT * FROM email_verification_tokens
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### View Email Logs

```sql
SELECT * FROM email_logs
WHERE user_id = 'user-uuid'
ORDER BY sent_at DESC;
```

### Check Failed Tokens

```sql
SELECT * FROM email_verification_tokens
WHERE verified = FALSE
AND expires_at < NOW()
ORDER BY expires_at DESC;
```

## Troubleshooting

### Emails not sending?

1. Check `RESEND_API_KEY` is valid
2. Verify domain is registered in Resend
3. Check email logs: `SELECT * FROM email_logs WHERE status = 'failed'`

### Token verification failing?

1. Verify token hasn't expired: `expires_at > NOW()`
2. Check token matches: `SELECT * FROM email_verification_tokens WHERE token = 'TOKEN'`
3. Ensure email matches: `email = 'user@example.com'`

### RTL not working?

- Hebrew templates automatically use `dir="rtl"`
- Verify locale is set to 'he'
- Check email client supports dir attribute

## Future Enhancements

- [ ] Email bounce handling
- [ ] Open tracking via Resend webhooks
- [ ] Resend verification link clicks
- [ ] SMS fallback verification
- [ ] Rate limiting on verification requests
- [ ] Custom email templates per brand
- [ ] Email preference management
- [ ] Transactional email analytics dashboard

## Support

For issues or questions:
- Email: support@divedrop.com
- Resend Docs: https://resend.com/docs
- Supabase Docs: https://supabase.com/docs
