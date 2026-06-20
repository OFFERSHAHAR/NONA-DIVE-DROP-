# Protection System Setup Checklist

Complete checklist for deploying the Protection System to production.

## Pre-Deployment (Development)

### Code & Configuration
- [x] Create type definitions (`src/types/protection.ts`)
- [x] Create reputation service (`src/lib/protection/reputation-service.ts`)
- [x] Create risk assessment service (`src/lib/protection/risk-assessment-service.ts`)
- [x] Create blocking service (`src/lib/protection/blocking-service.ts`)
- [x] Create complaint service (`src/lib/protection/complaint-service.ts`)
- [x] Create Zod schemas (`src/lib/protection/schemas.ts`)
- [x] Create API endpoints (reputation, block, deposit, complaints, claims, admin)
- [x] Database migration file (`migrations/protection_system_schema.sql`)

### Documentation
- [x] Full system documentation (`PROTECTION_SYSTEM.md`)
- [x] Integration guide (`PROTECTION_SYSTEM_INTEGRATION.md`)
- [x] Setup checklist (this file)

## Database Setup

### 1. Create Tables
```bash
# Using Supabase CLI
supabase db push

# Or manually:
psql -h your-host -U postgres -f migrations/protection_system_schema.sql
```

**Verify tables created:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%reputation%' OR table_name LIKE '%block%' OR table_name LIKE '%complaint%';
```

### 2. Enable RLS (Row Level Security)
```bash
# This is in the migration, but verify:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN (
  'user_reputation_scores',
  'user_blocks',
  'deposit_requirements',
  'user_complaints',
  'damage_claims'
);
```

### 3. Create Indexes
```bash
# All indexes are in the migration file, verify they exist:
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('user_reputation_scores', 'user_blocks', 'damage_claims');
```

### 4. Test Database Connection
```typescript
// src/lib/protection/__tests__/db-connection.test.ts
import { createClient } from '@/lib/supabase/server';

async function testDBConnection() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_reputation_scores')
    .select('count')
    .limit(1);
  
  console.log('DB Connection:', error ? 'FAILED' : 'OK');
  return !error;
}
```

## Application Setup

### 1. Environment Variables
Add to `.env.local`:
```env
# Protection System
NEXT_PUBLIC_PROTECTION_SYSTEM_ENABLED=true
PROTECTION_AUTO_BLACKLIST_THRESHOLD=20
PROTECTION_HIGH_RISK_THRESHOLD=40
PROTECTION_MEDIUM_RISK_THRESHOLD=60
PROTECTION_DEPOSIT_HOLD_DAYS=30
PROTECTION_ADMIN_EMAIL=admin@divedrop.com
PROTECTION_SUPPORT_EMAIL=support@divedrop.com

# Stripe (for deposits)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Install Dependencies
```bash
npm install # All protection code uses existing dependencies
```

### 3. Verify Imports
```bash
# Check all imports resolve correctly
npm run build
```

### 4. Run Type Checks
```bash
npx tsc --noEmit
```

## Testing Setup

### 1. Unit Tests
```bash
# Create test directory
mkdir -p __tests__/lib/protection

# Run tests
npm run test -- protection
```

### 2. Integration Tests
```bash
# Test with real database
npm run test:integration -- protection
```

### 3. API Tests
```bash
# Test all endpoints
npm run test:api -- /api/protection
```

### Smoke Tests
```typescript
// __tests__/protection/smoke.test.ts
import { ReputationService } from '@/lib/protection/reputation-service';
import { RiskAssessmentService } from '@/lib/protection/risk-assessment-service';
import { BlockingService } from '@/lib/protection/blocking-service';

describe('Protection System Smoke Tests', () => {
  it('should instantiate all services', () => {
    expect(new ReputationService()).toBeDefined();
    expect(new RiskAssessmentService()).toBeDefined();
    expect(new BlockingService()).toBeDefined();
  });
});
```

## UI Components Setup

### 1. Create Component Files
```bash
mkdir -p src/components/protection
mkdir -p src/app/[locale]/protection
```

### 2. Build Core Components
- [ ] UserReputationCard
- [ ] IncomingBookingAlert
- [ ] BlockUserForm
- [ ] FileComplaintForm
- [ ] RequestDepositForm
- [ ] DamageClaimForm
- [ ] ProtectionDashboard

### 3. Test Components
```bash
npm run test -- components/protection
```

## Integration Setup

