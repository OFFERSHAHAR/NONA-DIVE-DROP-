/**
 * Equipment Rental & Commission System Types
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum RentalStatus {
  PENDING = 'pending', // Awaiting payment
  CONFIRMED = 'confirmed', // Payment received, awaiting pickup
  ACTIVE = 'active', // Equipment is rented out
  RETURNED = 'returned', // Equipment returned
  CANCELLED = 'cancelled', // Rental cancelled
  DISPUTE = 'dispute', // Dispute raised
}

export enum CommissionStatus {
  PENDING = 'pending', // Commission calculated, awaiting collection
  INVOICED = 'invoiced', // Invoice sent to lister
  PAID = 'paid', // Lister paid commission to DIVE DROP
  DISPUTED = 'disputed', // Payment disputed
}

export enum DamageStatus {
  PENDING = 'pending', // Assessment pending
  ASSESSED = 'assessed', // Damage assessed
  CHARGED = 'charged', // Charge issued to renter
  PAID = 'paid', // Damage charge paid
  DISPUTED = 'disputed', // Charge disputed
}

export enum InvoiceStatus {
  DRAFT = 'draft', // Invoice created but not sent
  SENT = 'sent', // Invoice sent to lister
  VIEWED = 'viewed', // Lister has viewed invoice
  PAID = 'paid', // Payment received
  PARTIAL = 'partial', // Partial payment received
  OVERDUE = 'overdue', // Payment overdue
}

export enum DamageSeverity {
  MINOR = 'minor', // Cosmetic, no repair needed
  MODERATE = 'moderate', // Needs repair but still functional
  SEVERE = 'severe', // Non-functional, needs replacement
  TOTAL_LOSS = 'total_loss', // Equipment destroyed
}

export enum EquipmentCategory {
  WETSUIT = 'wetsuit',
  BCD = 'bcd',
  REGULATOR = 'regulator',
  TANK = 'tank',
  FINS = 'fins',
  MASK = 'mask',
  SNORKEL = 'snorkel',
  LIGHT = 'light',
  COMPUTER = 'computer',
  CAMERA = 'camera',
  OTHER = 'other',
}

// ============================================================================
// MODELS
// ============================================================================

export interface Equipment {
  id: string;
  name: string;
  description?: string;
  category: EquipmentCategory;
  sizeOrModel?: string;
  brand?: string;
  conditionRating: number; // 1-5
  dailyPriceCents: number;
  availableForRental: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentListing {
  id: string;
  listerId: string;
  equipmentId: string;
  equipment?: Equipment;
  dailyPriceCents: number;
  isAvailable: boolean;
  availableQuantity: number;
  reservedQuantity: number;
  commissionRate: number; // 0.10 = 10%
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  depositRequiredCents: number;
  insuranceAvailable: boolean;
  insurancePriceCents?: number;
  description?: string;
  rentalTerms?: string;
  ratingAverage?: number;
  reviewCount: number;
  rentalCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentRental {
  id: string;
  renterId: string;
  listerId: string;
  listingId: string;
  startDate: Date;
  endDate: Date;
  rentalDays: number;

  // Pricing
  dailyPriceCents: number;
  subtotalCents: number;
  depositCents: number;
  insuranceCents: number;
  rentalCostCents: number;
  totalCostCents: number;

  // Commission
  commissionRate: number;
  commissionCents?: number;

  // Payment
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  bitTransactionId?: string;
  paidAt?: Date;

  // Status
  status: RentalStatus;

  // Condition checks
  conditionOnPickupRating?: number;
  conditionOnReturnRating?: number;

  // Timeline
  pickedUpAt?: Date;
  returnedAt?: Date;

  // Notes
  notes?: string;
  renterNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface RentalCommission {
  id: string;
  rentalId: string;
  listerId: string;
  renterId: string;

  // Amounts
  rentalCostCents: number;
  commissionRate: number;
  commissionCents: number;
  damageCommissionCents?: number;

  // Status
  status: CommissionStatus;

  // Invoice
  invoiceId?: string;
  invoiceGeneratedAt?: Date;

  // Payment
  paymentReceivedAt?: Date;
  paymentMethod?: string;
  paymentReference?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface RentalDamageAssessment {
  id: string;
  rentalId: string;
  listerId: string;
  renterId: string;

  // Damage details
  damageDescription: string;
  severity: DamageSeverity;
  repairCostCents: number;
  replacementCostCents?: number;
  chargeCents?: number;

  // Assessment
  assessedByListerId?: string;
  status: DamageStatus;

  // Charge
  chargeIssuedAt?: Date;
  chargeDueDate?: Date;

  // Evidence
  photoEvidence?: string[]; // URLs
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface RentalInvoice {
  id: string;
  listerId: string;
  invoiceMonth: Date;
  invoiceNumber: string; // INV-202406-001

  // Amounts
  totalRentalCostCents: number;
  totalCommissionCents: number;
  totalDamageChargesCents: number;

  // Counts
  rentalCount: number;
  commissionCount: number;
  damageCount: number;

  // Payment
  dueDate: Date;
  paymentMethod: string;

  // Status
  status: InvoiceStatus;

  // Timeline
  sentAt?: Date;
  viewedAt?: Date;
  paymentReceivedAt?: Date;
  paymentAmountCents?: number;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface RentalInvoiceLineItem {
  id: string;
  invoiceId: string;
  commissionId?: string;
  damageId?: string;
  rentalId?: string;

  itemType: 'rental_commission' | 'damage_charge' | 'adjustment';
  description: string;
  quantity: number;
  amountCents: number;

  createdAt: Date;
}

export interface ListerAccountBalance {
  id: string;
  listerId: string;

  // Current balance
  balanceOwedCents: number;
  unpaidCommissionsCents: number;
  unpaidDamageChargesCents: number;
  paidToDateCents: number;

  // Lifetime stats
  lifetimeRentalVolumeCents: number;
  lifetimeCommissionPaidCents: number;

  // Last payment
  lastPaymentAt?: Date;
  lastPaymentAmountCents?: number;

  // Status
  isSuspended: boolean;
  suspensionReason?: string;

  updatedAt: Date;
}

export interface RentalCommissionPaymentRequest {
  id: string;
  invoiceId: string;
  listerId: string;

  amountCents: number;
  bitRequestId?: string;
  paymentLink?: string;
  shortUrl?: string;
  qrCode?: string; // Base64

  status: 'pending' | 'initiated' | 'completed' | 'failed' | 'expired' | 'cancelled';

  // Payment
  paymentMethod?: string;
  transactionId?: string;

  // Timing
  expiresAt?: Date;
  paidAt?: Date;

  // Tracking
  requestCount: number;
  lastAccessedAt?: Date;

  createdAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CreateRentalRequest {
  listing_id: string;
  start_date: string; // ISO datetime
  end_date: string; // ISO datetime
  deposit_cents?: number;
  insurance_enabled?: boolean;
  notes?: string;
}

export interface CreateRentalResponse {
  success: boolean;
  rental: {
    id: string;
    equipment_name: string;
    start_date: string;
    end_date: string;
    rental_days: number;
    daily_price: string; // Formatted
    subtotal: string;
    insurance: string | null;
    rental_cost: string;
    deposit: string;
    total_cost: string;
    commission_breakdown: {
      rental_cost: string;
      commission_rate: string;
      commission_amount: string;
      to_lister: string;
    };
    status: RentalStatus;
    next_step: string;
  };
}

export interface AccountSummaryResponse {
  success: boolean;
  account: {
    lister_id: string;
    balance_owed: CurrencyAmount;
    unpaid_commissions: CurrencyAmount;
    unpaid_damage_charges: CurrencyAmount;
    lifetime_stats: {
      total_rental_volume: CurrencyAmount;
      total_commission_paid: CurrencyAmount;
    };
    is_suspended: boolean;
  };
  this_month: {
    period: { start: string; end: string };
    total_commission: CurrencyAmount;
    paid: CurrencyAmount;
    pending: CurrencyAmount;
    rental_count: number;
  };
  pending_invoices: Array<{
    id: string;
    invoice_number: string;
    amount: CurrencyAmount;
    due_date: string;
    status: string;
    action: string;
  }>;
  recent_commissions: Array<any>;
}

export interface InvoicesListResponse {
  success: boolean;
  summary: {
    total_invoices: number;
    outstanding: CurrencyAmount;
    total_paid: CurrencyAmount;
    overdue_count: number;
    pending_count: number;
  };
  invoices: Array<Invoice>;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  period: { month: string; date: string };
  summary: {
    rental_count: number;
    rental_commission: CurrencyAmount;
    damage_charges: CurrencyAmount;
    total: CurrencyAmount;
  };
  timeline: {
    issued_date: string;
    sent_date?: string;
    viewed_date?: string;
    due_date: string;
    paid_date?: string;
  };
  status: { current: InvoiceStatus; badge: string; action_required: boolean; paid: boolean };
  payment: { status: string; amount_paid?: CurrencyAmount; paid_at?: string };
  line_items: Array<LineItem>;
}

export interface LineItem {
  type: 'rental_commission' | 'damage_charge' | 'adjustment';
  description: string;
  amount: CurrencyAmount;
}

export interface DamageReportRequest {
  damage_description: string;
  severity: DamageSeverity;
  repair_cost_cents: number;
  replacement_cost_cents?: number;
  charge_cents?: number;
  photo_evidence_urls?: string[];
  notes?: string;
}

export interface DamageReportResponse {
  success: boolean;
  damage_assessment: {
    id: string;
    rental_id: string;
    damage_description: string;
    severity: DamageSeverity;
    repair_cost: CurrencyAmount;
    charge_issued: CurrencyAmount;
    commission_on_damage: {
      rate: string;
      cents: number;
      display: string;
    };
    total_owed_to_dive_drop: CurrencyAmount;
    charge_due_date: string;
    status: DamageStatus;
    message: string;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  period: { type: string; start: string; end: string };
  summary: {
    total_rental_revenue: CurrencyAmount;
    total_commissions: CurrencyAmount;
    commission_breakdown: {
      paid: CommissionBreakdownItem;
      pending: CommissionBreakdownItem;
    };
    total_damage_charges: CurrencyAmount;
  };
  rental_metrics: {
    completed_rentals: number;
    active_rentals: number;
    pending_rentals: number;
    total_rentals: number;
    average_commission_rate: string;
  };
  top_equipment: Array<TopEquipment>;
  top_listers: Array<TopLister>;
  daily_breakdown: Record<string, DailyMetrics>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface CurrencyAmount {
  cents: number;
  display: string;
}

export interface CommissionBreakdownItem {
  cents: number;
  display: string;
  percentage: string | number;
}

export interface TopEquipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  rental_count: number;
  rating?: number;
}

export interface TopLister {
  rank: number;
  lister_id: string;
  lifetime_volume: CurrencyAmount;
  lifetime_commission_paid: CurrencyAmount;
}

export interface DailyMetrics {
  revenue: CurrencyAmount;
  commission: CurrencyAmount;
  rental_count: number;
}

export interface CommissionCalculationResult {
  rentalCostCents: number;
  commissionRate: number;
  commissionCents: number;
  netToListerCents: number;
}

export interface RentalFinancialsResult {
  dailyPriceCents: number;
  rentalDays: number;
  subtotalCents: number;
  depositCents: number;
  insuranceCents: number;
  rentalCostCents: number;
  totalCostCents: number;
  commissionCents: number;
  netToListerCents: number;
}
