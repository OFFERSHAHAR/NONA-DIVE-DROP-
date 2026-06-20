export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

async function getFeaturedDiveSites(): Promise<DiveSite[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dive_sites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4);
    return data || [];
  } catch (err) {
    console.error('Error fetching featured dive sites:', err);
    return [];
  }
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations('home');
  const tExplore = await getTranslations('explore');
  const diveSites = await getFeaturedDiveSites();
  const isRTL = locale === 'he';

  return (
    <div className={`min-h-screen w-full bg-[#f6f9fd] dark:bg-dark-bg ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 pb-20 pt-4 sm:px-6 lg:flex-row-reverse lg:pt-6">
        {/* LEFT COLUMN: 70% on desktop */}
        <div className="w-full lg:w-[70%]">
          {/* Hero Section with Split Image */}
          <section className="relative mb-0 h-[420px] w-full overflow-hidden rounded-[26px] shadow-xl sm:h-[500px] lg:h-[560px]">
            <img
              src="https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1200&h=800&fit=crop"
              alt={isRTL ? 'צלילה' : 'Diving'}
              className="h-full w-full object-cover"
            />
            {/* Text Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#001d49]/95 via-[#003b75]/20 to-transparent p-7 sm:p-10 lg:items-end lg:justify-center lg:text-right">
              <h1 className="mb-3 break-words text-2xl font-bold text-white sm:text-4xl md:text-5xl">
                {isRTL ? 'ברוך הבא ל-DiveDrop' : 'Welcome to DiveDrop'}
              </h1>
              <p className="text-base sm:text-lg text-white/95 max-w-2xl leading-relaxed">
                {isRTL
                  ? 'הדרך החכמה שלך לצלילה בטוחה, אחראית ומקצועית.'
                  : 'Your smart way to safe, responsible, and professional diving.'}
              </p>
            </div>
          </section>

          {/* Category Buttons Row */}
          <section className="relative z-10 mx-4 -mt-12 mb-10 rounded-[26px] bg-white p-3 shadow-xl sm:mx-8 sm:p-4 lg:mx-10 lg:-mt-28 lg:bg-white/15 lg:backdrop-blur-md">
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">
              {[
                { icon: '🪸', label: isRTL ? 'אתרי צלילה' : 'Dive Sites', href: `/${locale}/explore?category=sites` },
                { icon: '🏛️', label: isRTL ? 'מועדוני צלילה' : 'Dive Clubs', href: `/${locale}/explore?category=clubs` },
                { icon: '👤', label: isRTL ? 'מדריכים' : 'Instructors', href: `/${locale}/explore?category=instructors` },
                { icon: '🚐', label: isRTL ? 'הסעות' : 'Pickups', href: `/${locale}/explore?category=pickups` },
                { icon: '⛵', label: isRTL ? 'צלילות סירה' : 'Boat Dives', href: `/${locale}/explore?category=boat` },
                { icon: '🤿', label: isRTL ? 'צלילות' : 'Dives', href: `/${locale}/my-dives`, mobileOnly: true },
              ].map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className={`flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-white to-blue-50 p-3 text-[#062a60] transition-all hover:-translate-y-1 hover:shadow-lg lg:bg-[#003d70]/75 lg:text-white ${cat.mobileOnly ? 'lg:hidden' : ''}`}
                >
                  <span className="text-2xl sm:text-3xl">{cat.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-text-primary dark:text-text-light text-center">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Recommended Section */}
          <section className="mb-8 rounded-[26px] bg-white p-4 shadow-sm sm:p-6">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-text-light">
                {isRTL ? 'מומלץ עבורך ⭐' : 'Recommended for You ⭐'}
              </h2>
              <Link
                href={`/${locale}/explore`}
                className="text-primary dark:text-cyan-accent hover:underline text-sm sm:text-base font-semibold"
              >
                {isRTL ? 'הצג הכל ←' : 'View All →'}
              </Link>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
              <div className="flex gap-4 min-w-min">
                {diveSites.map((site) => (
                  <div
                    key={site.id}
                    className="flex-shrink-0 w-64 sm:w-72 rounded-2xl overflow-hidden bg-white border border-slate-100 dark:bg-dark-surface shadow-md hover:shadow-xl transition-shadow"
                  >
                    {/* Image */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-accent/30 to-primary/30 overflow-hidden">
                      <img
                        src={site.image_url || getDiveSiteImage(site.name)}
                        alt={site.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
                          <span className="hidden sm:inline capitalize">{site.difficulty}</span>
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-text-primary dark:text-text-light line-clamp-2 mb-2">
                        {site.name}
                      </h3>
                      <p className="text-sm text-text-secondary dark:text-text-secondary-light flex items-center gap-2 mb-3">
                        <span>📍</span>
                        <span className="line-clamp-1">{site.location}</span>
                      </p>
                      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-light">
                        <span>🌊</span>
                        <span>{site.depth}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: 30% on desktop - Search Panel */}
        <aside className="w-full lg:w-[30%] hidden md:block sticky top-20 h-fit">
          <Card variant="elevated" className="rounded-[26px] border-0 bg-white p-6 shadow-xl">
            {/* Title with Underline */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-text-primary dark:text-text-light pb-3 border-b-4 border-primary">
                {isRTL ? 'חיפוש צלילה' : 'Find a Dive'}
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-border-primary dark:border-border-dark">
              {[
                { id: 'dive', label: isRTL ? 'צלילה' : 'Dive' },
                { id: 'site', label: isRTL ? 'אתר צלילה' : 'Dive Site' },
                { id: 'group', label: isRTL ? 'קבוצת קנייה' : 'Group Buy' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`px-4 py-2 font-semibold text-sm transition-colors ${
                    tab.id === 'dive'
                      ? 'text-primary dark:text-cyan-accent border-b-2 border-primary dark:border-cyan-accent'
                      : 'text-text-secondary dark:text-text-secondary-light hover:text-text-primary dark:hover:text-text-light'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              {/* Dropdown 1: Dive Site */}
              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-text-light mb-2">
                  {isRTL ? '📍 בחר אתר צלילה' : '📍 Choose Dive Site'}
                </label>
                <select className="w-full px-4 py-2 rounded-lg border border-border-primary dark:border-border-dark bg-bg-secondary dark:bg-dark-surface text-text-primary dark:text-text-light focus:border-primary dark:focus:border-cyan-accent focus:ring-1 focus:ring-primary dark:focus:ring-cyan-accent">
                  <option>
                    {isRTL ? '-- בחר אתר --' : '-- Select Site --'}
                  </option>
                  {diveSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Date */}
              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-text-light mb-2">
                  {isRTL ? '📅 בחר תאריך' : '📅 Choose Date'}
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-lg border border-border-primary dark:border-border-dark bg-bg-secondary dark:bg-dark-surface text-text-primary dark:text-text-light focus:border-primary dark:focus:border-cyan-accent focus:ring-1 focus:ring-primary dark:focus:ring-cyan-accent"
                />
              </div>

              {/* Dropdown 3: Diver Level */}
              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-text-light mb-2">
                  {isRTL ? '🎓 דרגת צולל' : '🎓 Diver Level'}
                </label>
                <select className="w-full px-4 py-2 rounded-lg border border-border-primary dark:border-border-dark bg-bg-secondary dark:bg-dark-surface text-text-primary dark:text-text-light focus:border-primary dark:focus:border-cyan-accent focus:ring-1 focus:ring-primary dark:focus:ring-cyan-accent">
                  <option>{isRTL ? 'Advanced Open Water' : 'Advanced Open Water'}</option>
                  <option>{isRTL ? 'Rescue Diver' : 'Rescue Diver'}</option>
                  <option>{isRTL ? 'Divemaster' : 'Divemaster'}</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <Button
              fullWidth
              className="mb-6 bg-primary hover:bg-primary-dark text-white font-semibold"
            >
              {isRTL ? '🔍 חפש' : '🔍 Search'}
            </Button>

            {/* Divider */}
            <div className="border-t border-border-primary dark:border-border-dark my-6" />

            {/* Upcoming Dives */}
            <div>
              <h4 className="text-lg font-bold text-text-primary dark:text-text-light mb-4">
                {isRTL ? 'הצלילות הקרובות שלך 📅' : 'Your Upcoming Dives 📅'}
              </h4>

              <Card
                variant="elevated"
                className="p-4 hover:border-primary dark:hover:border-cyan-accent"
              >
                <div className="flex gap-4">
                  {/* Circular Image */}
                  <div className="flex-shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=80&h=80&fit=crop"
                      alt="Shark Reef"
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary dark:border-cyan-accent"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h5 className="font-bold text-text-primary dark:text-text-light mb-1">
                      {isRTL ? 'שונית הכרישים' : 'Shark Reef'}
                    </h5>
                    <p className="text-xs text-text-secondary dark:text-text-secondary-light mb-2">
                      {isRTL ? '📅 יוני 25, 2024' : '📅 June 25, 2024'}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-text-secondary-light">
                      {isRTL ? '👥 עם: אלכס & דניאלה' : '👥 With: Alex & Daniella'}
                    </p>
                  </div>
                </div>

                {/* Details Button */}
                <Button
                  fullWidth
                  variant="secondary"
                  className="mt-4 border-primary dark:border-cyan-accent text-primary dark:text-cyan-accent hover:bg-primary/10 dark:hover:bg-cyan-accent/10"
                >
                  {isRTL ? 'פרטי הצלילה ←' : 'Dive Details →'}
                </Button>
              </Card>
            </div>
          </Card>
        </aside>
      </div>

    </div>
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
  if (normalized.includes('blue hole')) return 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=900&h=600&fit=crop';
  if (normalized.includes('palau')) return 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=900&h=600&fit=crop';
  if (normalized.includes('barrier')) return 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=900&h=600&fit=crop';
  return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&h=600&fit=crop';
}
