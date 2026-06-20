# Bit Payment System - DIVE DROP

A complete, Bit-only payment system for DIVE DROP. This implementation handles all dive booking payments exclusively through Israel's national Bit payment system, eliminating Stripe and credit card dependencies.

## Overview

**Bit (ביט)** is Israel's instant payment system allowing peer-to-peer and business-to-consumer payments via:
- Bit ID (unique identifier)
- Phone number
- ID number

This system is perfect for DIVE DROP because:
- Works exclusively in Israel
- No credit cards needed
- Instant settlement
- Lower fees than Stripe
- Better local adoption

## Architecture

### Components

1. **Bit API Client** (`src/lib/payments/bit.api.ts`)
   - Handles all communication with Bit API
   - Request signing and validation
   - Error handling and retries

2. **Configuration** (`src/lib/payments/bit.config.ts`)
   - Commission structure
   - API settings
   - Webhook configuration
   - Payout schedules

3. **Database Schema** (`supabase/migrations/20260620_create_bit_payment_system.sql`)
   - Bit accounts
   - Payment requests
   - Transactions
   - Refunds and payouts
   - Commission records

4. **API Endpoints**
   - `/api/payments/bit/payment-request` - Create payment request
   - `/api/payments/bit/verify` - Verify payment completion
   - `/api/payments/bit/link-account` - Link service provider account
   - `/api/payments/bit/refund` - Request refund
   - `/api/webhooks/bit/payment` - Webhook handler

5. **Types & Schemas** (`src/lib/payments/bit.schemas.ts`)
   - Zod validation schemas
   - TypeScript types
   - Filter schemas

## Payment Flow

### 1. Diver Creates Booking

```
POST /api/dive-bookings
{
  "service_provider_id": "uuid",
  "dive_date": "2026-06-20T10:00:00Z",
  "amount_cents": 50000  // ₪500
}
```

Booking status: `pending`

### 2. Generate Payment Request

```
POST /api/payments/bit/payment-request
{
  "booking_id": "uuid",
  "amount_cents": 50000
}

Response:
{
  "success": true,
  "payment_request": {
    "request_id": "req_1718863201234_abc123",
    "payment_link": "https://bit.org.il/pay/abc123",
    "short_url": "bit.ly/abc123",
    "qr_code": "data:image/png;base64,...",
    "expires_at": "2026-06-20T10:05:00Z",
    "amount_display": "₪500.00"
  }
}
```

### 3. Diver Pays via Bit

Diver receives:
- Payment link (can share via messaging)
- QR code (scan with Bit app)
- Short URL (copy-paste to browser)

Opens Bit app → Scans QR → Enters amount → Confirms with fingerprint/PIN → Payment sent

### 4. Verify Payment

```
POST /api/payments/bit/verify
{
  "request_id": "req_1718863201234_abc123",
  "booking_id": "uuid"
}

Response (on success):
{
  "success": true,
  "booking": {
    "id": "uuid",
    "status": "confirmed",
    "amount_cents": 50000,
    "amount_display": "₪500.00",
    "transaction_id": "bit_txn_12345"
  },
  "commission": {
    "amount_cents": 4000,
    "amount_display": "₪40.00",
    "rate": "8%"
  },
  "payout": {
    "amount_cents": 46000,
    "amount_display": "₪460.00",
    "schedule": "daily"
  }
}
```

### 5. Webhook Notification (Async)

When payment completes, Bit sends webhook:

```
POST /api/webhooks/bit/payment
{
  "event": "payment.completed",
  "request_id": "req_1718863201234_abc123",
  "booking_id": "uuid",
  "transaction_id": "bit_txn_12345",
  "amount_cents": 50000,
  "payer_identifier": "054-1234567",  // Phone
  "reference_number": "ref_123456",
  "paid_at": "2026-06-20T10:00:30Z"
}
```

### 6. Settlement & Payout

**Workflow:**
1. Payment received from diver
2. DIVE DROP takes 8% commission → ₪40
3. Service provider nets ₪460
4. Payout scheduled for next business day
5. Webhook confirms payout completion

## Database Tables

### bit_accounts
Stores Bit accounts linked by service providers

```sql
- id (UUID, PK)
- service_provider_id (FK -> users)
- account_type (individual | business | company)
- bit_id (unique identifier)
- bank_code, branch_code, account_number
- is_payout_account (boolean)
- verified_at (timestamp)
```

### bit_payment_requests
Stores payment requests with QR codes and links

