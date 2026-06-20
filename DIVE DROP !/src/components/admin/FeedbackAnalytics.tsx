'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalFeedback: number;
  feedbackByDate: Array<{
    date: string;
    count: number;
  }>;
  feedbackBySite: Array<{
    siteId: string;
    siteName: string;
    count: number;
    avgVisibility: number;
    avgTemp: number;
    avgCurrent: number;
  }>;
  averageConditions: {
    visibility: number;
    temperature: number;
    current: number;
  };
  topSpecies: Array<{
    species: string;
    count: number;
  }>;
  feedbackTrend: Array<{
    date: string;
    cumulative: number;
  }>;
}

interface FeedbackAnalyticsProps {
  compact?: boolean;
}

export function FeedbackAnalytics({ compact = false }: FeedbackAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/feedback/analytics');

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className={`space-y-6 ${compact ? 'space-y-4' : ''}`}>
      {/* Main Stats Grid */}
      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-4`}>
        {/* Total Feedback */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Feedback</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {analytics.totalFeedback.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        {!compact && (
          <>
            {/* Average Visibility */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Avg Visibility</p>
                  <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
                    {analytics.averageConditions.visibility.toFixed(1)}m
                  </p>
                </div>
              </div>
            </div>

            {/* Average Temperature */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Avg Temperature</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                    {analytics.averageConditions.temperature.toFixed(1)}°C
                  </p>
                </div>
              </div>
            </div>

            {/* Average Current */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Avg Current</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                    {analytics.averageConditions.current.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!compact && (
        <>
          {/* Feedback by Site */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Feedback by Dive Site
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left text-slate-600 dark:text-slate-400 font-medium pb-3">
                      Site
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-400 font-medium pb-3">
                      Count
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-400 font-medium pb-3">
                      Visibility
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-400 font-medium pb-3">
                      Temp
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-400 font-medium pb-3">
                      Current
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.feedbackBySite.slice(0, 10).map((site, idx) => (
                    <tr
                      key={site.siteId}
                      className={`border-b border-slate-200 dark:border-slate-700 ${
                        idx % 2 === 0
                          ? 'bg-white dark:bg-slate-800'
                          : 'bg-slate-50 dark:bg-slate-700/50'
                      }`}
                    >
                      <td className="py-3 px-2 text-slate-900 dark:text-white font-medium">
                        {site.siteName}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                          {site.count}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
                        {site.avgVisibility.toFixed(1)}m
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
                        {site.avgTemp.toFixed(1)}°C
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
                        {site.avgCurrent.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Marine Species */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Species Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Most Observed Species
              </h3>
              <div className="space-y-3">
                {analytics.topSpecies.slice(0, 8).map((species, idx) => {
                  const maxCount = Math.max(...analytics.topSpecies.map(s => s.count));
                  const percentage = (species.count / maxCount) * 100;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {species.species}
                        </span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {species.count}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-400 to-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Trend */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Submission Trend (Last 7 Days)
              </h3>
              <div className="space-y-2">
                {analytics.feedbackTrend.slice(-7).map((day, idx) => {
                  const maxCumulative = Math.max(
                    ...analytics.feedbackTrend.map(d => d.cumulative)
                  );
                  const percentage = (day.cumulative / maxCumulative) * 100;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {new Date(day.date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="text-xs font-medium text-slate-900 dark:text-white">
                          {day.cumulative}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-cyan-600 h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Daily Submissions Detail */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Daily Submissions
            </h3>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-full pb-4">
                {analytics.feedbackByDate.slice(-30).map((day, idx) => {
                  const maxCount = Math.max(...analytics.feedbackByDate.map(d => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center"
                      title={`${day.date}: ${day.count} submissions`}
                    >
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                        style={{
                          height: `${Math.max(height, 8)}px`,
                          minWidth: '2px',
                        }}
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              Showing last 30 days of submissions
            </p>
          </div>
        </>
      )}

      {compact && (
        <>
          {/* Compact: Top Species */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Top Species
            </h3>
            <div className="space-y-2">
              {analytics.topSpecies.slice(0, 5).map((species, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {species.species}
                  </span>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">
                    {species.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compact: Top Sites */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Top Sites
            </h3>
            <div className="space-y-2">
              {analytics.feedbackBySite.slice(0, 5).map((site, idx) => (
                <div key={site.siteId} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {site.siteName}
                  </span>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">
                    {site.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
