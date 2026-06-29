export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { getPublishedDiveSites } from '@/lib/content/public-content';
import { graphics } from '@/lib/showcase/graphics';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

const referenceSites: DiveSite[] = [
  { id: 'reference-site-0', name: 'הגנים היפנים', description: 'שונית צבעונית ונגישה לצלילה רגועה.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 18, difficulty: 'easy', image_url: graphics.heroMain, created_at: '', updated_at: '' },
  { id: 'reference-site-1', name: 'הר הסלע', description: 'אתר עומק מרשים לצוללים מנוסים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 30, difficulty: 'intermediate', image_url: graphics.heroPremium, created_at: '', updated_at: '' },
  { id: 'reference-site-2', name: 'הסטי"ל', description: 'צלילת כלי שיט טבוע עם מסלול עשיר בפרטים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 28, difficulty: 'intermediate', image_url: graphics.heroInstructor, created_at: '', updated_at: '' },
  { id: 'reference-site-3', name: 'שונית הדולפינים', description: 'אתר אהוב עם מים צלולים וחיים ימיים מגוונים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 20, difficulty: 'easy', image_url: graphics.heroMain, created_at: '', updated_at: '' },
];

async function getFeaturedDiveSites(): Promise<DiveSite[]> {
  return (await getPublishedDiveSites(referenceSites)).slice(0, 4);
}

export default async function HomePage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const sites = await getFeaturedDiveSites();
  const displaySites = Array.from({ length: 4 }, (_, index) => ({
    id: sites[index]?.id ?? referenceSites[index].id,
    name: sites[index]?.name ?? referenceSites[index].name,
    depth: sites[index]?.depth ?? [18, 30, 28, 20][index],
    image: sites[index]?.image_url || referenceSites[index].image_url || graphics.heroMain,
  }));
  const recommendedBadges = [
    { icon: 'check' as AppIconName, label: isRTL ? 'מתאים לך' : 'Good match', color: 'bg-emerald-500' },
    { icon: 'fire' as AppIconName, label: isRTL ? 'פופולרי היום' : 'Popular today', color: 'bg-orange-500' },
    { icon: 'user' as AppIconName, label: isRTL ? 'עם מדריך' : 'With a guide', color: 'bg-violet-500' },
    { icon: 'check' as AppIconName, label: isRTL ? 'מתאים לך' : 'Good match', color: 'bg-emerald-500' },
  ];

  const categories = [
    { icon: 'coral' as AppIconName, label: isRTL ? 'אתרי צלילה' : 'Dive Sites', href: `/${locale}/explore` },
    { icon: 'store' as AppIconName, label: isRTL ? 'מועדוני צלילה' : 'Dive Clubs', href: `/${locale}/explore?category=clubs` },
    { icon: 'diver' as AppIconName, label: isRTL ? 'מדריכים' : 'Instructors', href: `/${locale}/explore?category=instructors` },
    { icon: 'van' as AppIconName, label: isRTL ? 'הסעות' : 'Pickups', href: `/${locale}/explore?category=pickups` },
    { icon: 'boat' as AppIconName, label: isRTL ? 'צלילות סירה' : 'Boat Dives', href: `/${locale}/explore?category=boat` },
    { icon: 'users' as AppIconName, label: isRTL ? 'צלילות' : 'Dives', href: `/${locale}/bookings?category=dive`, mobileOnly: true },
  ];

  const mvpModules = [
    {
      title: isRTL ? 'צלילה חופשית' : 'Free Diving',
      text: isRTL ? 'אימונים, דיסציפלינות ופעילויות קהילה עם גרפיקה ייעודית.' : 'Training, disciplines and community activities with a dedicated visual kit.',
      href: `/${locale}/free-diving`,
      badge: isRTL ? 'חדש במערכת' : 'New module',
      visual: graphics.scubaDiver,
      tone: 'from-cyan-500 to-blue-700',
    },
    {
      title: isRTL ? 'השכרת ציוד' : 'Equipment Rental',
      text: isRTL ? 'מסכות, סנפירים, חליפות וחבילות לקבוצות מתוך תהליך ההזמנה.' : 'Masks, fins, suits and group bundles connected to the booking flow.',
      href: `/${locale}/equipment`,
      badge: isRTL ? 'MVP פעיל' : 'MVP ready',
      visual: graphics.submarine,
      tone: 'from-blue-700 to-sky-400',
    },
  ];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b]">
      <div dir="ltr" className="mx-auto grid max-w-[1536px] gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_475px] lg:gap-6 lg:p-0">
        <div dir={isRTL ? 'rtl' : 'ltr'} className="min-w-0 space-y-5">
          <section className="relative h-[690px] overflow-hidden rounded-b-[32px] shadow-[0_18px_45px_rgba(14,61,112,.16)] lg:h-[562px] lg:rounded-[0_0_28px_0]">
            <picture>
              <source media="(max-width: 767px)" srcSet={graphics.heroMainMobile} />
              <img src={graphics.heroMain} alt="סירת צלילה וצולל מתחת למים" className="absolute inset-0 h-full w-full object-cover object-[38%_center] lg:object-center" />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-[#001e46]/80 via-transparent to-transparent lg:bg-gradient-to-l lg:from-[#001c45]/65 lg:via-transparent lg:to-transparent" />

            <div className="absolute inset-x-7 bottom-[330px] text-right text-white lg:inset-x-auto lg:bottom-auto lg:right-14 lg:top-1/2 lg:w-[40%] lg:-translate-y-1/2">
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                {isRTL ? (
                  <>
                    ברוך הבא
                    <br />
                    <span className="text-cyan-300">ל־DiveDrop</span>
                  </>
                ) : (
                  <>
                    Welcome to
                    <br />
                    <span className="text-cyan-300">DiveDrop</span>
                  </>
                )}
              </h1>
              <p className="mt-4 w-full max-w-[420px] !text-lg !leading-8 !text-white lg:mt-5 lg:!text-2xl lg:!leading-10">
                {isRTL ? 'הדרך החכמה שלך לצלילה בטוחה, אחראית ומקצועית.' : 'Your smart way to safe, responsible and professional diving.'}
              </p>
            </div>

            <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2 rounded-[24px] bg-white/95 p-3 shadow-2xl backdrop-blur-md lg:left-11 lg:right-7 lg:grid-cols-5 lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
              {categories.map((category) => (
                <Link key={category.href} href={category.href} className={`group flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white/85 p-2 text-center text-[#0b3970] transition hover:-translate-y-1 hover:bg-blue-50 lg:min-h-[96px] lg:border-white/10 lg:bg-[#00345f]/75 lg:p-3 lg:text-white lg:shadow-lg lg:backdrop-blur-md lg:hover:bg-[#075b91]/90 ${category.mobileOnly ? 'lg:hidden' : ''}`}>
                  <AppIcon name={category.icon} className="h-9 w-9 transition group-hover:scale-110" />
                  <span className="text-xs font-bold sm:text-sm lg:text-base">{category.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_35px_rgba(15,63,110,.08)] sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-3 text-2xl font-extrabold leading-8"><AppIcon name="star" className="h-7 w-7 text-blue-600" />{isRTL ? 'מומלץ עבורך' : 'Recommended for you'}</h2>
              <Link href={`/${locale}/explore`} className="font-bold text-blue-600 hover:underline">{isRTL ? 'הצג הכל ‹' : 'View all ›'}</Link>
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto pb-2 lg:overflow-hidden">
              {displaySites.map((site, index) => (
                <article key={site.id} className="w-[230px] flex-none snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_rgba(17,63,105,.12)] sm:w-[260px] lg:w-auto lg:min-w-0 lg:flex-1">
                  <div className="relative h-40 overflow-hidden">
                    <img src={site.image} alt={site.name} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                    <Link href={`/${locale}/explore/${site.id}`} aria-label={`${isRTL ? 'פרטים על' : 'Details for'} ${site.name}`} className="absolute inset-0 z-[1]" />
                    <span className={`pointer-events-none absolute left-3 top-3 z-[2] flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white ${recommendedBadges[index].color}`}><AppIcon name={recommendedBadges[index].icon} className="h-3.5 w-3.5" />{recommendedBadges[index].label}</span>
                    <Link href={`/${locale}/auth/login?next=/${locale}/explore/${site.id}`} aria-label={isRTL ? 'הוסף למועדפים' : 'Add to favorites'} className="absolute right-3 top-3 z-[3] rounded-full p-1 text-white drop-shadow hover:bg-white/15"><AppIcon name="heart" className="h-8 w-8" /></Link>
                  </div>
                  <div className="space-y-2 p-4">
                    <Link href={`/${locale}/explore/${site.id}`} className="block hover:text-blue-700"><h3 className="text-lg font-extrabold leading-6">{site.name}</h3></Link>
                    <p className="text-sm text-slate-600">{isRTL ? 'עומק מקסימלי' : 'Max depth'}: {site.depth || 18} מ׳</p>
                    <div className="flex items-center justify-between text-sm text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{isRTL ? 'קל' : 'Easy'}</span><span className="flex items-center gap-1.5"><AppIcon name="van" className="h-4 w-4" />{isRTL ? 'מהמרכז' : 'Pickup'}</span></div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_35px_rgba(15,63,110,.08)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold leading-8">{isRTL ? 'מודולים חדשים' : 'New modules'}</h2>
                <p className="text-sm font-semibold text-slate-500">{isRTL ? 'צלילה חופשית והשכרת ציוד מחוברים לממשק.' : 'Free diving and equipment rental are now part of the interface.'}</p>
              </div>
              <AppIcon name="waves" className="h-8 w-8 text-cyan-500" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {mvpModules.map((module) => (
                <Link key={module.href} href={module.href} className="group overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-center gap-4">
                    <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${module.tone} p-3 shadow-lg`}>
                      <img src={module.visual} alt="" className="h-full w-full object-contain drop-shadow-md" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-blue-700">{module.badge}</span>
                      <h3 className="mt-2 text-xl font-black text-[#10264b]">{module.title}</h3>
                    </div>
                    <AppIcon name={isRTL ? 'arrow-left' : 'arrow-right'} className="h-6 w-6 text-blue-600 transition group-hover:translate-x-1" />
                  </div>
                  <p className="mt-4 leading-7 text-slate-600">{module.text}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside dir={isRTL ? 'rtl' : 'ltr'} className="space-y-5 px-4 lg:px-0 lg:pr-6 lg:pt-5">
          <div dir="ltr" className="hidden items-center justify-center py-2 lg:flex">
            <img src={graphics.logoDark} alt="DiveDrop" className="h-[88px] w-auto" />
          </div>

          <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)]">
            <h2 className="text-center !text-2xl !leading-8 font-extrabold">{isRTL ? 'חיפוש צלילה' : 'Find a dive'}</h2>
            <div className="mx-auto my-2 h-1 w-9 rounded-full bg-cyan-400" />
            <div className="grid grid-cols-3 gap-3 py-3">
              {(['users', 'coral', 'boat'] as AppIconName[]).map((icon, index) => <Link key={icon} href={`/${locale}/explore?type=${['dive', 'site', 'boat'][index]}`} className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border border-slate-100 font-bold ${index === 1 ? 'bg-gradient-to-b from-cyan-500 to-blue-700 text-white' : 'bg-slate-50 text-[#17345e]'}`}><AppIcon name={icon} className="h-6 w-6" /><span className="mt-1 block">{[isRTL ? 'צלילה' : 'Dive', isRTL ? 'אתר צלילה' : 'Dive site', isRTL ? 'קבוצת סירה' : 'Boat group'][index]}</span></Link>)}
            </div>
            <form action={`/${locale}/explore`} method="get" className="space-y-3">
              <select name="site" aria-label="בחר אתר צלילה" className="rounded-xl border-slate-200 bg-white"><option value="">{isRTL ? 'בחר אתר צלילה' : 'Choose a dive site'}</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
              <input name="date" aria-label="בחר תאריך" type="date" className="rounded-xl border-slate-200 bg-white" />
              <select name="level" aria-label="דרגת צולל" className="rounded-xl border-slate-200 bg-white"><option value="advanced">Advanced Open Water</option><option value="rescue">Rescue Diver</option><option value="divemaster">Divemaster</option></select>
              <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-700 to-cyan-500 font-bold text-white shadow-lg"><AppIcon name="search" className="h-5 w-5" />{isRTL ? 'חפש' : 'Search'}</button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {mvpModules.map((module) => (
                <Link key={module.href} href={module.href} className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center font-extrabold text-blue-800 transition hover:bg-blue-100">
                  <img src={module.visual} alt="" className="mx-auto mb-2 h-9 w-9 object-contain" />
                  {module.title}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)]">
            <h2 className="mb-4 flex items-center justify-between text-2xl font-extrabold leading-8"><AppIcon name="calendar" className="h-7 w-7 text-blue-600" />{isRTL ? 'הצלילות הקרובות שלך' : 'Your upcoming dives'}</h2>
            <div className="rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-4"><img src={displaySites[3].image} alt="שונית הכרישים" className="h-20 w-20 rounded-full object-cover" /><div><h3 className="!text-xl !leading-7 font-extrabold">{isRTL ? 'שונית הכרישים' : 'Shark Reef'}</h3><p className="text-slate-500">{isRTL ? 'צלילת סירה מודרכת' : 'Guided boat dive'}</p></div></div>
              <div className="my-4 flex justify-around text-sm text-slate-600"><span className="flex items-center gap-1.5"><AppIcon name="clock" className="h-4 w-4" />08:00</span><span className="flex items-center gap-1.5"><AppIcon name="calendar" className="h-4 w-4" />20.05.2024</span></div>
              <div className="flex gap-2"><span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs"><AppIcon name="users" className="h-4 w-4" />6 משתתפים</span><span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs"><AppIcon name="user" className="h-4 w-4" />מדריך: אורי לוי</span></div>
              <Link href={`/${locale}/bookings?category=dive`} className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">{isRTL ? 'פרטי ההזמנה ‹' : 'Booking details ›'}</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
