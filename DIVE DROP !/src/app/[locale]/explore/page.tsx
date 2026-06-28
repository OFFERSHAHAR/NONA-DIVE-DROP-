export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Card, CardBody } from '@/components/Card';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { getPublishedDiveSites, getPublishedServiceCatalog, type DiveSite, type ServiceCatalogEntry, type ServiceCategoryKey } from '@/lib/content/public-content';

const serviceCatalog: Record<ServiceCategoryKey, ServiceCatalogEntry> = {
  clubs: {
    title: { he: 'מועדוני צלילה', en: 'Dive Clubs' },
    subtitle: { he: 'מועדונים זמינים להזמנות, ציוד, הדרכות וצלילות סירה.', en: 'Clubs available for bookings, gear, courses and boat dives.' },
    icon: 'store',
    items: [
      { title: 'DiveDrop Club Eilat', desc: 'מועדון בית עם איסוף ציוד, תדריך ויציאה לאתרים מובילים.', badge: 'פתוח היום', icon: 'store' },
      { title: 'Blue Reef Center', desc: 'צלילות מודרכות, השכרת ציוד וחבילות לקבוצות.', badge: 'מומלץ', icon: 'coral' },
      { title: 'South Bay Divers', desc: 'התאמה לצוללים מתחילים ומתקדמים כולל ליווי מדריך.', badge: 'זמין להזמנה', icon: 'users' },
    ],
  },
  instructors: {
    title: { he: 'מדריכי צלילה', en: 'Dive Instructors' },
    subtitle: { he: 'מדריכים זמינים לליווי, קורסים, בדיקת כשירות וצלילות מודרכות.', en: 'Available instructors for guiding, courses, readiness checks and assisted dives.' },
    icon: 'user',
    items: [
      { title: 'אורי לוי', desc: 'מדריך Advanced Open Water, מומחה לצלילות עומק וסטי"ל.', badge: 'זמין היום', icon: 'award' },
      { title: 'נועה בן דוד', desc: 'ליווי לצוללים חוזרים, איזון, נשימה ובטיחות.', badge: 'דירוג גבוה', icon: 'star' },
      { title: 'צוות DiveDrop', desc: 'התאמת מדריך לפי אתר, רמה ושעת יציאה.', badge: 'התאמה חכמה', icon: 'check' },
    ],
  },
  pickups: {
    title: { he: 'הסעות לצלילות', en: 'Dive Pickups' },
    subtitle: { he: 'איסוף מהמלון/המרכז, ציוד בדרך וחזרה מסודרת אחרי הצלילה.', en: 'Pickup from hotel/center, gear on route, and return after the dive.' },
    icon: 'van',
    items: [
      { title: 'איסוף מהמרכז', desc: 'יציאה כל 30 דקות לאתרים המרכזיים באילת.', badge: 'מהיר', icon: 'van' },
      { title: 'הסעת קבוצה', desc: 'רכב לקבוצות עם מקום לציוד רטוב ויבש.', badge: 'לקבוצות', icon: 'users' },
      { title: 'איסוף + ציוד', desc: 'חבילת הסעה יחד עם מסכה, סנפירים וחליפה.', badge: 'חבילה', icon: 'calendar' },
    ],
  },
  boat: {
    title: { he: 'צלילות סירה', en: 'Boat Dives' },
    subtitle: { he: 'יציאות סירה מתוכננות עם מדריך, ציוד ותדריך בטיחות.', en: 'Scheduled boat departures with guide, gear and safety briefing.' },
    icon: 'boat',
    items: [
      { title: 'יציאת בוקר', desc: 'צלילת סירה מודרכת לשונית פתוחה, כולל תדריך.', badge: '08:00', icon: 'boat' },
      { title: 'שונית הכרישים', desc: 'מסלול מתקדם עם מדריך חובה ותכנון עומק.', badge: 'מתקדם', icon: 'award' },
      { title: 'סירה + ציוד', desc: 'חבילת סירה מלאה עם השכרת ציוד במקום.', badge: 'פופולרי', icon: 'fire' },
    ],
  },
  dive: {
    title: { he: 'חיפוש צלילה', en: 'Find a Dive' },
    subtitle: { he: 'בחר סוג פעילות והמשך למסך הזמנה מסודר.', en: 'Choose an activity type and continue to a structured booking screen.' },
    icon: 'diver',
    items: [
      { title: 'צלילה מודרכת', desc: 'בחירת אתר, מדריך ושעת יציאה.', badge: 'MVP פעיל', icon: 'diver' },
      { title: 'צלילה חופשית', desc: 'אימון, דיסציפלינה ופעילות קהילה.', badge: 'חדש', icon: 'waves' },
      { title: 'השכרת ציוד', desc: 'מסכות, סנפירים, חליפות וחבילות קבוצתיות.', badge: 'מחובר', icon: 'calendar' },
    ],
  },
};

