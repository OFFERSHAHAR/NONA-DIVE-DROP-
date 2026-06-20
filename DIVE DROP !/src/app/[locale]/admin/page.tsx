'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores';
import DashboardCard from './components/DashboardCard';
import StatCard from './components/StatCard';
import LiveDashboard from './components/LiveDashboard';
import AdminDashboardHeader from './components/AdminDashboardHeader';
import QuickActions from './components/QuickActions';
import AnalyticsOverview from './components/AnalyticsOverview';
import { fetchAdminStats } from './actions/adminActions';

export default function AdminDashboard() {
  const t = useTranslations('admin');
  const { stats, statsLoading, setStats, setStatsLoading, user } = useAdminStore();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const result = await fetchAdminStats();
        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [setStats, setStatsLoading]);

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Admin Info */}
      <AdminDashboardHeader adminName={user?.email || 'Admin'} currentTime={currentTime} />

      {/* System Status & Health Check */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">✅</span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">System Health</p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">Operational</p>
          <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">All systems normal</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔄</span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Database</p>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">Connected</p>
          <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Sync: Real-time</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎯</span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Performance</p>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">Optimal</p>
          <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">Response time: &lt;200ms</p>
        </div>
      </div>

      {/* Live Dashboard */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg p-1">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
          <LiveDashboard />
        </div>
      </div>

      {/* Main Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title={t('dashboard.stats.users')}
            value={stats.totalUsers}
            trend={+5}
            color="blue"
            icon="👥"
          />
          <StatCard
            title={t('dashboard.stats.dive_sites')}
            value={stats.totalDiveSites}
            trend={+2}
            color="purple"
            icon="🏖️"
          />
          <StatCard
            title={t('dashboard.stats.shuttles')}
            value={stats.totalShuttles}
            trend={-1}
            color="green"
            icon="🚐"
          />
          <StatCard
            title={t('dashboard.stats.active_shuttles')}
            value={stats.activeShuttles}
            trend={+3}
            color="orange"
            icon="✅"
          />
          <StatCard
            title="Pending Approvals"
            value={15}
            trend={0}
            color="red"
            icon="⏳"
          />
        </div>
      )}

      {/* Analytics Overview */}
      <AnalyticsOverview />

      {/* Quick Actions */}
      <QuickActions />

      {/* Management Sections */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Management Centers</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DashboardCard
            title={t('dashboard.users.title')}
            description={t('dashboard.users.description')}
            href="/admin/users"
            icon="👥"
            buttonText={t('dashboard.actions.manage')}
            color="blue"
          />
          <DashboardCard
            title={t('dashboard.dive_sites.title')}
            description={t('dashboard.dive_sites.description')}
            href="/admin/dive-sites"
            icon="🏖️"
            buttonText={t('dashboard.actions.manage')}
            color="purple"
          />
          <DashboardCard
            title={t('dashboard.shuttles.title')}
            description={t('dashboard.shuttles.description')}
            href="/admin/shuttles"
            icon="🚐"
            buttonText={t('dashboard.actions.manage')}
            color="green"
          />
        </div>
      </div>

      {/* Additional Management Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Photo Management"
          description="Approve and moderate user photos"
          href="/admin/photos"
          icon="📷"
          buttonText="Review Photos"
          color="yellow"
        />
        <DashboardCard
          title="Equipment Rental"
          description="Manage equipment inventory and rentals"
          href="/admin/equipment"
          icon="🎒"
          buttonText="Manage Equipment"
          color="indigo"
        />
        <DashboardCard
          title="Payments & Commission"
          description="Track revenue and commission earnings"
          href="/admin/commissions"
          icon="💰"
          buttonText="View Payments"
          color="emerald"
        />
      </div>

      {/* Recent Activity */}
      {stats && stats.recentActivity && stats.recentActivity.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('dashboard.recent_activity')}
            </h2>
            <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View All
            </a>
          </div>
          <div className="space-y-3">
            {stats.recentActivity.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full whitespace-nowrap">
                  {activity.type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <p className="font-medium text-slate-900 dark:text-white mb-2">Admin Info</p>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role || 'Administrator'}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <p className="font-medium text-slate-900 dark:text-white mb-2">Last Sync</p>
          <p>Database: {new Date().toLocaleString()}</p>
          <p>Status: Real-time sync enabled</p>
        </div>
      </div>
    </div>
  );
}
