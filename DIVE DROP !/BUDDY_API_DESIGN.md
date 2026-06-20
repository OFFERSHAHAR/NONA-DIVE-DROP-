# Find a Buddy - API Design Document

## Overview

The "Find a Buddy" feature enables users to create dive buddy listings, express interest in diving with others, and manage connections safely. This document outlines the complete API design, database schema, security considerations, and implementation guidelines.

---

## Architecture Overview

### Core Components

1. **Listings** - User-created buddy search posts
2. **Interests** - Requests to buddy up on a listing
3. **Contacts** - Secure contact info reveal after mutual interest
4. **Connections** - Established buddy relationships
5. **Safety** - Blocking and reporting features
6. **Audit Logging** - Comprehensive logging for compliance

### Technology Stack

- **Framework**: Next.js App Router with Server Actions
- **Database**: Supabase PostgreSQL
- **Validation**: Zod schemas
- **Authentication**: Supabase Auth
- **Encryption**: Base64 encoding (upgrade to crypto-js or TweetNaCl.js for production)

---

## Database Schema

### Tables Required

#### `buddy_listings`
```sql
CREATE TABLE buddy_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  experience_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  number_of_divers INT NOT NULL CHECK (number_of_divers >= 1 AND number_of_divers <= 10),
  dive_date TIMESTAMPTZ NOT NULL,
  dive_duration INT NOT NULL, -- minutes
  dive_site_id UUID REFERENCES public.dive_sites(id),
  custom_location VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  available_contact_after TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_location CHECK (dive_site_id IS NOT NULL OR custom_location IS NOT NULL)
);

CREATE INDEX idx_buddy_listings_user_id ON buddy_listings(user_id);
CREATE INDEX idx_buddy_listings_dive_date ON buddy_listings(dive_date);
CREATE INDEX idx_buddy_listings_is_active ON buddy_listings(is_active);
```

#### `buddy_interests`
```sql
CREATE TABLE buddy_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES buddy_listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_users_different CHECK (requester_id != owner_id),
  CONSTRAINT check_message_length CHECK (LENGTH(message) <= 500)
);

CREATE INDEX idx_buddy_interests_listing_id ON buddy_interests(listing_id);
CREATE INDEX idx_buddy_interests_requester_id ON buddy_interests(requester_id);
CREATE INDEX idx_buddy_interests_owner_id ON buddy_interests(owner_id);
CREATE INDEX idx_buddy_interests_status ON buddy_interests(status);
CREATE UNIQUE INDEX idx_buddy_interests_unique ON buddy_interests(listing_id, requester_id);
```

#### `buddy_blocks`
```sql
CREATE TABLE buddy_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_not_self CHECK (user_id != blocked_user_id)
);

CREATE INDEX idx_buddy_blocks_user_id ON buddy_blocks(user_id);
CREATE UNIQUE INDEX idx_buddy_blocks_unique ON buddy_blocks(user_id, blocked_user_id);
```

#### `buddy_connections`
```sql
CREATE TABLE buddy_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES buddy_listings(id),
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  rating_from_user1 SMALLINT REFERENCES CHECK (rating >= 1 AND rating <= 5),
  rating_from_user2 SMALLINT CHECK (rating >= 1 AND rating <= 5),
  review_from_user1 TEXT CHECK (LENGTH(review_from_user1) <= 500),
  review_from_user2 TEXT CHECK (LENGTH(review_from_user2) <= 500),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT check_users_different CHECK (user_id_1 != user_id_2)
);

CREATE INDEX idx_buddy_connections_user1 ON buddy_connections(user_id_1);
CREATE INDEX idx_buddy_connections_user2 ON buddy_connections(user_id_2);
```

#### `buddy_messages`
```sql
CREATE TABLE buddy_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES buddy_listings(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_message_length CHECK (LENGTH(message) <= 5000)
);

CREATE INDEX idx_buddy_messages_recipient ON buddy_messages(recipient_id);
CREATE INDEX idx_buddy_messages_sender ON buddy_messages(sender_id);
CREATE INDEX idx_buddy_messages_conversation ON buddy_messages(sender_id, recipient_id);
```

