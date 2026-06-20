'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { EquipmentAnalytics } from '@/lib/types/equipment';
import AnalyticsCharts from './components/AnalyticsCharts';
import AnalyticsTables from './components/AnalyticsTables';

export default function EquipmentAnalyticsPage() {
  const t = useTranslations('admin');
  const [analytics, setAnalytics] = useState<EquipmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/equipment-analytics');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError('An error occurred while loading analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Equipment Analytics
          </h1>
        </div>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Equipment Analytics
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Insights into equipment performance and user behavior
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Equipment</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {analytics.totalEquipment}
          </p>
          <p className="text-sm text-green-600 mt-2">
            {analytics.activeEquipment} active
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Revenue This Month
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            ${analytics.totalRevenueThisMonth.toFixed(2)}
          </p>
          <p className="text-sm text-blue-600 mt-2">
            {analytics.topEquipmentByRevenue.length} items generating revenue
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Commissions Owed
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            ${analytics.totalCommissionsOwed.toFixed(2)}
          </p>
          <p className="text-sm text-orange-600 mt-2">
            {analytics.missingEquipment} missing items
          </p>
        </div>
      </div>

      {/* Damage and Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">
            Damage Rate
          </p>
          <p className="text-3xl font-bold text-red-600">
            {(analytics.damageRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">
            Avg Rental Duration
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {analytics.averageRentalDuration.toFixed(1)} days
          </p>
        </div>
      </div>

      {/* User Behavior Metrics */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          User Behavior Patterns
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Avg Return Delay
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {analytics.userBehaviorMetrics.averageReturnDelay.toFixed(1)} days
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Late Return Rate
            </p>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {(analytics.userBehaviorMetrics.lateReturnRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Damage Report Rate
            </p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {(analytics.userBehaviorMetrics.damageReportRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Dispute Rate
            </p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {(analytics.userBehaviorMetrics.disputeRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Blacklisted Users
            </p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {analytics.userBehaviorMetrics.blacklistedUserCount}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <AnalyticsCharts analytics={analytics} />

      {/* Tables */}
      <AnalyticsTables analytics={analytics} />
    </div>
  );
}
