// Equipment Rental Admin Types

export type EquipmentStatus = 'available' | 'unavailable' | 'missing' | 'damaged' | 'in_rental';
export type DamageReportStatus = 'pending' | 'approved' | 'rejected' | 'resolved';
export type UserFlagStatus = 'active' | 'inactive' | 'blacklisted';
export type CommissionStatus = 'pending' | 'paid';
export type DisputeStatus = 'open' | 'resolved' | 'closed';
export type DisputeResolution = 'charge_renter' | 'refund_lister' | 'split';

export interface Equipment {
  id: string;
  ownerId: string;
  ownerName: string;
  type: string;
  name: string;
  description: string;
  status: EquipmentStatus;
  rentalPrice: number;
  images: string[];
  rentalHistory: RentalRecord[];
  damageReports: DamageReport[];
  lastInspection?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RentalRecord {
  id: string;
  renterId: string;
  renterName: string;
  startDate: Date;
  endDate: Date;
  rentalPrice: number;
  status: 'active' | 'completed' | 'cancelled';
  returnedLate?: boolean;
  daysLate?: number;
  createdAt: Date;
}

export interface DamageReport {
  id: string;
  equipmentId: string;
  rentalId: string;
  renterId: string;
  renterName: string;
  reportedBy: string;
  description: string;
  photosUrl: string[];
  status: DamageReportStatus;
  repairCost?: number;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

export interface ProblematicUser {
  id: string;
  userId: string;
  userName: string;
  email: string;
  flagReason: string;
  issueCount: number;
  flagStatus: UserFlagStatus;
  issues: UserIssue[];
  lastIssueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserIssue {
  id: string;
  type: 'damage' | 'late_return' | 'dispute_loss' | 'blacklist';
  description: string;
  relatedRentalId?: string;
  createdAt: Date;
}

export interface Commission {
  id: string;
  listerId: string;
  listerName: string;
  listerEmail: string;
  equipmentId: string;
  amount: number;
  status: CommissionStatus;
  month: string; // YYYY-MM format
  paidDate?: Date;
  invoiceUrl?: string;
  bitPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MissingEquipment {
  id: string;
  equipmentId: string;
  equipmentName: string;
  ownerId: string;
  ownerName: string;
  rentalId: string;
  renterId: string;
  renterName: string;
  reportedDate: Date;
  lastSeenDate: Date;
  daysOverdue: number;
  estimatedValue: number;
  status: 'reported' | 'investigating' | 'recovered' | 'theft_filed';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dispute {
  id: string;
  rentalId: string;
  renterId: string;
  renterName: string;
  listerId: string;
  listerName: string;
  equipmentId: string;
  equipmentName: string;
  type: 'damage' | 'missing' | 'payment' | 'quality' | 'other';
  description: string;
  renterEvidence: DisputeEvidence[];
  listerEvidence: DisputeEvidence[];
  resolution?: DisputeResolution;
  resolutionDetails?: string;
  status: DisputeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisputeEvidence {
  url: string;
  type: 'photo' | 'video' | 'text' | 'receipt';
  uploadedBy: string;
  uploadedAt: Date;
}

export interface EquipmentAnalytics {
  totalEquipment: number;
  activeEquipment: number;
  missingEquipment: number;
  damageRate: number;
  averageRentalDuration: number;
  totalRevenueThisMonth: number;
  totalCommissionsOwed: number;
  topEquipmentByRevenue: EquipmentRevenue[];
  damageRateByType: DamageByType[];
  userBehaviorMetrics: UserBehavior;
}

export interface EquipmentRevenue {
  equipmentId: string;
  equipmentName: string;
  type: string;
  revenue: number;
  rentalCount: number;
  averagePrice: number;
}

export interface DamageByType {
  equipmentType: string;
  damageCount: number;
  damageRate: number;
  averageRepairCost: number;
}

export interface UserBehavior {
  averageReturnDelay: number;
  lateReturnRate: number;
  damageReportRate: number;
  disputeRate: number;
  blacklistedUserCount: number;
}

export interface AdminEquipmentStats {
  totalActiveRentals: number;
  totalCommissionEarned: number;
  missingEquipmentCount: number;
  problematicUsersCount: number;
  damagePendingCount: number;
  revenueThisMonth: number;
  topProblematicUsers: ProblematicUser[];
}