```sql
- id (UUID, PK)
- booking_id (FK -> dive_bookings)
- bit_request_id (unique)
- payment_link (URL)
- qr_code (base64 image)
- status (pending | initiated | completed | failed | expired)
- expires_at
- transaction_id (filled when paid)
```

### bit_transactions
Audit log for all transactions

```sql
- id (UUID, PK)
- bit_transaction_id (unique)
- booking_id, service_provider_id, diver_id
- type (payment | refund | payout | commission)
- amount_cents
- status (pending | completed | failed)
- created_at, completed_at
```

### bit_refunds
Tracks refund requests

```sql
- id (UUID, PK)
- bit_refund_id (unique)
- booking_id
- amount_cents
- reason (requested_by_customer | duplicate | etc)
- status (pending | processing | completed | failed)
```

### bit_payouts
Tracks payouts to service providers

```sql
- id (UUID, PK)
- bit_payout_id (unique)
- service_provider_id
- amount_cents
- status (pending | processing | completed | failed)
```

### bit_commission_records
DIVE DROP's earnings

```sql
- id (UUID, PK)
- booking_id
- commission_cents
- gross_amount_cents
- commission_rate (0.08)
- status (pending | collected | failed)
```

## Environment Variables

```bash
# Bit API Configuration
BIT_API_URL=https://api.bit.org.il/v1
BIT_API_KEY=your_api_key
BIT_API_SECRET=your_api_secret
BIT_MERCHANT_ID=your_merchant_id
BIT_BUSINESS_ID=your_business_id
BIT_BUSINESS_NAME=DIVE DROP

# Optional
BIT_DISPUTE_EMAIL=disputes@divedrop.com
BIT_LOG_API_CALLS=false
BIT_LOG_WEBHOOKS=false
LOG_LEVEL=info

# App URLs
NEXT_PUBLIC_APP_URL=https://divedrop.com
```

## API Reference

### Payment Request

```typescript
POST /api/payments/bit/payment-request

Request:
{
  "booking_id": "string (uuid)",
  "amount_cents": "number (100-10000000)"
}

Response (201):
{
  "success": true,
  "payment_request": {
    "request_id": "string",
    "payment_link": "string (url)",
    "short_url": "string (url)",
    "qr_code": "string (base64)",
    "expires_at": "string (iso8601)",
    "amount_cents": "number",
    "amount_display": "string"
  }
}

Errors:
- 400: Invalid parameters
- 401: Unauthorized
- 403: Not your booking
- 404: Booking not found
- 500: Server error
```

### Verify Payment

```typescript
POST /api/payments/bit/verify

Request:
{
  "request_id": "string",
  "booking_id": "string (uuid)"
}

Response (200):
{
  "success": true | false,
  "status": "pending | completed | failed",
  "booking": {
    "id": "uuid",
    "status": "confirmed",
    "amount_cents": "number",
    "amount_display": "string",
    "transaction_id": "string"
  },
  "commission": {
    "amount_cents": "number",
    "amount_display": "string",
    "rate": "8%"
  },
  "payout": {
    "amount_cents": "number",
    "amount_display": "string",
    "schedule": "daily"
  }
}
```

### Link Bit Account

```typescript
POST /api/payments/bit/link-account

Request:
{
  "account_type": "individual | business | company",
  "bit_id": "string",
  "phone_number": "string",
  "display_name": "string",
  "bank_code": "string",
  "branch_code": "string",
  "account_number": "string",
  "account_holder_name": "string",
  "is_payout_account": "boolean"
}

Response (201):
{
  "success": true,
  "message": "Bit account linked successfully",
  "account": {
    "id": "uuid",
    "account_type": "string",
    "bit_id": "string",
    "bit_display_name": "string",
    "bit_status": "pending_verification",
    "is_payout_account": "boolean",
    "created_at": "iso8601"
  }
}
```

### Request Refund

```typescript
POST /api/payments/bit/refund

Request:
{
  "booking_id": "string (uuid)",
  "reason": "requested_by_customer | duplicate | fraudulent | no_show | not_as_described | other",
  "notes": "string (optional)",
  "amount_cents": "number (optional, defaults to full refund)"
}

Response (201):
{
  "success": true,
  "refund": {
    "refund_id": "string",
    "amount_cents": "number",
    "amount_display": "string",
    "status": "pending | processing | completed",
    "reason": "string"
  }
}

Errors:
- 400: Invalid parameters or outside refund window
- 401: Unauthorized
- 403: Cannot refund this booking
- 404: Booking not found
```

