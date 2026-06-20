# DIVE DROP Payment System - Documentation Index

## Overview

DIVE DROP operates a peer-to-peer buddy-matching platform for divers. The payment system facilitates bookings between divers and service providers (dive shops, guides, boat operators) while charging a small commission to sustain the platform.

**Commission Model:** 8% on all bookings
**Payment Gateway:** Stripe Connect
**Currencies:** ILS (primary), USD, EUR (secondary)
**Settlement:** Daily payouts to service providers

---

## 📚 Documentation Files

### 1. **PAYMENT_ARCHITECTURE.md** ⭐ START HERE
Complete system design covering:
- Business model overview
- Commission system design
- Stripe Connect integration
- Database schema (7 new tables)
- Payment flows and diagrams
- Taxation & compliance
- Fraud detection & security
- Refund policy
- Implementation timeline
- Dashboard designs

**Read this first** to understand the complete architecture.

### 2. **PAYMENT_IMPLEMENTATION_GUIDE.md**
Step-by-step developer guide:
- Quick start (setup Stripe account)
- Phase-by-phase implementation (5 phases)
- Code examples (TypeScript)
- Component implementations
- Testing checklist
- Deployment guide
- Monitoring & maintenance
- Troubleshooting guide

**Use this** to build the system.

### 3. **COMMISSION_CALCULATIONS.md**
Detailed financial examples:
- Commission structure explained
- 10+ real-world scenarios
- Monthly earning projections
- Tax implications
- Model comparisons
- Break-even analysis
- Revenue forecasts
- Audit trail examples
- FAQ

**Reference this** for financial discussions with providers and investors.

### 4. **Database Schema Migration**
File: `supabase/migrations/20260623_create_payments_schema.sql`

Contains:
- 8 new database tables
- Payment enums
- RLS policies
- Indexes & triggers
- Helper functions
- ~600 lines of SQL

### 5. **TypeScript Schemas**
File: `src/lib/payments/schemas.ts`

Contains:
- Zod validation schemas
- Type definitions
- Helper functions
- Commission calculator
- Currency formatter

### 6. **Stripe Configuration**
File: `src/lib/payments/stripe.config.ts`

Contains:
- All Stripe configuration
- Commission settings
- Payment intent defaults
- Connect settings
- Webhook configuration
- Helper functions
- Test card numbers

---

## 🎯 Quick Reference

### Commission Model

```
Diver pays: ₪500
└─ 8% commission: ₪40 (DIVE DROP)
   └─ Net payout: ₪460 (Service Provider)
```

### Payment Flow

```
1. Diver creates booking
2. Stripe payment intent created
3. Diver completes payment (3D Secure)
4. Commission recorded automatically
5. Service provider sees net payout
6. Daily payout to provider's bank
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `service_provider_accounts` | Stripe Connect accounts |
| `dive_bookings` | Booking records |
| `commission_records` | Commission tracking |
| `invoices` | Invoice generation |
| `payment_methods` | Saved cards |
| `refunds` | Refund records |
| `payment_transactions` | Audit trail |
| `payment_disputes` | Chargebacks/disputes |

---

## 🚀 Implementation Roadmap

### Week 1-2: Foundation
- [ ] Create Stripe account
- [ ] Set environment variables
- [ ] Create database tables
- [ ] Service provider onboarding flow

### Week 3-4: Payments
- [ ] Payment intent creation
- [ ] Payment form component
- [ ] Webhook handlers
- [ ] Commission calculation

### Week 5-6: Payouts & Reporting
- [ ] Payout dashboard
- [ ] Invoice generation
- [ ] Tax reporting
- [ ] Reconciliation

### Week 7-8: Security & Compliance
- [ ] Fraud detection
- [ ] PCI-DSS validation
- [ ] Security audit
- [ ] Compliance review

### Week 9+: Analytics & Optimization
- [ ] Admin dashboard
- [ ] Performance monitoring
- [ ] Commission optimization
- [ ] A/B testing

---

## 💰 Financial Highlights

### Provider Earning Potential

```
2 dives/week @ ₪500/dive:
  Monthly gross: ₪4,000
  Commission (8%): -₪320
  Net income: ₪3,680/month

4 dives/week @ ₪600/diver (6 divers):
  Monthly gross: ₪14,400
  Commission (8%): -₪1,152
  Net income: ₪13,248/month
