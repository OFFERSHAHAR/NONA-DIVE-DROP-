# Equipment Status & Management System Guide

## Overview

The Equipment Status & Management System is a comprehensive solution for tracking rental equipment, managing damage reports, and handling problematic users. It provides listers with complete visibility into their inventory and enables the platform to enforce safety and quality standards.

## Database Schema (6 Tables)

### 1. `equipment` Table
Core equipment inventory with comprehensive status tracking.

**Key Fields:**
- `id`: UUID - Primary key
- `lister_id`: UUID - Owner of the equipment (FK to auth.users)
- `name`: VARCHAR(255) - Equipment name
- `equipment_type`: VARCHAR(100) - Type classification
- `status`: VARCHAR(50) - Current state (6 states)
- `rental_price_per_day`: DECIMAL - Daily rental cost
- `condition_rating`: INTEGER (1-5) - Equipment condition
- `current_renter_id`: UUID - Who has it now
- `created_at`, `updated_at`: Timestamps

**Status Values:**
- `available` - Ready for rental
- `unavailable` - Currently rented out
- `missing` - Lost/stolen
- `damaged` - Needs repair
- `returned_damaged` - Returned but needs assessment
- `returned_ok` - Returned in good condition

### 2. `damage_reports` Table
Tracks all equipment damage incidents and claims.

**Key Fields:**
- `id`: UUID - Primary key
- `equipment_id`: UUID - FK to equipment
- `rental_id`: UUID - FK to rentals (optional)
- `reported_by`: UUID - Who filed report
- `report_role`: VARCHAR - 'renter' or 'lister'
- `damage_type`: VARCHAR - 'minor', 'moderate', 'severe'
- `description`: TEXT - Damage details
- `damage_photos`: TEXT[] - Photo URLs
- `repair_cost_estimate`: DECIMAL - Estimated cost
- `status`: VARCHAR - Review status

**Status Workflow:**
```
pending_review -> approved/rejected -> resolved
```

### 3. `equipment_status_log` Table
Audit trail of all equipment status changes.

**Key Fields:**
- `id`: UUID - Primary key
- `equipment_id`: UUID - FK to equipment
- `old_status`: VARCHAR - Previous status
- `new_status`: VARCHAR - New status
- `changed_by`: UUID - Who made the change
- `reason`: VARCHAR - Why it changed
- `notes`: TEXT - Additional context
- `created_at`: TIMESTAMP - When it changed

### 4. `problematic_users` Table
Tracks users with safety, damage, or payment issues.

**Key Fields:**
- `id`: UUID - Primary key
- `user_id`: UUID - FK to auth.users
- `reason`: VARCHAR - Issue type
- `related_rental_id`: UUID - Associated rental
- `related_damage_report_id`: UUID - Associated damage report
- `blacklist_level`: VARCHAR - Severity level
- `description`: TEXT - Detailed reason
- `is_resolved`: BOOLEAN - Whether issue is resolved
- `first_incident_date`: TIMESTAMP
- `resolution_date`: TIMESTAMP

**Reasons:**
- `equipment_damage` - Damaged equipment
- `non_payment` - Failed to pay
- `theft` - Stole equipment
- `harassment` - Harassed other users
- `fraud` - Fraudulent activity
- `safety_violation` - Violated safety protocols
- `other` - Other issues

**Blacklist Levels:**
- `warning` - Yellow flag for listers
- `restricted` - Can't book new rentals
- `banned` - Permanently banned

### 5. `lister_renter_warnings` Table
Warnings shown to listers about problematic renters.

**Key Fields:**
- `id`: UUID - Primary key
- `lister_id`: UUID - The lister being warned
- `renter_id`: UUID - The problematic renter
- `warning_level`: VARCHAR - 'caution', 'warning', 'critical'
- `reason`: TEXT - Why this warning exists
- `lister_has_seen`: BOOLEAN - Has lister acknowledged?
- `created_at`: TIMESTAMP

### 6. `rentals` Table
Links equipment rentals to users (reference table).

**Key Fields:**
- `id`: UUID - Primary key
- `equipment_id`: UUID - FK to equipment
- `renter_id`: UUID - Who rented it
- `lister_id`: UUID - Who owns it
- `start_date`, `end_date`: TIMESTAMP - Rental period
- `rental_status`: VARCHAR - Active, completed, cancelled
- `total_price`: DECIMAL

## Status Workflow Logic

### Equipment Status Transitions

