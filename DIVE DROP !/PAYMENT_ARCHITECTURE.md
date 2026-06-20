# DIVE DROP - Payment & Commission Architecture

## Executive Summary

DIVE DROP operates as a **buddy-matching platform** where divers find each other, then book/pay directly for dives. The platform charges a commission on successful matches/bookings. This document outlines the complete payment system design.

---

## 1. Business Model Overview

### Payment Flow (Current + Proposed)

```
Diver 1 (Buyer)
    ↓
Finds Diver 2 via Buddy Listing
    ↓
Accept Interest → Buddy Connection Established
    ↓
Both divers decide to book a dive together
    ↓
Diver 1 pays for the dive (to service provider)
    ↓
DIVE DROP captures commission
    ↓
Service Provider receives payment (minus commission)
```

### Key Stakeholders

1. **End Users (Divers)**
   - Peer-to-peer buddy matching (no charge)
   - Book dives through platform
   - Pay for dives (either directly to provider or through DIVE DROP escrow)

2. **Service Providers (Dive Shops, Guides, Boat Operators)**
   - Create dive offerings/listings
   - Receive payments from divers
   - Pay commission to DIVE DROP

3. **DIVE DROP**
   - Facilitates matching (free)
   - Processes payments (charged commission)
   - Handles disputes & refunds
   - Manages taxation/reporting

---

## 2. Commission System Design

### Commission Structure

```javascript
COMMISSION_TIERS = {
  beginner_match: {
    rate: 0.08,        // 8% commission
    trigger: 'booking', // Charged when booking is created
    applies_to: 'both_divers_or_provider'
  },
  
  advanced_booking: {
    rate: 0.12,         // 12% on premium services
    trigger: 'payment',  // Charged when payment completed
    applies_to: 'total_amount'
  },
  
  monthly_volume: {
    rate: 0.05,         // 5% discount on high volume
    min_bookings: 20,
    applies_to: 'all_transactions'
  }
}
```

### Recommended Model: **Service Provider Commission**

**Why this model:**
- Simpler for divers (no surprise fees)
- Service providers already account for platform costs
- Easier compliance/taxation
- Industry standard (Airbnb, Stripe Connect model)

**Example:**
- Diver books ₪500 dive
- Service provider receives ₪460 (92%)
- DIVE DROP receives ₪40 (8%)

### Alternative: **Two-sided Commission**

**Less recommended but possible:**
- 4% from diver
- 4% from service provider
- Better risk distribution

---

## 3. Payment Gateway Selection

### Recommended: **Stripe**

**Pros:**
- Stripe Connect for marketplace
- Handles escrow/splits
- Excellent webhook system
- Strong fraud detection
- PCI-DSS Level 1
- Supports Israeli businesses
- Webhook signature verification

**Cons:**
- 2.9% + ₪1.10 per transaction (included in commission)
- Currency conversion fees

### Alternative: **2Checkout (Verifone)**

**For Israeli Focus:**
- Better Israeli tax support
- Local currency handling
- But: More expensive, less modern

### Local: **Bit/PayBox** (Israeli Solutions)

**Not recommended for:**
- International payments
- Recurring/split payments
- Marketplace complexity

### Final Recommendation

**Use Stripe + Stripe Connect**

- Commission rate: **8%** (covers Stripe fees)
- Payout: Daily/Weekly to connected accounts
- Treasury: Manage via Stripe Dashboard

---

## 4. Database Schema

### New Tables

