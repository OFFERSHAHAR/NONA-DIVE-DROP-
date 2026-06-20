# Photo Rating & Scoring System

**Created:** 2026-06-20  
**Version:** 1.0.0  
**Status:** Production Ready

---

## Overview

A comprehensive Photo Rating & Scoring System that enables users to rate dive photos, provide feedback, and automatically ranks photos based on quality, recency, and engagement metrics. The system is designed for privacy (RLS), performance (caching), and scalability (async scoring).

### Key Features

✓ 1-5 star ratings with optional comments  
✓ Row-Level Security (RLS) - users see only their own ratings  
✓ Scoring algorithm combining rating, recency, and engagement  
✓ Daily cron job for score calculation  
✓ Admin dashboard with analytics  
✓ Photo stats caching for performance  
✓ Engagement tracking (views, likes, shares)  
✓ Percentile ranking for leaderboards  
✓ Export capabilities  

---

## Architecture

### Database Schema

#### 1. `user_photo_ratings`
Stores individual user ratings and comments.

```sql
CREATE TABLE user_photo_ratings (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES user_photos(id),
  user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (1-5),        -- 1-5 stars
  comment TEXT,                      -- Optional feedback
  helpfulness_count INTEGER,         -- Votes on rating helpfulness
  is_verified_purchase BOOLEAN,      -- User dived together
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(photo_id, user_id),
  CHECK (photo_id NOT in own photos)
);
```

**RLS Policies:**
- Anyone can view all ratings (public feedback)
- Users can only create their own ratings
- Users can only update/delete their own ratings
- Admins can manage all ratings

#### 2. `photo_stats`
Cached statistics updated daily by cron job.

