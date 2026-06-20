'use client';

import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useTranslations } from 'next-intl';

interface ProviderSelectionProps {
  onNext: () => void;
  onBack: () => void;
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  specialties: string[];
  rating: number;
  certified: boolean;
}

export function ProviderSelection({ onNext, onBack }: ProviderSelectionProps) {
  const t = useTranslations('bookings');
  const { draft, setDraft } = useBookingStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available service providers
    // TODO: Implement service providers API
    setLoading(false);
  }, []);

  const handleSelectProvider = (providerId: string) => {
    setDraft({ service_provider_id: providerId });
  };

  const isRtl = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-light mb-2">
          {t('selectProvider')}
        </h3>
        <p className="text-text-secondary dark:text-text-secondary-light">
          {t('selectProviderDescription')}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {providers.length === 0 ? (
        <div className="text-center py-8 text-text-secondary dark:text-text-secondary-light">
          <p>{t('noProvidersFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSelectProvider(provider.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                draft.service_provider_id === provider.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className={`flex items-center gap-3 mb-3 ${isRtl && 'flex-row-reverse'}`}>
                {provider.avatar_url && (
                  <img
                    src={provider.avatar_url}
                    alt={provider.first_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <p className="font-semibold text-text-primary dark:text-text-light">
                    {provider.first_name} {provider.last_name}
                  </p>
                  <div className={`flex items-center gap-1 ${isRtl && 'flex-row-reverse'}`}>
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm text-text-secondary dark:text-text-secondary-light">
                      {provider.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {provider.certified && (
                <div className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium mb-2">
                  {t('certified')}
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {provider.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-text-secondary dark:text-text-secondary-light rounded text-xs"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className={`flex justify-between gap-4 ${isRtl && 'flex-row-reverse'}`}>
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {t('previous')}
        </button>
        <button
          onClick={onNext}
          disabled={!draft.service_provider_id}
          className="px-6 py-2 rounded-lg bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}
