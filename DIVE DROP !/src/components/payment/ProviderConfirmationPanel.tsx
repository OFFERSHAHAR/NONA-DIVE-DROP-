'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ProviderNotification, PaymentConfirmationNotificationData } from '@/types/payment';

interface ProviderConfirmationPanelProps {
  notification: ProviderNotification;
  onConfirm?: (confirmationId: string) => void;
  isLoading?: boolean;
}

export function ProviderConfirmationPanel({
  notification,
  onConfirm,
  isLoading = false,
}: ProviderConfirmationPanelProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const data = notification.data as PaymentConfirmationNotificationData;

  const labels = {
    en: {
      paymentConfirmation: 'Payment Confirmation',
      customerName: 'Customer Name',
      items: 'Services',
      total: 'Total Amount',
      confirmPayment: 'Confirm Payment Receipt',
      confirming: 'Confirming...',
      confirmed: 'Confirmed ✅',
    },
    he: {
      paymentConfirmation: 'אישור תשלום',
      customerName: 'שם הלקוח',
      items: 'שירותים',
      total: 'סכום כולל',
      confirmPayment: 'אשר קבלת תשלום',
      confirming: 'מאשר...',
      confirmed: 'מאושר ✅',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm(data.confirmation_id);
      setIsConfirmed(true);
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-md"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-900">{currentLabels.paymentConfirmation}</h2>
        {isConfirmed && <span className="text-lg font-bold text-green-600">✅ {currentLabels.confirmed}</span>}
      </div>

      {/* Customer Info */}
      <div className="mb-4 rounded-lg bg-white p-4">
        <div className="text-sm font-semibold text-gray-600">{currentLabels.customerName}</div>
        <div className="text-lg font-bold text-gray-900">{data.customer_name}</div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <h3 className="mb-3 font-semibold text-gray-700">{currentLabels.items}</h3>
        <div className="overflow-x-auto rounded-lg bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  {isRTL ? 'שירות' : 'Service'}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  {isRTL ? 'מחיר' : 'Price'}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-4 py-3 text-gray-700">{item.service_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">₪{item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total */}
      <div className="mb-6 rounded-lg bg-white p-4">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">{currentLabels.total}</span>
          <span className="text-2xl font-bold text-blue-600">₪{data.total}</span>
        </div>
      </div>

      {/* Confirmation Button */}
      {!isConfirmed && data.action_required && (
        <button
          onClick={handleConfirm}
          disabled={isLoading || isConfirmed}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-bold text-white transition hover:shadow-lg disabled:opacity-50"
        >
          {isLoading ? currentLabels.confirming : currentLabels.confirmPayment}
        </button>
      )}

      {isConfirmed && (
        <div className="rounded-lg bg-green-50 p-4 text-center text-green-700 font-semibold">
          {isRTL ? 'תשלום מאושר בהצלחה ✅' : 'Payment confirmed successfully ✅'}
        </div>
      )}
    </div>
  );
}
