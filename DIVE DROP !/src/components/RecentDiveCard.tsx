import React from 'react';
import clsx from 'clsx';
import { Button } from './Button';

export interface RecentDiveCardProps {
  name: string;
  imageUrl: string;
  type: string;
  date: string;
  time: string;
  organized: boolean;
  instructor?: string;
  participants?: number;
  onViewDetails?: () => void;
  locale?: 'en' | 'he';
}

export const RecentDiveCard = React.forwardRef<HTMLDivElement, RecentDiveCardProps>(
  (
    {
      name,
      imageUrl,
      type,
      date,
      time,
      organized,
      instructor,
      participants,
      onViewDetails,
      locale = 'he',
    },
    ref
  ) => {
    const isRTL = locale === 'he';

    return (
      <div
        ref={ref}
        className={clsx(
          'flex flex-col gap-4 p-5 sm:p-6',
          'bg-white dark:bg-slate-900 rounded-lg',
          'border border-slate-200 dark:border-slate-700',
          'shadow-md transition-all duration-200 hover:shadow-lg',
          'w-full'
        )}
        role="article"
        aria-label={`צלילה אחרונה: ${name}`}
      >
        {/* Image and Info Row */}
        <div className={clsx('flex gap-4 sm:gap-5', isRTL ? 'flex-row-reverse' : '')}>
          {/* Circular Image */}
          <div className="flex-shrink-0">
            <img
              src={imageUrl}
              alt={name}
              className={clsx(
                'h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover',
                'border-2 border-slate-200 dark:border-slate-700',
                'shadow-md'
              )}
              loading="lazy"
            />
          </div>

          {/* Text Content */}
          <div className={clsx('flex flex-col gap-2 flex-1', isRTL ? 'text-right' : 'text-left')}>
            {/* Name */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {name}
            </h3>

            {/* Type */}
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {type}
            </p>

            {/* Date and Time */}
            <div
              className={clsx(
                'flex gap-4 text-sm text-slate-600 dark:text-slate-400',
                isRTL ? 'flex-row-reverse' : ''
              )}
            >
              <span className="flex items-center gap-1">
                <span>🗓️</span>
                <span>{date}</span>
              </span>
              <span className="flex items-center gap-1">
                <span>⏰</span>
                <span>{time}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Details Row */}
        <div
          className={clsx(
            'flex flex-wrap gap-3 text-sm',
            'text-slate-600 dark:text-slate-400',
            'border-t border-slate-200 dark:border-slate-700 pt-4',
            isRTL ? 'flex-row-reverse justify-end' : ''
          )}
        >
          {/* Organized Status */}
          <span className={clsx('flex items-center gap-1', isRTL ? 'flex-row-reverse' : '')}>
            <span>👥</span>
            <span>{organized ? 'מאורגנת' : 'פרטית'}</span>
          </span>

          {/* Instructor */}
          {instructor && (
            <span className={clsx('flex items-center gap-1', isRTL ? 'flex-row-reverse' : '')}>
              <span>👤</span>
              <span>מדריך: {instructor}</span>
            </span>
          )}

          {/* Participants Count */}
          {participants !== undefined && (
            <span className={clsx('flex items-center gap-1', isRTL ? 'flex-row-reverse' : '')}>
              <span>👨‍👩‍👧‍👦</span>
              <span>{participants} משתתפים</span>
            </span>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={onViewDetails}
          variant="primary"
          size="md"
          fullWidth
          className={clsx('mt-2')}
          aria-label={`צפה בפרטי צלילה של ${name}`}
        >
          פרטי הצלילה
        </Button>
      </div>
    );
  }
);

RecentDiveCard.displayName = 'RecentDiveCard';

export interface RecentDiveListProps {
  dives: Omit<RecentDiveCardProps, 'onViewDetails'>[];
  onViewDetails?: (index: number) => void;
  locale?: 'en' | 'he';
}

export const RecentDiveList = ({
  dives,
  onViewDetails,
  locale = 'he',
}: RecentDiveListProps) => {
  return (
    <div
      className="flex flex-col gap-4 w-full"
      role="region"
      aria-label="צלילות אחרונות"
    >
      {dives.map((dive, index) => (
        <RecentDiveCard
          key={`${dive.name}-${dive.date}`}
          {...dive}
          onViewDetails={() => onViewDetails?.(index)}
          locale={locale}
        />
      ))}
    </div>
  );
};

export default RecentDiveCard;
