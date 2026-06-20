# DIVE DROP - Payment Implementation Guide

## Quick Start (Week 1-2)

### 1. Set Up Stripe Account

```bash
# Visit https://dashboard.stripe.com
# 1. Sign up for Stripe account
# 2. Complete verification (takes ~24 hours)
# 3. Navigate to Developers > API keys
# 4. Copy Secret Key and Publishable Key
# 5. Enable Stripe Connect (Settings > Account Settings > Applications)
```

### 2. Configure Environment Variables

```bash
# .env.local
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Commission Settings
COMMISSION_RATE=0.08
COMPANY_TAX_ID=123456789

# Feature Flags
STRIPE_RADAR_ENABLED=false
STRIPE_LOG_API_CALLS=false
STRIPE_LOG_WEBHOOKS=false
```

### 3. Install Dependencies

```bash
npm install stripe @stripe/react-stripe-js @stripe/stripe-js
```

### 4. Create Database Tables

```bash
# Run migration
supabase db push

# Or manually run the SQL:
psql -d supabase_db < supabase/migrations/20260623_create_payments_schema.sql
```

---

## Phase-by-Phase Implementation

### Phase 1: Service Provider Onboarding (Week 1-2)

#### 1.1 Create Service Provider Account API

**File: `src/app/api/provider/connect/route.ts`**

```typescript
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_CONFIG } from '@/lib/payments/stripe.config';

const stripe = new Stripe(STRIPE_CONFIG.apiKey);

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if provider account already exists
  const existingAccount = await supabase
    .from('service_provider_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existingAccount.data) {
    return Response.json(
      {
        error: 'Provider account already exists',
        account_id: existingAccount.data.id,
      },
      { status: 400 }
    );
  }

  try {
    // Create Stripe Connect account
    const stripeAccount = await stripe.accounts.create({
      type: 'standard',
      country: 'IL',
      email: user.email!,
      metadata: {
        user_id: user.id,
        platform: 'dive_drop',
      },
    });

    // Create service provider account in Supabase
    const { data, error } = await supabase
      .from('service_provider_accounts')
      .insert({
        user_id: user.id,
        stripe_account_id: stripeAccount.id,
        business_name: body.business_name,
        business_type: body.business_type,
        business_phone: body.business_phone,
        payout_schedule: body.payout_schedule || 'daily',
      })
      .select()
      .single();

    if (error) throw error;

    // Create Stripe Connect onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      type: 'account_onboarding',
      return_url: STRIPE_CONFIG.connect.returnUrl,
      refresh_url: STRIPE_CONFIG.connect.refreshUrl,
    });

    return Response.json({
      success: true,
      account_id: data.id,
      stripe_account_id: stripeAccount.id,
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error('Failed to create provider account:', error);
    return Response.json(
      { error: 'Failed to create provider account' },
      { status: 500 }
    );
  }
}
```

#### 1.2 Provider Onboarding Component

**File: `src/components/payments/ProviderConnect.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createServiceProviderAccountSchema } from '@/lib/payments/schemas';

export function ProviderConnect() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      business_name: formData.get('business_name'),
      business_type: formData.get('business_type'),
      business_phone: formData.get('business_phone'),
      payout_schedule: formData.get('payout_schedule') || 'daily',
    };

    try {
      // Validate
      const validated = createServiceProviderAccountSchema.parse(data);

      // Call API
      const response = await fetch('/api/provider/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      // Redirect to Stripe Connect
      window.location.href = result.onboarding_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleConnect} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Business Name</label>
        <input
          type="text"
          name="business_name"
          required
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="My Dive Shop"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Business Type</label>
        <select
          name="business_type"
          required
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="individual">Individual</option>
          <option value="company">Company</option>
          <option value="boat_operator">Boat Operator</option>
          <option value="dive_school">Dive School</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Phone Number</label>
        <input
          type="tel"
          name="business_phone"
          required
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Payout Schedule</label>
        <select
          name="payout_schedule"
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? 'Connecting...' : 'Connect Bank Account'}
      </button>
    </form>
  );
}
```

---

### Phase 2: Payment Processing (Week 3-4)

#### 2.1 Create Payment Intent

**File: `src/app/api/payments/intent/route.ts`**

