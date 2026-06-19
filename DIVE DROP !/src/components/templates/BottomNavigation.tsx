import React from 'react';
import clsx from 'clsx';
import Link from 'next/link';

/**
 * BottomNavigation - Mobile-first bottom navigation
 *
 * Features:
 * - Safe area bottom padding (pb-safe-bottom)
 * - 44px+ touch targets for mobile accessibility
 * - Active state styling with smooth transitions
 * - 4-5 nav items support (responsive)
 * - Dark mode support
 * - Keyboard navigation support
 * - Accessibility: semantic nav, ARIA labels, active states
 * - Responsive: hidden on desktop via breakpoint
 */

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number | string;
  ariaLabel?: string;
}

export interface BottomNavigationProps {
  items: NavItem[];
  activeId?: string;
  onNavigate?: (itemId: string) => void;
  safeAreaInsets?: {
    bottom: number;
  };
  showLabels?: boolean;
  className?: string;
}

/**
 * BadgeIcon - Display notification badge
 */
const BadgeIcon = ({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge?: number | string;
}) => {
  if (!badge) return <>{children}</>;

  return (
    <div className="relative inline-flex">
      {children}
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs font-bold text-white">
        {typeof badge === 'number' && badge > 99 ? '99+' : badge}
      </span>
    </div>
  );
};

/**
 * BottomNavItem - Individual navigation item
 */
const BottomNavItem = React.forwardRef<
  HTMLAnchorElement,
  {
    item: NavItem;
    isActive: boolean;
    onNavigate?: () => void;
    showLabel: boolean;
  }
>(({ item, isActive, onNavigate, showLabel }, ref) => {
  return (
    <Link
      ref={ref}
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.ariaLabel || item.label}
      className={clsx(
        'flex flex-1 flex-col items-center justify-center gap-1.5 px-2 py-2 transition-all duration-200',
        'min-h-[44px] sm:min-h-[48px]', // Minimum touch target
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark',
        isActive
          ? 'text-primary dark:text-primary'
          : 'text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark'
      )}
    >
      <BadgeIcon badge={item.badge}>
        <svg
          className={clsx(
            'h-6 w-6 transition-all duration-200 sm:h-7 sm:w-7',
            isActive ? 'scale-110' : 'scale-100'
          )}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* This will be replaced by item.icon */}
        </svg>
      </BadgeIcon>

      {showLabel && (
        <span
          className={clsx(
            'text-xs font-semibold transition-colors duration-200 sm:text-sm',
            isActive
              ? 'text-primary dark:text-primary'
              : 'text-text-secondary dark:text-text-secondary-dark'
          )}
        >
          {item.label}
        </span>
      )}

      {/* Active indicator line */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary transition-all duration-200" />
      )}
    </Link>
  );
});

BottomNavItem.displayName = 'BottomNavItem';

/**
 * BottomNavigation component
 */
export const BottomNavigation = React.forwardRef<HTMLElement, BottomNavigationProps>(
  (
    {
      items,
      activeId,
      onNavigate,
      safeAreaInsets = { bottom: 0 },
      showLabels = true,
      className,
    },
    ref
  ) => {
    // Responsive: Show all labels on mobile, hide on larger screens if items > 4
    const responsiveShowLabels = showLabels || items.length <= 4;

    return (
      <>
        {/* Fixed bottom nav container */}
        <nav
          ref={ref}
          role="navigation"
          aria-label="Main navigation"
          className={clsx(
            'fixed bottom-0 left-0 right-0 z-40 border-t border-border-primary bg-card dark:border-border-secondary dark:bg-card-dark',
            'md:hidden', // Hide on tablet/desktop
            className
          )}
          style={{
            paddingBottom: `calc(${safeAreaInsets.bottom}px + env(safe-area-inset-bottom))`,
          }}
        >
          <ul className="flex h-[60px] items-stretch sm:h-[64px]">
            {items.map((item) => (
              <li key={item.id} className="relative flex-1">
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate?.(item.id);
                  }}
                  aria-current={activeId === item.id ? 'page' : undefined}
                  aria-label={item.ariaLabel || item.label}
                  className={clsx(
                    'relative flex flex-1 flex-col items-center justify-center gap-1.5 px-2 transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                    activeId === item.id
                      ? 'text-primary dark:text-primary'
                      : 'text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark'
                  )}
                >
                  {/* Icon */}
                  <BadgeIcon badge={item.badge}>
                    <div
                      className={clsx(
                        'transition-all duration-200',
                        activeId === item.id ? 'scale-110' : 'scale-100'
                      )}
                    >
                      {item.icon}
                    </div>
                  </BadgeIcon>

                  {/* Label - show on mobile, responsive on larger screens */}
                  {responsiveShowLabels && (
                    <span className="text-xs font-semibold transition-colors duration-200 sm:text-sm">
                      {item.label}
                    </span>
                  )}

                  {/* Active indicator bar */}
                  {activeId === item.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary transition-all duration-200" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom spacing placeholder for fixed nav */}
        <div className="h-[60px] sm:h-[64px] md:hidden" />
      </>
    );
  }
);

BottomNavigation.displayName = 'BottomNavigation';

/**
 * Preset navigation configurations
 */
export const BottomNavigationPresets = {
  diveDropMain: (activeId?: string, locale: string = 'en'): NavItem[] => {
    const isRTL = locale === 'he';
    return [
      {
        id: 'explore',
        label: isRTL ? '🔍 גילוי' : '🔍 Explore',
        href: `/${locale}/explore`,
        ariaLabel: isRTL ? 'גלה אתרי צלילה' : 'Explore dive sites',
        icon: (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={2} stroke="currentColor" fill="none" />
          </svg>
        ),
      },
      {
        id: 'messages',
        label: isRTL ? '💬 הודעות' : '💬 Messages',
        href: `/${locale}/messages`,
        ariaLabel: isRTL ? 'הודעות' : 'Messages',
        badge: 0,
        icon: (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        ),
      },
      {
        id: 'home',
        label: isRTL ? '🏠 בית' : '🏠 Home',
        href: `/${locale}`,
        ariaLabel: isRTL ? 'דף הבית' : 'Home',
        icon: (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        ),
      },
      {
        id: 'bookings',
        label: isRTL ? '📅 הזמנות' : '📅 Bookings',
        href: `/${locale}/bookings`,
        ariaLabel: isRTL ? 'ההזמנות שלי' : 'My bookings',
        icon: (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-2.08-2.51c-.29-.35-.77-.35-1.06 0-.29.35-.29.93 0 1.28l2.61 3.13c.29.35.77.35 1.06 0l3.28-4.21c.29-.35.29-.93 0-1.28-.29-.36-.77-.36-1.06-.01z" />
          </svg>
        ),
      },
      {
        id: 'profile',
        label: isRTL ? '👤 פרופיל' : '👤 Profile',
        href: `/${locale}/profile`,
        ariaLabel: isRTL ? 'הפרופיל שלי' : 'My profile',
        icon: (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        ),
      },
    ];
  },
};