#### `buddy_reports`
```sql
CREATE TABLE buddy_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason ENUM('inappropriate_content', 'harassment', 'spam', 'fake_profile', 'safety_concern', 'other') NOT NULL,
  description TEXT NOT NULL,
  attachment_url VARCHAR(500),
  status ENUM('pending', 'under_review', 'resolved', 'dismissed') DEFAULT 'pending',
  resolution_notes TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buddy_reports_reporter ON buddy_reports(reporter_id);
CREATE INDEX idx_buddy_reports_reported_user ON buddy_reports(reported_user_id);
CREATE INDEX idx_buddy_reports_status ON buddy_reports(status);
```

#### `buddy_audit_logs`
```sql
CREATE TABLE buddy_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buddy_audit_logs_user_id ON buddy_audit_logs(user_id);
CREATE INDEX idx_buddy_audit_logs_action ON buddy_audit_logs(action);
CREATE INDEX idx_buddy_audit_logs_created_at ON buddy_audit_logs(created_at);
```

---

## API Endpoints

### Listings

#### POST /api/buddy/listings
Create a new buddy listing

**Auth**: Required (authenticated user)
**Rate Limit**: 50 per minute per user

**Request Body**:
```json
{
  "title": "Looking for dive buddy for coral reef dive",
  "description": "Experienced intermediate diver seeking buddy for guided coral reef exploration. Planning 2-dive day.",
  "experience_level": "intermediate",
  "number_of_divers": 2,
  "dive_date": "2024-07-15T09:00:00Z",
  "dive_duration": 120,
  "dive_site_id": "uuid-here",
  "custom_location": null,
  "tags": ["coral-reef", "guided", "photography"],
  "is_active": true
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "...",
    "created_at": "2024-07-14T10:30:00Z",
    ...
  },
  "timestamp": "2024-07-14T10:30:00Z"
}
```

#### GET /api/buddy/listings
Browse and filter listings

**Auth**: Optional (better filtering with auth)
**Rate Limit**: 50 per minute per IP

**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 50)
- `experience_level`: enum (beginner|intermediate|advanced)
- `dive_site_id`: uuid
- `date_from`: ISO string
- `date_to`: ISO string
- `search`: text search in title/description
- `location`: string (searches custom_location)
- `sort_by`: enum (recent|upcoming|matching) default: recent
- `exclude_user_id`: uuid (exclude own listings)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "...",
      "user": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "...",
        "diving_experience": "advanced"
      },
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "..."
}
```

#### GET /api/buddy/listings/:id
Get single listing with full details

**Auth**: Optional
**Rate Limit**: 100 per minute per IP

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "...",
      "bio": "...",
      "diving_experience": "advanced",
      "location": "California"
    },
    "dive_site": {
      "id": "uuid",
      "name": "Coral Reef Site",
      "location": "...",
      "depth": 30,
      "difficulty": "intermediate"
    },
    ...
  }
}
```

#### PUT /api/buddy/listings/:id
Update own listing

**Auth**: Required (owner only)
**Rate Limit**: 50 per minute per user

**Request Body**: Same as POST (but all fields optional except dive_date is omitted)

**Response** (200): Updated listing object

#### DELETE /api/buddy/listings/:id
Delete own listing (soft delete)

**Auth**: Required (owner only)
**Rate Limit**: 50 per minute per user

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "deleted": true
  }
}
```

#### GET /api/buddy/my-listings
Get current user's listings

**Auth**: Required
**Rate Limit**: 50 per minute per user

**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `include_inactive`: boolean (default: false)

**Response** (200): Paginated array of user's listings with interest counts

---

### Interests (Buddy Requests)

#### POST /api/buddy/interests
Create an interest request

**Auth**: Required
**Rate Limit**: 20 per minute per user

**Request Body**:
```json
{
  "listing_id": "uuid",
  "message": "Hi! I'm also an intermediate diver. Would love to join your dive.",
  "status": "pending"
}
```

**Response** (201): Interest object

#### GET /api/buddy/interests
Get interests (received or sent)

**Auth**: Required
**Rate Limit**: 50 per minute per user

**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `type`: enum (received|sent) default: received
- `status`: enum (pending|accepted|rejected|cancelled)

**Response** (200): Paginated array of interests

#### PUT /api/buddy/interests/:id
Accept/reject/cancel interest

**Auth**: Required (receiver can accept/reject, requester can cancel)
**Rate Limit**: 20 per minute per user

**Request Body**:
```json
{
  "status": "accepted|rejected|cancelled",
  "response_message": "Great! Let's dive together."
}
```

**Response** (200): Updated interest object

#### DELETE /api/buddy/interests/:id
Cancel interest (soft delete)

**Auth**: Required (requester only)
**Rate Limit**: 20 per minute per user

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "deleted": true
  }
}
```

