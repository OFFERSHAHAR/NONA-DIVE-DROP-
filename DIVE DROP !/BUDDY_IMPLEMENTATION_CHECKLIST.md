# Buddy Feature - Implementation Checklist

## Quick Start

This checklist guides you through implementing the "Find a Buddy" feature step-by-step.

---

## Phase 1: Database Setup

- [ ] **1.1** Run the migration: `supabase/migrations/buddy_feature.sql`
  - Creates all 7 required tables
  - Sets up indexes and RLS policies
  - Creates helper functions
  
- [ ] **1.2** Verify in Supabase Dashboard:
  - [ ] Check `buddy_listings` table exists
  - [ ] Check `buddy_interests` table exists
  - [ ] Check `buddy_blocks` table exists
  - [ ] Check `buddy_audit_logs` table exists
  - [ ] Check all indexes created
  - [ ] Verify RLS policies enabled

- [ ] **1.3** Add phone field to users table (optional for contact storage)
  ```sql
  ALTER TABLE auth.users ADD COLUMN phone VARCHAR(20);
  ```

---

## Phase 2: TypeScript Types Update

- [ ] **2.1** Update `src/types/supabase.ts`
  ```typescript
  // Add buddy_listings, buddy_interests, buddy_blocks tables to Database type
  // Run: supabase gen types typescript --local > src/types/supabase.ts
  ```

- [ ] **2.2** Verify types include:
  - [ ] buddy_listings
  - [ ] buddy_interests
  - [ ] buddy_blocks
  - [ ] buddy_messages
  - [ ] buddy_connections
  - [ ] buddy_reports
  - [ ] buddy_audit_logs

---

## Phase 3: Core Library Files

- [ ] **3.1** Create schemas: `src/lib/buddy/schemas.ts`
  - ✅ Already created
  - Validates all request payloads with Zod

- [ ] **3.2** Create middleware: `src/lib/buddy/middleware.ts`
  - ✅ Already created
  - Auth context extraction
  - Rate limiting
  - Response formatting

- [ ] **3.3** Create audit logging: `src/lib/buddy/audit.ts`
  - ✅ Already created
  - Logs all critical actions

- [ ] **3.4** Create encryption utilities: `src/lib/buddy/encryption.ts`
  - ✅ Already created
  - Contact info handling (upgrade for production)

- [ ] **3.5** Create server actions: `src/lib/buddy/actions.ts`
  - ✅ Already created
  - Client-side API wrapper functions

---

## Phase 4: API Routes - Listings

- [ ] **4.1** Create: `src/app/api/buddy/listings/route.ts`
  - ✅ Already created
  - `GET /api/buddy/listings` - Browse listings
  - `POST /api/buddy/listings` - Create listing

- [ ] **4.2** Create: `src/app/api/buddy/listings/[id]/route.ts`
  - ✅ Already created
  - `GET /api/buddy/listings/:id` - View single listing
  - `PUT /api/buddy/listings/:id` - Update listing
  - `DELETE /api/buddy/listings/:id` - Delete listing

- [ ] **4.3** Create: `src/app/api/buddy/my-listings/route.ts`
  - ✅ Already created
  - `GET /api/buddy/my-listings` - Get user's listings

- [ ] **4.4** Test endpoints:
  ```bash
  # Create listing
  curl -X POST http://localhost:3000/api/buddy/listings \
    -H "Content-Type: application/json" \
    -d '{"title": "...", "description": "...", ...}'

  # Get listings
  curl http://localhost:3000/api/buddy/listings?page=1&limit=20

  # Get single
  curl http://localhost:3000/api/buddy/listings/[id]
  ```

---

## Phase 5: API Routes - Interests

- [ ] **5.1** Create: `src/app/api/buddy/interests/route.ts`
  - ✅ Already created
  - `GET /api/buddy/interests` - Get interests
  - `POST /api/buddy/interests` - Create interest

- [ ] **5.2** Create: `src/app/api/buddy/interests/[id]/route.ts`
  - ✅ Already created
  - `PUT /api/buddy/interests/:id` - Accept/reject interest
  - `DELETE /api/buddy/interests/:id` - Cancel interest

- [ ] **5.3** Test endpoints:
  ```bash
  # Create interest
  curl -X POST http://localhost:3000/api/buddy/interests \
    -H "Content-Type: application/json" \
    -d '{"listing_id": "...", "message": "..."}'

  # Get interests
  curl http://localhost:3000/api/buddy/interests?type=received&status=pending
  ```