```sql
-- ============================================================================
-- PAYMENTS & TRANSACTIONS
-- ============================================================================

-- Service Provider Accounts (Stripe Connect)
CREATE TABLE service_provider_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  
  business_name TEXT,
  business_type VARCHAR(50), -- 'individual', 'company', 'boat_operator'
  business_tax_id TEXT, -- חברה מספר
  business_phone TEXT,
  
  -- Payout settings
  payout_schedule VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  payout_currency VARCHAR(3) DEFAULT 'ILS',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_schedule CHECK (payout_schedule IN ('daily', 'weekly', 'monthly'))
);

-- Dive Bookings/Orders
CREATE TABLE dive_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties involved
  diver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  service_provider_id UUID NOT NULL REFERENCES service_provider_accounts(id) ON DELETE RESTRICT,
  buddy_connection_id UUID REFERENCES buddy_connections(id) ON DELETE SET NULL,
  
  -- Booking details
  dive_site_id UUID REFERENCES dive_sites(id),
  dive_date TIMESTAMP WITH TIME ZONE NOT NULL,
  dive_duration_minutes INT,
  number_of_divers INT NOT NULL DEFAULT 1,
  
  -- Description/special requests
  notes TEXT,
  
  -- Pricing
  amount_cents BIGINT NOT NULL, -- in ILS cents (e.g., 50000 = ₪500)
  currency VARCHAR(3) DEFAULT 'ILS',
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending → confirmed → completed → cancelled
  
  -- Stripe payment intent
  stripe_payment_intent_id VARCHAR(255),
  stripe_transaction_id VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);

-- Commission Tracking
CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  booking_id UUID NOT NULL REFERENCES dive_bookings(id) ON DELETE CASCADE,
  service_provider_id UUID NOT NULL REFERENCES service_provider_accounts(id),
  
  -- Commission calculation
  gross_amount_cents BIGINT NOT NULL, -- ₪500 = 50000
  commission_rate_percent DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
  commission_amount_cents BIGINT NOT NULL, -- 4000 (8%)
  
  net_payout_cents BIGINT NOT NULL, -- 46000 (gross - commission)
  
  -- Stripe fees already factored into commission_rate
  stripe_fee_cents BIGINT,
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending → paid → refunded
  
  payout_id VARCHAR(255), -- Stripe payout ID
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'refunded'))
);

-- Invoices (for both divers and providers)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  booking_id UUID NOT NULL REFERENCES dive_bookings(id) ON DELETE CASCADE,
  
  -- Invoice recipient
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_type VARCHAR(50), -- 'diver', 'service_provider'
  
  -- Invoice details
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Line items (stored as JSONB for flexibility)
  items JSONB NOT NULL, -- [{"description": "", "amount_cents": 50000}]
  
  subtotal_cents BIGINT NOT NULL,
  tax_cents BIGINT DEFAULT 0,
  total_cents BIGINT NOT NULL,
  
  -- VAT (21% in Israel)
  vat_percent DECIMAL(5, 2) DEFAULT 21.00,
  
  status VARCHAR(50) DEFAULT 'draft',
  -- draft → sent → paid → cancelled
  
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'paid', 'cancelled'))
);

-- Payment Method Storage (encrypted, PCI-DSS)
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe setup intent
  stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
  
  type VARCHAR(50), -- 'card', 'bank_account', 'digital_wallet'
  card_brand VARCHAR(50), -- 'visa', 'mastercard', etc.
  card_last_four VARCHAR(4),
  
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT one_default_per_user UNIQUE (user_id, is_default) WHERE is_default = TRUE
);

-- Refunds & Disputes
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  commission_record_id UUID NOT NULL REFERENCES commission_records(id),
  booking_id UUID NOT NULL REFERENCES dive_bookings(id),
  
  -- Refund amount (can be partial)
  refund_amount_cents BIGINT NOT NULL,
  
  reason VARCHAR(255), -- 'cancellation', 'diver_request', 'provider_error', 'dispute'
  
  status VARCHAR(50) DEFAULT 'pending',
  -- pending → processing → completed → failed
  
  stripe_refund_id VARCHAR(255),
  
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Transaction Log (audit trail)
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  booking_id UUID REFERENCES dive_bookings(id),
  
  type VARCHAR(50), -- 'charge', 'payout', 'refund', 'fee'
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'ILS',
  
  from_entity VARCHAR(50), -- 'diver', 'service_provider', 'dive_drop'
  to_entity VARCHAR(50),
  
  stripe_event_id VARCHAR(255),
  stripe_transaction_id VARCHAR(255),
  
  status VARCHAR(50), -- 'pending', 'completed', 'failed'
  
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_service_provider_accounts_stripe ON service_provider_accounts(stripe_account_id);
CREATE INDEX idx_dive_bookings_diver ON dive_bookings(diver_id);
CREATE INDEX idx_dive_bookings_provider ON dive_bookings(service_provider_id);
CREATE INDEX idx_dive_bookings_status ON dive_bookings(status);
CREATE INDEX idx_dive_bookings_date ON dive_bookings(dive_date DESC);
CREATE INDEX idx_commission_records_provider ON commission_records(service_provider_id);
CREATE INDEX idx_commission_records_status ON commission_records(status);
CREATE INDEX idx_invoices_recipient ON invoices(recipient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_refunds_booking ON refunds(booking_id);
CREATE INDEX idx_payment_transactions_booking ON payment_transactions(booking_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE service_provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Service Provider Accounts
CREATE POLICY "Users can see their own provider account"
  ON service_provider_accounts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own provider account"
  ON service_provider_accounts
  FOR UPDATE
  USING (user_id = auth.uid());

-- Dive Bookings
CREATE POLICY "Users can see their own bookings"
  ON dive_bookings
  FOR SELECT
  USING (
    diver_id = auth.uid() 
    OR service_provider_id IN (SELECT id FROM service_provider_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Divers can create bookings"
  ON dive_bookings
  FOR INSERT
  WITH CHECK (diver_id = auth.uid());

-- Commission Records (providers only)
CREATE POLICY "Providers can see their commission records"
  ON commission_records
  FOR SELECT
  USING (
    service_provider_id IN (SELECT id FROM service_provider_accounts WHERE user_id = auth.uid())
  );

-- Invoices
CREATE POLICY "Users can see their invoices"
  ON invoices
  FOR SELECT
  USING (recipient_id = auth.uid());

-- Payment Methods
CREATE POLICY "Users can see their payment methods"
  ON payment_methods
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their payment methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Refunds (restricted access)
CREATE POLICY "Admins and involved parties can see refunds"
  ON refunds
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM dive_bookings 
      WHERE diver_id = auth.uid() 
        OR service_provider_id IN (SELECT id FROM service_provider_accounts WHERE user_id = auth.uid())
    )
  );
```

