export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

const fallbackSiteNames = ['הגנים היפנים', 'הר הסלע', 'הסטי"ל', 'שונית הדולפינים'];

async function getFeaturedDiveSites(): Promise<DiveSite[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('dive_sites').select('*').order('created_at', { ascending: false }).limit(4);
    return data || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const locale = await getLocale();
  const isRTL = locale === 'he';
  const sites = await getFeaturedDiveSites();
  const displaySites = Array.from({ length: 4 }, (_, index) => ({
    id: sites[index]?.id ?? `reference-site-${index}`,
    name: isRTL ? fallbackSiteNames[index] : (sites[index]?.name ?? ['Japanese Gardens', 'The Rock', 'Satil Wreck', 'Dolphin Reef'][index]),
    depth: sites[index]?.depth ?? [18, 30, 28, 20][index],
    image: `/dive-site-${index + 1}.png`,
  }));

  const categories = [
    { icon: '🪸', label: isRTL ? 'אתרי צלילה' : 'Dive Sites', href: `/${locale}/explore` },
    { icon: '🏪', label: isRTL ? 'מועדוני צלילה' : 'Dive Clubs', href: `/${locale}/explore?category=clubs` },
    { icon: '🤿', label: isRTL ? 'מדריכים' : 'Instructors', href: `/${locale}/explore?category=instructors` },
    { icon: '🚐', label: isRTL ? 'הסעות' : 'Pickups', href: `/${locale}/explore?category=pickups` },
    { icon: '🛥️', label: isRTL ? 'צלילות סירה' : 'Boat Dives', href: `/${locale}/explore?category=boat` },
    { icon: '👥', label: isRTL ? 'צלילות' : 'Dives', href: `/${locale}/my-dives`, mobileOnly: true },
  ];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b]">
      <div dir="ltr" className="mx-auto grid max-w-[1536px] gap-5 pb-24 lg:grid-cols-[minmax(0,2fr)_minmax(380px,0.94fr)] lg:p-0">
        <div dir={isRTL ? 'rtl' : 'ltr'} className="min-w-0 space-y-5">
          <section className="relative h-[675px] overflow-hidden rounded-b-[32px] shadow-[0_18px_45px_rgba(14,61,112,.16)] lg:h-[562px] lg:rounded-[0_0_28px_0]">
            <img src="/divedrop-hero-v2.png" alt="סירת צלילה וצולל מתחת למים" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#001e46]/80 via-transparent to-transparent lg:bg-gradient-to-l lg:from-[#001c45]/65 lg:via-transparent lg:to-transparent" />

            <div className="absolute inset-x-6 top-32 text-right text-white lg:inset-x-auto lg:right-14 lg:top-1/2 lg:w-[40%] lg:-translate-y-1/2">
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                {isRTL ? 'ברוך הבא' : 'Welcome'}
                <br />
                <span className="text-cyan-300">DiveDrop</span>{isRTL ? '־ל' : ''}
              </h1>
              <p className="mt-5 max-w-md !text-lg !leading-8 !text-white lg:!text-2xl lg:!leading-10">
                {isRTL ? 'הדרך החכמה שלך לצלילה בטוחה, אחראית ומקצועית.' : 'Your smart way to safe, responsible and professional diving.'}
              </p>
            </div>

            <div className="absolute bottom-6 left-5 right-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:left-11 lg:right-7 lg:grid-cols-5">
              {categories.map((category) => (
                <Link key={category.href} href={category.href} className={`group flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#00345f]/75 p-3 text-center text-white shadow-lg backdrop-blur-md transition hover:-translate-y-1 hover:bg-[#075b91]/90 ${category.mobileOnly ? 'lg:hidden' : ''}`}>
                  <span className="text-3xl transition group-hover:scale-110">{category.icon}</span>
                  <span className="font-bold">{category.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_35px_rgba(15,63,110,.08)] sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-3 !text-2xl !leading-8 font-extrabold"><span className="text-blue-600">☆</span>{isRTL ? 'מומלץ עבורך' : 'Recommended for you'}</h2>
              <Link href={`/${locale}/explore`} className="font-bold text-blue-600 hover:underline">{isRTL ? 'הצג הכל ‹' : 'View all ›'}</Link>
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto pb-2">
              {displaySites.map((site, index) => (
                <article key={site.id} className="w-[230px] flex-none snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_rgba(17,63,105,.12)] sm:w-[260px]">
                  <div className="relative h-40 overflow-hidden">
                    <img src={site.image} alt={site.name} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                    <span className="absolute left-3 top-3 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">✓ {isRTL ? 'מתאים לך' : 'Good match'}</span>
                    <span className="absolute right-3 top-3 text-3xl text-white drop-shadow">♡</span>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="!text-lg !leading-6 font-extrabold">{site.name}</h3>
                    <p className="text-sm text-slate-600">{isRTL ? 'עומק מקסימלי' : 'Max depth'}: {site.depth || 18} מ׳</p>
                    <div className="flex items-center justify-between text-sm text-slate-500"><span>🟢 {isRTL ? 'קל' : 'Easy'}</span><span>🚐 {isRTL ? 'מהמרכז' : 'Pickup'}</span></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside dir={isRTL ? 'rtl' : 'ltr'} className="space-y-5 px-4 lg:px-0 lg:pr-6 lg:pt-5">
          <div dir="ltr" className="hidden items-center justify-center gap-4 py-2 lg:flex">
            <div className="flex h-20 w-16 items-center justify-center rounded-[45%_45%_55%_55%] bg-gradient-to-b from-cyan-400 to-blue-900 text-3xl text-white shadow-lg">🌊</div>
            <div dir="ltr"><div className="text-5xl font-black tracking-tight text-[#0870ce]">DiveDrop</div><div className="mt-1 tracking-[.18em] text-[#129fd4]">DIVE MORE. CARE MORE.</div></div>
          </div>

          <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)]">
            <h2 className="text-center !text-2xl !leading-8 font-extrabold">{isRTL ? 'חיפוש צלילה' : 'Find a dive'}</h2>
            <div className="mx-auto my-2 h-1 w-9 rounded-full bg-cyan-400" />
            <div className="grid grid-cols-3 gap-3 py-3">
              {['צלילה', 'אתר צלילה', 'קבוצת סירה'].map((label, index) => <button key={label} className={`min-h-20 rounded-2xl border border-slate-100 font-bold ${index === 1 ? 'bg-gradient-to-b from-cyan-500 to-blue-700 text-white' : 'bg-slate-50 text-[#17345e]'}`}>{index === 1 ? '🪸' : index === 0 ? '👥' : '🛥️'}<span className="mt-1 block">{label}</span></button>)}
            </div>
            <div className="space-y-3">
              <select aria-label="בחר אתר צלילה" className="rounded-xl border-slate-200 bg-white"><option>{isRTL ? 'בחר אתר צלילה' : 'Choose a dive site'}</option>{sites.map(site => <option key={site.id}>{site.name}</option>)}</select>
              <input aria-label="בחר תאריך" type="date" className="rounded-xl border-slate-200 bg-white" />
              <select aria-label="דרגת צולל" className="rounded-xl border-slate-200 bg-white"><option>Advanced Open Water</option><option>Rescue Diver</option><option>Divemaster</option></select>
              <Link href={`/${locale}/explore`} className="flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-l from-blue-700 to-cyan-500 font-bold text-white shadow-lg">⌕ {isRTL ? 'חפש' : 'Search'}</Link>
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)]">
            <h2 className="mb-4 flex items-center justify-between !text-2xl !leading-8 font-extrabold"><span>▣</span>{isRTL ? 'הצלילות הקרובות שלך' : 'Your upcoming dives'}</h2>
            <div className="rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-4"><img src="/dive-site-4.png" alt="שונית הכרישים" className="h-20 w-20 rounded-full object-cover" /><div><h3 className="!text-xl !leading-7 font-extrabold">{isRTL ? 'שונית הכרישים' : 'Shark Reef'}</h3><p className="text-slate-500">{isRTL ? 'צלילת סירה מודרכת' : 'Guided boat dive'}</p></div></div>
              <div className="my-4 flex justify-around text-sm text-slate-600"><span>▣ 08:00</span><span>◷ 20.05.2024</span></div>
              <div className="flex gap-2"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs">👥 6 משתתפים</span><span className="rounded-full bg-slate-100 px-3 py-2 text-xs">👤 מדריך: אורי לוי</span></div>
              <Link href={`/${locale}/my-dives`} className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">{isRTL ? 'פרטי הצלילה ‹' : 'Dive details ›'}</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
