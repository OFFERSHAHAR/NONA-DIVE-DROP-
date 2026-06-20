'use client';

import { useState } from 'react';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { useTranslations } from 'next-intl';

/**
 * Example component showing how to use email verification
 * Use this as reference for integrating into signup/registration flows
 */

export function EmailVerificationExample() {
  const t = useTranslations();
  const {
    loading,
    success,
    error,
    message,
    expiresAt,
    sendVerificationEmail,
    reset,
  } = useEmailVerification();

  const [formData, setFormData] = useState({
    userId: 'test-user-123',
    email: 'user@example.com',
    userName: 'John Doe',
    locale: 'en' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendVerificationEmail(formData);
  };

  const handleLocaleChange = (locale: 'en' | 'he') => {
    setFormData((prev) => ({ ...prev, locale }));
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Email Verification Example
        </h2>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-200">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 rounded-lg text-green-700 dark:text-green-200">
            <p className="font-semibold">Success!</p>
            <p className="text-sm">{message}</p>
            {expiresAt && (
              <p className="text-xs mt-2">
                Expires at: {expiresAt.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Language selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleLocaleChange('en')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.locale === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleLocaleChange('he')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.locale === 'he'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                עברית
              </button>
            </div>
          </div>

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, userId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user-uuid"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>

          {/* User Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User Name
            </label>
            <input
              type="text"
              value={formData.userName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, userName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : 'Send Verification Email'}
          </button>

          {/* Reset button */}
          {(success || error) && (
            <button
              type="button"
              onClick={reset}
              className="w-full py-2 px-4 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm text-gray-700 dark:text-blue-200">
          <p className="font-semibold mb-2">How it works:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Fill in the form above</li>
            <li>Click "Send Verification Email"</li>
            <li>Email will be sent with bilingual support</li>
            <li>Token expires in 24 hours</li>
            <li>User receives welcome email after verification</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
