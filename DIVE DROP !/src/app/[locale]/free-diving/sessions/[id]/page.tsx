export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ReviewForm } from '@/components/free-diving/ReviewForm';
import { AppIcon } from '@/components/AppIcon';

interface Session {
  id: string;
  title: string;
  description: string;
  session_type: string;
  level: string;
  location: string;
  start_date: string;
  start_time: string;
  end_time?: string;
  capacity: number;
  current_participants: number;
  price_shekel: number;
  image_url?: string;
  max_depth_meters?: number;
  instructor_id: string;
  status: string;
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  reviewer_user_id: string;
  created_at: string;
}

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'he';
  const [session, setSession] = useState<Session | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/free-diving-sessions/${params.id}`);
        const data = await response.json();
        setSession(data.session);
        setReviews(data.reviews);
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [params.id]);

  const handleBook = async () => {
    try {
      setBookingLoading(true);
      const response = await fetch(`/api/free-diving-sessions/${params.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'bit' }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to book session');
        return;
      }

      alert(isRTL ? 'הזמנה בוצעה בהצלחה!' : 'Booking successful!');
      router.push(`/${locale}/free-diving/my-sessions`);
    } catch (error) {
      console.error('Error booking session:', error);
      alert(isRTL ? 'שגיאה בהזמנה' : 'Error booking session');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReviewSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/free-diving-sessions/${params.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to submit review');
        return;
      }

      alert(isRTL ? 'הביקורת שלך הוגשה בהצלחה!' : 'Review submitted successfully!');
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(isRTL ? 'שגיאה בהגשת הביקורת' : 'Error submitting review');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <AppIcon name="loader" className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold text-slate-600">
          {isRTL ? 'צלילה לא נמצאה' : 'Session not found'}
        </p>
      </div>
    );
  }

  const availableSpots = session.capacity - session.current_participants;
  const isFull = availableSpots <= 0;

  const labels = {
    en: {
      bookNow: 'Book Now',
      alreadyFull: 'Session Full',
      reviews: 'Reviews',
      noReviews: 'No reviews yet',
      writeReview: 'Write a Review',
      instructor: 'Instructor',
      sessionType: 'Session Type',
      level: 'Difficulty Level',
      location: 'Location',
      date: 'Date & Time',
      capacity: 'Capacity',
      price: 'Price',
      maxDepth: 'Max Depth',
      description: 'About This Session',
      participants: 'Participants',
      avgRating: 'Average Rating',
    },
    he: {
      bookNow: 'הזמן עכשיו',
      alreadyFull: 'הצלילה מלאה',
      reviews: 'ביקורות',
      noReviews: 'אין ביקורות עדיין',
      writeReview: 'כתוב ביקורת',
      instructor: 'מדריך',
      sessionType: 'סוג הצלילה',
      level: 'רמת קושי',
      location: 'מיקום',
      date: 'תאריך ושעה',
      capacity: 'קיבולת',
      price: 'מחיר',
      maxDepth: 'עומק מקסימלי',
      description: 'על הצלילה הזו',
      participants: 'משתתפים',
      avgRating: 'דירוג ממוצע',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];

  const sessionTypeLabels: Record<string, Record<string, string>> = {
    group_apnea_training: { en: 'Group Apnea Training', he: 'הדרכת חנייה בקבוצה' },
    certification_course: { en: 'Certification Course', he: 'קורס הסמכה' },
    competition_prep: { en: 'Competition Prep', he: 'הכנה תחרויות' },
    depth_training: { en: 'Depth Training', he: 'הדרכת עומק' },
    partner_sessions: { en: 'Partner Sessions', he: 'צלילות זוגיות' },
  };

  const levelLabels: Record<string, Record<string, string>> = {
    beginner: { en: 'Beginner', he: 'מתחיל' },
    intermediate: { en: 'Intermediate', he: 'ביניים' },
    advanced: { en: 'Advanced', he: 'מתקדם' },
    expert: { en: 'Expert', he: 'מומחה' },
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b] pb-24">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Image */}
        {session.image_url && (
          <div className="mb-8 h-80 w-full overflow-hidden rounded-2xl shadow-lg">
            <img
              src={session.image_url}
              alt={session.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-6">
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1">
                <span className="text-xs font-bold uppercase text-blue-700">
                  {sessionTypeLabels[session.session_type]?.[locale] || session.session_type}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold leading-tight">{session.title}</h1>
            </div>

            {/* Details Grid */}
            <div className="mb-8 grid grid-cols-2 gap-4 rounded-xl bg-white p-6 shadow-md">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {currentLabels.level}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {levelLabels[session.level]?.[locale] || session.level}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {currentLabels.location}
                </p>
                <p className="mt-1 flex items-center gap-2 text-lg font-bold">
                  <AppIcon name="location" className="h-5 w-5" />
                  {session.location}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {currentLabels.date}
                </p>
                <p className="mt-1 flex items-center gap-2 text-lg font-bold">
                  <AppIcon name="calendar" className="h-5 w-5" />
                  {session.start_date} • {session.start_time}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {currentLabels.participants}
                </p>
                <p className="mt-1 flex items-center gap-2 text-lg font-bold">
                  <AppIcon name="users" className="h-5 w-5" />
                  {session.current_participants}/{session.capacity}
                </p>
              </div>
              {session.max_depth_meters && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {currentLabels.maxDepth}
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {session.max_depth_meters}m
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-2xl font-bold">{currentLabels.description}</h2>
              <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                {session.description}
              </p>
            </div>

            {/* Reviews Section */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{currentLabels.reviews}</h2>
                {session.status === 'completed' && (
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                  >
                    <AppIcon name="pen" className="h-4 w-4" />
                    {currentLabels.writeReview}
                  </button>
                )}
              </div>

              {showReviewForm && (
                <div className="mb-6">
                  <ReviewForm
                    sessionId={session.id}
                    onSubmit={handleReviewSubmit}
                  />
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-slate-600">{currentLabels.noReviews}</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b border-slate-100 pb-4 last:border-b-0">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <AppIcon
                              key={i}
                              name="star"
                              className={`h-4 w-4 ${
                                i < review.rating ? 'text-yellow-500' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(review.created_at).toLocaleDateString(
                            locale === 'he' ? 'he-IL' : 'en-US'
                          )}
                        </span>
                      </div>
                      {review.title && (
                        <h4 className="font-semibold">{review.title}</h4>
                      )}
                      <p className="text-slate-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-6 shadow-lg text-white">
              <p className="text-sm font-semibold opacity-90">
                {currentLabels.price}
              </p>
              <div className="mb-6 text-5xl font-extrabold">
                ₪{session.price_shekel}
              </div>

              {/* Booking Button */}
              <button
                onClick={handleBook}
                disabled={isFull || bookingLoading}
                className="w-full rounded-lg bg-white py-3 font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
              >
                {isFull ? currentLabels.alreadyFull : currentLabels.bookNow}
              </button>
            </div>

            {/* Rating Card */}
            {avgRating && (
              <div className="rounded-xl bg-white p-6 shadow-md">
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                  {currentLabels.avgRating}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <AppIcon
                        key={i}
                        name="star"
                        className={`h-5 w-5 ${
                          i < Math.round(parseFloat(avgRating)) ? 'text-yellow-500' : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-bold">{avgRating}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {reviews.length} {isRTL ? 'ביקורות' : 'reviews'}
                </p>
              </div>
            )}

            {/* Info Card */}
            <div className="rounded-xl bg-white p-6 shadow-md space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-1">
                  {currentLabels.capacity}
                </p>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-500"
                    style={{
                      width: `${(session.current_participants / session.capacity) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {session.current_participants}/{session.capacity} {isRTL ? 'משתתפים' : 'participants'}
                </p>
              </div>

              {availableSpots > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-emerald-600">
                    ✓ {availableSpots} {isRTL ? 'מקומות פנויים' : 'spots available'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
