'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { AppIcon } from '@/components/AppIcon';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isRTL = locale === 'he';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 dark:bg-dark-bg"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="text-center">
        {/* Error Icon */}
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
          <AppIcon name="alert-circle" className="h-10 w-10 text-error" />
        </div>

        {/* Error Title */}
        <h1 className="mb-2 text-3xl font-bold text-text-primary dark:text-text-light">
          {isRTL ? 'שגיאה' : 'Oops!'}
        </h1>

        {/* Error Message */}
        <p className="mb-4 text-text-secondary dark:text-text-muted">
          {isRTL
            ? 'משהו השתבש. אנא נסה שוב או חזור לדף הבית.'
            : 'Something went wrong. Please try again or go back to home.'}
        </p>

        {/* Error Details */}
        {error.message && (
          <div className="mb-6 rounded-lg bg-bg-secondary px-4 py-3 text-left dark:bg-dark-surface-elevated">
            <p className="text-sm font-mono text-text-secondary dark:text-text-muted">
              {error.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            <AppIcon name="refresh-cw" className="h-5 w-5" />
            {isRTL ? 'נסה שוב' : 'Try Again'}
          </button>

          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-primary bg-white px-6 py-3 font-semibold text-primary transition-colors hover:bg-bg-secondary dark:border-border-dark dark:bg-dark-surface dark:text-primary dark:hover:bg-dark-surface-elevated"
          >
            <AppIcon name="home" className="h-5 w-5" />
            {isRTL ? 'דף הבית' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
