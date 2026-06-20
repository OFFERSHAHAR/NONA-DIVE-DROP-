'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Star,
  Eye,
  ThumbsUp,
  MessageSquare,
  RefreshCw,
  Download,
} from 'lucide-react';
import clsx from 'clsx';
import { PhotoStats } from '../photos/PhotoStats';

interface PhotoAnalytics {
  totalPhotos: number;
  approvedPhotos: number;
  avgRating: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  topRatedPhotos: Array<{
    id: string;
    caption: string;
    avgRating: number;
    ratingCount: number;
  }>;
  mostViewedPhotos: Array<{
    id: string;
    caption: string;
    viewCount: number;
  }>;
  topScoringPhotos: Array<{
    id: string;
    caption: string;
    overallScore: number;
  }>;
}

interface DashboardMetric {
  label: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}

export const PhotoAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<PhotoAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/admin/photos/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculateScores = async () => {
    try {
      setIsCalculating(true);
      setError('');

      const response = await fetch('/api/cron/calculate-scores', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate scores');
      }

      // Refresh analytics
      await fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate scores');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportData = () => {
    if (!analytics) return;

    const csv = [
      ['Metric', 'Value'],
      ['Total Photos', analytics.totalPhotos],
      ['Approved Photos', analytics.approvedPhotos],
      ['Average Rating', analytics.avgRating.toFixed(2)],
      ['Total Views', analytics.totalViews],
      ['Total Likes', analytics.totalLikes],
      ['Total Comments', analytics.totalComments],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo-analytics-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analytics) {
    return <div className="p-6 text-gray-600">No data available</div>;
  }

  const metrics: DashboardMetric[] = [
    {
      label: 'Total Photos',
      value: analytics.totalPhotos,
      change: 0,
      icon: <Eye className="w-5 h-5 text-blue-600" />,
    },
    {
      label: 'Approved Photos',
      value: analytics.approvedPhotos,
      change: 0,
      icon: <Star className="w-5 h-5 text-yellow-600" />,
    },
    {
      label: 'Average Rating',
      value: analytics.avgRating.toFixed(2),
      change: 0,
      icon: <Star className="w-5 h-5 text-yellow-500" />,
    },
    {
      label: 'Total Views',
      value: analytics.totalViews,
      change: 0,
      icon: <Eye className="w-5 h-5 text-blue-500" />,
    },
    {
      label: 'Total Likes',
      value: analytics.totalLikes,
      change: 0,
      icon: <ThumbsUp className="w-5 h-5 text-red-500" />,
    },
    {
      label: 'Total Comments',
      value: analytics.totalComments,
      change: 0,
      icon: <MessageSquare className="w-5 h-5 text-green-500" />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Photo Analytics</h1>
          <p className="text-gray-600 mt-1">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleString()}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRecalculateScores}
            disabled={isCalculating}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
              isCalculating
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
          >
            <RefreshCw className={clsx('w-4 h-4', isCalculating && 'animate-spin')} />
            {isCalculating ? 'Calculating...' : 'Recalculate Scores'}
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-600 text-white hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{metric.label}</h3>
              {metric.icon}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {metric.value}
              </span>
              {metric.change !== 0 && (
                <span
                  className={clsx(
                    'text-sm font-medium',
                    metric.change > 0 ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Top Photos Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rated */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Top Rated Photos
          </h2>

          <div className="space-y-3">
            {analytics.topRatedPhotos.slice(0, 5).map((photo, index) => (
              <div
                key={photo.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    #{index + 1} {photo.caption || 'Untitled'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {photo.ratingCount} ratings
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-yellow-500">
                    {photo.avgRating.toFixed(1)}/5
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Viewed */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Most Viewed Photos
          </h2>

          <div className="space-y-3">
            {analytics.mostViewedPhotos.slice(0, 5).map((photo, index) => (
              <div
                key={photo.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    #{index + 1} {photo.caption || 'Untitled'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-500">
                    {photo.viewCount} views
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Scoring Photos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Top Scoring Photos (For Homepage Rotation)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.topScoringPhotos.slice(0, 9).map((photo, index) => (
            <div
              key={photo.id}
              className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="text-2xl font-bold text-blue-600">
                  #{index + 1}
                </div>
              </div>
              <p className="text-sm text-gray-700 font-medium mb-3">
                {photo.caption || 'Untitled'}
              </p>
              <div className="bg-white rounded px-3 py-1 inline-block">
                <span className="text-lg font-bold text-blue-600">
                  {(photo.overallScore * 100).toFixed(0)}
                </span>
                <span className="text-xs text-gray-500 ml-1">/ 100</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
