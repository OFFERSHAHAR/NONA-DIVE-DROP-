'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { BookingCard } from '@/components/bookings/BookingCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  status: string;
  dive_date: string;
  max_depth: number;
  water_temp: number;
  estimated_duration: number;
  buddy?: any;
  dive_sites?: any;
}

export default function MyBookingsPage() {
  const t = useTranslations('bookings');
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, loading]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/bookings?${params.toString()}`);

      if (!response.ok) throw new Error(t('failedToFetchBookings'));

      const data = await response.json();
      setBookings(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const locale = 'en'; // TODO: get from useRouter

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-text-secondary dark:text-text-secondary-light">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text-primary dark:text-text-light mb-2">
              {t('myBookings')}
            </h1>
            <p className="text-text-secondary dark:text-text-secondary-light">
              {bookings.length} {t('totalBookings')}
            </p>
          </div>
          <Link
            href="/bookings/new"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {t('newBooking')}
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Status Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {['all', 'draft', 'pending_confirmation', 'confirmed', 'completed', 'cancelled'].map(
            (status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  fetchBookings();
                }}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-text-light hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {t(status)}
              </button>
            )
          )}
        </div>

        {/* Bookings Grid */}
        {bookings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-card rounded-lg">
            <p className="text-2xl font-semibold text-text-primary dark:text-text-light mb-2">
              {t('noBookings')}
            </p>
            <p className="text-text-secondary dark:text-text-secondary-light mb-6">
              {t('startBookingDescription')}
            </p>
            <Link
              href="/bookings/new"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              {t('createFirstBooking')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                id={booking.id}
                status={booking.status as any}
                dive_date={booking.dive_date}
                max_depth={booking.max_depth}
                water_temp={booking.water_temp}
                estimated_duration={booking.estimated_duration}
                buddy={booking.buddy}
                dive_site={booking.dive_sites}
                locale={locale as 'en' | 'he'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
