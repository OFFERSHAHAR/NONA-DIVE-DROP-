# Equipment Rental & Commission System - Testing Guide

## Pre-Test Setup

### 1. Database Migration
```bash
# Run migration to create all tables
supabase migration up

# Verify tables created
supabase db info
```

### 2. Seed Test Data
```sql
-- Create test equipment
INSERT INTO equipment (name, category, daily_price_cents, condition_rating, available_for_rental)
VALUES
  ('Wetsuit XXL', 'wetsuit', 5000, 5, true),
  ('BCD Size L', 'bcd', 3000, 4, true),
  ('Regulator Set', 'regulator', 8000, 5, true),
  ('Fins Size 10', 'fins', 2000, 5, true);

-- Create test user accounts (in auth.users)
-- Admin account (for analytics)
-- Lister account 1 (equipment owner)
-- Renter account 1 (renter)
-- Renter account 2 (second renter for damage test)
```

### 3. Create Equipment Listings
```bash
# Use the admin dashboard to create listings, or:
INSERT INTO equipment_listings (
  lister_id,
  equipment_id,
  daily_price_cents,
  commission_rate,
  is_available,
  available_quantity
) VALUES (
  'lister-uuid',
  'equipment-uuid',
  5000,
  0.10,
  true,
  3
);
```

## Test Scenarios

### Test 1: Create Equipment Rental

#### Objective
Verify that a renter can create an equipment rental booking with correct financial calculations.

#### Steps
1. **Login as Renter**
   ```
   User ID: renter-uuid-1
   ```

2. **Create Rental**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/create \
     -H "Content-Type: application/json" \
     -H "Cookie: auth-token=..." \
     -d '{
       "listing_id": "listing-uuid",
       "start_date": "2026-07-01T00:00:00Z",
       "end_date": "2026-07-08T00:00:00Z",
       "insurance_enabled": true,
       "notes": "Will pick up at 10am"
     }'
   ```

3. **Verify Response**
   - Status: 201
   - `rental.id` is UUID
   - `rental.rental_days` = 7
   - `rental.subtotal` = ₪350.00 (7 days × 50₪)
   - `rental.insurance` = ₪20.00 (if enabled)
   - `rental.rental_cost` = ₪370.00 (subtotal + insurance)
   - `rental.commission_breakdown.commission_amount` = ₪37.00 (10% of 370)
   - `rental.commission_breakdown.to_lister` = ₪333.00 (370 - 37)
   - `rental.status` = "pending"

4. **Check Database**
   ```sql
   SELECT * FROM equipment_rentals WHERE id = 'rental-uuid';
   SELECT * FROM rental_commissions WHERE rental_id = 'rental-uuid';
   ```
   - Rental exists with correct amounts
   - Commission record created with status "pending"

#### Expected Results
✅ Rental created with accurate financial calculations
✅ Commission record created automatically
✅ All amounts in cents stored correctly

---

### Test 2: Check Date Conflicts

#### Objective
Verify that overlapping rental dates are prevented.

#### Setup
- Rental 1: 2026-07-01 to 2026-07-08 (confirmed)
- Rental 2: 2026-07-05 to 2026-07-12 (overlaps with Rental 1)

#### Steps
1. **Create Rental 1** (from Test 1)
2. **Confirm Rental 1** (simulate payment)
   ```sql
   UPDATE equipment_rentals
   SET status = 'confirmed'
   WHERE id = 'rental-uuid-1';
   ```

3. **Attempt Rental 2**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/create \
     -H "Content-Type: application/json" \
     -d '{
       "listing_id": "listing-uuid",
       "start_date": "2026-07-05T00:00:00Z",
       "end_date": "2026-07-12T00:00:00Z"
     }'
   ```

4. **Verify Error**
   - Status: 409
   - Message: "Equipment is already booked for those dates"

#### Expected Results
✅ Conflicting dates are rejected
✅ System prevents double-booking

---

### Test 3: Lister Account Summary

#### Objective
Verify lister can view their commission account and pending payments.

