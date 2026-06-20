# Buddy Feature - Quick Reference Card

## API Endpoints Overview

### 📋 Listings (6 endpoints)
```
POST   /api/buddy/listings                    Create listing
GET    /api/buddy/listings                    Browse & filter
GET    /api/buddy/listings/:id                View listing
PUT    /api/buddy/listings/:id                Update listing
DELETE /api/buddy/listings/:id                Delete listing
GET    /api/buddy/my-listings                 My listings
```

### 🤝 Interests (4 endpoints)
```
POST   /api/buddy/interests                   Send interest
GET    /api/buddy/interests                   Get interests
PUT    /api/buddy/interests/:id               Accept/reject
DELETE /api/buddy/interests/:id               Cancel
```

### 📞 Contact (2 endpoints)
```
POST   /api/buddy/contact/reveal              Reveal contact
GET    /api/buddy/contact/:user_id            Get contact
```

### 🛡️ Safety (5 endpoints)
```
POST   /api/buddy/block                       Block user
GET    /api/buddy/blocks                      List blocks
DELETE /api/buddy/blocks/:user_id             Unblock
POST   /api/buddy/report                      Report user
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 201 | Created | Successfully created resource |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (e.g., already interested) |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Internal error |

---

## Rate Limits

```typescript
listings:        50 requests/minute
interests:       20 requests/minute
messages:       100 requests/minute
contactReveal:   30 requests/minute
reports:          5 requests/hour (strict)
```

When rate limited, response includes `Retry-After` header.

---

## Authentication

All endpoints except `GET /api/buddy/listings` require authentication.

```typescript
// Automatically handled by:
const { data: context, error } = await withBuddyAuth(request);
if (error) return error; // 401 if not authenticated
```

---

## Request/Response Pattern

### Request
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### Success Response
```json
{
  "success": true,
  "data": { /* resource */ },
  "timestamp": "2024-06-20T10:30:00Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "..."
}
```

### Error Response
```json
{
  "success": false,
  "error": "Validation error: Title is required",
  "timestamp": "2024-06-20T10:30:00Z"
}
```

---

## Database Tables

| Table | Records | Purpose |
|-------|---------|---------|
| `buddy_listings` | ~10K | User-created posts |
| `buddy_interests` | ~50K | Interest requests |
| `buddy_blocks` | ~5K | Blocked users |
| `buddy_connections` | ~1K | Completed matches |
| `buddy_messages` | ~100K | Direct messages |
| `buddy_reports` | ~100 | Abuse reports |
| `buddy_audit_logs` | ~500K | Audit trail |

---

## Zod Schemas

### Create Listing
```typescript
{
  title: string (5-200 chars),
  description: string (20-2000 chars),
  experience_level: 'beginner' | 'intermediate' | 'advanced',
  number_of_divers: number (1-10),
  dive_date: ISO datetime,
  dive_duration: number (30-480 minutes),
  dive_site_id?: uuid,
  custom_location?: string,
  tags?: string[] (max 5)
}
```

### Create Interest
```typescript
{
  listing_id: uuid,
  message?: string (max 500 chars)
}
```

### Block User
```typescript
{
  blocked_user_id: uuid,
  reason?: string
}
```

### Report User
```typescript
{
  reported_user_id: uuid,
  reason: 'harassment' | 'spam' | 'fake_profile' | 'safety_concern' | 'inappropriate_content' | 'other',
  description: string (20-1000 chars),
  attachment_url?: string
}
```

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `schemas.ts` | 400+ | Zod validation |
| `middleware.ts` | 300+ | Auth & formatting |
| `audit.ts` | 200+ | Action logging |
| `actions.ts` | 400+ | Server actions |
| `listings/route.ts` | 300+ | Listing endpoints |
| `interests/route.ts` | 400+ | Interest endpoints |
| `contact/route.ts` | 300+ | Contact endpoints |
| `safety/route.ts` | 400+ | Safety endpoints |
| `buddy_feature.sql` | 600+ | DB migration |

---

## Common Usage Patterns

### Create & List Listings
```bash
# Create
curl -X POST /api/buddy/listings \
  -H "Content-Type: application/json" \
  -d '{"title":"...", "description":"...", ...}'

# List
curl '/api/buddy/listings?page=1&limit=20&experience_level=intermediate'

# Detail
curl '/api/buddy/listings/[id]'
```

### Interest Workflow
```bash
# Create interest
curl -X POST /api/buddy/interests \
  -d '{"listing_id":"...", "message":"..."}'