### 1. Booking System
- [ ] Add reputation check before booking confirmation
- [ ] Add block check before allowing booking
- [ ] Record booking completion events
- [ ] Handle booking cancellation events

### 2. Payment System
- [ ] Implement deposit collection
- [ ] Add deposit refund logic
- [ ] Handle payment failures

### 3. Review System
- [ ] Link reviews to reputation
- [ ] Update ratings in reputation score
- [ ] Record positive/negative review events

### 4. Notification System
- [ ] Email notifications for complaints
- [ ] Email notifications for blocks
- [ ] Email notifications for deposit requests
- [ ] Push notifications for critical alerts

## Admin Features Setup

### 1. Admin Dashboard
- [ ] Create admin dashboard page
- [ ] Display complaint queue
- [ ] Display damage claims queue
- [ ] Display blacklisted users
- [ ] Display metrics/stats

### 2. Admin Actions
- [ ] Resolve complaints interface
- [ ] Approve/reject damage claims
- [ ] Manually adjust reputation
- [ ] Lift blacklists
- [ ] Review blocked users

### 3. Audit Trail
- [ ] Log all admin actions
- [ ] Display audit trail in admin panel
- [ ] Export audit logs

## Security Hardening

### 1. RLS Policies
- [ ] Verify all RLS policies are in place
- [ ] Test that users can't access others' data
- [ ] Test that admins have full access

### 2. API Security
- [ ] Add rate limiting to protection endpoints
- [ ] Validate all inputs with Zod schemas
- [ ] Add CSRF protection
- [ ] Add API key validation for webhooks

### 3. Data Privacy
- [ ] Ensure sensitive data is encrypted
- [ ] Implement data retention policies
- [ ] Add GDPR deletion support
- [ ] Audit data access logs

## Performance Optimization

### 1. Database
- [ ] Add all required indexes
- [ ] Analyze query performance
- [ ] Optimize slow queries
- [ ] Set up query logging

### 2. API Performance
- [ ] Cache reputation scores (5-10 mins)
- [ ] Batch reputation calculations
- [ ] Implement pagination on list endpoints
- [ ] Profile API response times

### 3. Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor API performance
- [ ] Track database metrics
- [ ] Set up uptime monitoring

## Deployment

### 1. Staging Environment
```bash
# Deploy to staging
npm run build
npm run start

# Run smoke tests
npm run test:smoke
```

### 2. Production Deployment
```bash
# Deploy to production
git push production main

# Verify services are running
curl https://api.divedrop.com/api/protection/reputation/test
```

### 3. Post-Deployment
- [ ] Monitor logs for errors
- [ ] Check database for data corruption
- [ ] Verify all endpoints are working
- [ ] Test critical user journeys
- [ ] Monitor performance metrics

## Feature Flags

### Enable Protection System Gradually

```typescript
// src/lib/protection/feature-flags.ts
export const PROTECTION_FEATURES = {
  // Phase 1: Core reputation
  REPUTATION_SCORING: process.env.NEXT_PUBLIC_PROTECTION_ENABLED === 'true',
  
  // Phase 2: Blocking & deposits
  USER_BLOCKING: process.env.NEXT_PUBLIC_PROTECTION_ENABLED === 'true',
  DEPOSIT_SYSTEM: process.env.NEXT_PUBLIC_PROTECTION_ENABLED === 'true',
  
  // Phase 3: Complaints & claims
  COMPLAINT_SYSTEM: process.env.NEXT_PUBLIC_PROTECTION_ENABLED === 'true',
  DAMAGE_CLAIMS: process.env.NEXT_PUBLIC_PROTECTION_ENABLED === 'true',
  
  // Phase 4: Admin tools
  ADMIN_DASHBOARD: process.env.NEXT_PUBLIC_PROTECTION_ENABLED === 'true',
};
```

### Rollout Strategy
1. **Week 1**: Enable reputation scoring only (read-only)
2. **Week 2**: Enable blocking & deposits
3. **Week 3**: Enable complaints & damage claims
4. **Week 4**: Enable admin dashboard & full enforcement

## User Communication

### 1. Email Templates
- [ ] Account blocked notification
- [ ] Deposit request email
- [ ] Complaint filed notification
- [ ] Complaint resolved notification
- [ ] Reputation score notification

### 2. Help Center Articles
- [ ] How reputation scores work
- [ ] Why you were blocked
- [ ] How to appeal a block
- [ ] Deposit policies
- [ ] Complaint process

