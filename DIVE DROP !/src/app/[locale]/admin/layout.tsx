'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores';
import AdminNavigation from './components/AdminNavigation';

function Loader() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  );
}

export { Loader };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('admin');
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAdminStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Verify admin session with API
    const verifyAuth = async () => {
      try {
        const response = await fetch('/api/admin/verify');
        const result = await response.json();

        if (!result.success) {
          // Token is invalid or expired, redirect to login
          const { logout } = useAdminStore.getState();
          logout();
          router.push('/admin/login');
        }
      } catch (error) {
        // If verification fails, redirect to login
        const { logout } = useAdminStore.getState();
        logout();
        router.push('/admin/login');
      }
    };

    // Check authentication
    if (!isAuthenticated && !user) {
      router.push('/admin/login');
    } else if (isAuthenticated && user) {
      // Verify token is still valid
      verifyAuth();
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminNavigation />
      <main className="ml-64 p-8">
        {isLoading && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Loader />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