# Check interests
curl '/api/buddy/interests?type=received&status=pending'

# Accept
curl -X PUT /api/buddy/interests/[id] \
  -d '{"status":"accepted"}'

# Reveal contact
curl -X POST /api/buddy/contact/reveal \
  -d '{"listing_id":"..."}'
```

### Safety
```bash
# Block user
curl -X POST /api/buddy/block \
  -d '{"blocked_user_id":"...", "reason":"..."}'

# Report user
curl -X POST /api/buddy/report \
  -d '{"reported_user_id":"...", "reason":"harassment", "description":"..."}'
```

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Buddy feature
BUDDY_ENCRYPTION_KEY=change-in-production
```

---

## Audit Logged Actions

```
LISTING_CREATE       User created listing
LISTING_UPDATE       User updated listing
LISTING_DELETE       User deleted listing
INTEREST_CREATE      User sent interest
INTEREST_ACCEPT      User accepted interest
INTEREST_REJECT      User rejected interest
CONTACT_REVEAL       User revealed contact (CRITICAL)
USER_BLOCK           User blocked another user
USER_REPORT          User submitted safety report
```

---

## Security Checklist

- ✅ Authentication required on write operations
- ✅ Ownership verified before updates/deletes
- ✅ Input validation with Zod
- ✅ Rate limiting active
- ✅ Contact reveal requires mutual acceptance
- ✅ Audit logging for sensitive actions
- ✅ RLS policies at database level
- ✅ Soft deletes preserve history
- ✅ IP address captured for security analysis

---

## Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| Browse listings | < 100ms | Indexes on date, user_id, is_active |
| Create listing | < 200ms | Direct insert, async audit log |
| Reveal contact | < 150ms | Cached after first reveal |
| Page results | Max 50 items | Prevent large transfers |

---

## Error Codes Quick Lookup

```
400 → Validation error (check request body)
401 → Not authenticated (login required)
403 → Permission denied (not your resource)
404 → Not found (resource deleted or wrong ID)
409 → Already exists (e.g., duplicate interest)
429 → Rate limited (wait per Retry-After header)
500 → Server error (check logs)
```

---

## Testing Checklist

```
Unit Tests:
[ ] Zod schema validation
[ ] Encryption/decryption
[ ] Rate limiting
[ ] Response formatting

Integration Tests:
[ ] Listing CRUD
[ ] Interest workflow
[ ] Contact reveal
[ ] Authorization checks
[ ] Rate limit enforcement

E2E Tests:
[ ] Full buddy discovery flow
[ ] Safety block/report flow
```

---

## Deployment Steps

1. Run migration: `supabase migrations up`
2. Update Supabase types: `supabase gen types typescript > src/types/supabase.ts`
3. Set environment variables
4. Deploy to Vercel/hosting
5. Verify endpoints respond
6. Monitor for errors
7. Adjust rate limits if needed

---

## Monitoring Queries

### Active Listings (SQL)
```sql
SELECT COUNT(*) FROM buddy_listings
WHERE is_active = true AND dive_date > now();
```

### Recent Interests (SQL)
```sql
SELECT * FROM buddy_interests
WHERE created_at > now() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Pending Reports (SQL)
```sql
SELECT * FROM buddy_reports
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### Audit Trail (SQL)
```sql
SELECT * FROM buddy_audit_logs
WHERE action = 'CONTACT_REVEAL'
ORDER BY created_at DESC;
```

---

## Documentation Links

- 📖 **Full API Design**: `BUDDY_API_DESIGN.md`
- ✅ **Implementation Guide**: `BUDDY_IMPLEMENTATION_CHECKLIST.md`
- 📊 **Feature Summary**: `BUDDY_FEATURE_SUMMARY.md`
- 🗂️ **Database Migration**: `supabase/migrations/buddy_feature.sql`

---

## Support

**Quick Issues**:
1. Check error code above
2. Review request body schema
3. Verify authentication
4. Check rate limit headers

**Debugging**:
```env
DEBUG_BUDDY_API=true
```

**Monitoring**:
- Response times per endpoint
- Error rate by type
- Rate limit hit frequency
- Audit log volume

---

## Version Info

- **Status**: Ready for Production
- **Created**: June 2024
- **Framework**: Next.js 14 + App Router
- **Database**: Supabase PostgreSQL
- **API Type**: REST (JSON)

---

**Last Updated**: June 2024  
**Maintained By**: Development Team
