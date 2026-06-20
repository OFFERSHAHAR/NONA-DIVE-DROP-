'use client';

/**
 * Feedback Insights Component
 * Displays key insights and statistics about dive site conditions
 */

import React, { useState, useEffect } from 'react';
import { MARINE_SPECIES } from '@/types/feedback';

// ============================================================================
// COMPONENT TYPES
// ============================================================================

interface InsightsData {
  bestConditionsDay: { date: string; visibility: number; temperature: number } | null;
  commonSpecies: Array<{ species: string; count: number }>;
  visibilityTrend: 'improving' | 'declining' | 'stable';
  temperatureRange: { min: number; max: number };
  feedbackCount: number;
}

interface FeedbackInsightsProps {
  siteId: string;
  siteName?: string;
  days?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get marine species icon and label by key
 */
function getSpeciesInfo(key: string) {
  const species = MARINE_SPECIES.find((s) => s.key === key);
  return species || { key, label: 'Unknown Species', icon: '🐠' };
}

/**
 * Format date string to readable format
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get trend indicator icon and color
 */
function getTrendIcon(trend: 'improving' | 'declining' | 'stable') {
  switch (trend) {
    case 'improving':
      return { icon: '📈', color: 'text-green-600', bg: 'bg-green-50', label: 'Improving' };
    case 'declining':
      return { icon: '📉', color: 'text-red-600', bg: 'bg-red-50', label: 'Declining' };
    case 'stable':
      return { icon: '➡️', color: 'text-blue-600', bg: 'bg-blue-50', label: 'Stable' };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FeedbackInsights: React.FC<FeedbackInsightsProps> = ({
  siteId,
  siteName = 'Dive Site',
  days = 30,
}) => {
  // State management
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch insights data on mount and when parameters change
  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/feedback/trends', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siteId,
            days,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch insights');
          setInsights(null);
          return;
        }

        const data = await response.json();
        setInsights(data.insights);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setInsights(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [siteId, days]);

  // Loading state
  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading insights...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Unable to load insights</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!insights) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">No insights available yet.</p>
          <p className="text-sm text-gray-500 mt-2">Submit feedback to see insights about dive conditions.</p>
        </div>
      </div>
    );
  }

  const trendInfo = getTrendIcon(insights.visibilityTrend);

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{siteName} - Dive Insights</h2>
        <p className="text-sm text-gray-600 mt-1">
          Based on last {days} days ({insights.feedbackCount} feedback submissions)
        </p>
      </div>

      {/* Grid of Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Best Conditions Card */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-2">Best Conditions Day</p>
              {insights.bestConditionsDay ? (
                <div>
                  <p className="text-lg font-bold text-yellow-700">
                    {formatDate(insights.bestConditionsDay.date)}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-yellow-700">
                    <p>👁️ Visibility: {insights.bestConditionsDay.visibility}m</p>
                    <p>🌡️ Temperature: {insights.bestConditionsDay.temperature}°C</p>
                  </div>
                </div>
              ) : (
                <p className="text-yellow-700">No data available</p>
              )}
            </div>
            <span className="text-3xl">⭐</span>
          </div>
        </div>

        {/* Visibility Trend Card */}
        <div className={`${trendInfo.bg} border border-gray-200 rounded-lg p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Visibility Trend</p>
              <p className={`text-lg font-bold ${trendInfo.color}`}>{trendInfo.label}</p>
              <p className="text-xs text-gray-600 mt-2">Over the last {days} days</p>
            </div>
            <span className="text-3xl">{trendInfo.icon}</span>
          </div>
        </div>

        {/* Temperature Range Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 mb-2">Temperature Range</p>
              <div className="flex gap-4 mt-2">
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Minimum</p>
                  <p className="text-lg font-bold text-blue-700">
                    {insights.temperatureRange.min.toFixed(1)}°C
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold">Maximum</p>
                  <p className="text-lg font-bold text-blue-700">
                    {insights.temperatureRange.max.toFixed(1)}°C
                  </p>
                </div>
              </div>
            </div>
            <span className="text-3xl">🌊</span>
          </div>
        </div>

        {/* Feedback Count Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900 mb-2">Feedback Submissions</p>
              <p className="text-3xl font-bold text-purple-700">{insights.feedbackCount}</p>
              <p className="text-xs text-purple-700 mt-2">in the last {days} days</p>
            </div>
            <span className="text-3xl">📝</span>
          </div>
        </div>

        {/* Common Species Card - Spans 2 columns on desktop */}
        <div className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div>
            <p className="text-sm font-medium text-green-900 mb-3">Most Common Marine Life</p>
            {insights.commonSpecies.length > 0 ? (
              <div className="space-y-2">
                {insights.commonSpecies.map((item, index) => {
                  const speciesInfo = getSpeciesInfo(item.species);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white rounded p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{speciesInfo.icon}</span>
                        <span className="font-medium text-green-900">{speciesInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-green-700">{item.count}</span>
                        <span className="text-xs text-green-600">sightings</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-green-700">No species data available</p>
            )}
          </div>
        </div>

        {/* Feedback Quality Indicator */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-orange-900 mb-2">Data Quality</p>
              <p className="text-xs text-orange-700 mt-2">
                {insights.feedbackCount >= 10
                  ? 'Excellent - High confidence'
                  : insights.feedbackCount >= 5
                    ? 'Good - Moderate confidence'
                    : 'Limited - More data needed'}
              </p>
            </div>
            <span className="text-3xl">
              {insights.feedbackCount >= 10 ? '✅' : insights.feedbackCount >= 5 ? '⚠️' : '❌'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-blue-600">
              {insights.bestConditionsDay?.visibility || '--'}
            </p>
            <p className="text-xs text-gray-600 mt-1">Best Visibility (m)</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-orange-600">
              {((insights.temperatureRange.max + insights.temperatureRange.min) / 2).toFixed(1)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Average Temp (°C)</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-green-600">
              {insights.commonSpecies.length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Species Sighted</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-purple-600">
              {(insights.feedbackCount > 0 ? (insights.feedbackCount / (days / 7)).toFixed(1) : 0)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Feedback/Week</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> These insights are generated from real diver feedback. The more divers submit feedback,
          the more accurate and useful these insights become!
        </p>
      </div>
    </div>
  );
};

export default FeedbackInsights;