---

## 5. Integration Flow: Stripe Connect

### Setup Phase

```
1. Service Provider Signs Up
   └─ Creates account on DIVE DROP
   
2. Stripe Connect Onboarding
   ├─ User clicks "Connect Bank Account"
   ├─ Redirected to Stripe onboarding (Stripe-hosted form)
   ├─ User provides:
   │  ├─ Business info
   │  ├─ Bank account (Israeli bank)
   │  ├─ Tax ID (מספר ח"פ)
   │  └─ Personal ID
   └─ Stripe sends webhook: account.updated
   
3. Store Stripe Account ID
   └─ INSERT INTO service_provider_accounts
      (user_id, stripe_account_id, stripe_onboarding_complete)
```

### Payment Phase

```
1. Diver Creates Booking
   POST /api/bookings
   ├─ Input: service_provider_id, dive_date, amount_cents
   └─ Create dive_booking record (status: 'pending')

2. Redirect to Payment (SCA/3D Secure)
   └─ Stripe Payment Intent (requires setup for Israeli payments)
      ├─ amount: ₪500
      ├─ currency: 'ils'
      ├─ stripe_account: service_provider_stripe_id
      ├─ application_fee_amount: 40 (8%)
      ├─ on_behalf_of: service_provider_stripe_id
      └─ metadata: { booking_id: "..." }

3. Diver Completes Payment
   ├─ 3D Secure (Visa Secure/Mastercard SecureCode)
   └─ Webhook: payment_intent.succeeded

4. Create Commission Record
   ├─ gross_amount: 50000 (₪500)
   ├─ commission_rate: 8%
   ├─ commission_amount: 4000
   ├─ net_payout: 46000
   └─ status: 'pending' (will be 'paid' after payout)

5. Payout to Service Provider
   └─ Daily/Weekly via Stripe
      ├─ ₪460 to provider's bank
      └─ ₪40 to DIVE DROP account
```

### Code Example (TypeScript)

```typescript
// api/bookings/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const {
    diver_id,
    service_provider_stripe_account_id,
    amount_cents,
    booking_id
  } = await req.json();

  // Create payment intent with Stripe Connect
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount_cents,
    currency: 'ils',
    
    // Route payment through provider's account
    stripe_account: service_provider_stripe_account_id,
    
    // DIVE DROP takes commission
    application_fee_amount: Math.round(amount_cents * 0.08),
    
    // On behalf of provider
    on_behalf_of: service_provider_stripe_account_id,
    
    // Track booking
    metadata: {
      booking_id,
      diver_id,
      type: 'dive_booking'
    },
    
    // Required for SCA
    confirm: false
  });

  return {
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id
  };
}

// Webhook handler
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { booking_id } = pi.metadata!;
      
      // Update booking
      await supabase
        .from('dive_bookings')
        .update({
          status: 'confirmed',
          stripe_transaction_id: pi.id
        })
        .eq('id', booking_id);
      
      // Create commission record
      const { amount, application_fee_amount } = pi;
      
      await supabase
        .from('commission_records')
        .insert({
          booking_id,
          gross_amount_cents: amount,
          commission_amount_cents: application_fee_amount,
          net_payout_cents: amount - application_fee_amount,
          status: 'pending' // Will become 'paid' after payout
        });
      
      break;
    }
    
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      
      // Find booking and create refund record
      const { booking_id } = charge.metadata!;
      
      await supabase
        .from('refunds')
        .insert({
          booking_id,
          refund_amount_cents: charge.amount_refunded,
          reason: 'stripe_refund',
          stripe_refund_id: charge.refunded,
          status: 'completed'
        });
      
      break;
    }
  }
}
```

