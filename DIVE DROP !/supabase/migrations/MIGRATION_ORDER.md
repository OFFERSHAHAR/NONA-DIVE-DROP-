# Database Migration Execution Order

## Critical Path (Single Source of Truth)

This order ensures all foreign keys resolve correctly and there are no duplicate definitions.

### Phase 1: Core Extensions & Types
- `001_buddy_matching_schema.sql` - Buddy system (MASTER - includes ENUMs, indexes, RLS, triggers)

### Phase 2: Service Providers
- `20260620_create_service_provider_directory.sql` - Service provider directory (replaces old definitions)

### Phase 3: Unified Bookings System
- `20260625_booking_system_schema.sql` - Unified bookings table (replaces dive_bookings, provider_bookings)

### Phase 4: Payment Systems (Updated References)
- `20260620_create_bit_payment_system.sql` - Bit payment (UPDATED: dive_bookings → bookings)
- `20260620_000001_create_payment_packages_table.sql` - Payment packages

### Phase 5: Other Core Tables
- All non-conflicting migrations (alphabetically by date)

## Changes Applied

### Deleted Files (Duplicates Removed)
- ✅ `20260620_create_buddy_listings.sql` - Duplicate of 001_buddy_matching_schema.sql
- ✅ `buddy_feature.sql` - Duplicate buddy listings
- ✅ `20260623_create_payments_schema.sql` - Conflicted with bookings system
- ✅ `001_service_provider_tables.sql` (supabase) - Replaced by 20260620_create_service_provider_directory.sql
- ✅ `001_service_provider_tables.sql` (migrations) - Replaced by 20260620_create_service_provider_directory.sql

### Updated Files
- ✅ `20260620_create_bit_payment_system.sql`
  - Line 71: `dive_bookings` → `bookings`
  - Line 127: `dive_bookings` → `bookings`
  - Line 186: `dive_bookings` → `bookings`
  - Line 276: `dive_bookings` → `bookings`
  - Line 384: `ALTER TABLE dive_bookings` → `ALTER TABLE bookings`
  - Line 389: Index name updated

### API Routes Updated
- ✅ `src/app/api/payments/bit/refund/route.ts` - dive_bookings → bookings
- ✅ `src/app/api/payments/bit/verify/route.ts` - dive_bookings → bookings (2 occurrences)
- ✅ `src/app/api/payments/bit/payment-request/route.ts` - dive_bookings → bookings (2 occurrences)
- ✅ `src/app/api/webhooks/bit/payment/route.ts` - dive_bookings → bookings

## Verification Steps

```bash
# 1. Check for remaining duplicate table names
grep -r "dive_bookings" supabase/migrations --include="*.sql"
# Expected: No results

# 2. Verify bookings table is defined once
grep -c "CREATE TABLE.*bookings" supabase/migrations/*.sql
# Expected: 1 result in 20260625_booking_system_schema.sql

# 3. Verify buddy_listings is defined once
grep -c "CREATE TABLE.*buddy_listings" supabase/migrations/*.sql
# Expected: 1 result in 001_buddy_matching_schema.sql

# 4. Verify service_providers is defined once
grep -c "CREATE TABLE.*service_providers" supabase/migrations/*.sql
# Expected: 1 result in 20260620_create_service_provider_directory.sql

# 5. Test local migration
supabase db reset
# Expected: 0 errors, all tables created successfully
```

## Schema Consolidation Complete

**Status**: Ready for deployment
**Conflicts**: Resolved
**Duplicates**: Eliminated
**Foreign Keys**: Unified
