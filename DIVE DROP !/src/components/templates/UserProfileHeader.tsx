import React, { useState } from 'react';
import clsx from 'clsx';
import { AppIcon } from '@/components/AppIcon';

/**
 * UserProfileHeader - Safe area aware header with user info
 *
 * Features:
 * - Respects notch/Dynamic Island/safe area insets
 * - Responsive text sizing (text-sm mobile → text-base desktop)
 * - Dark mode support
 * - Avatar with fallback initials
 * - Dropdown menu with keyboard navigation
 * - Accessibility: ARIA labels, keyboard support, semantic HTML
 * - Mobile-first design with safe area padding
 */

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  diveCount?: number;
  certificationLevel?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface UserProfileHeaderProps {
  user: UserProfileData;
  menuItems?: MenuItem[];
  onAvatarClick?: () => void;
  safeAreaInsets?: {
    top: number;
    left: number;
    right: number;
  };
  variant?: 'default' | 'compact' | 'expanded';
  className?: string;
}

/**
 * Avatar component with fallback initials
 */
const Avatar = ({
  src,
  name,
  size = 'md',
  onClick,
}: {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      aria-label={`${name} avatar`}
      className={clsx(
        'flex items-center justify-center rounded-full font-semibold transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-dark',
        sizeClasses[size],
        src ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary text-white'
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="text-white">{initials}</span>
      )}
    </button>
  );
};

/**
 * Dropdown menu component
 */
const DropdownMenu = ({
  items,
  isOpen,
  onClose,
  userName,
}: {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}) => {
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);

  React.useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          items[highlightedIndex].onClick();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40"
      />
      {/* Menu */}
      <nav
        role="menu"
        aria-label={`${userName} menu`}
        onKeyDown={handleKeyDown}
        className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border-primary bg-card shadow-lg dark:border-border-secondary dark:bg-card-dark"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            role="menuitem"
            onClick={() => {
              item.onClick();
              onClose();
            }}
            onMouseEnter={() => setHighlightedIndex(index)}
            className={clsx(
              'w-full px-4 py-3 text-left text-sm font-medium transition-colors first:rounded-t-lg last:rounded-b-lg',
              highlightedIndex === index
                ? 'bg-primary text-white'
                : item.variant === 'danger'
                  ? 'text-error hover:bg-error hover:bg-opacity-10 dark:hover:bg-opacity-20'
                  : 'text-text-primary hover:bg-bg-secondary dark:text-text-primary-dark dark:hover:bg-bg-secondary-dark',
              'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary'
            )}
          >
            <div className="flex items-center gap-2">
              {item.icon && <span className="h-4 w-4">{item.icon}</span>}
              {item.label}
            </div>
          </button>
        ))}
      </nav>
    </>
  );
};

/**
 * UserProfileHeader component
 */
export const UserProfileHeader = React.forwardRef<HTMLDivElement, UserProfileHeaderProps>(
  (
    {
      user,
      menuItems = [],
      onAvatarClick,
      safeAreaInsets = { top: 0, left: 0, right: 0 },
      variant = 'default',
      className,
    },
    ref
  ) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const variantClasses = {
      default: 'gap-3',
      compact: 'gap-2',
      expanded: 'gap-4',
    };

    const contentVariants = {
      default: 'block',
      compact: 'hidden sm:block',
      expanded: 'block',
    };

    return (
      <header
        ref={ref}
        style={{
          paddingTop: `calc(1rem + ${safeAreaInsets.top}px)`,
          paddingLeft: `calc(1rem + ${safeAreaInsets.left}px)`,
          paddingRight: `calc(1rem + ${safeAreaInsets.right}px)`,
        }}
        className={clsx(
          'border-b border-border-primary bg-card dark:border-border-secondary dark:bg-card-dark',
          className
        )}
      >
        <div className={clsx('flex items-center justify-between gap-3 pb-4')}>
          {/* Left section: Avatar and user info */}
          <div className={clsx('flex items-center', variantClasses[variant])}>
            <Avatar
              src={user.avatar}
              name={user.name}
              size={variant === 'compact' ? 'sm' : 'md'}
              onClick={onAvatarClick}
            />

            {/* User info */}
            <div className={contentVariants[variant]}>
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-text-primary dark:text-text-primary-dark sm:text-base md:text-lg">
                  {user.name}
                </h1>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark sm:text-sm">
                  {user.role || 'Diver'}
                </p>
              </div>

              {/* Stats row */}
              {user.diveCount !== undefined && (
                <div className="mt-1 flex gap-4">
                  <div>
                    <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                      Dives
                    </span>
                    <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                      {user.diveCount}
                    </p>
                  </div>
                  {user.certificationLevel && (
                    <div>
                      <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                        Level
                      </span>
                      <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                        {user.certificationLevel}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right section: Menu button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={`${user.name} options menu`}
              aria-expanded={isMenuOpen}
              className="rounded-lg p-2 text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary dark:text-text-primary-dark dark:hover:bg-bg-secondary-dark"
            >
              <AppIcon name="settings" className="h-6 w-6" />
            </button>

            <DropdownMenu
              items={menuItems}
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              userName={user.name}
            />
          </div>
        </div>
      </header>
    );
  }
);

UserProfileHeader.displayName = 'UserProfileHeader';
