'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/stores/adminStore';
import { useState } from 'react';

export default function AdminNavigation() {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAdminStore();
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    {
      label: t('nav.dashboard'),
      href: '/admin',
      icon: '📊',
    },
    {
      label: 'Photo Moderation',
      href: '/admin/photos',
      icon: '📸',
    },
    {
      label: t('nav.users'),
      href: '/admin/users',
      icon: '👥',
    },
    {
      label: t('nav.dive_sites'),
      href: '/admin/dive-sites',
      icon: '🏄',
    },
    {
      label: t('nav.shuttles'),
      href: '/admin/shuttles',
      icon: '🚐',
    },
    // Equipment Rental Section
    {
      label: 'Equipment Rental',
      href: '/admin/equipment',
      icon: '🎽',
    },
    {
      label: 'Damage Reports',
      href: '/admin/damage-reports',
      icon: '⚠️',
    },
    {
      label: 'Problematic Users',
      href: '/admin/problematic-users',
      icon: '🚫',
    },
    {
      label: 'Commissions',
      href: '/admin/commissions',
      icon: '💰',
    },
    {
      label: 'Missing Equipment',
      href: '/admin/missing-equipment',
      icon: '❌',
    },
    {
      label: 'Disputes',
      href: '/admin/disputes',
      icon: '⚔️',
    },
    {
      label: 'Analytics',
      href: '/admin/equipment-analytics',
      icon: '📈',
    },
    {
      label: t('nav.settings'),
      href: '/admin/settings',
      icon: '⚙️',
    },
  ];

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🚀</div>
          <div>
            <h1 className="text-white font-bold text-lg">DIVE DROP</h1>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Info & Logout */}
      <div className="border-t border-slate-800 p-4">
        <div className="mb-4 p-3 bg-slate-800 rounded-lg">
          <p className="text-xs text-slate-400">Logged in as</p>
          <p className="text-sm font-medium text-white truncate">{user?.email}</p>
          <p className="text-xs text-blue-400">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  );
}
