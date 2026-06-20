# Equipment Rental & Commission Payment System

## Overview

Complete system for managing equipment rentals with automatic commission tracking and payment processing. DIVE DROP takes a commission from listers' rental revenue and invoices them monthly.

## System Architecture

### Payment Flow

```
1. Renter Books Equipment
   └─> System calculates financials
   └─> Creates rental record (pending)
   └─> Creates commission record

2. Renter Pays via Bit
   └─> Full rental cost goes to Lister
   └─> Rental status → confirmed
   └─> Commission status → pending

3. Monthly Settlement
   └─> System generates invoices to listers
   └─> Commission owed = rental_cost × commission_rate
   └─> Creates invoice with line items

4. Lister Pays Commission
   └─> Lister clicks "Pay" button
   └─> Generates Bit payment request (QR + link)
   └─> Payment received → Commission status → paid
```

### Example Transaction

```
Equipment: Wetsuit - 50₪/day
Rental: 7 days
Commission Rate: 10%

Renter Pays:    350₪ (to Lister)
Lister Receives: 350₪ (minus commission)
Commission:      35₪ (10% of 350₪)
Lister Owes DIVE DROP: 35₪
```

## Database Schema

### Core Tables

#### `equipment_listings`
- Lister's equipment available for rent
- `daily_price_cents`: Rental rate (in cents)
- `commission_rate`: % taken by DIVE DROP
- `is_available`: Availability status
- `available_quantity`: How many units available

#### `equipment_rentals`
- Individual rental bookings
- `rental_cost_cents`: Total rental amount
- `commission_rate`: Applicable commission
- `status`: pending → confirmed → active → returned
- `paid_at`: Payment completion timestamp

#### `rental_commissions`
- Commission records for each rental
- `rental_cost_cents`: Amount commission is based on
- `commission_cents`: Calculated amount owed
- `status`: pending → invoiced → paid
- `damage_commission_cents`: Added when damage occurs

#### `rental_invoices`
- Monthly invoices sent to listers
- `invoice_number`: Unique ID (INV-202406-001)
- `total_commission_cents`: All commissions this month
- `total_damage_charges_cents`: Damage charges this month
- `status`: draft → sent → viewed → paid

#### `rental_invoice_line_items`
- Detailed breakdown of invoice
- Links commissions and damage charges to invoice

#### `rental_damage_assessments`
- Equipment damage reports
- `severity`: minor, moderate, severe, total_loss
- `charge_cents`: Amount to charge renter
- Commission also applies to damage charges

#### `lister_account_balance`
- Running account of what lister owes
- `balance_owed_cents`: Total unpaid amount
- `unpaid_commissions_cents`: Commission portion
- `unpaid_damage_charges_cents`: Damage charge portion

#### `rental_commission_payment_requests`
- Bit payment requests for commission payments
- `status`: pending → completed/failed
- Tracks payment link, QR code, expiration

## API Reference

### Rental Management

#### Create Equipment Rental
```
POST /api/equipment/rentals/create

Request:
{
  "listing_id": "uuid",
  "start_date": "2026-06-30T00:00:00Z",
  "end_date": "2026-07-07T00:00:00Z",
  "deposit_cents": 5000,        // optional
  "insurance_enabled": true,     // optional
  "notes": "Will pick up at 10am" // optional
}

Response (201):
{
  "success": true,
  "rental": {
    "id": "uuid",
    "equipment_name": "Wetsuit XXL",
    "start_date": "2026-06-30",
    "end_date": "2026-07-07",
    "rental_days": 7,
    "daily_price": "₪50.00",
    "subtotal": "₪350.00",
    "insurance": "₪20.00",
    "rental_cost": "₪370.00",
    "deposit": "₪50.00",
    "total_cost": "₪420.00",
    "commission_breakdown": {
      "rental_cost": "₪370.00",
      "commission_rate": "10%",
      "commission_amount": "₪37.00",
      "to_lister": "₪333.00"
    },
    "status": "pending",
    "next_step": "Payment required"
  }
}
```

### Commission Management (Lister)

#### Get Account Summary
```
GET /api/equipment/commissions/my-account

Response (200):
{
  "success": true,
  "account": {
    "balance_owed": {
      "cents": 35000,
      "display": "₪350.00"
    },
    "unpaid_commissions": {
      "cents": 35000,
      "display": "₪350.00"
    },
    "unpaid_damage_charges": {
      "cents": 0,
      "display": "₪0.00"
    },
    "lifetime_stats": {
      "total_rental_volume": {
        "cents": 350000,
        "display": "₪3,500.00"
      },
      "total_commission_paid": {
        "cents": 280000,
        "display": "₪2,800.00"
      }
    },
    "is_suspended": false
  },
  "this_month": {
    "period": {
      "start": "2026-06-01",
      "end": "2026-06-30"
    },
    "total_commission": {
      "cents": 35000,
      "display": "₪350.00"
    },
    "paid": {
      "cents": 0,
      "display": "₪0.00"
    },
    "pending": {
      "cents": 35000,
      "display": "₪350.00"
    },
    "rental_count": 1
  },
  "pending_invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-202406-001",
      "amount": {
        "cents": 35000,
        "display": "₪350.00"
      },
      "due_date": "2026-07-07",
      "status": "sent",
      "action": "PAY"
    }
  ],
  "recent_commissions": [...]
}
```

