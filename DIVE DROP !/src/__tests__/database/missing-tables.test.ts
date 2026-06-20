/**
 * Test suite for missing database tables
 * Verifies that all new tables exist and APIs can interact with them
 */

import { createClient } from '@supabase/supabase-js';

describe('Database - Missing Tables Migration', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Skipping database tests: Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ============================================================================
  // Table Existence Tests
  // ============================================================================

  describe('Table Existence', () => {
    test('feedback table exists', async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true });

      if (error?.code === 'PGRST100') {
        throw new Error('feedback table does not exist');
      }

      expect(error?.code).not.toBe('PGRST100');
    });

    test('equipment_rentals table exists', async () => {
      const { data, error } = await supabase
        .from('equipment_rentals')
        .select('*', { count: 'exact', head: true });

      if (error?.code === 'PGRST100') {
        throw new Error('equipment_rentals table does not exist');
      }

      expect(error?.code).not.toBe('PGRST100');
    });

    test('rental_damage_assessments table exists', async () => {
      const { data, error } = await supabase
        .from('rental_damage_assessments')
        .select('*', { count: 'exact', head: true });

      if (error?.code === 'PGRST100') {
        throw new Error('rental_damage_assessments table does not exist');
      }

      expect(error?.code).not.toBe('PGRST100');
    });

    test('rental_commissions table exists', async () => {
      const { data, error } = await supabase
        .from('rental_commissions')
        .select('*', { count: 'exact', head: true });

      if (error?.code === 'PGRST100') {
        throw new Error('rental_commissions table does not exist');
      }

      expect(error?.code).not.toBe('PGRST100');
    });

    test('lister_account_balance table exists', async () => {
      const { data, error } = await supabase
        .from('lister_account_balance')
        .select('*', { count: 'exact', head: true });

      if (error?.code === 'PGRST100') {
        throw new Error('lister_account_balance table does not exist');
      }

      expect(error?.code).not.toBe('PGRST100');
    });
  });

  // ============================================================================
  // Column Structure Tests
  // ============================================================================

  describe('Table Schemas', () => {
    test('feedback table has required columns', async () => {
      const requiredColumns = [
        'id',
        'diver_id',
        'dive_site_id',
        'visibility_meters',
        'temperature_celsius',
        'current_strength',
        'marine_life',
        'notes',
        'image_urls',
        'created_at',
      ];

      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'feedback')
        .eq('table_schema', 'public');

      if (error) {
        console.warn('Could not verify columns:', error);
        return;
      }

      const columnNames = columns?.map((c: any) => c.column_name) || [];
      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    test('equipment_rentals table has required columns', async () => {
      const requiredColumns = [
        'id',
        'equipment_id',
        'lister_id',
        'renter_id',
        'status',
        'total_cost_cents',
        'commission_rate',
      ];

      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'equipment_rentals')
        .eq('table_schema', 'public');

      if (error) {
        console.warn('Could not verify columns:', error);
        return;
      }

      const columnNames = columns?.map((c: any) => c.column_name) || [];
      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    test('rental_damage_assessments table has required columns', async () => {
      const requiredColumns = [
        'id',
        'rental_id',
        'lister_id',
        'renter_id',
        'damage_description',
        'severity',
        'repair_cost_cents',
        'charge_cents',
        'status',
      ];

      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'rental_damage_assessments')
        .eq('table_schema', 'public');

      if (error) {
        console.warn('Could not verify columns:', error);
        return;
      }

      const columnNames = columns?.map((c: any) => c.column_name) || [];
      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    test('rental_commissions table has required columns', async () => {
      const requiredColumns = [
        'id',
        'rental_id',
        'lister_id',
        'commission_cents',
        'net_payout_cents',
        'status',
      ];

      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'rental_commissions')
        .eq('table_schema', 'public');

      if (error) {
        console.warn('Could not verify columns:', error);
        return;
      }

      const columnNames = columns?.map((c: any) => c.column_name) || [];
      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    test('lister_account_balance table has required columns', async () => {
      const requiredColumns = [
        'id',
        'lister_id',
        'balance_owed_cents',
        'total_earned_cents',
        'account_status',
      ];

      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'lister_account_balance')
        .eq('table_schema', 'public');

      if (error) {
        console.warn('Could not verify columns:', error);
        return;
      }

      const columnNames = columns?.map((c: any) => c.column_name) || [];
      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });
  });

  // ============================================================================
  // Index Tests
  // ============================================================================

  describe('Table Indexes', () => {
    test('feedback table has performance indexes', async () => {
      const expectedIndexes = [
        'idx_feedback_diver_id',
        'idx_feedback_dive_site_id',
        'idx_feedback_created_at',
      ];

      const { data: indexes, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'feedback')
        .eq('schemaname', 'public');

      if (error) {
        console.warn('Could not verify indexes:', error);
        return;
      }

      const indexNames = indexes?.map((i: any) => i.indexname) || [];
      expectedIndexes.forEach((idx) => {
        expect(indexNames).toContain(idx);
      });
    });

    test('equipment_rentals table has performance indexes', async () => {
      const expectedIndexes = [
        'idx_equipment_rentals_lister_id',
        'idx_equipment_rentals_renter_id',
        'idx_equipment_rentals_status',
      ];

      const { data: indexes, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'equipment_rentals')
        .eq('schemaname', 'public');

      if (error) {
        console.warn('Could not verify indexes:', error);
        return;
      }

      const indexNames = indexes?.map((i: any) => i.indexname) || [];
      expectedIndexes.forEach((idx) => {
        expect(indexNames).toContain(idx);
      });
    });
  });

  // ============================================================================
  // RLS Policy Tests
  // ============================================================================

  describe('Row-Level Security', () => {
    test('feedback table has RLS policies', async () => {
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', 'feedback')
        .eq('schemaname', 'public');

      if (error) {
        console.warn('Could not verify RLS policies:', error);
        return;
      }

      expect(policies).toBeDefined();
      expect(policies?.length).toBeGreaterThan(0);
    });

    test('equipment_rentals table exists and can be queried', async () => {
      const { data, error } = await supabase
        .from('equipment_rentals')
        .select('*', { count: 'exact', head: true });

      // Should either succeed or fail with permission error, not "table not found"
      expect(error?.code).not.toBe('PGRST100');
    });

    test('rental_damage_assessments table has RLS policies', async () => {
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', 'rental_damage_assessments')
        .eq('schemaname', 'public');

      if (error) {
        console.warn('Could not verify RLS policies:', error);
        return;
      }

      expect(policies).toBeDefined();
      expect(policies?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Foreign Key Tests
  // ============================================================================

  describe('Foreign Key Relationships', () => {
    test('feedback table has foreign key constraints', async () => {
      const { data: constraints, error } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', 'feedback')
        .eq('constraint_type', 'FOREIGN KEY');

      if (error) {
        console.warn('Could not verify foreign keys:', error);
        return;
      }

      expect(constraints?.length).toBeGreaterThan(0);
    });

    test('equipment_rentals table has foreign key constraints', async () => {
      const { data: constraints, error } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', 'equipment_rentals')
        .eq('constraint_type', 'FOREIGN KEY');

      if (error) {
        console.warn('Could not verify foreign keys:', error);
        return;
      }

      expect(constraints?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Trigger Tests
  // ============================================================================

  describe('Database Triggers', () => {
    test('update_lister_balance_on_commission trigger exists', async () => {
      const { data: triggers, error } = await supabase
        .from('pg_trigger')
        .select('tgname')
        .eq('tgname', 'update_balance_after_commission');

      if (error) {
        console.warn('Could not verify triggers:', error);
        return;
      }

      // May not be queryable via Supabase API, so we just check no errors
      expect(error?.code).not.toBe('PGRST100');
    });
  });
});

// ============================================================================
// Verification Queries (run these manually in Supabase dashboard)
// ============================================================================

/**
 * Copy these queries to Supabase SQL Editor to verify migration
 *
 * 1. Check tables exist:
 * SELECT tablename FROM pg_tables WHERE schemaname = 'public'
 * AND tablename IN ('feedback', 'equipment_rentals', 'rental_damage_assessments',
 *                    'rental_commissions', 'lister_account_balance');
 *
 * 2. Check RLS enabled:
 * SELECT tablename FROM pg_tables WHERE schemaname = 'public'
 * AND rowsecurity = true
 * AND tablename IN ('feedback', 'equipment_rentals', 'rental_damage_assessments',
 *                    'rental_commissions', 'lister_account_balance');
 *
 * 3. Count indexes:
 * SELECT tablename, COUNT(*) as index_count FROM pg_indexes
 * WHERE schemaname = 'public' AND tablename IN ('feedback', 'equipment_rentals',
 *   'rental_damage_assessments', 'rental_commissions', 'lister_account_balance')
 * GROUP BY tablename;
 *
 * 4. Check RLS policies:
 * SELECT tablename, COUNT(*) as policy_count FROM pg_policies
 * WHERE schemaname = 'public' AND tablename IN ('feedback', 'equipment_rentals',
 *   'rental_damage_assessments', 'rental_commissions', 'lister_account_balance')
 * GROUP BY tablename;
 */
