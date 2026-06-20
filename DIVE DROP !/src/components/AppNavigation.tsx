'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import {
  BottomNavigation,
  BottomNavigationPresets,
} from '@/components/templates/BottomNavigation';

export function AppNavigation() {
  const locale = useLocale();
  const pathname = usePathname();
  const segment = pathname.split('/')[2];
  const activeId = segment || 'home';

  return (
    <BottomNavigation
      items={BottomNavigationPresets.diveDropMain(activeId, locale)}
      activeId={activeId}
    />
  );
}
