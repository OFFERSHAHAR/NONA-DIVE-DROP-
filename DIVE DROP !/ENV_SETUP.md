# Bit Payment System - Environment Setup

## Quick Start

### 1. Get Bit API Credentials

Visit https://www.bit.org.il/ and register for:
- Business account
- API credentials
- Merchant ID

### 2. Environment Variables

Create/update `.env.local`:

```bash
# ============================================================================
# BIT PAYMENT SYSTEM - REQUIRED
# ============================================================================

# Bit API Configuration (get from Bit)
BIT_API_URL=https://api.bit.org.il/v1
BIT_API_KEY=your_api_key_here
BIT_API_SECRET=your_api_secret_here
BIT_MERCHANT_ID=your_merchant_id_here
BIT_BUSINESS_ID=your_business_id_here
BIT_BUSINESS_NAME=DIVE DROP

# ============================================================================
# BIT PAYMENT SYSTEM - OPTIONAL
# ============================================================================

# Dispute Contact
BIT_DISPUTE_EMAIL=disputes@divedrop.com

# Logging
BIT_LOG_API_CALLS=false           # Set to true for debugging
BIT_LOG_WEBHOOKS=false            # Set to true for debugging
LOG_LEVEL=info                    # debug | info | warn | error

# IP Whitelist (comma-separated)
# BIT_IP_WHITELIST=123.45.67.89,98.76.54.32

# ============================================================================
# EXISTING REQUIRED VARIABLES (keep these)
# ============================================================================

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL

# ============================================================================
# DEVELOPMENT ONLY
# ============================================================================

NODE_ENV=development               # or production
```

### 3. Run Database Migration

```bash
# Using Supabase CLI
supabase migration up

# Or push to remote
supabase db push

# Or manually execute SQL file in Supabase dashboard:
# supabase/migrations/20260620_create_bit_payment_system.sql
```

### 4. Verify Setup

```bash
# Check environment variables are set
npm run check-env

# Run tests
npm test

# Test payment endpoints
npm run test:payments
```

## Configuration Details

### BIT_API_KEY & BIT_API_SECRET

Obtained from Bit business portal:
1. Log in to https://business.bit.org.il/
2. Go to Settings → API
3. Create new API credential
4. Copy key and secret
5. Store securely (never commit to git)

### BIT_MERCHANT_ID

Your unique merchant identifier from Bit (usually 5-6 digits or alphanumeric)

### BIT_BUSINESS_ID

Your business registration number:
- For individuals: Israeli ID number
- For companies: Company registration number

### BIT_BUSINESS_NAME

Display name for your business (max 100 chars)

## Testing Configuration

### Development Environment

```bash
NODE_ENV=development
BIT_LOG_API_CALLS=true
BIT_LOG_WEBHOOKS=true
LOG_LEVEL=debug
```

This enables:
- Verbose logging
- API request/response logging
- Webhook event logging
- Full error details

### Production Environment

```bash
NODE_ENV=production
BIT_LOG_API_CALLS=false
BIT_LOG_WEBHOOKS=false
LOG_LEVEL=info
```

This disables:
- Verbose logging
- Request/response logging
- Webhook logging (still tracked in DB)

## Webhook Configuration

### Setup Webhook in Bit Dashboard

1. Log in to https://business.bit.org.il/
2. Settings → Webhooks
3. Add new webhook endpoint:
   - URL: `https://yourdomain.com/api/webhooks/bit/payment`
   - Events: All payment events
   - Retry policy: 3 retries with backoff

### Test Webhook Locally

```bash
# Install ngrok for tunneling
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Update Bit dashboard with ngrok URL:
# https://xxxx-xxxx-xxxx.ngrok.io/api/webhooks/bit/payment

# Now test locally
npm run dev
```

## Database Setup

### 1. Run Migration

```bash
cd "path/to/DIVE DROP"
npx supabase migration up
```

### 2. Verify Tables Created

```bash
# In Supabase dashboard, check these tables exist:
- bit_accounts
- bit_payment_requests
- bit_transactions
- bit_refunds
- bit_payouts
- bit_commission_records
- bit_webhooks_log
- bit_settlements
```

### 3. Enable RLS Policies

Policies are automatically enabled in migration. Verify:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'bit_%';

-- Should show rowsecurity = on for all tables
```

### 4. Test Database Connection

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { data, error } = await supabase
  .from('bit_accounts')
  .select('count')
  .single();

console.log(error ? `Error: ${error}` : `Connected! Tables exist.`);
```

## Security Setup

### 1. Environment Secrets

**Never commit .env.local to git!**

```bash
# Add to .gitignore
.env.local
.env.*.local
```

**Store secrets securely:**
- Use `.env.local` for local development only
- For production, use deployment platform's secret management:
  - Vercel: Settings → Environment Variables
  - Heroku: Settings → Config Vars
  - AWS: Secrets Manager

### 2. Request Signing

All Bit API requests are signed with HMAC-SHA256:

```typescript
import { generateBitSignature } from '@/lib/payments/bit.config';

const payload = JSON.stringify(data);
const signature = generateBitSignature(payload, BIT_API_SECRET);
```

Signature is automatically added to request headers.

### 3. Webhook Signature Validation

All webhooks are validated:

```typescript
import { validateBitWebhookSignature } from '@/lib/payments/bit.config';

const body = await request.text();
const signature = request.headers.get('x-signature')!;

const valid = validateBitWebhookSignature(body, signature, BIT_API_SECRET);
```

Failing signatures are rejected with HTTP 401.

### 4. Database Security

- RLS policies enabled on all Bit tables
- Users can only see their own data
- Sensitive data masked in logs
- Admin functions protected

## Monitoring Setup

### 1. Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 2. Database Monitoring

Supabase built-in monitoring:
- Go to Supabase dashboard
- Monitor → Database
- View query performance and errors

### 3. Webhook Logging

All webhooks are logged in `bit_webhooks_log` table:

```sql
SELECT event_type, status, created_at 
FROM bit_webhooks_log 
ORDER BY received_at DESC 
LIMIT 20;
```

### 4. Transaction Logging

All transactions in `bit_transactions` table:

```sql
SELECT type, status, amount_cents, created_at
FROM bit_transactions
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

## Troubleshooting

### Webhook Not Received

1. **Check URL:** Webhook URL must be publicly accessible
   ```bash
   curl -X POST https://yourdomain.com/api/webhooks/bit/payment \
     -H "Content-Type: application/json" \
     -H "x-signature: test" \
     -d '{"event":"test"}'
   ```

2. **Check Logs:** Monitor `bit_webhooks_log`
   ```sql
   SELECT * FROM bit_webhooks_log 
   ORDER BY received_at DESC LIMIT 5;
   ```

3. **Check Bit Dashboard:** Verify webhook is configured and enabled

### Payment Request Not Creating

1. **Check API Credentials:** Verify BIT_API_KEY and BIT_API_SECRET
   ```bash
   # Test connection
   curl -X GET $BIT_API_URL/status \
     -H "X-Merchant-Id: $BIT_MERCHANT_ID" \
     -H "X-Signature: $(echo '{}' | openssl dgst -sha256 -hmac $BIT_API_SECRET -hex)"
   ```

2. **Check Logs:** Enable BIT_LOG_API_CALLS=true
   ```bash
   grep "Bit API" logs/*.log
   ```

3. **Check Database:** Verify bit_payment_requests table created
   ```sql
   SELECT * FROM bit_payment_requests LIMIT 1;
   ```

### Commission Not Calculating

1. **Verify Function:** Check if function exists
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'calculate_bit_commission';
   ```

2. **Test Calculation:**
   ```sql
   SELECT * FROM calculate_bit_commission(50000, 0.08);
   ```

3. **Check Records:**
   ```sql
   SELECT * FROM bit_commission_records 
   WHERE created_at > now() - interval '24 hours';
   ```

## Performance Optimization

### 1. Database Indexes

Indexes are created automatically in migration:

```sql
CREATE INDEX idx_bit_transactions_booking ON bit_transactions(booking_id);
CREATE INDEX idx_bit_transactions_service_provider ON bit_transactions(service_provider_id);
-- etc
```

### 2. Caching

For frequently accessed data:

```typescript
import { unstable_cache } from 'next/cache';

const getServiceProviderAccount = unstable_cache(
  async (providerId) => {
    return supabase
      .from('bit_accounts')
      .select('*')
      .eq('service_provider_id', providerId)
      .single();
  },
  ['bit-account'],
  { revalidate: 3600 } // 1 hour
);
```

### 3. Connection Pooling

Supabase handles connection pooling automatically.

## Deployment

### Vercel

1. Connect GitHub repository
2. Add environment variables in Settings
3. Deploy

```bash
git push origin main
# Vercel auto-deploys
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Verification Checklist

- [ ] BIT_API_KEY set and valid
- [ ] BIT_API_SECRET set and valid
- [ ] BIT_MERCHANT_ID set
- [ ] Database migration ran successfully
- [ ] All 8 Bit tables created
- [ ] RLS policies enabled
- [ ] Webhook endpoint accessible
- [ ] API endpoints responding
- [ ] Payment request creation works
- [ ] Webhook signature validation works
- [ ] Commission calculation correct
- [ ] Database queries fast (< 200ms)

## Support

If you encounter issues:

1. Check `/src/lib/payments/bit.api.ts` for error handling
2. Enable debug logging: `BIT_LOG_API_CALLS=true`
3. Check webhook logs: `SELECT * FROM bit_webhooks_log`
4. Check transaction logs: `SELECT * FROM bit_transactions`
5. Review error messages in logs
6. Contact Bit support: https://www.bit.org.il/

## Next Steps

After setup:
1. Run tests
2. Create test booking
3. Generate payment request
4. Verify payment completion
5. Check commission recorded
6. Verify payout created
7. Test webhook delivery
8. Monitor production metrics