```typescript
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_CONFIG, calculateCommission } from '@/lib/payments/stripe.config';

const stripe = new Stripe(STRIPE_CONFIG.apiKey);

export async function POST(req: Request) {
  const { booking_id } = await req.json();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get booking details
    const booking = await supabase
      .from('dive_bookings')
      .select('*, service_provider_accounts(stripe_account_id)')
      .eq('id', booking_id)
      .eq('diver_id', user.id)
      .single();

    if (!booking.data) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const provider = booking.data.service_provider_accounts;
    const { gross, commission } = calculateCommission(booking.data.amount_cents);

    // Create payment intent with Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: booking.data.amount_cents,
        currency: STRIPE_CONFIG.paymentIntent.currency,

        // Application fee (DIVE DROP commission)
        application_fee_amount: commission,

        // Route through provider's account
        on_behalf_of: provider.stripe_account_id,
        transfer_data: {
          destination: provider.stripe_account_id,
        },

        // Metadata
        metadata: {
          booking_id,
          diver_id: user.id,
          platform: 'dive_drop',
        },

        // Enable automatic payment methods (3D Secure, etc.)
        automatic_payment_methods: {
          enabled: true,
        },

        // Statement descriptor
        statement_descriptor: STRIPE_CONFIG.paymentIntent.statementDescriptor,
      },
      {
        stripeAccount: provider.stripe_account_id,
      }
    );

    // Update booking with payment intent ID
    await supabase
      .from('dive_bookings')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', booking_id);

    return Response.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: booking.data.amount_cents,
      commission,
    });
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    return Response.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
```

#### 2.2 Payment Form Component

**File: `src/components/payments/PaymentForm.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export function PaymentForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create payment intent
    fetch('/api/payments/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
    })
      .then((r) => r.json())
      .then((d) => setClientSecret(d.client_secret))
      .catch((e) => setError(e.message));
  }, [bookingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!stripe || !elements) return;

    // Confirm payment
    const { error: stripeError, paymentIntent } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
    } else if (paymentIntent?.status === 'succeeded') {
      // Success!
      window.location.href = `/bookings/${bookingId}/success`;
    }

    setLoading(false);
  }

  if (!clientSecret) {
    return <div>Loading payment form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement />
      {error && <div className="text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Complete Payment'}
      </button>
    </form>
  );
}

export function PaymentPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm bookingId="..." />
    </Elements>
  );
}
```

---

### Phase 3: Webhooks (Week 4-5)

#### 3.1 Webhook Handler

**File: `src/app/api/webhooks/stripe/route.ts`**

```typescript
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_CONFIG } from '@/lib/payments/stripe.config';

const stripe = new Stripe(STRIPE_CONFIG.apiKey);

export async function POST(req: Request) {
  const supabase = await createClient();

  // Verify webhook signature
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Payment succeeded
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { booking_id } = paymentIntent.metadata!;

        // Update booking
        await supabase
          .from('dive_bookings')
          .update({
            status: 'confirmed',
            stripe_transaction_id: paymentIntent.id,
          })
          .eq('id', booking_id);

        // Create commission record
        const booking = await supabase
          .from('dive_bookings')
          .select('*, service_provider_accounts(id)')
          .eq('id', booking_id)
          .single();

        const { gross, commission } = calculateCommission(booking.data.amount_cents);

        await supabase.from('commission_records').insert({
          booking_id,
          service_provider_id: booking.data.service_provider_accounts.id,
          gross_amount_cents: gross,
          commission_amount_cents: commission,
          net_payout_cents: gross - commission,
          status: 'pending',
        });

        break;
      }

      // Refund processed
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const { booking_id } = charge.metadata!;

        // Create refund record
        const commission = await supabase
          .from('commission_records')
          .select('id')
          .eq('booking_id', booking_id)
          .single();

        await supabase.from('refunds').insert({
          commission_record_id: commission.data.id,
          booking_id,
          refund_amount_cents: charge.amount_refunded || 0,
          reason: 'stripe_refund',
          stripe_refund_id: charge.refunded,
          status: 'completed',
        });

        break;
      }

      // Payout created
      case 'payout.created': {
        const payout = event.data.object as Stripe.Payout;

        // Update commission records
        await supabase
          .from('commission_records')
          .update({
            payout_id: payout.id,
            status: 'paid',
            paid_at: new Date(payout.arrival_date * 1000),
          })
          .in('stripe_payout_id', [payout.id]);

        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

#### 3.2 Test Webhook

```bash
# Using stripe-cli
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

---

### Phase 4: Dashboard (Week 5-6)

#### 4.1 Provider Earnings Dashboard

