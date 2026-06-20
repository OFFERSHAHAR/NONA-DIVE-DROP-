'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { StatusTracker } from '@/components/bookings/StatusTracker';
import { ReviewForm } from '@/components/bookings/ReviewForm';
import { formatBookingDate, getStatusLabel, formatDepth, formatTemperature } from '@/lib/bookings/utils';

interface BookingDetailsPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function BookingDetailsPage({ params }: BookingDetailsPageProps) {
  const t = useTranslations('bookings');
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [unwrappedParams, setUnwrappedParams] = useState<{ id: string; locale: string } | null>(
    null
  );

  useEffect(() => {
    params.then((p) => setUnwrappedParams(p));
  }, [params]);

  useEffect(() => {
    if (!unwrappedParams?.id) return;

    const fetchBooking = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/bookings/${unwrappedParams.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            router.push('/bookings/my-bookings');
            return;
          }
          throw new Error(t('failedToFetchBooking'));
        }

        const data = await response.json();
        setBooking(data.data);
        await fetchMessages();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error'));
        console.error('Error fetching booking:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [unwrappedParams?.id]);

  const fetchMessages = async () => {
    if (!unwrappedParams?.id) return;

    try {
      const response = await fetch(`/api/bookings/${unwrappedParams.id}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !unwrappedParams?.id) return;

    try {
      setIsSendingMessage(true);
      const response = await fetch(`/api/bookings/${unwrappedParams.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) throw new Error(t('failedToSendMessage'));

      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSubmitReview = async (reviewData: any) => {
    if (!unwrappedParams?.id) return;

    try {
      const response = await fetch(`/api/bookings/${unwrappedParams.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) throw new Error(t('failedToSubmitReview'));

      setShowReviewForm(false);
      // Refresh booking data
      const bookingResponse = await fetch(`/api/bookings/${unwrappedParams.id}`);
      const bookingData = await bookingResponse.json();
      setBooking(bookingData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold mb-4">{t('bookingNotFound')}</p>
          <button
            onClick={() => router.push('/bookings/my-bookings')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg"
          >
            {t('backToBookings')}
          </button>
        </div>
      </div>
    );
  }

  const isRtl = unwrappedParams?.locale === 'he';
  const locale = (unwrappedParams?.locale || 'en') as 'en' | 'he';

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-4 text-blue-500 hover:underline font-medium"
            >
              ← {t('back')}
            </button>
            <h1 className="text-3xl font-bold text-text-primary dark:text-text-light">
              {t('bookingDetails')}
            </h1>
            <p className="text-text-secondary dark:text-text-secondary-light mt-1">
              {booking.dive_sites?.name || t('customLocation')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-secondary dark:text-text-secondary-light">
              {t('bookingId')}: {booking.id.slice(0, 8)}...
            </p>
            <p className={`text-lg font-bold mt-2 ${getStatusLabel(booking.status)}`}>
              {getStatusLabel(booking.status, locale)}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Details Card */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-text-primary dark:text-text-light mb-4">
                {t('diveDetails')}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-light">
                    {t('diveDate')}
                  </p>
                  <p className="font-semibold text-text-primary dark:text-text-light">
                    {formatBookingDate(booking.dive_date, locale)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-light">
                    {t('duration')}
                  </p>
                  <p className="font-semibold text-text-primary dark:text-text-light">
                    {booking.estimated_duration} {t('minutes')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-light">
                    {t('maxDepth')}
                  </p>
                  <p className="font-semibold text-text-primary dark:text-text-light">
                    {formatDepth(booking.max_depth, locale)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-light">
                    {t('waterTemp')}
                  </p>
                  <p className="font-semibold text-text-primary dark:text-text-light">
                    {formatTemperature(booking.water_temp, locale)}
                  </p>
                </div>
              </div>

              {booking.special_requirements && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm font-medium text-text-primary dark:text-text-light">
                    {t('specialRequirements')}
                  </p>
                  <p className="text-text-secondary dark:text-text-secondary-light mt-1">
                    {booking.special_requirements}
                  </p>
                </div>
              )}
            </div>

            {/* Participants Card */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-text-primary dark:text-text-light mb-4">
                {t('participants')}
              </h2>

              <div className="space-y-3">
                {/* Primary Diver */}
                <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg ${isRtl && 'flex-row-reverse'}`}>
                  {booking.users?.avatar_url && (
                    <img
                      src={booking.users.avatar_url}
                      alt={booking.users.first_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-text-primary dark:text-text-light">
                      {booking.users?.first_name} {booking.users?.last_name}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-text-secondary-light">
                      {t('diver')}
                    </p>
                  </div>
                </div>

                {/* Buddy */}
                <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg ${isRtl && 'flex-row-reverse'}`}>
                  {booking.buddy?.avatar_url && (
                    <img
                      src={booking.buddy.avatar_url}
                      alt={booking.buddy.first_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-text-primary dark:text-text-light">
                      {booking.buddy?.first_name} {booking.buddy?.last_name}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-text-secondary-light">
                      {t('buddy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Section */}
            {booking.status === 'pending_confirmation' || booking.status === 'confirmed' && (
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-text-primary dark:text-text-light mb-4">
                  {t('messages')}
                </h2>

                {/* Messages List */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-text-secondary dark:text-text-secondary-light text-center py-4">
                      {t('noMessages')}
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.is_provider_message
                            ? 'bg-blue-50 dark:bg-blue-900'
                            : 'bg-gray-50 dark:bg-gray-900'
                        }`}
                      >
                        <p className="text-xs text-text-secondary dark:text-text-secondary-light mb-1">
                          {msg.sender?.first_name} {msg.sender?.last_name}
                        </p>
                        <p className="text-text-primary dark:text-text-light">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('typeMessage')}
                    disabled={isSendingMessage}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input text-text-primary dark:text-text-light disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                  >
                    {t('send')}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Tracker */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
              <StatusTracker currentStatus={booking.status} locale={locale} />
            </div>

            {/* Actions */}
            {booking.status === 'completed' && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600"
              >
                {t('leaveReview')}
              </button>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
                <ReviewForm
                  bookingId={booking.id}
                  reviewedUserName={
                    booking.user_id === booking.users?.id
                      ? `${booking.buddy?.first_name} ${booking.buddy?.last_name}`
                      : `${booking.users?.first_name} ${booking.users?.last_name}`
                  }
                  onSubmit={handleSubmitReview}
                  onCancel={() => setShowReviewForm(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
