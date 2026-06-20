# DIVE DROP - Commission Calculations & Examples

## Commission Structure

### Base Model: **8% Service Provider Commission**

Every transaction:
- **Gross**: Amount diver pays
- **Commission**: 8% for DIVE DROP (covers payment processing + platform costs)
- **Net**: What service provider receives

### Formula

```
Gross = ₪500
Commission = Gross × 8% = ₪40
Net Payout = Gross - Commission = ₪460

Service Provider receives: ₪460
DIVE DROP receives: ₪40
```

---

## Real-World Examples

### Example 1: Basic Dive Booking

```
Scenario: Diver books a reef dive for ₪500

┌─────────────────────────────────────────┐
│ Diver pays                    ₪500.00   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Payment goes to Stripe                  │
│ - Amount: ₪500                          │
│ - Stripe fee: ₪1.10 + 2.9% = ~₪16.60   │
└─────────────────────────────────────────┘
                    ↓
                  Split
                    ↓
        ┌─────────────────────────┐
        │  DIVE DROP              │
        │  Commission: ₪40        │
        │  (includes Stripe fee)  │
        └─────────────────────────┘
        
        ┌─────────────────────────┐
        │  Service Provider       │
        │  Net: ₪460              │
        │  (after commission)     │
        └─────────────────────────┘
```

### Example 2: Group Dive (Multiple Divers)

```
Scenario: 3 divers book a boat dive for ₪1,500 total

┌──────────────────────────────────┐
│ 3 Divers each pay  ₪500          │
│ Total           = ₪1,500         │
└──────────────────────────────────┘
            ↓
┌──────────────────────────────────┐
│ Gross Amount:     ₪1,500         │
│ Commission (8%):    ₪120         │
│ Net Payout:       ₪1,380         │
└──────────────────────────────────┘
            ↓
        ┌─────────────┐
        │ Provider    │
        │ gets: ₪1,380│
        └─────────────┘
```

### Example 3: High-Value Premium Dive

```
Scenario: Technical dive for ₪3,000

Current Rate (8%):
┌────────────────────────┐
│ Gross:          ₪3,000 │
│ Commission (8%):  ₪240 │
│ Net:            ₪2,760 │
└────────────────────────┘

Optional: Tiered Rate (6% for bookings > ₪1,000):
┌────────────────────────┐
│ Gross:          ₪3,000 │
│ Commission (6%):  ₪180 │
│ Net:            ₪2,820 │
└────────────────────────┘
(Provider gets ₪60 more)
```

---

## Commission Breakdown

### What's Included in the 8% Commission?

| Component | Cost | Notes |
|-----------|------|-------|
| Stripe Payment Processing | 2.9% + ₪1.10 | Per transaction |
| Stripe Connect Fee | ~0.5% | Account management |
| DIVE DROP Platform | 4-5% | Matching, support, infrastructure |
| **Total** | **8%** | |

### Why 8% is Competitive

| Platform | Commission | Notes |
|----------|-----------|-------|
| DIVE DROP | 8% | Our rate |
| Airbnb | 15% | Host + guest |
| TaskRabbit | 20% | Service + payments |
| Uber | 25% | Ride-sharing |
| Traditional Dive Shop | 0% | But no marketing/matching |

---

## Monthly Earnings Projection

### Scenario: Small Dive Guide

```
Setup:
- 2 dives per week
- ₪500 per dive
- ₪1,000 per week

Monthly:
┌─────────────────────────────────┐
│ Bookings (8 × ₪1,000)  ₪8,000  │
│ Commission (8%)        -₪640   │
│ Net Monthly Income      ₪7,360  │
└─────────────────────────────────┘

Compared to:
- Tourist guide: ₪3,000-5,000/month
- Dive instructor: ₪5,000-8,000/month
- DIVE DROP provider: ₪7,360+/month
```

### Scenario: Established Boat Operator

```
Setup:
- 4 boat dives per week
- 6 divers per dive
- ₪600 per diver

Monthly:
┌────────────────────────────────────┐
│ Bookings:                          │
│ 4 dives × 6 divers × ₪600         │
│ = 24 spots × ₪600 = ₪14,400       │
│                                    │
│ Commission (8%)       -₪1,152      │
│ Net Monthly Income     ₪13,248     │
└────────────────────────────────────┘

With volume discount (6% on > ₪10k):
│ Commission (6%)       -₪864        │
│ Net Monthly Income     ₪13,536     │
│ Extra savings:        +₪288/month  │
└────────────────────────────────────┘
```

---

## Refund Commission Impact

### Scenario: Diver Cancels Within 24h

```
Original Booking:
├─ Gross: ₪500
├─ Commission: ₪40
└─ Net: ₪460

Refund Processing:
├─ Diver refunded: ₪500 (full)
├─ Provider loses net: -₪460
├─ DIVE DROP refunds commission: -₪40
└─ Net: ₪0 (all parties even)
```

