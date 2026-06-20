'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { AppIcon, type AppIconName } from '@/components/AppIcon';

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
  const pathname = usePathname();
  const isRTL = locale === 'he';
  const isHome = pathname === `/${locale}`;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigationItems = [
    { href: `/${locale}`, icon: 'home' as AppIconName, label: isRTL ? 'דף הבית' : 'Home' },
    { href: `/${locale}/explore`, icon: 'search' as AppIconName, label: isRTL ? 'גילוי אתרי צלילה' : 'Explore' },
    { href: `/${locale}/my-dives`, icon: 'diver' as AppIconName, label: isRTL ? 'הצלילות שלי' : 'My Dives' },
    { href: `/${locale}/dashboard`, icon: 'chart' as AppIconName, label: isRTL ? 'לוח בקרה' : 'Dashboard' },
    { href: `/${locale}/profile`, icon: 'user' as AppIconName, label: isRTL ? 'פרופיל' : 'Profile' },
    { href: `/${locale}/settings`, icon: 'settings' as AppIconName, label: isRTL ? 'הגדרות' : 'Settings' },
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
          'fixed top-0 left-0 right-0 z-50 transition-colors',
          isHome
            ? 'border-0 bg-transparent text-white shadow-none lg:right-auto lg:w-[calc(100%_-_499px)]'
            : 'border-b border-border-primary bg-white/95 shadow-sm backdrop-blur-sm dark:border-border-dark dark:bg-dark-surface/95',
          className
        )}
      >
        <div
          dir={isHome ? 'ltr' : undefined}
          className={clsx('relative flex h-16 items-center px-4 sm:px-6', isHome ? 'justify-between lg:justify-start lg:gap-6 lg:px-8 lg:pt-3' : 'justify-between')}
        >
          {/* Left: Hamburger Menu */}
          <button
            onClick={handleMenuClick}
            aria-label={isRTL ? 'תפריט' : 'Menu'}
            className={clsx('rounded-lg p-2 transition-colors', isHome ? 'text-white hover:bg-white/15' : 'hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated')}
          >
            <AppIcon name="menu" className={clsx('h-7 w-7', isHome ? 'text-white' : 'text-text-primary dark:text-text-light')} />
          </button>

          {/* Center/Right: Logo & Branding */}
          <Link
            href={`/${locale}`}
            className={clsx('items-center justify-center group', isHome ? 'absolute left-1/2 flex -translate-x-1/2 lg:hidden' : 'flex flex-1')}
          >
            <img src={isHome ? '/assets/logo/divedrop-logo-white.svg' : '/assets/logo/divedrop-logo-full.svg'} alt="DiveDrop" className={isHome ? 'h-11 w-auto' : 'h-12 w-auto'} />
          </Link>

          {/* Right: Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              aria-label={isRTL ? 'התראות' : 'Notifications'}
              aria-expanded={isNotificationsOpen}
              className={clsx('relative rounded-lg p-2 transition-colors', isHome ? 'text-white hover:bg-white/15' : 'hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated')}
            >
              <AppIcon name="bell" className={clsx('h-7 w-7', isHome ? 'text-white' : 'text-text-primary dark:text-text-light')} />
              {showNotificationBadge && notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-[24px] h-6 items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div dir={isRTL ? 'rtl' : 'ltr'} className="absolute right-0 top-12 z-[70] w-[min(88vw,320px)] overflow-hidden rounded-2xl border border-blue-100 bg-white text-[#10264b] shadow-2xl">
                <div className="border-b border-blue-100 px-4 py-3 font-bold">{isRTL ? 'התראות' : 'Notifications'}</div>
                <Link href={`/${locale}/my-dives`} onClick={() => setIsNotificationsOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-blue-50"><AppIcon name="calendar" className="mt-0.5 h-5 w-5 text-blue-600" /><span>{isRTL ? 'בדוק את הצלילות וההזמנות הקרובות' : 'Review your upcoming dives'}</span></Link>
                <Link href={`/${locale}/explore`} onClick={() => setIsNotificationsOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-blue-50"><AppIcon name="star" className="mt-0.5 h-5 w-5 text-blue-600" /><span>{isRTL ? 'נוספו אתרי צלילה מומלצים' : 'New recommended dive sites'}</span></Link>
                <Link href={`/${locale}/profile`} onClick={() => setIsNotificationsOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-blue-50"><AppIcon name="user" className="mt-0.5 h-5 w-5 text-blue-600" /><span>{isRTL ? 'השלם את פרטי פרופיל הצלילה' : 'Complete your diving profile'}</span></Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Header Spacing Placeholder */}
      <div className={isHome ? 'h-0' : 'h-16'} />

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
                <img src="/assets/logo/divedrop-logo-full.svg" alt="DiveDrop" className="h-12 w-auto" />
                <div className="text-sm text-text-secondary">
                  {isRTL ? 'ניווט באתר' : 'Site navigation'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-bg-secondary"
                aria-label={isRTL ? 'סגירה' : 'Close'}
              >
                <AppIcon name="x" className="h-6 w-6" />
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
                      <AppIcon name={item.icon} className="h-5 w-5" />
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
