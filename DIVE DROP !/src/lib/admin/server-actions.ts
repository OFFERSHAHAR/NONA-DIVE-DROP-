'use server';

import { createClient } from '@/lib/supabase/server';
import { logCreate, logUpdate, logDelete, logImport, logExport } from './audit';
import type {
  CreateUserInput,
  UpdateUserInput,
  CreateDiveSiteInput,
  UpdateDiveSiteInput,
  BulkUserImportInput,
  BulkDiveSiteImportInput,
  CreateShuttleInput,
  UpdateShuttleInput,
  ExportQueryInput,
} from './schemas';

/**
 * SERVER ACTIONS FOR ADMIN OPERATIONS
 *
 * Server Actions are preferred over API routes for:
 * - Direct database access without serialization overhead
 * - Simpler error handling
 * - Built-in CSRF protection
 * - Client-side form submission handling
 *
 * Use API routes (/api/admin/*) for:
 * - Batch operations
 * - File uploads requiring FormData
 * - Webhooks and external integrations
 * - When building mobile/external client support
 */

// ============================================================================
// USERS
// ============================================================================

export async function createUser(input: CreateUserInput) {
  try {
    const supabase = (await createClient()) as any;

    // Get current user for audit logging
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', input.email)
      .single();

    if (existing) {
      throw new Error('Email already exists');
    }

    // Create user
    const { data, error } = await supabase
      .from('users')
      .insert([input])
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logCreate('users', data.id, currentUser.id, input);

    return { success: true, data };
  } catch (error: any) {
    console.error('Create user error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('users')
      .update(input)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await logUpdate('users', userId, currentUser.id, input);

    return { success: true, data };
  } catch (error: any) {
    console.error('Update user error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    await logDelete('users', userId, currentUser.id);

    return { success: true };
  } catch (error: any) {
    console.error('Delete user error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUsers(page: number = 1, limit: number = 20) {
  try {
    const supabase = (await createClient()) as any;

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get paginated data
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data, total: count || 0, page, limit };
  } catch (error: any) {
    console.error('Get users error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// DIVE SITES
// ============================================================================

export async function createDiveSite(input: CreateDiveSiteInput) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('dive_sites')
      .insert([input])
      .select()
      .single();

    if (error) throw error;

    await logCreate('dive_sites', data.id, currentUser.id, input);

    return { success: true, data };
  } catch (error: any) {
    console.error('Create dive site error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateDiveSite(siteId: string, input: UpdateDiveSiteInput) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('dive_sites')
      .update(input)
      .eq('id', siteId)
      .select()
      .single();

    if (error) throw error;

    await logUpdate('dive_sites', siteId, currentUser.id, input);

    return { success: true, data };
  } catch (error: any) {
    console.error('Update dive site error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteDiveSite(siteId: string) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('dive_sites')
      .delete()
      .eq('id', siteId);

    if (error) throw error;

    await logDelete('dive_sites', siteId, currentUser.id);

    return { success: true };
  } catch (error: any) {
    console.error('Delete dive site error:', error);
    return { success: false, error: error.message };
  }
}

export async function getDiveSites(page: number = 1, limit: number = 20) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const offset = (page - 1) * limit;

    const { count } = await supabase
      .from('dive_sites')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('dive_sites')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data, total: count || 0, page, limit };
  } catch (error: any) {
    console.error('Get dive sites error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SHUTTLES
// ============================================================================

export async function createShuttle(input: CreateShuttleInput) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('shuttles')
      .insert([input])
      .select()
      .single();

    if (error) throw error;

    await logCreate('shuttles', data.id, currentUser.id, input);

    return { success: true, data };
  } catch (error: any) {
    console.error('Create shuttle error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateShuttle(shuttleId: string, input: UpdateShuttleInput) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('shuttles')
      .update(input)
      .eq('id', shuttleId)
      .select()
      .single();

    if (error) throw error;

    await logUpdate('shuttles', shuttleId, currentUser.id, input);

    return { success: true, data };
  } catch (error: any) {
    console.error('Update shuttle error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteShuttle(shuttleId: string) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('shuttles')
      .delete()
      .eq('id', shuttleId);

    if (error) throw error;

    await logDelete('shuttles', shuttleId, currentUser.id);

    return { success: true };
  } catch (error: any) {
    console.error('Delete shuttle error:', error);
    return { success: false, error: error.message };
  }
}

export async function getShuttles(page: number = 1, limit: number = 20) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const offset = (page - 1) * limit;

    const { count } = await supabase
      .from('shuttles')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('shuttles')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data, total: count || 0, page, limit };
  } catch (error: any) {
    console.error('Get shuttles error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXPORT OPERATIONS
// ============================================================================

export async function exportUsers(format: 'json' | 'csv' = 'json') {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await logExport('users', currentUser.id, { format, count: data?.length || 0 });

    if (format === 'csv') {
      return { success: true, data: convertToCSV(data || []) };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Export users error:', error);
    return { success: false, error: error.message };
  }
}

export async function exportDiveSites(format: 'json' | 'csv' = 'json') {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('dive_sites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await logExport('dive_sites', currentUser.id, { format, count: data?.length || 0 });

    if (format === 'csv') {
      return { success: true, data: convertToCSV(data || []) };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Export dive sites error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(header => {
      const value = obj[header];
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value ?? '');
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
