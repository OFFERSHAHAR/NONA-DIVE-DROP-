'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import ConfirmDialog from './confirm-dialog';
import Toast from './toast';

interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  language: 'en' | 'he';
  darkMode: boolean;
  notificationsEnabled: boolean;
  depthUnit: 'meters' | 'feet';
  timeZone: string;
  certificationLevel: string;
  shareProfile: boolean;
  shareDiveStats: boolean;
}

interface SettingsClientProps {
  initialData: UserData;
  locale: string;
}

export default function SettingsClient({ initialData, locale }: SettingsClientProps) {
  const t = useTranslations('settings');
  const common = useTranslations('common');
  const router = useRouter();

  // State
  const [data, setData] = useState<UserData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handlers
  const handleLanguageChange = async (newLang: 'en' | 'he') => {
    try {
      setIsSaving(true);
      setData((prev) => ({ ...prev, language: newLang }));
      // Save preference to Supabase (stub)
      console.log('Language changed to:', newLang);
      showToast(t('language_changed'), 'success');
      // Redirect to new locale
      router.push(`/${newLang}/settings`);
    } catch (error) {
      console.error('Failed to change language:', error);
      showToast(t('save_failed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (key: keyof UserData, value: boolean) => {
    try {
      setIsSaving(true);
      setData((prev) => ({ ...prev, [key]: value }));
      // Save to Supabase (stub)
      console.log(`${key} updated to:`, value);
      showToast(common('success'), 'success');
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
      showToast(common('error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectChange = async (key: keyof UserData, value: any) => {
    try {
      setIsSaving(true);
      setData((prev) => ({ ...prev, [key]: value }));
      // Save to Supabase (stub)
      console.log(`${key} updated to:`, value);
      showToast(common('success'), 'success');
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
      showToast(common('error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      // Call API to delete account
      console.log('Deleting account...');
      showToast(t('account_deleted'), 'success');
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push(`/${locale}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to delete account:', error);
      showToast(t('delete_failed'), 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      {/* App Preferences Section */}
      <Card variant="default" className="mb-6">
        <CardHeader>
          <h2 className="h4 text-text-primary">{t('app_preferences_title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('app_preferences_subtitle')}</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Language Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-border-secondary last:border-b-0">
            <div>
              <p className="font-medium text-text-primary">{t('language_label')}</p>
              <p className="text-sm text-text-secondary">{t('language_description')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange('en')}
                disabled={isSaving}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  data.language === 'en'
                    ? 'bg-primary text-white'
                    : 'bg-bg-secondary text-text-primary border border-border-primary hover:bg-bg-tertiary'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('he')}
                disabled={isSaving}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  data.language === 'he'
                    ? 'bg-primary text-white'
                    : 'bg-bg-secondary text-text-primary border border-border-primary hover:bg-bg-tertiary'
                }`}
              >
                HE
              </button>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-border-secondary last:border-b-0">
            <div>
              <p className="font-medium text-text-primary">{t('dark_mode_label')}</p>
              <p className="text-sm text-text-secondary">{t('dark_mode_description')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.darkMode}
                onChange={(e) => handleToggle('darkMode', e.target.checked)}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-text-primary">{t('notifications_label')}</p>
              <p className="text-sm text-text-secondary">{t('notifications_description')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.notificationsEnabled}
                onChange={(e) => handleToggle('notificationsEnabled', e.target.checked)}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* User Account Section */}
      <Card variant="default" className="mb-6">
        <CardHeader>
          <h2 className="h4 text-text-primary">{t('account_title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('account_subtitle')}</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('email_label')}
            </label>
            <div className="px-4 py-3 rounded-md bg-bg-secondary border border-border-secondary text-text-secondary">
              {data.email}
            </div>
            <p className="text-xs text-text-tertiary mt-2">{t('email_readonly')}</p>
          </div>

          {/* Change Password Link */}
          <div className="pt-4 border-t border-border-secondary">
            <p className="text-sm text-text-secondary mb-4">{t('password_description')}</p>
            <Link href={`/${locale}/auth/update-password`}>
              <Button variant="secondary" size="md">
                {t('change_password_button')}
              </Button>
            </Link>
          </div>
        </CardBody>
        <CardFooter className="bg-bg-secondary">
          <Button
            variant="danger"
            size="md"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full"
          >
            {t('delete_account_button')}
          </Button>
        </CardFooter>
      </Card>

      {/* Diving Preferences Section */}
      <Card variant="default" className="mb-6">
        <CardHeader>
          <h2 className="h4 text-text-primary">{t('diving_preferences_title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('diving_preferences_subtitle')}</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Depth Unit Select */}
          <div>
            <label htmlFor="depth-unit" className="block text-sm font-medium text-text-primary mb-2">
              {t('depth_unit_label')}
            </label>
            <select
              id="depth-unit"
              value={data.depthUnit}
              onChange={(e) => handleSelectChange('depthUnit', e.target.value)}
              disabled={isSaving}
              className="w-full px-4 py-3 rounded-md border border-border-primary bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="meters">{t('depth_unit_meters')}</option>
              <option value="feet">{t('depth_unit_feet')}</option>
            </select>
          </div>

          {/* Time Zone Select */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-text-primary mb-2">
              {t('timezone_label')}
            </label>
            <select
              id="timezone"
              value={data.timeZone}
              onChange={(e) => handleSelectChange('timeZone', e.target.value)}
              disabled={isSaving}
              className="w-full px-4 py-3 rounded-md border border-border-primary bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="UTC">UTC</option>
              <option value="EST">EST (UTC-5)</option>
              <option value="CST">CST (UTC-6)</option>
              <option value="MST">MST (UTC-7)</option>
              <option value="PST">PST (UTC-8)</option>
              <option value="GMT">GMT (UTC+0)</option>
              <option value="CET">CET (UTC+1)</option>
              <option value="EET">EET (UTC+2)</option>
              <option value="IST">IST (UTC+5:30)</option>
              <option value="JST">JST (UTC+9)</option>
              <option value="AEST">AEST (UTC+10)</option>
            </select>
          </div>

          {/* Certification Level Select */}
          <div>
            <label htmlFor="cert-level" className="block text-sm font-medium text-text-primary mb-2">
              {t('certification_label')}
            </label>
            <select
              id="cert-level"
              value={data.certificationLevel}
              onChange={(e) => handleSelectChange('certificationLevel', e.target.value)}
              disabled={isSaving}
              className="w-full px-4 py-3 rounded-md border border-border-primary bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="beginner">{t('cert_beginner')}</option>
              <option value="open_water">{t('cert_open_water')}</option>
              <option value="advanced">{t('cert_advanced')}</option>
              <option value="rescue_diver">{t('cert_rescue')}</option>
              <option value="divemaster">{t('cert_divemaster')}</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Privacy & Safety Section */}
      <Card variant="default" className="mb-8">
        <CardHeader>
          <h2 className="h4 text-text-primary">{t('privacy_title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('privacy_subtitle')}</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Share Profile Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-border-secondary last:border-b-0">
            <div>
              <p className="font-medium text-text-primary">{t('share_profile_label')}</p>
              <p className="text-sm text-text-secondary">{t('share_profile_description')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.shareProfile}
                onChange={(e) => handleToggle('shareProfile', e.target.checked)}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Share Dive Stats Toggle */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-text-primary">{t('share_stats_label')}</p>
              <p className="text-sm text-text-secondary">{t('share_stats_description')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.shareDiveStats}
                onChange={(e) => handleToggle('shareDiveStats', e.target.checked)}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('delete_confirm_title')}
          message={t('delete_confirm_message')}
          confirmText={t('delete_confirm_button')}
          cancelText={common('cancel')}
          isLoading={isDeleting}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
          isDangerous
        />
      )}

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