---

## Phase 6: API Routes - Contact & Safety

- [ ] **6.1** Create: `src/app/api/buddy/contact/route.ts`
  - ✅ Already created
  - `POST /api/buddy/contact/reveal` - Reveal contact after mutual acceptance
  - `GET /api/buddy/contact/:user_id` - Get contact info

- [ ] **6.2** Create: `src/app/api/buddy/safety/route.ts`
  - ✅ Already created
  - `POST /api/buddy/block` - Block user
  - `GET /api/buddy/blocks` - List blocks
  - `DELETE /api/buddy/blocks/:user_id` - Unblock
  - `POST /api/buddy/report` - Report abuse

- [ ] **6.3** Test safety endpoints:
  ```bash
  # Block user
  curl -X POST http://localhost:3000/api/buddy/block \
    -H "Content-Type: application/json" \
    -d '{"blocked_user_id": "...", "reason": "..."}'

  # Get blocks
  curl http://localhost:3000/api/buddy/blocks

  # Report user
  curl -X POST http://localhost:3000/api/buddy/report \
    -H "Content-Type: application/json" \
    -d '{"reported_user_id": "...", "reason": "harassment", "description": "..."}'
  ```

---

## Phase 7: Environment Configuration

- [ ] **7.1** Update `.env.local`:
  ```env
  # Buddy feature encryption
  BUDDY_ENCRYPTION_KEY=change-me-in-production
  ```

- [ ] **7.2** Update `.env.production` (for production deployment):
  ```env
  BUDDY_ENCRYPTION_KEY=production-key-from-vault
  ```

---

## Phase 8: Frontend Components (Not in Scope - Build as Needed)

- [ ] **8.1** Listing creation form
  - Show form to create new listing
  - Validate using schema
  - Call `POST /api/buddy/listings`

- [ ] **8.2** Listings browse/search
  - Paginated listing view
  - Filters: experience level, date, location
  - Call `GET /api/buddy/listings`

- [ ] **8.3** Listing detail view
  - Show single listing with owner profile
  - Show "Send Interest" button
  - Call `GET /api/buddy/listings/:id`

- [ ] **8.4** Interests management
  - Dashboard for received interests
  - Dashboard for sent interests
  - Accept/reject/cancel buttons
  - Call interest endpoints

- [ ] **8.5** Contact reveal flow
  - Button to reveal contact after mutual acceptance
  - Show email/phone securely
  - Call `POST /api/buddy/contact/reveal`

- [ ] **8.6** Safety features
  - Block button on user profile
  - Report button with form
  - Manage blocked users

---

## Phase 9: Testing

### Unit Tests

- [ ] **9.1** Test schemas validation
  ```typescript
  // Test createListingSchema
  describe('createListingSchema', () => {
    it('should validate correct input', () => {
      const valid = { ... };
      expect(createListingSchema.parse(valid)).toBeDefined();
    });
  });
  ```

- [ ] **9.2** Test encryption utilities
  ```typescript
  // Test contact encryption
  const encrypted = encryptContactInfo('+1-555-0123');
  const decrypted = decryptContactInfo(encrypted);
  expect(decrypted).toBe('+1-555-0123');
  ```

### Integration Tests

- [ ] **9.3** Test listing CRUD
  ```typescript
  it('POST /api/buddy/listings creates listing', async () => {
    const res = await POST('/api/buddy/listings', validData);
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
  });
  ```

- [ ] **9.4** Test interest workflow
  ```typescript
  it('POST interest, then accept, reveals contact', async () => {
    // Create interest
    const interest = await POST('/api/buddy/interests', data);
    
    // Accept as owner
    await PUT(`/api/buddy/interests/${interest.id}`, { status: 'accepted' });
    
    // Reveal contact
    const contact = await POST('/api/buddy/contact/reveal', data);
    expect(contact.email).toBeDefined();
  });
  ```

- [ ] **9.5** Test rate limiting
  ```typescript
  it('Rate limit blocks excessive requests', async () => {
    // Make 51 requests (limit is 50/min)
    for (let i = 0; i < 51; i++) {
      await GET('/api/buddy/listings');
    }
    const res = await GET('/api/buddy/listings');
    expect(res.status).toBe(429);
  });
  ```

- [ ] **9.6** Test authorization
  ```typescript
  it('User cannot update others listings', async () => {
    const res = await PUT(`/api/buddy/listings/${otherUsersId}`, data);
    expect(res.status).toBe(403);
  });
  ```

