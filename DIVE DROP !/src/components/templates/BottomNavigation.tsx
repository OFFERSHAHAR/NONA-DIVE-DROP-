'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { AppIcon, type AppIconName } from '@/components/AppIcon';

interface NavItem {
  id: string;
  label: string;
  href: string;
  ariaLabel: string;
}

export interface BottomNavigationProps {
  items: NavItem[];
  activeId?: string;
  className?: string;
}

function NavIcon({ id }: { id: string }) {
  const icons: Record<string, AppIconName> = {
    explore: 'compass',
    'my-dives': 'diver',
    home: 'home',
    dashboard: 'calendar',
    profile: 'user',
  };
  return <AppIcon name={icons[id] || 'compass'} className="h-6 w-6" />;
}

export function BottomNavigation({ items, activeId, className }: BottomNavigationProps) {
  return (
    <>
      <nav aria-label="Main navigation" className={clsx('fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 px-2 shadow-[0_-8px_30px_rgba(15,55,95,.10)] backdrop-blur-xl md:px-8', className)}>
        <ul className="mx-auto flex h-[72px] max-w-5xl items-center justify-around pb-[env(safe-area-inset-bottom)]">
          {items.map(item => {
            const active = activeId === item.id;
            const home = item.id === 'home';
            return (
              <li key={item.id} className="flex flex-1 justify-center">
                <Link href={item.href} aria-label={item.ariaLabel} aria-current={active ? 'page' : undefined} className={clsx('relative flex min-w-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition', home && active ? '-mt-8 h-16 w-16 rounded-full bg-gradient-to-b from-cyan-400 to-blue-700 text-white shadow-[0_8px_20px_rgba(0,105,210,.35)]' : active ? 'text-blue-700' : 'text-[#142b4d] hover:text-blue-600')}>
                  <NavIcon id={item.id} />
                  {!(home && active) && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="h-[72px]" />
    </>
  );
}

export const BottomNavigationPresets = {
  diveDropMain: (_activeId?: string, locale = 'en'): NavItem[] => {
    const he = locale === 'he';
    return [
      { id: 'explore', label: he ? 'גילוי' : 'Explore', href: `/${locale}/explore`, ariaLabel: he ? 'גלה אתרי צלילה' : 'Explore dive sites' },
      { id: 'my-dives', label: he ? 'הצלילות' : 'My dives', href: `/${locale}/my-dives`, ariaLabel: he ? 'הצלילות שלי' : 'My dives' },
      { id: 'home', label: he ? 'בית' : 'Home', href: `/${locale}`, ariaLabel: he ? 'דף הבית' : 'Home' },
      { id: 'dashboard', label: he ? 'הזמנות' : 'Bookings', href: `/${locale}/dashboard`, ariaLabel: he ? 'לוח בקרה והזמנות' : 'Dashboard and bookings' },
      { id: 'profile', label: he ? 'פרופיל' : 'Profile', href: `/${locale}/profile`, ariaLabel: he ? 'הפרופיל שלי' : 'My profile' },
    ];
  },
};
