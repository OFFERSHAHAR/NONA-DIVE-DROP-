# Database Migration - Quick Start (5 Minutes)

## TL;DR - Deploy Now

### Windows (PowerShell)
```powershell
# Set variables (if not already set)
$env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY = "your-service-key"

# Run deployment
.\scripts\Deploy-MissingTables.ps1
```

### Mac/Linux (Bash)
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
chmod +x ./scripts/deploy-missing-tables.sh
./scripts/deploy-missing-tables.sh
```

### Supabase Dashboard
1. Go to https://app.supabase.com → Your Project
2. SQL Editor → New Query
3. Copy contents of `migrations/004_missing_tables.sql`
4. Paste and click RUN

## What Gets Created

✅ **feedback** - Dive condition reports  
✅ **equipment_rentals** - Equipment rental tracking  
✅ **rental_damage_assessments** - Damage claims  
✅ **rental_commissions** - Commission tracking  
✅ **lister_account_balance** - Account balance tracking  

All with:
- UUID primary keys
- Proper indexes
- RLS security
- Foreign key constraints
- Automatic timestamps

## Verify It Worked

Run in Supabase SQL Editor:

```sql
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('feedback', 'equipment_rentals', 'rental_damage_assessments',
                    'rental_commissions', 'lister_account_balance');
```

Expected: **5**

## Test APIs

```bash
# Run the test suite
npm run test -- missing-tables.test.ts
```

## Start Development

```bash
npm run dev
```

## Documentation

- 📖 Full guide: `DATABASE_MIGRATION_GUIDE.md`
- 📊 Summary: `MIGRATION_SUMMARY.md`
- 🔍 Implementation: `migrations/004_missing_tables.sql`
- 🧪 Tests: `src/__tests__/database/missing-tables.test.ts`

## Troubleshooting

### "Table already exists"
→ Migration uses `IF NOT EXISTS`, safe to rerun

### "Foreign key constraint failed"
→ Ensure referenced tables exist (dive_sites, equipment, auth.users)

### "Permission denied"
→ Use SUPABASE_SERVICE_KEY, not ANON_KEY

### "RLS policy error"
→ Ensure user is authenticated before querying

## What's Changed

- `migrations/004_missing_tables.sql` - The migration
- `scripts/Deploy-MissingTables.ps1` - Windows deployer
- `scripts/deploy-missing-tables.sh` - Unix deployer
- `DATABASE_MIGRATION_GUIDE.md` - Full documentation
- `MIGRATION_SUMMARY.md` - Complete overview
- `src/__tests__/database/missing-tables.test.ts` - Tests

## APIs Now Working

These endpoints now have tables:

- `POST /api/feedback` - Submit feedback ✅
- `POST /api/equipment/rentals/[id]/charge-damage` - Report damage ✅
- `GET /api/admin/damage-reports` - List damage ✅
- `POST /api/admin/damage-reports/[id]/approve` - Approve damage ✅
- `POST /api/admin/damage-reports/[id]/reject` - Reject damage ✅

## Estimated Times

| Step | Time |
|------|------|
| Set environment variables | 1 min |
| Run deployment | 2 min |
| Verify (run SQL query) | 1 min |
| Run tests | 1 min |
| **Total** | **5 min** |

## That's It! 🎉

Your database is now ready. The migration includes:

- ✅ 5 production-ready tables
- ✅ Row-level security
- ✅ Performance indexes
- ✅ Foreign key integrity
- ✅ Automatic audit trails
- ✅ Trigger functions

Start developing!

```bash
npm run dev
```

---

Need help? See `DATABASE_MIGRATION_GUIDE.md` for detailed instructions.