---

### Contact Information

#### POST /api/buddy/contact/reveal/:listing_id
Reveal contact info after mutual acceptance

**Auth**: Required
**Rate Limit**: 30 per minute per user
**Security**: Requires mutual accepted interests

**Request Body**:
```json
{
  "listing_id": "uuid",
  "reveal_reason": "mutual_interest"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "phone": "+1-555-0123"
  },
  "timestamp": "..."
}
```

**Note**: Contact reveal is audited with user IP and user agent

#### GET /api/buddy/contact/:user_id
Get contact info for a user

**Auth**: Required
**Rate Limit**: 100 per minute per user
**Security**: Requires mutual accepted interest with user

**Response** (200):
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "phone": "+1-555-0123"
  }
}
```

---

### Safety & Blocking

#### POST /api/buddy/block
Block a user

**Auth**: Required
**Rate Limit**: No limit

**Request Body**:
```json
{
  "blocked_user_id": "uuid",
  "reason": "Inappropriate behavior"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "blocked_user_id": "uuid",
    "reason": "...",
    "created_at": "..."
  }
}
```

#### GET /api/buddy/blocks
Get list of blocked users

**Auth**: Required
**Rate Limit**: 50 per minute per user

**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "blocks": [
      {
        "id": "uuid",
        "blocked_user_id": "uuid",
        "blocked_user": {
          "id": "uuid",
          "first_name": "Jane",
          "last_name": "Smith",
          "avatar_url": "..."
        },
        "reason": "...",
        "created_at": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

#### DELETE /api/buddy/blocks/:user_id
Unblock a user

**Auth**: Required
**Rate Limit**: No limit

**Response** (200):
```json
{
  "success": true,
  "data": {
    "unblocked": true
  }
}
```

#### POST /api/buddy/report
Report user for safety/abuse

**Auth**: Required
**Rate Limit**: 5 per hour per user (strict)

**Request Body**:
```json
{
  "reported_user_id": "uuid",
  "reason": "harassment|inappropriate_content|spam|fake_profile|safety_concern|other",
  "description": "User sent threatening messages regarding...",
  "attachment_url": "https://example.com/screenshot.png"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Report submitted. Our team will review this shortly."
  }
}
```

---

## Rate Limiting Configuration

```typescript
export const rateLimitConfigs = {
  listings: { maxRequests: 50, windowSeconds: 60 },           // Browse/CRUD
  interests: { maxRequests: 20, windowSeconds: 60 },          // Create/update interests
  messages: { maxRequests: 100, windowSeconds: 60 },          // Message sending
  reports: { maxRequests: 5, windowSeconds: 3600 },           // Safety reports (strict)
  contactReveal: { maxRequests: 30, windowSeconds: 60 },      // Contact reveals
};
```

---

## Error Handling

### Standard Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "timestamp": "2024-07-14T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Scenario |
|------|----------|
| 201 | Resource created |
| 400 | Validation error |
| 401 | Unauthorized (no auth) |
| 403 | Forbidden (no permission) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate interest) |
| 429 | Rate limit exceeded |
| 500 | Server error |

### Rate Limit Response (429)

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "timestamp": "...",
  "headers": {
    "Retry-After": "45"
  }
}
```

---

## Security Considerations

### Authentication & Authorization

- ✅ All buddy feature endpoints require authentication
- ✅ Users can only modify their own listings
- ✅ Contact info only revealed after mutual acceptance
- ✅ Ownership verification on sensitive operations

### Data Protection

