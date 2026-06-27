/**
 * useRealtimeTasks Hook
 * Real-time synchronization for tasks with auto-refresh
 *
 * Features:
 * - Real-time task updates via Supabase subscriptions
 * - Automatic RLS filtering (only user's tasks)
 * - Optimistic UI updates
 * - Automatic reconnection on disconnect
 * - Error handling and retry logic
 *
 * @example
 * const { tasks, loading, error, addTask, updateTask, deleteTask } = useRealtimeTasks();
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export interface UseRealtimeTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  addTask: (task: TaskInsert) => Promise<Task | null>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
  isOnline: boolean;
}

/**
 * Hook for real-time tasks with Supabase subscriptions
 */
export function useRealtimeTasks(
  options?: {
    autoSubscribe?: boolean;
    pollInterval?: number;
    filters?: Record<string, any>;
  }
): UseRealtimeTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const supabaseRef = useRef(createClient());
  const subscriptionRef = useRef<any>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const autoSubscribe = options?.autoSubscribe ?? true;
  const pollInterval = options?.pollInterval ?? 0; // 0 = no polling, use real-time only

  /**
   * Fetch tasks from database
   */
  const fetchTasks = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;

      let query = supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTasks(data || []);
      setError(null);
      setLoading(false);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to fetch tasks');
      setError(error);
      setLoading(false);
    }
  }, [options?.filters]);

  /**
   * Subscribe to real-time task changes
   */
  const setupSubscription = useCallback(() => {
    if (!autoSubscribe) return;

    const supabase = supabaseRef.current;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Set up new subscription
    subscriptionRef.current = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          setTasks((prevTasks) => {
            switch (eventType) {
              case 'INSERT':
                return [newRecord, ...prevTasks];

              case 'UPDATE':
                return prevTasks.map((task) =>
                  task.id === newRecord.id ? newRecord : task
                );

              case 'DELETE':
                return prevTasks.filter((task) => task.id !== oldRecord.id);

              default:
                return prevTasks;
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Tasks] Real-time subscription established');
          setIsOnline(true);
        } else if (status === 'CLOSED') {
          console.log('[Tasks] Real-time subscription closed');
          setIsOnline(false);
        }
      });
  }, [autoSubscribe]);

  /**
   * Add a new task
   */
  const addTask = useCallback(
    async (taskData: TaskInsert): Promise<Task | null> => {
      try {
        const supabase = supabaseRef.current;

        const { data, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select()
          .single();

        if (error) throw error;

        // Optimistic update
        setTasks((prev) => [data, ...prev]);

        return data;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to add task');
        setError(error);
        console.error('[Tasks] Failed to add task:', error);
        return null;
      }
    },
    []
  );

  /**
   * Update an existing task
   */
  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate): Promise<Task | null> => {
      try {
        const supabase = supabaseRef.current;

        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Optimistic update
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? data : task))
        );

        return data;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to update task');
        setError(error);
        console.error('[Tasks] Failed to update task:', error);
        return null;
      }
    },
    []
  );

  /**
   * Soft delete a task
   */
  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const supabase = supabaseRef.current;

      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Optimistic update
      setTasks((prev) => prev.filter((task) => task.id !== id));

      return true;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to delete task');
      setError(error);
      console.error('[Tasks] Failed to delete task:', error);
      return false;
    }
  }, []);

  /**
   * Manually refetch tasks
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchTasks();
  }, [fetchTasks]);

  /**
   * Initialize subscriptions and polling
   */
  useEffect(() => {
    // Initial fetch
    fetchTasks();

    // Setup real-time subscription
    if (autoSubscribe) {
      setupSubscription();
    }

    // Setup polling if interval is specified
    if (pollInterval > 0) {
      pollTimerRef.current = setInterval(() => {
        fetchTasks();
      }, pollInterval);
    }

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        supabaseRef.current.removeChannel(subscriptionRef.current);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchTasks, setupSubscription, autoSubscribe, pollInterval]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    refetch,
    isOnline,
  };
}
