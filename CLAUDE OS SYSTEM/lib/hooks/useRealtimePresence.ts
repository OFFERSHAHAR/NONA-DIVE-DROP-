/**
 * useRealtimePresence Hook
 * Real-time presence status for collaborative features
 *
 * Features:
 * - Track online/offline status ("Aur is online")
 * - Automatic status updates
 * - Last seen tracking
 * - Current app/location info
 * - Presence subscriptions for all users
 *
 * @example
 * const { users, currentUser, setStatus, setActivity } = useRealtimePresence();
 *
 * // Check if Aur is online
 * const aur = users.find(u => u.username === 'aur');
 * console.log(`${aur?.display_name} is ${aur?.presence?.status}`);
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type User = Database['public']['Tables']['users']['Row'];
type Presence = Database['public']['Tables']['presence']['Row'];

export interface UserWithPresence extends User {
  presence?: Presence;
}

export interface UseRealtimePresenceReturn {
  users: UserWithPresence[];
  currentUser: UserWithPresence | null;
  loading: boolean;
  error: Error | null;
  setStatus: (
    status: 'online' | 'away' | 'do_not_disturb' | 'offline',
    message?: string
  ) => Promise<boolean>;
  setActivity: (
    currentApp: string,
    currentLocation?: string
  ) => Promise<boolean>;
  isOnline: boolean;
  getUserByUsername: (username: string) => UserWithPresence | undefined;
  getUserById: (id: string) => UserWithPresence | undefined;
}

/**
 * Hook for real-time user presence tracking
 */
