'use client';

import { useState, useEffect } from 'react';
import { useBookingStore } from '@/stores';
import { useTranslations } from 'next-intl';

interface DateLocationSelectionProps {
  onNext: () => void;
  onBack: () => void;
}

interface DiveSite {
  id: string;
  name: string;
  location: string;
  depth_range: string;
}

export function DateLocationSelection({ onNext, onBack }: DateLocationSelectionProps) {
  const t = useTranslations('bookings');
  const { draft, setDraft } = useBookingStore();
  const [diveSites, setDiveSites] = useState<DiveSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomLocation, setShowCustomLocation] = useState(false);

  useEffect(() => {
    // Fetch dive sites
    // TODO: Implement dive sites API
    setLoading(false);
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft({ dive_date: e.target.value });
  };

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft({ max_depth: parseInt(e.target.value, 10) });
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft({ water_temp: parseFloat(e.target.value) });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft({ estimated_duration: parseInt(e.target.value, 10) });
  };

  const isRtl = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-light mb-4">
          {t('selectDateTime')}
        </h3>

        <div className="space-y-4">
          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-2">
              {t('diveDate')} *
            </label>
            <input
              type="datetime-local"
              value={draft.dive_date || ''}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input text-text-primary dark:text-text-light"
              required
            />
          </div>

          {/* Dive Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-2">
                {t('maxDepth')} (m) *
              </label>
              <input
                type="number"
                min="0"
                max="130"
                value={draft.max_depth || 30}
                onChange={handleDepthChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input text-text-primary dark:text-text-light"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-2">
                {t('waterTemp')} (°C) *
              </label>
              <input
                type="number"
                min="0"
                max="40"
                step="0.1"
                value={draft.water_temp || 20}
                onChange={handleTemperatureChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input text-text-primary dark:text-text-light"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-2">
                {t('duration')} {t('minutes')} *
              </label>
              <input
                type="number"
                min="15"
                max="240"
                step="15"
                value={draft.estimated_duration || 60}
                onChange={handleDurationChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input text-text-primary dark:text-text-light"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location Selection */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-light mb-4">
          {t('selectLocation')}
        </h3>

        {!showCustomLocation ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {diveSites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setDraft({ dive_site_id: site.id })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    draft.dive_site_id === site.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <p className="font-semibold text-text-primary dark:text-text-light">{site.name}</p>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-light">
                    {site.location}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-text-secondary-light mt-1">
                    {t('depth')}: {site.depth_range}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustomLocation(true)}
              className="text-blue-500 dark:text-blue-400 font-medium hover:underline"
            >
              {t('customLocation')}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              placeholder={t('enterLocation')}
              value={draft.custom_location || ''}
              onChange={(e) => setDraft({ custom_location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input text-text-primary dark:text-text-light"
            />
            <button
              onClick={() => {
                setShowCustomLocation(false);
                setDraft({ custom_location: undefined });
              }}
              className="text-blue-500 dark:text-blue-400 font-medium hover:underline"
            >
              {t('selectFromList')}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={`flex justify-between gap-4 ${isRtl && 'flex-row-reverse'}`}>
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {t('previous')}
        </button>
        <button
          onClick={onNext}
          disabled={!draft.dive_date || (!draft.dive_site_id && !draft.custom_location)}
          className="px-6 py-2 rounded-lg bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}