---

## 6. Taxation & Compliance

### Israeli VAT (21%)

**For Service Providers:**
- If provider is VAT-registered: Invoice includes VAT
- If not: No VAT, but still report commission income

**For DIVE DROP:**
- Commission is income (₪40 on ₪500 transaction)
- Report as revenue
- Pay VAT on commission (if applicable)

**Invoice Generation:**

```typescript
async function generateInvoice(bookingId: string) {
  const booking = await getBooking(bookingId);
  
  // Create invoice for service provider
  const invoiceNumber = `INV-${Date.now()}`;
  
  const subtotal = booking.amount_cents;
  const vat = Math.round(subtotal * 0.21);
  const total = subtotal + vat;
  
  // Generate PDF (use pdfkit or similar)
  const pdf = generatePDF({
    invoiceNumber,
    date: new Date(),
    recipient: booking.service_provider,
    items: [
      {
        description: `Dive facilitation - ${booking.dive_date}`,
        quantity: 1,
        amount: subtotal
      }
    ],
    subtotal,
    vat,
    total
  });
  
  // Store in Supabase Storage
  await supabase.storage
    .from('invoices')
    .upload(`${bookingId}.pdf`, pdf);
  
  // Create invoice record
  await supabase.from('invoices').insert({
    booking_id: bookingId,
    invoice_number: invoiceNumber,
    items: [...],
    subtotal_cents: subtotal,
    tax_cents: vat,
    total_cents: total,
    status: 'sent'
  });
}
```

### Tax Forms

**Required for DIVE DROP:**
1. **תשובה ממס הכנסה** (Tax return) - annual
2. **דוח בנק ישראל** (VAT return) - monthly/quarterly
3. **טופס 406** (Annual report for Stripe/payment processor)

**Required for Service Providers:**
- They receive invoices from DIVE DROP
- Report as business expense/commission paid
- Invoice must include service details

---

## 7. Fraud Detection & Security

### PCI-DSS Compliance

✅ **What DIVE DROP Handles:**
- Store Stripe payment method IDs (not card numbers)
- Use Stripe's hosted UI (CheckoutJS, Elements)
- Never handle raw card data

✅ **Stripe Handles:**
- Card storage & encryption
- PCI-DSS Level 1 compliance
- Fraud detection

### Fraud Checks

```typescript
async function validateBooking(booking: DiveBooking) {
  const diverRiskScore = await calculateRiskScore(booking.diver_id, {
    newAccountAge: getCurrentAccountAge(booking.diver_id),
    previousBookings: await getPreviousBookings(booking.diver_id),
    amountDeviation: Math.abs(booking.amount_cents - averageBooking(booking.diver_id)),
    geoAnomalies: checkGeoLocation(booking.diver_id)
  });
  
  if (diverRiskScore > 0.7) {
    // Require manual review or additional verification
    await notifyAdmin('high_risk_booking', booking);
    return { allowed: false, reason: 'manual_review_required' };
  }
  
  return { allowed: true };
}
```

### Chargeback Management

```typescript
export async function handleChargebackCreated(chargeback: Stripe.Chargeback) {
  const booking = await findBookingByTransaction(chargeback.charge);
  
  // Notify service provider
  await notifyServiceProvider({
    type: 'chargeback_initiated',
    booking_id: booking.id,
    amount: chargeback.amount,
    deadline: chargeback.deadline
  });
  
  // Auto-refund if within policy
  if (isWithinRefundWindow(booking)) {
    await fullRefund(booking.id, 'chargeback_protection');
  }
  
  // Store chargeback evidence
  await recordChargeback({
    booking_id: booking.id,
    chargeback_id: chargeback.id,
    status: 'open'
  });
}
```

---

## 8. Refund Policy

### Refund Windows

| Scenario | Timeline | Commission |
|----------|----------|-----------|
| Cancellation (diver) | Until 24h before | Full refund + commission refunded |
| Cancellation (provider) | Until 48h before | Full refund + commission refunded |
| No-show (diver) | After dive | No refund, commission kept |
| Dispute resolution | 30 days | Case-by-case |
| Payment failure | Immediate | Automatic refund |

