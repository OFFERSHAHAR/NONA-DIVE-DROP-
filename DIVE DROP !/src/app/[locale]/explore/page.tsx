export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
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

export default async function ExplorePage() {
  const locale = await getLocale();
  const t = await getTranslations('explore');
  const diveSites = await getAllDiveSites();
  const isRTL = locale === 'he';

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
                <svg
                  className="w-6 h-6 text-text-primary dark:text-text-light"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isRTL ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
                  />
                </svg>
              </Link>
              <h1 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-text-light">
                {isRTL ? 'אתרי צלילה' : 'Dive Sites'}
              </h1>
            </div>
            <p className="text-text-secondary dark:text-text-secondary-light">
              {t('subtitle')}
            </p>
          </div>

          {/* Settings Icon */}
          <button
            aria-label={isRTL ? 'הגדרות' : 'Settings'}
            className="p-2 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated rounded-lg transition-colors flex-shrink-0"
          >
            <svg
              className="w-6 h-6 text-text-primary dark:text-text-light"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-5 rounded-2xl bg-white p-2 shadow-sm">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-text-secondary-light"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-text-primary shadow-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className={`flex flex-wrap gap-2 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {[
            { id: 'all', label: t('all'), icon: '🔵' },
            { id: 'type', label: t('filter_difficulty'), icon: '🎯' },
            { id: 'level', label: isRTL ? 'דרגת צולל' : 'Diver Level', icon: '🎓' },
            { id: 'more', label: isRTL ? 'עוד' : 'More', icon: '⚙️' },
          ].map((filter) => (
            <button
              key={filter.id}
              className={`px-4 py-2 rounded-full border-2 transition-all font-semibold text-sm ${
                filter.id === 'all'
                  ? 'border-primary bg-primary text-white dark:border-cyan-accent dark:bg-cyan-accent dark:text-dark-bg'
                  : 'border-border-primary dark:border-border-dark bg-white dark:bg-dark-surface text-text-primary dark:text-text-light hover:border-primary dark:hover:border-cyan-accent'
              }`}
            >
              {filter.icon} {filter.label}
            </button>
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
            <div className="text-6xl mb-4">🌊</div>
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
            {getDifficultyIcon(site.difficulty as string)}
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
          <span>📍</span>
          <span className="line-clamp-1">{site.location}</span>
        </p>

        {/* Depth Info */}
        <div className="flex items-center gap-3 py-3 px-3 bg-bg-secondary dark:bg-dark-surface-elevated rounded-md border border-border-primary dark:border-border-dark">
          <span className="text-lg">🌊</span>
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
          <Button className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2">
            {isRTL ? 'בחר' : 'Select'}
          </Button>
          <Button
            variant="secondary"
            className="flex-1 border border-primary dark:border-cyan-accent text-primary dark:text-cyan-accent hover:bg-primary/10 dark:hover:bg-cyan-accent/10 font-semibold rounded-lg py-2"
          >
            {isRTL ? 'פרטים' : 'Details'}
          </Button>
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

function getDifficultyIcon(difficulty: string): string {
  const icons = {
    easy: '🟢',
    intermediate: '🟡',
    hard: '🔴',
  };
  return icons[difficulty as keyof typeof icons] || '🔵';
}

function getDiveSiteImage(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('blue hole')) return 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1000&h=650&fit=crop';
  if (normalized.includes('palau')) return 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1000&h=650&fit=crop';
  if (normalized.includes('barrier')) return 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1000&h=650&fit=crop';
  return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1000&h=650&fit=crop';
}
