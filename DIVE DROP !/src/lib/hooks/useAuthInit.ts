'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to initialize authentication state on client-side
 * Fetches current user from Supabase and updates store
 */
export function useAuthInit() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [setUser, setLoading]);
}
