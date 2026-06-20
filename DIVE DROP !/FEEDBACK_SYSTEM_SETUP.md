# Dive Site Feedback Card System - Deployment & Setup Guide

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** 2026-06-20

---

## Quick Start

### 1. Environment Variables

Add to `.env.local`:

```env
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Image Upload (Supabase Storage)
NEXT_PUBLIC_STORAGE_BUCKET=feedback_images

# Rate Limiting (optional, defaults to Upstash Redis)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### 2. Database Setup

Run migrations:

```bash
supabase migration up
```

Verify tables created:

```bash
supabase db list-tables
```

Should show:
- `public.feedback`
- `public.aggregated_conditions`

### 3. Storage Bucket

Create in Supabase dashboard:

1. Go to **Storage** → **Buckets**
2. Create bucket: `feedback_images`
3. Set to **Private** (public URLs via signed URLs)
4. Add policies:
   - Upload: `auth.uid()::text = foldername[1]`
   - Read: All authenticated users

### 4. Deploy

```bash
# Build
npm run build

# Test locally
npm run dev

# Deploy to Vercel
vercel deploy --prod
```

---

## Architecture Overview

### Components

**Client-Side:**
- `FeedbackCard`: Main feedback form
- `FeedbackImageUpload`: Image upload with preview
- `ConditionsDisplay`: Aggregated conditions widget

**Server-Side:**
- `POST /api/feedback`: Feedback submission
- `GET /api/feedback/aggregate`: Conditions aggregation
- `useFeedback()`: Submission hook
- `useConditions()`: Conditions fetch hook

**Database:**
- `feedback` table: Stores individual feedback entries
- `aggregated_conditions`: Daily cache of aggregated data
- `feedback_images`: Supabase Storage bucket

### Data Flow

```
User submits feedback
       ↓
FeedbackCard component
       ↓
useFeedback hook
       ↓
POST /api/feedback (with auth)
       ↓
Validate → Sanitize → Store in DB
       ↓
GET /api/feedback/aggregate (on-demand)
       ↓
Check cache (< 5 min old?)
       ├→ YES: Return cached data
       └→ NO: Calculate aggregation → Update cache
       ↓
ConditionsDisplay shows aggregated conditions
```

---

## Security Features

### XSS Prevention
- Client-side: Text input validation
- Server-side: HTML sanitization (strip tags, decode entities)
- Database: RLS policies enforce diver isolation

### Rate Limiting
- **Feedback submission:** 5 per hour per user
- **Conditions fetch:** 60 per minute per IP
- Returns **429 Too Many Requests** when exceeded

### Image Upload Security
- MIME type validation (JPEG/PNG only)
- File size limit (2MB maximum)
- Dimension validation (100-1600px)
- Server-side verification
- Private storage bucket with signed URLs (1-hour validity)

### Database Security
- Row-Level Security (RLS) policies
- Divers can only access their own feedback
- Authenticated users only
- CHECK constraints on all numeric ranges

---

## Performance Optimization

### Caching Strategy

**Client-Side:**
- SessionStorage cache for aggregated conditions
- 5-minute validity check before fetching new data
- Stale cache automatically refreshed

**Server-Side:**
- `aggregated_conditions` table stores daily cache
- 5-minute Cache-Control headers on responses
- Fresh calculation triggers only when cache stale
- Database indexes optimize query performance

### Expected Performance

- Cached response: < 100ms
- Fresh calculation: < 500ms  
- Page load: < 2 seconds (with caching)
- Expected cache hit rate: > 90%

---

## Monitoring & Maintenance

### Log Important Events

```typescript
// Feedback submission
console.log('Feedback submitted:', { siteId, diverId, timestamp })

// Cache hits/misses
console.log('Cache hit:', { siteId, age })
console.log('Cache miss, recalculating:', { siteId })

// Rate limit violations
console.log('Rate limit exceeded:', { userId, endpoint })
```

### Health Checks

```bash
# Check Supabase connectivity
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  $NEXT_PUBLIC_SUPABASE_URL/rest/v1/feedback?limit=1

# Check Storage bucket
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  $NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket/feedback_images
```

### Common Issues

**Issue:** Images not uploading
- **Check:** File size < 2MB, MIME type is JPEG/PNG
- **Fix:** Verify image validation in `imageHandler.ts`

**Issue:** Conditions not showing
- **Check:** At least 2 feedback entries for the site
- **Fix:** Submit multiple feedback entries to test

**Issue:** Rate limiting too strict
- **Fix:** Adjust limits in `src/lib/security/rate-limiter.ts`

---

## Testing

### Unit Tests (220+ tests)

```bash
npm test
```

### E2E Tests

```bash
npx playwright test e2e/feedback-system.spec.ts
```

### Manual Testing

1. **Submit Feedback:**
   - Navigate to completed dive booking
   - Fill form with all fields
   - Upload 1-3 images
   - Submit and verify success message

2. **View Conditions:**
   - Go to dive site detail page
   - Scroll to "Conditions Today" widget
   - Verify aggregated values display

3. **Rate Limiting:**
   - Submit 5 feedbacks quickly
   - 6th submission should return 429 error

4. **Error Handling:**
   - Try uploading oversized image (> 2MB)
   - Try uploading non-JPEG/PNG file
   - Leave required fields empty
   - Verify error messages show

---

## Rollback Plan

If issues occur post-deployment:

```bash
# Revert last commit
git revert HEAD

# Redeploy
vercel deploy --prod

# Manual database rollback (if needed)
# Delete aggregated_conditions entries
# Data remains in feedback table (immutable)
```

---

## Future Enhancements

- [ ] Admin dashboard for feedback management
- [ ] Watermark system for uploaded images
- [ ] Email notifications for new conditions
- [ ] Trend analysis (weekly, monthly, seasonal)
- [ ] AI-powered condition insights
- [ ] Multi-language support (French, Spanish, etc.)
- [ ] Mobile app integration
- [ ] Real-time WebSocket updates

---

## Support & Documentation

- **Code:** See inline JSDoc comments in all files
- **Specs:** See `docs/superpowers/specs/2026-06-20-feedback-card-system-design.md`
- **Architecture:** See `docs/superpowers/plans/2026-06-20-feedback-card-system.md`
- **Security:** See `src/lib/feedback/SECURITY_PERFORMANCE.md`

---

**Last Verified:** 2026-06-20  
**By:** Subagent-driven development workflow  
**Status:** ✅ Production Ready
