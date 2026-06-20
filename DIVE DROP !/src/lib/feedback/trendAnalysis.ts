/**
 * Feedback Trend Analysis Utility
 * Calculates and aggregates feedback trends over different time periods
 */

import { createClient } from '@/lib/supabase/server';
import type { AggregatedConditions } from '@/types/feedback';

// ============================================================================
// TREND DATA TYPES
// ============================================================================

export interface DailyTrend {
  date: string;
  visibility_avg: number;
  temperature_avg: number;
  current_avg: number;
  count: number;
  species_counts: Record<string, number>;
}

export interface WeeklyTrend {
  week: string;
  visibility_avg: number;
  temperature_avg: number;
  current_avg: number;
  count: number;
  species_counts: Record<string, number>;
}

export interface SeasonalTrend {
  month: string;
  visibility_avg: number;
  temperature_avg: number;
  current_avg: number;
  count: number;
  species_counts: Record<string, number>;
}

export interface TrendAnalysisResult {
  siteId: string;
  period: string;
  trends: DailyTrend[] | WeeklyTrend[] | SeasonalTrend[];
  totalFeedbackCount: number;
  dataQuality: {
    hasData: boolean;
    minimumThreshold: number;
    actualCount: number;
    percentageFilled: number;
  };
  generatedAt: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get ISO week number for a given date
 * Used for grouping data by week
 */
function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get month string in YYYY-MM format
 */
function getMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate percentage of days/weeks/months with data
 */
function calculatePercentageFilled(
  dataCount: number,
  expectedCount: number
): number {
  if (expectedCount === 0) return 0;
  return Math.round((dataCount / expectedCount) * 100);
}

// ============================================================================
// MAIN TREND CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate daily trends for a dive site
 * @param siteId - UUID of the dive site
 * @param days - Number of days to look back (default: 30)
 * @returns Array of daily trend data with averages
 */
export async function calculateDailyTrend(
  siteId: string,
  days: number = 30
): Promise<TrendAnalysisResult> {
  const supabase = (await createClient()) as any;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  try {
    // Query feedback data for the specified period
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .select(
        `
        id,
        visibility_meters,
        temperature_celsius,
        current_strength,
        marine_life,
        created_at
        `
      )
      .eq('dive_site_id', siteId)
      .gte('created_at', `${startDateStr}T00:00:00Z`)
      .order('created_at', { ascending: true });

    if (feedbackError) {
      console.error('Error fetching feedback data:', feedbackError);
      throw new Error(`Failed to fetch feedback data: ${feedbackError.message}`);
    }

    // Group feedback by date
    const groupedByDate = new Map<string, any[]>();
    (feedbackData || []).forEach((entry: any) => {
      const dateStr = entry.created_at.split('T')[0];
      if (!groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, []);
      }
      groupedByDate.get(dateStr)!.push(entry);
    });

    // Calculate daily aggregates
    const dailyTrends: DailyTrend[] = [];
    groupedByDate.forEach((entries, date) => {
      if (entries.length === 0) return;

      let visibilitySum = 0;
      let temperatureSum = 0;
      let currentSum = 0;
      const speciesCounts: Record<string, number> = {};

      entries.forEach((entry: any) => {
        visibilitySum += Number(entry.visibility_meters) || 0;
        temperatureSum += Number(entry.temperature_celsius) || 0;
        currentSum += Number(entry.current_strength) || 0;

        if (entry.marine_life && Array.isArray(entry.marine_life)) {
          entry.marine_life.forEach((species: string) => {
            speciesCounts[species] = (speciesCounts[species] || 0) + 1;
          });
        }
      });

      dailyTrends.push({
        date,
        visibility_avg: Math.round((visibilitySum / entries.length) * 10) / 10,
        temperature_avg: Math.round((temperatureSum / entries.length) * 10) / 10,
        current_avg: Math.round((currentSum / entries.length) * 10) / 10,
        count: entries.length,
        species_counts: speciesCounts,
      });
    });

    // Calculate data quality metrics
    const totalDays = days;
    const daysWithData = dailyTrends.length;
    const totalFeedback = feedbackData?.length || 0;

    return {
      siteId,
      period: `${days}-day`,
      trends: dailyTrends.sort((a, b) => a.date.localeCompare(b.date)),
      totalFeedbackCount: totalFeedback,
      dataQuality: {
        hasData: daysWithData > 0,
        minimumThreshold: Math.ceil(totalDays * 0.2), // 20% coverage target
        actualCount: daysWithData,
        percentageFilled: calculatePercentageFilled(daysWithData, totalDays),
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calculating daily trends:', error);
    throw error;
  }
}

/**
 * Calculate weekly trends for a dive site
 * @param siteId - UUID of the dive site
 * @param weeks - Number of weeks to look back (default: 12)
 * @returns Array of weekly trend data with averages
 */
export async function calculateWeeklyTrend(
  siteId: string,
  weeks: number = 12
): Promise<TrendAnalysisResult> {
  const supabase = (await createClient()) as any;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);
  const startDateStr = startDate.toISOString().split('T')[0];

  try {
    // Query feedback data for the specified period
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .select(
        `
        id,
        visibility_meters,
        temperature_celsius,
        current_strength,
        marine_life,
        created_at
        `
      )
      .eq('dive_site_id', siteId)
      .gte('created_at', `${startDateStr}T00:00:00Z`)
      .order('created_at', { ascending: true });

    if (feedbackError) {
      console.error('Error fetching feedback data:', feedbackError);
      throw new Error(`Failed to fetch feedback data: ${feedbackError.message}`);
    }

    // Group feedback by week
    const groupedByWeek = new Map<string, any[]>();
    (feedbackData || []).forEach((entry: any) => {
      const date = new Date(entry.created_at);
      const weekStr = getWeekNumber(date);
      if (!groupedByWeek.has(weekStr)) {
        groupedByWeek.set(weekStr, []);
      }
      groupedByWeek.get(weekStr)!.push(entry);
    });

    // Calculate weekly aggregates
    const weeklyTrends: WeeklyTrend[] = [];
    groupedByWeek.forEach((entries, week) => {
      if (entries.length === 0) return;

      let visibilitySum = 0;
      let temperatureSum = 0;
      let currentSum = 0;
      const speciesCounts: Record<string, number> = {};

      entries.forEach((entry: any) => {
        visibilitySum += Number(entry.visibility_meters) || 0;
        temperatureSum += Number(entry.temperature_celsius) || 0;
        currentSum += Number(entry.current_strength) || 0;

        if (entry.marine_life && Array.isArray(entry.marine_life)) {
          entry.marine_life.forEach((species: string) => {
            speciesCounts[species] = (speciesCounts[species] || 0) + 1;
          });
        }
      });

      weeklyTrends.push({
        week,
        visibility_avg: Math.round((visibilitySum / entries.length) * 10) / 10,
        temperature_avg: Math.round((temperatureSum / entries.length) * 10) / 10,
        current_avg: Math.round((currentSum / entries.length) * 10) / 10,
        count: entries.length,
        species_counts: speciesCounts,
      });
    });

    // Calculate data quality metrics
    const weeksWithData = weeklyTrends.length;
    const totalFeedback = feedbackData?.length || 0;

    return {
      siteId,
      period: `${weeks}-week`,
      trends: weeklyTrends.sort((a, b) => a.week.localeCompare(b.week)),
      totalFeedbackCount: totalFeedback,
      dataQuality: {
        hasData: weeksWithData > 0,
        minimumThreshold: Math.ceil(weeks * 0.25), // 25% coverage target
        actualCount: weeksWithData,
        percentageFilled: calculatePercentageFilled(weeksWithData, weeks),
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calculating weekly trends:', error);
    throw error;
  }
}

/**
 * Calculate seasonal/monthly trends for a dive site
 * @param siteId - UUID of the dive site
 * @param months - Number of months to look back (default: 12)
 * @returns Array of monthly trend data with averages
 */
export async function calculateSeasonalTrend(
  siteId: string,
  months: number = 12
): Promise<TrendAnalysisResult> {
  const supabase = (await createClient()) as any;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startDateStr = startDate.toISOString().split('T')[0];

  try {
    // Query feedback data for the specified period
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .select(
        `
        id,
        visibility_meters,
        temperature_celsius,
        current_strength,
        marine_life,
        created_at
        `
      )
      .eq('dive_site_id', siteId)
      .gte('created_at', `${startDateStr}T00:00:00Z`)
      .order('created_at', { ascending: true });

    if (feedbackError) {
      console.error('Error fetching feedback data:', feedbackError);
      throw new Error(`Failed to fetch feedback data: ${feedbackError.message}`);
    }

    // Group feedback by month
    const groupedByMonth = new Map<string, any[]>();
    (feedbackData || []).forEach((entry: any) => {
      const date = new Date(entry.created_at);
      const monthStr = getMonthString(date);
      if (!groupedByMonth.has(monthStr)) {
        groupedByMonth.set(monthStr, []);
      }
      groupedByMonth.get(monthStr)!.push(entry);
    });

    // Calculate monthly aggregates
    const seasonalTrends: SeasonalTrend[] = [];
    groupedByMonth.forEach((entries, month) => {
      if (entries.length === 0) return;

      let visibilitySum = 0;
      let temperatureSum = 0;
      let currentSum = 0;
      const speciesCounts: Record<string, number> = {};

      entries.forEach((entry: any) => {
        visibilitySum += Number(entry.visibility_meters) || 0;
        temperatureSum += Number(entry.temperature_celsius) || 0;
        currentSum += Number(entry.current_strength) || 0;

        if (entry.marine_life && Array.isArray(entry.marine_life)) {
          entry.marine_life.forEach((species: string) => {
            speciesCounts[species] = (speciesCounts[species] || 0) + 1;
          });
        }
      });

      seasonalTrends.push({
        month,
        visibility_avg: Math.round((visibilitySum / entries.length) * 10) / 10,
        temperature_avg: Math.round((temperatureSum / entries.length) * 10) / 10,
        current_avg: Math.round((currentSum / entries.length) * 10) / 10,
        count: entries.length,
        species_counts: speciesCounts,
      });
    });

    // Calculate data quality metrics
    const monthsWithData = seasonalTrends.length;
    const totalFeedback = feedbackData?.length || 0;

    return {
      siteId,
      period: `${months}-month`,
      trends: seasonalTrends.sort((a, b) => a.month.localeCompare(b.month)),
      totalFeedbackCount: totalFeedback,
      dataQuality: {
        hasData: monthsWithData > 0,
        minimumThreshold: Math.ceil(months * 0.3), // 30% coverage target
        actualCount: monthsWithData,
        percentageFilled: calculatePercentageFilled(monthsWithData, months),
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calculating seasonal trends:', error);
    throw error;
  }
}

/**
 * Get insights about best conditions from recent feedback
 * @param siteId - UUID of the dive site
 * @param days - Number of days to analyze (default: 30)
 * @returns Object containing various insights about the dive site
 */
export async function getInsights(
  siteId: string,
  days: number = 30
): Promise<{
  bestConditionsDay: { date: string; visibility: number; temperature: number } | null;
  commonSpecies: Array<{ species: string; count: number }>;
  visibilityTrend: 'improving' | 'declining' | 'stable';
  temperatureRange: { min: number; max: number };
  feedbackCount: number;
}> {
  const supabase = (await createClient()) as any;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  try {
    const { data: feedbackData, error } = await supabase
      .from('feedback')
      .select(
        `
        id,
        visibility_meters,
        temperature_celsius,
        marine_life,
        created_at
        `
      )
      .eq('dive_site_id', siteId)
      .gte('created_at', `${startDateStr}T00:00:00Z`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching insights data:', error);
      throw new Error(`Failed to fetch feedback data: ${error.message}`);
    }

    const data = feedbackData || [];

    // Find best conditions day (highest visibility + temperature)
    let bestDay: { date: string; visibility: number; temperature: number } | null = null;
    let bestScore = -1;

    const dailyStats = new Map<string, { visibility: number[]; temperature: number[] }>();
    data.forEach((entry: any) => {
      const dateStr = entry.created_at.split('T')[0];
      if (!dailyStats.has(dateStr)) {
        dailyStats.set(dateStr, { visibility: [], temperature: [] });
      }
      const stats = dailyStats.get(dateStr)!;
      stats.visibility.push(Number(entry.visibility_meters) || 0);
      stats.temperature.push(Number(entry.temperature_celsius) || 0);
    });

    dailyStats.forEach((stats, date) => {
      const avgVis = stats.visibility.reduce((a, b) => a + b, 0) / stats.visibility.length;
      const avgTemp = stats.temperature.reduce((a, b) => a + b, 0) / stats.temperature.length;
      const score = avgVis * 0.6 + avgTemp * 0.4; // Weight visibility more heavily

      if (score > bestScore) {
        bestScore = score;
        bestDay = { date, visibility: Math.round(avgVis * 10) / 10, temperature: Math.round(avgTemp * 10) / 10 };
      }
    });

    // Calculate common species
    const speciesCounts: Record<string, number> = {};
    data.forEach((entry: any) => {
      if (entry.marine_life && Array.isArray(entry.marine_life)) {
        entry.marine_life.forEach((species: string) => {
          speciesCounts[species] = (speciesCounts[species] || 0) + 1;
        });
      }
    });

    const commonSpecies = Object.entries(speciesCounts)
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Determine visibility trend (compare first and second halves)
    let visibilityTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (data.length >= 4) {
      const mid = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, mid).map((e: any) => Number(e.visibility_meters) || 0);
      const secondHalf = data.slice(mid).map((e: any) => Number(e.visibility_meters) || 0);

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = avgSecond - avgFirst;
      if (change > 2) {
        visibilityTrend = 'improving';
      } else if (change < -2) {
        visibilityTrend = 'declining';
      }
    }

    // Temperature range
    const temperatures = data.map((e: any) => Number(e.temperature_celsius) || 0);
    const temperatureRange = {
      min: temperatures.length > 0 ? Math.min(...temperatures) : 0,
      max: temperatures.length > 0 ? Math.max(...temperatures) : 0,
    };

    return {
      bestConditionsDay: bestDay,
      commonSpecies,
      visibilityTrend,
      temperatureRange,
      feedbackCount: data.length,
    };
  } catch (error) {
    console.error('Error getting insights:', error);
    throw error;
  }
}
