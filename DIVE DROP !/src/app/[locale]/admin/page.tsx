'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/adminStore';
import DashboardCard from './components/DashboardCard';
import StatCard from './components/StatCard';
import { fetchAdminStats } from './actions/adminActions';

export default function AdminDashboard() {
  const t = useTranslations('admin');
  const { stats, statsLoading, setStats, setStatsLoading } = useAdminStore();

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {t('dashboard.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            icon="🏄"
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
        </div>
      )}

      {/* Management Sections */}
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
          icon="🏄"
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

      {/* Recent Activity */}
      {stats && stats.recentActivity && stats.recentActivity.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            {t('dashboard.recent_activity')}
          </h2>
          <div className="space-y-3">
            {stats.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                  {activity.type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
