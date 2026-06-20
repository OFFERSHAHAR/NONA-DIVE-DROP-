# ============================================================================
# Supabase Migration Deployment Script (PowerShell)
# Deploys missing core database tables
# ============================================================================

param(
    [switch]$DryRun = $false,
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$ServiceKey = $env:SUPABASE_SERVICE_KEY,
    [string]$MigrationFile = (Join-Path $PSScriptRoot "../migrations/004_missing_tables.sql")
)

function Write-Header {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  SUPABASE DATABASE MIGRATION DEPLOYMENT (PowerShell)             ║" -ForegroundColor Cyan
    Write-Host "║  Missing Core Tables                                             ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Test-Environment {
    Write-Host "Validating environment..." -ForegroundColor Yellow

    if ([string]::IsNullOrEmpty($SupabaseUrl)) {
        Write-Host "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set" -ForegroundColor Red
        exit 1
    }

    if ([string]::IsNullOrEmpty($ServiceKey)) {
        Write-Host "❌ Error: SUPABASE_SERVICE_KEY not set" -ForegroundColor Red
        exit 1
    }

    if (-not (Test-Path $MigrationFile)) {
        Write-Host "❌ Error: Migration file not found: $MigrationFile" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ Environment variables validated" -ForegroundColor Green
    Write-Host "✓ Migration file found: $MigrationFile" -ForegroundColor Green
}

function Get-MigrationSQL {
    Write-Host "Loading migration SQL..." -ForegroundColor Yellow
    $sql = Get-Content -Path $MigrationFile -Raw
    Write-Host "✓ Loaded $(($sql | Measure-Object -Character).Characters) bytes" -ForegroundColor Green
    return $sql
}

function Invoke-MigrationDirect {
    param(
        [string]$SQL,
        [string]$SupabaseUrl,
        [string]$ServiceKey
    )

    Write-Host ""
    Write-Host "Executing migration via Supabase API..." -ForegroundColor Yellow
    Write-Host "Database URL: $SupabaseUrl" -ForegroundColor Cyan
    Write-Host ""

    if ($DryRun) {
        Write-Host "🔍 DRY RUN MODE - No changes will be applied" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "SQL to execute:" -ForegroundColor Cyan
        Write-Host "---BEGIN SQL---" -ForegroundColor DarkGray
        Write-Host $SQL -ForegroundColor DarkGray
        Write-Host "---END SQL---" -ForegroundColor DarkGray
        Write-Host ""
        return $true
    }

    try {
        $headers = @{
            "Authorization" = "Bearer $ServiceKey"
            "Content-Type" = "application/json"
        }

        $body = @{
            sql = $SQL
        } | ConvertTo-Json -Depth 10

        $response = Invoke-RestMethod `
            -Uri "$SupabaseUrl/rest/v1/rpc/execute_sql" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ErrorAction Stop

        Write-Host "✓ Migration executed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Cyan
        Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor DarkGray
        return $true
    }
    catch {
        # If RPC method doesn't exist, provide manual instructions
        if ($_.Exception.Response.StatusCode -eq 404 -or $_.Exception.Message -match "rpc") {
            Write-Host "⚠️  RPC endpoint not available. Please execute SQL manually:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "1. Navigate to: $SupabaseUrl/project/sql/new" -ForegroundColor Cyan
            Write-Host "2. Copy and paste the SQL from the migration file" -ForegroundColor Cyan
            Write-Host "3. Click 'RUN' to execute" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "SQL to execute:" -ForegroundColor Cyan
            Write-Host "---BEGIN SQL---" -ForegroundColor DarkGray
            Write-Host $SQL -ForegroundColor DarkGray
            Write-Host "---END SQL---" -ForegroundColor DarkGray
            return $false
        }
        else {
            Write-Host "❌ Migration failed: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

function Show-VerificationInstructions {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  VERIFICATION STEPS                                              ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "1. Verify tables were created:" -ForegroundColor Yellow
    Write-Host "   SELECT tablename FROM pg_tables WHERE schemaname = 'public'" -ForegroundColor DarkGray
    Write-Host "   AND tablename IN ('feedback', 'equipment_rentals', 'rental_damage_assessments'," -ForegroundColor DarkGray
    Write-Host "                      'rental_commissions', 'lister_account_balance');" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "2. Verify RLS is enabled:" -ForegroundColor Yellow
    Write-Host "   SELECT tablename FROM pg_tables WHERE schemaname = 'public'" -ForegroundColor DarkGray
    Write-Host "   AND rowsecurity = true" -ForegroundColor DarkGray
    Write-Host "   AND tablename IN ('feedback', 'equipment_rentals', 'rental_damage_assessments'," -ForegroundColor DarkGray
    Write-Host "                      'rental_commissions', 'lister_account_balance');" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "3. Check created indexes:" -ForegroundColor Yellow
    Write-Host "   SELECT indexname, tablename FROM pg_indexes" -ForegroundColor DarkGray
    Write-Host "   WHERE schemaname = 'public' AND indexname LIKE 'idx_%'" -ForegroundColor DarkGray
    Write-Host "   ORDER BY tablename;" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "4. Test RLS policies:" -ForegroundColor Yellow
    Write-Host "   SELECT tablename, policyname FROM pg_policies" -ForegroundColor DarkGray
    Write-Host "   WHERE schemaname = 'public'" -ForegroundColor DarkGray
    Write-Host "   ORDER BY tablename;" -ForegroundColor DarkGray
    Write-Host ""
}

function Show-Completion {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  MIGRATION DEPLOYMENT COMPLETE                                   ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run verification queries (see above)" -ForegroundColor Cyan
    Write-Host "2. Test API endpoints" -ForegroundColor Cyan
    Write-Host "3. Start the development server: npm run dev" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Header
Test-Environment

$sql = Get-MigrationSQL
$success = Invoke-MigrationDirect -SQL $sql -SupabaseUrl $SupabaseUrl -ServiceKey $ServiceKey

if ($success) {
    Show-VerificationInstructions
    Show-Completion
    exit 0
}
else {
    Write-Host ""
    Write-Host "⚠️  Could not auto-execute migration. Please follow manual steps above." -ForegroundColor Yellow
    exit 0
}
