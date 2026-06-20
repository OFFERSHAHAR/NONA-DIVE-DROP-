# Site Photo Rotation System

Automatic cron job that rotates hero images for dive sites every 72 hours (3 days) based on intelligent photo selection.

## Overview

The photo rotation system automatically updates the hero images displayed on dive site pages with high-quality, recently-approved user-submitted photos. This keeps the site fresh and showcases the best community content.

### Key Features

- **Automatic Rotation**: Runs every 72 hours via Vercel Cron
- **Intelligent Selection**: Scores photos by recency, user ratings, and engagement
- **Approval Workflow**: Admin approval before rotation eligibility
- **Audit Trail**: Complete history of all rotations with reasoning
- **Error Handling**: Graceful fallback if no approved photos available
- **Admin Control**: Manual trigger and detailed statistics dashboard
- **Mobile/Location Support**: Can rotate photos per dive site and free-diving location

## Architecture

### Database Schema

#### `site_photos` Table
Stores all submitted photos with metadata and approval status.

```sql
Columns:
- id: UUID (primary key)
- site_id: UUID (foreign key → dive_sites)
- user_id: UUID (who uploaded)
- file_path: TEXT (storage path)
- file_size: INTEGER
- file_type: VARCHAR (image/jpeg, image/png, etc)
- title: VARCHAR(255)
- description: TEXT
- is_approved: BOOLEAN (moderation status)
- approved_at: TIMESTAMP
- approved_by: UUID (admin who approved)
- rating: NUMERIC(2,1) (0-5 stars)
- comment_count: INTEGER
- view_count: INTEGER
- uploaded_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `site_photo_rotation_logs` Table
Audit trail of all rotation operations.

```sql
Columns:
- id: UUID (primary key)
- site_id: UUID (site that was rotated)
- previous_photo_id: UUID (old hero image)
- new_photo_id: UUID (new hero image)
- set_by: VARCHAR (who triggered: 'system' or user_id)
- set_at: TIMESTAMP
- reason: TEXT (scoring info or admin note)
```

#### `site_photo_rotation_current` Table
Current hero image for each site (optimization table).

```sql
Columns:
- site_id: UUID (primary key)
- photo_id: UUID (current hero image)
- set_at: TIMESTAMP
- set_by: VARCHAR
```

## Scoring Algorithm

Each approved photo is scored 0-100 based on three weighted factors:

### 1. **Recency (40%)**
- Newer photos score higher
- Formula: `100 - days_old`
- Encourages fresh content

### 2. **Quality/Rating (30%)**
- User star ratings (0-5)
- Formula: `(rating / 5) * 100`
- Weights community feedback

### 3. **Engagement (30%)**
- Comments + views combined
- Formula: `min(100, comment_count * 5 + view_count / 10)`
- Reflects community interest

### Selection Process

1. Filter approved photos from last 30 days for each site
2. Calculate score for each photo
3. Sort by score (descending)
4. Take top 10
5. **Randomly select 1 from top 10** (prevents deterministic patterns)

**Example:**

```
Photo A:
- Uploaded: 2 days ago (99/100)
- Rating: 4.5 stars (90/100)
- Engagement: 20 comments + 500 views = 55/100
- Total: (99 * 0.4) + (90 * 0.3) + (55 * 0.3) = 81.3

Photo B:
- Uploaded: 8 days ago (93/100)
- Rating: 5 stars (100/100)
- Engagement: 5 comments + 100 views = 10/100
- Total: (93 * 0.4) + (100 * 0.3) + (10 * 0.3) = 67.2

