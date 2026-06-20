'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function SystemSettingsPage() {
  const t = useTranslations('admin');
  const [settings, setSettings] = useState({
    commission_rate: 15,
    payment_threshold: 100,
    maintenance_mode: false,
    email_notifications: true,
    photo_approval_required: true,
    max_equipment_rental_days: 7,
    shuttle_capacity: 12,
    system_timezone: 'UTC',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          System Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Configure system-wide settings and preferences
        </p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-900 dark:text-green-300">
            ✅ Settings saved successfully!
          </p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Commission Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Commission Rate (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.commission_rate}
                  onChange={(e) =>
                    setSettings({ ...settings, commission_rate: Number(e.target.value) })
                  }
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
                <span className="text-slate-600 dark:text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Applied to all instructor bookings
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Payment Threshold ($)
              </label>
              <input
                type="number"
                min="0"
                value={settings.payment_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, payment_threshold: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Minimum commission amount to trigger payment
              </p>
            </div>
          </div>
        </div>

        {/* Photo & Content Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📷</span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Content Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.photo_approval_required}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      photo_approval_required: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Require Photo Approval
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All uploaded photos require admin approval
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) =>
                    setSettings({ ...settings, email_notifications: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Email Notifications
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receive email alerts for pending approvals
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Equipment Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎒</span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Equipment Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Max Rental Days
              </label>
              <input
                type="number"
                min="1"
                value={settings.max_equipment_rental_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_equipment_rental_days: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Maximum days a user can rent equipment
              </p>
            </div>
          </div>
        </div>

        {/* Shuttle Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🚐</span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Shuttle Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Default Capacity
              </label>
              <input
                type="number"
                min="1"
                value={settings.shuttle_capacity}
                onChange={(e) =>
                  setSettings({ ...settings, shuttle_capacity: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Default passenger capacity for new shuttles
              </p>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚙️</span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              System Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Timezone
              </label>
              <select
                value={settings.system_timezone}
                onChange={(e) =>
                  setSettings({ ...settings, system_timezone: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option>UTC</option>
                <option>EST</option>
                <option>CST</option>
                <option>MST</option>
                <option>PST</option>
                <option>IST</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenance_mode: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Maintenance Mode
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Disable user access during maintenance
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔑</span>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            API Keys & Credentials
          </h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Public API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value="••••••••••••••••••••••••••••••"
                  readOnly
                  disabled
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm"
                />
                <button
                  disabled
                  className="px-3 py-2 bg-slate-400 text-white rounded-lg transition-colors opacity-50"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Set via environment variables (see docs)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Secret API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value="••••••••••••••••••••••••••••••"
                  readOnly
                  disabled
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm"
                />
                <button
                  disabled
                  className="px-3 py-2 bg-slate-400 text-white rounded-lg transition-colors opacity-50"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Set via environment variables (see docs)
              </p>
            </div>
          </div>

          <button className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium">
            🔄 Regenerate Keys
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 justify-end">
        <button className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          💾 Save Settings
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <span className="font-semibold">Note:</span> Changes to system settings take effect immediately. Some settings may require a system restart to fully propagate.
        </p>
      </div>
    </div>
  );
}
