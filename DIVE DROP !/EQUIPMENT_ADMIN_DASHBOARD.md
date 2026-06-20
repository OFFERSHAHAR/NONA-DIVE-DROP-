# Equipment Rental Admin Dashboard

Complete admin dashboard for managing equipment rental operations, including equipment tracking, damage reports, user management, commission handling, and dispute resolution.

## Features

### 1. Equipment Management (`/admin/equipment`)
- View all rental equipment with detailed information
- Search by equipment name, owner, or type
- Filter by status: available, in_rental, unavailable, damaged, missing
- View rental history per equipment
- Manual status updates for equipment condition
- Deactivate equipment from rental pool

**Stats Displayed:**
- Total equipment count
- Available equipment
- Missing equipment count
- Damaged equipment count

### 2. Damage Reports (`/admin/damage-reports`)
- Track all damage claims from renters
- Filter reports by status: pending, approved, rejected, resolved
- Review damage photos/evidence
- Approve claims with repair cost estimation
- Reject claims with detailed reason documentation
- Automatically charge renter for approved damages
- Flag users as problematic if damage pattern emerges

**Actions:**
- Approve damage claim → Charges renter + deducts from payment
- Reject damage claim → Requires documented reason
- Send notifications to affected parties

### 3. Problematic Users (`/admin/problematic-users`)
- Maintain list of flagged users
- Filter by flag status: active, inactive, blacklisted
- View complete issue history
- Track multiple incidents per user
- Blacklist users to prevent future rentals
- Remove users from problematic list if resolved
- Send warnings to users with documentation

**User Issue Types:**
- Damage claims
- Late returns
- Dispute losses
- Blacklist violations

### 4. Commission & Revenue (`/admin/commissions`)
- View all listers' owed commissions
- Monthly breakdown of earnings
- Payment tracking: pending vs paid
- Send invoices to listers
- Mark commissions as paid with payment method
- Track Bit cryptocurrency payments
- Calculate total revenue and owed amounts

**Commission Workflow:**
1. Commission calculated from equipment rentals
2. Listed in pending status
3. Invoice sent to lister
4. Mark as paid upon receipt
5. Payment confirmation sent

### 5. Missing Equipment (`/admin/missing-equipment`)
- Auto-detect equipment not returned 2+ days late
- Track unreturned rental equipment
- Filter by status: reported, investigating, recovered, theft_filed
- Update equipment status and investigation notes
- Contact equipment owner automatically
- File official theft reports
- Track resolution status

**Key Metrics:**
- Days overdue per item
- Estimated equipment value
- Total value at risk
- Theft report count

### 6. Dispute Resolution (`/admin/disputes`)
- Manage renter vs lister disputes
- Track dispute type: damage, missing, payment, quality, other
- Review evidence from both parties
- Make binding decisions on dispute resolution
- Enforce resolutions: charge_renter, refund_lister, split (50/50)
- Send notifications with resolution details

**Evidence Types:**
- Photos/videos
- Text descriptions
- Receipts
- Other documentation

### 7. Equipment Analytics (`/admin/equipment-analytics`)
- Most popular equipment by revenue
- Average rental duration analysis
- Damage rate by equipment type
- Revenue breakdown by equipment type
- User behavior pattern analysis

**Analytics Metrics:**
- Total active rentals
- Total commission earned
- Missing equipment count
- Damage rate percentage
- Average return delay
- Late return rate
- Dispute rate
- Blacklisted user count

## Data Models

### Equipment
```typescript
{
  id: string;
  ownerId: string;
  ownerName: string;
  type: string;
  name: string;
  description: string;
  status: 'available' | 'in_rental' | 'unavailable' | 'damaged' | 'missing';
  rentalPrice: number;
  images: string[];
  rentalHistory: RentalRecord[];
  damageReports: DamageReport[];
  lastInspection?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### DamageReport
```typescript
{
  id: string;
  equipmentId: string;
  rentalId: string;
  renterId: string;
  renterName: string;
  description: string;
  photosUrl: string[];
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  repairCost?: number;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}
```

### ProblematicUser
```typescript
{
  id: string;
  userId: string;
  userName: string;
  email: string;
  flagReason: string;
  issueCount: number;
  flagStatus: 'active' | 'inactive' | 'blacklisted';
  issues: UserIssue[];
  lastIssueDate: Date;
  createdAt: Date;
}
```

### Commission
```typescript
{
  id: string;
  listerId: string;
  listerName: string;
  listerEmail: string;
  equipmentId: string;
  amount: number;
  status: 'pending' | 'paid';
  month: string; // YYYY-MM format
  paidDate?: Date;
  invoiceUrl?: string;
  bitPaymentId?: string;
  createdAt: Date;
}
```

### MissingEquipment
```typescript
{
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
}
```

### Dispute
```typescript
{
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
  resolution?: 'charge_renter' | 'refund_lister' | 'split';
  resolutionDetails?: string;
  status: 'open' | 'resolved' | 'closed';
  createdAt: Date;
}
```

## API Endpoints

### Equipment
- `GET /api/admin/equipment` - Get all equipment
- `POST /api/admin/equipment/[id]/update-status` - Update equipment status
- `POST /api/admin/equipment/[id]/deactivate` - Deactivate equipment

### Damage Reports
- `GET /api/admin/damage-reports` - Get all damage reports
- `POST /api/admin/damage-reports/[id]/approve` - Approve damage claim
- `POST /api/admin/damage-reports/[id]/reject` - Reject damage claim

### Problematic Users
- `GET /api/admin/problematic-users` - Get flagged users
- `POST /api/admin/problematic-users/[userId]/update-status` - Update user status
- `POST /api/admin/problematic-users/[userId]/remove` - Remove from list
- `POST /api/admin/problematic-users/[userId]/send-warning` - Send warning

### Commissions
- `GET /api/admin/commissions` - Get all commissions
- `POST /api/admin/commissions/[id]/mark-paid` - Mark as paid
- `POST /api/admin/commissions/[id]/send-invoice` - Send invoice

### Missing Equipment
- `GET /api/admin/missing-equipment` - Get missing items
- `POST /api/admin/missing-equipment/[id]/update-status` - Update status
- `POST /api/admin/missing-equipment/[id]/file-theft-report` - File theft report
- `POST /api/admin/missing-equipment/[id]/contact-owner` - Contact owner

### Disputes
- `GET /api/admin/disputes` - Get all disputes
- `POST /api/admin/disputes/[id]/resolve` - Resolve dispute

### Analytics
- `GET /api/admin/equipment-analytics` - Get analytics data

## Store Management

### Equipment Admin Store (`useEquipmentAdminStore`)
Zustand-based state management for equipment rental admin features:

```typescript
// Equipment state
- equipment: Equipment[]
- equipmentLoading: boolean
- updateEquipmentStatus(equipmentId, status)

