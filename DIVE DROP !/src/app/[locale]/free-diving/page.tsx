export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { FreeDivingClient } from './FreeDivingClient';
import { AppIcon } from '@/components/AppIcon';

export default async function FreeDivingPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b]">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <AppIcon name="wave" className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">{isRTL ? 'צלילה חופשית' : 'Free Diving Partner'}</h1>
              <p className="text-sm text-slate-600 mt-1">
                {isRTL ? 'מצא בן זוג או מדריך' : 'Find a partner or instructor'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-slate-600">
            {isRTL
              ? 'חיפוש בן זוג, מדריך או קבוצה ליום פעיל בצלילה חופשית'
              : 'Search for a partner, instructor, or join a group session'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FreeDivingClient isRTL={isRTL} isAuthenticated={!!user} userId={user?.id} locale={locale} />
      </div>
    </div>
  );
}
