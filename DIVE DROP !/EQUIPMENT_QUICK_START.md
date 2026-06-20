# Equipment Management System - Quick Start Guide

## 5-Minute Setup

### 1. Apply Migration
```bash
# Run in Supabase SQL editor
-- Load and execute migrations/004_equipment_management_system.sql
```

### 2. Create Service
Already created: `src/lib/equipment/equipment-service.ts`

### 3. Set Up API Middleware
Update your API middleware to pass user ID header:

```typescript
// src/lib/equipment/middleware.ts
import { NextRequest } from 'next/server';

export function addUserIdHeader(request: NextRequest) {
  // Get user from auth session
  const userId = request.headers.get('x-user-id') || 'unknown';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', userId);
  return requestHeaders;
}
```

## File Structure

```
src/
├── lib/
│   └── equipment/
│       ├── schemas.ts (CREATED)
│       └── equipment-service.ts (CREATED)
│
├── components/
│   └── equipment/
│       ├── EquipmentStatusBadge.tsx (CREATED)
│       ├── EquipmentList.tsx (CREATED)
│       ├── DamageReportCard.tsx (CREATED)
│       └── ProblematicRenterWarning.tsx (CREATED)
│
└── app/
    └── api/
        ├── equipment/
        │   ├── route.ts (CREATED)
        │   ├── [id]/
        │   │   ├── route.ts (CREATED)
        │   │   ├── status/route.ts (CREATED)
        │   │   └── damage-report/route.ts (CREATED)
        │   ├── status-history/[id]/route.ts (CREATED)
        │   └── missing-list/route.ts (CREATED)
        ├── damage-reports/
        │   ├── route.ts (CREATED)
        │   └── [id]/respond/route.ts (CREATED)
        └── users/
            └── [id]/
                ├── problematic-status/route.ts (CREATED)
                └── renter-warnings/route.ts (CREATED)
```

## Core Workflows

### Workflow 1: Create & Manage Equipment

```typescript
// 1. Create equipment
const equipment = await service.createEquipment(userId, {
  name: 'Wetsuit XL',
  equipment_type: 'wetsuit',
  rental_price_per_day: 50,
  condition_rating: 5
});
// Status: 'available'

// 2. Renter picks up
await service.updateEquipmentStatus(equipmentId, userId, {
  status: 'unavailable',
  reason: 'rental_start'
});

// 3. Renter returns it
await service.updateEquipmentStatus(equipmentId, userId, {
  status: 'returned_ok',
  reason: 'rental_return'
});

// 4. Back to available
await service.updateEquipmentStatus(equipmentId, userId, {
  status: 'available',
  reason: 'verified_ok'
});
```

### Workflow 2: Report & Assess Damage

```typescript
// 1. Renter reports damage
const report = await service.reportDamage(userId, {
  equipment_id: equipmentId,
  report_role: 'renter',
  damage_type: 'moderate',
  description: 'Shoulder strap torn',
  repair_cost_estimate: 100
});
// Equipment auto-marked as 'returned_damaged' if severe

// 2. Lister reviews pending reports
const pending = await service.getListerPendingDamageReports(listerId);

// 3. Lister responds
await service.respondToDamageReport(reportId, listerId, {
  lister_response: 'Confirmed. Sending to repair shop.',
  repair_cost_actual: 100,
  status: 'approved'
});
// Renter auto-marked as problematic
// Equipment marked as 'damaged'

// 4. Equipment fixed
await service.updateEquipmentStatus(equipmentId, listerId, {
  status: 'available',
  reason: 'repair_completed'
});
```

### Workflow 3: Track Problematic Users

```typescript
// Auto-created when damage approved, or manual:
const problematicUser = await service.markProblematicUser(listerId, {
  user_id: renterId,
  reason: 'equipment_damage',
  blacklist_level: 'restricted',
  description: 'Damaged equipment during rental'
});

// Check if user can rent
const canRent = await service.canUserRent(renterId);
if (!canRent) {
  // Prevent booking
}

// Lister sees warning when checking renter
const warnings = await service.getListerRenterWarnings(listerId, renterId);

// Resolve issue when settled
await service.resolveProblematicUser(listerId, problematicUserId);
```

## Status Codes & Meanings

### Equipment Status
| Status | Meaning | Next Action |
|--------|---------|-------------|
| `available` | Ready to rent | List to customers |
| `unavailable` | Currently rented | Wait for return |
| `returned_ok` | Back in good shape | Verify & mark available |
| `returned_damaged` | Needs assessment | Lister reviews & decides |
| `damaged` | Needs repair | Send to shop or store |
| `missing` | Lost/stolen | File report with admin |

### Damage Report Status
| Status | Meaning | Action |
|--------|---------|--------|
| `pending_review` | Awaiting lister response | Lister must respond |
| `approved` | Lister confirms damage | Mark renter as problematic |
| `rejected` | Lister disputes claim | Dispute resolution |
| `resolved` | Damage handled | Close out |