### 3. In-App Messaging
- [ ] Toast notifications for warnings
- [ ] Modals for critical alerts
- [ ] Dashboard warnings for at-risk users
- [ ] Inline help text

## Training

### 1. Instructor/Lister Training
- [ ] How to view reputation scores
- [ ] How to block users
- [ ] How to request deposits
- [ ] How to file complaints
- [ ] How to manage blocked users

### 2. Admin Training
- [ ] Dashboard navigation
- [ ] Complaint resolution process
- [ ] Damage claim review process
- [ ] Blacklist management
- [ ] Reputation adjustment procedures

### 3. Support Team Training
- [ ] How to investigate complaints
- [ ] How to assist with appeals
- [ ] How to check reputation scores
- [ ] Escalation procedures
- [ ] Data privacy requirements

## Monitoring & Alerts

### 1. Set Up Monitoring
```bash
# Monitor key metrics
- Reputation score distribution
- Blacklist count
- Open complaints count
- Pending damage claims
- Block requests
- Deposit collection rate
```

### 2. Set Up Alerts
```
- High number of new complaints (>10/day)
- Large damage claims (>1000 ILS)
- Critical risk users attempting to book
- System errors in protection APIs
- RLS policy violations
```

### 3. Dashboard Queries
```sql
-- Daily metrics
SELECT 
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT CASE WHEN is_blacklisted THEN user_id END) as blacklisted,
  AVG(total_score) as avg_reputation,
  (SELECT COUNT(*) FROM user_blocks WHERE is_active) as active_blocks,
  (SELECT COUNT(*) FROM user_complaints WHERE status = 'open') as open_complaints,
  (SELECT COUNT(*) FROM damage_claims WHERE status = 'claimed') as pending_claims
FROM user_reputation_scores
WHERE updated_at > now() - interval '24 hours';
```

## Rollback Plan

### If Issues Occur
1. Set `NEXT_PUBLIC_PROTECTION_SYSTEM_ENABLED=false`
2. Restore database backup if needed
3. Roll back code to previous version
4. Investigate root cause
5. Fix and redeploy

### Keep Ready
- [ ] Database backup (daily)
- [ ] Code rollback procedure
- [ ] Incident response plan
- [ ] Support runbooks

## Success Criteria

- [ ] All tests passing (unit, integration, e2e)
- [ ] API endpoints responding correctly
- [ ] Database queries performing well (<100ms)
- [ ] RLS policies working correctly
- [ ] Zero errors in production logs (24 hours)
- [ ] User feedback positive
- [ ] Admin tools working smoothly
- [ ] Email notifications sending correctly
- [ ] Stripe deposits processing correctly
- [ ] No data loss or corruption

## Post-Launch

### Monitor These Metrics
1. **User Impact**
   - Booking completion rate
   - User satisfaction scores
   - Appeal/complaint rate

2. **System Performance**
   - API response times
   - Database query times
   - Error rates
   - Uptime percentage

3. **Business Metrics**
   - Fraud prevention rate
   - Damage incidents prevented
   - Payment recovery rate
   - User retention

### Regular Maintenance
- [ ] Review complaints weekly
- [ ] Clean up expired blocks monthly
- [ ] Analyze reputation distribution monthly
- [ ] Update policies based on data
- [ ] Security audits quarterly
- [ ] Performance optimization quarterly

---

## Timeline

**Total Setup Time: 2-3 weeks**

- **Days 1-2**: Database setup & testing
- **Days 3-5**: API endpoint implementation & testing
- **Days 6-8**: UI components & integration
- **Days 9-10**: Admin dashboard
- **Days 11-12**: Security & performance review
- **Days 13-14**: Staging deployment & testing
- **Days 15**: Production deployment
- **Days 16+**: Monitoring & support

---

## Support Contacts

- **Development**: dev-team@divedrop.com
- **DevOps**: devops@divedrop.com
- **Admin Support**: admin-support@divedrop.com
- **User Support**: support@divedrop.com

---

## Sign-Off

- [ ] CTO: _______________  Date: _______
- [ ] Product Manager: _____________  Date: _______
- [ ] QA Lead: _______________  Date: _______
- [ ] DevOps Lead: _______________  Date: _______

---

**Status**: Ready for Deployment  
**Last Updated**: 2026-06-20  
**Next Review**: 2026-07-20