export function useRealtimePresence(
  options?: {
    autoSubscribe?: boolean;
    pollInterval?: number;
    includeOffline?: boolean;
  }
): UseRealtimePresenceReturn {
  const [users, setUsers] = useState<UserWithPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<UserWithPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const supabaseRef = useRef(createClient());
  const subscriptionRef = useRef<any>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const autoSubscribe = options?.autoSubscribe ?? true;
  const pollInterval = options?.pollInterval ?? 0;
  const includeOffline = options?.includeOffline ?? false;

  /**
   * Get current authenticated user
   */
  const getCurrentAuthUser = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return null;

      // Fetch user profile
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      return userProfile;
    } catch (err) {
      console.error('[Presence] Failed to get current user:', err);
      return null;
    }
  }, []);

  /**
   * Fetch all users and their presence
   */
  const fetchUsersWithPresence = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;

      // Get current user
      const current = await getCurrentAuthUser();
      if (current) {
        setCurrentUser(current);
      }

      // Fetch all users
      let userQuery = supabase
        .from('users')
        .select('*')
        .eq('status', 'active');

      const { data: usersData, error: usersError } = await userQuery;

      if (usersError) throw usersError;

      // Fetch presence info for each user
      const usersWithPresence = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: presenceData, error: presenceError } = await supabase
            .from('presence')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!presenceError && presenceData) {
            return {
              ...user,
              presence: presenceData,
            };
          }

          return {
            ...user,
            presence: {
              id: crypto.randomUUID(),
              user_id: user.id,
              status: 'offline' as const,
              last_seen: new Date().toISOString(),
              last_activity: new Date().toISOString(),
            } as Presence,
          };
        })
      );

      // Filter offline users if requested
      const filteredUsers = includeOffline
        ? usersWithPresence
        : usersWithPresence.filter(
            (u) => u.presence?.status !== 'offline'
          );

      setUsers(filteredUsers);
      setError(null);
      setLoading(false);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to fetch users and presence');
      setError(error);
      setLoading(false);
    }
  }, [getCurrentAuthUser, includeOffline]);

  /**
   * Subscribe to presence changes
   */
  const setupSubscription = useCallback(() => {
    if (!autoSubscribe) return;

    const supabase = supabaseRef.current;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Set up new subscription for presence changes
    subscriptionRef.current = supabase
      .channel('public:presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence',
        },
        (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          setUsers((prevUsers) => {
            switch (eventType) {
              case 'INSERT':
                return prevUsers.map((user) =>
                  user.id === newRecord.user_id
                    ? { ...user, presence: newRecord }
                    : user
                );

              case 'UPDATE':
                return prevUsers.map((user) =>
                  user.id === newRecord.user_id
                    ? { ...user, presence: newRecord }
                    : user
                );

              case 'DELETE':
                return prevUsers.map((user) =>
                  user.id === oldRecord.user_id
                    ? {
                        ...user,
                        presence: {
                          ...oldRecord,
                          status: 'offline' as const,
                        },
                      }
                    : user
                );

              default:
                return prevUsers;
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Presence] Real-time subscription established');
          setIsOnline(true);
        } else if (status === 'CLOSED') {
          console.log('[Presence] Real-time subscription closed');
          setIsOnline(false);
        }
      });
  }, [autoSubscribe]);

  /**
   * Set user status
   */
  const setStatus = useCallback(
    async (
      status: 'online' | 'away' | 'do_not_disturb' | 'offline',
      message?: string
    ): Promise<boolean> => {
      try {
        const supabase = supabaseRef.current;
        const authUser = await getCurrentAuthUser();

        if (!authUser) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('presence')
          .upsert(
            {
              user_id: authUser.id,
              status,
              status_message: message || null,
              last_activity: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) throw error;

        // Update local state
        setCurrentUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            presence: {
              ...prev.presence,
              status,
              status_message: message || null,
              last_activity: new Date().toISOString(),
            } as Presence,
          };
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to set status');
        setError(error);
        console.error('[Presence] Failed to set status:', error);
        return false;
      }
    },
    [getCurrentAuthUser]
  );

  /**
   * Set user activity (current app and location)
   */
  const setActivity = useCallback(
    async (currentApp: string, currentLocation?: string): Promise<boolean> => {
      try {
        const supabase = supabaseRef.current;
        const authUser = await getCurrentAuthUser();

        if (!authUser) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('presence')
          .upsert(
            {
              user_id: authUser.id,
              current_app: currentApp,
              current_location: currentLocation || null,
              last_activity: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) throw error;

        // Update local state
        setCurrentUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            presence: {
              ...prev.presence,
              current_app: currentApp,
              current_location: currentLocation || null,
              last_activity: new Date().toISOString(),
            } as Presence,
          };
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to set activity');
        console.error('[Presence] Failed to set activity:', error);
        return false;
      }
    },
    [getCurrentAuthUser]
  );

  /**
   * Get user by username
   */
  const getUserByUsername = useCallback(
    (username: string): UserWithPresence | undefined => {
      return users.find((u) => u.username === username);
    },
    [users]
  );

  /**
   * Get user by ID
   */
  const getUserById = useCallback(
    (id: string): UserWithPresence | undefined => {
      return users.find((u) => u.id === id);
    },
    [users]
  );

  /**
   * Update activity status periodically
   */
  const updateActivityStatus = useCallback(async () => {
    if (!currentUser) return;

    try {
      const supabase = supabaseRef.current;

      const { error } = await supabase
        .from('presence')
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq('user_id', currentUser.id);

      if (error) throw error;
    } catch (err) {
      console.error('[Presence] Failed to update activity:', err);
    }
  }, [currentUser]);

  /**
   * Initialize subscriptions and polling
   */
  useEffect(() => {
    // Initial fetch
    fetchUsersWithPresence();

    // Set default online status
    setStatus('online');

    // Setup real-time subscription
    if (autoSubscribe) {
      setupSubscription();
    }

    // Setup polling if interval is specified
    if (pollInterval > 0) {
      pollTimerRef.current = setInterval(() => {
        fetchUsersWithPresence();
      }, pollInterval);
    }

    // Update activity every 30 seconds
    statusUpdateTimerRef.current = setInterval(() => {
      updateActivityStatus();
    }, 30000);

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        supabaseRef.current.removeChannel(subscriptionRef.current);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      if (statusUpdateTimerRef.current) {
        clearInterval(statusUpdateTimerRef.current);
      }

      // Set offline status when component unmounts
      setStatus('offline');
    };
  }, [
    fetchUsersWithPresence,
    setupSubscription,
    autoSubscribe,
    pollInterval,
    updateActivityStatus,
    setStatus,
  ]);

  return {
    users,
    currentUser,
    loading,
    error,
    setStatus,
    setActivity,
    isOnline,
    getUserByUsername,
    getUserById,
  };
}