const referenceSites: DiveSite[] = [
  { id: 'reference-site-0', name: 'הגנים היפנים', description: 'שונית צבעונית ונגישה לצלילה רגועה.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 18, difficulty: 'easy', image_url: '/divedrop-hero-v2.png', created_at: '', updated_at: '' },
  { id: 'reference-site-1', name: 'הר הסלע', description: 'אתר עומק מרשים לצוללים מנוסים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 30, difficulty: 'intermediate', image_url: '/divedrop-hero-v2.png', created_at: '', updated_at: '' },
  { id: 'reference-site-2', name: 'הסטי"ל', description: 'צלילת כלי שיט טבוע עם מסלול עשיר בפרטים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 28, difficulty: 'intermediate', image_url: '/divedrop-hero-v2.png', created_at: '', updated_at: '' },
  { id: 'reference-site-3', name: 'שונית הכרישים', description: 'צלילה מאתגרת יותר עם נוף כחול פתוח.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 35, difficulty: 'hard', image_url: '/divedrop-hero-v2.png', created_at: '', updated_at: '' },
  { id: 'reference-site-4', name: 'שונית הדולפינים', description: 'אתר אהוב עם מים צלולים וחיים ימיים מגוונים.', location: 'אילת', latitude: 29.5, longitude: 34.9, depth: 20, difficulty: 'easy', image_url: '/divedrop-hero-v2.png', created_at: '', updated_at: '' },
];

async function getAllDiveSites(): Promise<DiveSite[]> {
  return getPublishedDiveSites(referenceSites);
}

type ExploreSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExplorePage({ searchParams }: { searchParams: ExploreSearchParams }) {
  const locale = await getLocale();
  const t = await getTranslations('explore');
  const allDiveSites = await getAllDiveSites();
  const query = await searchParams;
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';
  const difficulty = typeof query.difficulty === 'string' ? query.difficulty : '';
  const selectedSite = typeof query.site === 'string' ? query.site : '';
  const category = typeof query.category === 'string' ? query.category : '';
  const searchType = typeof query.type === 'string' ? query.type : '';
  const serviceKey = (
    category && category in serviceCatalog
      ? category
      : searchType === 'boat'
        ? 'boat'
        : searchType === 'dive'
          ? 'dive'
          : ''
  ) as ServiceCategoryKey | '';
  const selectedDate = typeof query.date === 'string' ? query.date : '';
  const selectedLevel = typeof query.level === 'string' ? query.level : '';
  const diveSites = allDiveSites.filter((site) => {
    const matchesSearch = !search || site.name.toLowerCase().includes(search) || (site.location || '').toLowerCase().includes(search);
    const matchesDifficulty = !difficulty || site.difficulty === difficulty;
    const matchesSite = !selectedSite || site.id === selectedSite;
    return matchesSearch && matchesDifficulty && matchesSite;
  });
  const isRTL = locale === 'he';
  const categoryTitles: Record<string, { he: string; en: string }> = {
    clubs: { he: 'מועדוני צלילה', en: 'Dive Clubs' },
    instructors: { he: 'מדריכי צלילה', en: 'Dive Instructors' },
    pickups: { he: 'הסעות לצלילות', en: 'Dive Pickups' },
    boat: { he: 'צלילות סירה', en: 'Boat Dives' },
  };
  const typeTitles: Record<string, { he: string; en: string }> = {
    dive: { he: 'חיפוש צלילה', en: 'Find a Dive' },
    site: { he: 'אתרי צלילה', en: 'Dive Sites' },
    boat: { he: 'קבוצות וצלילות סירה', en: 'Boat Dive Groups' },
  };
  const activeTitle = categoryTitles[category] || typeTitles[searchType];
  const pageTitle = activeTitle ? (isRTL ? activeTitle.he : activeTitle.en) : (isRTL ? 'אתרי צלילה' : 'Dive Sites');
  const activeService = serviceKey ? await getPublishedServiceCatalog(serviceKey, serviceCatalog) : null;
  const activeCriteria = [
    selectedDate && `${isRTL ? 'תאריך' : 'Date'}: ${selectedDate}`,
    selectedLevel && `${isRTL ? 'דרגה' : 'Level'}: ${selectedLevel}`,
  ].filter(Boolean);

  return (
    <div className={`min-h-screen w-full bg-[#f6f9fd] dark:bg-dark-bg ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Link
                href={`/${locale}`}
                className="p-2 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated rounded-lg transition-colors"
                aria-label={isRTL ? 'חזרה' : 'Back'}
              >
                <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} className="h-6 w-6 text-text-primary dark:text-text-light" />
              </Link>
              <h1 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-text-light">
                {pageTitle}
              </h1>
            </div>
            <p className="text-text-secondary dark:text-text-secondary-light">
              {t('subtitle')}
            </p>
          </div>

          {/* Settings Icon */}
          <Link
            href={`/${locale}/settings`}
            aria-label={isRTL ? 'הגדרות' : 'Settings'}
            className="p-2 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated rounded-lg transition-colors flex-shrink-0"
          >
            <AppIcon name="settings" className="h-6 w-6 text-text-primary dark:text-text-light" />
          </Link>
        </div>

        {/* Search Input */}
        <form action={`/${locale}/explore`} method="get" className="mb-5 rounded-2xl bg-white p-2 shadow-sm">
          <div className="relative">
            <AppIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary dark:text-text-secondary-light" />
            <input
              name="q"
              type="text"
              defaultValue={search}
              placeholder={t('search_placeholder')}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-24 text-text-primary shadow-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">{isRTL ? 'חפש' : 'Search'}</button>
          </div>
        </form>

        {activeCriteria.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
            <AppIcon name="info" className="h-5 w-5 text-blue-600" />
            {activeCriteria.map((criterion) => <span key={criterion} className="rounded-full bg-white px-3 py-1">{criterion}</span>)}
            <Link href={`/${locale}/explore`} className="underline">{isRTL ? 'נקה חיפוש' : 'Clear search'}</Link>
          </div>
        )}

        {activeService && (
          <section className="mb-8 rounded-[28px] bg-white p-5 shadow-[0_12px_35px_rgba(15,63,110,.10)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-blue-700">{isRTL ? 'מסלול MVP מחובר' : 'Connected MVP flow'}</span>
                <h2 className="mt-3 text-2xl font-black">{isRTL ? activeService.title.he : activeService.title.en}</h2>
                <p className="mt-2 leading-7 text-slate-600">{isRTL ? activeService.subtitle.he : activeService.subtitle.en}</p>
              </div>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-lg">
                <AppIcon name={activeService.icon} className="h-8 w-8" />
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {activeService.items.map((item) => (
                <article key={item.title} className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white">
                      <AppIcon name={item.icon} className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">{item.badge}</span>
                  </div>
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-2 min-h-14 text-sm leading-6 text-slate-600">{item.desc}</p>
                  <Link href={`/${locale}/bookings?category=${serviceKey}${item.slug ? `&item=${encodeURIComponent(item.slug)}` : ''}`} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-l from-blue-700 to-cyan-500 px-4 font-black text-white shadow-md">
                    {isRTL ? 'המשך להזמנה' : 'Continue booking'}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Filter Chips */}
        {!activeService && <div className={`flex flex-wrap gap-2 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {[
            { id: '', label: t('all'), icon: 'grid' as AppIconName },
            { id: 'easy', label: isRTL ? 'קל' : 'Easy', icon: 'level' as AppIconName },
            { id: 'intermediate', label: isRTL ? 'בינוני' : 'Intermediate', icon: 'filter' as AppIconName },
            { id: 'hard', label: isRTL ? 'מאתגר' : 'Advanced', icon: 'award' as AppIconName },
          ].map((filter) => (
            <Link
              key={filter.id}
              href={`/${locale}/explore${filter.id ? `?difficulty=${filter.id}` : ''}`}
              className={`px-4 py-2 rounded-full border-2 transition-all font-semibold text-sm ${
                filter.id === difficulty
                  ? 'border-primary bg-primary text-white dark:border-cyan-accent dark:bg-cyan-accent dark:text-dark-bg'
                  : 'border-border-primary dark:border-border-dark bg-white dark:bg-dark-surface text-text-primary dark:text-text-light hover:border-primary dark:hover:border-cyan-accent'
              }`}
            >
              <span className="flex items-center gap-2"><AppIcon name={filter.icon} className="h-4 w-4" />{filter.label}</span>
            </Link>
          ))}
        </div>}

        {/* Dive Sites Grid */}
        {!activeService && diveSites.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {diveSites.map((site) => (
              <DiveSiteCardExplore key={site.id} site={site} locale={locale} isRTL={isRTL} />
            ))}
          </div>
        ) : !activeService ? (
          <div className="text-center py-12">
            <AppIcon name="waves" className="mx-auto mb-4 h-16 w-16 text-cyan-500" />
            <p className="text-text-secondary dark:text-text-secondary-light">
              {isRTL ? 'לא נמצאו אתרי צלילה' : 'No dive sites found'}
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
}

interface DiveSiteCardExploreProps {
  site: DiveSite;
  locale: string;
  isRTL: boolean;
}

function DiveSiteCardExplore({ site, locale, isRTL }: DiveSiteCardExploreProps) {
  return (
    <Card
      variant="default"
      hover={true}
      className="h-full overflow-hidden cursor-pointer group rounded-[22px] border-0 bg-white p-0 transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Image Container */}
      <div className="w-full aspect-video bg-gradient-to-br from-accent/30 to-primary/30 overflow-hidden relative">
        <img
          src={site.image_url || getDiveSiteImage(site.name)}
          alt={site.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Difficulty Badge */}
        <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`}>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-sm ${getDifficultyBadgeClass(
              site.difficulty as string
            )}`}
          >
            <i className={`h-2.5 w-2.5 rounded-full ${getDifficultyDotClass(site.difficulty as string)}`} />
            <span className="capitalize">{site.difficulty}</span>
          </span>
        </div>
      </div>

      {/* Content Section */}
      <CardBody className="flex flex-col gap-3">
        {/* Title */}
        <h3 className="text-xl font-bold text-text-primary dark:text-text-light line-clamp-2">
          {site.name}
        </h3>

        {/* Location */}
        <p className="text-sm text-text-secondary dark:text-text-secondary-light flex items-center gap-2">
          <AppIcon name="location" className="h-5 w-5 shrink-0 text-blue-600" />
          <span className="line-clamp-1">{site.location}</span>
        </p>

        {/* Depth Info */}
        <div className="flex items-center gap-3 py-3 px-3 bg-bg-secondary dark:bg-dark-surface-elevated rounded-md border border-border-primary dark:border-border-dark">
          <AppIcon name="depth" className="h-6 w-6 shrink-0 text-blue-600" />
          <div>
            <p className="text-xs text-text-tertiary dark:text-text-secondary">
              {isRTL ? 'עומק מקסימלי' : 'Max Depth'}
            </p>
            <p className="font-semibold text-text-primary dark:text-text-light">{site.depth}m</p>
          </div>
        </div>

        {/* Description */}
        {site.description && (
          <p className="text-sm text-text-secondary dark:text-text-secondary-light line-clamp-2 leading-relaxed">
            {site.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className={`flex gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link href={`/${locale}/bookings?site=${site.id}`} className="flex flex-1 items-center justify-center rounded-lg bg-primary py-2 font-semibold text-white hover:bg-primary-dark">
            {isRTL ? 'בחר' : 'Select'}
          </Link>
          <Link href={`/${locale}/explore/${site.id}`} className="flex flex-1 items-center justify-center rounded-lg border border-primary py-2 font-semibold text-primary hover:bg-primary/10 dark:border-cyan-accent dark:text-cyan-accent dark:hover:bg-cyan-accent/10">
            {isRTL ? 'פרטים' : 'Details'}
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

// Helper functions
function getDifficultyBadgeClass(difficulty: string): string {
  const classes = {
    easy: 'bg-success-easy/90 text-white',
    intermediate: 'bg-warning-intermediate/90 text-black',
    hard: 'bg-error-hard/90 text-white',
  };
  return classes[difficulty as keyof typeof classes] || classes.easy;
}

function getDifficultyDotClass(difficulty: string): string {
  const classes = {
    easy: 'bg-emerald-500',
    intermediate: 'bg-amber-500',
    hard: 'bg-red-500',
  };
  return classes[difficulty as keyof typeof classes] || 'bg-blue-500';
}

function getDiveSiteImage(name: string): string {
  void name;
  return '/divedrop-hero-v2.png';
}
