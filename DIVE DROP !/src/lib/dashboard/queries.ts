/**
 * Centralized Dashboard Queries
 * Extracted from API routes for reuse in both API handlers and server components
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { AdminStats } from '@/lib/types/admin';

/**
 * Options for dashboard query customization
 */
export interface DashboardQueryOptions {
  includeStats?: boolean;
  includeUsers?: boolean;
  includeShuttles?: boolean;
  includeDiveSites?: boolean;
  includeEquipment?: boolean;
}

/**
 * Dashboard data result
 */
export interface DashboardData {
  stats: AdminStats | null;
  users: any[] | null;
  shuttles: any[] | null;
  diveSites: any[] | null;
  equipment: any[] | null;
}

/**
 * Fetch admin dashboard statistics
 * Fetches aggregated statistics about system usage and health
 */
export async function fetchAdminStats(): Promise<AdminStats | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Fetch total users
    const { count: totalUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true });

    // Fetch total dive sites
    const { count: totalDiveSites } = await supabase
      .from('dive_sites')
      .select('*', { count: 'exact', head: true });

    // Fetch total shuttles
    const { count: totalShuttles } = await supabase
      .from('shuttles')
      .select('*', { count: 'exact', head: true });

    // Fetch active bookings (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    // Fetch equipment count
    const { count: totalEquipment } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });

    // Fetch pending reports
    const { count: pendingReports } = await supabase
      .from('damage_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      totalUsers: totalUsers || 0,
      totalDiveSites: totalDiveSites || 0,
      totalShuttles: totalShuttles || 0,
      activeBookings: activeBookings || 0,
      totalEquipment: totalEquipment || 0,
      pendingReports: pendingReports || 0,
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return null;
  }
}

/**
 * Fetch admin dashboard data with optional filtering
 */
export async function fetchAdminDashboard(
  options: DashboardQueryOptions = {}
): Promise<DashboardData> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const result: DashboardData = {
    stats: null,
    users: null,
    shuttles: null,
    diveSites: null,
    equipment: null,
  };

  try {
    if (options.includeStats) {
      result.stats = await fetchAdminStats();
    }

    if (options.includeUsers) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, created_at')
        .limit(100);
      result.users = users || [];
    }

    if (options.includeShuttles) {
      const { data: shuttles } = await supabase
        .from('shuttles')
        .select('*')
        .limit(100);
      result.shuttles = shuttles || [];
    }

    if (options.includeDiveSites) {
      const { data: diveSites } = await supabase
        .from('dive_sites')
        .select('*')
        .limit(100);
      result.diveSites = diveSites || [];
    }

    if (options.includeEquipment) {
      const { data: equipment } = await supabase
        .from('equipment')
        .select('*')
        .limit(100);
      result.equipment = equipment || [];
    }

    return result;
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return result;
  }
}

/**
 * Fetch user-specific dashboard metrics
 * Returns metrics relevant to a specific user
 */
export async function fetchUserDashboardMetrics(userId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Fetch user's bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId);

    // Fetch user's listings
    const { data: listings } = await supabase
      .from('listings')
      .select('*')
      .eq('owner_id', userId);

    return {
      totalBookings: bookings?.length || 0,
      totalListings: listings?.length || 0,
      recentBookings: bookings?.slice(0, 5) || [],
    };
  } catch (error) {
    console.error('Error fetching user dashboard metrics:', error);
    return {
      totalBookings: 0,
      totalListings: 0,
      recentBookings: [],
    };
  }
}

/**
 * Fetch real-time metrics for a resource
 * Typically used for dashboard updates
 */
export async function fetchRealtimeMetrics() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Get last hour's activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: recentActivity } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo);

    return {
      recentActivity: recentActivity || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching realtime metrics:', error);
    return {
      recentActivity: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
