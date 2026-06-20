# DIVE DROP Protection System

Complete safety & protection system for instructors, listers, and service providers to manage user risk, block problematic users, and enforce financial protection.

## Overview

The Protection System provides:
- **Reputation Scoring**: Automatically calculated 0-100 score based on user behavior
- **Risk Assessment**: Red flag identification and risk level classification
- **User Blocking**: Instructors/listers can block problematic users
- **Deposit System**: Financial protection through damage & booking deposits
- **Complaint Handling**: Formal complaint filing and resolution
- **Damage Claims**: Track and process equipment damage claims
- **Admin Dashboard**: Monitoring and enforcement tools

---

## System Architecture

### Core Services

1. **ReputationService** (`src/lib/protection/reputation-service.ts`)
   - Calculate reputation scores
   - Record reputation events
   - Manage blacklist status
   - Adjustment & history tracking

2. **RiskAssessmentService** (`src/lib/protection/risk-assessment-service.ts`)
   - Comprehensive risk profiling
   - Red flag identification
   - Protective measure recommendations
   - Outstanding issue detection

3. **BlockingService** (`src/lib/protection/blocking-service.ts`)
   - User blocking & unblocking
   - Deposit requirements
   - Interaction permission checks
   - Block request management

4. **ComplaintService** (`src/lib/protection/complaint-service.ts`)
   - Complaint filing & tracking
   - Damage claim processing
   - Resolution & appeals
   - Statistics & reporting

---

## Database Schema

### User Reputation Scores
```sql
user_reputation_scores
├── user_id (UUID)
├── total_score (0-100)
├── completed_rentals/trainings/bookings
├── damage_count, non_payment_count, complaints_count
├── is_blacklisted, blacklist_reason, blacklist_expiry
└── timestamps
```

### User Blocks
```sql
user_blocks
├── blocked_user_id, blocking_user_id
├── reason, reason_category
├── can_book_services, can_send_messages, can_view_contact
├── is_active, expires_at
└── unblock_request tracking
```

### Deposit Requirements
```sql
deposit_requirements
├── requiring_user_id (provider), user_id (user)
├── requirement_type (damage/booking/full)
├── amount_required, currency
├── status (pending/confirmed/refunded/claimed)
└── payment & refund tracking
```

### User Complaints
```sql
user_complaints
├── complainant_user_id, complained_against_user_id
├── related_booking_id
├── complaint_type, title, description, severity
├── status, resolution, resolved_by_admin_id
└── appeal workflow
```

### Damage Claims
```sql
damage_claims
├── lister_id (owner), renter_id (defendant)
├── booking_id, item_name, item_value
├── damage_type, damage_description, damage_photos
├── claim_amount, estimated_repair_cost
├── status, review_notes, payment tracking
```

### Provider Settings
```sql
provider_protection_settings
├── provider_id, provider_type
├── require_verified_users, minimum_reputation_score
├── require_references, auto_require_deposit
├── require_payment_upfront, require_booking_approval
├── message_filter_enabled, strict_cancellation_enabled
```

---

## Reputation Scoring Algorithm

### Initial Score: 100

### Negative Factors:
- **Equipment Damage (2+ incidents)**: -20 per incident
- **Non-Payment**: -25 per incident
- **Instructor Complaint**: -15 per complaint
- **No-Show**: -15 per incident
- **Cancellation Rate > 50%**: -20
- **Multiple Combined Issues**: Additional penalties

### Positive Factors:
- **Completed Booking**: +5
- **Positive Review**: +10
- **High Rating (4.5+)**: +10
- **On-Time Completion (95%+)**: +10
- **Completed Rentals/Trainings**: +2 per completion (max 10)

### Automatic Blacklisting:
- Score drops below 20
- Blacklist reason recorded
- Optional expiry date (for temporary blacklists)

---

## Risk Assessment

### Risk Levels

#### Critical Risk (Score 70+)
- **Characteristics**:
  - Blacklisted users
  - 3+ damage incidents
  - 2+ non-payments
  - 2+ complaints
  - Multiple combined red flags
- **Enforcement**:
  - Cannot book or rent
  - Requires payment upfront
  - Requires full deposit
  - May require references
  - Requires staff approval

#### High Risk (Score 50-69)
- **Characteristics**:
  - Score < 40
  - 1+ non-payments
  - 2+ complaints
  - Recent damage history
- **Enforcement**:
  - Cannot book/rent without approval
  - Deposit required
  - Payment upfront required
  - References recommended

#### Medium Risk (Score 30-49)
- **Characteristics**:
  - Low reputation (50-60)
  - 1+ damage incidents
  - Cancelled bookings > 30%
  - Single complaint
- **Enforcement**:
  - Deposit may be required
  - Approval recommended
  - References recommended

#### Low Risk (Score < 30)
- **Characteristics**:
  - Good standing
  - Few/no incidents
  - Positive reviews
  - High completion rate
- **Enforcement**:
  - No restrictions
  - Auto-approve eligible

---

## API Endpoints

### Reputation

#### GET `/api/protection/reputation/[userId]`
Get user reputation and risk assessment.