- ✅ Contact info encrypted before storage (upgrade encryption for production)
- ✅ Audit logging for contact reveals
- ✅ IP address and user agent captured for security analysis
- ✅ Soft deletes to preserve audit history

### Rate Limiting

- ✅ Per-endpoint rate limits configured
- ✅ Stricter limits on reports and contact reveals
- ✅ IP-based limiting for anonymous requests

### Safety Features

- ✅ User blocking system
- ✅ Abuse reporting with admin review
- ✅ Automatic audit trail for safety actions
- ✅ Validation prevents self-blocking/reporting

### Input Validation

- ✅ Zod schemas for all inputs
- ✅ Length limits on text fields
- ✅ Enum validation for status fields
- ✅ UUID validation for IDs

---

## Audit Logging

All critical actions are logged:

### Logged Actions

| Action | Resource | Use Case |
|--------|----------|----------|
| LISTING_CREATE | listing | Track listing creation |
| LISTING_UPDATE | listing | Track changes to listings |
| LISTING_DELETE | listing | Track listing removal |
| INTEREST_CREATE | interest | Track interest requests |
| INTEREST_ACCEPT | interest | Track mutual matches |
| INTEREST_REJECT | interest | Track rejections |
| CONTACT_REVEAL | listing | **Compliance** - contact reveal timestamp |
| USER_BLOCK | block | Track blocking actions |
| USER_REPORT | report | Track safety reports |

### Audit Log Entry

```javascript
{
  id: uuid,
  action: "CONTACT_REVEAL",
  user_id: uuid,           // Who performed action
  resource_type: "listing",
  resource_id: uuid,
  changes: { ... },
  metadata: {
    targetUserId: uuid,    // Who was contacted
    timestamp: ISO string,
  },
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  created_at: timestamp,
}
```

---

## Implementation Checklist

### Phase 1: Database & Core API
- [ ] Create all required tables
- [ ] Create indexes for performance
- [ ] Implement Zod schemas
- [ ] Implement auth middleware
- [ ] Implement rate limiting
- [ ] Implement audit logging

### Phase 2: Listings API
- [ ] POST /api/buddy/listings
- [ ] GET /api/buddy/listings
- [ ] GET /api/buddy/listings/:id
- [ ] PUT /api/buddy/listings/:id
- [ ] DELETE /api/buddy/listings/:id
- [ ] GET /api/buddy/my-listings

### Phase 3: Interests API
- [ ] POST /api/buddy/interests
- [ ] GET /api/buddy/interests
- [ ] PUT /api/buddy/interests/:id
- [ ] DELETE /api/buddy/interests/:id

### Phase 4: Contact & Connections
- [ ] POST /api/buddy/contact/reveal
- [ ] GET /api/buddy/contact/:user_id
- [ ] Implement contact encryption

### Phase 5: Safety
- [ ] POST /api/buddy/block
- [ ] GET /api/buddy/blocks
- [ ] DELETE /api/buddy/blocks/:user_id
- [ ] POST /api/buddy/report

### Phase 6: Messages (Optional)
- [ ] POST /api/buddy/messages
- [ ] GET /api/buddy/messages/:user_id

### Phase 7: Testing & Polish
- [ ] Integration tests
- [ ] E2E tests
- [ ] Load testing
- [ ] Security review
- [ ] Documentation

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── buddy/
│           ├── listings/
│           │   ├── route.ts           (GET, POST)
│           │   └── [id]/
│           │       └── route.ts       (GET, PUT, DELETE)
│           ├── my-listings/
│           │   └── route.ts           (GET)
│           ├── interests/
│           │   ├── route.ts           (GET, POST)
│           │   └── [id]/
│           │       └── route.ts       (PUT, DELETE)
│           ├── contact/
│           │   └── route.ts           (POST, GET)
│           ├── messages/
│           │   └── route.ts           (POST, GET)
│           ├── connections/
│           │   └── route.ts           (GET, DELETE)
│           └── safety/
│               └── route.ts           (POST block, GET blocks, DELETE block, POST report)
├── lib/
│   └── buddy/
│       ├── schemas.ts                 (Zod validation schemas)
│       ├── middleware.ts              (Auth, rate limiting, responses)
│       ├── audit.ts                   (Audit logging)
│       └── encryption.ts              (Contact info encryption)
└── types/
    └── supabase.ts                   (Updated with buddy tables)
