/**
 * Complaint & Damage Claim Service
 * Handles filing, tracking, and resolution of complaints and damage claims
 */

import { createClient } from '@/lib/supabase/server';
import { UserComplaint, DamageClaim, FileComplaintRequest } from '@/types/protection';
import { ReputationService } from './reputation-service';

export class ComplaintService {
  private supabase = createClient();
  private reputationService = new ReputationService();

  /**
   * File a complaint against a user
   */
  async fileComplaint(
    complainantId: string,
    request: FileComplaintRequest
  ): Promise<UserComplaint> {
    // Validate complaint is related to actual booking
    const { data: booking } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', request.booking_id)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Create complaint
    const { data: complaint, error } = await this.supabase
      .from('user_complaints')
      .insert({
        complainant_user_id: complainantId,
        complained_against_user_id: request.complained_against_user_id,
        related_booking_id: request.booking_id,
        complaint_type: request.complaint_type,
        title: request.title,
        description: request.description,
        severity: request.severity || 'medium',
        evidence_files: request.evidence_files || [],
        photos: request.photos || [],
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;

    // Record reputation impact immediately
    await this.reputationService.recordComplaint(
      request.complained_against_user_id,
      request.booking_id
    );

    return complaint;
  }

  /**
   * Get complaints filed against a user
   */
  async getComplaintsAgainstUser(userId: string): Promise<UserComplaint[]> {
    const { data, error } = await this.supabase
      .from('user_complaints')
      .select('*')
      .eq('complained_against_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get open complaints for review
   */
  async getOpenComplaints(limit: number = 50): Promise<UserComplaint[]> {
    const { data, error } = await this.supabase
      .from('user_complaints')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Review and resolve complaint (admin)
   */
  async resolveComplaint(
    complaintId: string,
    adminId: string,
    resolution: string,
    sustained: boolean
  ): Promise<void> {
    const { data: complaint } = await this.supabase
      .from('user_complaints')
      .select('*')
      .eq('id', complaintId)
      .single();

    if (!complaint) {
      throw new Error('Complaint not found');
    }

    // Update complaint
    await this.supabase
      .from('user_complaints')
      .update({
        status: 'resolved',
        resolution: resolution,
        resolved_by_admin_id: adminId,
        resolution_date: new Date().toISOString(),
      })
      .eq('id', complaintId);

    // If complaint sustained, blacklist might be recommended
    if (sustained && complaint.severity === 'critical') {
      // Count total complaints
      const { count } = await this.supabase
        .from('user_complaints')
        .select('count', { count: 'exact' })
        .eq('complained_against_user_id', complaint.complained_against_user_id)
        .eq('status', 'resolved');

      if ((count || 0) >= 3) {
        // Auto-blacklist after 3 sustained complaints
        await this.reputationService.adjustReputation(
          complaint.complained_against_user_id,
          -50,
          `Sustained complaints: ${count} critical incidents`
        );
      }
    }
  }

  /**
   * Appeal complaint decision (user)
   */
  async appealComplaint(complaintId: string, appealReason: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_complaints')
      .update({
        appeal_reason: appealReason,
        appeal_status: 'pending',
        appeal_date: new Date().toISOString(),
      })
      .eq('id', complaintId);

    if (error) throw error;
  }

  /**
   * File damage claim
   */
  async fileDamageClaim(
    listerId: string,
    renterId: string,
    bookingId: string,
    itemName: string,
    itemValue: number,
    damageType: 'broken' | 'lost' | 'damaged' | 'wear_and_tear',
    damageDescription: string,
    estimatedRepairCost: number,
    claimAmount: number,
    photos?: string[]
  ): Promise<DamageClaim> {
    // Validate booking exists
    const { data: booking } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    const { data: claim, error } = await this.supabase
      .from('damage_claims')
      .insert({
        lister_id: listerId,
        renter_id: renterId,
        booking_id: bookingId,
        item_name: itemName,
        item_value: itemValue,
        damage_type: damageType,
        damage_description: damageDescription,
        damage_photos: photos || [],
        estimated_repair_cost: estimatedRepairCost,
        claim_amount: claimAmount,
        status: 'claimed',
      })
      .select()
      .single();

    if (error) throw error;

    // Record reputation impact
    if (damageType === 'lost' || damageType === 'broken') {
      await this.reputationService.recordDamageIncident(renterId, 'major');
    } else {
      await this.reputationService.recordDamageIncident(renterId, 'minor');
    }

    return claim;
  }

  /**
   * Get damage claims for a user (as lister/claimant)
   */
  async getDamageClaimsForLister(listerId: string): Promise<DamageClaim[]> {
    const { data, error } = await this.supabase
      .from('damage_claims')
      .select('*')
      .eq('lister_id', listerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get damage claims against a user (as renter/defendant)
   */
  async getDamageClaimsAgainstUser(renterId: string): Promise<DamageClaim[]> {
    const { data, error } = await this.supabase
      .from('damage_claims')
      .select('*')
      .eq('renter_id', renterId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Review damage claim (admin)
   */
  async reviewDamageClaim(
    claimId: string,
    adminId: string,
    approved: boolean,
    notes: string
  ): Promise<void> {
    const { data: claim } = await this.supabase
      .from('damage_claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (!claim) {
      throw new Error('Claim not found');
    }

    await this.supabase
      .from('damage_claims')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_by_admin_id: adminId,
        review_notes: notes,
      })
      .eq('id', claimId);

    // If claim approved, record damage history
    if (approved) {
      // Already recorded on filing, but we could add additional weight
      await this.reputationService.adjustReputation(
        claim.renter_id,
        -5,
        `Damage claim approved: ${claim.item_name}`
      );
    }
  }

  /**
   * Process payment for approved damage claim
   */
  async processDamageClaimPayment(
    claimId: string,
    paymentAmount: number,
    paymentMethod: string,
    paymentDate: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('damage_claims')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        payment_date: paymentDate,
        payment_amount: paymentAmount,
      })
      .eq('id', claimId);

    if (error) throw error;
  }

  /**
   * Get pending damage claims for review
   */
  async getPendingDamageClaims(): Promise<DamageClaim[]> {
    const { data, error } = await this.supabase
      .from('damage_claims')
      .select('*')
      .eq('status', 'claimed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get complaint statistics
   */
  async getComplaintStats(userId: string): Promise<{
    total_complaints: number;
    open_complaints: number;
    resolved_complaints: number;
    sustained_complaints: number;
  }> {
    const [{ count: total }, { count: open }, { count: resolved }, { count: sustained }] =
      await Promise.all([
        this.supabase
          .from('user_complaints')
          .select('count', { count: 'exact' })
          .eq('complained_against_user_id', userId),

        this.supabase
          .from('user_complaints')
          .select('count', { count: 'exact' })
          .eq('complained_against_user_id', userId)
          .eq('status', 'open'),

        this.supabase
          .from('user_complaints')
          .select('count', { count: 'exact' })
          .eq('complained_against_user_id', userId)
          .eq('status', 'resolved'),

        this.supabase
          .from('user_complaints')
          .select('count', { count: 'exact' })
          .eq('complained_against_user_id', userId)
          .eq('status', 'resolved')
          .eq('resolution', 'upheld'),
      ]);

    return {
      total_complaints: total || 0,
      open_complaints: open || 0,
      resolved_complaints: resolved || 0,
      sustained_complaints: sustained || 0,
    };
  }
}
