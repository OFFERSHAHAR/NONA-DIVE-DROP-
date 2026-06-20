import dynamic from 'next/dynamic';

/**
 * Performance Optimization: Dynamic Imports
 * These components are loaded on-demand to reduce initial bundle size
 * Proper loading states and error boundaries are included
 */

// Heavy charting and analytics components
export const AnalyticsCharts = dynamic(
  () => import('@/components/admin/equipment-analytics/AnalyticsCharts'),
  { ssr: false, loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-lg" /> }
);

// Photo components
export const PhotoUploadForm = dynamic(
  () => import('@/components/photos/PhotoUploadForm'),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 animate-pulse rounded-lg" /> }
);

export const PhotoUploadContainer = dynamic(
  () => import('@/components/photos/PhotoUploadContainer'),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 animate-pulse rounded-lg" /> }
);

// Booking components
export const BookingWizard = dynamic(
  () => import('@/components/bookings/BookingWizard'),
  { ssr: false, loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-lg" /> }
);

// Training components
export const TrainingBrowser = dynamic(
  () => import('@/components/training/TrainingBrowser'),
  { ssr: false, loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-lg" /> }
);

// Equipment analytics
export const AnalyticsTables = dynamic(
  () => import('@/components/admin/equipment-analytics/AnalyticsTables'),
  { ssr: false, loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-lg" /> }
);
