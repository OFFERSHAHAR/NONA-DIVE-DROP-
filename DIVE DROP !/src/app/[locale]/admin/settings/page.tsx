'use client';

import { useTranslations } from 'next-intl';
import { useAdminStore } from '@/stores';
import { useState } from 'react';

export default function AdminSettings() {
  const t = useTranslations('admin');
  const { user } = useAdminStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          {t('settings.profile.title')}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('settings.profile.name')}
              </label>
              <p className="text-slate-900 dark:text-white font-medium">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('settings.profile.email')}
              </label>
              <p className="text-slate-900 dark:text-white font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('settings.profile.role')}
              </label>
              <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 capitalize">
                {user?.role}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('settings.profile.status')}
              </label>
              <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                {user?.isActive ? t('settings.profile.active') : t('settings.profile.inactive')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          {t('settings.api.title')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {t('settings.api.description')}
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <code className="flex-1 text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
              sk_admin_demo_key_1234567890abcdef
            </code>
            <button
              onClick={() => handleCopy('sk_admin_demo_key_1234567890abcdef')}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              {copied ? t('settings.api.copied') : t('settings.api.copy')}
            </button>
          </div>
        </div>
      </div>

      {/* System Info Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          {t('settings.system.title')}
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t('settings.system.version')}
            </label>
            <p className="text-slate-900 dark:text-white font-medium">v1.0.0</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t('settings.system.database')}
            </label>
            <p className="text-slate-900 dark:text-white font-medium">PostgreSQL</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t('settings.system.environment')}
            </label>
            <p className="text-slate-900 dark:text-white font-medium">Production</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t('settings.system.status')}
            </label>
            <p className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-600"></span>
              <span className="text-slate-900 dark:text-white font-medium">Operational</span>
            </p>
          </div>
        </div>
      </div>

      {/* Documentation Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          {t('settings.docs.title')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {t('settings.docs.description')}
        </p>
        <div className="space-y-2">
          <a
            href="/docs/api"
            className="flex items-center gap-2 p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            📚 API Documentation
            <span className="ml-auto">→</span>
          </a>
          <a
            href="/docs/getting-started"
            className="flex items-center gap-2 p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            🚀 Getting Started
            <span className="ml-auto">→</span>
          </a>
          <a
            href="/docs/faq"
            className="flex items-center gap-2 p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            ❓ FAQ
            <span className="ml-auto">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