### E2E Tests

- [ ] **9.7** Full buddy workflow
  1. User A creates listing
  2. User B finds and sends interest
  3. User A accepts
  4. Both reveal contacts
  5. Verify email/phone shared

- [ ] **9.8** Safety workflow
  1. User blocks another
  2. Blocked user cannot see listings
  3. User reports for abuse
  4. Report appears in admin dashboard

---

## Phase 10: Security Review

- [ ] **10.1** Authentication
  - [ ] All protected endpoints require auth
  - [ ] Verify auth middleware works
  - [ ] Test invalid tokens rejected

- [ ] **10.2** Authorization
  - [ ] Users can only modify own listings
  - [ ] Ownership verified before updates/deletes
  - [ ] Contact reveal requires mutual acceptance
  - [ ] Test cases for each endpoint

- [ ] **10.3** Input Validation
  - [ ] All inputs validated with Zod
  - [ ] Invalid data rejected with 400
  - [ ] Test with malicious inputs (SQL injection, XSS)

- [ ] **10.4** Rate Limiting
  - [ ] Limits configured correctly
  - [ ] Headers returned (Retry-After)
  - [ ] IP-based limiting working
  - [ ] Test bursting requests

- [ ] **10.5** Audit Logging
  - [ ] Contact reveals logged
  - [ ] Blocks logged
  - [ ] Reports logged
  - [ ] IP address captured
  - [ ] Verify in `buddy_audit_logs` table

- [ ] **10.6** Encryption
  - [ ] Contact info encrypted before storage
  - [ ] UPGRADE: Use crypto-js or libsodium for production
  - [ ] Decryption working correctly
  - [ ] Master key secured in env vars

- [ ] **10.7** Data Privacy
  - [ ] Phone/email not visible before reveal
  - [ ] Soft deletes preserve history
  - [ ] User can delete own data
  - [ ] GDPR compliance if needed

---

## Phase 11: Performance

- [ ] **11.1** Database Optimization
  - [ ] All indexes created
  - [ ] Pagination working (limit 50)
  - [ ] Query performance < 100ms
  - [ ] Connection pooling configured

- [ ] **11.2** API Performance
  - [ ] Endpoints respond < 200ms
  - [ ] Pagination works correctly
  - [ ] N+1 queries eliminated
  - [ ] Cache headers set if needed

- [ ] **11.3** Load Testing
  - [ ] Test with 1000 concurrent users
  - [ ] Stress test rate limiter
  - [ ] Monitor database connections
  - [ ] Identify bottlenecks

---

## Phase 12: Deployment

- [ ] **12.1** Production Environment
  - [ ] Database replicated/backed up
  - [ ] Encryption key in secure vault
  - [ ] RLS policies enforced
  - [ ] Audit logging enabled

- [ ] **12.2** Monitoring
  - [ ] Error tracking (Sentry/etc)
  - [ ] Performance monitoring
  - [ ] Rate limit metrics
  - [ ] Audit log dashboards

- [ ] **12.3** Deployment Checklist
  - [ ] Code reviewed
  - [ ] Tests passing
  - [ ] Environment variables set
  - [ ] Database migration run
  - [ ] Backup before deploy
  - [ ] Gradual rollout if possible
  - [ ] Monitor for errors post-deploy

---

## Phase 13: Documentation

- [ ] **13.1** API Documentation
  - [ ] ✅ BUDDY_API_DESIGN.md created
  - [ ] Example requests/responses
  - [ ] Error codes explained
  - [ ] Rate limits documented

- [ ] **13.2** Development Documentation
  - [ ] ✅ File structure documented
  - [ ] Setup instructions
  - [ ] Testing guide
  - [ ] Troubleshooting section

- [ ] **13.3** Admin/Moderation Guide
  - [ ] How to view reports
  - [ ] How to take action
  - [ ] Audit log access
  - [ ] User blocking procedures

---

## Phase 14: Optional Features

These are enhancements beyond the core MVP:

- [ ] **14.1** Messages System
  - Create `POST /api/buddy/messages`
  - In-app messaging between matched buddies
  - Notification system

- [ ] **14.2** Connections & Reviews
  - Post-dive buddy rating
  - Review/feedback system
  - Reputation scoring

- [ ] **14.3** Advanced Matching
  - ML-based buddy recommendations
  - "Perfect match" algorithm
  - Compatibility scoring

