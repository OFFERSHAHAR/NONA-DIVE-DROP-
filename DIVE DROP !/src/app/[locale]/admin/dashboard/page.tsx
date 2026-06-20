'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/stores';
import { Loader } from '../layout';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAdminStore();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || !user) {
      router.push('/admin/login');
      return;
    }

    // Fetch dashboard stats
    fetchStats();
  }, [mounted, isAuthenticated, user, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      const { logout } = useAdminStore.getState();
      logout();
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Super Admin Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Welcome back, <span className="font-semibold">{user.username}</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Authentication Status Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Authentication Status
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Status</span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Role</span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
              {user.role}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Username</span>
            <span className="font-mono text-slate-900 dark:text-white">{user.username}</span>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          System Overview
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                    {stats.totalUsers || 0}
                  </p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            {/* Total Dive Sites */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Dive Sites</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                    {stats.totalDiveSites || 0}
                  </p>
                </div>
                <div className="text-4xl">🏝️</div>
              </div>
            </div>

            {/* Total Shuttles */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Shuttles</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                    {stats.totalShuttles || 0}
                  </p>
                </div>
                <div className="text-4xl">🚌</div>
              </div>
            </div>

            {/* Active Shuttles */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Active Shuttles</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {stats.activeShuttles || 0}
                  </p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Management Sections */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Management Tools
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User Management */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                User Management
              </h3>
              <div className="text-3xl">👥</div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Manage user accounts, roles, and permissions
            </p>
            <button
              onClick={() => router.push('/admin/users')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Manage Users
            </button>
          </div>

          {/* Dive Sites Management */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Dive Sites
              </h3>
              <div className="text-3xl">🏝️</div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Create and manage dive site locations and details
            </p>
            <button
              onClick={() => router.push('/admin/dive-sites')}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Manage Dive Sites
            </button>
          </div>

          {/* Shuttles Management */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Shuttles
              </h3>
              <div className="text-3xl">🚌</div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Manage shuttle vehicles and schedules
            </p>
            <button
              onClick={() => router.push('/admin/shuttles')}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Manage Shuttles
            </button>
          </div>

          {/* System Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                System Settings
              </h3>
              <div className="text-3xl">⚙️</div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Configure system configuration and security settings
            </p>
            <button
              onClick={() => router.push('/admin/settings')}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              System Settings
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
          Security Notice
        </h3>
        <ul className="text-red-800 dark:text-red-300 text-sm space-y-1">
          <li>✓ All admin actions are logged and audited</li>
          <li>✓ Session expires after 8 hours of inactivity</li>
          <li>✓ All API communications use HTTPS in production</li>
          <li>✓ Admin credentials are never stored in browser localStorage</li>
          <li>✓ Always use strong, unique passwords for admin accounts</li>
        </ul>
      </div>
    </div>
  );
}
