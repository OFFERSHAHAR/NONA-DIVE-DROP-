/**
 * JARVIS ZERO OS - Supabase Client Initialization
 * Production-ready TypeScript client for Supabase PostgreSQL
 *
 * Usage:
 * - Client-side: use `createClient()`
 * - Server-side: use `createServiceRoleClient()`
 *
 * Features:
 * - Real-time subscriptions enabled
 * - Automatic reconnection on disconnect
 * - Type-safe operations
 * - Secure credential handling
 */

import { createBrowserClient } from '@supabase/ssr';
import { createClient as createServerClient } from '@supabase/supabase-js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Database Types
 * These match your database schema exactly
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          status: 'active' | 'inactive' | 'suspended';
          role: 'super_admin' | 'owner' | 'member';
          permissions: string[];
          preferences: Record<string, any>;
          created_at: string;
          updated_at: string;
          last_login: string | null;
          last_login_ip: string | null;
          login_count: number;
          total_sessions: number;
          data_export_requested_at: string | null;
          deletion_requested_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          status?: 'active' | 'inactive' | 'suspended';
          role?: 'super_admin' | 'owner' | 'member';
          permissions?: string[];
          preferences?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          last_login_ip?: string | null;
          login_count?: number;
          total_sessions?: number;
          data_export_requested_at?: string | null;
          deletion_requested_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          status?: 'active' | 'inactive' | 'suspended';
          role?: 'super_admin' | 'owner' | 'member';
          permissions?: string[];
          preferences?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          last_login_ip?: string | null;
          login_count?: number;
          total_sessions?: number;
          data_export_requested_at?: string | null;
          deletion_requested_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived';
          priority: 'critical' | 'high' | 'medium' | 'low';
          owner_id: string;
          assigned_to_id: string | null;
          due_date: string | null;
          start_date: string | null;
          completed_at: string | null;
          estimated_hours: number | null;
          actual_hours: number | null;
          progress_percentage: number;
          tags: string[] | null;
          category: string | null;
          parent_task_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived';
          priority?: 'critical' | 'high' | 'medium' | 'low';
          owner_id: string;
          assigned_to_id?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          completed_at?: string | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          progress_percentage?: number;
          tags?: string[] | null;
          category?: string | null;
          parent_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived';
          priority?: 'critical' | 'high' | 'medium' | 'low';
          owner_id?: string;
          assigned_to_id?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          completed_at?: string | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          progress_percentage?: number;
          tags?: string[] | null;
          category?: string | null;
          parent_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          start_time: string;
          end_time: string;
          all_day: boolean;
          timezone: string;
          organizer_id: string;
          participants: string[];
          event_type: 'meeting' | 'task' | 'personal' | 'holiday' | 'other';
          status: 'scheduled' | 'tentative' | 'cancelled' | 'completed';
          recurrence_rule: string | null;
          recurrence_end_date: string | null;
          is_recurring: boolean;
          external_id: string | null;
          source: 'manual' | 'google' | 'outlook' | 'ical';
          send_reminder: boolean;
          reminder_minutes_before: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          location?: string | null;
          start_time: string;
          end_time: string;
          all_day?: boolean;
          timezone?: string;
          organizer_id: string;
          participants?: string[];
          event_type?: 'meeting' | 'task' | 'personal' | 'holiday' | 'other';
          status?: 'scheduled' | 'tentative' | 'cancelled' | 'completed';
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          is_recurring?: boolean;
          external_id?: string | null;
          source?: 'manual' | 'google' | 'outlook' | 'ical';
          send_reminder?: boolean;
          reminder_minutes_before?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          start_time?: string;
          end_time?: string;
          all_day?: boolean;
          timezone?: string;
          organizer_id?: string;
          participants?: string[];
          event_type?: 'meeting' | 'task' | 'personal' | 'holiday' | 'other';
          status?: 'scheduled' | 'tentative' | 'cancelled' | 'completed';
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          is_recurring?: boolean;
          external_id?: string | null;
          source?: 'manual' | 'google' | 'outlook' | 'ical';
          send_reminder?: boolean;
          reminder_minutes_before?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      vault_notes: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string | null;
          folder_path: string | null;
          tags: string[] | null;
          owner_id: string;
          is_published: boolean;
          is_pinned: boolean;
          parent_note_id: string | null;
          linked_note_ids: string[];
          related_task_ids: string[];
          last_synced_at: string | null;
          sync_status: 'synced' | 'syncing' | 'conflict' | 'error';
          external_id: string | null;
          word_count: number | null;
          read_time_minutes: number | null;
          created_at: string;
          updated_at: string;
          viewed_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content?: string | null;
          folder_path?: string | null;
          tags?: string[] | null;
          owner_id: string;
          is_published?: boolean;
          is_pinned?: boolean;
          parent_note_id?: string | null;
          linked_note_ids?: string[];
          related_task_ids?: string[];
          last_synced_at?: string | null;
          sync_status?: 'synced' | 'syncing' | 'conflict' | 'error';
          external_id?: string | null;
          word_count?: number | null;
          read_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
          viewed_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          content?: string | null;
          folder_path?: string | null;
          tags?: string[] | null;
          owner_id?: string;
          is_published?: boolean;
          is_pinned?: boolean;
          parent_note_id?: string | null;
          linked_note_ids?: string[];
          related_task_ids?: string[];
          last_synced_at?: string | null;
          sync_status?: 'synced' | 'syncing' | 'conflict' | 'error';
          external_id?: string | null;
          word_count?: number | null;
          read_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
          viewed_at?: string | null;
          deleted_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          content: string;
          message_type: 'text' | 'image' | 'file' | 'code' | 'system';
          sender_id: string;
          recipient_ids: string[];
          conversation_id: string | null;
          channel_name: string | null;
          has_attachments: boolean;
          attachment_urls: string[];
          mention_user_ids: string[];
          status: 'draft' | 'sent' | 'read' | 'edited' | 'deleted';
          is_edited: boolean;
          edited_at: string | null;
          reactions: Record<string, any>;
          thread_id: string | null;
          reply_count: number;
          created_at: string;
          updated_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          content: string;
          message_type?: 'text' | 'image' | 'file' | 'code' | 'system';
          sender_id: string;
          recipient_ids?: string[];
          conversation_id?: string | null;
          channel_name?: string | null;
          has_attachments?: boolean;
          attachment_urls?: string[];
          mention_user_ids?: string[];
          status?: 'draft' | 'sent' | 'read' | 'edited' | 'deleted';
          is_edited?: boolean;
          edited_at?: string | null;
          reactions?: Record<string, any>;
          thread_id?: string | null;
          reply_count?: number;
          created_at?: string;
          updated_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          content?: string;
          message_type?: 'text' | 'image' | 'file' | 'code' | 'system';
          sender_id?: string;
          recipient_ids?: string[];
          conversation_id?: string | null;
          channel_name?: string | null;
          has_attachments?: boolean;
          attachment_urls?: string[];
          mention_user_ids?: string[];
          status?: 'draft' | 'sent' | 'read' | 'edited' | 'deleted';
          is_edited?: boolean;
          edited_at?: string | null;
          reactions?: Record<string, any>;
          thread_id?: string | null;
          reply_count?: number;
          created_at?: string;
          updated_at?: string;
          read_at?: string | null;
        };
      };
      app_windows: {
        Row: {
          id: string;
          window_id: string;
          user_id: string;
          app_name: 'dashboard' | 'tasks' | 'calendar' | 'vault' | 'messages' | 'settings' | 'collaboration';
          is_open: boolean;
          is_minimized: boolean;
          is_maximized: boolean;
          is_focused: boolean;
          x: number;
          y: number;
          width: number;
          height: number;
          z_index: number;
          title: string | null;
          icon_url: string | null;
          state_data: Record<string, any>;
          scroll_position: Record<string, any>;
          created_at: string;
          updated_at: string;
          last_focused_at: string | null;
        };
        Insert: {
          id?: string;
          window_id: string;
          user_id: string;
          app_name: 'dashboard' | 'tasks' | 'calendar' | 'vault' | 'messages' | 'settings' | 'collaboration';
          is_open?: boolean;
          is_minimized?: boolean;
          is_maximized?: boolean;
          is_focused?: boolean;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          z_index?: number;
          title?: string | null;
          icon_url?: string | null;
          state_data?: Record<string, any>;
          scroll_position?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          last_focused_at?: string | null;
        };
        Update: {
          id?: string;
          window_id?: string;
          user_id?: string;
          app_name?: 'dashboard' | 'tasks' | 'calendar' | 'vault' | 'messages' | 'settings' | 'collaboration';
          is_open?: boolean;
          is_minimized?: boolean;
          is_maximized?: boolean;
          is_focused?: boolean;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          z_index?: number;
          title?: string | null;
          icon_url?: string | null;
          state_data?: Record<string, any>;
          scroll_position?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          last_focused_at?: string | null;
        };
      };
      presence: {
        Row: {
          id: string;
          user_id: string;
          status: 'online' | 'away' | 'do_not_disturb' | 'offline';
          status_message: string | null;
          current_app: string | null;
          current_location: string | null;
          last_seen: string;
          last_activity: string;
          session_id: string | null;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'online' | 'away' | 'do_not_disturb' | 'offline';
          status_message?: string | null;
          current_app?: string | null;
          current_location?: string | null;
          last_seen?: string;
          last_activity?: string;
          session_id?: string | null;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'online' | 'away' | 'do_not_disturb' | 'offline';
          status_message?: string | null;
          current_app?: string | null;
          current_location?: string | null;
          last_seen?: string;
          last_activity?: string;
          session_id?: string | null;
          ip_address?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          user_id: string | null;
          changes: Record<string, any> | null;
          status: 'success' | 'failure' | 'pending';
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          user_id?: string | null;
          changes?: Record<string, any> | null;
          status?: 'success' | 'failure' | 'pending';
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          user_id?: string | null;
          changes?: Record<string, any> | null;
          status?: 'success' | 'failure' | 'pending';
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

// ============================================================================
// CLIENT-SIDE CLIENT (Browser)
// ============================================================================

/**
 * Create a browser-safe Supabase client
 * Use this in React components and client-side code
 *
 * @example
 * const supabase = createClient();
 * const { data } = await supabase.from('tasks').select();
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ============================================================================
// SERVER-SIDE CLIENT (Node.js / API Routes)
// ============================================================================

/**
 * Create a server-side Supabase client with service role key
 * Use this in API routes and server-side functions for elevated privileges
 *
 * WARNING: Keep SUPABASE_SERVICE_ROLE_KEY secret!
 * Never expose it to the client.
 *
 * @example
 * const supabase = createServiceRoleClient();
 * const { data } = await supabase.from('tasks').select();
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

// ============================================================================
// SINGLETON INSTANCE (for convenience)
// ============================================================================

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create a singleton Supabase client
 * Prevents multiple client instances from being created
 *
 * @example
 * const supabase = getSupabaseClient();
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient();
  return await supabase.auth.signOut();
}

/**
 * Realtime error handler with automatic reconnection
 */
export function setupRealtimeErrorHandler() {
  const supabase = createClient();

  // Listen for connection status changes
  supabase.realtime.onOpen(() => {
    console.log('[Supabase Real-time] Connected');
  });

  supabase.realtime.onClose(() => {
    console.log('[Supabase Real-time] Disconnected');
  });

  supabase.realtime.onError((err) => {
    console.error('[Supabase Real-time] Error:', err);
  });
}

/**
 * Test database connection
 */
export async function testDatabaseConnection() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .select('COUNT(*)', { count: 'exact' })
      .limit(1);

    if (error) throw error;

    return { connected: true, error: null };
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export default client
export const supabase = getSupabaseClient();
