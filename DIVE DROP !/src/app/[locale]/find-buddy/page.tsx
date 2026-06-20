export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { FindBuddyClient } from './FindBuddyClient';
import { AppIcon } from '@/components/AppIcon';
import { getAuthContext } from '@/lib/security/auth-middleware';

export const metadata = {
  title: 'Find Buddy | DiveDrop',
  description: 'Find and connect with diving buddies',
};

export default async function FindBuddyPage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const supabase = await createClient();
  const authContext = await getAuthContext();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b]">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppIcon name="users" className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">{isRTL ? 'מצא בן צלילה' : 'Find a Buddy'}</h1>
            </div>
            {/* Auth Status Badge */}
            {user && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-success" />
                <span className="text-sm font-semibold text-success">
                  {isRTL ? `מחובר: ${user.email?.split('@')[0]}` : `Connected: ${user.email?.split('@')[0]}`}
                </span>
              </div>
            )}
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
