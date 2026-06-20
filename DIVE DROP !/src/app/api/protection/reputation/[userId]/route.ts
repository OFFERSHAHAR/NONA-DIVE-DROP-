/**
 * GET /api/protection/reputation/[userId]
 * Get user reputation score and risk assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReputationService } from '@/lib/protection/reputation-service';
import { RiskAssessmentService } from '@/lib/protection/risk-assessment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = createClient();

    // Get current user (for authorization)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get reputation
    const reputationService = new ReputationService();
    const reputation = await reputationService.getOrCreateReputation(userId);

    // Get risk assessment
    const riskService = new RiskAssessmentService();
    const riskAssessment = await riskService.assessUserRisk(userId);

    // Get recent history
    const history = await reputationService.getReputationHistory(userId, 10);

    return NextResponse.json({
      reputation,
      risk_assessment: riskAssessment,
      recent_history: history,
    });
  } catch (error) {
    console.error('Error fetching reputation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reputation' },
      { status: 500 }
    );
  }
}