#### Get All Invoices
```
GET /api/equipment/commissions/invoices

Response (200):
{
  "success": true,
  "summary": {
    "total_invoices": 3,
    "outstanding": {
      "cents": 70000,
      "display": "₪700.00"
    },
    "total_paid": {
      "cents": 140000,
      "display": "₪1,400.00"
    },
    "overdue_count": 1,
    "pending_count": 2
  },
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-202406-001",
      "period": {
        "month": "יוני 2026",
        "date": "2026-06-01"
      },
      "summary": {
        "rental_count": 5,
        "rental_commission": {
          "cents": 35000,
          "display": "₪350.00"
        },
        "damage_charges": {
          "cents": 0,
          "display": "₪0.00"
        },
        "total": {
          "cents": 35000,
          "display": "₪350.00"
        }
      },
      "timeline": {
        "issued_date": "2026-06-30",
        "sent_date": "2026-07-01",
        "viewed_date": null,
        "due_date": "2026-07-07",
        "paid_date": null
      },
      "status": {
        "current": "sent",
        "badge": "📬 PENDING PAYMENT",
        "action_required": true,
        "paid": false
      },
      "payment": {
        "status": "pending"
      },
      "line_items": [...]
    }
  ]
}
```

### Commission Payment

#### Request Bit Payment
```
POST /api/equipment/commissions/{invoiceId}/pay-via-bit

Response (201):
{
  "success": true,
  "payment_request": {
    "id": "uuid",
    "invoice_number": "INV-202406-001",
    "amount": {
      "cents": 35000,
      "display": "₪350.00"
    },
    "payment_link": "https://bit.co.il/...",
    "short_url": "https://t.me/...",
    "qr_code": "data:image/png;base64,...",
    "status": "pending",
    "expires_at": "2026-07-08T12:34:56Z",
    "instructions": {
      "text": "Scan the QR code with your phone and pay via Bit",
      "web": "Or use the payment link to pay online"
    }
  }
}
```

### Damage Management

#### Report Equipment Damage
```
POST /api/equipment/rentals/{rentalId}/charge-damage

Request:
{
  "damage_description": "Rip in wetsuit from sharp rock",
  "severity": "moderate",
  "repair_cost_cents": 15000,      // 150₪
  "replacement_cost_cents": 50000, // 500₪
  "charge_cents": 15000,           // What we're actually charging
  "photo_evidence_urls": [
    "https://storage.example.com/damage1.jpg"
  ],
  "notes": "Damage occurred during dive on 2026-07-05"
}

Response (201):
{
  "success": true,
  "damage_assessment": {
    "id": "uuid",
    "rental_id": "uuid",
    "damage_description": "Rip in wetsuit from sharp rock",
    "severity": "moderate",
    "repair_cost": {
      "cents": 15000,
      "display": "₪150.00"
    },
    "charge_issued": {
      "cents": 15000,
      "display": "₪150.00"
    },
    "commission_on_damage": {
      "rate": "10%",
      "cents": 1500,
      "display": "₪15.00"
    },
    "total_owed_to_dive_drop": {
      "cents": 1500,
      "display": "₪15.00"
    },
    "charge_due_date": "2026-07-12",
    "status": "assessed",
    "message": "Damage charge has been recorded. Renter will be notified. The commission on this damage will be added to your next invoice."
  }
}
```

### Admin Analytics

#### Get Commission Analytics
```
GET /api/admin/equipment/analytics?period=month

Response (200):
{
  "success": true,
  "period": {
    "type": "month",
    "start": "2026-06-01",
    "end": "2026-06-30"
  },
  "summary": {
    "total_rental_revenue": {
      "cents": 350000,
      "display": "₪3,500.00"
    },
    "total_commissions": {
      "cents": 35000,
      "display": "₪350.00"
    },
    "commission_breakdown": {
      "paid": {
        "cents": 0,
        "display": "₪0.00",
        "percentage": "0.0"
      },
      "pending": {
        "cents": 35000,
        "display": "₪350.00",
        "percentage": "100.0"
      }
    },
    "total_damage_charges": {
      "cents": 0,
      "display": "₪0.00"
    }
  },
  "rental_metrics": {
    "completed_rentals": 0,
    "active_rentals": 1,
    "pending_rentals": 0,
    "total_rentals": 1,
    "average_commission_rate": "10.0"
  },
  "top_equipment": [...],
  "top_listers": [...],
  "daily_breakdown": {...}
}
```

## Commission Calculation Service

The `@/lib/rentals/commission.ts` module provides utility functions:

