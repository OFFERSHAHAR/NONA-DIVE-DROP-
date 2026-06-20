/**
 * Risk Assessment Service
 * Evaluates user risk profile and determines protective measures needed
 */

import { createClient } from '@/lib/supabase/server';
import { RiskAssessmentResult, RiskFlag, UserReputationScore } from '@/types/protection';
import { ReputationService } from './reputation-service';

const RISK_THRESHOLDS = {
  CRITICAL: 70, // Score >= 70
  HIGH: 50, // Score >= 50
  MEDIUM: 30, // Score >= 30
  LOW: 0, // Score >= 0
};

export class RiskAssessmentService {
  private supabase = createClient();
  private reputationService = new ReputationService();

  /**
   * Perform comprehensive risk assessment for a user
   */
  async assessUserRisk(userId: string): Promise<RiskAssessmentResult> {
    const reputation = await this.reputationService.getOrCreateReputation(userId);

    // Calculate risk score (inverse of reputation)
    const riskScore = 100 - reputation.total_score;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
      riskLevel = 'critical';
    } else if (riskScore >= RISK_THRESHOLDS.HIGH) {
      riskLevel = 'high';
    } else if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
      riskLevel = 'medium';
    }

    // Gather red flags
    const redFlags = this.identifyRedFlags(reputation);

    // Determine protective measures
    const isBlockedFromBooking = this.shouldBlockFromBooking(reputation, riskLevel);
    const isBlockedFromRenting = this.shouldBlockFromRenting(reputation, riskLevel);
    const requiresDeposit = this.shouldRequireDeposit(reputation, riskLevel);
    const requiresPaymentUpfront = this.shouldRequirePaymentUpfront(
      reputation,
      riskLevel
    );
    const requiresReferences = this.shouldRequireReferences(reputation, riskLevel);

    // Assessment reason
    const reasons = [];
    if (reputation.is_blacklisted) reasons.push('User is blacklisted');
    if (reputation.damage_count >= 2) reasons.push('Multiple damage incidents');
    if (reputation.non_payment_count >= 1) reasons.push('Non-payment history');
    if (reputation.instructor_complaints_count >= 1)
      reasons.push('Provider complaints');
    if (riskLevel !== 'low') reasons.push(`Risk level: ${riskLevel}`);

    return {
      user_id: userId,
      risk_level: riskLevel,
      risk_score: riskScore,
      is_blocked_from_booking: isBlockedFromBooking,
      is_blocked_from_renting: isBlockedFromRenting,
      requires_deposit: requiresDeposit,
      requires_payment_upfront: requiresPaymentUpfront,
      requires_references: requiresReferences,
      red_flags: redFlags,
      assessment_reason:
        reasons.length > 0 ? reasons.join('; ') : 'User meets standard criteria',
      last_assessed_at: new Date().toISOString(),
    };
  }

  /**
   * Identify red flags for user
   */
  private identifyRedFlags(reputation: UserReputationScore): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // Blacklist flag
    if (reputation.is_blacklisted) {
      flags.push({
        type: 'blacklisted',
        severity: 'critical',
        description: `User is blacklisted${reputation.blacklist_reason ? `: ${reputation.blacklist_reason}` : ''}`,
        data: {
          blacklist_date: reputation.blacklist_date,
          blacklist_expiry: reputation.blacklist_expiry,
        },
      });
    }

    // Equipment damage flag
    if (reputation.damage_count >= 2) {
      flags.push({
        type: 'equipment_damage_history',
        severity: reputation.damage_count >= 4 ? 'critical' : 'high',
        description: `${reputation.damage_count} equipment damage incidents reported`,
        data: { damage_count: reputation.damage_count },
      });
    } else if (reputation.damage_count === 1) {
      flags.push({
        type: 'equipment_damage_history',
        severity: 'medium',
        description: 'One equipment damage incident reported',
        data: { damage_count: 1 },
      });
    }

    // Non-payment flag
    if (reputation.non_payment_count >= 1) {
      flags.push({
        type: 'non_payment_history',
        severity: reputation.non_payment_count >= 2 ? 'critical' : 'high',
        description: `${reputation.non_payment_count} non-payment incident(s)`,
        data: { non_payment_count: reputation.non_payment_count },
      });
    }

    // Instructor complaint flag
    if (reputation.instructor_complaints_count >= 1) {
      flags.push({
        type: 'provider_complaint',
        severity: reputation.instructor_complaints_count >= 2 ? 'high' : 'medium',
        description: `${reputation.instructor_complaints_count} complaint(s) filed by instructors/providers`,
        data: {
          complaint_count: reputation.instructor_complaints_count,
        },
      });
    }

    // Low reputation score
    if (reputation.total_score < 30) {
      flags.push({
        type: 'low_reputation_score',
        severity: reputation.total_score < 20 ? 'critical' : 'high',
        description: `Low reputation score: ${reputation.total_score}/100`,
        data: { score: reputation.total_score },
      });
    }

    // High cancellation rate
    if (reputation.cancellation_rate > 50) {
      flags.push({
        type: 'high_cancellation_rate',
        severity: reputation.cancellation_rate > 80 ? 'high' : 'medium',
        description: `High booking cancellation rate: ${Math.round(reputation.cancellation_rate)}%`,
        data: { cancellation_rate: reputation.cancellation_rate },
      });
    }

    // No-show incidents
    if (reputation.no_show_count >= 1) {
      flags.push({
        type: 'no_show_history',
        severity: reputation.no_show_count >= 2 ? 'high' : 'medium',
        description: `${reputation.no_show_count} no-show incident(s)`,
        data: { no_show_count: reputation.no_show_count },
      });
    }

    // Outstanding charges (from risk context)
    const hasOutstandingCharges = reputation.non_payment_count > 0 && reputation.damage_count > 0;
    if (hasOutstandingCharges) {
      flags.push({
        type: 'outstanding_charges',
        severity: 'high',
        description:
          'User has history of non-payment and damage claims combined',
        data: {
          damage_count: reputation.damage_count,
          non_payment_count: reputation.non_payment_count,
        },
      });
    }

    return flags;
  }

  /**
   * Should user be blocked from booking?
   */
  private shouldBlockFromBooking(
    reputation: UserReputationScore,
    riskLevel: string
  ): boolean {
    // Blacklisted users cannot book
    if (reputation.is_blacklisted) return true;

    // Critical risk users cannot book
    if (riskLevel === 'critical') return true;

    // Multiple non-payments = block
    if (reputation.non_payment_count >= 2) return true;

    // Multiple damage incidents = block
    if (reputation.damage_count >= 3) return true;

    // Multiple complaints = block
    if (reputation.instructor_complaints_count >= 2) return true;

    // Very low score = block
    if (reputation.total_score < 20) return true;

    // High no-show rate
    if (reputation.no_show_count >= 3) return true;

    return false;
  }

  /**
   * Should user be blocked from renting equipment?
   */
  private shouldBlockFromRenting(
    reputation: UserReputationScore,
    riskLevel: string
  ): boolean {
    // Same criteria as booking for now
    return this.shouldBlockFromBooking(reputation, riskLevel);
  }

  /**
   * Should deposit be required?
   */
  private shouldRequireDeposit(
    reputation: UserReputationScore,
    riskLevel: string
  ): boolean {
    // Blacklisted users
    if (reputation.is_blacklisted) return true;

    // Critical or high risk users
    if (riskLevel === 'critical' || riskLevel === 'high') return true;

    // Any damage history
    if (reputation.damage_count >= 1) return true;

    // Non-payment history
    if (reputation.non_payment_count >= 1) return true;

    // Multiple complaints
    if (reputation.instructor_complaints_count >= 1) return true;

    return false;
  }

  /**
   * Should payment be required upfront?
   */
  private shouldRequirePaymentUpfront(
    reputation: UserReputationScore,
    riskLevel: string
  ): boolean {
    // Blacklisted users
    if (reputation.is_blacklisted) return true;

    // Critical risk users
    if (riskLevel === 'critical') return true;

    // Non-payment history
    if (reputation.non_payment_count >= 1) return true;

    // Multiple damage incidents
    if (reputation.damage_count >= 2) return true;

    return false;
  }

  /**
   * Should references be required?
   */
  private shouldRequireReferences(
    reputation: UserReputationScore,
    riskLevel: string
  ): boolean {
    // Blacklisted users
    if (reputation.is_blacklisted) return true;

    // Critical or high risk
    if (riskLevel === 'critical' || riskLevel === 'high') return true;

    // Multiple complaints
    if (reputation.instructor_complaints_count >= 1) return true;

    // Low reputation
    if (reputation.total_score < 50) return true;

    return false;
  }

  /**
   * Check if user has outstanding charges or issues
   */
  async hasOutstandingIssues(userId: string): Promise<boolean> {
    const [damageClaims, nonPayments, complaints] = await Promise.all([
      this.supabase
        .from('damage_claims')
        .select('count')
        .eq('renter_id', userId)
        .eq('status', 'approved'),

      this.supabase
        .from('user_reputation_scores')
        .select('non_payment_count')
        .eq('user_id', userId)
        .single(),

      this.supabase
        .from('user_complaints')
        .select('count')
        .eq('complained_against_user_id', userId)
        .eq('status', 'open'),
    ]);

    const hasUnpaidDamage = (damageClaims.count || 0) > 0;
    const hasNonPayment = (nonPayments.data?.non_payment_count || 0) > 0;
    const hasOpenComplaints = (complaints.count || 0) > 0;

    return hasUnpaidDamage || hasNonPayment || hasOpenComplaints;
  }

  /**
   * Get assessment for multiple users
   */
  async batchAssessUsers(userIds: string[]): Promise<RiskAssessmentResult[]> {
    return Promise.all(userIds.map((id) => this.assessUserRisk(id)));
  }
}
