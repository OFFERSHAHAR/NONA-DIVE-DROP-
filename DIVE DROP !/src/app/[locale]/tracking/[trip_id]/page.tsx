import React, { Suspense } from 'react';
import { LiveTrackingContainer } from '@/components/tracking';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface TrackingPageProps {
  params: Promise<{
    locale: string;
    trip_id: string;
  }>;
}

async function verifyTripAccess(tripId: string, userId?: string) {
  const supabase = createServerComponentClient({ cookies });

  const { data, error } = await supabase
    .from('dive_trips')
    .select('id, user_id, status')
    .eq('id', tripId)
    .single();

  if (error || !data) {
    return null;
  }

  // Verify user owns this trip or is an admin
  if (userId && data.user_id === userId) {
    return data;
  }

  return null;
}

export async function generateMetadata({
  params,
}: TrackingPageProps) {
  const { locale, trip_id } = await params;

  return {
    title: locale === 'he' ? 'מעקב בזמן אמת' : 'Live Tracking',
    description:
      locale === 'he'
        ? 'עקוב אחרי הרכבת שלך בזמן אמת'
        : 'Track your shuttle in real time',
  };
}

function TrackingPageContent({ tripId }: { tripId: string }) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center space-y-4">
            <div className="animate-spin">
              <svg
                className="w-12 h-12 text-blue-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <p className="text-gray-600">Loading tracking data...</p>
          </div>
        </div>
      }
    >
      <LiveTrackingContainer tripId={tripId} />
    </Suspense>
  );
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { locale, trip_id } = await params;

  // Verify trip exists and user has access
  const trip = await verifyTripAccess(trip_id);

  if (!trip) {
    redirect(`/${locale}/dashboard`);
  }

  return <TrackingPageContent tripId={trip_id} />;
}
