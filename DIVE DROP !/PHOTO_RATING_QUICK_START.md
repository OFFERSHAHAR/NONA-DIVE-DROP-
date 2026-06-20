# Photo Rating System - Quick Start Guide

## 5-Minute Setup

### Step 1: Apply Database Migration

```bash
cd /path/to/DIVE DROP !

# Apply migration to Supabase
supabase db push

# Or manually run SQL in Supabase dashboard
cat supabase/migrations/20260620_create_photo_rating_and_scoring_system.sql
# Copy & paste into SQL editor
```

### Step 2: Set Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
CRON_SECRET=generate-random-secret-here
```

### Step 3: Add to Page

```typescript
// pages/photos/[id].tsx
import { RatingForm } from '@/components/photos/RatingForm';
import { PhotoStats } from '@/components/photos/PhotoStats';
import { usePhotoStats } from '@/hooks/usePhotoStats';

export default function PhotoPage({ params }: { params: { id: string } }) {
  const { stats, isLoading } = usePhotoStats(params.id);

  return (
    <div>
      {/* Photo content */}
      
      {/* Stats panel */}
      <PhotoStats {...stats} />
      
      {/* Rating form */}
      <RatingForm 
        photoId={params.id}
        onSubmit={async (rating, comment) => {
          const response = await fetch(`/api/photos/${params.id}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, comment })
          });
          return response.json();
        }}
      />
    </div>
  );
}
```

### Step 4: Setup Cron Job

**Option A: Vercel**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/calculate-scores",
    "schedule": "0 2 * * *"
  }]
}
```

**Option B: External Service (n8n, Make, etc)**
```bash
curl -X POST https://your-domain.com/api/cron/calculate-scores \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Option C: GitHub Actions**
```yaml
name: Daily Photo Scoring

on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  calculate-scores:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate photo scores
        run: |
          curl -X POST ${{ secrets.DOMAIN }}/api/cron/calculate-scores \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## Core Components

### 1. StarRating Component

```typescript
import { StarRating } from '@/components/photos/StarRating';

function MyComponent() {
  const [rating, setRating] = useState(0);

  return (
    <StarRating
      value={rating}
      onChange={setRating}
      size="lg"
      showLabel={true}
    />
  );
}
```

**Props:**
- `value`: Current rating (0-5)
- `onChange`: Callback function
- `interactive`: Enable clicking (default: true)
- `disabled`: Disable interactions
- `size`: 'sm' | 'md' | 'lg'
- `showLabel`: Show "X / 5" text

### 2. RatingForm Component

```typescript
import { RatingForm } from '@/components/photos/RatingForm';

<RatingForm
  photoId="photo-id-here"
  onSubmit={async (rating, comment) => {
    // Handle submission
  }}
/>
```

**Props:**
- `photoId`: Required photo ID
- `onSubmit`: Async submission handler
- `existingRating`: Pre-fill existing rating
- `isLoading`: Loading state
- `disabled`: Disable form

### 3. PhotoStats Component

```typescript
import { PhotoStats } from '@/components/photos/PhotoStats';

<PhotoStats
  avgRating={4.5}
  ratingCount={42}
  viewCount={1200}
  likeCount={156}
  commentCount={18}
  overallScore={0.81}
  percentileRank={85}
/>
```

**Props:**
- `avgRating`: Average rating (0-5)
- `ratingCount`: Number of ratings
- `viewCount`: View count
- `likeCount`: Like count
- `commentCount`: Comment count
- `overallScore`: Calculated score (0-1)
- `percentileRank`: Percentile (0-100)
- `showTrending`: Show trending badge
- `compact`: Compact layout

---

## API Reference

### Rate Photo

```typescript
POST /api/photos/{photoId}/rate

// Request
{
  rating: 1,        // 1-5
  comment: "..."    // Optional, max 500 chars
}

// Response
{
  success: true,
  rating: { ... }
}
```

### Get Ratings

```typescript
GET /api/photos/{photoId}/rate

// Response
{
  ratings: [ ... ],
  userRating: { ... } | null,
  count: number
}
```

### Get Stats

```typescript
GET /api/photos/{photoId}/stats

// Response
{
  avg_rating: 4.5,
  rating_count: 42,
  view_count: 1200,
  like_count: 156,
  overall_score: 0.81,
  percentile_rank: 85,
  ...
}
```

### Track Engagement

```typescript
POST /api/photos/{photoId}/engagement

// Request
{
  event_type: "view" | "like" | "unlike" | "share"
}

// Response
{
  success: true,
  engagement: { ... }
}
```

---

## Database Tables Summary

### user_photo_ratings
Stores ratings and comments from users.

```sql
SELECT * FROM user_photo_ratings
WHERE photo_id = 'photo-id'
ORDER BY created_at DESC;
```

### photo_stats
Cached stats updated daily.

```sql
SELECT * FROM photo_stats
WHERE photo_id = 'photo-id';

-- Get top photos
SELECT * FROM photo_stats
ORDER BY overall_score DESC
LIMIT 10;
```

### photo_engagement_tracking
Event tracking (views, likes, shares).

```sql
SELECT event_type, COUNT(*) FROM photo_engagement_tracking
WHERE photo_id = 'photo-id'
GROUP BY event_type;
```

### photo_scores
Historical score records.

```sql
SELECT * FROM photo_scores
WHERE photo_id = 'photo-id'
ORDER BY calculated_at DESC
LIMIT 1;
```

---

## Scoring Algorithm (Summary)

```
Overall Score = (Rating × 0.4) + (Recency × 0.3) + (Engagement × 0.3)
```

**Components:**
- **Rating (40%)**: Average rating / 5
- **Recency (30%)**: (90 - days_old) / 90, min 0, max 1
- **Engagement (30%)**: log10(interactions + 1) / 3, min 0, max 1

**Score Display:**
- 80-100: Trending
- 60-79: Popular
- 40-59: Good
- 20-39: Fair
- 0-19: Low

---

## Common Usage Patterns

### Pattern 1: Simple Rating Display

```typescript
function PhotoCard({ photo }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`/api/photos/${photo.id}/stats`)
      .then(r => r.json())
      .then(setStats);
  }, [photo.id]);

  return (
    <div>
      <img src={photo.url} />
      {stats && (
        <div className="text-sm">
          ⭐ {stats.avg_rating.toFixed(1)} ({stats.rating_count})
          👁️ {stats.view_count.toLocaleString()}
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Full Rating Experience

```typescript
function PhotoDetail({ photoId }) {
  const [stats, setStats] = useState(null);
  const [userRating, setUserRating] = useState(null);

  const handleRate = async (rating, comment) => {
    const res = await fetch(`/api/photos/${photoId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
    
    // Refresh stats
    const stats = await fetch(`/api/photos/${photoId}/stats`)
      .then(r => r.json());
    setStats(stats);
  };

  return (
    <>
      <PhotoStats {...stats} />
      <RatingForm photoId={photoId} onSubmit={handleRate} />
    </>
  );
}
```

### Pattern 3: Admin Dashboard

```typescript
function AdminDashboard() {
  return <PhotoAnalyticsDashboard />;
}
```

---

## Testing

### Test Rating Submission

```bash
PHOTO_ID="your-photo-id"
RATING=5
COMMENT="Great photo!"

curl -X POST http://localhost:3000/api/photos/$PHOTO_ID/rate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"rating\": $RATING, \"comment\": \"$COMMENT\"}"
```

### Test Stats

```bash
curl http://localhost:3000/api/photos/$PHOTO_ID/stats
```

### Test Cron

```bash
curl -X POST http://localhost:3000/api/cron/calculate-scores \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Troubleshooting

### "Cannot rate own photos"
- User is trying to rate their own photo
- Check: `photo.user_id !== current_user.id`

### "Photo not found"
- Invalid photo ID
- Photo deleted
- Check: Photo exists and is approved

### "Unauthorized"
- No auth token provided
- Invalid/expired token
- Check: `Authorization: Bearer {token}`

### Stats not updating
- Cron job hasn't run yet
- Check logs: `supabase logs`
- Manual trigger: `curl /api/cron/calculate-scores`

### RLS policy errors
- User lacks permission
- Check: RLS policies in Supabase dashboard
- Verify: `auth.uid()` matches requirements

---

## Customization

### Change Score Weights

```sql
-- Edit these percentages (must sum to 1.0)
rating_weight DECIMAL(3,2) DEFAULT 0.4,      -- ← Change
recency_weight DECIMAL(3,2) DEFAULT 0.3,     -- ← Change
engagement_weight DECIMAL(3,2) DEFAULT 0.3   -- ← Change

-- Then update calculate_photo_score() function
```

### Change Recency Timeline

```sql
-- Edit in calculate_recency_score()
-- Current: 0.0 at 90 days
-- Change: ELSIF days_old >= 60 THEN score := 0.0;
```

### Change Engagement Weights

```sql
-- Edit in calculate_engagement_score()
-- Current: views (1×), likes (5×), comments (10×)
-- Change: like_count * 3 + comment_count * 8
```

---

## Performance Tips

1. **Index heavily used queries**
   ```sql
   CREATE INDEX idx_photo_stats_score ON photo_stats(overall_score DESC);
   ```

2. **Cache stats in app memory**
   ```typescript
   const statsCache = new Map(); // TTL: 5 minutes
   ```

3. **Use pagination for lists**
   ```typescript
   SELECT * FROM photo_stats LIMIT 20 OFFSET 0;
   ```

4. **Batch engagement tracking**
   - Don't track every single view
   - Client-side deduplication
   - Batch insert every 5 minutes

---

## What's Included

✅ Database schema with triggers  
✅ Scoring algorithm functions  
✅ API endpoints (rate, stats, engagement, cron)  
✅ React components (StarRating, RatingForm, PhotoStats)  
✅ Admin dashboard  
✅ RLS policies for privacy  
✅ Comprehensive documentation  
✅ Quick start guide (this file)  

---

## Next Steps

1. ✅ Run migration
2. ✅ Set environment variables  
3. ✅ Deploy API routes
4. ✅ Add components to pages
5. ✅ Setup cron job
6. ✅ Test functionality
7. ✅ Monitor performance

---

**Ready to deploy!** 🚀

