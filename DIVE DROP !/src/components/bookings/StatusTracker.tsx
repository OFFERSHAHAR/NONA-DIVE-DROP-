'use client';

import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { getStatusLabel, getStatusColor } from '@/lib/bookings/utils';
import type { BookingStatusType } from '@/lib/bookings/schemas';

interface StatusEvent {
  status: BookingStatusType;
  timestamp: string;
  changedBy?: string;
  notes?: string;
}

interface StatusTrackerProps {
  currentStatus: BookingStatusType;
  statusHistory?: StatusEvent[];
  locale?: 'en' | 'he';
}

const statusOrder: BookingStatusType[] = [
  'draft',
  'pending_confirmation',
  'confirmed',
  'completed',
];

export function StatusTracker({
  currentStatus,
  statusHistory = [],
  locale = 'en',
}: StatusTrackerProps) {
  const t = useTranslations('bookings');
  const isRtl = locale === 'he';

  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className={clsx('space-y-4', isRtl && 'rtl')}>
        {statusOrder.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const event = statusHistory.find((e) => e.status === status);

          return (
            <div key={status} className={clsx('flex', isRtl && 'flex-row-reverse')}>
              {/* Timeline Circle and Line */}
              <div className={clsx('flex flex-col items-center', isRtl ? 'ml-4' : 'mr-4')}>
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all',
                    isCurrent
                      ? 'bg-blue-500 ring-4 ring-blue-200 dark:ring-blue-900'
                      : isCompleted
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {index < statusOrder.length - 1 && (
                  <div
                    className={clsx(
                      'w-1 h-12 my-2 transition-all',
                      isCompleted
                        ? 'bg-green-500'
                        : isCurrent
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  />
                )}
              </div>

              {/* Status Content */}
              <div className="flex-1">
                <div className={clsx('mb-1', isRtl ? 'text-right' : 'text-left')}>
                  <h4
                    className={clsx(
                      'font-semibold',
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-text-primary dark:text-text-light'
                    )}
                  >
                    {getStatusLabel(status, locale)}
                  </h4>

                  {event && (
                    <p className="text-sm text-text-secondary dark:text-text-secondary-light">
                      {new Date(event.timestamp).toLocaleDateString(
                        locale === 'he' ? 'he-IL' : 'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </p>
                  )}

                  {event?.notes && (
                    <p className="text-sm text-text-secondary dark:text-text-secondary-light mt-1">
                      {event.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Status Badge */}
      <div className={clsx('p-4 rounded-lg', getStatusColor(currentStatus))}>
        <p className="font-semibold">{t('currentStatus')}</p>
        <p className="text-lg font-bold mt-1">{getStatusLabel(currentStatus, locale)}</p>
      </div>
    </div>
  );
}
