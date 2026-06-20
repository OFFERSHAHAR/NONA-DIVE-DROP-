# Email Verification - Quick Reference Card

## 🚀 Quick Start (3 Steps)

### 1️⃣ Add Environment Variables
```bash
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=noreply@divedrop.com
CRON_SECRET=your_secret_here
```

### 2️⃣ Run Database Migration
Copy `src/lib/email/migrations.sql` → Run in Supabase SQL Editor

### 3️⃣ Call API on Signup
```typescript
import { useEmailVerification } from '@/hooks/useEmailVerification';

const { sendVerificationEmail } = useEmailVerification();
await sendVerificationEmail({
  userId: user.id,
  email: user.email,
  userName: user.firstName,
  locale: 'en' // or 'he'
});
```

---

## 📂 File Locations

| Component | Location |
|-----------|----------|
| Email Templates | `src/lib/email/templates.ts` |
| Email Service | `src/lib/email/service.ts` |
| Token Manager | `src/lib/email/tokens.ts` |
| Send Email API | `src/app/api/auth/send-verification-email/route.ts` |
| Verify Email API | `src/app/api/auth/verify-email/route.ts` |
| Cleanup Cron | `src/app/api/cron/cleanup-verification-tokens/route.ts` |
| React Hook | `src/hooks/useEmailVerification.ts` |
| Verify Page | `src/app/[locale]/auth/verify-email/page.tsx` |
| Example Component | `src/components/auth/EmailVerificationExample.tsx` |
| Documentation | `src/lib/email/README.md` |
| Setup Guide | `INTEGRATION_GUIDE.md` |

---

## 🔌 API Endpoints

### Send Verification Email
```bash
POST /api/auth/send-verification-email
Content-Type: application/json

{
  "userId": "user-uuid",
  "email": "user@example.com",
  "userName": "John Doe",
  "locale": "en"
}

# Response
{
  "success": true,
  "message": "Verification email sent successfully",
  "messageId": "resend-msg-id",
  "expiresAt": "2024-12-21T10:00:00Z"
}
```

### Verify Email Token
```bash
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email",
  "email": "user@example.com"
}

# Response
{
  "success": true,
  "message": "Email verified successfully",
  "userId": "user-uuid",
  "user": { "id": "...", "email": "...", "firstName": "..." }
}
```

### Cleanup Cron (Daily)
```bash
GET /api/cron/cleanup-verification-tokens
Authorization: Bearer your-cron-secret

# Response
{
  "success": true,
  "message": "Cleanup completed",
  "deletedTokens": 42,
  "timestamp": "2024-12-21T10:00:00Z"
}
```

---

## 🪝 React Hook Usage

```typescript
import { useEmailVerification } from '@/hooks/useEmailVerification';

export function MyComponent() {
  const {
    loading,
    success,
    error,
    message,
    expiresAt,
    sendVerificationEmail,
    verifyEmail,
    reset
  } = useEmailVerification();

  // Send email
  const handleSendEmail = async () => {
    await sendVerificationEmail({
      userId: 'user-id',
      email: 'user@example.com',
      userName: 'User Name',
      locale: 'en' // or 'he'
    });
  };

  // Verify token
  const handleVerify = async () => {
    await verifyEmail('token-from-email', 'user@example.com');
  };

  return (
    <>
      {loading && <p>Loading...</p>}
      {success && <p>{message}</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
      <button onClick={handleSendEmail}>Send Email</button>
      <button onClick={handleVerify}>Verify Token</button>
      <button onClick={reset}>Reset</button>
    </>
  );
}
```

---

## 🗄️ Database Tables

### email_verification_tokens
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | References users table |
| email | VARCHAR | Email to verify |
| token | VARCHAR | 32-char token |
| expires_at | TIMESTAMP | 24h from creation |
| verified | BOOLEAN | Mark after verification |
| verified_at | TIMESTAMP | When verified |
| invalidated | BOOLEAN | If cancelled |

