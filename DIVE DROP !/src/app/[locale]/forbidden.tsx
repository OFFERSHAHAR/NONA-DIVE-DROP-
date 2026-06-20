import React from 'react';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { AppIcon } from '@/components/AppIcon';

export const metadata = {
  title: '403 - Forbidden',
  description: 'Access denied',
};

export default async function ForbiddenPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 dark:bg-dark-bg"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="text-center">
        {/* Status Code */}
        <div className="mb-6 text-6xl font-bold text-error">403</div>

        {/* Error Icon */}
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
          <AppIcon name="shield-alert" className="h-10 w-10 text-error" />
        </div>

        {/* Error Title */}
        <h1 className="mb-2 text-3xl font-bold text-text-primary dark:text-text-light">
          {isRTL ? 'אין הרשאה' : 'Access Denied'}
        </h1>

        {/* Error Message */}
        <p className="mb-8 max-w-md text-text-secondary dark:text-text-muted">
          {isRTL
            ? 'אין לך הרשאה להגיע לעמוד זה. אם אתה חושב שזו שגיאה, אנא צור קשר עם התמיכה.'
            : "You don't have permission to access this page. If you think this is a mistake, please contact support."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            <AppIcon name="home" className="h-5 w-5" />
            {isRTL ? 'דף הבית' : 'Home'}
          </Link>

          <a
            href={`mailto:support@divedrop.com`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-primary bg-white px-6 py-3 font-semibold text-primary transition-colors hover:bg-bg-secondary dark:border-border-dark dark:bg-dark-surface dark:text-primary dark:hover:bg-dark-surface-elevated"
          >
            <AppIcon name="mail" className="h-5 w-5" />
            {isRTL ? 'צור קשר' : 'Contact Support'}
          </a>
        </div>

        {/* Back Link */}
        <button
          onClick={() => window.history.back()}
          className="mt-6 inline-flex items-center gap-2 text-primary transition-colors hover:underline"
        >
          <AppIcon name="arrow-left" className="h-4 w-4" />
          {isRTL ? 'חזור בחזרה' : 'Go back'}
        </button>
      </div>
    </div>
  );
}