**Response:**
```json
{
  "reputation": {
    "user_id": "uuid",
    "total_score": 85,
    "damage_count": 1,
    "non_payment_count": 0,
    "instructor_complaints_count": 0,
    "is_blacklisted": false,
    "completed_bookings": 5
  },
  "risk_assessment": {
    "user_id": "uuid",
    "risk_level": "low",
    "risk_score": 15,
    "is_blocked_from_booking": false,
    "requires_deposit": false,
    "red_flags": []
  },
  "recent_history": [...]
}
```

### Blocking

#### POST `/api/protection/block-user`
Block a user (provider action).

**Body:**
```json
{
  "blocked_user_id": "uuid",
  "reason": "Non-payment for booking",
  "reason_category": "non_payment",
  "temporary": true,
  "expires_in_days": 30
}
```

#### GET `/api/protection/block-user`
Get list of blocked users.

**Response:**
```json
{
  "blocked_users": [
    {
      "user_id": "uuid",
      "reason": "Non-payment",
      "blocked_at": "2026-06-20T10:00:00Z",
      "expires_at": "2026-07-20T10:00:00Z"
    }
  ],
  "total_blocked": 1
}
```

### Deposits

#### POST `/api/protection/request-deposit`
Request deposit from user.

**Body:**
```json
{
  "user_id": "uuid",
  "amount": 500,
  "requirement_type": "damage_deposit",
  "reason": "User has history of equipment damage"
}
```

#### GET `/api/protection/request-deposit`
Get pending deposits for current user.

**Response:**
```json
{
  "deposits": [
    {
      "id": "uuid",
      "amount_required": 500,
      "status": "pending",
      "requirement_type": "damage_deposit",
      "reason": "Equipment damage history"
    }
  ],
  "total_pending": 1
}
```

### Complaints

#### POST `/api/protection/complaints`
File a complaint.

**Body:**
```json
{
  "complained_against_user_id": "uuid",
  "booking_id": "uuid",
  "complaint_type": "equipment_damage",
  "title": "Equipment returned damaged",
  "description": "Rented equipment returned with significant damage...",
  "severity": "high",
  "photos": ["s3://..."]
}
```

#### GET `/api/protection/complaints`
Get complaints (filed by or against user).

**Query Parameters:**
- `type`: "against" (default), "by", or "all"

### Damage Claims

#### POST `/api/protection/damage-claims`
File damage claim.

**Body:**
```json
{
  "renter_id": "uuid",
  "booking_id": "uuid",
  "item_name": "Dive Computer",
  "item_value": 800,
  "damage_type": "broken",
  "damage_description": "Screen cracked, non-functional",
  "estimated_repair_cost": 400,
  "claim_amount": 400,
  "photos": ["s3://..."]
}
```

#### GET `/api/protection/damage-claims`
Get damage claims.

**Query Parameters:**
- `type`: "filed" (default), "against", or "all"

### Admin Dashboard

#### GET `/api/admin/protection/dashboard`
Admin protection dashboard (admin only).

**Response:**
```json
{
  "dashboard_stats": {
    "total_complaints": 12,
    "open_complaints": 3,
    "pending_damage_claims": 2,
    "blacklisted_users": 4
  },
  "recent_open_complaints": [...],
  "pending_damage_claims": [...],
  "blacklisted_users": [...]
}
```

---

## Protection Policies

### Instructor/Lister Controls

Providers can configure protection policies via `provider_protection_settings`:

```typescript
{
  require_verified_users: true,           // Only verified users
  minimum_reputation_score: 60,           // Min score required
  require_references: true,               // Ask for references
  auto_require_deposit: true,             // Auto-deposit for risky users
  deposit_amount: 500,                    // Deposit amount (ILS)
  require_payment_upfront: true,          // Payment before booking
  require_booking_approval: true,         // Manual approval needed
  auto_approve_returning_users: true,     // Trusted customers
  message_filter_enabled: true,           // Filter unverified messages
  strict_cancellation_enabled: true,      // Strict cancel policy
  cancellation_penalty_percent: 25        // 25% penalty
}
```

### Booking Protection Rules

**User cannot book if:**
- Blacklisted
- Reputation score < 30
- Outstanding damage charges
- Non-payment history + recent incident
- Blocked by provider
- Pending unclaimed deposits
- Fails provider's minimum requirements

**Deposit triggers:**
- Equipment damage history (≥1 incident)
- Non-payment history
- Complaints filed by providers
- Reputation score < 50
- Medium/High/Critical risk level

---

## Reputation Impact Events

| Event | Score Change | Triggers |
|-------|--------------|----------|
| Booking Completed | +5 | Auto on completion |
| Positive Review | +10 | User/AI review |
| Damage Reported | -20 | Lister files claim |
| Non-Payment | -25 | Payment overdue >7 days |
| Complaint Filed | -15 | Provider files complaint |
| No-Show | -15 | User absent from booking |
| Negative Review | -10 | User/AI review |
| Manual Adjustment | Variable | Admin only |

---

## Workflows

### User Blocking Workflow

