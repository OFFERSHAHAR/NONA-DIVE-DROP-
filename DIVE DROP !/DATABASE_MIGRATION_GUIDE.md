# Database Migration Guide - Missing Tables

This guide covers the deployment of critical missing database tables to your Supabase project.

## Overview

The migration `004_missing_tables.sql` creates the following tables:

| Table | Purpose | Records |
|-------|---------|---------|
| `feedback` | Dive condition reports (visibility, temperature, marine life) | User submissions |
| `equipment_rentals` | Equipment rental management and tracking | Rental history |
| `rental_damage_assessments` | Equipment damage claims and assessments | Damage records |
| `rental_commissions` | Commission tracking and payment calculations | Commission records |
| `lister_account_balance` | Lister account balance and payout tracking | Account balances |

## Tables Created

### 1. feedback
Stores dive condition feedback submitted by users.

**Columns:**
- `id` (UUID, PK) - Unique identifier
- `diver_id` (UUID, FK) - Reference to user who submitted feedback
- `dive_site_id` (UUID, FK) - Reference to dive site
- `dive_booking_id` (UUID, FK) - Reference to booking (optional)
- `visibility_meters` (DECIMAL) - Water visibility (0-50m)
- `temperature_celsius` (DECIMAL) - Water temperature (5-40°C)
- `current_strength` (DECIMAL) - Current strength (0-10)
- `marine_life` (TEXT[]) - Array of marine species observed
- `marine_life_custom` (VARCHAR) - Custom species description (max 200 chars)
- `notes` (VARCHAR) - User notes (max 300 chars)
- `image_urls` (TEXT[]) - Photo evidence URLs
- `submitted_at` (TIMESTAMP) - When submitted
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

**Indexes:**
- `idx_feedback_diver_id` - Find feedback by diver
- `idx_feedback_dive_site_id` - Find feedback by dive site
- `idx_feedback_created_at` - Sort by creation date

**RLS Policies:**
- Users can view all feedback
- Users can only create/edit their own feedback
- Admins can manage all feedback

### 2. equipment_rentals
Manages equipment rental transactions.

**Columns:**
- `id` (UUID, PK)
- `equipment_id` (UUID, FK) - Equipment being rented
- `lister_id` (UUID, FK) - Equipment owner
- `renter_id` (UUID, FK) - Person renting
- `rental_start_date` (DATE) - Rental start
- `rental_end_date` (DATE) - Rental end
- `pickup_location` (VARCHAR) - Pickup address
- `dropoff_location` (VARCHAR) - Return address
- `status` (VARCHAR) - pending, confirmed, active, returned, cancelled, disputed
- `daily_rate_cents` (INTEGER) - Daily rate in cents
- `rental_days` (INTEGER) - Number of rental days
- `total_cost_cents` (INTEGER) - Total rental cost
- `commission_rate` (DECIMAL) - DIVE DROP commission rate (default 15%)
- `damage_reported` (BOOLEAN) - Has damage been reported?
- `return_condition_notes` (TEXT) - Return condition notes
- `returned_at` (TIMESTAMP) - When returned
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_equipment_rentals_lister_id`
- `idx_equipment_rentals_renter_id`
- `idx_equipment_rentals_status`
- `idx_equipment_rentals_created_at`

### 3. rental_damage_assessments
Records equipment damage claims and assessments.

**Columns:**
- `id` (UUID, PK)
- `rental_id` (UUID, FK) - Related rental
- `lister_id` (UUID, FK) - Equipment owner
- `renter_id` (UUID, FK) - Person responsible
- `assessed_by_lister_id` (UUID, FK) - Admin who assessed
- `damage_description` (TEXT) - Damage details
- `severity` (VARCHAR) - minor, moderate, severe, total_loss
- `repair_cost_cents` (INTEGER) - Repair cost estimate
- `replacement_cost_cents` (INTEGER, nullable) - Replacement cost
- `charge_cents` (INTEGER) - Actual charge to renter
- `photo_evidence` (JSONB) - Photo URLs array
- `notes` (VARCHAR) - Additional notes
- `status` (VARCHAR) - assessed, disputed, resolved, charged
- `charge_issued_at` (TIMESTAMP) - When charged
- `charge_due_date` (DATE) - Payment due date
- `resolved_at` (TIMESTAMP, nullable) - When resolved
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_rental_damage_assessments_rental_id`
- `idx_rental_damage_assessments_lister_id`
- `idx_rental_damage_assessments_renter_id`
- `idx_rental_damage_assessments_status`