```

---

## Example Usage

### Creating a Listing

```typescript
// POST /api/buddy/listings
const response = await fetch('/api/buddy/listings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Need a dive buddy for Great Barrier Reef',
    description: 'I\'m an intermediate diver...',
    experience_level: 'intermediate',
    number_of_divers: 2,
    dive_date: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    dive_duration: 120,
    dive_site_id: 'site-uuid',
    tags: ['reef', 'tropical'],
  }),
});

const result = await response.json();
// result.data.id contains the new listing ID
```

### Sending an Interest

```typescript
// POST /api/buddy/interests
const response = await fetch('/api/buddy/interests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    listing_id: 'listing-uuid',
    message: 'Hi! I\'d love to dive with you.',
  }),
});
```

### Revealing Contact Info

```typescript
// POST /api/buddy/contact/reveal/:listing_id
// Requires: mutual accepted interests
const response = await fetch('/api/buddy/contact/reveal/listing-uuid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    listing_id: 'listing-uuid',
  }),
});

const { data } = await response.json();
console.log(data.email, data.phone);
```

---

## Monitoring & Analytics

### Key Metrics to Track

- Listings created/updated/deleted per day
- Interests sent/accepted/rejected ratio
- Contact reveals per day
- Safety reports count & resolution time
- Average response time per endpoint
- Rate limit hit rate

### Recommended Dashboards

1. **Daily Active Users** - Using buddy feature
2. **Conversion Funnel** - Browse → Interest → Connection
3. **Safety Metrics** - Reports, blocks, resolutions
4. **Performance** - Endpoint latency, rate limits
5. **Audit Trail** - Contact reveals by user/time

---

## Future Enhancements

1. **Messaging System** - In-app chat between matched buddies
2. **Reviews & Ratings** - Post-dive buddy feedback
3. **Elo/Reputation System** - Score based on successful connections
4. **Advanced Matching** - ML-based buddy recommendations
5. **Dive Trip Coordination** - Multi-day buddy planning
6. **Integration with Dive Logs** - Show diving experience visually
7. **Location-based Discovery** - Expand radius search
8. **Notifications** - Email/push for interests and messages
9. **Admin Dashboard** - Report management and moderation tools
10. **Analytics API** - User insights and statistics

---

## Environment Variables

```env
# Required for buddy feature
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Encryption (upgrade to proper implementation)
BUDDY_ENCRYPTION_KEY=your-encryption-key-change-in-production

# Optional: For sensitive operations (contact reveal)
BUDDY_ADMIN_EMAIL=admin@divelo.com
```

---

## Testing

### Integration Test Example

```typescript
describe('Buddy Listing API', () => {
  it('should create a listing with valid data', async () => {
    const res = await POST('/api/buddy/listings', {
      title: 'Test listing',
      description: 'A valid description for testing',
      experience_level: 'intermediate',
      number_of_divers: 2,
      dive_date: new Date(Date.now() + 24*60*60*1000).toISOString(),
      dive_duration: 120,
      dive_site_id: 'valid-uuid',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.user_id).toBe(currentUserId);
  });

  it('should not create listing without authentication', async () => {
    const res = await POST('/api/buddy/listings', {...}, { authenticated: false });
    expect(res.status).toBe(401);
  });
});
```

---

## Support & Troubleshooting

### Common Issues

1. **"Unauthorized: Authentication required"** - Missing auth session
2. **"Rate limit exceeded"** - Too many requests. Wait per Retry-After header
3. **"Contact can only be revealed when both users have accepted"** - Mutual acceptance required
4. **"Validation error"** - Check request body against schema

### Debug Mode

Enable logging:
```typescript
process.env.DEBUG_BUDDY_API = 'true';
```

---

## Changelog

### v1.0.0 (Initial Release)
- Listings CRUD
- Interests system
- Contact reveal with audit logging
- Blocking system
- Safety reports
- Rate limiting
- Audit logging

---

Generated: July 2024
Maintainer: DiveDrop Team