### Refund Logic

```typescript
async function initiateRefund(
  bookingId: string,
  reason: RefundReason,
  amount_cents?: number
) {
  const booking = await getBooking(bookingId);
  const commission = await getCommissionRecord(bookingId);
  
  // Determine if refundable
  const timeSinceDive = Date.now() - booking.dive_date;
  const isRefundable = 
    reason === 'cancellation' && timeSinceDive < 24 * 60 * 60 * 1000;
  
  if (!isRefundable) {
    throw new Error('Outside refund window');
  }
  
  // Calculate amounts
  const refundAmount = amount_cents || booking.amount_cents;
  const commissionRefund = Math.round(refundAmount * 0.08);
  
  // Create Stripe refund
  const stripeRefund = await stripe.refunds.create({
    charge: booking.stripe_transaction_id,
    amount: refundAmount,
    metadata: {
      booking_id: bookingId,
      reason,
      commission_refund: commissionRefund
    }
  });
  
  // Record refund
  await supabase.from('refunds').insert({
    booking_id: bookingId,
    refund_amount_cents: refundAmount,
    reason,
    stripe_refund_id: stripeRefund.id,
    status: 'pending'
  });
  
  // Update commission status
  await supabase
    .from('commission_records')
    .update({ status: 'refunded' })
    .eq('id', commission.id);
  
  // Update booking
  await supabase
    .from('dive_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
}
```

---

## 9. Service Provider Payout System

### Daily Payouts (Recommended)

```
Monday: Payouts for all completed dives from Friday-Sunday
Tuesday: Payouts for all completed dives from Monday
...
```

**Stripe handles:**
- Converting ILS to provider's preferred currency
- Bank transfers to registered account
- Payout status tracking

**DIVE DROP tracks:**
- Commission amounts
- Payout IDs
- Reconciliation

### Payout Webhook

```typescript
export async function handlePayoutCreated(payout: Stripe.Payout) {
  const { id, amount, arrival_date, automatic } = payout;
  
  // Update commission records linked to this payout
  await supabase
    .from('commission_records')
    .update({
      payout_id: id,
      status: 'paid',
      paid_at: new Date(arrival_date * 1000)
    })
    .eq('stripe_payout_id', id);
  
  // Notify provider
  await sendPayoutNotification(payout.connected_account, {
    amount,
    arrival_date,
    payout_id: id
  });
}
```

---

## 10. Dashboard & Reporting

### For Divers

```
/dashboard/payments
├─ My Bookings
│  ├─ [Upcoming] Shark Reef - ₪500 - Paid
│  ├─ [Past] Japanese Gardens - ₪350 - Completed
│  └─ [Pending] Rock Dive - ₪600 - Awaiting Confirmation
├─ Payment Methods
│  ├─ Add Card
│  └─ Visa ****1234
└─ Transaction History
   ├─ [2024-06-20] Paid ₪500 - Shark Reef
   └─ [2024-06-10] Refunded ₪350 - Cancelled
```

### For Service Providers

```
/dashboard/provider/payments
├─ Earnings (This Month)
│  ├─ Total Bookings: ₪4,500
│  ├─ Commission (8%): -₪360
│  └─ Net Earnings: ₪4,140
├─ Recent Bookings
│  ├─ [Completed] Diver X - ₪500 - Paid
│  ├─ [Pending] Diver Y - ₪600 - Awaiting Payment
│  └─ [Cancelled] Diver Z - ₪400 - Refunded
├─ Payouts
│  ├─ Paid Out (Today): ₪4,140
│  ├─ Payout Schedule: Daily
│  └─ Next Payout: Tomorrow 09:00
└─ Reports
   ├─ Download Invoice
   ├─ Monthly Statement
   └─ Tax Export (CSV)
```

### Admin Dashboard

```
/admin/payments
├─ Revenue Overview
│  ├─ Total Commissions (This Month): ₪18,500
│  ├─ Transaction Volume: ₪231,250
│  ├─ Success Rate: 98.3%
│  └─ Chargebacks: 2 (0.08%)
├─ Disputes
│  ├─ Open (7)
│  ├─ Resolved (42)
│  └─ Action Required (2)
├─ Provider Payouts
│  ├─ Pending: ₪52,000
│  ├─ Processed (Today): ₪45,300
│  └─ Failed: 1 (₪2,500)
└─ Fraud Alerts
   ├─ High Risk Bookings (3)
   └─ Duplicate Cards (5)
```

---

## 11. Implementation Timeline