#### Steps
1. **Login as Lister**
   ```
   User ID: lister-uuid
   ```

2. **Get Account Summary**
   ```bash
   curl http://localhost:3000/api/equipment/commissions/my-account \
     -H "Cookie: auth-token=..."
   ```

3. **Verify Response Contains**
   - `account.balance_owed` = ₪37.00 (pending commission)
   - `account.unpaid_commissions` = ₪37.00
   - `this_month.total_commission` = ₪37.00
   - `this_month.pending` = ₪37.00 (not yet invoiced)
   - `this_month.paid` = ₪0.00
   - `pending_invoices` = empty (invoices not generated yet)

#### Expected Results
✅ Lister sees accurate commission amounts
✅ Pending vs. paid breakdown correct
✅ Account balance reflects owed amount

---

### Test 4: Generate Invoice (Manual)

#### Objective
Simulate end-of-month invoice generation.

#### Steps
1. **Manually Create Invoice**
   ```sql
   INSERT INTO rental_invoices (
     lister_id,
     invoice_month,
     invoice_number,
     total_commission_cents,
     rental_count,
     due_date,
     status
   ) VALUES (
     'lister-uuid',
     '2026-06-01',
     'INV-202406-001',
     3700,
     1,
     '2026-07-07',
     'draft'
   );
   ```

2. **Create Line Items**
   ```sql
   INSERT INTO rental_invoice_line_items (
     invoice_id,
     commission_id,
     item_type,
     description,
     amount_cents
   ) VALUES (
     'invoice-uuid',
     'commission-uuid',
     'rental_commission',
     'Wetsuit rental 7 days',
     3700
   );
   ```

3. **Mark as Sent**
   ```sql
   UPDATE rental_invoices
   SET status = 'sent', sent_at = NOW()
   WHERE id = 'invoice-uuid';
   ```

4. **Update Commission Status**
   ```sql
   UPDATE rental_commissions
   SET status = 'invoiced', invoice_id = 'invoice-uuid'
   WHERE rental_id = 'rental-uuid';
   ```

#### Expected Results
✅ Invoice created with correct line items
✅ Commission status changed to "invoiced"
✅ Invoice visible in lister's invoice list

---

### Test 5: Get Invoices

#### Objective
Verify lister can view all invoices with payment status.

#### Steps
1. **Get Invoices List**
   ```bash
   curl http://localhost:3000/api/equipment/commissions/invoices \
     -H "Cookie: auth-token=..."
   ```

2. **Verify Response**
   - `summary.total_invoices` = 1
   - `summary.outstanding` = ₪37.00
   - `summary.total_paid` = ₪0.00
   - `invoices[0].invoice_number` = "INV-202406-001"
   - `invoices[0].summary.total` = ₪37.00
   - `invoices[0].status.badge` = "📬 PENDING PAYMENT"
   - `invoices[0].status.action_required` = true

#### Expected Results
✅ Invoices displayed with accurate amounts
✅ Status badges show action required
✅ Payment breakdown includes line items

---

### Test 6: Request Bit Payment

#### Objective
Verify lister can request payment via Bit (QR code generation).

#### Steps
1. **Request Payment**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/commissions/invoice-uuid/pay-via-bit \
     -H "Cookie: auth-token=..."
   ```

2. **Verify Response**
   - Status: 201
   - `payment_request.amount.display` = "₪37.00"
   - `payment_request.payment_link` exists
   - `payment_request.qr_code` is base64 encoded image
   - `payment_request.expires_at` is 24 hours from now
   - `payment_request.status` = "pending"

3. **Check Database**
   ```sql
   SELECT * FROM rental_commission_payment_requests
   WHERE invoice_id = 'invoice-uuid';
   ```
   - Payment request stored
   - Status = pending
   - Expiration time = 24 hours

#### Expected Results
✅ Payment request created
✅ Bit API integration works
✅ QR code and link generated
✅ Payment request stored in database

---

### Test 7: Report Equipment Damage

#### Objective
Verify lister can report damage and charge renter.

#### Setup
- Rental with status "returned"

#### Steps
1. **Mark Rental as Returned**
   ```sql
   UPDATE equipment_rentals
   SET status = 'returned', returned_at = NOW()
   WHERE id = 'rental-uuid';
   ```

2. **Report Damage**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/rental-uuid/charge-damage \
     -H "Content-Type: application/json" \
     -H "Cookie: auth-token=..." \
     -d '{
       "damage_description": "Small rip in the fabric",
       "severity": "moderate",
       "repair_cost_cents": 15000,
       "charge_cents": 15000,
       "photo_evidence_urls": [
         "https://example.com/damage1.jpg"
       ],
       "notes": "Damage from sharp coral"
     }'
   ```

