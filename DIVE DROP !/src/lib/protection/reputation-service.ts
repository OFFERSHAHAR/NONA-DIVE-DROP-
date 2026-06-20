/**
 * Reputation Scoring Service
 * Calculates and manages user reputation scores based on activity and behavior
 */

import { createClient } from '@/lib/supabase/server';
import { UserReputationScore, ReputationHistory, RiskFlag } from '@/types/protection';

const REPUTATION_WEIGHTS = {
  // Positive actions (increase score)
  BOOKING_COMPLETED: 5,
  POSITIVE_REVIEW: 10,
  ON_TIME_COMPLETION: 3,

  // Negative actions (decrease score)
  BOOKING_CANCELLED: -3,
  NO_SHOW: -15,
  DAMAGE_REPORTED: -20,
  NON_PAYMENT: -25,
  COMPLAINT_FILED: -15,
  NEGATIVE_REVIEW: -10,
};

const THRESHOLDS = {
  BLACKLIST_THRESHOLD: 20, // Below 20 = automatic blacklist consideration
  HIGH_RISK: 40,
  MEDIUM_RISK: 60,
  LOW_RISK: 75,
};

export class ReputationService {
  private supabase = createClient();

  /**
   * Calculate user reputation score
   */
  async calculateReputationScore(userId: string): Promise<number> {
    const reputation = await this.getOrCreateReputation(userId);

    // Base calculation
    let score = 100; // Start at 100

    // Negative factors (subtract)
    const damageImpact = reputation.damage_count * 20;
    const nonPaymentImpact = reputation.non_payment_count * 25;
    const complaintImpact = reputation.instructor_complaints_count * 15;
    const noShowImpact = reputation.no_show_count * 15;

    score -= damageImpact;
    score -= nonPaymentImpact;
    score -= complaintImpact;
    score -= noShowImpact;

    // Cancellation rate impact
    if (reputation.total_transactions > 0) {
      const cancelRate = reputation.cancellation_rate || 0;
      score -= cancelRate * 20; // Up to -20 for 100% cancellation
    }

    // Positive factors (add)
    if (reputation.completed_rentals > 0) {
      score += Math.min(reputation.completed_rentals * 2, 10);
    }
    if (reputation.completed_bookings > 0) {
      score += Math.min(reputation.completed_bookings * 2, 10);
    }
    if (reputation.positive_reviews > 0) {
      score += Math.min(reputation.positive_reviews * 3, 15);
    }

    // Rating boost
    if (reputation.average_rating && reputation.average_rating >= 4.5) {
      score += 10;
    } else if (reputation.average_rating && reputation.average_rating < 2.0) {
      score -= 15;
    }

    // On-time completion bonus
    if (reputation.on_time_completion_rate > 95) {
      score += 10;
    }

    // Clamp score between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get or create reputation record for user
   */
  async getOrCreateReputation(userId: string): Promise<UserReputationScore> {
    const { data: existing } = await this.supabase
      .from('user_reputation_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new reputation record
    const { data: newRecord } = await this.supabase
      .from('user_reputation_scores')
      .insert({
        user_id: userId,
        total_score: 100,
        completed_rentals: 0,
        completed_trainings: 0,
        completed_bookings: 0,
        total_transactions: 0,
        damage_count: 0,
        non_payment_count: 0,
        instructor_complaints_count: 0,
        cancellation_rate: 0,
        no_show_count: 0,
        positive_reviews: 0,
        average_rating: 0,
        on_time_completion_rate: 100,
        is_blacklisted: false,
      })
      .select()
      .single();

    return newRecord!;
  }

  /**
   * Record reputation event and update score
   */
  async recordReputationEvent(
    userId: string,
    eventType: ReputationHistory['event_type'],
    scoreChange: number,
    relatedBookingId?: string,
    reason?: string
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);

    // Update reputation metrics based on event type
    const updates: Partial<UserReputationScore> = {};

    switch (eventType) {
      case 'booking_completed':
        updates.completed_bookings = (reputation.completed_bookings || 0) + 1;
        updates.total_transactions = (reputation.total_transactions || 0) + 1;
        break;
      case 'booking_cancelled':
        updates.total_transactions = (reputation.total_transactions || 0) + 1;
        if (reputation.total_transactions > 0) {
          const newCancelRate =
            ((reputation.total_transactions * reputation.cancellation_rate) / 100 + 1) /
            (reputation.total_transactions + 1);
          updates.cancellation_rate = newCancelRate * 100;
        }
        break;
      case 'damage_reported':
        updates.damage_count = (reputation.damage_count || 0) + 1;
        break;
      case 'non_payment':
        updates.non_payment_count = (reputation.non_payment_count || 0) + 1;
        break;
      case 'complaint_filed':
        updates.instructor_complaints_count =
          (reputation.instructor_complaints_count || 0) + 1;
        break;
      case 'no_show':
        updates.no_show_count = (reputation.no_show_count || 0) + 1;
        break;
      case 'positive_review':
        updates.positive_reviews = (reputation.positive_reviews || 0) + 1;
        break;
      case 'negative_review':
        // Handled separately with rating update
        break;
    }

    // Calculate new score
    const newScore = Math.max(
      0,
      Math.min(100, (reputation.total_score || 100) + scoreChange)
    );

    updates.total_score = newScore;

    // Check for automatic blacklist
    if (newScore <= THRESHOLDS.BLACKLIST_THRESHOLD && !reputation.is_blacklisted) {
      updates.is_blacklisted = true;
      updates.blacklist_date = new Date().toISOString();
    }

    // Update reputation record
    await this.supabase
      .from('user_reputation_scores')
      .update(updates)
      .eq('user_id', userId);

    // Record history
    await this.supabase.from('reputation_history').insert({
      user_id: userId,
      event_type: eventType,
      score_change: scoreChange,
      new_score: newScore,
      related_booking_id: relatedBookingId,
      reason: reason,
    });
  }

  /**
   * Update user ratings and review count
   */
  async updateUserRating(
    userId: string,
    newRating: number,
    isPositive: boolean
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);

    const currentAvg = reputation.average_rating || 0;
    const reviewCount = reputation.positive_reviews + (reputation.positive_reviews || 0); // Approximation

    const newAvg = (currentAvg * reviewCount + newRating) / (reviewCount + 1);

    const updates: Partial<UserReputationScore> = {
      average_rating: Math.round(newAvg * 100) / 100,
    };

    if (isPositive) {
      updates.positive_reviews = (reputation.positive_reviews || 0) + 1;
    }

    await this.supabase
      .from('user_reputation_scores')
      .update(updates)
      .eq('user_id', userId);
  }

