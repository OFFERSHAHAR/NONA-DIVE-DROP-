'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import clsx from 'clsx';
import { getStatusLabel, getStatusColor, formatBookingDate, formatDepth, formatTemperature } from '@/lib/bookings/utils';
import type { BookingStatusType } from '@/lib/bookings/schemas';

interface BookingCardProps {
  id: string;
  status: BookingStatusType;
  dive_date: string;
  max_depth: number;
  water_temp: number;
  estimated_duration: number;
  buddy?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  dive_site?: {
    id: string;
    name: string;
    location: string;
  };
  locale?: 'en' | 'he';
}

export function BookingCard({
  id,
  status,
  dive_date,
  max_depth,
  water_temp,
  estimated_duration,
  buddy,
  dive_site,
  locale = 'en',
}: BookingCardProps) {
  const t = useTranslations('bookings');
  const isRtl = locale === 'he';

  return (
    <Link href={`/bookings/${id}`}>
      <div
        className={clsx(
          'bg-white dark:bg-dark-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer',
          'border-l-4',
          getStatusColor(status).split(' ').includes('bg-gray-100')
            ? 'border-gray-400'
            : getStatusColor(status).includes('yellow')
            ? 'border-yellow-400'
            : getStatusColor(status).includes('green')
            ? 'border-green-400'
            : getStatusColor(status).includes('blue')
            ? 'border-blue-400'
            : 'border-red-400'
        )}
      >
        {/* Header */}
        <div className={clsx('flex justify-between items-start mb-3', isRtl && 'flex-row-reverse')}>
          <div>
            <h3 className="font-semibold text-text-primary dark:text-text-light">
              {dive_site?.name || 'Custom Location'}
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary-light">
              {dive_site?.location}
            </p>
          </div>
          <span
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium',
              getStatusColor(status)
            )}
          >
            {getStatusLabel(status, locale)}
          </span>
        </div>

        {/* Buddy Info */}
        {buddy && (
          <div className={clsx('flex items-center gap-2 mb-3', isRtl && 'flex-row-reverse')}>
            {buddy.avatar_url && (
              <img
                src={buddy.avatar_url}
                alt={`${buddy.first_name} ${buddy.last_name}`}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="text-sm text-text-secondary dark:text-text-secondary-light">
              {buddy.first_name} {buddy.last_name}
            </span>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-text-secondary dark:text-text-secondary-light mb-1">
              {t('diveDate')}
            </p>
            <p className="text-sm font-medium text-text-primary dark:text-text-light">
              {formatBookingDate(dive_date, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary dark:text-text-secondary-light mb-1">
              {t('duration')}
            </p>
            <p className="text-sm font-medium text-text-primary dark:text-text-light">
              {estimated_duration} {t('minutes')}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary dark:text-text-secondary-light mb-1">
              {t('maxDepth')}
            </p>
            <p className="text-sm font-medium text-text-primary dark:text-text-light">
              {formatDepth(max_depth, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary dark:text-text-secondary-light mb-1">
              {t('waterTemp')}
            </p>
            <p className="text-sm font-medium text-text-primary dark:text-text-light">
              {formatTemperature(water_temp, locale)}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
          }}
          className="w-full text-sm text-blue-500 dark:text-blue-400 font-medium hover:underline"
        >
          {t('viewDetails')} →
        </button>
      </div>
    </Link>
  );
}