### Phase 1: Foundation (Weeks 1-3)

- [ ] Database schema creation
- [ ] Stripe Connect setup
- [ ] Service provider onboarding flow
- [ ] Payment method storage (Stripe SetupIntent)

### Phase 2: Payment Processing (Weeks 4-6)

- [ ] Booking creation flow
- [ ] Stripe PaymentIntent integration
- [ ] Webhook handlers
- [ ] Commission calculation & recording

### Phase 3: Payouts & Reports (Weeks 7-9)

- [ ] Payout dashboard
- [ ] Invoice generation
- [ ] Tax reporting
- [ ] Reconciliation system

### Phase 4: Security & Compliance (Weeks 10-12)

- [ ] Fraud detection rules
- [ ] Chargeback handling
- [ ] Security audit
- [ ] Compliance verification

### Phase 5: Analytics & Optimization (Weeks 13+)

- [ ] Dashboard implementation
- [ ] Performance monitoring
- [ ] Commission optimization
- [ ] A/B testing

---

## 12. Configuration Files

### .env.local

```env
# Stripe
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Commissions
COMMISSION_RATE=0.08
COMMISSION_MIN_BOOKING=100 # ₪1 minimum
COMMISSION_MAX_BOOKING=50000 # ₪500 maximum

# Payouts
PAYOUT_SCHEDULE=daily
PAYOUT_MIN_AMOUNT=1000 # ₪10 minimum payout

# Refunds
REFUND_WINDOW_HOURS=24
DISPUTE_WINDOW_DAYS=30

# Fraud
FRAUD_DETECTION_ENABLED=true
FRAUD_SCORE_THRESHOLD=0.7
```

### stripe.config.ts

```typescript
export const STRIPE_CONFIG = {
  commissionRate: 0.08,
  currency: 'ils',
  
  paymentIntentMetadata: {
    platform: 'dive_drop',
    version: '1.0'
  },
  
  webhookEvents: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.refunded',
    'payout.created',
    'payout.failed',
    'charge.dispute.created'
  ]
};
```

---

## 13. API Endpoints Reference

### Bookings

```
POST   /api/bookings
GET    /api/bookings/:id
PUT    /api/bookings/:id/cancel
POST   /api/bookings/:id/refund
```

### Payments

```
POST   /api/payments/create-intent
POST   /api/payments/confirm
GET    /api/payments/methods
POST   /api/payments/methods
```

### Service Providers

```
POST   /api/providers/connect
GET    /api/providers/account
PUT    /api/providers/account
GET    /api/providers/payouts
GET    /api/providers/earnings
```

### Invoices

```
GET    /api/invoices/:booking_id
POST   /api/invoices/:booking_id/generate
GET    /api/invoices/:id/download
```

### Admin

```
GET    /api/admin/dashboard
GET    /api/admin/disputes
POST   /api/admin/disputes/:id/resolve
GET    /api/admin/payments/report
```

---

## 14. Security Checklist

- [ ] PCI-DSS Level 1 compliance (via Stripe)
- [ ] HTTPS everywhere
- [ ] API rate limiting
- [ ] Input validation (Zod schemas)
- [ ] CSRF protection
- [ ] Webhook signature verification
- [ ] Encrypted audit logs
- [ ] Admin action logging
- [ ] Data minimization (no unnecessary PII storage)
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Terms of Service updated
- [ ] Privacy Policy updated
- [ ] GDPR compliance (for EU users)

---

## 15. Success Metrics

| Metric | Target | Monitoring |
|--------|--------|-----------|
| Payment Success Rate | > 98% | Weekly |
| Average Settlement Time | < 2 days | Daily |
| Dispute Rate | < 1% | Monthly |
| Customer Support Tickets | < 2% of transactions | Daily |
| Commission Revenue | ₪X per month | Monthly |
| Chargeback Rate | < 0.5% | Weekly |

---

## Summary

**DIVE DROP Payment Architecture** provides:

✅ **Peer-to-peer marketplace** with service provider payouts
✅ **8% commission model** covering platform + payment processing costs
✅ **Stripe Connect integration** for secure, compliant payments
✅ **Israeli tax support** with VAT invoicing
✅ **Comprehensive audit trail** for compliance
✅ **Fraud detection** and chargeback management
✅ **24/7 payment security** with PCI-DSS Level 1
✅ **Scalable architecture** supporting future growth

**Next Steps:**
1. Set up Stripe Connect account
2. Create database schema
3. Implement service provider onboarding
4. Build payment flow
5. Launch with beta users