// Damage reports state
- damageReports: DamageReport[]
- damageReportsLoading: boolean
- updateDamageReportStatus(reportId, status)

// Problematic users state
- problematicUsers: ProblematicUser[]
- updateProblematicUserStatus(userId, status)

// Commissions state
- commissions: Commission[]
- commissionsLoading: boolean

// Missing equipment state
- missingEquipment: MissingEquipment[]
- missingEquipmentLoading: boolean

// Disputes state
- disputes: Dispute[]
- resolveDispute(disputeId, resolution)

// Filter states
- equipmentStatusFilter: string
- equipmentSearchQuery: string
```

## UI Components

### Equipment Management
- `EquipmentTable` - Display equipment list with filtering
- `EquipmentModal` - Equipment details and status update
- `SearchBar` - Search functionality

### Damage Reports
- `DamageReportTable` - List pending damage claims
- `DamageReportModal` - Review and approve/reject claims

### Problematic Users
- `ProblematicUserTable` - Display flagged users
- `ProblematicUserModal` - Manage user status and send warnings

### Commissions
- `CommissionTable` - Display commissions
- `CommissionModal` - Payment tracking and invoicing

### Missing Equipment
- `MissingEquipmentTable` - Track unreturned items
- `MissingEquipmentModal` - Update status and file theft reports

### Disputes
- `DisputeTable` - Display disputes
- `DisputeModal` - Review evidence and resolve disputes

### Analytics
- `AnalyticsCharts` - Revenue and damage rate charts
- `AnalyticsTables` - Equipment and damage type breakdowns

## Navigation Updates

All new sections are integrated into the admin navigation sidebar with icons:

- 🎽 Equipment Rental
- ⚠️ Damage Reports
- 🚫 Problematic Users
- 💰 Commissions
- ❌ Missing Equipment
- ⚔️ Disputes
- 📈 Analytics

## Integration Points

### Supabase Database
- Equipment rental table with status tracking
- Damage reports table with photo URLs
- User flags and problematic status
- Commission records with payment tracking
- Missing equipment tracking
- Dispute management table

### Payment Processing
- Charge renters for approved damage
- Process commission payments
- Handle Bit cryptocurrency payments
- Generate invoices for listers

### Notifications
- Email renters about damage charges
- Email owners about missing equipment
- Email listers about commissions
- Dispute resolution notifications
- User warning notifications

## Usage

### Basic Workflow

1. **Equipment Damage Reported**
   - Damage report created by renter
   - Admin reviews photos and description
   - Admin approves and sets repair cost
   - Renter is charged automatically
   - User flagged if multiple damage incidents

2. **User Becomes Problematic**
   - Flagged after multiple issues
   - Admin sends warning
   - User blacklisted if needed
   - Rental access restricted

3. **Commission Payment**
   - Commission calculated from rentals
   - Invoice sent to lister
   - Admin marks as paid upon receipt
   - Payment confirmation sent

4. **Missing Equipment**
   - Equipment not returned after 2+ days
   - Auto-flagged in system
   - Owner contacted with details
   - Theft report filed if needed
   - Renter charged for full value

5. **Dispute Resolution**
   - Renter/lister files dispute
   - Evidence reviewed from both parties
   - Admin makes binding decision
   - Payment processed according to resolution
   - Both parties notified

## Deployment Checklist

- [ ] Create Supabase tables for equipment rental
- [ ] Implement equipment status tracking
- [ ] Set up damage report workflows
- [ ] Configure payment processing for damage charges
- [ ] Implement user flagging system
- [ ] Create commission calculation logic
- [ ] Set up missing equipment detection
- [ ] Configure theft report generation
- [ ] Implement notification system
- [ ] Set up analytics data aggregation
- [ ] Test all admin workflows
- [ ] Configure email templates
- [ ] Set up payment method integration
- [ ] Test dispute resolution workflows
- [ ] Configure user warnings

## Notes

- All equipment status changes are logged for audit trail
- Damage charges require admin approval
- Users can be blacklisted to prevent future rentals
- Missing equipment tracked with automatic detection
- All disputes require evidence from both parties
- Commission payments tracked with method and date
- Analytics automatically calculated from rental data
- Admin actions send notifications to affected users
