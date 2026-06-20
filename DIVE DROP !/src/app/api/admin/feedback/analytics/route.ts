import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all feedback for analytics
    const { data: allFeedback, error: feedbackError } = await supabase
      .from('feedback')
      .select(
        `
        id,
        dive_site_id,
        visibility_meters,
        temperature_celsius,
        current_strength,
        marine_life,
        submitted_at,
        dive_sites!dive_site_id(name)
      `
      )
      .order('submitted_at', { ascending: false });

    if (feedbackError) {
      console.error('Database error:', feedbackError);
      throw new Error('Failed to fetch feedback');
    }

    if (!allFeedback || allFeedback.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalFeedback: 0,
          feedbackByDate: [],
          feedbackBySite: [],
          averageConditions: {
            visibility: 0,
            temperature: 0,
            current: 0,
          },
          topSpecies: [],
          feedbackTrend: [],
        },
      });
    }

    // Calculate total feedback
    const totalFeedback = allFeedback.length;

    // Calculate average conditions
    const avgVisibility =
      allFeedback.reduce((sum, f) => sum + f.visibility_meters, 0) /
      totalFeedback;
    const avgTemp =
      allFeedback.reduce((sum, f) => sum + f.temperature_celsius, 0) /
      totalFeedback;
    const avgCurrent =
      allFeedback.reduce((sum, f) => sum + f.current_strength, 0) /
      totalFeedback;

    // Group feedback by date
    const feedbackByDate: Record<string, number> = {};
    allFeedback.forEach(feedback => {
      const date = new Date(feedback.submitted_at)
        .toISOString()
        .split('T')[0];
      feedbackByDate[date] = (feedbackByDate[date] || 0) + 1;
    });

    const feedbackByDateArray = Object.entries(feedbackByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group feedback by site
    const feedbackBySiteMap: Record<
      string,
      {
        siteId: string;
        siteName: string;
        count: number;
        totalVisibility: number;
        totalTemp: number;
        totalCurrent: number;
      }
    > = {};

    allFeedback.forEach(feedback => {
      const siteId = feedback.dive_site_id;
      const siteName = feedback.dive_sites?.name || 'Unknown';

      if (!feedbackBySiteMap[siteId]) {
        feedbackBySiteMap[siteId] = {
          siteId,
          siteName,
          count: 0,
          totalVisibility: 0,
          totalTemp: 0,
          totalCurrent: 0,
        };
      }

      feedbackBySiteMap[siteId].count += 1;
      feedbackBySiteMap[siteId].totalVisibility += feedback.visibility_meters;
      feedbackBySiteMap[siteId].totalTemp += feedback.temperature_celsius;
      feedbackBySiteMap[siteId].totalCurrent += feedback.current_strength;
    });

    const feedbackBySite = Object.values(feedbackBySiteMap)
      .map(site => ({
        siteId: site.siteId,
        siteName: site.siteName,
        count: site.count,
        avgVisibility: site.totalVisibility / site.count,
        avgTemp: site.totalTemp / site.count,
        avgCurrent: site.totalCurrent / site.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Count species observations
    const speciesCount: Record<string, number> = {};
    allFeedback.forEach(feedback => {
      if (feedback.marine_life && Array.isArray(feedback.marine_life)) {
        feedback.marine_life.forEach(species => {
          if (species) {
            speciesCount[species] = (speciesCount[species] || 0) + 1;
          }
        });
      }
    });

    const topSpecies = Object.entries(speciesCount)
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Calculate cumulative trend
    let cumulativeCount = 0;
    const feedbackTrend = feedbackByDateArray.map(day => {
      cumulativeCount += day.count;
      return {
        date: day.date,
        cumulative: cumulativeCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalFeedback,
        feedbackByDate: feedbackByDateArray,
        feedbackBySite,
        averageConditions: {
          visibility: Math.round(avgVisibility * 10) / 10,
          temperature: Math.round(avgTemp * 10) / 10,
          current: Math.round(avgCurrent * 10) / 10,
        },
        topSpecies,
        feedbackTrend,
      },
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