```
Instructor detects problematic user
    ↓
Blocks user via POST /api/protection/block-user
    ↓
User is added to blacklist (can be temporary)
    ↓
When user tries to book:
  - System checks user_blocks table
  - If active & not expired: deny booking
  - If expired: auto-unblock
    ↓
User can request unblock
  - Provides appeal reason
  - Instructor receives notification
  - Instructor can accept/reject
```

### Damage Claim Workflow

```
Booking completed, user returns equipment damaged
    ↓
Lister files damage claim via POST /api/protection/damage-claims
    ↓
System records incident (reputation -20 for renter)
    ↓
Admin reviews claim
  - Assesses validity
  - Approves/rejects with notes
    ↓
If approved:
  - Renter reputation further impacted
  - Payment amount tracked
  - Can be claimed later
    ↓
Lister receives payment
  - Via Stripe or bank transfer
  - Commission applied
```

### Complaint Resolution Workflow

```
Instructor files complaint vs user
    ↓
System records incident (reputation -15 for user)
    ↓
Complaint status: OPEN
    ↓
Admin reviews complaint
  - Assesses severity
  - Gathers evidence
  - May contact both parties
    ↓
Admin resolves:
  - SUSTAINED: provides resolution
    - Additional reputation penalty if critical
    - May lead to blacklisting (3+ sustained)
  - DISMISSED: complaint closed
    ↓
User can appeal resolution
  - Provides detailed reasoning
  - Admin reviews appeal
  - Final decision made
    ↓
If appeal accepted: revert damages/unblock
If appeal denied: resolution stands
```

---

## Enforcement Mechanisms

### Automatic Enforcement
- Score drops below 20 → Auto-blacklist
- Multiple incidents → Automatic blocking rules triggered
- Expiring blocks → Auto-unblock

### Manual Enforcement (Admin)
- Review and resolve complaints
- Approve/reject damage claims
- Adjust reputations for edge cases
- Lift blacklists with appeals
- Investigate false claims

### Provider Enforcement
- Block problematic users
- Request deposits
- Require approval for bookings
- Implement cancellation penalties
- Filter messages from unverified users

---

## Integration Points

### With Bookings
- Check user eligibility before booking allowed
- Record completion/cancellation
- Trigger reputation events
- Apply cancellation penalties

### With Payments
- Require upfront payment for risky users
- Hold deposits in escrow
- Process claim payments
- Handle refunds

### With Reviews
- Link reviews to reputation
- Weight negative reviews higher
- Factor ratings into risk

### With Support
- Ticket notifications for new complaints
- Escalation for critical issues
- Integration with helpdesk

---

## Security Considerations

### RLS Policies
- Users see only their own reputation data
- Can view blocks against them
- Can view complaints about them
- Can view claims against them
- Admins have full access

### Data Integrity
- Reputation events are immutable (append-only)
- Audit trail for all changes
- Admin notes tracked separately
- Timestamps preserved

### Financial Protection
- Deposits held in escrow
- Claims require admin approval
- Multiple review stages
- Refund tracking

---

## Monitoring & Alerts

### Dashboard Metrics
- Open complaints count
- Pending damage claims
- Blacklisted users
- Recent reputation changes
- Block requests pending review

### Alert Triggers
- Multiple complaints against same user
- Critical risk users attempting to book
- Unclaimed deposits approaching deadline
- High-value damage claims
- Potential fraud patterns

---

## Configuration

### Environment Variables
```
PROTECTION_SYSTEM_ENABLED=true
AUTO_BLACKLIST_SCORE_THRESHOLD=20
REPUTATION_RECALC_INTERVAL=24h
BLOCK_EXPIRY_AUTO_CLEANUP=true
DEPOSIT_HOLD_DAYS=30
```

### Provider Settings
Configured per provider via `provider_protection_settings` table.

---

## Deployment Checklist

- [ ] Run migration: `migrations/protection_system_schema.sql`
- [ ] Deploy services: `src/lib/protection/*`
- [ ] Deploy API routes: `src/app/api/protection/*`
- [ ] Deploy admin routes: `src/app/api/admin/protection/*`
- [ ] Create admin dashboard pages
- [ ] Add UI components for instructors/listers
- [ ] Set up email notifications
- [ ] Configure Stripe for deposit processing
- [ ] Test end-to-end workflows
- [ ] Enable RLS policies
- [ ] Monitor system performance
- [ ] Set up alerting

---

## Future Enhancements

1. **ML-based Risk Scoring**
   - Pattern detection
   - Predictive risk assessment
   - Anomaly detection

2. **Insurance Integration**
   - Claim integration
   - Premium calculation
   - Risk-based pricing

3. **Appeal Workflow**
   - Automated appeals process
   - Evidence gathering
   - Dispute resolution

4. **Verification Tiers**
   - ID verification levels
   - Background checks
   - Credit checks

5. **Reputation Decay**
   - Good behavior reduces negative marks over time
   - Removal after X years of clean record

---

## Support & Escalation

For critical issues or appeals:
- Users can contact support@divedrop.com
- Escalate to appeals@divedrop.com
- Admin dashboard shows priority cases
- SLA: Response within 24 hours

---

**Version**: 1.0.0  
**Last Updated**: 2026-06-20  
**Status**: Ready for Deployment
