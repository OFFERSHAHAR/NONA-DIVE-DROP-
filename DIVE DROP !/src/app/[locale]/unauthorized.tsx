import React from 'react';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { AppIcon } from '@/components/AppIcon';

export const metadata = {
  title: '401 - Unauthorized',
  description: 'Authentication required',
};

export default async function UnauthorizedPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 dark:bg-dark-bg"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="text-center">
        {/* Status Code */}
        <div className="mb-6 text-6xl font-bold text-error">401</div>

        {/* Error Icon */}
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
          <AppIcon name="lock" className="h-10 w-10 text-error" />
        </div>

        {/* Error Title */}
        <h1 className="mb-2 text-3xl font-bold text-text-primary dark:text-text-light">
          {isRTL ? 'דרוש התחברות' : 'Authentication Required'}
        </h1>

        {/* Error Message */}
        <p className="mb-8 max-w-md text-text-secondary dark:text-text-muted">
          {isRTL
            ? 'עליך להיות מחובר כדי לגשת לעמוד זה. אנא התחבר או הירשם כדי להמשיך.'
            : 'You need to be logged in to access this page. Please log in or sign up to continue.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            <AppIcon name="log-in" className="h-5 w-5" />
            {isRTL ? 'התחברות' : 'Log In'}
          </Link>

          <Link
            href={`/${locale}/auth/register`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-primary bg-white px-6 py-3 font-semibold text-primary transition-colors hover:bg-bg-secondary dark:border-border-dark dark:bg-dark-surface dark:text-primary dark:hover:bg-dark-surface-elevated"
          >
            <AppIcon name="user-plus" className="h-5 w-5" />
            {isRTL ? 'הרשמה' : 'Sign Up'}
          </Link>
        </div>

        {/* Back Link */}
        <Link
          href={`/${locale}`}
          className="mt-6 inline-flex items-center gap-2 text-primary transition-colors hover:underline"
        >
          <AppIcon name="arrow-left" className="h-4 w-4" />
          {isRTL ? 'חזור לדף הבית' : 'Go back to home'}
        </Link>
      </div>
    </div>
  );
}
