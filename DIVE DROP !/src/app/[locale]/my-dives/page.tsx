import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader } from '@/components/Card';
import type { Database } from '@/types/supabase';

type DiveLog = Database['public']['Tables']['dive_logs']['Row'];
type DiveSite = Database['public']['Tables']['dive_sites']['Row'];

interface DiveRecord {
  id: string;
  user_id: string;
  dive_site_id: string | null;
  bottom_time_minutes: number;
  max_depth_m: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type MyDivesSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MyDivesPage({ searchParams }: { searchParams: MyDivesSearchParams }) {
  const locale = await getLocale();
  const t = await getTranslations('my_dives');
  const user = await getCurrentUser();
  const query = await searchParams;
  const selectedSite = typeof query.site === 'string' ? query.site : '';

  // Redirect to login if not authenticated
  if (!user) {
    const destination = `/${locale}/my-dives${selectedSite ? `?site=${encodeURIComponent(selectedSite)}` : ''}`;
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(destination)}`);
  }

  const supabase = await createClient();

  // Fetch user's dive logs
  const { data: diveLogs } = await supabase
    .from('dive_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const dives: DiveRecord[] = (diveLogs as DiveRecord[]) || [];

  // Calculate statistics
  const stats = {
    totalDives: dives.length,
    avgDepth:
      dives.length > 0
        ? Math.round(
            dives.reduce((sum, dive) => sum + (dive.max_depth_m || 0), 0) /
              dives.length
          )
        : 0,
    totalBottomTime:
      dives.length > 0
        ? dives.reduce((sum, dive) => sum + dive.bottom_time_minutes, 0)
        : 0,
    firstDive: dives.length > 0 ? dives[dives.length - 1]?.created_at : null,
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time helper (hours and minutes)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} ${t('minutes')}`;
  };

  const isRtl = locale === 'he';

  return (
    <div className={`min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 p-4 sm:p-8 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">
            {t('title')}
          </h1>
          <p className="text-text-secondary text-lg">{t('subtitle')}</p>
        </div>

        {/* Statistics Section */}
        {dives.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Dives Stat */}
            <Card variant="elevated">
              <CardBody>
                <p className="text-text-secondary text-sm font-medium mb-1">
                  {t('total_dives')}
                </p>
                <p className="text-3xl font-bold text-primary">
                  {stats.totalDives}
                </p>
              </CardBody>
            </Card>

            {/* Average Depth Stat */}
            <Card variant="elevated">
              <CardBody>
                <p className="text-text-secondary text-sm font-medium mb-1">
                  {t('avg_depth')}
                </p>
                <p className="text-3xl font-bold text-primary">
                  {stats.avgDepth}
                  <span className="text-lg text-text-secondary ms-1">{t('meters')}</span>
                </p>
              </CardBody>
            </Card>

            {/* Total Bottom Time Stat */}
            <Card variant="elevated">
              <CardBody>
                <p className="text-text-secondary text-sm font-medium mb-1">
                  {t('total_bottom_time')}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatTime(stats.totalBottomTime)}
                </p>
              </CardBody>
            </Card>

            {/* First Dive Stat */}
            <Card variant="elevated">
              <CardBody>
                <p className="text-text-secondary text-sm font-medium mb-1">
                  {t('first_dive')}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {formatDate(stats.firstDive)}
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {dives.length === 0 && (
          <Card variant="elevated" className="mb-8">
            <CardBody className="text-center py-12">
              <p className="text-2xl font-semibold text-primary mb-2">
                {t('no_dives')}
              </p>
              <p className="text-text-secondary mb-6">
                {t('add_first_dive')}
              </p>
              <Link
                href={`/${locale}/dashboard`}
                className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {t('add_first_dive')}
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Dives List */}
        {dives.length > 0 && (
          <div className="space-y-4">
            {dives.map((dive) => (
              <Link
                key={dive.id}
                href={`/${locale}/dive/${dive.id}`}
                className="block group"
              >
                <Card
                  variant="elevated"
                  className="group-hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Date */}
                      <div>
                        <p className="text-text-secondary text-sm font-medium mb-1">
                          {t('dive_date')}
                        </p>
                        <p className="text-lg font-semibold text-primary">
                          {formatDate(dive.created_at)}
                        </p>
                      </div>

                      {/* Site Name & Location */}
                      <div>
                        <p className="text-text-secondary text-sm font-medium mb-1">
                          {t('site')}
                        </p>
                        <p className="text-lg font-semibold text-primary">
                          Unknown Site
                        </p>
                        <p className="text-sm text-text-secondary">
                          —
                        </p>
                      </div>

                      {/* Stats Row */}
                      <div className="space-y-2">
                        {/* Depth */}
                        <div>
                          <p className="text-text-secondary text-sm font-medium">
                            {t('depth')}
                          </p>
                          <p className="text-base font-semibold text-primary">
                            {dive.max_depth_m ? `${dive.max_depth_m} ${t('meters')}` : '—'}
                          </p>
                        </div>

                        {/* Bottom Time */}
                        <div>
                          <p className="text-text-secondary text-sm font-medium">
                            {t('bottom_time')}
                          </p>
                          <p className="text-base font-semibold text-primary">
                            {formatTime(dive.bottom_time_minutes)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    {dive.notes && (
                      <div className="mt-4 pt-4 border-t border-border-secondary">
                        <p className="text-text-secondary text-sm font-medium mb-1">
                          {t('notes')}
                        </p>
                        <p className="text-text-primary line-clamp-2">
                          {dive.notes}
                        </p>
                      </div>
                    )}

                    {/* View Dive Link */}
                    <div className="mt-4 flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                      <span>View Dive Details</span>
                      <span className={`transition-transform ${isRtl ? 'rotate-180' : ''}`}>
                        →
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