**RLS Policies:**
- Listers and renters can view their own damage assessments
- Admins can view all
- Only listers can create damage assessments

### 4. rental_commissions
Tracks commissions and payouts for rentals.

**Columns:**
- `id` (UUID, PK)
- `rental_id` (UUID, FK, UNIQUE)
- `lister_id` (UUID, FK) - Equipment owner
- `renter_id` (UUID, FK) - Renter
- `rental_amount_cents` (INTEGER) - Total rental amount
- `commission_rate` (DECIMAL) - Commission rate
- `commission_cents` (INTEGER) - Commission amount
- `damage_commission_cents` (INTEGER) - Damage-related commission
- `total_commission_cents` (INTEGER) - Total commission owed
- `net_payout_cents` (INTEGER) - Amount to pay lister
- `status` (VARCHAR) - pending, held, paid, disputed
- `paid_at` (TIMESTAMP, nullable) - When paid
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_rental_commissions_lister_id`
- `idx_rental_commissions_status`
- `idx_rental_commissions_rental_id`

### 5. lister_account_balance
Tracks account balances for equipment listers.

**Columns:**
- `id` (UUID, PK)
- `lister_id` (UUID, FK, UNIQUE) - Equipment lister
- `balance_owed_cents` (INTEGER) - Amount owed to lister
- `unpaid_damage_charges_cents` (INTEGER) - Unpaid damage charges
- `total_earned_cents` (INTEGER) - Lifetime earnings
- `total_paid_out_cents` (INTEGER) - Lifetime payouts
- `stripe_account_id` (VARCHAR) - Connected Stripe account
- `is_stripe_connected` (BOOLEAN) - Stripe status
- `payout_method` (VARCHAR) - stripe, bank_transfer, paypal
- `account_status` (VARCHAR) - active, suspended, restricted
- `last_payout_date` (TIMESTAMP, nullable)
- `last_verified_date` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_lister_account_balance_lister_id`
- `idx_lister_account_balance_stripe_account_id`

**RLS Policies:**
- Listers can view their own balance
- Admins can view/update all balances

## Deployment Methods

### Method 1: Using PowerShell (Windows)

```powershell
# Set environment variables first (if not already set)
$env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY = "your-service-key"

# Run the deployment script
.\scripts\Deploy-MissingTables.ps1

# Or with dry-run to preview changes
.\scripts\Deploy-MissingTables.ps1 -DryRun
```

### Method 2: Using Bash/Shell (Mac/Linux)

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Make script executable
chmod +x scripts/deploy-missing-tables.sh

# Run deployment
./scripts/deploy-missing-tables.sh
```

### Method 3: Manual SQL Deployment (Supabase Dashboard)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to: **SQL Editor** → **New Query**
4. Open file: `migrations/004_missing_tables.sql`
5. Copy all SQL content
6. Paste into Supabase SQL Editor
7. Click **RUN** button
8. Verify: No errors should appear

### Method 4: Using Supabase CLI

```bash
# If Supabase CLI is installed and project is linked
supabase db push

# Or execute specific migration file
supabase migration up
```

## Verification

After deploying, verify all tables were created:

### 1. Check Tables Created

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('feedback', 'equipment_rentals', 'rental_damage_assessments',
                   'rental_commissions', 'lister_account_balance');
```

**Expected Result:** 5 rows (all tables created)

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_class 
WHERE relname IN ('feedback', 'equipment_rentals', 'rental_damage_assessments',
                   'rental_commissions', 'lister_account_balance')
AND rowsecurity = true;
```

**Expected Result:** 5 rows with `rowsecurity = true`

### 3. Verify Indexes

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

**Expected Result:** Multiple indexes for each table

### 4. Check Policies

```sql
SELECT tablename, policyname, permissive
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('feedback', 'equipment_rentals', 'rental_damage_assessments',
                   'rental_commissions', 'lister_account_balance');
