#!/bin/bash

# ============================================================================
# Supabase Migration Deployment Script
# Deploys missing core database tables
# ============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_DIR/migrations"
MIGRATION_FILE="$MIGRATIONS_DIR/004_missing_tables.sql"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  SUPABASE DATABASE MIGRATION DEPLOYMENT                          ║"
echo "║  Missing Core Tables                                             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable not set"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_KEY environment variable not set"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "✓ Environment variables validated"
echo "✓ Migration file found: $MIGRATION_FILE"
echo ""

# Read migration SQL
MIGRATION_SQL=$(cat "$MIGRATION_FILE")

echo "Deploying migration..."
echo "Database URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Deploy using Supabase CLI if available
if command -v supabase &> /dev/null; then
  echo "Using Supabase CLI..."

  # Check if linked to Supabase project
  if [ -f "$PROJECT_DIR/.supabase/config.toml" ]; then
    echo "Running migration via Supabase CLI..."
    # Note: This requires proper setup with supabase link
    supabase migration new "missing_tables" --sql-stdin << EOF
$MIGRATION_SQL
EOF
  else
    echo "⚠️  Supabase CLI not linked to project"
    echo "   Run: supabase link"
    echo ""
    echo "Using direct SQL execution instead..."
  fi
fi

# Alternative: Execute SQL directly via Supabase Management API
echo ""
echo "Executing SQL via Supabase API..."
echo ""

# Create a temporary Node.js script to execute the migration
cat > /tmp/execute_migration.js << 'NODEJS_SCRIPT'
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const migrationSql = process.env.MIGRATION_SQL;

if (!supabaseUrl || !serviceKey || !migrationSql) {
  console.error('Missing required environment variables');
  process.exit(1);
}

async function executeMigration() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: migrationSql,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Migration failed:', error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✓ Migration executed successfully');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  }
}

executeMigration();
NODEJS_SCRIPT

# Export migration SQL for the Node script
export MIGRATION_SQL="$MIGRATION_SQL"

# Try to execute with Node if available
if command -v node &> /dev/null; then
  node /tmp/execute_migration.js
else
  echo "⚠️  Node.js not found in PATH"
  echo ""
  echo "Manual deployment instructions:"
  echo "1. Go to: $NEXT_PUBLIC_SUPABASE_URL/project/sql/new"
  echo "2. Copy and paste the following SQL:"
  echo ""
  echo "---BEGIN SQL---"
  echo "$MIGRATION_SQL"
  echo "---END SQL---"
  echo ""
  echo "3. Click 'RUN' to execute"
fi

# Cleanup
rm -f /tmp/execute_migration.js

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  MIGRATION DEPLOYMENT COMPLETE                                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Verify the migration:"
echo "1. Check tables were created:"
echo "   SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
echo ""
echo "2. Verify RLS is enabled:"
echo "   SELECT tablename, rowsecurity FROM pg_class"
echo "   WHERE relrowsecurity = true"
echo ""
echo "3. Check indexes:"
echo "   SELECT indexname, tablename FROM pg_indexes"
echo "   WHERE schemaname = 'public' AND indexname LIKE 'idx_%'"
echo ""
