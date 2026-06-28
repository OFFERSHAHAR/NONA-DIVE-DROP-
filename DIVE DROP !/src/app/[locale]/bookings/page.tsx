import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { createAdminClient } from '@/lib/supabase/admin';

type BookingSearchParams = Promise<Record<string, string | string[] | undefined>>;

const categoryLabels: Record<string, { he: string; en: string; icon: AppIconName }> = {
  clubs: { he: 'מועדון צלילה', en: 'Dive club', icon: 'store' },
  instructors: { he: 'מדריך צלילה', en: 'Dive instructor', icon: 'user' },
  pickups: { he: 'הסעה לצלילה', en: 'Dive pickup', icon: 'van' },
  boat: { he: 'צלילת סירה', en: 'Boat dive', icon: 'boat' },
  dive: { he: 'צלילה מודרכת', en: 'Guided dive', icon: 'diver' },
};

const moduleLabels: Record<string, { he: string; en: string; icon: string }> = {
  'free-diving': { he: 'צלילה חופשית', en: 'Free diving', icon: '/assets/freediving/icons/services/breath-badge.svg' },
  equipment: { he: 'השכרת ציוד', en: 'Equipment rental', icon: '/assets/freediving/icons/services/equipment-rental.svg' },
};

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function withStatus(locale: string, status: string, formData: FormData) {
  const params = new URLSearchParams();
  for (const key of ['category', 'module', 'site', 'item']) {
    const value = formText(formData, key);
    if (value) params.set(key, value);
  }
  params.set('status', status);
  return `/${locale}/bookings?${params.toString()}`;
}

async function createBookingRequest(formData: FormData) {
  'use server';

  const locale = formText(formData, 'locale') || 'he';
  const contactName = formText(formData, 'contact_name');
  const phone = formText(formData, 'phone');
  const email = formText(formData, 'email');
  const preferredDate = formText(formData, 'preferred_date');
  const diverLevel = formText(formData, 'diver_level');
  const category = formText(formData, 'category');
  const bookingModule = formText(formData, 'module');
  const site = formText(formData, 'site');
  const item = formText(formData, 'item');
  const notes = formText(formData, 'notes');

  if (!contactName || !phone) {
    redirect(withStatus(locale, 'missing', formData));
  }

  const supabase = createAdminClient();
  if (!supabase) {
    redirect(withStatus(locale, 'config', formData));
  }

  const { error } = await supabase.from('booking_requests').insert({
    request_type: bookingModule || category || 'dive',
    category,
    module: bookingModule,
    site_slug: site,
    item_slug: item,
    contact_name: contactName,
    phone,
    email,
    preferred_date: preferredDate || null,
    diver_level: diverLevel,
    notes,
    metadata: {
      source: 'public-bookings-page',
      locale,
    },
  });

  if (error) {
    console.error('Booking request insert failed:', error);
    redirect(withStatus(locale, 'error', formData));
  }

  redirect(withStatus(locale, 'sent', formData));
}