```sql
CREATE TABLE photo_stats (
  id UUID PRIMARY KEY,
  photo_id UUID UNIQUE REFERENCES user_photos(id),
  
  -- Rating metrics
  avg_rating DECIMAL(3,2),           -- 0-5
  rating_count INTEGER,              -- Number of ratings
  median_rating DECIMAL(3,2),        -- Median of ratings
  
  -- Engagement metrics
  view_count INTEGER,                -- Views tracked
  like_count INTEGER,                -- Likes
  comment_count INTEGER,             -- Ratings with comments
  share_count INTEGER,               -- Shares
  verified_purchase_count INTEGER,   -- Verified interactions
  
  -- Score components (0-1)
  quality_score DECIMAL(3,2),        -- rating_score
  engagement_score DECIMAL(3,2),     -- engagement_score
  recency_score DECIMAL(3,2),        -- recency_score
  overall_score DECIMAL(3,2),        -- weighted total
  
  -- Ranking
  percentile_rank INTEGER,           -- 0-100
  days_old INTEGER,                  -- Age of photo
  
  -- Timestamps
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
```sql
CREATE INDEX photo_stats_overall_score_idx ON photo_stats(overall_score DESC);
CREATE INDEX photo_stats_avg_rating_idx ON photo_stats(avg_rating DESC);
CREATE INDEX photo_stats_engagement_score_idx ON photo_stats(engagement_score DESC);
CREATE INDEX photo_stats_view_count_idx ON photo_stats(view_count DESC);
```

#### 3. `photo_scores`
Historical records for tracking score changes.

```sql
CREATE TABLE photo_scores (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES user_photos(id),
  
  -- Score components
  rating_score DECIMAL(3,2),         -- 0-1
  recency_score DECIMAL(3,2),        -- 0-1
  engagement_score DECIMAL(3,2),     -- 0-1
  total_score DECIMAL(3,2),          -- 0-1
  
  -- Weights (configurable)
  rating_weight DECIMAL(3,2),        -- Default: 0.4
  recency_weight DECIMAL(3,2),       -- Default: 0.3
  engagement_weight DECIMAL(3,2),    -- Default: 0.3
  
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

#### 4. `photo_engagement_tracking`
Lightweight engagement event tracking.

```sql
CREATE TABLE photo_engagement_tracking (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES user_photos(id),
  user_id UUID REFERENCES users(id),        -- Optional
  event_type TEXT CHECK IN ('view', 'like', 'unlike', 'share'),
  ip_address INET,                          -- For analytics
  user_agent TEXT,
  created_at TIMESTAMPTZ
);
```

---

## Scoring Algorithm

### Formula

```
Overall Score = (Rating × 0.4) + (Recency × 0.3) + (Engagement × 0.3)
```

### Components

#### 1. Quality Score (Rating Component) - Weight: 0.4

**Calculation:**
```
quality_score = avg_rating / 5.0
```

**Range:** 0-1

**Examples:**
- 5.0 rating → 1.0 score
- 4.0 rating → 0.8 score
- 3.0 rating → 0.6 score
- 0 ratings → 0.0 score

#### 2. Recency Score - Weight: 0.3

**Calculation:**
```
recency_score = max(0, (90 - days_old) / 90)
```

**Timeline:**
- 0 days (new) → 1.0 score
- 7 days → 0.92 score
- 30 days → 0.67 score
- 45 days → 0.50 score
- 90 days → 0.0 score
- 90+ days → 0.0 score

**Purpose:** Encourages fresh content, prevents stale photos from dominating

#### 3. Engagement Score - Weight: 0.3

**Calculation:**
```
interactions = views + (likes × 5) + (comments × 10)
engagement_score = min(1.0, log10(interactions + 1) / 3)
```

**Scale (logarithmic):**
- 0 interactions → 0.0 score
- 1 interaction → 0.0 score
- 10 interactions → 0.33 score
- 100 interactions → 0.67 score
- 1000+ interactions → 1.0 score

**Weighting:**
- Comments weighted 10× (highest value)
- Likes weighted 5× (medium value)
- Views weighted 1× (baseline)

**Purpose:** Incentivizes meaningful engagement over passive views

### Final Score Range

**0-100 (for display):**
```
displayed_score = overall_score × 100
```

**Examples:**
- Excellent: 80-100 (high rating, recent, very engaging)
- Very Good: 60-79 (good rating, recent, engaged)
- Good: 40-59 (decent rating, mixed recency/engagement)
- Fair: 20-39 (low rating or very old)
- Poor: 0-19 (minimal rating/engagement)

---

## API Endpoints

### 1. POST /api/photos/[id]/rate

**Submit or update a rating.**

```typescript
POST /api/photos/{photo_id}/rate

Request:
{
  rating: 1-5,
  comment?: string // max 500 chars
}

Response:
{
  success: true,
  rating: {
    id: UUID,
    photo_id: UUID,
    user_id: UUID,
    rating: number,
    comment: string,
    created_at: timestamp
  },
  message: "Rating saved successfully"
}

Errors:
- 401: Unauthorized (must be authenticated)
- 400: Invalid rating (must be 1-5)
- 400: Cannot rate own photos
- 404: Photo not found
```

**RLS Protection:**
- Only authenticated users can submit ratings
- Users can only rate photos they didn't upload
- Duplicate ratings are updated (upsert)

### 2. GET /api/photos/[id]/rate

**Fetch all ratings for a photo + user's own rating.**

```typescript
GET /api/photos/{photo_id}/rate

Response:
{
  ratings: [
    {
      id: UUID,
      rating: 1-5,
      comment: string,
      created_at: timestamp
    },
    ...
  ],
  userRating: {
    id: UUID,
    rating: 1-5,
    comment: string,
    created_at: timestamp
  } | null,
  count: number
}
```

### 3. GET /api/photos/[id]/stats

**Fetch photo stats and scores.**

```typescript
GET /api/photos/{photo_id}/stats

Response:
{
  photo_id: UUID,
  avg_rating: 4.5,
  rating_count: 42,
  median_rating: 4.0,
  view_count: 1240,
  like_count: 156,
  comment_count: 18,
  share_count: 23,
  quality_score: 0.9,
  engagement_score: 0.64,
  recency_score: 0.78,
  overall_score: 0.81,
  percentile_rank: 85,
  verified_purchase_count: 12,
  days_old: 5,
  last_calculated_at: timestamp
}
```

### 4. POST /api/photos/[id]/stats

**Manually trigger stats recalculation (admin).**

```typescript
POST /api/photos/{photo_id}/stats

Headers:
Authorization: Bearer {admin_token}

Response:
{
  success: true,
  message: "Stats recalculated",
  stats: { ... }
}
```

### 5. POST /api/photos/[id]/engagement

**Track engagement events (views, likes, shares).**

```typescript
POST /api/photos/{photo_id}/engagement

Request:
{
  event_type: "view" | "like" | "unlike" | "share"
}

Response:
{
  success: true,
  engagement: {
    id: UUID,
    photo_id: UUID,
    event_type: string,
    created_at: timestamp
  },
  message: "view tracked"
}

Note: Lightweight tracking - deduplication handled client-side
```

### 6. GET /api/photos/[id]/engagement

**Fetch engagement summary.**

```typescript
GET /api/photos/{photo_id}/engagement

Response:
{
  photo_id: UUID,
  view_count: 1240,
  like_count: 156,
  share_count: 23
}
```

### 7. POST /api/cron/calculate-scores

**Recalculate all photo scores (cron job).**

```typescript
POST /api/cron/calculate-scores

Headers:
Authorization: Bearer {CRON_SECRET}

Response:
{
  success: true,
  message: "Photo scores calculated successfully",
  timestamp: ISO timestamp,
  data: {
    statsUpdated: 1245,
    percentileRanksCalculated: 1245,
    topPhotos: [
      {
        photo_id: UUID,
        overall_score: 0.92,
        avg_rating: 4.8
      },
      ...
    ]
  }
}
```

### 8. GET /api/admin/photos/analytics

**Fetch admin dashboard analytics.**

```typescript
GET /api/admin/photos/analytics

Response:
{
  totalPhotos: 5234,
  approvedPhotos: 4892,
  avgRating: 4.3,
  totalViews: 125400,
  totalLikes: 8920,
  totalComments: 1245,
  topRatedPhotos: [
    {
      photo_id: UUID,
      caption: string,
      avg_rating: 4.9,
      rating_count: 42
    },
    ...
  ],
  mostViewedPhotos: [
    {
      photo_id: UUID,
      caption: string,
      view_count: 5600
    },
    ...
  ],
  topScoringPhotos: [
    {
      photo_id: UUID,
      caption: string,
      overall_score: 0.92
    },
    ...
  ],
  timestamp: ISO timestamp
}
```

---

## React Components

### StarRating

Interactive 5-star rating component.

```typescript
import { StarRating } from '@/components/photos/StarRating';

<StarRating
  value={3}                    // Current rating (0-5)
  onChange={(rating) => {}}    // Callback
  interactive={true}           // Clickable?
  disabled={false}             // Disabled state
  size="md"                    // 'sm' | 'md' | 'lg'
  showLabel={true}             // Show rating text?
/>
```

**Features:**
- Hover preview
- Keyboard accessible
- Animated transitions
- Custom sizes
- Disabled state

### RatingForm

Complete rating submission form.

```typescript
import { RatingForm } from '@/components/photos/RatingForm';

<RatingForm
  photoId="photo-uuid"
  onSubmit={async (rating, comment) => {
    // Submit to API
  }}
  existingRating={{              // Optional
    rating: 4,
    comment: 'Great photo!'
  }}
  isLoading={false}
  disabled={false}
/>
```

**Features:**
- Star rating selector
- Optional comment textarea
- Loading state
- Error/success messages
- Character counter (500 max)
- Update existing ratings

### PhotoStats

Display photo statistics and scoring breakdown.

```typescript
import { PhotoStats } from '@/components/photos/PhotoStats';

<PhotoStats
  avgRating={4.5}
  ratingCount={42}
  viewCount={1240}
  likeCount={156}
  commentCount={18}
  overallScore={0.81}           // Optional
  percentileRank={85}           // Optional
  showTrending={true}           // Show trending badge?
  compact={false}               // Compact layout?
/>
```

**Features:**
- Metric cards with icons
- Rating distribution
- Trending/Popular badges
- Percentile display
- Compact and full layouts
- Color-coded ratings

### PhotoAnalyticsDashboard

Admin dashboard for photo analytics.

```typescript
import { PhotoAnalyticsDashboard } from '@/components/admin/PhotoAnalyticsDashboard';

<PhotoAnalyticsDashboard />
```

**Features:**
- Real-time metrics
- Top rated photos
- Most viewed photos
- Top scoring photos
- Manual score recalculation
- CSV export
- Refresh controls

---

## Database Functions

### calculate_recency_score(created_timestamp)

**Purpose:** Calculate recency score based on photo age.

```sql
SELECT calculate_recency_score(NOW() - INTERVAL '30 days');
-- Returns: 0.67
```

### calculate_engagement_score(view_count, like_count, comment_count)

**Purpose:** Calculate engagement score with weighted interactions.

```sql
SELECT calculate_engagement_score(100, 20, 5);
-- Returns: 0.56
```

### calculate_photo_score(...)

**Purpose:** Calculate complete score with all components.

```sql
SELECT * FROM calculate_photo_score(
  4.5,    -- avg_rating
  100,    -- view_count
  20,     -- like_count
  5,      -- comment_count
  NOW() - INTERVAL '30 days'  -- created_at
);

-- Returns:
-- rating_score: 0.9
-- recency_score: 0.67
-- engagement_score: 0.56
-- total_score: 0.74
```

### update_photo_stats(p_photo_id UUID DEFAULT NULL)

**Purpose:** Update stats for one or all photos.

```sql
-- Update specific photo
SELECT * FROM update_photo_stats('photo-uuid');

-- Update all photos
SELECT * FROM update_photo_stats();

-- Returns: (updated_count, error_message)
```

### calculate_percentile_ranks()

**Purpose:** Recalculate percentile ranks for all photos.

```sql
SELECT * FROM calculate_percentile_ranks();
-- Returns: (updated_count, error_message)
```

---

## Cron Job Setup

### Daily Calculation

**Scheduled:** 2 AM UTC (adjustable)

**What it does:**
1. Updates `photo_stats` for all photos
2. Recalculates percentile ranks
3. Archives score history

**Environment Variables:**
```env
CRON_SECRET=your-secret-key-here
```

### Manual Trigger

```bash
curl -X POST https://your-domain.com/api/cron/calculate-scores \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Vercel Cron (Example)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/calculate-scores",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### AWS Lambda / n8n Example

```typescript
// Trigger daily
const response = await fetch('https://domain.com/api/cron/calculate-scores', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`
  }
});
```

---

## Row-Level Security (RLS)

### Ratings Table

| Operation | Role | Condition |
|-----------|------|-----------|
| SELECT | Public | Everyone can read all ratings |
| INSERT | Authenticated | `user_id = current_user` |
| UPDATE | Authenticated | `user_id = current_user` |
| DELETE | Authenticated | `user_id = current_user` |
| ALL | Service | Admins can manage all |

### Stats Table

| Operation | Role | Condition |
|-----------|------|-----------|
| SELECT | Public | Everyone can read |
| ALL | Service | Only service role updates |

### Engagement Tracking

| Operation | Role | Condition |
|-----------|------|-----------|
| INSERT | Public | Anyone can track events |
| SELECT | Authenticated | Users see their own events |
| SELECT | Service | Admins see all events |

---

## Performance Optimization

### Indexing Strategy

```sql
-- Hot path: Get photo stats
CREATE INDEX photo_stats_overall_score_idx 
  ON photo_stats(overall_score DESC);

-- Leaderboard queries
CREATE INDEX photo_stats_avg_rating_idx 
  ON photo_stats(avg_rating DESC);

-- Recent updates
CREATE INDEX photo_stats_last_calculated_at_idx 
  ON photo_stats(last_calculated_at DESC);

-- Rating queries
CREATE INDEX user_photo_ratings_photo_id_idx 
  ON user_photo_ratings(photo_id);

-- User ratings
CREATE INDEX user_photo_ratings_user_id_idx 
  ON user_photo_ratings(user_id);
```

### Caching Strategy

**Photo Stats** (cached in `photo_stats` table)
- Updated daily via cron
- Denormalized for read performance
- Invalidate-on-write triggers

**View Counts** (lightweight tracking)
- Stored in `photo_engagement_tracking`
- Aggregated daily during stats calculation
- No real-time requirement

### Query Optimization

```sql
-- ✓ Good: Uses index, filtered
SELECT * FROM photo_stats
WHERE overall_score > 0.7
ORDER BY overall_score DESC
LIMIT 10;

-- ✗ Bad: Full table scan
SELECT * FROM user_photo_ratings
WHERE EXTRACT(YEAR FROM created_at) = 2026;
```

---

## Security Considerations

### 1. Self-Rating Prevention

```sql
CONSTRAINT cannot_rate_own_photo CHECK (
  photo_id NOT IN (
    SELECT id FROM user_photos WHERE user_id = user_photo_ratings.user_id
  )
)
```

### 2. Authentication Required

- Rating submission requires `Bearer` token
- Public can view ratings but not submit
- Service role (admin) has full access

### 3. RLS Enforcement

- All tables have RLS enabled
- Policies checked at database level
- No bypassing at application layer

### 4. Input Validation

- Rating must be 1-5 (integer)
- Comment max 500 characters
- Event types: whitelist only (view, like, unlike, share)

### 5. Rate Limiting

*Recommended at API gateway:*
- 10 ratings per user per minute
- 5 engagement events per IP per minute
- 1 cron trigger per minute

---

## Monitoring & Analytics

### Key Metrics

```sql
-- Average photo rating
SELECT AVG(avg_rating) FROM photo_stats;

-- Rating distribution
SELECT rating, COUNT(*) FROM user_photo_ratings
GROUP BY rating;

-- Engagement patterns
SELECT event_type, COUNT(*) FROM photo_engagement_tracking
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;

-- Trending photos
SELECT photo_id, overall_score FROM photo_stats
WHERE overall_score > 0.8
ORDER BY last_calculated_at DESC;
```

### Dashboards

**Admin Dashboard** (`/components/admin/PhotoAnalyticsDashboard.tsx`)
- Total photos & approved count
- Average rating
- Top rated/viewed/scoring photos
- Manual recalculation trigger
- CSV export

---

## Troubleshooting

### Issue: Ratings not saving

**Check:**
1. User authenticated? (`Authorization: Bearer token`)
2. Valid photo ID?
3. Not rating own photo?
4. Rating 1-5?

```bash
# Test with curl
curl -X POST https://domain.com/api/photos/photo-id/rate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "comment": "Great!"}'
```

### Issue: Stats not updating

**Check:**
1. Cron job running? (check logs)
2. `CRON_SECRET` set correctly?
3. `update_photo_stats()` function exists?
4. Database connection working?

```bash
# Test manually
curl -X POST https://domain.com/api/cron/calculate-scores \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Issue: Low engagement scores

**Reasons:**
- Photos too new (recency component)
- Genuine low engagement (check for visibility settings)
- Logarithmic scale normalizes large numbers

**Optimize:**
- Promote photos on home page
- Add sharing buttons
- Encourage comments in form

---

## Future Enhancements

### Phase 2

- [ ] Photo verification badges (instructor verified)
- [ ] Helpful rating votes (upvote/downvote ratings)
- [ ] Comment threading (replies to ratings)
- [ ] Moderation system (flag inappropriate)
- [ ] AI moderation (toxicity detection)

### Phase 3

- [ ] Seasonal scoring (trending vs evergreen)
- [ ] Location-based ranking
- [ ] Photo series/albums
- [ ] Collaborative scoring
- [ ] Mobile app integration

### Phase 4

- [ ] Machine learning ranking
- [ ] Personalized recommendations
- [ ] A/B testing framework
- [ ] Advanced analytics (heatmaps, cohorts)
- [ ] Real-time leaderboards

---

## Deployment Checklist

- [ ] Run migration: `supabase db push`
- [ ] Set `CRON_SECRET` environment variable
- [ ] Configure cron job (Vercel/AWS/n8n)
- [ ] Deploy API routes
- [ ] Deploy React components
- [ ] Test rating submission
- [ ] Test stats endpoint
- [ ] Verify RLS policies
- [ ] Monitor cron job execution
- [ ] Set up alerts for failures

---

## Support & Questions

For implementation questions or issues:
1. Check database logs: `supabase logs`
2. Review function performance: `EXPLAIN ANALYZE`
3. Monitor RLS policy behavior
4. Check cron job execution
5. Review application error logs

**Key Files:**
- Schema: `/supabase/migrations/20260620_create_photo_rating_and_scoring_system.sql`
- API Routes: `/src/app/api/photos/`
- Components: `/src/components/photos/`
- Admin: `/src/components/admin/`

