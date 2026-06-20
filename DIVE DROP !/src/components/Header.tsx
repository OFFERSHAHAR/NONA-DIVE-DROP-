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
  const navigationItems = [
    { href: `/${locale}`, icon: '🏠', label: isRTL ? 'דף הבית' : 'Home' },
    { href: `/${locale}/explore`, icon: '🔍', label: isRTL ? 'גילוי אתרי צלילה' : 'Explore' },
    { href: `/${locale}/my-dives`, icon: '🤿', label: isRTL ? 'הצלילות שלי' : 'My Dives' },
    { href: `/${locale}/dashboard`, icon: '📊', label: isRTL ? 'לוח בקרה' : 'Dashboard' },
    { href: `/${locale}/profile`, icon: '👤', label: isRTL ? 'פרופיל' : 'Profile' },
    { href: `/${locale}/settings`, icon: '⚙️', label: isRTL ? 'הגדרות' : 'Settings' },
  ];

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
            <div className="flex h-11 w-9 items-center justify-center rounded-[45%_45%_55%_55%] bg-gradient-to-b from-cyan-400 to-blue-800 text-xl text-white shadow-md">🌊</div>

            {/* Brand Text */}
            <div className={`hidden sm:flex flex-col gap-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="text-lg font-extrabold tracking-tight text-primary dark:text-cyan-accent">
                {isRTL ? 'DiveDrop' : 'DiveDrop'}
              </div>
              <div className="text-xs text-text-secondary dark:text-text-secondary-light leading-tight">
                {isRTL ? 'DIVE MORE. CARE MORE.' : 'DIVE MORE. CARE MORE.'}
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

      {/* Navigation drawer */}
      {isMenuOpen && (
        <>
          <button
            type="button"
            aria-label={isRTL ? 'סגירת תפריט' : 'Close menu'}
            className="fixed inset-0 z-40 bg-black/45"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside
            className={clsx(
              'fixed top-0 z-[60] flex h-full w-[min(84vw,320px)] flex-col bg-white p-5 shadow-2xl dark:bg-dark-surface',
              isRTL ? 'right-0' : 'left-0'
            )}
            aria-label={isRTL ? 'ניווט ראשי' : 'Main navigation'}
          >
            <div className="mb-6 flex items-center justify-between border-b border-border-primary pb-4 dark:border-border-dark">
              <div>
                <div className="text-xl font-bold text-primary">DiveDrop</div>
                <div className="text-sm text-text-secondary">
                  {isRTL ? 'ניווט באתר' : 'Site navigation'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg p-2 text-2xl hover:bg-bg-secondary"
                aria-label={isRTL ? 'סגירה' : 'Close'}
              >
                ×
              </button>
            </div>
            <nav className="border-0 bg-transparent">
              <ul className="space-y-2">
                {navigationItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 font-semibold text-text-primary transition-colors hover:bg-primary/10 hover:text-primary dark:text-text-light"
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </>
      )}
    </>
  );
};

export default Header;
