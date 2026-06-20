export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Card, CardBody } from '@/components/Card';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

async function getAllDiveSites(): Promise<DiveSite[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dive_sites')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch (err) {
    console.error('Error fetching dive sites:', err);
    return [];
  }
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

        {/* Filter Chips */}
        <div className={`flex flex-wrap gap-2 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
        </div>

        {/* Dive Sites Grid */}
        {diveSites.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {diveSites.map((site) => (
              <DiveSiteCardExplore key={site.id} site={site} locale={locale} isRTL={isRTL} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AppIcon name="waves" className="mx-auto mb-4 h-16 w-16 text-cyan-500" />
            <p className="text-text-secondary dark:text-text-secondary-light">
              {isRTL ? 'לא נמצאו אתרי צלילה' : 'No dive sites found'}
            </p>
          </div>
        )}

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
          <Link href={`/${locale}/my-dives?site=${site.id}`} className="flex flex-1 items-center justify-center rounded-lg bg-primary py-2 font-semibold text-white hover:bg-primary-dark">
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
  const normalized = name.toLowerCase();
  if (normalized.includes('blue hole')) return 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1000&h=650&fit=crop';
  if (normalized.includes('palau')) return 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1000&h=650&fit=crop';
  if (normalized.includes('barrier')) return 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1000&h=650&fit=crop';
  return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1000&h=650&fit=crop';
}