  /**
   * Add damage incident
   */
  async recordDamageIncident(userId: string, severity: 'minor' | 'major'): Promise<void> {
    const scoreChange =
      severity === 'major'
        ? REPUTATION_WEIGHTS.DAMAGE_REPORTED * 2
        : REPUTATION_WEIGHTS.DAMAGE_REPORTED;

    await this.recordReputationEvent(
      userId,
      'damage_reported',
      scoreChange,
      undefined,
      `Equipment damage incident (${severity})`
    );
  }

  /**
   * Record non-payment incident
   */
  async recordNonPayment(userId: string, bookingId: string): Promise<void> {
    await this.recordReputationEvent(
      userId,
      'non_payment',
      REPUTATION_WEIGHTS.NON_PAYMENT,
      bookingId,
      'Payment not received'
    );
  }

  /**
   * Record complaint filed
   */
  async recordComplaint(userId: string, bookingId: string): Promise<void> {
    await this.recordReputationEvent(
      userId,
      'complaint_filed',
      REPUTATION_WEIGHTS.COMPLAINT_FILED,
      bookingId,
      'Complaint filed by instructor/provider'
    );
  }

  /**
   * Record no-show
   */
  async recordNoShow(userId: string, bookingId: string): Promise<void> {
    await this.recordReputationEvent(
      userId,
      'no_show',
      REPUTATION_WEIGHTS.NO_SHOW,
      bookingId,
      'Did not show up for booking'
    );
  }

  /**
   * Manual reputation adjustment (admin only)
   */
  async adjustReputation(userId: string, amount: number, notes: string): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);
    const newScore = Math.max(0, Math.min(100, (reputation.total_score || 100) + amount));

    await this.supabase
      .from('user_reputation_scores')
      .update({ total_score: newScore })
      .eq('user_id', userId);

    await this.supabase.from('reputation_history').insert({
      user_id: userId,
      event_type: 'manual_adjustment',
      score_change: amount,
      new_score: newScore,
      admin_notes: notes,
    });
  }

  /**
   * Remove blacklist status
   */
  async removeBlacklist(userId: string, adminNotes?: string): Promise<void> {
    await this.supabase
      .from('user_reputation_scores')
      .update({
        is_blacklisted: false,
        blacklist_reason: null,
        blacklist_date: null,
      })
      .eq('user_id', userId);

    if (adminNotes) {
      await this.supabase.from('reputation_history').insert({
        user_id: userId,
        event_type: 'manual_adjustment',
        score_change: 0,
        new_score: (await this.getOrCreateReputation(userId)).total_score,
        admin_notes: `Blacklist removed: ${adminNotes}`,
      });
    }
  }

  /**
   * Get reputation history
   */
  async getReputationHistory(
    userId: string,
    limit: number = 20
  ): Promise<ReputationHistory[]> {
    const { data } = await this.supabase
      .from('reputation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}