3. **Verify Response**
   - Status: 201
   - `damage_assessment.severity` = "moderate"
   - `damage_assessment.charge_issued` = ₪150.00
   - `damage_assessment.commission_on_damage.rate` = "10%"
   - `damage_assessment.commission_on_damage.cents` = 1500
   - `damage_assessment.total_owed_to_dive_drop` = ₪15.00

4. **Check Database**
   ```sql
   SELECT * FROM rental_damage_assessments
   WHERE rental_id = 'rental-uuid';
   
   SELECT * FROM lister_account_balance
   WHERE lister_id = 'lister-uuid';
   ```
   - Damage assessment created
   - Account balance updated with damage commission
   - `unpaid_damage_charges_cents` increased

#### Expected Results
✅ Damage reported and assessed
✅ Damage commission calculated correctly
✅ Lister account balance updated
✅ Charge added to pending invoices

---

### Test 8: Admin Analytics

#### Objective
Verify admin can view commission analytics.

#### Steps
1. **Get Analytics (Monthly)**
   ```bash
   curl http://localhost:3000/api/admin/equipment/analytics?period=month \
     -H "Cookie: auth-token=..." \
     -H "X-Admin-Token: admin-secret"
   ```

2. **Verify Response**
   - `summary.total_rental_revenue` = ₪370.00
   - `summary.total_commissions` = ₪37.00
   - `summary.commission_breakdown.pending` = ₪37.00 (not yet paid)
   - `rental_metrics.completed_rentals` = 0
   - `rental_metrics.active_rentals` = 1
   - `top_equipment` contains "Wetsuit XXL"
   - `daily_breakdown` has entries for each day

3. **Test Other Periods**
   ```bash
   # Weekly
   curl http://localhost:3000/api/admin/equipment/analytics?period=week
   
   # Yearly
   curl http://localhost:3000/api/admin/equipment/analytics?period=year
   ```

#### Expected Results
✅ Analytics correctly aggregated
✅ Multiple period options work
✅ Top performers calculated
✅ Daily breakdown accurate

---

### Test 9: Payment Reception (Webhook Simulation)

#### Objective
Verify payment status updates when lister pays via Bit.

#### Steps
1. **Simulate Payment Completion**
   ```sql
   -- Update payment request
   UPDATE rental_commission_payment_requests
   SET status = 'completed', paid_at = NOW()
   WHERE id = 'payment-request-uuid';
   
   -- Update invoice
   UPDATE rental_invoices
   SET status = 'paid', payment_received_at = NOW(), payment_amount_cents = 3700
   WHERE id = 'invoice-uuid';
   
   -- Update commission
   UPDATE rental_commissions
   SET status = 'paid', payment_received_at = NOW()
   WHERE id = 'commission-uuid';
   ```

2. **Update Lister Balance** (via trigger or manual)
   ```sql
   UPDATE lister_account_balance
   SET
     balance_owed_cents = balance_owed_cents - 3700,
     unpaid_commissions_cents = unpaid_commissions_cents - 3700,
     paid_to_date_cents = paid_to_date_cents + 3700,
     last_payment_at = NOW(),
     last_payment_amount_cents = 3700
   WHERE lister_id = 'lister-uuid';
   ```

3. **Verify Lister Account**
   ```bash
   curl http://localhost:3000/api/equipment/commissions/my-account
   ```
   - `account.balance_owed` = ₪0.00
   - `account.paid_to_date` increased
   - `this_month.paid` = ₪37.00