**File: `src/app/provider/dashboard/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/payments/stripe.config';

export default async function ProviderDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get provider account
  const provider = await supabase
    .from('service_provider_accounts')
    .select('*')
    .eq('user_id', user!.id)
    .single();

  // Get today's earnings
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const commissions = await supabase
    .from('commission_records')
    .select('net_payout_cents')
    .eq('service_provider_id', provider.data.id)
    .eq('status', 'paid')
    .gte('paid_at', today.toISOString());

  const totalEarnings = commissions.data?.reduce(
    (sum, c) => sum + c.net_payout_cents,
    0
  ) || 0;

  // Get pending bookings
  const pendingBookings = await supabase
    .from('dive_bookings')
    .select('*')
    .eq('service_provider_id', provider.data.id)
    .eq('status', 'pending')
    .order('dive_date');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Provider Dashboard</h1>

      {/* Earnings Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Today's Earnings</h3>
          <p className="text-2xl font-bold">
            {formatCurrency(totalEarnings)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">
            Pending Bookings
          </h3>
          <p className="text-2xl font-bold">{pendingBookings.data?.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Payout Schedule</h3>
          <p className="text-2xl font-bold">
            {provider.data?.payout_schedule}
          </p>
        </div>
      </div>

      {/* Pending Bookings */}
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold p-6 border-b">Pending Bookings</h2>
        <div className="divide-y">
          {pendingBookings.data?.map((booking) => (
            <div key={booking.id} className="p-6 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {new Date(booking.dive_date).toLocaleDateString('he-IL')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {booking.number_of_divers} diver(s) •{' '}
                    {formatCurrency(booking.amount_cents)}
                  </p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Create service provider account
- [ ] Complete Stripe Connect onboarding
- [ ] Create dive booking as diver
- [ ] Process payment with test card (4242424242424242)
- [ ] Verify booking status changed to "confirmed"
- [ ] Check commission record created
- [ ] Verify webhook processed payment
- [ ] Test refund flow
- [ ] Check provider payout dashboard

### Test Cases

```typescript
// tests/payments.integration.test.ts

describe('Payment Flow', () => {
  it('should create payment intent with correct commission', async () => {
    const booking = await createTestBooking(50000); // ₪500
    const pi = await createPaymentIntent(booking);

    expect(pi.amount).toBe(50000);
    expect(pi.application_fee_amount).toBe(4000); // 8%
  });

  it('should update booking status after payment', async () => {
    const booking = await createTestBooking(50000);
    await processPayment(booking);

    const updated = await getBooking(booking.id);
    expect(updated.status).toBe('confirmed');
  });

  it('should create commission record', async () => {
    const booking = await createTestBooking(50000);
    await processPayment(booking);

    const commission = await getCommissionRecord(booking.id);
    expect(commission.gross_amount_cents).toBe(50000);
    expect(commission.commission_amount_cents).toBe(4000);
  });

  it('should process refund', async () => {
    const booking = await createTestBooking(50000);
    await processPayment(booking);
    await initiateRefund(booking.id);

    const refund = await getRefund(booking.id);
    expect(refund.status).toBe('pending');
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Payment schemas validated
- [ ] Webhook endpoints tested
- [ ] Stripe API keys rotated
- [ ] Commission rates reviewed
- [ ] Refund policy documented
- [ ] Privacy policy updated
- [ ] Terms of service updated

### Production Deployment

```bash
# 1. Verify environment variables
echo $STRIPE_PUBLIC_KEY
echo $STRIPE_SECRET_KEY

# 2. Run migrations
supabase db push --remote

# 3. Deploy to Vercel
vercel deploy --prod

# 4. Verify webhooks
curl https://api.stripe.com/v1/webhook_endpoints -u sk_live_...

# 5. Test with real payment
# (Use test card first: 4242424242424242)
```

---

## Monitoring & Maintenance

### Daily Checks

- [ ] No failed payments
- [ ] All webhooks processed
- [ ] No pending refunds
- [ ] Commission rates correct
- [ ] Payouts scheduled

### Weekly Checks

- [ ] Review disputes/chargebacks
- [ ] Check error logs
- [ ] Verify reconciliation
- [ ] Test refund flow
- [ ] Audit commission calculations

### Monthly Checks

- [ ] Tax reporting ready
- [ ] Performance metrics reviewed
- [ ] Commission optimization
- [ ] Customer support tickets analyzed
- [ ] Security audit

---

## Troubleshooting

### Common Issues

**Payment Intent Creation Fails**
- Check Stripe API key
- Verify service provider Stripe account
- Check commission calculation
- Review browser console for CORS errors

**Webhook Not Processing**
- Verify webhook signature
- Check webhook secret
- Review Stripe dashboard for failed events
- Check server logs

**Refund Not Processing**
- Verify refund window
- Check Stripe refund limits
- Ensure charge is not disputed
- Review transaction history

---

## Performance Optimization

### Payment Processing

```typescript
// Cache commission rates
const commissionRateCache = new Map<string, number>();

// Use batch processing for webhooks
async function processBatchWebhooks(events: Stripe.Event[]) {
  const grouped = groupBy(events, 'type');

  for (const [type, typeEvents] of grouped) {
    await processBatch(typeEvents);
  }
}

// Queue payout processing
const payoutQueue = new Bull('payouts');

payoutQueue.process(async (job) => {
  const payout = job.data;
  await processPayout(payout);
});
```

---

## Support & Resources

- Stripe API Docs: https://stripe.com/docs/api
- Stripe Connect: https://stripe.com/docs/connect
- Israeli Payments: https://stripe.com/global/israel
- DIVE DROP Support: support@divedrop.com
