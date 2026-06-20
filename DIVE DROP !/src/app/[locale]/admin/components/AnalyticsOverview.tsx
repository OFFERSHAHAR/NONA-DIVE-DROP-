'use client';

import { useEffect, useState } from 'react';

interface ChartPoint {
  label: string;
  value: number;
}

export default function AnalyticsOverview() {
  const [userGrowth, setUserGrowth] = useState<ChartPoint[]>([]);
  const [revenueData, setRevenueData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    // Simulate data loading
    setUserGrowth([
      { label: 'Mon', value: 240 },
      { label: 'Tue', value: 385 },
      { label: 'Wed', value: 300 },
      { label: 'Thu', value: 450 },
      { label: 'Fri', value: 620 },
      { label: 'Sat', value: 750 },
      { label: 'Sun', value: 820 },
    ]);

    setRevenueData([
      { label: 'Mon', value: 1200 },
      { label: 'Tue', value: 1900 },
      { label: 'Wed', value: 1500 },
      { label: 'Thu', value: 2200 },
      { label: 'Fri', value: 2800 },
      { label: 'Sat', value: 3200 },
      { label: 'Sun', value: 3800 },
    ]);
  }, []);

  const maxUserValue = Math.max(...userGrowth.map((d) => d.value));
  const maxRevenueValue = Math.max(...revenueData.map((d) => d.value));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* User Growth Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              User Growth
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Weekly user registration trend
            </p>
          </div>
          <span className="text-3xl">📊</span>
        </div>

        {/* Mini Chart */}
        <div className="h-64 flex items-end justify-between gap-2">
          {userGrowth.map((point, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg group-hover:from-blue-600 group-hover:to-cyan-500 transition-all"
                style={{
                  height: `${(point.value / maxUserValue) * 100}%`,
                  minHeight: '20px',
                }}
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {point.label}
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {point.value}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">This Week</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">820</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Growth</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">+28%</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Avg Day</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">483</p>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Revenue Trend
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Weekly revenue performance
            </p>
          </div>
          <span className="text-3xl">💹</span>
        </div>

        {/* Mini Chart */}
        <div className="h-64 flex items-end justify-between gap-2">
          {revenueData.map((point, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg group-hover:from-green-600 group-hover:to-emerald-500 transition-all"
                style={{
                  height: `${(point.value / maxRevenueValue) * 100}%`,
                  minHeight: '20px',
                }}
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {point.label}
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                ${point.value}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">This Week</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">$18,700</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Growth</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">+42%</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Avg Day</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">$2,671</p>
          </div>
        </div>
      </div>
    </div>
  );
}
