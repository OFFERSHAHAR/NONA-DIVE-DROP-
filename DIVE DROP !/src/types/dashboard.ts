/**
 * Dashboard Types
 * Type definitions for the admin live dashboard
 */

export interface AdminStats {
  total: number;
  active: number;
  roles: number;
  recentActions: number;
  actionsToday: number;
  lastActivityTime: string;
}

export interface ShuttleStats {
  total: number;
  active: number;
  totalCapacity: number;
  totalBooked: number;
  occupancyRate: number;
  upcomingSchedules: number;
  pendingBookings: number;
}

export interface DiveSiteStats {
  total: number;
  published: number;
  featured: number;
  totalImages: number;
  pendingModeration: number;
  pendingImages: number;
  recentUpdate: string;
}

export interface SystemHealth {
  apiStatus: 'operational' | 'degraded' | 'offline';
  dbStatus: 'connected' | 'reconnecting' | 'disconnected';
  lastSync: string;
  dataFreshness: 'fresh' | 'stale' | 'updating';
}

export interface RecentActivity {
  id: string;
  action: string;
  resource: string;
  timestamp: string;
  user: string;
  status: 'success' | 'failure' | 'pending';
}

export interface DashboardStats {
  admins: AdminStats;
  shuttles: ShuttleStats;
  diveSites: DiveSiteStats;
  systemHealth: SystemHealth;
  recentActivities: RecentActivity[];
}

export interface DashboardCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: string;
  color: string;
  percentage?: number;
}
