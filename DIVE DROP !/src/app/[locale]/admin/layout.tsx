'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdminStore } from '@/lib/stores/adminStore';
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

    // Check authentication
    if (!isAuthenticated && !user) {
      router.push('/admin/login');
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
