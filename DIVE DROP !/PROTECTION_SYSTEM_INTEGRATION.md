# Protection System Integration Guide

Step-by-step guide to integrate the Protection System into DIVE DROP.

## Setup & Deployment

### 1. Database Migration

```bash
# Apply the protection system schema
psql -h your-supabase-host -U postgres -d postgres -f migrations/protection_system_schema.sql

# Or via Supabase CLI:
supabase db push
```

### 2. Environment Variables

Add to `.env.local`:

```env
# Protection System
NEXT_PUBLIC_PROTECTION_SYSTEM_ENABLED=true
PROTECTION_AUTO_BLACKLIST_THRESHOLD=20
PROTECTION_HIGH_RISK_THRESHOLD=40
PROTECTION_MEDIUM_RISK_THRESHOLD=60
PROTECTION_DEPOSIT_HOLD_DAYS=30

# Stripe (for deposits)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
```

### 3. Service Configuration

Create a protection config file:

```typescript
// src/lib/protection/config.ts
export const PROTECTION_CONFIG = {
  scoring: {
    startScore: 100,
    damageWeight: -20,
    nonPaymentWeight: -25,
    complaintWeight: -15,
    noShowWeight: -15,
    completionBonus: 5,
    reviewBonus: 10,
  },
  thresholds: {
    blacklist: 20,
    highRisk: 40,
    mediumRisk: 60,
  },
  deposits: {
    defaultAmount: 500,
    currency: 'ILS',
    holdDays: 30,
  },
  blocks: {
    defaultDuration: 30, // days
    autoExpire: true,
  },
};
```

## Integration with Existing Systems

### 1. Booking System Integration

In `src/app/api/bookings/route.ts`:

```typescript
import { RiskAssessmentService } from '@/lib/protection/risk-assessment-service';
import { BlockingService } from '@/lib/protection/blocking-service';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check user can book
  const riskService = new RiskAssessmentService();
  const risk = await riskService.assessUserRisk(user!.id);
  
  if (risk.is_blocked_from_booking) {
    return NextResponse.json(
      { error: 'You are restricted from booking' },
      { status: 403 }
    );
  }
  
  // Check if blocked by provider
  const blockingService = new BlockingService();
  const isBlocked = await blockingService.isUserBlocked(
    body.provider_id,
    user!.id
  );
  
  if (isBlocked) {
    return NextResponse.json(
      { error: 'You have been blocked by this provider' },
      { status: 403 }
    );
  }
  
  // Check deposit requirements
  const { canBook } = await blockingService.canUserInteractWithProvider(
    user!.id,
    body.provider_id
  );
  
  if (!canBook) {
    return NextResponse.json(
      { error: 'You must resolve pending deposits' },
      { status: 402 }
    );
  }
  
  // Continue with booking...
}
```

### 2. Booking Completion Integration

When booking marked as completed:

```typescript
import { ReputationService } from '@/lib/protection/reputation-service';

// After booking completed
const reputationService = new ReputationService();

await reputationService.recordReputationEvent(
  diver1_id,
  'booking_completed',
  5, // score change
  booking.id,
  'Booking completed successfully'
);

await reputationService.recordReputationEvent(
  diver2_id,
  'booking_completed',
  5,
  booking.id,
  'Booking completed successfully'
);
```

### 3. Payment System Integration

When payment processed:

```typescript
import { BlockingService } from '@/lib/protection/blocking-service';

// If deposit was required
if (booking.requires_deposit) {
  const blockingService = new BlockingService();
  
  await blockingService.confirmDepositPayment(
    deposit.id,
    stripeChargeId
  );
}

// If payment fails
if (paymentFailed) {
  const reputationService = new ReputationService();
  
  await reputationService.recordNonPayment(
    user_id,
    booking.id
  );
}
```

### 4. Cancellation Integration

When booking cancelled:

```typescript
import { ReputationService } from '@/lib/protection/reputation-service';

const reputationService = new ReputationService();

if (cancelled_by_user) {
  await reputationService.recordReputationEvent(
    user_id,
    'booking_cancelled',
    -3,
    booking.id,
    'Booking cancelled by user'
  );
}
```

### 5. Review System Integration

When review posted:

```typescript
import { ReputationService } from '@/lib/protection/reputation-service';

const reputationService = new ReputationService();

if (review.rating >= 4) {
  await reputationService.updateUserRating(
    reviewed_user_id,
    review.rating,
    true // isPositive
  );
} else if (review.rating <= 2) {
  await reputationService.recordReputationEvent(
    reviewed_user_id,
    'negative_review',
    -10,
    booking.id,
    'Negative review posted'
  );
}
```

