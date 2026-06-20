'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardBody } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { BottomNavigation, BottomNavigationPresets } from '@/components/templates/BottomNavigation';
import { AppIcon } from '@/components/AppIcon';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];
type Difficulty = 'easy' | 'intermediate' | 'hard';

interface ExploreClientProps {
  initialDiveSites: DiveSite[];
  initialError?: string;
  locale: string;
}

export default function ExploreClient({
  initialDiveSites,
  initialError,
  locale,
}: ExploreClientProps) {
  const t = useTranslations();
  const isRTL = locale === 'he';

  // State management
  const [diveSites] = useState<DiveSite[]>(initialDiveSites);
  const [filteredSites, setFilteredSites] = useState<DiveSite[]>(initialDiveSites);
  const [error] = useState<string | null>(initialError || null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all');
  const [minDepth, setMinDepth] = useState<number | ''>('');
  const [maxDepth, setMaxDepth] = useState<number | ''>('');

  // Filter and search logic
  useEffect(() => {
    let filtered = diveSites;

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((site) => site.difficulty === selectedDifficulty);
    }

    // Filter by depth range
    if (minDepth !== '') {
      filtered = filtered.filter((site) => site.depth >= minDepth);
    }
    if (maxDepth !== '') {
      filtered = filtered.filter((site) => site.depth <= maxDepth);
    }

    // Search by name or location
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (site) =>
          site.name.toLowerCase().includes(query) ||
          site.location.toLowerCase().includes(query)
      );
    }

    setFilteredSites(filtered);
  }, [diveSites, searchQuery, selectedDifficulty, minDepth, maxDepth]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDifficulty('all');
    setMinDepth('');
    setMaxDepth('');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 transition-colors duration-200 pb-24 md:pb-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header Section with Search and Filters */}
      <header className="sticky top-0 z-50 bg-white border-b border-border-secondary shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-1">
              {t('navigation.explore')}
            </h1>
            <p className="text-text-secondary text-sm sm:text-base">
              {t('explore.subtitle')}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Input
              id="search-sites"
              type="text"
              placeholder={t('explore.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              aria-label={t('explore.search_label')}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                aria-label={t('common.cancel')}
              >
                <AppIcon name="x" className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center">
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setSelectedDifficulty('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedDifficulty === 'all'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white border border-border-primary text-text-primary hover:border-primary'
                }`}
              >
                All
              </button>

              {(['easy', 'intermediate', 'hard'] as const).map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => setSelectedDifficulty(difficulty)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    selectedDifficulty === difficulty
                      ? getDifficultyBadgeClass(difficulty) + ' ring-2 ring-offset-2'
                      : 'bg-white border border-border-primary text-text-primary hover:border-primary'
                  }`}
                >
                  <i className={`inline-block h-2.5 w-2.5 rounded-full ${getDifficultyDotClass(difficulty)}`} /> {t(`explore.difficulty_${difficulty}`)}
                </button>
              ))}
            </div>

            {/* Clear filters button */}
            {(searchQuery || selectedDifficulty !== 'all' || minDepth !== '' || maxDepth !== '') && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 text-sm font-medium text-accent hover:text-accent-light transition-colors"
                aria-label={t('explore.clear_filters')}
              >
                Clear
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="text-sm text-text-secondary">
            Showing {filteredSites.length} of {diveSites.length} dive sites
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-error/10 border border-error rounded-lg p-6 mb-6">
            <p className="text-error font-semibold mb-2">{t('common.error')}</p>
            <p className="text-error/80 text-sm">{error}</p>
            <Button onClick={() => window.location.reload()} variant="danger" className="mt-4">
              {t('common.tryAgain')}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!error && filteredSites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <AppIcon name="search" className="mb-4 h-16 w-16 text-blue-600" />
            <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">
              {t('explore.no_sites_found')}
            </h2>
            <p className="text-text-secondary text-center max-w-md mb-6">
              {searchQuery || selectedDifficulty !== 'all' || minDepth !== '' || maxDepth !== ''
                ? 'Try adjusting your filters'
                : 'No dive sites available yet'}
            </p>
            {(searchQuery || selectedDifficulty !== 'all' || minDepth !== '' || maxDepth !== '') && (
              <Button onClick={handleClearFilters} variant="primary">
                Reset Filters
              </Button>
            )}
          </div>
        )}

        {/* Grid Layout - Responsive */}
        {!error && filteredSites.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredSites.map((site) => (
              <DiveSiteCard key={site.id} site={site} locale={locale} isRTL={isRTL} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation
        items={BottomNavigationPresets.diveDropMain('explore').map((item) => ({
          ...item,
          href: `/${locale}${item.href}`,
        }))}
        activeId="explore"
      />
    </div>
  );
}

/**
 * Utility functions
 */
function getDifficultyBadgeClass(difficulty: Difficulty): string {
  const baseClass = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap';

  switch (difficulty) {
    case 'easy':
      return `${baseClass} bg-green-100 text-green-700`;
    case 'intermediate':
      return `${baseClass} bg-yellow-100 text-yellow-700`;
    case 'hard':
      return `${baseClass} bg-red-100 text-red-700`;
    default:
      return baseClass;
  }
}

function getDifficultyDotClass(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-500';
    case 'intermediate':
      return 'bg-amber-500';
    case 'hard':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
}

/**
 * DiveSiteCard Component
 * Displays individual dive site information in a grid card
 */
interface DiveSiteCardProps {
  site: DiveSite;
  locale: string;
  isRTL: boolean;
}

function DiveSiteCard({ site, locale, isRTL }: DiveSiteCardProps) {
  const t = useTranslations();

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-primary/20 text-primary';
    }
  };

  return (
    <Link href={`/${locale}/explore/${site.id}`}>
      <Card
        variant="elevated"
        hover={true}
        className={`h-full flex flex-col overflow-hidden cursor-pointer group ${
          isRTL ? 'rtl' : 'ltr'
        }`}
      >
        {/* Image Section - Aspect Ratio */}
        <div className="w-full aspect-video bg-gradient-to-br from-accent/30 to-primary/30 overflow-hidden relative">
          {site.image_url ? (
            <img
              src={site.image_url}
              alt={site.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary/20 to-accent/20">
              <AppIcon name="waves" className="h-12 w-12 text-cyan-500" />
            </div>
          )}

          {/* Difficulty Badge - Positioned Absolutely */}
          <div className={`absolute top-3 sm:top-4 ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'}`}>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold ${getDifficultyColor(
                site.difficulty as Difficulty
              )} bg-white/90 backdrop-blur-sm shadow-elevation-2`}
            >
              <i className={`h-2.5 w-2.5 rounded-full ${getDifficultyDotClass(site.difficulty as Difficulty)}`} />
              <span className="hidden sm:inline">{t(`explore.difficulty_${site.difficulty}`)}</span>
            </span>
          </div>
        </div>

        {/* Content Section */}
        <CardBody className="flex-1 flex flex-col gap-3 sm:gap-4">
          {/* Site Name */}
          <h3 className="text-base sm:text-lg font-bold text-text-primary dark:text-text-light line-clamp-2 leading-tight">
            {site.name}
          </h3>

          {/* Location with icon */}
          <div className="flex items-start gap-2">
            <AppIcon name="location" className="mt-0.5 h-5 w-5 text-blue-600" />
            <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-light break-words">
              {site.location}
            </p>
          </div>

          {/* Depth info */}
          <div className="flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-4 bg-bg-secondary dark:bg-dark-surface-elevated rounded-md border border-border-primary dark:border-border-dark">
            <AppIcon name="depth" className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" />
            <div className="flex-1">
              <p className="text-xs text-text-tertiary dark:text-text-secondary">{t('explore.max_depth')}</p>
              <p className="text-sm sm:text-base font-semibold text-text-primary dark:text-text-light">
                {site.depth}m
              </p>
            </div>
          </div>

          {/* Description */}
          {site.description && (
            <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-light line-clamp-2 leading-relaxed">
              {site.description}
            </p>
          )}
        </CardBody>

        {/* Footer / Action */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border-primary dark:border-border-dark bg-bg-secondary dark:bg-dark-surface-elevated flex gap-2">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={(e) => {
              e.preventDefault();
              // Site details page will be handled by link
            }}
          >
            View Details
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={(e) => {
              e.preventDefault();
              console.log('Add to favorites:', site.id);
            }}
            className="px-2"
          >
            <AppIcon name="heart" className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </Link>
  );
}
