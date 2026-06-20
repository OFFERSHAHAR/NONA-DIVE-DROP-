'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdminStore } from '@/stores';
import { Loader } from '../layout';

export default function AdminLogin() {
  const t = useTranslations('admin');
  const router = useRouter();
  const { setUser, setAuthenticated, setError: setStoreError } = useAdminStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Invalid credentials');
        setStoreError(result.error || null);
        return;
      }

      if (result.data) {
        setUser(result.data.user);
        setAuthenticated(true);
        setStoreError(null);
        router.push('/admin/dashboard');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setStoreError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Panel
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Secure Access Required
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                required
                autoComplete="username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader />}
              {isLoading ? 'Entering Admin Panel...' : 'Enter Admin Panel'}
            </button>
          </form>

          {/* Test Credentials */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
            <p className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
              Test Credentials (Development Only)
            </p>
            <p className="text-yellow-800 dark:text-yellow-300 mb-1 text-xs">
              <strong>Admin 1:</strong> offer / SecurePassword123!@#
            </p>
            <p className="text-yellow-800 dark:text-yellow-300 text-xs">
              <strong>Admin 2:</strong> or / SecurePassword456!@#
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600 dark:text-slate-400">
          <p>DIVE DROP Admin Portal - Secure Access Only</p>
        </div>
      </div>
    </div>
  );
}
