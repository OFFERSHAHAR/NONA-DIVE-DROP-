export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { FindBuddyClient } from './FindBuddyClient';
import { AppIcon } from '@/components/AppIcon';

export default async function FindBuddyPage() {
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
            <AppIcon name="users" className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">{isRTL ? 'מצא בן צלילה' : 'Find a Buddy'}</h1>
          </div>
          <p className="mt-2 text-slate-600">
            {isRTL
              ? 'חיפוש בן צלילה או יצירת הודעה לחברים חדשים'
              : 'Search for a dive buddy or create a listing to find new friends'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FindBuddyClient isRTL={isRTL} isAuthenticated={!!user} userId={user?.id} locale={locale} />
      </div>
    </div>
  );
}
