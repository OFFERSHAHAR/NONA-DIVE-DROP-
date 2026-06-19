'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import clsx from 'clsx';

export interface HeaderProps {
  showNotificationBadge?: boolean;
  notificationCount?: number;
  onMenuClick?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  showNotificationBadge = true,
  notificationCount = 3,
  onMenuClick,
  className,
}) => {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
    onMenuClick?.();
  };

  return (
    <>
      {/* Fixed Header */}
      <header
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border-primary dark:bg-dark-surface/95 dark:border-border-dark shadow-sm',
          className
        )}
      >
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
          {/* Left: Hamburger Menu */}
          <button
            onClick={handleMenuClick}
            aria-label={isRTL ? 'תפריט' : 'Menu'}
            className="p-2 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-text-primary dark:text-text-light"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Center/Right: Logo & Branding */}
          <Link
            href={`/${locale}`}
            className="flex-1 flex items-center justify-center gap-2 sm:gap-3 group"
          >
            {/* Logo Icon */}
            <div className="text-2xl sm:text-3xl">📍</div>

            {/* Brand Text */}
            <div className={`hidden sm:flex flex-col gap-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="font-bold text-sm sm:text-base text-primary dark:text-cyan-accent">
                {isRTL ? 'DiveDrop' : 'DiveDrop'}
              </div>
              <div className="text-xs text-text-secondary dark:text-text-secondary-light leading-tight">
                {isRTL ? 'צלול יותר. דאג יותר.' : 'Dive More. Care More.'}
              </div>
            </div>
          </Link>

          {/* Right: Notification Bell */}
          <button
            aria-label={isRTL ? 'התראות' : 'Notifications'}
            className="relative p-2 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-text-primary dark:text-text-light"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>

            {/* Notification Badge */}
            {showNotificationBadge && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[24px] h-6 px-1 bg-error text-white text-xs font-bold rounded-full">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Header Spacing Placeholder */}
      <div className="h-16" />

      {/* Mobile Menu Overlay (optional) */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