- [ ] **14.4** Admin Dashboard
  - Report management UI
  - User moderation tools
  - Analytics dashboard
  - Audit log viewer

- [ ] **14.5** Notifications
  - Email when interest received
  - Push notifications
  - In-app notification center
  - Notification preferences

---

## Testing Checklist

### Before Launch

```
Feature Completeness:
- [ ] All API endpoints working
- [ ] All validation rules enforced
- [ ] All error cases handled
- [ ] All rate limits configured

Security:
- [ ] Authentication required where needed
- [ ] Authorization verified
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protected
- [ ] Rate limits working
- [ ] Sensitive data encrypted

Data Integrity:
- [ ] Soft deletes preserve history
- [ ] Audit logs complete
- [ ] Timestamps correct
- [ ] Foreign keys working
- [ ] Constraints enforced

Performance:
- [ ] Response times acceptable
- [ ] Pagination working
- [ ] Database indexes used
- [ ] No N+1 queries

Reliability:
- [ ] Error handling comprehensive
- [ ] Graceful degradation
- [ ] Proper logging
- [ ] Monitoring set up
```

---

## Common Issues & Solutions

### Issue: 401 Unauthorized on protected routes
**Solution**: Check authentication session is valid
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return { error: 'Not authenticated' };
```

### Issue: 403 Forbidden on update
**Solution**: Verify user owns the resource
```typescript
if (resource.user_id !== userId) {
  return { error: 'You do not own this' };
}
```

### Issue: 429 Rate Limit Exceeded
**Solution**: Check Retry-After header and wait before retrying
```javascript
const retryAfter = response.headers.get('Retry-After');
setTimeout(() => retry(), retryAfter * 1000);
```

### Issue: Contact info not revealing
**Solution**: Ensure mutual interests are both 'accepted'
```typescript
const mutual = interests.filter(i => i.status === 'accepted').length > 0;
```

### Issue: Audit logs not recording
**Solution**: Ensure buddy_audit_logs table exists and has permissions
```sql
INSERT INTO buddy_audit_logs (...) VALUES (...);
-- Check for errors in logs
```

---

## Success Criteria

Feature is complete when:

- ✅ All API endpoints return correct status codes
- ✅ All validation passes or rejects correctly
- ✅ Rate limiting prevents abuse
- ✅ Authorization prevents unauthorized access
- ✅ Audit logs record all critical actions
- ✅ Contact reveals only after mutual acceptance
- ✅ Users can block others
- ✅ Abuse reports can be submitted
- ✅ No security vulnerabilities
- ✅ Performance acceptable (< 200ms response)
- ✅ All tests passing
- ✅ Documentation complete

---

## File Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/buddy/schemas.ts` | Zod validation | ✅ Created |
| `src/lib/buddy/middleware.ts` | Auth, rate limit, responses | ✅ Created |
| `src/lib/buddy/audit.ts` | Audit logging | ✅ Created |
| `src/lib/buddy/encryption.ts` | Contact encryption | ✅ Created |
| `src/lib/buddy/actions.ts` | Server actions | ✅ Created |
| `src/app/api/buddy/listings/route.ts` | Listings API | ✅ Created |
| `src/app/api/buddy/listings/[id]/route.ts` | Listing detail API | ✅ Created |
| `src/app/api/buddy/my-listings/route.ts` | User listings API | ✅ Created |
| `src/app/api/buddy/interests/route.ts` | Interests API | ✅ Created |
| `src/app/api/buddy/interests/[id]/route.ts` | Interest detail API | ✅ Created |
| `src/app/api/buddy/contact/route.ts` | Contact reveal API | ✅ Created |
| `src/app/api/buddy/safety/route.ts` | Safety API | ✅ Created |
| `supabase/migrations/buddy_feature.sql` | Database schema | ✅ Created |
| `BUDDY_API_DESIGN.md` | API documentation | ✅ Created |
| `BUDDY_IMPLEMENTATION_CHECKLIST.md` | This file | ✅ Created |

---

## Next Steps

1. **Immediate**: Run database migration
2. **Short-term**: Create frontend components
3. **Testing**: Run full test suite
4. **Security**: Code review + security audit
5. **Deployment**: Deploy to staging, then production
6. **Monitoring**: Set up dashboards and alerts
7. **Iterate**: Gather feedback and enhance

---

**Last Updated**: June 2024  
**Estimated Timeline**: 2-4 weeks for full implementation  
**Team**: Backend + Frontend + QA