### email_logs (Optional)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | References users table |
| email | VARCHAR | Recipient email |
| type | VARCHAR | 'verification', 'welcome', etc. |
| locale | VARCHAR | 'en' or 'he' |
| message_id | VARCHAR | Resend API ID |
| status | VARCHAR | 'sent', 'opened', 'bounced' |
| sent_at | TIMESTAMP | When sent |

---

## 📊 SQL Queries

### View pending verifications
```sql
SELECT email, created_at, expires_at 
FROM email_verification_tokens 
WHERE verified = FALSE AND expires_at > NOW();
```

### Check verification success rate
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN verified THEN 1 END) as verified,
  ROUND(100.0 * COUNT(CASE WHEN verified THEN 1 END) / COUNT(*), 2) as success_rate
FROM email_verification_tokens
WHERE created_at > NOW() - INTERVAL 7 DAY;
```

### Find expired tokens
```sql
SELECT COUNT(*) 
FROM email_verification_tokens 
WHERE expires_at < NOW() AND verified = FALSE;
```

### View email activity
```sql
SELECT email, type, locale, status, sent_at 
FROM email_logs 
WHERE user_id = 'user-uuid'
ORDER BY sent_at DESC
LIMIT 10;
```

---

## 🎨 Email Template Languages

### English (EN)
- Subject: "Verify your DIVE DROP email address"
- Layout: LTR (left-to-right)
- Greeting: "Hello [Name]"

### Hebrew (HE)
- Subject: "אמת את כתובת הדוא"ל של DIVE DROP שלך"
- Layout: RTL (right-to-left)
- Greeting: "שלום [שם]"

Both templates include:
- DIVE DROP branding
- 24-hour expiry notice
- Security warnings
- Support contact
- Footer links

---

## 🔐 Security Checklist

- ✅ Tokens are cryptographically random
- ✅ Tokens expire after 24 hours
- ✅ Tokens are one-time use
- ✅ Tokens bound to specific email
- ✅ Database uses RLS policies
- ✅ Input validation on all APIs
- ✅ No sensitive data in logs
- ✅ Cron secret required for cleanup

---

## ⚡ Environment Variables

```bash
# Required - Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@divedrop.com

# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required - App
NEXT_PUBLIC_APP_URL=https://divedrop.com

# Optional - Cron jobs
CRON_SECRET=your-secure-random-key
```

---

## 📱 Email Verification Flow

```
User Registration
    ↓
Create user in database
    ↓
Generate random token (32 chars)
    ↓
Store token with 24h expiry
    ↓
Send email with token link
    ↓
User clicks link or visits verification page
    ↓
Validate token (not expired, matches email)
    ↓
Mark token as verified
    ↓
Update users.email_verified = true
    ↓
Send welcome email
    ↓
Redirect to dashboard
```

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Module not found: resend | `npm install resend` |
| RESEND_API_KEY not defined | Add to `.env.local` |
| Table not found | Run `migrations.sql` in Supabase |
| Emails not sending | Check Resend API key & domain verification |
| Token won't verify | Check token matches exactly, hasn't expired |
| RTL not working | Verify locale is 'he' |
| Emails go to spam | Add domain to SPF/DKIM in Resend |

---

## 📞 Support

- **Resend Docs:** https://resend.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Full Guide:** See `INTEGRATION_GUIDE.md`
- **Email Support:** support@divedrop.com

---

## ✨ Features Summary

✅ Bilingual (English & Hebrew)  
✅ Professional design  
✅ Secure token management  
✅ 24-hour expiry  
✅ One-time use  
✅ Database tracking  
✅ Automatic cleanup  
✅ React hook integration  
✅ Type-safe (TypeScript)  
✅ Zero dependencies (Resend only)  
✅ Production-ready  
✅ Fully documented  

---

**Status: READY TO DEPLOY** ✅
