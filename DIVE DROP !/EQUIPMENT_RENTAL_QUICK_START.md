# Equipment Rental & Commission System - Quick Start Guide

## ⚡ Get Started in 5 Minutes

### Step 1: Database Migration (2 min)

```bash
# Run the migration to create all tables
supabase migration up

# Or manually in Supabase SQL editor:
# Copy/paste contents of: supabase/migrations/20260620_create_equipment_rental_commission_system.sql
```

✅ **Result**: 9 new tables created with RLS policies

---

### Step 2: Create Test Equipment (1 min)

```sql
INSERT INTO equipment (name, category, daily_price_cents, condition_rating)
VALUES
  ('Wetsuit XXL', 'wetsuit', 5000, 5),
  ('BCD Size L', 'bcd', 3000, 4),
  ('Regulator Set', 'regulator', 8000, 5);
```

✅ **Result**: Test equipment ready to rent

---

### Step 3: Create Equipment Listing (1 min)

```sql
INSERT INTO equipment_listings (
  lister_id,
  equipment_id,
  daily_price_cents,
  commission_rate,
  is_available,
  available_quantity
)
SELECT 
  'YOUR_LISTER_UUID',
  id,
  daily_price_cents,
  0.10,  -- 10% commission
  true,
  5
FROM equipment WHERE category = 'wetsuit' LIMIT 1;
```

✅ **Result**: Equipment ready to be rented

---

### Step 4: Test API Endpoint (1 min)

```bash
curl -X POST http://localhost:3000/api/equipment/rentals/create \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": "YOUR_LISTING_UUID",
    "start_date": "2026-07-01T00:00:00Z",
    "end_date": "2026-07-08T00:00:00Z",
    "insurance_enabled": true
  }'
```

**Response:**
```json
{
  "success": true,
  "rental": {
    "id": "rental-uuid",
    "rental_days": 7,
    "daily_price": "₪50.00",
    "subtotal": "₪350.00",
    "rental_cost": "₪370.00",
    "commission_breakdown": {
      "commission_amount": "₪37.00",
      "to_lister": "₪333.00"
    }
  }
}
```

✅ **Result**: Rental created with correct commission calculation

---

### Step 5: Check Lister Account (1 min)

```bash
curl http://localhost:3000/api/equipment/commissions/my-account
```

**Response shows:**
- Balance owed: ₪37.00
- Pending commission: ₪37.00
- Monthly totals
- Pending invoices

✅ **Result**: Commission tracking working

---

## 🎯 Key API Endpoints Quick Reference

### Create Rental
```
POST /api/equipment/rentals/create
{
  "listing_id": "uuid",
  "start_date": "ISO datetime",
  "end_date": "ISO datetime",
  "insurance_enabled": true
}
```

### Get Account Summary
```
GET /api/equipment/commissions/my-account
```

### Get Invoices
```
GET /api/equipment/commissions/invoices
```

### Pay Invoice
```
POST /api/equipment/commissions/{invoiceId}/pay-via-bit
```

### Report Damage
```
POST /api/equipment/rentals/{rentalId}/charge-damage
{
  "damage_description": "...",
  "severity": "moderate",
  "repair_cost_cents": 15000
}
```

### Admin Analytics
```
GET /api/admin/equipment/analytics?period=month
```

---

## 💡 Common Scenarios

### Scenario 1: Renter Books Equipment
```bash
# 1. Create rental
curl -X POST /api/equipment/rentals/create ...

# 2. Renter sees: "Total: ₪370.00, You'll pay ₪420.00 (including deposit)"
# 3. Renter clicks "Pay with Bit"
# 4. System creates payment request
# 5. Renter scans QR code
# 6. Payment completes
# 7. Rental status → confirmed
```

### Scenario 2: Lister Pays Commission
```bash
# 1. Lister logs in
curl GET /api/equipment/commissions/my-account
# Response: "Balance owed: ₪37.00"

# 2. Lister clicks "Pay"
curl POST /api/equipment/commissions/invoice-id/pay-via-bit
# Response: { "qr_code": "...", "payment_link": "..." }

# 3. Lister scans QR code in Bit app
# 4. Pays ₪37.00
# 5. Webhook confirms payment
# 6. Lister balance → ₪0.00
```

### Scenario 3: Report Equipment Damage
```bash
# After equipment returned, if damaged:
curl POST /api/equipment/rentals/rental-id/charge-damage \
  -d '{
    "damage_description": "Rip in wetsuit",
    "severity": "moderate",
    "repair_cost_cents": 15000
  }'

# Response: {
#   "charge_issued": "₪150.00",
#   "commission_on_damage": "₪15.00",
#   "total_owed_to_dive_drop": "₪15.00"
# }
```

---

## 📊 Commission Calculation Quick Reference

### Formula
```
Rental Cost = Daily Price × Rental Days + Insurance
Commission = Rental Cost × Commission Rate
Lister Receives = Rental Cost - Commission
DIVE DROP Gets = Commission
```

