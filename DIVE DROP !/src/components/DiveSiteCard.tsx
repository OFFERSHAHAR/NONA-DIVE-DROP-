import React from 'react';
import clsx from 'clsx';
import { AppIcon, type AppIconName } from './AppIcon';

export interface DiveSiteCardProps {
  name: string;
  imageUrl: string;
  maxDepth: number;
  difficulty: 'easy' | 'intermediate' | 'hard';
  duration?: number;
  rating?: number;
  reviews?: number;
  badge?: 'match' | 'popular' | 'guided' | 'required';
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  locale?: 'en' | 'he';
}

const difficultyConfig = {
  easy: {
    label: 'קל',
    color: '#22c55e',
    bgColor: 'bg-green-50 dark:bg-green-950',
    textColor: 'text-green-700 dark:text-green-300',
  },
  intermediate: {
    label: 'בינוני',
    color: '#f97316',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    textColor: 'text-orange-700 dark:text-orange-300',
  },
  hard: {
    label: 'קשה',
    color: '#ef4444',
    bgColor: 'bg-red-50 dark:bg-red-950',
    textColor: 'text-red-700 dark:text-red-300',
  },
};

const badgeConfig = {
  match: {
    label: 'מתאים לך',
    icon: 'award' as AppIconName,
    bgColor: 'bg-green-500 dark:bg-green-600',
    textColor: 'text-white',
  },
  popular: {
    label: 'פופולרי היום',
    icon: 'star-filled' as AppIconName,
    bgColor: 'bg-orange-500 dark:bg-orange-600',
    textColor: 'text-white',
  },
  guided: {
    label: 'עם מדריך מומלץ',
    icon: 'user' as AppIconName,
    bgColor: 'bg-purple-500 dark:bg-purple-600',
    textColor: 'text-white',
  },
  required: {
    label: 'מחייב מדריך',
    icon: 'award' as AppIconName,
    bgColor: 'bg-red-500 dark:bg-red-600',
    textColor: 'text-white',
  },
};

export const DiveSiteCard = React.forwardRef<HTMLDivElement, DiveSiteCardProps>(
  (
    {
      name,
      imageUrl,
      maxDepth,
      difficulty,
      duration,
      rating,
      reviews,
      badge,
      isFavorite = false,
      onFavoriteToggle,
      locale = 'he',
    },
    ref
  ) => {
    const isRTL = locale === 'he';
    const badgeData = badge ? badgeConfig[badge] : null;
    const diffConfig = difficultyConfig[difficulty];

    return (
      <div
        ref={ref}
        className={clsx(
          'group overflow-hidden rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-white dark:bg-slate-900',
          'h-full flex flex-col'
        )}
        role="article"
        aria-label={`${name} - צלילה`}
      >
        {/* Image Container */}
        <div className="relative w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
          <img
            src={imageUrl}
            alt={name}
            className={clsx(
              'h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105',
              'sm:h-56 lg:h-64'
            )}
            loading="lazy"
          />

          {/* Badge - Top Left */}
          {badgeData && (
            <div
              className={clsx(
                'absolute top-3 left-3 px-3 py-1 rounded-md text-xs font-semibold',
                badgeData.bgColor,
                badgeData.textColor
              )}
            >
              <span className="flex items-center gap-1.5"><AppIcon name={badgeData.icon} className="h-4 w-4" />{badgeData.label}</span>
            </div>
          )}

          {/* Favorite Button - Top Right */}
          <button
            onClick={onFavoriteToggle}
            aria-label={isFavorite ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
            className={clsx(
              'absolute top-3 right-3 p-2 rounded-full transition-all duration-200',
              'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
              'focus:ring-red-500 focus:ring-offset-white dark:focus:ring-offset-slate-900',
              isFavorite
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700'
            )}
          >
            <AppIcon name={isFavorite ? 'heart-filled' : 'heart'} className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className={clsx('flex flex-col gap-3 p-4 flex-1', isRTL ? 'text-right' : 'text-left')}>
          {/* Name */}
          <h3 className={clsx('text-lg font-bold text-slate-900 dark:text-white line-clamp-2')}>
            {name}
          </h3>

          {/* Max Depth */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              עומק מקסימלי: {maxDepth} מ'
            </span>
          </div>

          {/* Difficulty */}
          <div className={clsx('flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: diffConfig.color }}
              aria-hidden="true"
            />
            <span className={clsx('text-sm font-medium', diffConfig.textColor)}>
              {diffConfig.label}
            </span>
          </div>

          {/* Duration */}
          {duration && (
            <div className={clsx('flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400')}>
              <AppIcon name="van" className="h-4 w-4" /><span>{duration} דק&apos; מהמרכז</span>
            </div>
          )}

          {/* Rating and Reviews */}
          {rating && reviews !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <AppIcon name="star-filled" className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold text-slate-900 dark:text-white">
                {rating.toFixed(1)}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                ({reviews})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

DiveSiteCard.displayName = 'DiveSiteCard';

export default DiveSiteCard;