```

### DIVE DROP Revenue Potential

```
Conservative Year 1: ₪240,000
Aggressive Year 1: ₪768,000
Year 2-3: 2-3x growth expected
```

### Break-Even Point

```
Monthly costs: ~₪10,500
Transaction volume needed: ₪131,250
Bookings needed (₪500 avg): 263 bookings
Timeline: Month 3-4
```

---

## 🔐 Security & Compliance

### PCI-DSS
- ✅ Level 1 (via Stripe)
- No card data stored
- Stripe API keys rotation required
- Webhook signature verification

### Tax Compliance
- ✅ VAT support (21% in Israel)
- ✅ Invoicing system
- ✅ Annual tax reporting
- ✅ Transaction audit trail

### Fraud Protection
- ✅ 3D Secure (SCA) required
- ✅ Stripe Radar enabled
- ✅ Chargeback handling
- ✅ Dispute management

---

## 📊 Dashboard Components

### For Divers
- Booking history
- Payment methods
- Transaction history
- Upcoming dives
- Refund status

### For Service Providers
- Monthly earnings
- Pending bookings
- Commission breakdown
- Payout schedule
- Tax reports
- Dispute history

### For Admins
- Revenue overview
- Transaction volume
- Success rate
- Dispute metrics
- Chargeback rate
- Provider payouts

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| Payments | Stripe + Stripe Connect |
| Database | Supabase PostgreSQL |
| Validation | Zod |
| Frontend | Next.js + React |
| Backend | Next.js API Routes |
| Authentication | Supabase Auth |
| Webhooks | Stripe webhooks |
| Hosting | Vercel |

---

## 📝 Configuration Files

### New Files Created

1. **PAYMENT_ARCHITECTURE.md** - Complete system design
2. **PAYMENT_IMPLEMENTATION_GUIDE.md** - Developer guide
3. **COMMISSION_CALCULATIONS.md** - Financial examples
4. **supabase/migrations/20260623_create_payments_schema.sql** - Database schema
5. **src/lib/payments/schemas.ts** - TypeScript schemas
6. **src/lib/payments/stripe.config.ts** - Stripe configuration

### Environment Variables Required

```env
# Stripe
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Commission
COMMISSION_RATE=0.08
COMPANY_TAX_ID=123456789

# Feature Flags
STRIPE_RADAR_ENABLED=false
STRIPE_LOG_API_CALLS=false
STRIPE_LOG_WEBHOOKS=false

# App
NEXT_PUBLIC_APP_URL=https://divedrop.com
NODE_ENV=production
```

---

## ✅ Verification Checklist

### Before Launch

- [ ] Stripe account created and verified
- [ ] All environment variables set
- [ ] Database migration applied
- [ ] Service provider onboarding tested
- [ ] Payment flow tested (test cards)
- [ ] Refund flow tested
- [ ] Webhook integration tested
- [ ] Commission calculations verified
- [ ] Tax compliance reviewed
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Security audit completed

### After Launch

- [ ] Monitor payment success rate
- [ ] Check webhook processing
- [ ] Verify commission calculations
- [ ] Monitor for disputes/chargebacks
- [ ] Validate payout processing
- [ ] Review error logs daily
- [ ] Test refund process weekly
- [ ] Audit commission accuracy monthly

---

## 🆘 Support & Resources

### Documentation
- **Stripe API:** https://stripe.com/docs/api
- **Stripe Connect:** https://stripe.com/docs/connect
- **Israeli Payments:** https://stripe.com/global/israel
- **Zod Validation:** https://zod.dev
- **Next.js API Routes:** https://nextjs.org/docs/api-routes

### Testing
- **Stripe Test Cards:** See `COMMISSION_CALCULATIONS.md`
- **Webhook Testing:** Use `stripe-cli`
- **Unit Tests:** See `PAYMENT_IMPLEMENTATION_GUIDE.md`

### Troubleshooting
- Payment intent creation fails → Check Stripe API keys
- Webhooks not processing → Verify webhook secret
- Refunds failing → Check refund window (24h)
- Payout delays → Check Stripe dashboard

---

## 📈 Key Metrics to Monitor

| Metric | Target | Frequency |
|--------|--------|-----------|
| Payment Success Rate | > 98% | Daily |
| Webhook Processing | 100% | Daily |
| Average Settlement | < 2 days | Weekly |
| Dispute Rate | < 1% | Monthly |
| Chargeback Rate | < 0.5% | Weekly |
| Commission Accuracy | 100% | Daily |
| Payout Success | > 99% | Daily |
| Support Tickets | < 2% of transactions | Daily |

---

## 🎓 Learning Path

1. **Start:** Read `PAYMENT_ARCHITECTURE.md` (30 mins)
2. **Understand:** Review `COMMISSION_CALCULATIONS.md` (20 mins)
3. **Build:** Follow `PAYMENT_IMPLEMENTATION_GUIDE.md` (1 week)
4. **Deploy:** Follow deployment checklist
5. **Monitor:** Daily monitoring routine
6. **Optimize:** Monthly review of metrics

---

## 📞 Questions?

For questions about:
- **Architecture:** See `PAYMENT_ARCHITECTURE.md`
- **Implementation:** See `PAYMENT_IMPLEMENTATION_GUIDE.md`
- **Financials:** See `COMMISSION_CALCULATIONS.md`
- **Database:** See `20260623_create_payments_schema.sql`
- **TypeScript:** See `src/lib/payments/schemas.ts`
- **Configuration:** See `src/lib/payments/stripe.config.ts`

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-23 | Initial design & documentation |
| 1.1 | TBD | Tiered commission implementation |
| 2.0 | TBD | Multi-currency support |
| 2.1 | TBD | Subscription plans |

---

## 📄 License

This payment system design is proprietary to DIVE DROP. All code and documentation are confidential.

---

**Last Updated:** 2026-06-23
**Status:** Ready for Implementation
**Next Step:** Set up Stripe account and begin Phase 1
