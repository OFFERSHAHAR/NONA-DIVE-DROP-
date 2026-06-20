'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { ReactNode } from 'react';

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
  const paths: Record<string, ReactNode> = {
    explore: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    'my-dives': <><path d="M4 17c3-5 7-8 16-8" /><path d="M7 17h10" /><circle cx="16" cy="7" r="2" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    dashboard: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[id]}</svg>;
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
