import { createClient } from '@supabase/supabase-js';
import {
  equipmentCreateSchema,
  equipmentStatusUpdateSchema,
  damageReportCreateSchema,
  problematicUserCreateSchema,
  equipmentFilterSchema,
  EquipmentStatus,
  DamageType,
  BlacklistLevel
} from './schemas';
import { Database } from '@/types/supabase';

export class EquipmentService {
  constructor(private supabase: ReturnType<typeof createClient<Database>>) {}

  // ========================================================================
  // EQUIPMENT MANAGEMENT
  // ========================================================================

  /**
   * Create new equipment listing
   */
  async createEquipment(userId: string, data: typeof equipmentCreateSchema._type) {
    const validated = equipmentCreateSchema.parse(data);

    const { data: equipment, error } = await this.supabase
      .from('equipment')
      .insert([
        {
          lister_id: userId,
          ...validated,
          status: 'available'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return equipment;
  }

  /**
   * Get equipment by ID
   */
  async getEquipment(equipmentId: string) {
    const { data, error } = await this.supabase
      .from('equipment')
      .select('*')
      .eq('id', equipmentId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all equipment for a lister
   */
  async getListerEquipment(userId: string, filters?: typeof equipmentFilterSchema._type) {
    let query = this.supabase
      .from('equipment')
      .select('*')
      .eq('lister_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.equipment_type) {
      query = query.eq('equipment_type', filters.equipment_type);
    }
    if (filters?.condition_rating_min) {
      query = query.gte('condition_rating', filters.condition_rating_min);
    }

    const { data, error } = await query
      .order(filters?.sort_by || 'created_at', {
        ascending: filters?.sort_order === 'asc'
      });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update equipment status with logging
   */
  async updateEquipmentStatus(
    equipmentId: string,
    userId: string,
    statusUpdate: typeof equipmentStatusUpdateSchema._type
  ) {
    const validated = equipmentStatusUpdateSchema.parse(statusUpdate);

    // Get current status for logging
    const current = await this.getEquipment(equipmentId);

    // Update equipment status
    const { error: updateError } = await this.supabase
      .from('equipment')
      .update({
        status: validated.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', equipmentId);

    if (updateError) throw updateError;

    // Log status change (trigger handles this, but we can do it explicitly)
    const { error: logError } = await this.supabase
      .from('equipment_status_log')
      .insert([
        {
          equipment_id: equipmentId,
          old_status: current.status,
          new_status: validated.status,
          changed_by: userId,
          reason: validated.reason,
          notes: validated.notes
        }
      ]);

    if (logError) throw logError;

    return await this.getEquipment(equipmentId);
  }

  /**
   * Get equipment status history
   */
  async getStatusHistory(equipmentId: string) {
    const { data, error } = await this.supabase
      .from('equipment_status_log')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ========================================================================
  // DAMAGE REPORTING
  // ========================================================================

  /**
   * Report equipment damage
   */
  async reportDamage(userId: string, data: typeof damageReportCreateSchema._type) {
    const validated = damageReportCreateSchema.parse(data);

    const { data: report, error } = await this.supabase
      .from('damage_reports')
      .insert([
        {
          reported_by: userId,
          ...validated
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // If damage is severe, mark equipment as damaged
    if (validated.damage_type === 'severe') {
      await this.updateEquipmentStatus(validated.equipment_id, userId, {
        status: 'returned_damaged',
        reason: 'damage_reported',
        notes: `Damage report ${report.id} filed`
      });
    }

    return report;
  }

  /**
   * Get damage reports for equipment
   */
  async getEquipmentDamageReports(equipmentId: string) {
    const { data, error } = await this.supabase
      .from('damage_reports')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get pending damage reports for lister
   */
  async getListerPendingDamageReports(userId: string) {
    const { data, error } = await this.supabase
      .from('damage_reports_with_details')
      .select('*')
      .eq('lister_id', userId)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Lister responds to damage report
   */
  async respondToDamageReport(
    damageReportId: string,
    userId: string,
    response: {
      lister_response: string;
      repair_cost_actual?: number;
      status: 'approved' | 'rejected';
    }
  ) {
    const { data: report, error: fetchError } = await this.supabase
      .from('damage_reports')
      .select('*')
      .eq('id', damageReportId)
      .single();

    if (fetchError) throw fetchError;

    // Verify this is the lister of the equipment
    const equipment = await this.getEquipment(report.equipment_id);
    if (equipment.lister_id !== userId) {
      throw new Error('Not authorized to respond to this damage report');
    }

    const { error: updateError } = await this.supabase
      .from('damage_reports')
      .update({
        lister_response: response.lister_response,
        repair_cost_actual: response.repair_cost_actual,
        status: response.status === 'approved' ? 'approved' : 'rejected',
        lister_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', damageReportId);

    if (updateError) throw updateError;

    // If approved and equipment is not yet marked for repair, do so
    if (response.status === 'approved' && equipment.status !== 'damaged') {
      await this.updateEquipmentStatus(equipment.id, userId, {
        status: 'damaged',
        reason: 'damage_approved',
        notes: `Damage report ${damageReportId} approved for repair`
      });
    }

    // Mark renter as problematic if damage is approved
    if (response.status === 'approved') {
      const rental = await this.supabase
        .from('rentals')
        .select('renter_id')
        .eq('id', report.rental_id)
        .single();

      if (rental.data) {
        await this.markProblematicUser(userId, {
          user_id: rental.data.renter_id,
          reason: 'equipment_damage',
          related_damage_report_id: damageReportId,
          blacklist_level: this.getDamageBlacklistLevel(report.damage_type),
          description: `Damaged equipment during rental: ${report.description}`
        });
      }
    }

    return await this.supabase
      .from('damage_reports')
      .select('*')
      .eq('id', damageReportId)
      .single()
      .then(res => res.data);
  }

  // ========================================================================
  // PROBLEMATIC USER MANAGEMENT
  // ========================================================================

  /**
   * Mark user as problematic
   */
  async markProblematicUser(
    initiatedBy: string,
    data: typeof problematicUserCreateSchema._type
  ) {
    const validated = problematicUserCreateSchema.parse(data);

    // Check if user already exists in problematic_users
    const { data: existing } = await this.supabase
      .from('problematic_users')
      .select('id')
      .eq('user_id', validated.user_id)
      .eq('is_resolved', false)
      .single();

    if (existing) {
      // Update existing record if same reason
      if (existing.reason === validated.reason) {
        return existing;
      }
    }

    const { data: record, error } = await this.supabase
      .from('problematic_users')
      .insert([validated])
      .select()
      .single();

    if (error) throw error;
    return record;
  }

  /**
   * Get problematic user status
   */
  async getUserProblematicStatus(userId: string) {
    const { data, error } = await this.supabase
      .from('problematic_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_resolved', false)
      .order('blacklist_level', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if user can rent (not banned/restricted)
   */
  async canUserRent(userId: string): Promise<boolean> {
    const status = await this.getUserProblematicStatus(userId);
    return !status.some(s => s.blacklist_level === 'banned' || s.blacklist_level === 'restricted');
  }

  /**
   * Get warnings for a renter when lister is checking
   */
  async getListerRenterWarnings(listerId: string, renterId: string) {
    const { data, error } = await this.supabase
      .from('lister_renter_warnings')
      .select('*')
      .eq('lister_id', listerId)
      .eq('renter_id', renterId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all pending warnings for a lister
   */
  async getListerPendingWarnings(listerId: string) {
    const { data, error } = await this.supabase
      .from('lister_renter_warnings')
      .select('*')
      .eq('lister_id', listerId)
      .eq('lister_has_seen', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark warning as seen
   */
  async markWarningAsSeenBulk(listerId: string, warningIds: string[]) {
    const { error } = await this.supabase
      .from('lister_renter_warnings')
      .update({ lister_has_seen: true })
      .eq('lister_id', listerId)
      .in('id', warningIds);

    if (error) throw error;
  }

  /**
   * Resolve problematic user status
   */
  async resolveProblematicUser(userId: string, problematicUserId: string) {
    const { error } = await this.supabase
      .from('problematic_users')
      .update({
        is_resolved: true,
        resolution_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', problematicUserId);

    if (error) throw error;
  }

  // ========================================================================
  // ADMIN FUNCTIONS
  // ========================================================================

  /**
   * Get missing equipment list (for admins)
   */
  async getMissingEquipmentList() {
    const { data, error } = await this.supabase
      .from('missing_equipment')
      .select('*')
      .order('marked_missing_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all damage reports (admin)
   */
  async getAllDamageReports(filters?: {
    status?: string;
    damage_type?: DamageType;
    date_from?: string;
    date_to?: string;
  }) {
    let query = this.supabase
      .from('damage_reports_with_details')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.damage_type) {
      query = query.eq('damage_type', filters.damage_type);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all problematic users (admin)
   */
  async getAllProblematicUsers(filters?: {
    blacklist_level?: BlacklistLevel;
    is_resolved?: boolean;
  }) {
    let query = this.supabase
      .from('problematic_users')
      .select('*');

    if (filters?.blacklist_level) {
      query = query.eq('blacklist_level', filters.blacklist_level);
    }
    if (filters?.is_resolved !== undefined) {
      query = query.eq('is_resolved', filters.is_resolved);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private getDamageBlacklistLevel(damageType: DamageType): BlacklistLevel {
    switch (damageType) {
      case 'minor':
        return 'warning';
      case 'moderate':
        return 'restricted';
      case 'severe':
        return 'banned';
      default:
        return 'warning';
    }
  }
}
