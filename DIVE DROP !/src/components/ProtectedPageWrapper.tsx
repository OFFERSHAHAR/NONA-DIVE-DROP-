'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import clsx from 'clsx';
import { useAuthStore } from '@/stores';

export interface ProtectedPageWrapperProps {
  children: ReactNode;
  requiredRole?: 'registered' | 'admin';
  showLoadingUI?: boolean;
  fallbackPath?: string;
  className?: string;
}

/**
 * Wraps a page to require authentication
 * - Redirects to login if not authenticated
 * - Shows loading state while checking auth
 * - Optionally checks for specific roles
 */
export const ProtectedPageWrapper: React.FC<ProtectedPageWrapperProps> = ({
  children,
  requiredRole = 'registered',
  showLoadingUI = true,
  fallbackPath,
  className,
}) => {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuthStore();

  // Show loading state while checking authentication
  if (loading && showLoadingUI) {
    return (
      <div className={clsx('flex min-h-screen items-center justify-center', className)}>
        <div className="text-center">
          <div className="mb-4 inline-flex h-12 w-12 animate-spin rounded-full border-4 border-border-primary border-t-primary"></div>
          <p className="text-text-secondary">
            {isRTL ? 'טוען...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    const loginUrl = fallbackPath || `/${locale}/auth/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`;

    if (typeof window !== 'undefined') {
      router.push(loginUrl);
    }

    return (
      <div className={clsx('flex min-h-screen items-center justify-center', className)}>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-text-primary dark:text-text-light">
            {isRTL ? 'דרוש התחברות' : 'Authentication Required'}
          </h1>
          <p className="text-text-secondary dark:text-text-muted">
            {isRTL ? 'אנא התחברו כדי לגשת לעמוד זה' : 'Please log in to access this page'}
          </p>
        </div>
      </div>
    );
  }

  // Check for admin role if required
  if (requiredRole === 'admin') {
    const isAdmin = user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return (
        <div className={clsx('flex min-h-screen items-center justify-center', className)}>
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-error">
              {isRTL ? 'אין הרשאה' : 'Access Denied'}
            </h1>
            <p className="text-text-secondary dark:text-text-muted">
              {isRTL ? 'אין לך הרשאה לגשת לעמוד זה' : 'You do not have permission to access this page'}
            </p>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and authorized
  return <div className={className}>{children}</div>;
};

export default ProtectedPageWrapper;
