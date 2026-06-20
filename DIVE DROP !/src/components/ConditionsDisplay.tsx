'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useConditions } from '@/hooks/useConditions';
import { MARINE_SPECIES } from '@/types/feedback';
import { Button } from './Button';
import { AppIcon } from './AppIcon';

export interface ConditionsDisplayProps {
  diveSiteId: string;
  locale?: 'en' | 'he';
}

/**
 * ConditionsDisplay Component
 *
 * Displays aggregated dive conditions for a specific dive site.
 * Shows sea conditions (visibility, temperature, current), marine life observations,
 * and metadata about the data collection.
 *
 * States:
 * - Loading: Shows loading message
 * - Error: Shows error message
 * - Insufficient data: Shows message when fewer than 2 feedback entries exist
 * - Data: Displays full conditions breakdown with grid and marine life section
 *
 * @component
 * @example
 * ```tsx
 * <ConditionsDisplay diveSiteId="site-123" />
 * ```
 */
export const ConditionsDisplay = React.forwardRef<HTMLDivElement, ConditionsDisplayProps>(
  ({ diveSiteId, locale = 'he' }, ref) => {
    const isRTL = locale === 'he';
    const { data, isLoading, error } = useConditions(diveSiteId);
    const [expandedSpecies, setExpandedSpecies] = useState(false);

    // Determine if we have sufficient data
    const hasData = data && data.total_feedback_count >= 2;

    /**
     * Get current intensity label based on current strength value (0-10 scale)
     */
    const getCurrentIntensity = (strength: number): string => {
      if (strength <= 2) return locale === 'he' ? 'חלש' : 'Weak';
      if (strength <= 5) return locale === 'he' ? 'בינוני' : 'Moderate';
      if (strength <= 7) return locale === 'he' ? 'חזק' : 'Strong';
      return locale === 'he' ? 'קשה מאוד' : 'Very Strong';
    };

    /**
     * Get species data by key
     */
    const getSpeciesData = (key: string) => {
      return MARINE_SPECIES.find((s) => s.key === key);
    };

    /**
     * Format time ago string
     */
    const formatTimeAgo = (isoString: string): string => {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return locale === 'he' ? 'עכשיו' : 'Now';
      }
      if (diffMins < 60) {
        return locale === 'he' ? `לפני ${diffMins} דקות` : `${diffMins} minutes ago`;
      }
      if (diffHours < 24) {
        return locale === 'he' ? `לפני ${diffHours} שעות` : `${diffHours} hours ago`;
      }
      return locale === 'he' ? `לפני ${diffDays} ימים` : `${diffDays} days ago`;
    };

    // ========================================================================
    // RENDER: LOADING STATE
    // ========================================================================
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={clsx(
            'flex flex-col gap-4 p-5 sm:p-6',
            'bg-white dark:bg-slate-900 rounded-lg',
            'border border-slate-200 dark:border-slate-700',
            'shadow-md w-full',
            isRTL ? 'text-right' : 'text-left'
          )}
          role="status"
          aria-label={locale === 'he' ? 'טוען תנאים' : 'Loading conditions'}
        >
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 rounded-full border-2 border-slate-300 border-t-blue-500 dark:border-slate-600 dark:border-t-blue-400" />
            <p className="text-slate-600 dark:text-slate-400">
              {locale === 'he' ? 'טוען תנאים...' : 'Loading conditions...'}
            </p>
          </div>
        </div>
      );
    }

    // ========================================================================
    // RENDER: ERROR STATE
    // ========================================================================
    if (error && error !== 'Insufficient feedback') {
      return (
        <div
          ref={ref}
          className={clsx(
            'flex flex-col gap-3 p-5 sm:p-6',
            'bg-red-50 dark:bg-red-950 rounded-lg',
            'border border-red-200 dark:border-red-800',
            'shadow-md w-full',
            isRTL ? 'text-right' : 'text-left'
          )}
          role="alert"
          aria-label={locale === 'he' ? 'שגיאה בטעינת תנאים' : 'Error loading conditions'}
        >
          <div className="flex items-start gap-3">
            <AppIcon name="alert-circle" className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error}
            </p>
          </div>
        </div>
      );
    }

    // ========================================================================
    // RENDER: INSUFFICIENT DATA STATE
    // ========================================================================
    if (!hasData) {
      return (
        <div
          ref={ref}
          className={clsx(
            'flex flex-col gap-3 p-5 sm:p-6',
            'bg-amber-50 dark:bg-amber-950 rounded-lg',
            'border border-amber-200 dark:border-amber-800',
            'shadow-md w-full',
            isRTL ? 'text-right' : 'text-left'
          )}
          role="status"
          aria-label={locale === 'he' ? 'אין מספיק נתונים' : 'Insufficient data'}
        >
          <div className="flex items-start gap-3">
            <AppIcon name="info" className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 dark:text-amber-300 text-sm">
              {locale === 'he'
                ? 'אין מספיק משוב כדי להציג תנאים'
                : 'Not enough feedback entries to display conditions'}
            </p>
          </div>
        </div>
      );
    }

    // ========================================================================
    // RENDER: DATA AVAILABLE STATE
    // ========================================================================
    return (
      <div
        ref={ref}
        className={clsx(
          'flex flex-col gap-6 p-5 sm:p-6',
          'bg-white dark:bg-slate-900 rounded-lg',
          'border border-slate-200 dark:border-slate-700',
          'shadow-md w-full',
          isRTL ? 'text-right' : 'text-left'
        )}
        role="region"
        aria-label={locale === 'he' ? 'תנאי צלילה היום' : 'Conditions today'}
      >
        {/* HEADER SECTION */}
        <div className={clsx('flex items-center justify-between gap-3', isRTL ? 'flex-row-reverse' : '')}>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {locale === 'he' ? 'תנאים היום' : 'Conditions Today'}
          </h2>
          <span className={clsx(
            'px-3 py-1 rounded-full text-xs sm:text-sm font-semibold',
            'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
          )}>
            {data.total_feedback_count} {locale === 'he' ? 'צוללים דיווחו' : 'divers reported'}
          </span>
        </div>

        {/* SEA CONDITIONS GRID - 3 CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* VISIBILITY CARD */}
          <div className={clsx(
            'flex flex-col gap-2 p-4 sm:p-5 rounded-lg',
            'bg-slate-50 dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700'
          )}>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              {locale === 'he' ? 'ראות' : 'Visibility'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                {Math.round(data.visibility_avg)}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {locale === 'he' ? 'מ' : 'm'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {Math.round(data.visibility_min)}-{Math.round(data.visibility_max)}
              {locale === 'he' ? ' מ' : 'm'}
            </p>
          </div>

          {/* TEMPERATURE CARD */}
          <div className={clsx(
            'flex flex-col gap-2 p-4 sm:p-5 rounded-lg',
            'bg-slate-50 dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700'
          )}>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              {locale === 'he' ? 'טמפרטורה' : 'Temperature'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                {Math.round(data.temperature_avg)}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                °C
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {locale === 'he' ? 'ממוצע' : 'Average'}
            </p>
          </div>

          {/* CURRENT CARD */}
          <div className={clsx(
            'flex flex-col gap-2 p-4 sm:p-5 rounded-lg',
            'bg-slate-50 dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700'
          )}>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              {locale === 'he' ? 'זרם' : 'Current'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                {Math.round(data.current_strength_avg)}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                /10
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {getCurrentIntensity(data.current_strength_avg)}
            </p>
          </div>
        </div>

        {/* MARINE LIFE SECTION */}
        {Object.keys(data.species_counts).length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-700 pt-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {locale === 'he' ? 'חיות ים שנצפו' : 'Marine Life Spotted'}
            </h3>

            {/* Marine Life List - Initially show first 3, expand for more */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(data.species_counts)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, expandedSpecies ? undefined : 3)
                .map(([speciesKey, count]) => {
                  const species = getSpeciesData(speciesKey);
                  if (!species) return null;

                  return (
                    <div
                      key={speciesKey}
                      className={clsx(
                        'flex items-center gap-2 p-2 rounded-md',
                        'bg-slate-100 dark:bg-slate-800',
                        isRTL ? 'flex-row-reverse' : ''
                      )}
                    >
                      <span className="text-lg">{species.icon}</span>
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                        {locale === 'he' ? species.label : species.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {locale === 'he' ? `×${count}` : `×${count}`}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Expand/Collapse Button - Show if more than 3 species */}
            {Object.keys(data.species_counts).length > 3 && (
              <Button
                onClick={() => setExpandedSpecies(!expandedSpecies)}
                variant="secondary"
                size="sm"
                aria-label={
                  expandedSpecies
                    ? (locale === 'he' ? 'הסתר פרטים' : 'Hide details')
                    : (locale === 'he' ? 'צפה בפרטים' : 'View details')
                }
              >
                {expandedSpecies
                  ? (locale === 'he' ? 'הסתר פרטים' : 'Hide details')
                  : (locale === 'he' ? 'צפה בפרטים' : 'View details')}
              </Button>
            )}
          </div>
        )}

        {/* TIMESTAMP FOOTER */}
        <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-4">
          {locale === 'he'
            ? `עודכן ${formatTimeAgo(data.cached_at)}`
            : `Updated ${formatTimeAgo(data.cached_at)}`}
        </div>
      </div>
    );
  }
);

ConditionsDisplay.displayName = 'ConditionsDisplay';

export default ConditionsDisplay;