→ Photo A wins (81.3 > 67.2)
```

## API Endpoints

### Automatic Cron Trigger

**POST** `/api/cron/rotate-photos`
- Triggered automatically every 72 hours by Vercel
- Can also be triggered manually with `CRON_SECRET`
- No authentication required (validates via Vercel header or secret)

**Response:**
```json
{
  "success": true,
  "message": "Photo rotation completed successfully",
  "data": {
    "statistics": {
      "sitesUpdated": 12,
      "sitesSkipped": 5,
      "sitesFailed": 0,
      "totalProcessed": 17
    },
    "rotations": [
      {
        "siteId": "...",
        "previousPhotoId": "...",
        "newPhotoId": "...",
        "selectedAt": "2024-06-20T12:00:00Z",
        "reason": "Scored 81.3 (rating: 4.5, engagement: 25)"
      }
    ],
    "errors": [],
    "executionTimeMs": 1250,
    "timestamp": "2024-06-20T12:00:00Z"
  }
}
```

### Manual Trigger (Admin Only)

**POST** `/api/admin/cron/rotate-photos`
- Requires admin authentication
- Manually trigger rotation for testing/immediate update
- Same response format as automatic trigger

**cURL Example:**
```bash
curl -X POST https://your-domain.com/api/admin/cron/rotate-photos \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Rotation Statistics

**GET** `/api/cron/photos/stats`
- Requires admin authentication
- Query parameters:
  - `days`: Number of days to look back (1-365, default: 30)
  - `format`: 'json' or 'csv' (default: 'json')

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "daysBack": 30,
      "since": "2024-05-21T12:00:00Z",
      "until": "2024-06-20T12:00:00Z"
    },
    "summary": {
      "totalRotations": 150,
      "sitesUpdated": 42,
      "averageRotationsPerSite": 3.6,
      "lastRotationAt": "2024-06-20T09:30:00Z"
    },
    "distribution": {
      "byHour": { "0": 2, "1": 1, ... },
      "byDay": { "2024-06-20": 5, "2024-06-19": 3, ... },
      "bySetBy": { "system": 140, "admin": 10 }
    },
    "topPerformers": {
      "sitesWithMostRotations": [
        { "siteId": "...", "siteName": "Great Barrier", "count": 8 }
      ],
      "topPhotoIds": [
        { "photoId": "...", "count": 3, "lastUsedAt": "2024-06-20T09:30:00Z" }
      ]
    },
    "rotations": [...]
  }
}
```

### Approve/Reject Photos

**POST** `/api/admin/photos/approve`
- Submit photo approval or rejection

**Request:**
```json
{
  "photo_id": "uuid-here",
  "is_approved": true,
  "reason": "High quality landscape photo"
}
```

**GET** `/api/admin/photos/approve`
- List pending photos awaiting approval
- Query parameters:
  - `site_id`: Filter by specific site (optional)
  - `page`: Pagination (default: 1)
  - `limit`: Items per page (default: 20)

### Configuration Endpoint

**GET** `/api/admin/cron/rotate-photos`
- View current cron configuration
- See validation status and next estimated run

**Response:**
```json
{
  "success": true,
  "data": {
    "configuration": {
      "enabled": true,
      "frequencyHours": 72,
      "frequencyDescription": "Every 72 hours",
      "approvalWindowDays": 30,
      "minimumPhotosRequired": 1,
      "topPhotosCountForSelection": 10,
      "scoringWeights": {
        "recency": 0.4,
        "rating": 0.3,
        "engagement": 0.3
      }
    },
    "validation": {
      "valid": true,
      "errors": []
    },
    "schedule": {
      "path": "/api/cron/rotate-photos",
      "automaticFrequency": "Every 72 hours",
      "nextRunEstimate": "2024-06-23T12:00:00Z"
    },
    "endpoints": {
      "automaticTrigger": "/api/cron/rotate-photos",
      "manualTrigger": "/api/admin/cron/rotate-photos",
      "statistics": "/api/cron/photos/stats",
      "approvePhotos": "/api/admin/photos/approve"
    }
  }
}
```

## Configuration

Edit settings in `src/lib/cron/config.ts`:

```typescript
export const CRON_CONFIG = {
  photoRotation: {
    frequencyHours: 72,           // Rotation frequency
    approvalWindowDays: 30,        // Days to look back for photos
    topPhotosCount: 10,            // Select from top N
    minimumPhotosRequired: 1,      // Minimum to attempt rotation
    enabled: true,                 // Enable/disable rotation
    
    scoringWeights: {
      recency: 0.4,
      rating: 0.3,
      engagement: 0.3,
    },
    
    notifications: {
      enabled: true,
      onSuccess: false,  // Notify on successful rotation
      onWarning: true,   // Notify if no photos available
      onError: true,     // Notify on errors
    },
  },
};
```

### Environment Variables

```env
# Cron security
CRON_SECRET=your-secret-key-for-manual-triggers

