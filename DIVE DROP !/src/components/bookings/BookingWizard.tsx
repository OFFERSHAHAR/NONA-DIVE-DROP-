'use client';

import { useBookingStore } from '@/stores';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { BuddySelection } from './steps/BuddySelection';
import { DateLocationSelection } from './steps/DateLocationSelection';
import { ProviderSelection } from './steps/ProviderSelection';
import { PaymentStep } from './steps/PaymentStep';
import { ConfirmationStep } from './steps/ConfirmationStep';

export function BookingWizard() {
  const t = useTranslations('bookings');
  const {
    currentStep,
    getProgress,
    nextStep,
    previousStep,
    draft,
  } = useBookingStore();

  const progress = getProgress();

  const isRtl = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';

  const steps = [
    { id: 'draft', label: t('steps.selectBuddy') },
    { id: 'selecting_date', label: t('steps.selectDateTime') },
    { id: 'selecting_location', label: t('steps.selectLocation') },
    { id: 'selecting_provider', label: t('steps.selectProvider') },
    { id: 'payment', label: t('steps.payment') },
    { id: 'confirmed', label: t('steps.confirmation') },
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 'draft':
        return <BuddySelection onNext={nextStep} />;
      case 'selecting_date':
        return <DateLocationSelection onNext={nextStep} onBack={previousStep} />;
      case 'selecting_location':
        return <DateLocationSelection onNext={nextStep} onBack={previousStep} />;
      case 'selecting_provider':
        return <ProviderSelection onNext={nextStep} onBack={previousStep} />;
      case 'payment':
        return <PaymentStep onNext={nextStep} onBack={previousStep} />;
      case 'confirmed':
        return <ConfirmationStep />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-light">
            {t('bookingWizard')}
          </h2>
          <span className="text-sm text-text-secondary dark:text-text-secondary-light">
            {progress}% {t('complete')}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className={clsx(
        'flex justify-between items-center overflow-x-auto pb-2',
        isRtl && 'flex-row-reverse'
      )}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={clsx(
              'flex flex-col items-center flex-1 min-w-[100px]',
              isRtl && 'flex-row-reverse'
            )}
          >
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all',
                currentStep === step.id
                  ? 'bg-blue-500 dark:bg-blue-400 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-text-light'
              )}
            >
              {index + 1}
            </div>
            <span className="text-xs text-center mt-2 text-text-secondary dark:text-text-secondary-light whitespace-nowrap">
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      {currentStep !== 'confirmed' && (
        <div className={clsx(
          'flex justify-between gap-4',
          isRtl && 'flex-row-reverse'
        )}>
          <button
            onClick={previousStep}
            disabled={currentStep === 'draft'}
            className={clsx(
              'px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 font-medium transition-colors',
              currentStep === 'draft'
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-text-primary dark:text-text-light'
            )}
          >
            {t('previous')}
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-2 rounded-lg bg-blue-500 dark:bg-blue-400 text-white font-medium hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            {currentStep === 'payment' ? t('complete') : t('next')}
          </button>
        </div>
      )}
    </div>
  );
}
