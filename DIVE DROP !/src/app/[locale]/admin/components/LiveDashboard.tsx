'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardStats, DashboardCardProps } from '@/types/dashboard';

export default function LiveDashboard() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      setIsOnline(true);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Refresh every 5 seconds
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const StatCard = ({ title, value, icon, color, subtitle, percentage }: DashboardCardProps) => (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {title}
          </p>
          <p className={`text-2xl font-bold ${color}`}>
            {value.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      {percentage !== undefined && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              color.includes('blue')
                ? 'bg-blue-500'
                : color.includes('green')
                  ? 'bg-green-500'
                  : color.includes('purple')
                    ? 'bg-purple-500'
                    : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-40 bg-slate-200 dark:bg-slate-700 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-red-900 dark:text-red-200">
        <p className="font-semibold mb-2">⚠️ Failed to load dashboard</p>
        <p className="text-sm">Unable to fetch dashboard statistics. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            📊 Live Statistics
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isOnline ? '🟢 Live' : '🔴 Offline'} • Last updated: {getTimeAgo(lastUpdated)}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Admin Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          👨‍💼 Administration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Admins"
            value={stats.admins.total}
            icon="👥"
            color="text-blue-600 dark:text-blue-400"
            subtitle={`${stats.admins.active} active`}
            percentage={(stats.admins.active / stats.admins.total) * 100}
          />
          <StatCard
            title="Admin Roles"
            value={stats.admins.roles}
            icon="🔐"
            color="text-purple-600 dark:text-purple-400"
            subtitle="System roles"
            percentage={Math.min((stats.admins.roles / 10) * 100, 100)}
          />
          <StatCard
            title="Recent Actions"
            value={stats.admins.recentActions}
            icon="📋"
            color="text-indigo-600 dark:text-indigo-400"
            subtitle={`${stats.admins.actionsToday} today`}
          />
          <StatCard
            title="System Health"
            value={1}
            icon="✅"
            color="text-green-600 dark:text-green-400"
            subtitle={stats.systemHealth.apiStatus}
          />
        </div>
      </div>

      {/* Shuttles Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          🚤 Shuttles & Bookings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Shuttles"
            value={stats.shuttles.active}
            icon="⛴️"
            color="text-cyan-600 dark:text-cyan-400"
            subtitle={`${stats.shuttles.total} total`}
            percentage={(stats.shuttles.active / stats.shuttles.total) * 100}
          />
          <StatCard
            title="Occupancy Rate"
            value={stats.shuttles.occupancyRate}
            icon="📍"
            color="text-teal-600 dark:text-teal-400"
            subtitle={`${stats.shuttles.totalBooked}/${stats.shuttles.totalCapacity} seats`}
            percentage={stats.shuttles.occupancyRate}
          />
          <StatCard
            title="Upcoming Schedules"
            value={stats.shuttles.upcomingSchedules}
            icon="📅"
            color="text-emerald-600 dark:text-emerald-400"
            subtitle="This week"
            percentage={Math.min((stats.shuttles.upcomingSchedules / 20) * 100, 100)}
          />
          <StatCard
            title="Pending Bookings"
            value={stats.shuttles.pendingBookings}
            icon="💳"
            color="text-orange-600 dark:text-orange-400"
            subtitle="Awaiting payment"
            percentage={Math.min((stats.shuttles.pendingBookings / 10) * 100, 100)}
          />
        </div>
      </div>

      {/* Dive Sites Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          🏝️ Dive Sites & Content
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Sites"
            value={stats.diveSites.total}
            icon="🗺️"
            color="text-sky-600 dark:text-sky-400"
            subtitle={`${stats.diveSites.published} published`}
            percentage={(stats.diveSites.published / stats.diveSites.total) * 100}
          />
          <StatCard
            title="Featured Sites"
            value={stats.diveSites.featured}
            icon="⭐"
            color="text-yellow-600 dark:text-yellow-400"
            subtitle={`${Math.round((stats.diveSites.featured / stats.diveSites.total) * 100)}%`}
            percentage={(stats.diveSites.featured / 10) * 100}
          />
          <StatCard
            title="Site Images"
            value={stats.diveSites.totalImages}
            icon="📸"
            color="text-pink-600 dark:text-pink-400"
            subtitle={`${stats.diveSites.pendingImages} pending review`}
            percentage={
              ((stats.diveSites.totalImages - stats.diveSites.pendingImages) /
                stats.diveSites.totalImages) *
              100
            }
          />
          <StatCard
            title="Pending Moderation"
            value={stats.diveSites.pendingModeration}
            icon="⏳"
            color="text-red-600 dark:text-red-400"
            subtitle="Requires review"
            percentage={Math.min((stats.diveSites.pendingModeration / 15) * 100, 100)}
          />
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          📊 Recent Activities
        </h3>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {activity.action}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {activity.resource}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        {getTimeAgo(new Date(activity.timestamp))}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        by {activity.user}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    ✓ {activity.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
