'use client';

import { useEffect, useState } from 'react';

interface Stats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  todayUploads: number;
  averageQualityScore: number;
}

interface RecentActivity {
  id: string;
  action: string;
  created_at: string;
  admin_id: string;
  profiles?: { username: string };
  photo_id: string;
  photos?: { title: string };
}

export function PhotoModerationStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/photos/stats');
        const data = await response.json();
        setStats(data.stats);
        setActivity(data.recentActivity || []);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Pending
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.pendingCount}
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Need review
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Approved
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {stats.approvedCount}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            This session
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Rejected
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
            {stats.rejectedCount}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            This session
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Today's Uploads
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {stats.todayUploads}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            New photos
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Avg Quality
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {stats.averageQualityScore}%
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Approved photos
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      {activity.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent Moderation Activity
          </h3>
          <div className="space-y-3">
            {activity.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    <span className="capitalize font-semibold">
                      {item.action}
                    </span>{' '}
                    — {item.photos?.title || 'Photo'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    By {item.profiles?.username || 'Admin'} •{' '}
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${
                    item.action === 'approved'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : item.action === 'rejected'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  {item.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