### Scenario: Dispute/Chargeback

```
Original Booking:
├─ Gross: ₪500
├─ Commission: ₪40
└─ Net: ₪460

Chargeback:
├─ Diver dispute initiated
├─ Payment reversed: -₪500
├─ Stripe chargeback fee: -₪50
├─ Provider loses: -₪460
├─ DIVE DROP loses commission + fee: -₪90
└─ Total cost: ₪540 (both parties impacted)
```

---

## Tax Implications

### Service Provider (Israel)

**Income Tax:**
```
Monthly Income: ₪13,248

Tax Calculation (approximately):
├─ Business Expenses: -₪2,000
├─ Taxable Income: ₪11,248
├─ Income Tax (10-20%): -₪1,687
├─ National Insurance (7-8%): -₪1,000
└─ Net After Tax: ~₪8,561
```

**VAT:**
- If VAT registered: Add 21% to pricing or reduce net
- If not registered: No VAT

**Example with VAT:**
```
Price per diver: ₪500

If VAT registered:
├─ Price before VAT: ₪413
├─ VAT (21%): ₪87
├─ Total to diver: ₪500
├─ Commission (8%): -₪41.04
├─ Net to provider: ₪372
└─ Provider must pay VAT: ₪87
```

### DIVE DROP (Platform)

**Commission Revenue:**
```
Commission (8% of all bookings): Taxable income

Example:
├─ Total transaction volume: ₪1,000,000/month
├─ Commission (8%): ₪80,000
├─ Business expenses: -₪20,000
├─ Taxable income: ₪60,000
├─ Corporate tax (25%): -₪15,000
└─ Net income: ₪45,000
```

---

## Different Pricing Models (Comparison)

### Model A: Fixed 8% (Recommended)

**Pros:**
- Simple & transparent
- Easy to calculate
- Industry standard

**Cons:**
- High earners pay same rate
- May deter expensive services

**Example:**
```
₪500 dive  → 8% = ₪40 commission
₪5000 dive → 8% = ₪400 commission
```

### Model B: Tiered Commission

```
₪100-1,000:      8% commission
₪1,001-5,000:    6% commission
₪5,001+:         4% commission
```

**Pros:**
- Encourages high-value bookings
- Rewards loyal providers

**Cons:**
- More complex
- Harder to explain

**Example:**
```
Small dive (₪500)    → 8% = ₪40
Large dive (₪3,000)  → 6% = ₪180
Tech dive (₪10,000)  → 4% = ₪400
```

### Model C: Flat Fee + Percentage

```
Base fee: ₪20 per booking
Plus: 4% of booking amount
```

**Pros:**
- Covers fixed costs
- Reduces incentive for cheap bookings

**Cons:**
- Less intuitive
- Harder to explain

**Example:**
```
₪500 dive:  ₪20 + (₪500 × 4%) = ₪40 total
₪5000 dive: ₪20 + (₪5000 × 4%) = ₪220 total
```

### Model D: Free for Providers (Diver-Side Markup)

```
Diver pays extra platform fee
Platform keeps fees (not commission)
```

**Pros:**
- Attracts providers
- Transparent to diver

**Cons:**
- Diver friction
- Less revenue if diver avoids fee

**Example:**
```
Dive cost: ₪500
Platform fee: 8% = ₪40
Diver pays total: ₪540
Provider gets: ₪500 (100%)
```

**Recommendation:** Stick with **Model A (8% fixed)** - most transparent and sustainable.

---

## Revenue Projections (Year 1)

### Conservative Scenario

```
Month 1-3:
├─ Monthly bookings: ₪50,000
├─ Monthly commission: ₪4,000
└─ Quarterly: ₪12,000

Month 4-6:
├─ Monthly bookings: ₪150,000
├─ Monthly commission: ₪12,000
└─ Quarterly: ₪36,000

Month 7-9:
├─ Monthly bookings: ₪300,000
├─ Monthly commission: ₪24,000
└─ Quarterly: ₪72,000

Month 10-12:
├─ Monthly bookings: ₪500,000
├─ Monthly commission: ₪40,000
└─ Quarterly: ₪120,000

Year 1 Total: ₪240,000
```

### Aggressive Scenario

```
Month 1-3:
├─ Monthly bookings: ₪200,000
├─ Monthly commission: ₪16,000
└─ Quarterly: ₪48,000

Month 4-6:
├─ Monthly bookings: ₪500,000
├─ Monthly commission: ₪40,000
└─ Quarterly: ₪120,000

Month 7-9:
├─ Monthly bookings: ₪1,000,000
├─ Monthly commission: ₪80,000
└─ Quarterly: ₪240,000

Month 10-12:
├─ Monthly bookings: ₪1,500,000
├─ Monthly commission: ₪120,000
└─ Quarterly: ₪360,000

Year 1 Total: ₪768,000
```

