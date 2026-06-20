export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppIcon } from '@/components/AppIcon';

export default async function MyFreeDivingListingsPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch user's listings
  const { data: listings } = await supabase
    .from('free_diving_listings')
    .select(
      `
      *,
      free_diving_interests(id)
      `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const listingTypeLabels: Record<string, { he: string; en: string }> = {
    instructor: { he: 'מחפש מדריך', en: 'Looking for Instructor' },
    partner: { he: 'מחפש בן זוג', en: 'Looking for Partner' },
    'group-session': { he: 'זימון קבוצה', en: 'Group Session' },
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b]">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <AppIcon name="file" className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">{isRTL ? 'ההודעות שלי' : 'My Listings'}</h1>
          </div>
          <p className="mt-2 text-slate-600">
            {isRTL
              ? 'ניהול ההודעות שלך וצפייה בעניינים'
              : 'Manage your listings and view interests'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <a
            href={`/${locale}/free-diving`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition"
          >
            <AppIcon name="plus" className="h-5 w-5" />
            {isRTL ? 'צור הודעה חדשה' : 'Create New Listing'}
          </a>
        </div>

        {!listings || listings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-md">
            <AppIcon name="file" className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">
              {isRTL ? 'אין לך הודעות' : 'No listings yet'}
            </h3>
            <p className="text-slate-600">
              {isRTL
                ? 'צור הודעה כדי להתחיל להציג עניין'
                : 'Create a listing to start showing interest'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(listings as any[]).map((listing: any) => {
              const interestCount = listing.free_diving_interests?.length || 0;
              return (
                <div
                  key={listing.id}
                  className="rounded-2xl bg-white p-6 shadow-md hover:shadow-lg transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{listing.title}</h3>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {isRTL
                            ? listingTypeLabels[listing.listing_type]?.he
                            : listingTypeLabels[listing.listing_type]?.en}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <AppIcon name="map-pin" className="h-4 w-4" />
                        {listing.location}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(listing.start_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')} -{' '}
                        {new Date(listing.end_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      {interestCount > 0 && (
                        <div className="bg-green-50 px-3 py-2 rounded-lg">
                          <p className="text-sm font-semibold text-green-700">
                            {interestCount} {isRTL ? 'מעוניינים' : 'interested'}
                          </p>
                        </div>
                      )}
                      <a
                        href={`/${locale}/free-diving`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {isRTL ? 'ערוך' : 'Edit'}
                      </a>
                    </div>
                  </div>
                  {listing.description && (
                    <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                      {listing.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
