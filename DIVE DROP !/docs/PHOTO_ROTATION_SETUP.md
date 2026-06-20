# Photo Rotation System - Setup Guide

Quick start guide to deploy the photo rotation cron job system.

## Prerequisites

- Next.js 16+ project with Supabase
- Vercel deployment (or alternative cron solution)
- Admin authentication middleware implemented
- Supabase service role key

## Installation Steps

### 1. Database Schema

Create the photo rotation tables in your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute the SQL migration
# File: supabase/migrations/004_site_photo_rotation.sql
```

The migration creates:
- `site_photos` - User-submitted site photos
- `site_photo_rotation_logs` - Audit trail of rotations
- `site_photo_rotation_current` - Current hero image cache

### 2. Environment Variables

Add to your `.env.local` and deployment environment:

```env
# Cron security
CRON_SECRET=your-secret-key-here-min-32-chars

# Cron service role (for database access)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Configuration
CRON_PHOTO_ROTATION_ENABLED=true
CRON_NOTIFICATIONS_ENABLED=true
CRON_LOG_LEVEL=info
```

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Vercel Configuration

Ensure `vercel.json` exists in root:

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

**Deploy Changes:**
```bash
# Push to GitHub
git add vercel.json
git commit -m "Add photo rotation cron schedule"
git push origin main

# Vercel auto-deploys
# Verify in Vercel dashboard: Settings > Crons
```

### 4. API Routes

All files are pre-created in:
- `src/app/api/cron/rotate-photos/route.ts` - Automatic trigger
- `src/app/api/cron/photos/stats/route.ts` - Statistics
- `src/app/api/admin/cron/rotate-photos/route.ts` - Manual trigger
- `src/app/api/admin/photos/approve/route.ts` - Photo approval

No additional setup needed.

### 5. Verify Installation

#### Check Configuration
```bash
curl https://your-domain.com/api/admin/cron/rotate-photos \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Response should show configuration and validation
```

#### List Pending Photos
```bash
curl "https://your-domain.com/api/admin/photos/approve?limit=10" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Get Statistics
```bash
curl "https://your-domain.com/api/cron/photos/stats?days=7" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Manual Trigger (Test)
```bash
curl -X POST https://your-domain.com/api/admin/cron/rotate-photos \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. First Run

Wait for automatic cron or trigger manually:

```bash
# Manual trigger for testing
curl -X POST https://your-domain.com/api/admin/cron/rotate-photos \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Check logs
tail -f logs/cron.log
```

## Configuration Options

### Rotation Frequency

Edit `src/lib/cron/config.ts`:

```typescript
photoRotation: {
  frequencyHours: 72,  // Every 3 days (default)
  // Change to:
  // 24 for daily
  // 12 for every 12 hours
  // 168 for weekly
}
```

Update `vercel.json` schedule accordingly:
- Daily: `0 0 * * *`
- 12-hourly: `0 */12 * * *`
- Weekly: `0 0 0 * * 0`
- 3 days: `0 0 */3 * * *`

### Scoring Weights

Adjust how photos are selected in `src/lib/cron/config.ts`:

```typescript
scoringWeights: {
  recency: 0.5,    // 50% - favor newer photos
  rating: 0.3,     // 30% - user ratings
  engagement: 0.2, // 20% - comments/views
  // Must sum to 1.0
}
```

### Selection Pool

Change how many top photos to randomly select from:

```typescript
topPhotosCount: 5,  // Select from top 5 (default: 10)
```

## Testing Without Deployment

### Local Testing

```bash
# Start dev server
npm run dev

# Test endpoints locally
curl -X POST http://localhost:3000/api/cron/rotate-photos \
  -H "Authorization: Bearer Bearer YOUR_CRON_SECRET"
```

### Test Database

Use Supabase local development:

```bash
# Start local Supabase
supabase start

# Run migrations
supabase db push

# Insert test data
```

