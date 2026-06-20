'use client';

import { useLocale } from 'next-intl';
import { PackageDetail } from '@/types/payment';

interface PackageDetailsCardProps {
  package: PackageDetail;
}

export function PackageDetailsCard({ package: pkg }: PackageDetailsCardProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_confirmations':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      en: {
        pending_confirmations: 'Pending Confirmations',
        completed: 'Completed',
        failed: 'Failed',
      },
      he: {
        pending_confirmations: 'בהמתנה לאישורים',
        completed: 'הושלם',
        failed: 'נכשל',
      },
    };
    return labels[locale as 'en' | 'he'][status as keyof typeof labels['en']] || status;
  };

  const confirmedCount = pkg.confirmations.filter(c => c.status === 'confirmed').length;
  const totalCount = pkg.confirmations.length;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-md"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {isRTL ? 'פרטי החבילה' : 'Package Details'}
          </h3>
          <p className="text-sm text-gray-600">ID: {pkg.id}</p>
        </div>
        <span className={`rounded-full px-4 py-2 font-semibold ${getStatusColor(pkg.status)}`}>
          {getStatusLabel(pkg.status)}
        </span>
      </div>

      {/* Status Progress */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold text-gray-700">
            {isRTL ? 'אישורי ספקים' : 'Provider Confirmations'}
          </span>
          <span className="text-gray-600">
            {confirmedCount} / {totalCount}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all"
            style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="mb-6">
        <h4 className="mb-3 font-semibold text-gray-700">{isRTL ? 'שירותים' : 'Services'}</h4>
        <div className="space-y-2">
          {pkg.items.map(item => (
            <div key={item.id} className="flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-gray-700">{item.service_name}</span>
              <span className="font-semibold text-gray-900">₪{item.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">{isRTL ? 'סה"כ' : 'Total'}</span>
          <span className="text-2xl font-bold text-blue-600">₪{pkg.total_amount}</span>
        </div>
      </div>

      {/* Created Date */}
      <div className="mt-4 text-sm text-gray-500">
        {isRTL ? 'נוצרה ב-' : 'Created: '}
        {new Date(pkg.created_at).toLocaleDateString(locale)}
      </div>
    </div>
  );
}
