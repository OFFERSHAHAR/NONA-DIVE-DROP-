# Security & Performance Hardening for Feedback System

This document details the security and performance measures implemented for the dive site feedback system (Task 9).

## Table of Contents

1. [XSS Prevention (Text Sanitization)](#xss-prevention)
2. [Rate Limiting](#rate-limiting)
3. [Image Upload Security](#image-upload-security)
4. [Performance Optimization](#performance-optimization)
5. [Implementation Checklist](#implementation-checklist)

---

## XSS Prevention

### Module: `src/lib/feedback/sanitization.ts`

XSS (Cross-Site Scripting) prevention is implemented through HTML tag stripping and character validation.

#### Functions

**`sanitizeText(text: string | null | undefined): string`**

Sanitizes raw text by:
- Removing all HTML/XML tags using regex: `/<[^>]*>/g`
- Decoding HTML entities (`&lt;`, `&gt;`, `&quot;`, `&apos;`, `&amp;`)
- Decoding numeric entities (decimal: `&#123;` and hexadecimal: `&#x1A;`)
- Removing control characters (ASCII 0-8, 11-12, 14-31)
- Collapsing multiple spaces to single spaces
- Trimming leading/trailing whitespace

Safe character ranges: 32-126 (printable ASCII)

**`sanitizeNotes(text: string | null | undefined): string`**

Sanitizes notes with length validation:
- Applies `sanitizeText()`
- Enforces maximum 300 characters (post-sanitization)
- Throws error if length exceeded

**`sanitizeMarineLifeCustom(text: string | null | undefined): string | null`**

Sanitizes custom marine life field:
- Applies `sanitizeText()`
- Enforces maximum 200 characters (post-sanitization)
- Returns `null` if result is empty string
- Throws error if length exceeded

#### Applied To

- **`notes`** field in feedback submission (max 300 chars)
- **`marine_life_custom`** field in feedback submission (max 200 chars)

#### Implementation Location

Applied in `POST /api/feedback` route before validation:

```typescript
// XSS PREVENTION: Sanitize text fields before validation
try {
  if (body.notes) {
    body.notes = sanitizeNotes(body.notes);
  }
  if (body.marine_life_custom) {
    body.marine_life_custom = sanitizeMarineLifeCustom(body.marine_life_custom);
  }
} catch (sanitizationError) {
  return NextResponse.json(
    { error: `Sanitization error: ${sanitizationError.message}` },
    { status: 400 }
  );
}
```

#### Test Coverage

Inline tests in `sanitization.ts` validate:
1. HTML tag removal
2. HTML entity decoding
3. Control character removal
4. Newline preservation
5. Multiple space collapsing
6. Null/undefined handling
7. Notes length validation (>300 throws)
8. Marine life custom length validation (>200 throws)
9. Empty custom marine life returns null

---

## Rate Limiting

### Module: `src/lib/security/rate-limiter.ts`

Rate limiting prevents abuse and limits feedback submission frequency.

#### Feedback Endpoints Configuration

**`POST /api/feedback` (Feedback Submission)**
- **Limit**: 5 submissions per hour per user
- **Window**: 3600 seconds (1 hour)
- **Status Code**: 429 (Too Many Requests)
- **Message**: "Too many feedback submissions. Maximum 5 per hour per user."
- **Key**: User ID (authenticated requests)

**`GET /api/feedback/aggregate` (Aggregated Conditions)**
- **Limit**: 60 requests per minute
- **Window**: 60 seconds
- **Status Code**: 429 (Too Many Requests)
- **Key**: IP address (public reads)

#### Rate Limit Headers

Responses include rate limit metadata:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2026-06-20T17:00:00Z
Retry-After: 1800
```

#### Implementation

Rate limiting is applied using middleware in both routes:

```typescript
const rateLimitResult = await withRateLimit(request);
if (rateLimitResult) {
  return rateLimitResult;
}
```

The `withRateLimit()` function:
1. Extracts client IP from `X-Forwarded-For` or `X-Real-IP` headers
2. Extracts user ID from Authorization header (if authenticated)
3. Uses user ID for authenticated endpoints, IP for public endpoints
4. Checks against configured limits
5. Returns 429 response if limit exceeded

#### Storage

- **In-memory store** (Map-based) with automatic cleanup every 5 minutes
- **Production**: Should migrate to Redis for distributed rate limiting across multiple server instances

---

## Image Upload Security

### Module: `src/lib/feedback/imageHandler.ts`

Image upload security is enforced server-side and client-side.

#### Constraints

- **Max file size**: 2MB (enforced in client and server)
- **Allowed MIME types**: `image/jpeg`, `image/png`
- **Min dimensions**: 100x100 pixels
- **Max dimensions**: 1600x1600 pixels (resized on compression)
- **Compression quality**: 0.8

#### Server-Side Verification

The `uploadFeedbackImage()` function:

1. **MIME Type Validation**: Checks `file.type`
   ```typescript
   if (!ALLOWED_MIME_TYPES.includes(file.type)) {
     throw new ImageValidationError('Invalid file type. Only JPEG and PNG allowed.');
   }
   ```

2. **File Size Validation**: Enforces 2MB maximum
   ```typescript
   if (file.size > MAX_FILE_SIZE_BYTES) {
     throw new ImageValidationError('File size exceeds 2MB limit.');
   }
   ```

3. **Dimension Validation**: Loads image and checks dimensions
   ```typescript
   const { width, height } = await getImageDimensions(file);
   if (width < MIN_IMAGE_DIMENSIONS || height < MIN_IMAGE_DIMENSIONS) {
     throw new ImageValidationError('Image dimensions below 100x100 minimum.');
   }
   ```

4. **Compression**: Resizes images > 1600px to maintain aspect ratio
   - Quality: 0.8 (80% JPEG quality)
   - Format: Original format preserved (JPEG/PNG)

5. **Storage**: Uploaded to private Supabase Storage bucket with RLS protection

#### Security Features

- **Private Storage Bucket**: Requires signed URLs for access
- **Signed URLs**: Valid for 1 hour only
- **Path Sanitization**: Filenames sanitized to alphanumeric + underscore/hyphen
- **User Isolation**: Images stored in `{diverId}/{timestamp}_{filename}` structure
- **No Direct Access**: Clients cannot access images via direct URLs

---

## Performance Optimization

### Caching Strategy

**Cache Headers on `GET /api/feedback/aggregate`**

```
Cache-Control: public, max-age=300
ETag: "generated-unique-tag"
```

- **Duration**: 5 minutes (300 seconds)
- **Scope**: Public (CDN and browser caches)
- **ETag**: Generated from response content for validation

#### Database Caching

The `aggregated_conditions` table caches aggregated data:

1. **Cache Check**: Query for existing cache with `dive_site_id` and `date`
2. **Freshness**: Cache is valid for < 5 minutes
3. **Recalculation**: If stale, recalculate from `feedback` table
4. **Upsert**: Store fresh aggregation back to cache table
5. **Minimum Data**: Require ≥ 2 feedback entries to calculate aggregation

#### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Aggregate Response Time** | < 100ms (cached) | Fresh cache from DB |
| **Fresh Calculation** | < 500ms | Aggregation calculation |
| **Page Load Time** | < 2s | With caching enabled |
| **Cache Hit Rate** | > 90% | Most requests hit cache |
| **Database Queries** | 1-2 per request | Cache lookup + optional calculation |

### Database Indexing

Indexes required for performance:

```sql
-- Feedback table indexes
CREATE INDEX idx_feedback_dive_site_id ON feedback(dive_site_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
CREATE INDEX idx_feedback_dive_site_created ON feedback(dive_site_id, created_at);

-- Aggregated conditions indexes
CREATE INDEX idx_aggregated_dive_site_date ON aggregated_conditions(dive_site_id, date);
```

Verify indexes exist in production database.

---

## Implementation Checklist

### Completed Tasks

- [x] **Text Sanitization Module**
  - File: `src/lib/feedback/sanitization.ts`
  - Functions: `sanitizeText()`, `sanitizeNotes()`, `sanitizeMarineLifeCustom()`
  - Tests: 9 inline tests included

- [x] **Rate Limiting Configuration**
  - Module: `src/lib/security/rate-limiter.ts`
  - POST /api/feedback: 5 per hour
  - GET /api/feedback/aggregate: 60 per minute

- [x] **Feedback Route Updates**
  - POST /api/feedback: Added sanitization + rate limiting
  - GET /api/feedback/aggregate: Added rate limiting + cache headers

- [x] **Cache Headers**
  - Cache-Control: max-age=300 (5 minutes)
  - ETag: Generated from response content
  - Applied to both fresh and cached responses

- [x] **Image Security Verification**
  - Module: `src/lib/feedback/imageHandler.ts`
  - MIME type validation: JPEG/PNG only
  - File size: 2MB maximum
  - Dimensions: 100x100 min, 1600x1600 max
  - Compression: Quality 0.8

### Verification Steps

1. **Test Sanitization**
   ```bash
   npx ts-node src/lib/feedback/sanitization.ts
   ```
   Expected: All 9 tests pass

2. **Test Rate Limiting**
   - Make 6 POST requests to /api/feedback within 1 hour
   - Verify 6th request returns 429 status

3. **Test Cache Headers**
   ```bash
   curl -i https://your-domain/api/feedback/aggregate?siteId=<uuid>
   ```
   Expected: Cache-Control and ETag headers present

4. **Test Image Validation**
   - Attempt upload of:
     - File > 2MB (should fail)
     - Non-JPEG/PNG file (should fail)
     - Image < 100x100px (should fail)
     - Valid image (should succeed)

---

## Monitoring & Maintenance

### Rate Limit Monitoring

Check rate limit status:
```typescript
import { getRateLimitStatus, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';

const config = RATE_LIMIT_CONFIGS['POST /api/feedback'];
const status = getRateLimitStatus('user:123', config);
// { count: 3, maxRequests: 5, remaining: 2, resetAt: ... }
```

### Cache Hit Analysis

Monitor cache effectiveness by tracking:
- Requests hitting fresh cache (age < 5 minutes)
- Requests triggering recalculation
- Average response times

### Database Performance

Verify indexes are in place and analyze slow queries:
```sql
EXPLAIN ANALYZE
SELECT * FROM feedback 
WHERE dive_site_id = ? 
AND created_at >= ? 
AND created_at < ?;
```

---

## Security Best Practices

### Input Validation Chain

1. **Client-side**: Browser validation (early feedback)
2. **Sanitization**: Strip HTML tags and special characters
3. **Validation**: Zod schema validation against constraints
4. **Storage**: Supabase RLS policies enforce ownership

### Defense in Depth

| Layer | Mechanism | Benefit |
|-------|-----------|---------|
| Client | Form validation | UX feedback |
| API | Sanitization | XSS prevention |
| API | Rate limiting | Abuse prevention |
| API | Authentication | User identification |
| Database | RLS policies | Row-level security |
| Storage | Private buckets | Access control |

---

## Related Documentation

- Validation: `src/lib/feedback/validation.ts`
- Image Handling: `src/lib/feedback/imageHandler.ts`
- Rate Limiting: `src/lib/security/rate-limiter.ts`
- Security Policies: `src/lib/security/rls-policies.sql`