---

## Break-Even Analysis

### Monthly Operating Costs

```
DIVE DROP Monthly Costs:
├─ Stripe fees (on commissions)         ₪500
├─ Infrastructure/hosting              ₪2,000
├─ Salaries (1 part-time)              ₪4,000
├─ Customer support                    ₪1,000
├─ Marketing                           ₪2,000
├─ Admin/legal/accounting              ₪1,000
└─ Total Monthly: ₪10,500
```

### Break-Even Point

```
Revenue needed: ₪10,500 / 0.08 = ₪131,250
(Monthly transaction volume to break even)

If average booking: ₪500
Bookings needed: ₪131,250 / ₪500 = 263 bookings

Realistic timeline:
├─ Month 1-2: Startup phase, negative
├─ Month 3: Break-even territory
├─ Month 4+: Profitable
```

---

## Commission Audit Trail

### Example Transaction Audit

```json
{
  "booking_id": "uuid-12345",
  "timestamp": "2026-06-23T14:30:00Z",
  "transaction": {
    "diver_id": "user-456",
    "service_provider_id": "provider-789",
    "amount_cents": 50000,
    "currency": "ILS"
  },
  "commission": {
    "rate": 0.08,
    "amount_cents": 4000,
    "calculation": "50000 × 0.08 = 4000",
    "timestamp": "2026-06-23T14:30:15Z"
  },
  "payout": {
    "status": "pending",
    "provider_net_cents": 46000,
    "dive_drop_commission_cents": 4000,
    "payout_date": "2026-06-24",
    "payout_method": "stripe_connect"
  },
  "verification": {
    "gross": 50000,
    "commission": 4000,
    "net": 46000,
    "valid": true
  }
}
```

---

## FAQ

**Q: Why 8% and not lower?**
A: 8% covers Stripe processing (~3%), platform infrastructure (~4%), and customer support (~1%). This is competitive vs. traditional marketplaces (10-20%).

**Q: Can service providers negotiate commission?**
A: Not initially. After ₪50,000+ volume, negotiate volume discounts (6-7%).

**Q: What about currency conversion?**
A: International bookings pay 8% + currency conversion fees. Recommend pricing in ILS.

**Q: Do divers see the commission?**
A: No. Divers see total price. Providers see net payout after commission.

**Q: Can commission rates change?**
A: Yes, but only with 30-day notice. Old rates apply to already-paid bookings.

**Q: How are chargebacks handled?**
A: Both parties lose. Provider loses net, DIVE DROP loses commission + ₪50 chargeback fee.

---

## Excel Template for Providers

```
Monthly Revenue Calculator

┌────────────────────────────────────────┐
│ REVENUE PROJECTIONS                    │
├────────────────────────────────────────┤
│ Dives per week:        ____ dives     │
│ Divers per dive:       ____ divers     │
│ Price per diver:       ₪____           │
│ Weeks per month:       4 weeks         │
│                                        │
│ Monthly Gross:                         │
│   = dives × divers × price × weeks    │
│   = ____ × ____ × ₪____ × 4           │
│   = ₪________                         │
│                                        │
│ DIVE DROP Commission (8%):             │
│   = ₪________ × 0.08                  │
│   = -₪________                        │
│                                        │
│ Monthly Net Income:                    │
│   = ₪________ - ₪________             │
│   = ₪________                         │
│                                        │
│ Less taxes (~20-30%):                  │
│   = -₪________                        │
│                                        │
│ Monthly Take-Home:                     │
│   = ₪________                         │
└────────────────────────────────────────┘
```

---

## Payment Reconciliation

### Daily Reconciliation

```sql
-- Verify commission calculation
SELECT
  booking_id,
  amount_cents as gross,
  commission_amount_cents as commission,
  net_payout_cents as net,
  (amount_cents - commission_amount_cents - net_payout_cents) as variance
FROM commission_records
WHERE variance != 0
-- Should return 0 rows if all correct
```

### Monthly Report

```
DIVE DROP Commission Report - June 2026

┌─────────────────────────────────────┐
│ Transaction Volume                  │
├─────────────────────────────────────┤
│ Total Bookings:           ₪543,210  │
│ Number of Bookings:            257  │
│ Average Booking:           ₪2,114   │
│                                     │
│ Commission Breakdown                │
├─────────────────────────────────────┤
│ Gross Volume:            ₪543,210  │
│ Commission Rate:               8%   │
│ Total Commission:         ₪43,457   │
│                                     │
│ Stripe Fees                         │
├─────────────────────────────────────┤
│ Processing Fees:           ₪18,956  │
│ Chargeback Fees:            ₪2,100  │
│                                     │
│ Net Revenue (After Fees)  ₪22,401   │
└─────────────────────────────────────┘
```

This architecture ensures transparency, fairness, and sustainability for all parties.
