/**
 * Feedback Analytics Example Page
 * Demonstrates how to use FeedbackTrends and FeedbackInsights components
 *
 * This is a reference implementation. You can adapt this for your needs.
 */

'use client';

import React, { useState } from 'react';
import FeedbackTrends from '@/components/FeedbackTrends';
import FeedbackInsights from '@/components/FeedbackInsights';

// ============================================================================
// EXAMPLE 1: Simple Analytics Dashboard
// ============================================================================

export function BasicAnalyticsDashboard() {
  const siteId = 'your-site-uuid-here'; // Replace with actual site UUID

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Dive Site Analytics
        </h1>

        {/* Insights Dashboard */}
        <div className="mb-8">
          <FeedbackInsights
            siteId={siteId}
            siteName="Coral Reef Site"
            days={30}
          />
        </div>

        {/* Trends Visualization */}
        <div className="mt-8">
          <FeedbackTrends
            siteId={siteId}
            siteName="Coral Reef Site"
            defaultPeriod="30"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Multi-Site Comparison
// ============================================================================

export function MultiSiteComparison() {
  const sites = [
    { id: 'site-uuid-1', name: 'Coral Reef' },
    { id: 'site-uuid-2', name: 'Kelp Forest' },
    { id: 'site-uuid-3', name: 'Wreck Dive' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Compare Dive Sites
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {sites.map((site) => (
            <div key={site.id} className="space-y-6">
              {/* Insights Card for each site */}
              <FeedbackInsights
                siteId={site.id}
                siteName={site.name}
                days={30}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Time Period Selector with Trends
// ============================================================================

export function TimeSelectionDashboard() {
  const siteId = 'your-site-uuid-here';
  const [days, setDays] = useState(30);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Dive Condition Trends
          </h1>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 14, 30, 90].map((period) => (
              <button
                key={period}
                onClick={() => setDays(period)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  days === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                {period} days
              </button>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="mb-8">
          <FeedbackInsights
            siteId={siteId}
            siteName="Popular Dive Site"
            days={days}
          />
        </div>

        {/* Trends Chart */}
        <div className="mt-8">
          <FeedbackTrends
            siteId={siteId}
            siteName="Popular Dive Site"
            defaultPeriod={days === 7 ? '7' : days === 14 ? '14' : days === 30 ? '30' : '90'}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Admin Dashboard with Multiple Metrics
// ============================================================================

export function AdminAnalyticsDashboard() {
  const siteId = 'your-site-uuid-here';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Site Administration
          </h1>
          <p className="text-xl text-gray-600">
            Comprehensive analytics for your dive site
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column: Insights */}
          <div>
            <FeedbackInsights
              siteId={siteId}
              siteName="Your Dive Site"
              days={30}
            />
          </div>

          {/* Right Column: Quick Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Site Statistics
            </h2>

            <div className="space-y-4">
              <StatCard
                label="Last 30 Days Feedback"
                value="42"
                subtitle="feedback submissions"
              />
              <StatCard
                label="Average Visibility"
                value="24.5m"
                subtitle="excellent conditions"
              />
              <StatCard
                label="Most Common Species"
                value="Dolphins"
                subtitle="12 sightings this month"
              />
              <StatCard
                label="Data Quality"
                value="87%"
                subtitle="coverage of period"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Download Report
              </button>
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors">
                View All Data
              </button>
            </div>
          </div>
        </div>

        {/* Full-Width Trends */}
        <div className="mt-8">
          <FeedbackTrends
            siteId={siteId}
            siteName="Your Dive Site"
            defaultPeriod="30"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
}

function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded border border-gray-200">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Programmatic Data Access
// ============================================================================

export async function FetchTrendsProgrammatically() {
  const siteId = 'your-site-uuid-here';

  try {
    // Fetch trends data
    const response = await fetch(
      `/api/feedback/trends?siteId=${siteId}&period=30&type=daily`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('Trends Data:', data);
    console.log('Total Feedback:', data.totalFeedbackCount);
    console.log('Data Coverage:', data.dataQuality.percentageFilled + '%');

    // Iterate through trends
    data.trends.forEach((trend: any) => {
      console.log(`${trend.date}: Visibility ${trend.visibility_avg}m, Temp ${trend.temperature_avg}°C`);
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    return null;
  }
}

export async function FetchInsightsProgrammatically() {
  const siteId = 'your-site-uuid-here';

  try {
    // Fetch insights
    const response = await fetch('/api/feedback/trends', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        siteId,
        days: 30,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('Insights:', data.insights);
    console.log('Best Day:', data.insights.bestConditionsDay);
    console.log('Visibility Trend:', data.insights.visibilityTrend);
    console.log('Common Species:', data.insights.commonSpecies);

    return data.insights;
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    return null;
  }
}

// ============================================================================
// USAGE NOTES
// ============================================================================

/**
 * To use these examples in your application:
 *
 * 1. Import the component you want to use:
 *    import { BasicAnalyticsDashboard } from '@/examples/feedback-analytics-example';
 *
 * 2. Replace 'your-site-uuid-here' with actual site UUID from your database
 *
 * 3. For server-side data fetching, use the Fetch*Programmatically functions:
 *    const trends = await FetchTrendsProgrammatically();
 *
 * 4. Customize styling as needed to match your design system
 *
 * 5. Add error handling and loading states for production use
 *
 * 6. Consider adding authentication checks if needed
 *
 * Examples of how to integrate:
 *
 * // In a Next.js page
 * export default function AnalyticsPage() {
 *   return <BasicAnalyticsDashboard />;
 * }
 *
 * // In a server component
 * async function DashboardPage() {
 *   const trends = await FetchTrendsProgrammatically();
 *   return <div>{/* render trends */}</div>;
 * }
 */
