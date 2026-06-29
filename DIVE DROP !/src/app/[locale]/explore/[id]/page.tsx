export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppIcon } from '@/components/AppIcon';
import { getDiveSiteById, type DiveSite } from '@/lib/content/public-content';
import { graphics } from '@/lib/showcase/graphics';


const referenceSites: DiveSite[] = [
  { id: 'reference-site-0', name: 'הגנים היפנים', description: 'אתר שונית צבעוני ונגיש לצלילה רגועה.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 18, difficulty: 'easy', image_url: graphics.heroMain, created_at: '', updated_at: '' },
  { id: 'reference-site-1', name: 'הר הסלע', description: 'אתר עומק מרשים לצוללים מנוסים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 30, difficulty: 'intermediate', image_url: graphics.heroPremium, created_at: '', updated_at: '' },
  { id: 'reference-site-2', name: 'הסטי"ל', description: 'צלילת כלי שיט טבוע עם מסלול עשיר בפרטים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 28, difficulty: 'intermediate', image_url: graphics.heroInstructor, created_at: '', updated_at: '' },
  { id: 'reference-site-3', name: 'שונית הכרישים', description: 'צלילה מאתגרת יותר עם נוף כחול פתוח.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 35, difficulty: 'hard', image_url: graphics.heroPremium, created_at: '', updated_at: '' },
  { id: 'reference-site-4', name: 'שונית הדולפינים', description: 'אתר שונית אהוב עם מים צלולים וחיים ימיים מגוונים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 20, difficulty: 'easy', image_url: graphics.heroMain, created_at: '', updated_at: '' },
];

async function getDiveSite(id: string): Promise<DiveSite | null> {
  return getDiveSiteById(id, referenceSites);
}

export default async function DiveSiteDetailsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const isRTL = locale === 'he';
  const site = await getDiveSite(id);

  if (!site) {
    notFound();
  }

  const difficultyLabels = {
    easy: isRTL ? 'קל' : 'Easy',
    intermediate: isRTL ? 'בינוני' : 'Intermediate',
    hard: isRTL ? 'מאתגר' : 'Advanced',
  };

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] pb-28 text-[#10264b]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link href={`/${locale}/explore`} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-blue-700 shadow-sm hover:bg-blue-50">
          <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-5 w-5" />
          {isRTL ? 'חזרה לאתרי הצלילה' : 'Back to dive sites'}
        </Link>

        <article className="overflow-hidden rounded-[30px] bg-white shadow-[0_18px_50px_rgba(15,63,110,.14)]">
          <div className="relative h-[280px] sm:h-[430px]">
            <img src={site.image_url || graphics.heroMain} alt={site.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#001e46]/80 via-transparent to-transparent" />
            <div className="absolute inset-x-5 bottom-5 text-white sm:inset-x-8 sm:bottom-8">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-500 px-3 py-1 text-sm font-bold">
                <AppIcon name="award" className="h-4 w-4" />{difficultyLabels[site.difficulty]}
              </span>
              <h1 className="text-3xl font-extrabold sm:text-5xl">{site.name}</h1>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><AppIcon name="location" className="h-7 w-7 text-blue-600" /><div><div className="text-xs text-slate-500">{isRTL ? 'מיקום' : 'Location'}</div><strong>{site.location}</strong></div></div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><AppIcon name="depth" className="h-7 w-7 text-blue-600" /><div><div className="text-xs text-slate-500">{isRTL ? 'עומק מרבי' : 'Maximum depth'}</div><strong>{site.depth} {isRTL ? 'מ׳' : 'm'}</strong></div></div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><AppIcon name="level" className="h-7 w-7 text-blue-600" /><div><div className="text-xs text-slate-500">{isRTL ? 'רמת קושי' : 'Difficulty'}</div><strong>{difficultyLabels[site.difficulty]}</strong></div></div>
            </div>

            <div>
              <h2 className="mb-2 text-xl font-extrabold">{isRTL ? 'על האתר' : 'About this site'}</h2>
              <p className="leading-8 text-slate-600">{site.description || (isRTL ? 'מידע נוסף על אתר הצלילה יעודכן בקרוב.' : 'More information about this dive site will be available soon.')}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/${locale}/bookings?site=${site.id}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-700 to-cyan-500 px-5 font-extrabold text-white shadow-lg hover:brightness-105">
                <AppIcon name="calendar" className="h-5 w-5" />{isRTL ? 'בחירת הצלילה' : 'Select this dive'}
              </Link>
              <Link href={`/${locale}/auth/login?next=/${locale}/explore/${site.id}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-blue-700 px-5 font-extrabold text-blue-700 hover:bg-blue-50">
                <AppIcon name="heart" className="h-5 w-5" />{isRTL ? 'שמירה למועדפים' : 'Save to favorites'}
              </Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