```
                    ┌─────────────┐
                    │ available   │
                    └─────────────┘
                           │
                    (renter picks up)
                           │
                    ┌─────────────┐
                    │ unavailable │
                    └─────────────┘
                           │
                    (equipment returned)
                           │
                  ┌────────┴──────────┐
                  │                   │
            ┌─────────────┐   ┌──────────────┐
            │ returned_ok │   │returned_damage│
            └─────────────┘   └──────────────┘
                  │                   │
                  │      (assessed)   │
                  │          ↓        │
                  │      ┌───────┐    │
                  │      │damaged│◄───┘
                  │      └───────┘
                  │          │
                  │    (repaired)
                  │          │
                  └──────┬───┘
                         │
                  ┌─────────────┐
                  │ available   │
                  └─────────────┘

Special Cases:
- equipment_missing: Lister marks equipment lost (irreversible)
- damage_reported: System auto-marks as returned_damaged if severe
```

### Damage Assessment Flow

1. **Report Submitted** (renter or lister)
   - Status: `pending_review`
   - Includes photos and description

2. **Lister Reviews** 
   - Responds with assessment
   - Sets actual repair cost
   - Marks as `approved` or `rejected`

3. **If Approved**
   - Equipment marked as `damaged`
   - Renter marked as problematic (if damage was their fault)
   - Blacklist level set based on severity

4. **Resolution**
   - Lister arranges repair
   - Report marked as `resolved`
   - Equipment returns to `available` when ready

### Problematic User Detection

**Automatic Flagging:**
- Damage approved → renter marked as problematic
- Severity determines blacklist level:
  - Minor damage → `warning`
  - Moderate damage → `restricted`
  - Severe damage → `banned`

**Manual Flagging:**
- Admin marks user for: non-payment, theft, harassment, fraud
- Can set custom blacklist level

**Renter Protection:**
- `restricted` users can't book new rentals
- `banned` users completely blocked
- Listers see `caution` warnings about users

## API Endpoints

### Equipment Management

**POST** `/api/equipment`
Create new equipment listing
```json
{
  "name": "Wetsuit XL",
  "equipment_type": "wetsuit",
  "rental_price_per_day": 50,
  "condition_rating": 5,
  "brand": "O'Neill",
  "photo_urls": ["https://..."]
}
```

**GET** `/api/equipment?lister_id={id}&status=available`
Get lister's equipment with filters

**GET** `/api/equipment/{id}`
Get single equipment details

**PUT** `/api/equipment/{id}/status`
Update equipment status
```json
{
  "status": "returned_damaged",
  "reason": "rental_return",
  "notes": "Minor scratches on lens"
}
```

**GET** `/api/equipment/status-history/{id}`
Get status change history

### Damage Reporting

**POST** `/api/equipment/{id}/damage-report`
Report damage to equipment
```json
{
  "report_role": "renter",
  "damage_type": "moderate",
  "description": "BCD shoulder strap torn",
  "damage_photos": ["https://..."],
  "repair_cost_estimate": 150
}
```

**GET** `/api/equipment/{id}/damage-report`
Get damage reports for equipment

**POST** `/api/damage-reports/{id}/respond`
Lister responds to damage claim
```json
{
  "lister_response": "Damage confirmed. Processing repair.",
  "repair_cost_actual": 150,
  "status": "approved"
}
```

**GET** `/api/damage-reports?scope=pending`
Get lister's pending damage reports

### User Management

**GET** `/api/users/{id}/problematic-status`
Check if user has issues
```json
{
  "user_id": "...",
  "has_issues": true,
  "can_rent": false,
  "issues": [
    {
      "reason": "equipment_damage",
      "blacklist_level": "restricted"
    }
  ]
}
```

**GET** `/api/users/{id}/renter-warnings?renter_id={id}`
Get warnings about a specific renter

**GET** `/api/equipment/missing-list`
Get all missing equipment (admin only)

## Service Layer (`EquipmentService`)

```typescript
const service = new EquipmentService(supabase);

// Equipment
await service.createEquipment(userId, data);
await service.getEquipment(equipmentId);
await service.getListerEquipment(userId, filters);
await service.updateEquipmentStatus(equipmentId, userId, update);
await service.getStatusHistory(equipmentId);

// Damage Reports
await service.reportDamage(userId, data);
await service.getEquipmentDamageReports(equipmentId);
await service.getListerPendingDamageReports(userId);
await service.respondToDamageReport(reportId, userId, response);

// Problematic Users
await service.markProblematicUser(initiatedBy, data);
await service.getUserProblematicStatus(userId);
await service.canUserRent(userId);
await service.getListerRenterWarnings(listerId, renterId);
await service.getListerPendingWarnings(listerId);
await service.resolveProblematicUser(userId, problematicUserId);

// Admin
await service.getMissingEquipmentList();
await service.getAllDamageReports(filters);
await service.getAllProblematicUsers(filters);
```

## React Components

### `EquipmentStatusBadge`
Display equipment status with color coding
```tsx
<EquipmentStatusBadge status="returned_damaged" />
```

