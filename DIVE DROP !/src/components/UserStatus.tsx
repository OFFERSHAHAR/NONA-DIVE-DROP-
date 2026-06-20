'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import clsx from 'clsx';
import { useAuthStore } from '@/stores';
import { AppIcon } from '@/components/AppIcon';
import { LogoutButton } from '@/components/LogoutButton';

export interface UserStatusProps {
  className?: string;
  compact?: boolean;
}

export const UserStatus: React.FC<UserStatusProps> = ({ className, compact = false }) => {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const { user, isAuthenticated, loading } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || loading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    // Not logged in
    return (
      <div
        className={clsx(
          'flex items-center gap-2',
          compact ? 'gap-1' : 'gap-3',
          className
        )}
      >
        <Link
          href={`/${locale}/auth/login`}
          className={clsx(
            'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
            compact
              ? 'px-2 py-1 text-sm'
              : 'px-4 py-2',
            'bg-primary text-white hover:bg-primary-dark'
          )}
        >
          {isRTL ? 'התחברות' : 'Login'}
        </Link>
        <Link
          href={`/${locale}/auth/register`}
          className={clsx(
            'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
            compact
              ? 'px-2 py-1 text-sm'
              : 'px-4 py-2',
            'border border-primary text-primary hover:bg-primary/10'
          )}
        >
          {isRTL ? 'הרשמה' : 'Register'}
        </Link>
      </div>
    );
  }

  // Logged in
  const userInitials = user.email
    ?.split('@')[0]
    .split('.')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'U';

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';

  return (
    <div
      className={clsx(
        'flex items-center gap-2',
        compact ? 'gap-1' : 'gap-3',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* User Info */}
      <div
        className={clsx(
          'flex flex-col justify-center',
          compact ? 'hidden' : 'flex',
          isRTL ? 'text-right' : 'text-left'
        )}
      >
        <div className="text-sm font-semibold text-text-primary dark:text-text-light">
          {displayName}
        </div>
        <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-text-muted">
          <span className="inline-flex h-2 w-2 rounded-full bg-success" aria-label={isRTL ? 'מחובר' : 'Connected'} />
          <span>{isRTL ? 'מחובר' : 'Connected'}</span>
        </div>
      </div>

      {/* User Avatar */}
      <Link
        href={`/${locale}/profile`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold transition-transform hover:scale-110"
        title={displayName}
      >
        {userInitials}
      </Link>

      {/* Settings Link */}
      <Link
        href={`/${locale}/settings`}
        className="rounded-lg p-2 transition-colors hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated"
        aria-label={isRTL ? 'הגדרות' : 'Settings'}
      >
        <AppIcon name="settings" className="h-5 w-5" />
      </Link>

      {/* Logout Button */}
      <LogoutButton />
    </div>
  );
};

export default UserStatus;