## Monitoring & Maintenance

### Monitor Rotations

Check dashboard regularly:

```bash
# Get last 24 hours
curl "https://your-domain.com/api/cron/photos/stats?days=1" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Export as CSV
curl "https://your-domain.com/api/cron/photos/stats?days=30&format=csv" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  > rotation-stats.csv
```

### Check Logs

View Vercel cron logs:
1. Go to vercel.com dashboard
2. Select project
3. Settings > Crons
4. Click rotation endpoint
5. View logs and recent runs

### Approve New Photos

Create an admin UI for photo approval:

```typescript
// Example admin component
const pendingPhotos = await fetch('/api/admin/photos/approve?limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Handle Errors

If rotation fails:

1. **Check configuration**: `GET /api/admin/cron/rotate-photos`
2. **Check logs**: Review Vercel cron logs
3. **Check photos**: `GET /api/admin/photos/approve`
4. **Manual trigger**: `POST /api/admin/cron/rotate-photos`
5. **Review database**: Check `site_photo_rotation_logs` table

## Troubleshooting

### Cron not running automatically
- Verify `vercel.json` in root directory
- Check Vercel project settings > Crons
- Ensure deployment succeeded
- Wait up to 1 hour for first run

### Manual trigger returns 401
- Verify admin auth token is valid
- Check `Authorization: Bearer` header format
- Ensure user has admin role

### No photos rotated
- Check photos exist: `GET /api/admin/photos/approve`
- Approve test photos if needed
- Verify photos are < 30 days old (configurable)
- Check `site_photo_rotation_logs` for errors

### High execution time
- Check Supabase database performance
- Reduce `topPhotosCount` if very high
- Monitor with `/api/cron/photos/stats`

### Wrong photos selected
- Review scoring algorithm in docs
- Check individual photo scores in logs
- Adjust `scoringWeights` if needed
- Enable `verboseScoring: true` in config

## Cleanup & Deactivation

### Disable Rotation

```env
CRON_PHOTO_ROTATION_ENABLED=false
```

Or remove from `vercel.json`:

```json
{
  "crons": []  // Remove the cron entry
}
```

### Delete Old Rotations

Keep database clean by archiving old logs:

```sql
-- Delete rotations older than 1 year
DELETE FROM site_photo_rotation_logs
WHERE set_at < NOW() - INTERVAL '1 year';
```

## Advanced Setup

### Custom Notifications

Implement in cron endpoint:

```typescript
// Add webhook notification
await sendWebhook('https://your-webhook.com/photos', {
  event: 'rotation_completed',
  sites_updated: result.success,
});

// Or Slack notification
await notifySlack({
  channel: '#photo-rotations',
  message: `Rotated photos for ${result.success} sites`,
});
```

### Analytics Integration

Track rotation impact:

```typescript
// Log to analytics
analytics.track('photo_rotation', {
  sites: result.success,
  duration: executionTime,
  timestamp: new Date(),
});
```

### Rate Limiting Photos

Prevent same photo on multiple rotations:

```typescript
// In selection algorithm
const recentlyUsed = await getRecentlyRotatedPhotos(siteId, days: 7);
const available = photos.filter(p => !recentlyUsed.includes(p.id));
```

## Next Steps

1. ✅ Deploy database migration
2. ✅ Set environment variables
3. ✅ Update `vercel.json`
4. ✅ Deploy to production
5. ✅ Test manual trigger
6. ✅ Wait for first automatic run
7. ✅ Monitor statistics
8. ✅ Create admin UI for photo approval
9. ✅ Set up notifications (optional)
10. ✅ Document for team

## Support

For issues or questions:

1. Check `docs/PHOTO_ROTATION_SYSTEM.md` for full documentation
2. Review database schema in `supabase/migrations/004_site_photo_rotation.sql`
3. Check endpoint responses and error messages
4. Review Vercel cron logs for execution details