export default async function BookingsPage({ searchParams }: { searchParams: BookingSearchParams }) {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const query = await searchParams;
  const category = typeof query.category === 'string' ? query.category : '';
  const module = typeof query.module === 'string' ? query.module : '';
  const site = typeof query.site === 'string' ? query.site : '';
  const item = typeof query.item === 'string' ? query.item : '';
  const status = typeof query.status === 'string' ? query.status : '';
  const categoryMeta = categoryLabels[category] || categoryLabels.dive;
  const moduleMeta = module ? moduleLabels[module] : null;
  const title = moduleMeta ? (isRTL ? moduleMeta.he : moduleMeta.en) : (isRTL ? categoryMeta.he : categoryMeta.en);
  const nextPath = `/${locale}/bookings${site ? `?site=${site}` : module ? `?module=${module}` : category ? `?category=${category}` : ''}`;
  const statusCopy: Record<string, { tone: string; text: string }> = {
    sent: { tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', text: isRTL ? 'הבקשה נקלטה. אפשר לחזור אליכם עם פרטי ההזמנה.' : 'Request received. The team can follow up with booking details.' },
    missing: { tone: 'border-amber-200 bg-amber-50 text-amber-800', text: isRTL ? 'חסר שם או טלפון. מלאו את שני השדות וננסה שוב.' : 'Name or phone is missing. Fill both fields and try again.' },
    config: { tone: 'border-amber-200 bg-amber-50 text-amber-800', text: isRTL ? 'הטופס מוכן, אבל חסר SUPABASE_SERVICE_ROLE_KEY ברנדר לשמירה אמיתית.' : 'The form is ready, but SUPABASE_SERVICE_ROLE_KEY is missing on Render.' },
    error: { tone: 'border-red-200 bg-red-50 text-red-800', text: isRTL ? 'הייתה שגיאה בשמירת הבקשה. בדקו לוגים/סכמת Supabase.' : 'Saving failed. Check Supabase schema or logs.' },
  };

  const bookingOptions = [
    {
      title: isRTL ? 'תיאום פעילות' : 'Schedule activity',
      desc: isRTL ? 'בחר תאריך, שעה ורמת צולל. הבקשה נשמרת כליד במערכת.' : 'Choose date, time and diver level. The request is saved as a lead.',
      icon: 'calendar' as AppIconName,
    },
    {
      title: isRTL ? 'התאמת מדריך/מועדון' : 'Match guide or club',
      desc: isRTL ? 'התאמה לפי אתר, עומק, רמת קושי וסוג פעילות.' : 'Match by site, depth, difficulty and activity type.',
      icon: 'check' as AppIconName,
    },
    {
      title: isRTL ? 'ציוד ותוספות' : 'Gear and add-ons',
      desc: isRTL ? 'הוספת ציוד, הסעה או צלילת סירה לאותו תהליך.' : 'Add gear, pickup or boat dive to the same flow.',
      icon: 'store' as AppIconName,
    },
  ];

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#eef5fb] pb-32 text-[#08234a]">
      <section className="relative overflow-hidden rounded-b-[34px] bg-[#05295a] px-5 pb-10 pt-6 text-white shadow-[0_18px_50px_rgba(8,42,90,.22)]">
        <img src="/divedrop-hero-v2.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#00162f]/30 via-[#052c61]/75 to-[#001d42]" />
        <div className="relative mx-auto max-w-5xl">
          <Link href={`/${locale}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/12 px-4 text-sm font-bold backdrop-blur hover:bg-white/20">
            <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-5 w-5" />
            {isRTL ? 'חזרה לבית' : 'Back home'}
          </Link>
          <div className="mt-10 max-w-2xl">
            <span className="inline-flex rounded-full bg-cyan-400/20 px-4 py-2 text-sm font-extrabold text-cyan-100">{isRTL ? 'מסך הזמנה מחובר' : 'Connected booking screen'}</span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">{isRTL ? 'הזמנה חדשה' : 'New Booking'}</h1>
            <p className="mt-4 text-lg leading-8 text-cyan-50 sm:text-2xl sm:leading-10">
              {isRTL ? `מסלול: ${title}` : `Flow: ${title}`}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)] sm:p-7">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 p-3 text-white shadow-lg">
              {moduleMeta ? <img src={moduleMeta.icon} alt="" className="h-full w-full invert" /> : <AppIcon name={categoryMeta.icon} className="h-9 w-9" />}
            </span>
            <div>
              <h2 className="text-2xl font-black">{title}</h2>
              <p className="mt-1 text-slate-600">
                {site ? (isRTL ? 'נבחר אתר צלילה. מלאו פרטים ונשמור בקשת הזמנה.' : 'A dive site is selected. Fill details and save a booking request.') : (isRTL ? 'בחר פרטים ונשמור בקשה שאפשר לטפל בה.' : 'Choose details and save a request the team can handle.')}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {bookingOptions.map((option) => (
            <article key={option.title} className="rounded-[26px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.08)]">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <AppIcon name={option.icon} className="h-7 w-7" />
              </span>
              <h3 className="text-lg font-black">{option.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{option.desc}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)] sm:p-7">
          <h2 className="text-2xl font-black">{isRTL ? 'פרטי בקשת ההזמנה' : 'Booking request details'}</h2>
          <p className="mt-2 leading-7 text-slate-600">
            {isRTL ? 'הבקשה נשמרת כ־lead אמיתי במערכת, כדי שאפשר יהיה לחזור ללקוח גם לפני התחברות מלאה.' : 'The request is saved as a real lead, so the team can follow up even before full login.'}
          </p>
          {status && statusCopy[status] && (
            <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${statusCopy[status].tone}`}>
              {statusCopy[status].text}
            </div>
          )}
          <form action={createBookingRequest} className="mt-5 grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="module" value={module} />
            <input type="hidden" name="site" value={site} />
            <input type="hidden" name="item" value={item} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                {isRTL ? 'שם מלא' : 'Full name'}
                <input name="contact_name" required className="min-h-12 rounded-2xl border border-blue-100 px-4 font-medium outline-none focus:border-blue-500" placeholder={isRTL ? 'שם הלקוח' : 'Customer name'} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                {isRTL ? 'טלפון' : 'Phone'}
                <input name="phone" required inputMode="tel" className="min-h-12 rounded-2xl border border-blue-100 px-4 font-medium outline-none focus:border-blue-500" placeholder="050-0000000" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                {isRTL ? 'מייל' : 'Email'}
                <input name="email" type="email" className="min-h-12 rounded-2xl border border-blue-100 px-4 font-medium outline-none focus:border-blue-500" placeholder="name@example.com" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                {isRTL ? 'תאריך מועדף' : 'Preferred date'}
                <input name="preferred_date" type="date" className="min-h-12 rounded-2xl border border-blue-100 px-4 font-medium outline-none focus:border-blue-500" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {isRTL ? 'רמת צולל' : 'Diver level'}
              <select name="diver_level" defaultValue="" className="min-h-12 rounded-2xl border border-blue-100 px-4 font-medium outline-none focus:border-blue-500">
                <option value="">{isRTL ? 'בחר רמה' : 'Choose level'}</option>
                <option value="beginner">{isRTL ? 'מתחיל' : 'Beginner'}</option>
                <option value="intermediate">{isRTL ? 'בינוני' : 'Intermediate'}</option>
                <option value="advanced">{isRTL ? 'מתקדם' : 'Advanced'}</option>
                <option value="freediving">{isRTL ? 'צלילה חופשית' : 'Free diving'}</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {isRTL ? 'הערות' : 'Notes'}
              <textarea name="notes" rows={4} className="rounded-2xl border border-blue-100 px-4 py-3 font-medium outline-none focus:border-blue-500" placeholder={isRTL ? 'ציוד, הסעה, שעה מועדפת, מספר משתתפים...' : 'Gear, pickup, preferred time, number of participants...'} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="submit" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-700 to-cyan-500 px-5 font-black text-white shadow-lg">
                <AppIcon name="check" className="h-5 w-5" />
                {isRTL ? 'שליחת בקשה אמיתית' : 'Send real request'}
              </button>
              <Link href={`/${locale}/auth/login?next=${encodeURIComponent(nextPath)}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-blue-700 px-5 font-black text-blue-700 hover:bg-blue-50">
                <AppIcon name="user" className="h-5 w-5" />
                {isRTL ? 'כניסה לחשבון' : 'Login'}
              </Link>
            </div>
          </form>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link href={`/${locale}/explore`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-blue-700 px-5 font-black text-blue-700 hover:bg-blue-50">
              <AppIcon name="compass" className="h-5 w-5" />
              {isRTL ? 'חזרה לגילוי' : 'Back to explore'}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