```

**Expected Result:** Multiple RLS policies for each table

## Schema Relationships

```
auth.users (external)
  ↓
  ├─→ feedback (diver_id)
  ├─→ equipment_rentals (lister_id, renter_id)
  ├─→ rental_damage_assessments (lister_id, renter_id, assessed_by_lister_id)
  ├─→ rental_commissions (lister_id, renter_id)
  └─→ lister_account_balance (lister_id)

dive_sites (external)
  ↓
  └─→ feedback (dive_site_id)

equipment (external)
  ↓
  └─→ equipment_rentals (equipment_id)

equipment_rentals
  ↓
  ├─→ rental_damage_assessments (rental_id)
  └─→ rental_commissions (rental_id, UNIQUE)
```

## API Integration

The following API endpoints use these tables:

### Feedback APIs
- `POST /api/feedback` - Submit dive feedback
- `GET /api/feedback/aggregate` - Get aggregated feedback

### Equipment Rental APIs
- `POST /api/equipment/rentals/create` - Create rental
- `GET /api/equipment/rentals/[id]` - Get rental details
- `POST /api/equipment/rentals/[id]/charge-damage` - Report damage
- `GET /api/admin/damage-reports` - List damage reports
- `POST /api/admin/damage-reports/[id]/approve` - Approve damage claim
- `POST /api/admin/damage-reports/[id]/reject` - Reject damage claim

## Functions

The migration creates one trigger function:

### `update_lister_balance_on_commission()`

Automatically updates the `lister_account_balance` table when a new commission is created.

**Trigger:** `update_balance_after_commission` on `rental_commissions` INSERT

**Effect:** 
- Updates or inserts lister account balance
- Adds rental amount to `total_earned_cents`
- Adds net payout to `balance_owed_cents`

## Constraints

All tables include proper constraints:

- **Primary Keys:** All use UUID with `uuid_generate_v4()` default
- **Foreign Keys:** All have `ON DELETE CASCADE` or `ON DELETE RESTRICT` as appropriate
- **Check Constraints:** Numeric ranges are validated (e.g., visibility 0-50m)
- **Unique Constraints:** `rental_commissions` has unique constraint on `rental_id`

## Permissions

After deployment, the following permissions are set:

- **Public (unauthenticated):** No access
- **Authenticated users:** Can read/write own records via RLS policies
- **Service role:** Full access (for admin operations)
- **Triggers/Functions:** Run with `SECURITY DEFINER` for automatic balance updates

## Rollback (if needed)

To rollback this migration:

```sql
-- Drop all created tables (cascades to dependent objects)
DROP TABLE IF EXISTS lister_account_balance CASCADE;
DROP TABLE IF EXISTS rental_commissions CASCADE;
DROP TABLE IF EXISTS rental_damage_assessments CASCADE;
DROP TABLE IF EXISTS equipment_rentals CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_lister_balance_on_commission() CASCADE;
```

## Troubleshooting

### Problem: "Table already exists"
The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### Problem: Foreign key constraint errors
Ensure the referenced tables exist (`dive_sites`, `equipment`, `auth.users`). You may need to run earlier migrations first.

### Problem: RLS policies not working
Verify:
1. RLS is enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
2. Policies are created: Run verification query #4 above
3. User is authenticated before querying

### Problem: Indexes not being used
Run `ANALYZE;` to update table statistics:
```sql
ANALYZE feedback;
ANALYZE equipment_rentals;
ANALYZE rental_damage_assessments;
ANALYZE rental_commissions;
ANALYZE lister_account_balance;
```

## Performance Notes

- All frequently queried columns have indexes
- RLS policies use simple checks to avoid N+1 queries
- Trigger function for auto-balance updates is efficient
- Consider archiving old feedback records if table grows very large

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation: https://supabase.com/docs
3. Check API implementation files in `src/app/api/`

## Next Steps

1. ✅ Deploy migration (this guide)
2. ⬜ Run verification queries
3. ⬜ Start development server: `npm run dev`
4. ⬜ Test API endpoints
5. ⬜ Monitor logs for errors
