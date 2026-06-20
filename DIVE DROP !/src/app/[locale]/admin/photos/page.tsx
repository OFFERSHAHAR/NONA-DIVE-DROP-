'use client';

import { useTranslations } from 'next-intl';
import { PhotoModeratorDashboard } from '@/components/admin/PhotoModeratorDashboard';

export default function AdminPhotosPage() {
  const t = useTranslations('admin');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PhotoModeratorDashboard initialTab="pending" />
      </div>
    </div>
  );
}