4. **Verify Invoice Status**
   ```bash
   curl http://localhost:3000/api/equipment/commissions/invoices
   ```
   - Invoice status = "paid"
   - `status.badge` shows "✅ PAID"
   - `outstanding` amount = ₪0.00

#### Expected Results
✅ Payment marked as complete
✅ Lister balance updated correctly
✅ Invoice shows paid status
✅ All amounts reconcile

---

## Edge Cases & Error Handling

### Test 10: Invalid Dates

#### Objective
Verify date validation.

#### Test Cases
1. **End date before start date**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/create \
     -d '{
       "listing_id": "uuid",
       "start_date": "2026-07-08T00:00:00Z",
       "end_date": "2026-07-01T00:00:00Z"
     }'
   ```
   Expected: 400, "End date must be after start date"

2. **Past start date**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/create \
     -d '{
       "listing_id": "uuid",
       "start_date": "2026-06-01T00:00:00Z",
       "end_date": "2026-06-08T00:00:00Z"
     }'
   ```
   Expected: 400, "Start date cannot be in the past"

---

### Test 11: Unauthorized Access

#### Objective
Verify authorization checks.

#### Test Cases
1. **Lister accessing another lister's invoice**
   ```bash
   curl http://localhost:3000/api/equipment/commissions/invoices \
     -H "User-ID: lister-uuid-2"
   ```
   Expected: Only invoices for lister-uuid-2

2. **Renter trying to report damage**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/uuid/charge-damage \
     -H "User-ID: renter-uuid"
     -d '...'
   ```
   Expected: 403, "Only the lister can report damage"

---

### Test 12: Damage Charge Validation

#### Objective
Verify damage charge validations.

#### Test Cases
1. **Charge less than cost** (Lister is generous)
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/uuid/charge-damage \
     -d '{
       "severity": "moderate",
       "repair_cost_cents": 15000,
       "charge_cents": 5000  # Less than repair cost
     }'
   ```
   Expected: 200 (allowed, lister's choice)

2. **Charge way above typical range**
   ```bash
   curl -X POST http://localhost:3000/api/equipment/rentals/uuid/charge-damage \
     -d '{
       "severity": "minor",
       "repair_cost_cents": 100000  # Way above minor range
       "charge_cents": 100000
     }'
   ```
   Expected: 200 (allowed, but with warning in response)

---

## Performance Tests

### Test 13: Load Test - Create Multiple Rentals

#### Objective
Verify system can handle concurrent rental creation.

#### Steps
```bash
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/equipment/rentals/create \
    -H "Content-Type: application/json" \
    -d "{
      \"listing_id\": \"listing-uuid\",
      \"start_date\": \"2026-07-$(printf "%02d" $((i+1)))T00:00:00Z\",
      \"end_date\": \"2026-07-$(printf "%02d" $((i+8)))T00:00:00Z\"
    }" &
done
wait
```

#### Expected Results
✅ All 100 rentals created successfully
✅ No duplicate bookings
✅ Response times < 500ms

---

## Test Checklist

- [ ] Test 1: Create Equipment Rental
- [ ] Test 2: Check Date Conflicts
- [ ] Test 3: Lister Account Summary
- [ ] Test 4: Generate Invoice
- [ ] Test 5: Get Invoices
- [ ] Test 6: Request Bit Payment
- [ ] Test 7: Report Damage
- [ ] Test 8: Admin Analytics
- [ ] Test 9: Payment Reception
- [ ] Test 10: Invalid Dates
- [ ] Test 11: Unauthorized Access
- [ ] Test 12: Damage Charge Validation
- [ ] Test 13: Load Test

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Database backups configured
- [ ] Payment webhook endpoints configured
- [ ] Email templates created (invoice, payment reminder)
- [ ] Admin access controls implemented
- [ ] Logging configured
- [ ] Error alerting setup
- [ ] RLS policies enabled and tested
- [ ] Commission rates configured
- [ ] Invoice generation schedule configured

---

**Last Updated**: 2026-06-20
