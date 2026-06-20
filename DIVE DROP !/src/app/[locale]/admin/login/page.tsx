'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdminStore } from '@/lib/stores/adminStore';
import { loginAdmin } from '../actions/adminActions';
import { Loader } from '../layout';

export default function AdminLogin() {
  const t = useTranslations('admin');
  const router = useRouter();
  const { setUser, setAuthenticated, setError: setStoreError } = useAdminStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginAdmin({ email, password });

      if (!result.success) {
        setError(result.error || t('login.error.invalid_credentials'));
        setStoreError(result.error || null);
        return;
      }

      if (result.data) {
        setUser(result.data.user);
        setAuthenticated(true);
        setStoreError(null);
        router.push('/admin');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('login.error.unknown');
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
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {t('login.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('login.subtitle')}
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
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email_placeholder')}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password_placeholder')}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader />}
              {isLoading ? t('login.signing_in') : t('login.sign_in')}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <p className="font-medium text-slate-900 dark:text-white mb-2">
              {t('login.demo_title')}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Email: admin@example.com
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Password: password123
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600 dark:text-slate-400">
          <p>{t('login.footer')}</p>
        </div>
      </div>
    </div>
  );
}
