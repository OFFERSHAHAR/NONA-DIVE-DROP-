import React from 'react';
import clsx from 'clsx';
import Link from 'next/link';

export interface CategoryButtonProps {
  icon: string;
  label: string;
  href: string;
  onClick?: () => void;
  locale?: 'en' | 'he';
}

export const CategoryButton = React.forwardRef<HTMLAnchorElement, CategoryButtonProps>(
  ({ icon, label, href, onClick, locale = 'he' }, ref) => {
    const isRTL = locale === 'he';

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.();
    };

    return (
      <Link
        ref={ref}
        href={href}
        onClick={handleClick}
        className={clsx(
          'group relative flex flex-col items-center justify-center gap-2',
          'p-4 sm:p-5 lg:p-6',
          'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800',
          'rounded-lg shadow-md hover:shadow-lg',
          'transition-all duration-200',
          'hover:scale-[1.05] active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          'dark:focus:ring-offset-slate-900',
          'aspect-square',
          'w-full'
        )}
        role="button"
        tabIndex={0}
      >
        {/* Icon */}
        <span className={clsx('text-4xl sm:text-5xl lg:text-6xl transition-transform duration-200')}>
          {icon}
        </span>

        {/* Label */}
        <span
          className={clsx(
            'text-sm sm:text-base font-semibold text-white text-center',
            'line-clamp-2',
            isRTL ? 'font-hebrew' : ''
          )}
        >
          {label}
        </span>
      </Link>
    );
  }
);

CategoryButton.displayName = 'CategoryButton';

export interface CategoryGridProps {
  categories: Array<{
    icon: string;
    label: string;
    href: string;
  }>;
  onClick?: (href: string) => void;
  locale?: 'en' | 'he';
}

export const CategoryGrid = ({
  categories,
  onClick,
  locale = 'he',
}: CategoryGridProps) => {
  return (
    <div
      className={clsx(
        'grid gap-3 sm:gap-4',
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
        'w-full'
      )}
      role="navigation"
      aria-label="קטגוריות צלילה"
    >
      {categories.map((category) => (
        <CategoryButton
          key={category.href}
          icon={category.icon}
          label={category.label}
          href={category.href}
          onClick={() => onClick?.(category.href)}
          locale={locale}
        />
      ))}
    </div>
  );
};

export default CategoryButton;