### `EquipmentList`
List all equipment with filters
```tsx
<EquipmentList 
  listerId={userId} 
  statusFilter="available"
  onEquipmentSelect={handleSelect}
/>
```

### `DamageReportCard`
Display damage report with response options
```tsx
<DamageReportCard 
  report={report} 
  onRespond={handleRespond}
  isPending={true}
/>
```

### `ProblematicRenterWarning`
Show warning about a problematic renter
```tsx
<ProblematicRenterWarning warning={warning} />
```

## Zod Schemas

All data validated with Zod:
- `equipmentCreateSchema` - Create equipment
- `equipmentStatusUpdateSchema` - Update status
- `damageReportCreateSchema` - Report damage
- `damageReportResponseSchema` - Respond to damage
- `problematicUserCreateSchema` - Mark user as problematic

## Row Level Security (RLS)

### Equipment Table
- SELECT: Public (all users)
- INSERT/UPDATE: Only lister can modify their own

### Damage Reports
- SELECT: Only equipment lister and reporter
- INSERT: Any authenticated user

### Status Log
- SELECT: Public read
- INSERT: System only

### Problematic Users
- SELECT: User can see their own record
- INSERT: System only

### Lister Warnings
- SELECT: Only the receiving lister

### Rentals
- SELECT: Renter, lister, or admin
- INSERT/UPDATE: System only

## Database Triggers

1. **`equipment_update_timestamp`**
   - Auto-updates `updated_at` on equipment changes

2. **`damage_reports_update_timestamp`**
   - Auto-updates `updated_at` on damage report changes

3. **`equipment_status_log_trigger`**
   - Auto-creates history entry when status changes

4. **`problematic_user_warning_trigger`**
   - Auto-creates lister warnings when user marked as problematic

## Deployment Checklist

- [ ] Apply migration: `004_equipment_management_system.sql`
- [ ] Create `/src/lib/equipment` directory with:
  - [ ] `schemas.ts` - Zod validation
  - [ ] `equipment-service.ts` - Business logic
- [ ] Create API routes in `/src/app/api/`:
  - [ ] `equipment/route.ts`
  - [ ] `equipment/[id]/route.ts`
  - [ ] `equipment/[id]/status/route.ts`
  - [ ] `equipment/[id]/damage-report/route.ts`
  - [ ] `equipment/status-history/[id]/route.ts`
  - [ ] `damage-reports/route.ts`
  - [ ] `damage-reports/[id]/respond/route.ts`
  - [ ] `users/[id]/problematic-status/route.ts`
  - [ ] `users/[id]/renter-warnings/route.ts`
  - [ ] `equipment/missing-list/route.ts`
- [ ] Create components in `/src/components/equipment/`:
  - [ ] `EquipmentStatusBadge.tsx`
  - [ ] `EquipmentList.tsx`
  - [ ] `DamageReportCard.tsx`
  - [ ] `ProblematicRenterWarning.tsx`
- [ ] Update header middleware to pass `x-user-id` header
- [ ] Test all status transitions
- [ ] Test damage report workflow
- [ ] Test problematic user detection
- [ ] Deploy to Vercel

## Usage Examples

### Creating Equipment
```typescript
const service = new EquipmentService(supabase);
const equipment = await service.createEquipment(userId, {
  name: 'Wetsuit XL',
  equipment_type: 'wetsuit',
  rental_price_per_day: 50,
  brand: "O'Neill",
  description: 'Like new condition'
});
```

### Reporting Damage
```typescript
const report = await service.reportDamage(userId, {
  equipment_id: 'equipment-uuid',
  report_role: 'renter',
  damage_type: 'moderate',
  description: 'BCD shoulder strap torn',
  repair_cost_estimate: 150
});
```

### Responding to Damage
```typescript
await service.respondToDamageReport(reportId, listerId, {
  lister_response: 'Damage confirmed, will repair',
  repair_cost_actual: 150,
  status: 'approved'
});
```

### Checking Renter Status
```typescript
const canRent = await service.canUserRent(renterId);
if (!canRent) {
  // Show warning or block booking
}

const warnings = await service.getListerRenterWarnings(listerId, renterId);
```

## Security Considerations

1. **RLS Policies** prevent unauthorized access
2. **Validation** via Zod on all inputs
3. **Audit Trail** tracks all status changes
4. **User Verification** prevents false damage claims
5. **Escalation Path** for disputes

## Future Enhancements

- [ ] Automated damage assessment via AI image analysis
- [ ] Insurance integration for high-value equipment
- [ ] Damage deposit system
- [ ] Equipment condition photo documentation at rental/return
- [ ] Escalation to platform admins for disputes
- [ ] Email notifications for pending actions
- [ ] SMS alerts for missing equipment
- [ ] Monthly equipment condition reports
- [ ] Lister reputation scoring based on responsiveness
- [ ] Renter trust score based on damage history
