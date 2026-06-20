'use client';

import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/stores';
import { useTranslations } from 'next-intl';

export function ConfirmationStep() {
  const t = useTranslations('bookings');
  const router = useRouter();
  const { resetDraft } = useBookingStore();

  const handleStartNewBooking = () => {
    resetDraft();
    router.push('/bookings/new');
  };

  const handleViewBookings = () => {
    router.push('/bookings/my-bookings');
  };

  return (
    <div className="space-y-6 text-center py-8">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <span className="text-4xl">✓</span>
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary dark:text-text-light mb-2">
          {t('bookingConfirmed')}
        </h2>
        <p className="text-text-secondary dark:text-text-secondary-light">
          {t('confirmationMessage')}
        </p>
      </div>

      {/* Details */}
      <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-left space-y-2">
        <p className="text-sm">
          <span className="font-semibold text-text-primary dark:text-text-light">
            {t('bookingId')}:
          </span>
          <span className="text-text-secondary dark:text-text-secondary-light ml-2">
            #1234567890
          </span>
        </p>
        <p className="text-sm">
          <span className="font-semibold text-text-primary dark:text-text-light">
            {t('status')}:
          </span>
          <span className="text-text-secondary dark:text-text-secondary-light ml-2">
            {t('pending')}
          </span>
        </p>
        <p className="text-sm">
          <span className="font-semibold text-text-primary dark:text-text-light">
            {t('nextStep')}:
          </span>
          <span className="text-text-secondary dark:text-text-secondary-light ml-2">
            {t('waitingForProvider')}
          </span>
        </p>
      </div>

      {/* What Happens Next */}
      <div className="text-left">
        <h3 className="font-semibold text-text-primary dark:text-text-light mb-3">
          {t('whatHappensNext')}
        </h3>
        <ol className="space-y-2 text-sm text-text-secondary dark:text-text-secondary-light list-decimal list-inside">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
          <li>{t('step4')}</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleViewBookings}
          className="w-full px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          {t('viewMyBookings')}
        </button>
        <button
          onClick={handleStartNewBooking}
          className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-text-primary dark:text-text-light font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          {t('startNewBooking')}
        </button>
      </div>

      {/* Support Message */}
      <p className="text-sm text-text-secondary dark:text-text-secondary-light">
        {t('needHelp')}{' '}
        <a href="/support" className="text-blue-500 dark:text-blue-400 hover:underline">
          {t('contactSupport')}
        </a>
      </p>
    </div>
  );
}
