'use client';

import { useState } from 'react';
import { useBookingStore } from '@/stores';
import { useTranslations } from 'next-intl';
import { calculateTotalCost } from '@/lib/bookings/utils';

interface PaymentStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PaymentStep({ onNext, onBack }: PaymentStepProps) {
  const t = useTranslations('bookings');
  const { draft, setDraft } = useBookingStore();
  const [diverCount, setDiverCount] = useState(draft.number_of_divers || 2);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal' | 'bank_transfer'>(
    'credit_card'
  );

  const baseCost = diverCount * 100; // $100 per diver
  const { base, platformFee, tax, total } = calculateTotalCost(baseCost);

  const handleDiverCountChange = (count: number) => {
    setDiverCount(count);
    setDraft({ number_of_divers: count });
  };

  const isRtl = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';

  return (
    <div className="space-y-6">
      {/* Diver Count Selection */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-light mb-4">
          {t('numberOfDivers')}
        </h3>

        <div className={`flex items-center gap-4 ${isRtl && 'flex-row-reverse'}`}>
          <button
            onClick={() => handleDiverCountChange(Math.max(1, diverCount - 1))}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            −
          </button>

          <span className="text-3xl font-bold text-text-primary dark:text-text-light min-w-[60px] text-center">
            {diverCount}
          </span>

          <button
            onClick={() => handleDiverCountChange(Math.min(10, diverCount + 1))}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            +
          </button>
        </div>

        <p className="text-sm text-text-secondary dark:text-text-secondary-light mt-2">
          {t('maxDivers')}: 10
        </p>
      </div>

      {/* Price Breakdown */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-text-primary dark:text-text-light mb-3">
          {t('priceBreakdown')}
        </h3>

        <div className={`flex justify-between ${isRtl && 'flex-row-reverse'}`}>
          <span className="text-text-secondary dark:text-text-secondary-light">
            {t('basePrice')} ({diverCount} × ILS 100)
          </span>
          <span className="font-medium text-text-primary dark:text-text-light">ILS {base}</span>
        </div>

        <div className={`flex justify-between ${isRtl && 'flex-row-reverse'}`}>
          <span className="text-text-secondary dark:text-text-secondary-light">
            {t('platformFee')} (15%)
          </span>
          <span className="font-medium text-text-primary dark:text-text-light">
            ILS {platformFee}
          </span>
        </div>

        <div className={`flex justify-between ${isRtl && 'flex-row-reverse'}`}>
          <span className="text-text-secondary dark:text-text-secondary-light">
            {t('tax')} (17%)
          </span>
          <span className="font-medium text-text-primary dark:text-text-light">ILS {tax}</span>
        </div>

        <div className="border-t border-gray-300 dark:border-gray-700 pt-3">
          <div className={`flex justify-between ${isRtl && 'flex-row-reverse'}`}>
            <span className="text-lg font-bold text-text-primary dark:text-text-light">
              {t('total')}
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              ILS {total}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-light mb-4">
          {t('paymentMethod')}
        </h3>

        <div className="space-y-3">
          {[
            { value: 'credit_card', label: t('creditCard'), icon: '💳' },
            { value: 'paypal', label: 'PayPal', icon: '🅿️' },
            { value: 'bank_transfer', label: t('bankTransfer'), icon: '🏦' },
          ].map((method) => (
            <label
              key={method.value}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === method.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.value}
                checked={paymentMethod === method.value}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="ml-3 flex items-center gap-2">
                <span>{method.icon}</span>
                <span className="text-text-primary dark:text-text-light">{method.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terms"
          className="w-4 h-4 mt-1 cursor-pointer"
        />
        <label htmlFor="terms" className="text-sm text-text-secondary dark:text-text-secondary-light">
          {t('agreeToTerms')}{' '}
          <a href="/terms" className="text-blue-500 dark:text-blue-400 hover:underline">
            {t('termsOfService')}
          </a>
        </label>
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
          className="px-6 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600"
        >
          {t('completePayment')}
        </button>
      </div>
    </div>
  );
}