# Enable/disable
CRON_PHOTO_ROTATION_ENABLED=true

# Notifications
CRON_NOTIFICATIONS_ENABLED=true

# Logging
CRON_LOG_LEVEL=info

# Supabase service role key (for cron jobs)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Vercel Cron Configuration

The `vercel.json` file configures automatic execution:

```json
{
  "crons": [
    {
      "path": "/api/cron/rotate-photos",
      "schedule": "0 0 */3 * * *"
    }
  ]
}
```

**Schedule Explanation:**
- `0` - At minute 0
- `0` - At hour 0 (midnight)
- `*/3` - Every 3 days
- `*` - Every month
- `*` - Every day of week

**Alternative Schedules:**
- Every 24 hours: `0 0 * * *`
- Every 6 hours: `0 */6 * * *`
- Every 12 hours: `0 */12 * * *`
- Weekly: `0 0 0 * * 0`

## Error Handling

### No Approved Photos Available
- Site keeps current hero image
- Logged as "skipped" in statistics
- No error thrown

### Photo Not Found
- Log entry created with error reason
- Site not updated
- Continues with next site

### Database Errors
- Caught and logged
- Retried on next cron run
- Admin notification sent

### Validation Errors
- Configuration validated before execution
- Cron aborts if critical error found
- Admin notified immediately

## Audit Trail & Logging

Every rotation is logged with:

```json
{
  "site_id": "uuid",
  "previous_photo_id": "uuid-or-null",
  "new_photo_id": "uuid",
  "set_by": "system|admin|user_id",
  "set_at": "2024-06-20T12:00:00Z",
  "reason": "Scored 81.3 (rating: 4.5, engagement: 25)"
}
```

Query rotation history:
```sql
SELECT * FROM site_photo_rotation_logs
WHERE site_id = 'your-site-id'
ORDER BY set_at DESC
LIMIT 50;
```

## Performance Considerations

- **Indexes**: Optimized for filtering by `is_approved`, `uploaded_at`, `rating`
- **Pagination**: Batch processing to avoid timeouts
- **Caching**: Current rotation cached in `site_photo_rotation_current` table
- **Execution Time**: Typical run ~1-2 seconds for 50 sites

## Deployment Checklist

- [ ] Run database migration: `supabase db push`
- [ ] Set `CRON_SECRET` environment variable
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` environment variable
- [ ] Configure `CRON_PHOTO_ROTATION_ENABLED=true`
- [ ] Deploy to production
- [ ] Verify `vercel.json` contains cron configuration
- [ ] Test manual trigger: `POST /api/admin/cron/rotate-photos`
- [ ] Check `/api/admin/cron/rotate-photos` (GET) for configuration
- [ ] Wait for first automatic cron run
- [ ] Monitor `/api/cron/photos/stats` for results

## Troubleshooting

### Cron Not Running
1. Check `vercel.json` exists and is properly formatted
2. Verify `CRON_SECRET` is set if using manual triggers
3. Check Vercel project cron logs in dashboard
4. Try manual trigger: `POST /api/admin/cron/rotate-photos`

### Photos Not Rotating
1. Check admin photos are approved: `GET /api/admin/photos/approve`
2. Verify photos exist in last 30 days
3. Check database migration ran successfully
4. Review logs in `/api/cron/photos/stats`

### High Execution Time
1. Reduce number of sites being processed
2. Optimize photo query with better indexes
3. Check database performance
4. Consider increasing frequency (fewer photos to process)

### Scoring Issues
1. Verify `scoringWeights` sum to 1.0 in config
2. Check photo ratings in database
3. Review individual rotation reasons in logs
4. Enable `verboseScoring: true` in config

## Future Enhancements

- [ ] ML-based photo quality detection
- [ ] A/B testing different photos on same site
- [ ] User preference-based rotation
- [ ] Time-of-day based rotation (different photos at different times)
- [ ] Seasonal photo rotation
- [ ] Integration with analytics (rotate based on engagement)
- [ ] Batch photo uploads with auto-approval
- [ ] Photo moderation queue UI
- [ ] Scheduled rotation blackout periods