### Calculate Commission
```typescript
import { calculateCommission } from '@/lib/rentals/commission';

const result = calculateCommission(350000, 0.10); // 350₪, 10%
// Returns:
// {
//   rentalCostCents: 350000,
//   commissionRate: 0.10,
//   commissionCents: 35000,      // 35₪
//   netToListerCents: 315000     // 315₪
// }
```

### Calculate Full Rental Financials
```typescript
import { calculateRentalFinancials } from '@/lib/rentals/commission';

const financials = calculateRentalFinancials({
  dailyPriceCents: 5000,    // 50₪/day
  rentalDays: 7,
  commissionRate: 0.10,
  depositCents: 5000,       // 50₪
  insuranceCents: 2000      // 20₪
});
// Returns complete breakdown with all amounts
```

### Utility Functions
- `calculateRentalDays(startDate, endDate)` - Days between dates
- `calculateDamageCommission(costCents, rate)` - Damage charge commission
- `generateInvoiceNumber(year, month, sequence)` - INV-202406-001 format
- `calculateDueDate(issueDate, days)` - Invoice due date
- `validateDamageCost(severity, costCents)` - Damage cost validation
- `formatCurrency(cents)` - Format as ₪X.XX

## Invoice Workflow

### Monthly Invoice Generation (Scheduled)

1. **Identify Period**: First day to last day of month
2. **Collect Commissions**: All paid rentals in period
3. **Collect Damage Charges**: All assessed damages
4. **Create Invoice**:
   - Invoice number: INV-YYYYMM-###
   - Due date: 7 days from issue
   - Status: draft
5. **Create Line Items**: One per commission/damage
6. **Send to Lister**: Status → sent
7. **Track Payment**: Manual or automatic via webhook

### Invoice Statuses
- `draft`: Created, not sent yet
- `sent`: Email sent to lister
- `viewed`: Lister opened email
- `paid`: Payment received
- `partial`: Partial payment
- `overdue`: Past due date

## Security & RLS Policies

### Access Control
- **Renters**: View their own rentals only
- **Listers**: View their own listings, commissions, invoices
- **Admins**: Full analytics access
- **Public**: View available equipment

### Data Protection
- All sensitive financial data encrypted at rest
- Commission calculations immutable (stored in DB)
- Payment requests expire after 24 hours
- Damage assessments require evidence/photos

## Configuration

### Default Commission Rate
Set in `equipment_listings.commission_rate` (default: 10%)

```sql
-- Update commission rate for specific lister
UPDATE equipment_listings
SET commission_rate = 0.15  -- 15%
WHERE lister_id = 'user-uuid';
```

### Payment Terms
- **Invoice due date**: 7 days (configurable)
- **Payment link expiration**: 24 hours
- **Payout schedule**: Manual or automatic

## Damage Severity Guidelines

| Severity | Description | Typical Cost Range |
|----------|-------------|-------------------|
| Minor | Cosmetic, no repair needed | 10₪ - 50₪ |
| Moderate | Needs repair, still usable | 50₪ - 500₪ |
| Severe | Non-functional, needs replacement | 500₪ - 2,000₪ |
| Total Loss | Equipment destroyed | 2,000₪+ |

## Migration & Setup

### 1. Run Database Migration
```bash
# Apply the equipment rental schema
supabase migration up
```

### 2. Create Initial Equipment
```sql
INSERT INTO equipment (name, category, daily_price_cents, condition_rating)
VALUES
  ('Wetsuit XXL', 'wetsuit', 5000, 5),
  ('BCD Size L', 'bcd', 3000, 4),
  ('Regulator Set', 'regulator', 8000, 5);
```

### 3. Test Endpoints
```bash
# Create a test rental
curl -X POST http://localhost:3000/api/equipment/rentals/create \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": "uuid-here",
    "start_date": "2026-06-30T00:00:00Z",
    "end_date": "2026-07-07T00:00:00Z"
  }'

# Get lister account
curl http://localhost:3000/api/equipment/commissions/my-account

# Get invoices
curl http://localhost:3000/api/equipment/commissions/invoices

# Get analytics
curl http://localhost:3000/api/admin/equipment/analytics?period=month
```

## Future Enhancements

### Phase 2
- [ ] Automated monthly invoice generation via cron
- [ ] Automatic payment reminders
- [ ] Deposit refund processing
- [ ] Damage insurance integration
- [ ] Equipment condition ratings
- [ ] Lister suspension for non-payment

### Phase 3
- [ ] Multi-equipment bundle rentals
- [ ] Dynamic pricing based on demand
- [ ] Equipment rating and review system
- [ ] Renter verification (ID, background check)
- [ ] Insurance claim integration
- [ ] Advanced analytics with predictive modeling

## Support

For issues or questions:
1. Check database RLS policies
2. Review commission calculations
3. Verify payment method setup
4. Check invoice generation logs

---

**System Version**: 1.0
**Last Updated**: 2026-06-20
**Status**: Ready for Deployment ✅
