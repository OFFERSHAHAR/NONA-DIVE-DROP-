import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { BottomNavigation, BottomNavigationPresets } from '@/components/templates/BottomNavigation';
import { LogoutButton } from '@/components/LogoutButton';
import { AppIcon } from '@/components/AppIcon';
import Link from 'next/link';

interface DiveStats {
  totalDives: number;
  uniqueSites: number;
  totalBottomTime: number;
  averageDepth: number;
  latestDiveDate: string | null;
}

interface RecentDive {
  id: string;
  siteName: string;
  date: string;
  depth: number | null;
  bottomTime: number;
}

interface RecommendedSite {
  id: string;
  name: string;
  location: string;
  difficulty: 'easy' | 'intermediate' | 'hard';
  depth: number;
  imageUrl: string | null;
}

async function getDiveStats(userId: string): Promise<DiveStats> {
  const supabase = await createClient();

  // Get total dives
  const { count: diveCount } = await supabase
    .from('dive_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const safeDiveCount = diveCount || 0;

  // Get unique sites
  const { data: siteData } = await supabase
    .from('dive_logs')
    .select('dive_site_id')
    .eq('user_id', userId);

  const safeSiteData = siteData || [];

  // Get total bottom time and average depth
  const { data: statsData } = await supabase
    .from('dive_logs')
    .select('bottom_time_minutes, max_depth_m, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const safeStatsData = statsData || [];
  const totalBottomTime = safeStatsData.reduce((sum, dive) => sum + (dive.bottom_time_minutes || 0), 0);
  const depths = safeStatsData
    .map((dive) => dive.max_depth_m)
    .filter((depth): depth is number => depth !== null);
  const averageDepth =
    depths.length > 0 ? Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10 : 0;

  const latestDiveDate = safeStatsData.length > 0 ? safeStatsData[0].created_at : null;

  return {
    totalDives: safeDiveCount,
    uniqueSites: new Set(safeSiteData.map((d) => d.dive_site_id)).size,
    totalBottomTime,
    averageDepth,
    latestDiveDate,
  };
}

async function getRecentDives(userId: string, limit: number = 5): Promise<RecentDive[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('dive_logs')
    .select('id, dive_site_id, created_at, max_depth_m, bottom_time_minutes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const safeData = data || [];

  // Fetch dive site names
  const diveIds = safeData.map((d) => d.dive_site_id).filter((id): id is string => id !== null);
  let siteMap: Record<string, string> = {};

  if (diveIds.length > 0) {
    const { data: sites } = await supabase
      .from('dive_sites')
      .select('id, name')
      .in('id', diveIds);

    if (sites) {
      siteMap = Object.fromEntries(sites.map((s) => [s.id, s.name]));
    }
  }

  return safeData.map((dive) => ({
    id: dive.id,
    siteName: dive.dive_site_id ? siteMap[dive.dive_site_id] || 'Unknown Site' : 'Unknown Site',
    date: new Date(dive.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    depth: dive.max_depth_m,
    bottomTime: dive.bottom_time_minutes,
  }));
}

async function getRecommendedSites(limit: number = 3): Promise<RecommendedSite[]> {
  const supabase = await createClient();

  // Get all sites and shuffle to show random ones
  const { data } = await supabase
    .from('dive_sites')
    .select('id, name, location, difficulty, depth, image_url')
    .limit(100);

  const safeData = data || [];

  // Shuffle and pick random sites
  const shuffled = [...safeData].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, limit).map((site) => ({
    id: site.id,
    name: site.name,
    location: site.location,
    difficulty: site.difficulty as 'easy' | 'intermediate' | 'hard',
    depth: site.depth,
    imageUrl: site.image_url,
  }));
}

const difficultyColors = {
  easy: 'text-green-600 bg-green-50',
  intermediate: 'text-yellow-600 bg-yellow-50',
  hard: 'text-red-600 bg-red-50',
};

const difficultyBadgeClasses = {
  easy: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

function StatCard({ icon, label, value, unit }: { icon: string; label: string; value: string | number; unit?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary">
            {value}
            {unit && <span className="text-sm text-text-secondary ml-1">{unit}</span>}
          </p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </Card>
  );
}

async function DashboardContent({ locale, userId, userName }: { locale: string; userId: string; userName?: string }) {
  const [stats, recentDives, recommendedSites] = await Promise.all([
    getDiveStats(userId),
    getRecentDives(userId),
    getRecommendedSites(3),
  ]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-light-bg via-blue-50 to-light-surface dark:from-dark-bg dark:via-dark-surface dark:to-dark-surface-elevated pb-24 md:pb-8">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary-light text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 leading-tight">
                {userName ? `Welcome back, ${userName.split(' ')[0]}!` : 'Welcome back!'}
              </h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg">
                Track your underwater adventures and explore the world
              </p>
            </div>
            <LogoutButton />
          </div>

          {/* Quick Stats Summary - Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20 hover:bg-white/20 transition-colors">
              <p className="text-blue-100 text-xs sm:text-sm mb-1 sm:mb-2">Total Dives</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalDives}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20 hover:bg-white/20 transition-colors">
              <p className="text-blue-100 text-xs sm:text-sm mb-1 sm:mb-2">Dive Sites</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.uniqueSites}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20 hover:bg-white/20 transition-colors">
              <p className="text-blue-100 text-xs sm:text-sm mb-1 sm:mb-2">Bottom Time</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stats.totalBottomTime}
                <span className="text-lg">m</span>
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20 hover:bg-white/20 transition-colors">
              <p className="text-blue-100 text-xs sm:text-sm mb-1 sm:mb-2">Avg Depth</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stats.averageDepth}
                <span className="text-lg">m</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Main Grid Layout - Recent Dives + Recommended Sites */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Recent Dives Section */}
          <div className="lg:col-span-2">
            <Card variant="elevated" hover={false}>
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-text-primary dark:text-text-light">
                      Recent Dives
                    </h2>
                    <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-light mt-1">
                      Your latest diving adventures
                    </p>
                  </div>
                  <Link href={`/${locale}/my-dives`} className="flex-shrink-0">
                    <Button variant="ghost" size="sm">
                      View All →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {recentDives.length > 0 ? (
                  <div className="divide-y divide-border-primary dark:divide-border-dark">
                    {recentDives.map((dive, idx) => (
                      <div
                        key={dive.id}
                        className="px-4 sm:px-6 py-4 sm:py-6 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated transition-colors group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-transform group-hover:scale-110">
                            <AppIcon name={idx < 3 ? 'award' : 'diver'} className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-primary dark:text-text-light text-sm sm:text-base truncate">
                              {dive.siteName}
                            </p>
                            <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-light">
                              {dive.date}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs sm:text-sm font-medium text-text-primary dark:text-text-light whitespace-nowrap">
                              {dive.depth ? `${dive.depth}m` : 'N/A'}
                            </p>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-light">
                              {dive.bottomTime}m
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 sm:px-6 py-12 sm:py-16 text-center">
                    <AppIcon name="diver" className="mx-auto mb-4 h-14 w-14 text-blue-600" />
                    <p className="text-text-secondary dark:text-text-secondary-light mb-6 text-sm sm:text-base font-medium">
                      No dives logged yet
                    </p>
                    <Link href={`/${locale}/explore`}>
                      <Button variant="primary" size="lg">
                        Explore Dive Sites and Log Your First Dive
                      </Button>
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Latest Dive Info */}
            {stats.latestDiveDate && (
              <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-primary/10 dark:to-accent/10 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-3 sm:gap-4">
                <AppIcon name="star-filled" className="h-9 w-9 flex-shrink-0 text-cyan-500" />
                <div>
                  <p className="text-xs text-text-secondary dark:text-text-secondary-light font-medium uppercase tracking-wide">
                    Last Dive
                  </p>
                  <p className="text-base sm:text-lg font-bold text-primary dark:text-accent">
                    {new Date(stats.latestDiveDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recommended Sites Section */}
          <div>
            <Card variant="elevated" hover={false}>
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary dark:text-text-light">
                  Recommended Sites
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-light mt-1 sm:mt-2">
                  Based on your experience
                </p>
              </CardHeader>
              <CardBody className="p-0 space-y-0">
                {recommendedSites.length > 0 ? (
                  recommendedSites.map((site, idx) => (
                    <div key={site.id} className="border-b border-border-primary dark:border-border-dark last:border-b-0">
                      <div className="px-4 sm:px-6 py-4 sm:py-6 hover:bg-bg-secondary dark:hover:bg-dark-surface-elevated transition-colors group cursor-pointer">
                        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <AppIcon name={idx === 0 ? 'star-filled' : 'star'} className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-primary dark:text-text-light text-sm sm:text-base leading-tight line-clamp-2">
                              {site.name}
                            </p>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-light mt-1 line-clamp-1">
                              {site.location}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                          <span
                            className={`text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full ${
                              difficultyBadgeClasses[site.difficulty]
                            }`}
                          >
                            {site.difficulty}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-medium text-text-secondary dark:text-text-secondary-light">
                            <AppIcon name="depth" className="h-4 w-4" />{site.depth}m
                          </span>
                        </div>
                        <Link href={`/${locale}/explore`} className="w-full">
                          <Button variant="outline" size="sm" fullWidth className="text-center text-xs sm:text-sm">
                            View Site
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-text-secondary">No recommendations yet</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        items={BottomNavigationPresets.diveDropMain('home').map((item) => ({
          ...item,
          href: `/${locale}${item.href}`,
        }))}
        activeId="home"
      />
    </div>
  );
}

export default async function DashboardPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Get user profile info
  const supabase = await createClient();
  const { data: profile } = await supabase.from('users').select('first_name, last_name').eq('id', user.id).single();

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : user.email;

  return <DashboardContent locale={locale} userId={user.id} userName={userName} />;
}
