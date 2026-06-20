'use client';

import { useState, useEffect } from 'react';
import { useBookingStore } from '@/stores';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

interface BuddySelectionProps {
  onNext: () => void;
}

interface Buddy {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  diving_experience: string;
}

export function BuddySelection({ onNext }: BuddySelectionProps) {
  const t = useTranslations('bookings');
  const { draft, setDraft } = useBookingStore();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available buddies
    // TODO: Implement buddy search/discovery API
    setLoading(false);
  }, []);

  const handleSelectBuddy = (buddyId: string) => {
    setDraft({ buddy_user_id: buddyId });
  };

  const isRtl = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-light mb-2">
          {t('selectBuddyTitle')}
        </h3>
        <p className="text-text-secondary dark:text-text-secondary-light">
          {t('selectBuddyDescription')}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {buddies.length === 0 ? (
        <div className="text-center py-8 text-text-secondary dark:text-text-secondary-light">
          <p>{t('noBuddiesFound')}</p>
          <p className="text-sm mt-2">{t('useDiscoverBuddy')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buddies.map((buddy) => (
            <button
              key={buddy.id}
              onClick={() => handleSelectBuddy(buddy.id)}
              className={clsx(
                'p-4 rounded-lg border-2 transition-all text-left',
                draft.buddy_user_id === buddy.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              )}
            >
              <div className={clsx('flex items-center gap-3', isRtl && 'flex-row-reverse')}>
                {buddy.avatar_url && (
                  <img
                    src={buddy.avatar_url}
                    alt={buddy.first_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-text-primary dark:text-text-light">
                    {buddy.first_name} {buddy.last_name}
                  </p>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-light">
                    {buddy.diving_experience}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!draft.buddy_user_id}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
      >
        {t('continueButton')}
      </button>
    </div>
  );
}