### Example
```
Daily Rate: 50₪
Days: 7
Insurance: 20₪
Commission Rate: 10%

Rental Cost: (50 × 7) + 20 = 370₪
Commission: 370 × 10% = 37₪
Lister Gets: 370 - 37 = 333₪
DIVE DROP Gets: 37₪
```

---

## 🔧 Configuration

### Change Commission Rate
```sql
UPDATE equipment_listings
SET commission_rate = 0.15  -- 15%
WHERE id = 'listing-uuid';
```

### Change Invoice Due Date
```sql
UPDATE rental_invoices
SET due_date = CURRENT_DATE + INTERVAL '14 days'  -- 14 days instead of 7
WHERE status = 'draft';
```

### Suspend Lister for Non-Payment
```sql
UPDATE lister_account_balance
SET is_suspended = true, suspension_reason = 'Non-payment of commission'
WHERE lister_id = 'lister-uuid';
```

---

## 🧪 Quick Tests

### Test 1: Date Conflict Detection
```bash
# Create rental 1
curl -X POST /api/equipment/rentals/create \
  -d '{"listing_id": "uuid", "start_date": "2026-07-01T00:00:00Z", "end_date": "2026-07-08T00:00:00Z"}'

# Confirm rental 1
sqlite3 app.db "UPDATE equipment_rentals SET status='confirmed'"

# Try to create overlapping rental 2
curl -X POST /api/equipment/rentals/create \
  -d '{"listing_id": "uuid", "start_date": "2026-07-05T00:00:00Z", "end_date": "2026-07-12T00:00:00Z"}'

# Expected: 409 "Equipment is already booked for those dates"
```

### Test 2: Commission Calculation Accuracy
```bash
# Create rental for 10 days at 100₪/day with 10% commission
# Expected: 1000₪ rental, 100₪ commission

curl -X POST /api/equipment/rentals/create \
  -d '{
    "listing_id": "uuid",
    "start_date": "2026-07-01T00:00:00Z",
    "end_date": "2026-07-11T00:00:00Z"
  }'

# Verify in response:
# "subtotal": "₪1000.00"
# "commission_amount": "₪100.00"
# "to_lister": "₪900.00"
```

### Test 3: Payment Webhook
```bash
# Simulate payment completion
curl -X POST /api/webhooks/equipment-rental-payments \
  -H "x-bit-signature: YOUR_SIGNATURE" \
  -d '{
    "type": "payment.completed",
    "request_id": "req_123",
    "transaction_id": "txn_abc",
    "amount": 3700,
    "timestamp": "2026-06-20T12:00:00Z"
  }'

# Check database:
# SELECT * FROM rental_commission_payment_requests WHERE status='completed';
```

---

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| `EQUIPMENT_RENTAL_COMMISSION_SYSTEM.md` | Complete system documentation |
| `EQUIPMENT_RENTAL_TESTING_GUIDE.md` | 13 test scenarios |
| `EQUIPMENT_RENTAL_DEPLOYMENT.md` | Deployment instructions |

---

## ❓ FAQ

### Q: How much commission do I charge?
**A**: Default is 10% (0.10), configurable per listing.

### Q: When is commission due?
**A**: Monthly invoices generated at month-end. Listers have 7 days to pay.

### Q: Can I charge for damage?
**A**: Yes, report damage after rental returned. Commission applies to damage charges too.

### Q: What if renter doesn't return equipment?
**A**: Update rental status to 'dispute' and handle manually.

### Q: Can I change pricing mid-rental?
**A**: No, price locked when rental created. Change pricing for new rentals only.

### Q: How do payments work?
**A**: Renters pay equipment cost via Bit. Listers then pay commission to DIVE DROP via Bit.

### Q: Is commission taken from renter or lister?
**A**: From lister's rental revenue. Renter pays full equipment cost.

---

## 🆘 Troubleshooting

### Problem: "Equipment is already booked"
**Solution**: Check dates - another rental exists for those dates. Choose different dates or different equipment.

### Problem: Commission not calculated
**Solution**: Verify `commission_rate` is set on listing (default is 0.10). Check database:
```sql
SELECT commission_rate FROM equipment_listings WHERE id = 'uuid';
```

### Problem: Payment webhook not received
**Solution**: 
1. Check `BIT_WEBHOOK_SECRET` environment variable
2. Verify webhook URL in Bit dashboard
3. Check webhook logs in Bit dashboard

### Problem: Invoice not showing
**Solution**: Invoices generated monthly. Create multiple rentals to see monthly invoice pattern.

---

## ✅ You're Ready!

The system is set up and working. Next steps:

1. **Browse Documentation**: Read main guide for details
2. **Run Tests**: Follow testing guide for comprehensive verification
3. **Configure**: Set commission rates and payment terms
4. **Deploy**: Follow deployment guide for production

---

**Quick Start Complete!** 🚀

For more details, see EQUIPMENT_RENTAL_COMMISSION_SYSTEM.md