### Blacklist Levels
| Level | Effect | Recovery |
|-------|--------|----------|
| `warning` | Yellow flag for listers | Auto-expires or manual override |
| `restricted` | Can't rent equipment | Resolve issue & admin approval |
| `banned` | Permanently blocked | Appeal to admin (rare) |

## React Usage

### Show Equipment Status
```tsx
import { EquipmentStatusBadge } from '@/components/equipment/EquipmentStatusBadge';

<EquipmentStatusBadge status="returned_damaged" />
```

### List All Equipment
```tsx
import { EquipmentList } from '@/components/equipment/EquipmentList';

<EquipmentList 
  listerId={currentUser.id}
  statusFilter="available"
  onEquipmentSelect={(eq) => console.log(eq)}
/>
```

### Show Damage Reports
```tsx
import { DamageReportCard } from '@/components/equipment/DamageReportCard';

<DamageReportCard
  report={damageReport}
  onRespond={(id) => handleReviewDamage(id)}
  isPending={true}
/>
```

### Warn About Renter
```tsx
import { ProblematicRenterWarning } from '@/components/equipment/ProblematicRenterWarning';

<ProblematicRenterWarning warning={warning} />
```

## API Quick Reference

### Lister Dashboard
```bash
# Get my equipment
GET /api/equipment?lister_id={id}

# Get my pending damage reports
GET /api/damage-reports?scope=pending

# Get warnings about a renter
GET /api/users/{myId}/renter-warnings?renter_id={renterId}

# Respond to damage report
POST /api/damage-reports/{id}/respond
{
  "lister_response": "...",
  "repair_cost_actual": 100,
  "status": "approved"
}
```

### Renter Dashboard
```bash
# Report damage to equipment
POST /api/equipment/{id}/damage-report
{
  "report_role": "renter",
  "damage_type": "moderate",
  "description": "...",
  "repair_cost_estimate": 100
}

# Check if I'm blacklisted
GET /api/users/{myId}/problematic-status
```

### Admin Dashboard
```bash
# Get all missing equipment
GET /api/equipment/missing-list

# Get all damage reports
GET /api/damage-reports

# Get all problematic users
GET /api/problematic-users
```

## Error Handling

```typescript
try {
  const equipment = await service.createEquipment(userId, data);
} catch (error) {
  if (error.code === '23505') {
    // Unique constraint violation (e.g., serial number exists)
    console.error('Equipment already registered');
  } else if (error.message.includes('Not authorized')) {
    console.error('Permission denied');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Testing Scenarios

### Test 1: Equipment Lifecycle
```
1. Create equipment (status=available)
2. Rent it (status=unavailable)
3. Return good (status=returned_ok)
4. Mark verified (status=available)
✓ Status history should show all transitions
```

### Test 2: Damage Assessment
```
1. Create equipment
2. Rent to user A
3. User A reports moderate damage
4. Lister reviews & approves
5. User A marked as problematic (restricted)
6. User A can't rent again
✓ Blacklist level should prevent new rentals
```

### Test 3: Renter Protection
```
1. Lister B marks renter A as problematic
2. Renter A tries to rent from lister C
3. Lister C sees warning when checking renter
4. Lister C can decline the booking
✓ Warning should appear in /users/{id}/renter-warnings
```

### Test 4: Missing Equipment
```
1. Create equipment
2. Mark as missing
3. Query missing-list endpoint
✓ Equipment should appear in admin missing list
```

## Common Customizations

### Change Blacklist Thresholds
In `equipment-service.ts`:
```typescript
private getDamageBlacklistLevel(damageType: DamageType): BlacklistLevel {
  switch (damageType) {
    case 'minor':
      return 'warning'; // Change this
    case 'moderate':
      return 'restricted'; // Or this
    case 'severe':
      return 'banned';
  }
}
```

### Add Auto-Expiring Warnings
Add a cron job:
```typescript
// Every 30 days, resolve warnings older than 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
await supabase
  .from('problematic_users')
  .update({ is_resolved: true })
  .lt('created_at', thirtyDaysAgo.toISOString())
  .eq('blacklist_level', 'warning');
```

### Send Email on Damage Report
Add webhook in API handler:
```typescript
const report = await service.reportDamage(userId, data);

// Send email to lister
await sendEmail({
  to: lister.email,
  subject: 'New Damage Report',
  body: `Equipment ${equipment.name} has been reported as damaged`
});
```

## Next Steps

1. **Deploy** the migration to production
2. **Test** all status transitions
3. **Add lister dashboard** page using components
4. **Add renter dashboard** page for damage reporting
5. **Integrate with booking system** to block restricted users
6. **Set up notifications** for damage reports
7. **Create admin dashboard** for missing equipment
8. **Monitor** damage patterns per equipment/user

## Support & Documentation

- Full guide: `EQUIPMENT_MANAGEMENT_GUIDE.md`
- Schemas: `src/lib/equipment/schemas.ts`
- Service: `src/lib/equipment/equipment-service.ts`
- Database: `migrations/004_equipment_management_system.sql`
