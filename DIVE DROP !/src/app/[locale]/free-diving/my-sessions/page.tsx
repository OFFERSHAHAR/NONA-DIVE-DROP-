export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { SessionCard } from '@/components/free-diving/SessionCard';
import { AppIcon } from '@/components/AppIcon';

interface Booking {
  id: string;
  session_id: string;
  status: string;
  payment_status: string;
  booked_at: string;
  price_paid_shekel: number;
  session: {
    id: string;
    title: string;
    description: string;
    session_type: string;
    level: string;
    location: string;
    start_date: string;
    start_time: string;
    price_shekel: number;
    image_url?: string;
    capacity: number;
    current_participants: number;
    status: string;
  };
}

export default function MySessionsPage() {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/my-bookings');
        const data = await response.json();
        setBookings(data.bookings || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const labels = {
    en: {
      title: 'My Diving Sessions',
      subtitle: 'Manage your bookings and sessions',
      upcoming: 'Upcoming',
      completed: 'Completed',
      cancelled: 'Cancelled',
      noBookings: 'No bookings yet',
      browseMore: 'Browse More Sessions',
      startIn: 'Starts in',
      loading: 'Loading bookings...',
      details: 'Session Details',
    },
    he: {
      title: 'הצלילות שלי',
      subtitle: 'נהל את ההזמנות והצלילות שלך',
      upcoming: 'קרובות',
      completed: 'הסתיימו',
      cancelled: 'בוטלו',
      noBookings: 'אין הזמנות עדיין',
      browseMore: 'עיין בעוד צלילות',
      startIn: 'מתחילה בעוד',
      loading: 'טוען הזמנות...',
      details: 'פרטי הצלילה',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];

  const now = new Date();
  const upcoming = bookings.filter(b => {
    const sessionDate = new Date(b.session.start_date);
    return sessionDate > now && b.status === 'confirmed';
  });

  const completed = bookings.filter(b => {
    const sessionDate = new Date(b.session.start_date);
    return sessionDate <= now && b.status === 'confirmed';
  });

  const cancelled = bookings.filter(b => b.status === 'cancelled');

  const getActiveBookings = () => {
    switch (activeTab) {
      case 'completed':
        return completed;
      case 'cancelled':
        return cancelled;
      default:
        return upcoming;
    }
  };

  const activeBookings = getActiveBookings();

  const calculateDaysUntil = (dateString: string) => {
    const date = new Date(dateString);
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 py-8 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-white">{currentLabels.title}</h1>
          <p className="mt-2 text-lg text-blue-100">{currentLabels.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-2 border-b border-slate-200">
          {(['upcoming', 'completed', 'cancelled'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {tab === 'upcoming' && currentLabels.upcoming}
              {tab === 'completed' && currentLabels.completed}
              {tab === 'cancelled' && currentLabels.cancelled}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <AppIcon name="loader" className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg font-semibold">{currentLabels.loading}</span>
          </div>
        ) : activeBookings.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-md">
            <AppIcon name="calendar" className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-600 mb-6">
              {currentLabels.noBookings}
            </p>
            <Link
              href={`/${locale}/free-diving/sessions`}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-blue-700 to-cyan-500 px-6 py-3 font-semibold text-white hover:shadow-lg"
            >
              <AppIcon name="search" className="h-5 w-5" />
              {currentLabels.browseMore}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {activeBookings.map(booking => {
              const daysUntil = calculateDaysUntil(booking.session.start_date);
              return (
                <div
                  key={booking.id}
                  className="grid grid-cols-1 gap-6 overflow-hidden rounded-xl bg-white shadow-md lg:grid-cols-4"
                >
                  {/* Image */}
                  <div className="h-48 overflow-hidden lg:h-auto">
                    {booking.session.image_url ? (
                      <img
                        src={booking.session.image_url}
                        alt={booking.session.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-400">
                        <AppIcon name="diver" className="h-16 w-16 text-white/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="col-span-2 space-y-3 p-4 lg:p-6">
                    <div className="space-y-1">
                      <h3 className="text-xl font-extrabold">{booking.session.title}</h3>
                      <p className="text-sm text-slate-600">
                        {booking.session.session_type.replace(/_/g, ' ')}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <AppIcon name="calendar" className="h-4 w-4" />
                        <span>{booking.session.start_date} • {booking.session.start_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AppIcon name="location" className="h-4 w-4" />
                        <span>{booking.session.location}</span>
                      </div>
                    </div>

                    {daysUntil > 0 && activeTab === 'upcoming' && (
                      <div className="flex items-center gap-2 pt-2">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                        <span className="text-sm font-semibold text-blue-600">
                          {currentLabels.startIn} {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-stretch justify-center gap-2 p-4 lg:p-6">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase text-slate-500 mb-1">
                        {isRTL ? 'סטטוס תשלום' : 'Payment Status'}
                      </p>
                      <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-bold ${
                        booking.payment_status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <div className={`h-2 w-2 rounded-full ${
                          booking.payment_status === 'completed'
                            ? 'bg-emerald-700'
                            : 'bg-yellow-700'
                        }`} />
                        {booking.payment_status === 'completed'
                          ? (isRTL ? 'שולם' : 'Paid')
                          : (isRTL ? 'ממתין' : 'Pending')}
                      </div>
                    </div>

                    <Link
                      href={`/${locale}/free-diving/sessions/${booking.session.id}`}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 transition"
                    >
                      <AppIcon name="arrow-right" className="h-4 w-4" />
                      {currentLabels.details}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
