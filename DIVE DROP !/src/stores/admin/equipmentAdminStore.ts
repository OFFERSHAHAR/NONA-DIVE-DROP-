import { create } from 'zustand';
import {
  Equipment,
  DamageReport,
  ProblematicUser,
  Commission,
  MissingEquipment,
  Dispute,
  AdminEquipmentStats,
} from '@/lib/types/equipment';

interface EquipmentAdminState {
  // Equipment state
  equipment: Equipment[];
  equipmentLoading: boolean;
  equipmentError: string | null;

  // Damage reports state
  damageReports: DamageReport[];
  damageReportsLoading: boolean;
  damageReportsError: string | null;

  // Problematic users state
  problematicUsers: ProblematicUser[];
  problematicUsersLoading: boolean;
  problematicUsersError: string | null;

  // Commissions state
  commissions: Commission[];
  commissionsLoading: boolean;
  commissionsError: string | null;

  // Missing equipment state
  missingEquipment: MissingEquipment[];
  missingEquipmentLoading: boolean;
  missingEquipmentError: string | null;

  // Disputes state
  disputes: Dispute[];
  disputesLoading: boolean;
  disputesError: string | null;

  // Stats state
  stats: AdminEquipmentStats | null;
  statsLoading: boolean;

  // Filter states
  equipmentStatusFilter: string;
  equipmentSearchQuery: string;

  // Equipment actions
  setEquipment: (equipment: Equipment[]) => void;
  setEquipmentLoading: (loading: boolean) => void;
  setEquipmentError: (error: string | null) => void;
  updateEquipmentStatus: (equipmentId: string, status: string) => void;

  // Damage reports actions
  setDamageReports: (reports: DamageReport[]) => void;
  setDamageReportsLoading: (loading: boolean) => void;
  setDamageReportsError: (error: string | null) => void;
  updateDamageReportStatus: (reportId: string, status: string) => void;

  // Problematic users actions
  setProblematicUsers: (users: ProblematicUser[]) => void;
  setProblematicUsersLoading: (loading: boolean) => void;
  setProblematicUsersError: (error: string | null) => void;
  updateProblematicUserStatus: (userId: string, status: string) => void;

  // Commissions actions
  setCommissions: (commissions: Commission[]) => void;
  setCommissionsLoading: (loading: boolean) => void;
  setCommissionsError: (error: string | null) => void;

  // Missing equipment actions
  setMissingEquipment: (equipment: MissingEquipment[]) => void;
  setMissingEquipmentLoading: (loading: boolean) => void;
  setMissingEquipmentError: (error: string | null) => void;

  // Disputes actions
  setDisputes: (disputes: Dispute[]) => void;
  setDisputesLoading: (loading: boolean) => void;
  setDisputesError: (error: string | null) => void;
  resolveDispute: (disputeId: string, resolution: string) => void;

  // Stats actions
  setStats: (stats: AdminEquipmentStats) => void;
  setStatsLoading: (loading: boolean) => void;

  // Filter actions
  setEquipmentStatusFilter: (filter: string) => void;
  setEquipmentSearchQuery: (query: string) => void;
}

export const useEquipmentAdminStore = create<EquipmentAdminState>((set) => ({
  // Initial states
  equipment: [],
  equipmentLoading: false,
  equipmentError: null,

  damageReports: [],
  damageReportsLoading: false,
  damageReportsError: null,

  problematicUsers: [],
  problematicUsersLoading: false,
  problematicUsersError: null,

  commissions: [],
  commissionsLoading: false,
  commissionsError: null,

  missingEquipment: [],
  missingEquipmentLoading: false,
  missingEquipmentError: null,

  disputes: [],
  disputesLoading: false,
  disputesError: null,

  stats: null,
  statsLoading: false,

  equipmentStatusFilter: 'all',
  equipmentSearchQuery: '',

  // Equipment actions
  setEquipment: (equipment) => set({ equipment }),
  setEquipmentLoading: (equipmentLoading) => set({ equipmentLoading }),
  setEquipmentError: (equipmentError) => set({ equipmentError }),
  updateEquipmentStatus: (equipmentId, status) =>
    set((state) => ({
      equipment: state.equipment.map((e) =>
        e.id === equipmentId ? { ...e, status: status as any } : e
      ),
    })),

  // Damage reports actions
  setDamageReports: (damageReports) => set({ damageReports }),
  setDamageReportsLoading: (damageReportsLoading) =>
    set({ damageReportsLoading }),
  setDamageReportsError: (damageReportsError) => set({ damageReportsError }),
  updateDamageReportStatus: (reportId, status) =>
    set((state) => ({
      damageReports: state.damageReports.map((r) =>
        r.id === reportId ? { ...r, status: status as any } : r
      ),
    })),

  // Problematic users actions
  setProblematicUsers: (problematicUsers) => set({ problematicUsers }),
  setProblematicUsersLoading: (problematicUsersLoading) =>
    set({ problematicUsersLoading }),
  setProblematicUsersError: (problematicUsersError) =>
    set({ problematicUsersError }),
  updateProblematicUserStatus: (userId, status) =>
    set((state) => ({
      problematicUsers: state.problematicUsers.map((u) =>
        u.userId === userId ? { ...u, flagStatus: status as any } : u
      ),
    })),

  // Commissions actions
  setCommissions: (commissions) => set({ commissions }),
  setCommissionsLoading: (commissionsLoading) => set({ commissionsLoading }),
  setCommissionsError: (commissionsError) => set({ commissionsError }),

  // Missing equipment actions
  setMissingEquipment: (missingEquipment) => set({ missingEquipment }),
  setMissingEquipmentLoading: (missingEquipmentLoading) =>
    set({ missingEquipmentLoading }),
  setMissingEquipmentError: (missingEquipmentError) =>
    set({ missingEquipmentError }),

  // Disputes actions
  setDisputes: (disputes) => set({ disputes }),
  setDisputesLoading: (disputesLoading) => set({ disputesLoading }),
  setDisputesError: (disputesError) => set({ disputesError }),
  resolveDispute: (disputeId, resolution) =>
    set((state) => ({
      disputes: state.disputes.map((d) =>
        d.id === disputeId ? { ...d, status: 'resolved' as any } : d
      ),
    })),

  // Stats actions
  setStats: (stats) => set({ stats }),
  setStatsLoading: (statsLoading) => set({ statsLoading }),

  // Filter actions
  setEquipmentStatusFilter: (equipmentStatusFilter) =>
    set({ equipmentStatusFilter }),
  setEquipmentSearchQuery: (equipmentSearchQuery) =>
    set({ equipmentSearchQuery }),
}));