## Commission Structure

**Standard:** 8% on all transactions

```
Booking: ₪500
Commission: ₪40 (8%)
Net payout: ₪460
```

**Tiered** (optional future):
- ₪1-₪1,000: 8%
- ₪1,000+: 6%

## Refund Policy

- **Window:** 24 hours after payment
- **Max refund:** 100% of booking amount
- **Reasons:** Cancellation, provider error, dispute resolution, payment failed

When refund is processed:
1. Customer receives full payment back to Bit ID
2. DIVE DROP refunds commission
3. Payout is reversed

## Testing

### Test Bits IDs (Development Only)

```
Individual: 123456789
Business: 999999999
```

### Test Scenario

1. Create booking: `₪500`
2. Generate payment request
3. Mock payment via API (in test mode):
   ```
   POST /api/payments/bit/verify
   {
     "request_id": "req_...",
     "booking_id": "..."
   }
   ```
4. Verify booking status: `confirmed`
5. Check transactions logged
6. Verify commission recorded

## Error Handling

### API Errors

```typescript
class BitApiError extends Error {
  code: string;        // e.g., "INVALID_REQUEST"
  statusCode: number;  // HTTP status
  details: unknown;    // Raw error from Bit
}
```

### Common Errors

```
400: Invalid parameters (schema validation)
401: Missing/invalid signature or auth
403: Insufficient permissions
404: Resource not found
409: Resource already exists
500: Bit API error or server error
```

### Retry Strategy

- Automatic retries for network failures
- Exponential backoff (1s → 2s → 4s)
- Max 3 retries
- Idempotent operations (via request_id)

## Security Considerations

### Data Protection

- **Never store:** Full account numbers or card details
- **Always encrypt:** Bank account info in production
- **Mask display:** Only show last 4 digits

### Request Signing

All requests to Bit API are signed with HMAC-SHA256:

```typescript
const signature = HMAC-SHA256(body, BIT_API_SECRET);
header['X-Signature'] = signature;
```

### Webhook Validation

```typescript
// Verify signature before processing
const valid = validateBitWebhookSignature(body, signature, secret);
```

### Rate Limiting

- 100 requests/second per API key
- 500 burst limit
- Implemented at Bit API level

## Production Checklist

- [ ] Set `BIT_API_KEY`, `BIT_API_SECRET`, `BIT_MERCHANT_ID` env vars
- [ ] Verify SSL certificate validation enabled
- [ ] Set `NODE_ENV=production`
- [ ] Configure webhook endpoint in Bit dashboard
- [ ] Enable request signing
- [ ] Test end-to-end payment flow
- [ ] Set up error monitoring (Sentry, etc)
- [ ] Configure IP whitelist (if supported by Bit)
- [ ] Test refund workflow
- [ ] Verify commission calculations
- [ ] Set up settlement alerts
- [ ] Document internal SLAs

## Monitoring

### Metrics to Track

1. **Payment Metrics**
   - Success rate
   - Average payment time
   - Refund rate
   - Dispute rate

2. **Settlement Metrics**
   - Daily settlement amount
   - Commission collected
   - Payout completion time
   - Failed payouts

3. **System Metrics**
   - API response time
   - Webhook latency
   - Error rate
   - Database query time

### Alerts

- Payment verification timeout (> 5 min)
- Webhook delivery failure
- Payout failure
- Commission calculation error
- Database connection issue

## Future Enhancements

1. **Batch Payouts**
   - Process weekly/monthly
   - Schedule payouts in advance

2. **Dispute Handling**
   - Automated dispute resolution
   - Evidence submission to Bit

3. **Advanced Commission**
   - Tiered rates by provider level
   - Seasonal promotions
   - Loyalty discounts

4. **Invoice Generation**
   - Automated invoices to providers
   - Monthly settlement statements
   - Tax reporting

5. **Multi-Currency**
   - Support USD, EUR (if Bit expands)
   - Exchange rate handling

6. **Analytics Dashboard**
   - Real-time payment stats
   - Settlement reports
   - Commission tracking

## Support & Resources

- **Bit API Docs:** https://www.bit.org.il/
- **Implementation Guide:** See `/src/lib/payments/bit.*.ts`
- **Database Schema:** See `supabase/migrations/20260620_*.sql`
- **API Endpoints:** See `/src/app/api/payments/bit/` and `/src/app/api/webhooks/bit/`

## License

MIT
