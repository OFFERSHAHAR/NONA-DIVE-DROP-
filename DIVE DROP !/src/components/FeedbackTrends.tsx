'use client';

/**
 * Feedback Trends Visualization Component
 * Displays feedback data trends using interactive charts with Recharts
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import type { DailyTrend, WeeklyTrend, SeasonalTrend } from '@/lib/feedback/trendAnalysis';

// ============================================================================
// COMPONENT TYPES
// ============================================================================

type TrendData = DailyTrend | WeeklyTrend | SeasonalTrend;

interface FeedbackTrendsProps {
  siteId: string;
  siteName?: string;
  defaultPeriod?: '7' | '14' | '30' | '90';
}

interface TrendResponse {
  siteId: string;
  period: string;
  trends: TrendData[];
  totalFeedbackCount: number;
  dataQuality: {
    hasData: boolean;
    minimumThreshold: number;
    actualCount: number;
    percentageFilled: number;
  };
  generatedAt: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FeedbackTrends: React.FC<FeedbackTrendsProps> = ({
  siteId,
  siteName = 'Dive Site',
  defaultPeriod = '30',
}) => {
  // State management
  const [period, setPeriod] = useState<'7' | '14' | '30' | '90'>(defaultPeriod);
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [data, setData] = useState<TrendData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [totalFeedback, setTotalFeedback] = useState(0);

  // Fetch trends data when parameters change
  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/feedback/trends?siteId=${siteId}&period=${period}&type=${type}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch trends data');
          setData(null);
          return;
        }

        const trendData: TrendResponse = await response.json();
        setData(trendData.trends);
        setDataQuality(trendData.dataQuality);
        setTotalFeedback(trendData.totalFeedbackCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [siteId, period, type]);

  // Helper to get date/week/month label based on data type
  const getDateLabel = (datum: TrendData): string => {
    if ('date' in datum) return datum.date;
    if ('week' in datum) return datum.week;
    if ('month' in datum) return datum.month;
    return '';
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-sm">
            {getDateLabel(data)}
          </p>
          <p className="text-sm text-blue-600">
            Visibility: {data.visibility_avg.toFixed(1)}m
          </p>
          <p className="text-sm text-orange-600">
            Temp: {data.temperature_avg.toFixed(1)}°C
          </p>
          <p className="text-sm text-purple-600">
            Current: {data.current_avg.toFixed(1)}/10
          </p>
          <p className="text-sm text-gray-600">
            Feedback: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{siteName} - Dive Conditions Trends</h2>
        <p className="text-sm text-gray-600 mt-1">
          Based on {totalFeedback} feedback submissions
        </p>
      </div>

      {/* Controls Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time Period Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Period
          </label>
          <div className="flex gap-2">
            {(['7', '14', '30', '90'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                {p} days
              </button>
            ))}
          </div>
        </div>

        {/* Chart Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Granularity
          </label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors capitalize ${
                  type === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Quality Indicator */}
      {dataQuality && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Data Coverage</p>
              <p className="text-xs text-gray-600 mt-1">
                {dataQuality.actualCount} of {dataQuality.minimumThreshold} periods with data
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {dataQuality.percentageFilled}%
              </p>
              <p className="text-xs text-gray-600">coverage</p>
            </div>
          </div>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, dataQuality.percentageFilled)}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading trends data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Unable to load trends</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Charts Section */}
      {data && data.length > 0 && !loading && (
        <div className="space-y-8">
          {/* Visibility Trend Chart */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Water Visibility Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={(d) => {
                    const label = getDateLabel(d);
                    if (type === 'daily') return label.slice(-2); // Last 2 chars of date
                    return label;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis label={{ value: 'Visibility (meters)', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="visibility_avg"
                  stroke="#3b82f6"
                  name="Average Visibility"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-2">
              Shows average water visibility over the selected period
            </p>
          </div>

          {/* Temperature Trend Chart */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Water Temperature Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={(d) => {
                    const label = getDateLabel(d);
                    if (type === 'daily') return label.slice(-2);
                    return label;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temperature_avg"
                  stroke="#f97316"
                  name="Average Temperature"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-2">
              Shows average water temperature over the selected period
            </p>
          </div>

          {/* Current Strength Trend Chart */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Strength Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={(d) => {
                    const label = getDateLabel(d);
                    if (type === 'daily') return label.slice(-2);
                    return label;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis label={{ value: 'Current Strength (0-10)', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="current_avg"
                  stroke="#a855f7"
                  name="Average Current"
                  strokeWidth={2}
                  dot={{ fill: '#a855f7', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-2">
              Shows average current strength (0=none, 10=very strong)
            </p>
          </div>

          {/* Feedback Count Chart */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback Submissions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={(d) => {
                    const label = getDateLabel(d);
                    if (type === 'daily') return label.slice(-2);
                    return label;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis label={{ value: 'Number of Feedback', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
                          <p className="text-sm">Date: {getDateLabel(data)}</p>
                          <p className="text-sm font-semibold">Feedback: {data.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Feedback Count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-2">
              Shows number of feedback submissions per period
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!data || data.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-600">No feedback data available for this site yet.</p>
          <p className="text-sm text-gray-500 mt-2">Come back after divers have submitted feedback.</p>
        </div>
      )}
    </div>
  );
};

export default FeedbackTrends;