## UI Components

### 1. User Reputation Widget

```typescript
// src/components/UserReputationCard.tsx
import { useEffect, useState } from 'react';

interface UserReputationCardProps {
  userId: string;
}

export function UserReputationCard({ userId }: UserReputationCardProps) {
  const [reputation, setReputation] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/protection/reputation/${userId}`)
      .then(res => res.json())
      .then(data => {
        setReputation(data.reputation);
        setRisk(data.risk_assessment);
      });
  }, [userId]);

  if (!reputation || !risk) return <div>Loading...</div>;

  return (
    <div className="reputation-card">
      <h3>User Reputation</h3>
      <div className="score-display">
        <div className="score-number">{reputation.total_score}/100</div>
        <div className={`risk-badge risk-${risk.risk_level}`}>
          {risk.risk_level.toUpperCase()}
        </div>
      </div>
      
      <div className="metrics">
        <div>Bookings Completed: {reputation.completed_bookings}</div>
        <div>Damage Incidents: {reputation.damage_count}</div>
        <div>Complaints: {reputation.instructor_complaints_count}</div>
        <div>Non-Payments: {reputation.non_payment_count}</div>
      </div>

      {risk.red_flags.length > 0 && (
        <div className="red-flags">
          <h4>Warnings:</h4>
          {risk.red_flags.map(flag => (
            <div key={flag.type} className={`flag flag-${flag.severity}`}>
              {flag.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Incoming Booking Alert

In instructor dashboard:

```typescript
// src/app/[locale]/instructor/dashboard/page.tsx
import { useEffect, useState } from 'react';

export function IncomingBookingsWithRisk() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchIncomingBookings();
  }, []);

  const fetchIncomingBookings = async () => {
    // Fetch incoming bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', currentProviderId)
      .eq('status', 'pending');

    // For each booking, fetch user reputation
    const withRisk = await Promise.all(
      bookings.map(async (booking) => {
        const res = await fetch(
          `/api/protection/reputation/${booking.diver_1_id}`
        );
        const { risk_assessment } = await res.json();
        return { ...booking, risk: risk_assessment };
      })
    );

    setBookings(withRisk);
  };

  return (
    <div>
      {bookings.map(booking => (
        <div key={booking.id} className="booking-card">
          <div className="booking-header">
            <h3>{booking.dive_site}</h3>
            <div className={`risk-badge risk-${booking.risk.risk_level}`}>
              {booking.risk.risk_level}
            </div>
          </div>

          {booking.risk.red_flags.length > 0 && (
            <div className="warnings">
              {booking.risk.red_flags.map(flag => (
                <div key={flag.type} className="warning">
                  ⚠️ {flag.description}
                </div>
              ))}
            </div>
          )}

          <div className="actions">
            {booking.risk.requires_deposit && (
              <button onClick={() => requestDeposit(booking)}>
                Request Deposit
              </button>
            )}
            {booking.risk.is_blocked_from_booking && (
              <div className="blocked">User is blocked</div>
            )}
            <button onClick={() => confirmBooking(booking)}>
              Confirm Booking
            </button>
            <button onClick={() => blockUser(booking)}>Block User</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3. File Complaint Form

```typescript
// src/components/FileComplaintForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FileComplaintFormProps {
  bookingId: string;
  againstUserId: string;
  onSubmit: () => void;
}

export function FileComplaintForm({
  bookingId,
  againstUserId,
  onSubmit,
}: FileComplaintFormProps) {
  const { register, handleSubmit } = useForm();

  const submitComplaint = async (data: any) => {
    const res = await fetch('/api/protection/complaints', {
      method: 'POST',
      body: JSON.stringify({
        complained_against_user_id: againstUserId,
        booking_id: bookingId,
        complaint_type: data.complaint_type,
        title: data.title,
        description: data.description,
        severity: data.severity,
        photos: data.photos,
      }),
    });

    if (res.ok) {
      alert('Complaint filed successfully');
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit(submitComplaint)}>
      <label>
        Complaint Type:
        <select {...register('complaint_type')}>
          <option value="">Select...</option>
          <option value="equipment_damage">Equipment Damage</option>
          <option value="no_show">No Show</option>
          <option value="non_payment">Non-Payment</option>
          <option value="safety_violation">Safety Violation</option>
          <option value="behavior">Behavior</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        Title:
        <input {...register('title')} />
      </label>

      <label>
        Description:
        <textarea {...register('description')} />
      </label>

      <label>
        Severity:
        <select {...register('severity')}>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

      <button type="submit">File Complaint</button>
    </form>
  );
}
```

### 4. Block User Form

```typescript
// src/components/BlockUserForm.tsx
import { useState } from 'react';

interface BlockUserFormProps {
  userId: string;
  onBlockSuccess: () => void;
}

export function BlockUserForm({ userId, onBlockSuccess }: BlockUserFormProps) {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [temporary, setTemporary] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);

  const handleBlock = async () => {
    const res = await fetch('/api/protection/block-user', {
      method: 'POST',
      body: JSON.stringify({
        blocked_user_id: userId,
        reason,
        reason_category: category,
        temporary,
        expires_in_days: temporary ? expiryDays : undefined,
      }),
    });

    if (res.ok) {
      alert('User blocked successfully');
      onBlockSuccess();
    }
  };

  return (
    <div className="block-user-form">
      <h3>Block User</h3>

      <label>
        Reason:
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Describe why you're blocking this user..."
        />
      </label>

      <label>
        Category:
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Select...</option>
          <option value="non_payment">Non-Payment</option>
          <option value="damage">Equipment Damage</option>
          <option value="behavior">Behavior Issue</option>
          <option value="safety_concern">Safety Concern</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={temporary}
          onChange={e => setTemporary(e.target.checked)}
        />
        Temporary Block (expires after X days)
      </label>

      {temporary && (
        <label>
          Expires in (days):
          <input
            type="number"
            value={expiryDays}
            onChange={e => setExpiryDays(parseInt(e.target.value))}
            min="1"
            max="365"
          />
        </label>
      )}

      <button onClick={handleBlock}>Block User</button>
    </div>
  );
}
```

## Testing

### Unit Tests

```typescript
// __tests__/protection/reputation-service.test.ts
import { ReputationService } from '@/lib/protection/reputation-service';

describe('ReputationService', () => {
  it('should calculate reputation score correctly', async () => {
    const service = new ReputationService();
    const score = await service.calculateReputationScore('test-user-id');
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should auto-blacklist users below threshold', async () => {
    const service = new ReputationService();
    
    // Record multiple damage incidents
    await service.recordDamageIncident('test-user', 'major');
    await service.recordDamageIncident('test-user', 'major');
    await service.recordDamageIncident('test-user', 'major');
    
    const reputation = await service.getOrCreateReputation('test-user');
    expect(reputation.is_blacklisted).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/protection-workflow.test.ts
describe('Protection System Workflow', () => {
  it('should complete full damage claim workflow', async () => {
    // 1. File damage claim
    // 2. Check reputation impact
    // 3. Admin reviews claim
    // 4. Process payment
    // 5. Verify reputation updated
  });
});
```

## Monitoring

### Key Metrics to Track

1. **Reputation Metrics**
   - Average user score
   - Blacklist rate
   - Score distribution

2. **Risk Metrics**
   - Users by risk level
   - Booking rejection rate
   - False positive rate

3. **Complaint Metrics**
   - Open complaints
   - Resolution time
   - Appeal rate

4. **Financial Metrics**
   - Total deposits held
   - Damage claims approved
   - Refund amounts

### Setup Monitoring

```typescript
// src/lib/protection/monitoring.ts
import { createClient } from '@/lib/supabase/server';

export async function logProtectionMetric(
  metric: string,
  value: number,
  tags?: Record<string, string>
) {
  const supabase = createClient();
  
  await supabase
    .from('protection_metrics')
    .insert({
      metric_name: metric,
      metric_value: value,
      tags,
      recorded_at: new Date().toISOString(),
    });
}
```

## Troubleshooting

### User claims they were wrongly blocked
1. Check `user_blocks` table for the block record
2. Review `reputation_history` for events leading to block
3. Check if block was automatic (blacklist) or manual (provider)
4. Allow appeal via complaint system
5. Admin can unblock after investigation

### Deposit not being released
1. Check `deposit_requirements` status
2. Verify payment was processed (`payment_received_at`)
3. If claimed, ensure claim was approved
4. Manual refund may be needed

### Reputation score seems incorrect
1. Check all reputation events in `reputation_history`
2. Manually recalculate using `ReputationService.calculateReputationScore()`
3. Check for RLS policy issues blocking data access
4. Admin can manually adjust with notes

---

## Support

For questions or issues:
- Review `PROTECTION_SYSTEM.md` for full documentation
- Check test files for usage examples
- Contact the development team

