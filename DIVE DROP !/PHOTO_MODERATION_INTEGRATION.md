# Photo Moderation System - Integration Guide

## Quick Start

The Photo Moderation System is now fully integrated into your DIVE DROP application. Follow these steps to activate it.

## Step 1: Run Database Migration

Execute the SQL migration to create the necessary tables:

```bash
# Using Supabase CLI
supabase migration up

# Or paste the contents of this file into Supabase SQL editor:
# src/lib/db/migrations/002_create_photo_moderation.sql
```

This creates:
- `photos` table
- `photo_rejections` table
- `photo_approvals` table
- `photo_moderation_audit` table
- Indexes and RLS policies
- Helper functions

## Step 2: Update Admin Dashboard

The admin navigation has been automatically updated. The "Photo Moderation" menu item is now visible in the admin panel sidebar pointing to `/admin/photos`.

## Step 3: File Structure

All new files are organized as follows:

### Database Migration
```
src/lib/db/migrations/002_create_photo_moderation.sql
```

### API Routes
```
src/app/api/admin/photos/
├── pending/route.ts          # GET pending photos
├── approved/route.ts         # GET approved photos
├── rejected/route.ts         # GET rejected photos
├── [id]/
│   ├── approve/route.ts      # POST approve photo
│   └── reject/route.ts       # POST reject photo
├── bulk/route.ts             # POST bulk actions
└── stats/route.ts            # GET moderation stats
```

### UI Components
```
src/components/admin/
├── PhotoModerationCard.tsx       # Single photo card
├── PhotoModeratorDashboard.tsx   # Main dashboard
├── BulkApprovalPanel.tsx         # Bulk actions panel
├── RejectionReasonDialog.tsx     # Rejection form dialog
├── PhotoModerationStats.tsx      # Stats display
└── PHOTO_MODERATION_SYSTEM.md    # Documentation
```

### Page Routes
```
src/app/[locale]/admin/photos/
├── page.tsx                  # Main photos page
├── pending/page.tsx          # Pending photos
├── approved/page.tsx         # Approved photos
└── rejected/page.tsx         # Rejected photos
```

### Utilities & Hooks
```
src/lib/admin/photo-moderation.ts  # Schemas and utilities
src/lib/hooks/usePhotoModeration.ts # React hook for photo moderation
```

## Step 4: Access the Photo Moderation Panel

After deploying:

1. Log in to admin panel at `/admin`
2. Click "Photo Moderation" in the sidebar
3. Start reviewing pending photos

Direct links:
- Pending: `/admin/photos/pending`
- Approved: `/admin/photos/approved`
- Rejected: `/admin/photos/rejected`

## Step 5: Integrate Photo Upload

When users upload photos, insert them into the `photos` table:

```typescript
// In your photo upload endpoint
const { data, error } = await supabase
  .from('photos')
  .insert({
    user_id: userId,
    dive_site_id: diveSiteId,
    instructor_id: instructorId,
    file_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    title: title,
    description: description,
    status: 'pending',
    uploaded_at: new Date().toISOString(),
  });
```

## Step 6: Optional - Add Email Notifications

To send approval/rejection emails, update these endpoints:

### In `/api/admin/photos/[id]/approve`
```typescript
// After approval, send email
await sendEmail({
  to: photo.profiles.email,
  subject: 'Your photo has been approved!',
  html: `<p>Your photo "${photo.title}" has been approved and is now visible.</p>`,
});
```

### In `/api/admin/photos/[id]/reject`
```typescript
// After rejection, send email
await sendEmail({
  to: photo.profiles.email,
  subject: 'Your photo upload requires revision',
  html: `<p>Your photo was not approved. Reason: ${reason}</p><p>Notes: ${rejection_notes}</p>`,
});
```

## Step 7: Webhook for New Uploads (Optional)

Set up a webhook or listener to notify admins when new photos are uploaded:

```typescript
// Listen for new photos in pending status
const subscription = supabase
  .from('photos')
  .on('INSERT', payload => {
    if (payload.new.status === 'pending') {
      // Send notification to admins
      notifyAdmins({
        type: 'new_photo_upload',
        photoId: payload.new.id,
        title: payload.new.title,
      });
    }
  })
  .subscribe();
```

## Configuration

### Quality Score Weights

Customize quality assessment in `src/lib/admin/photo-moderation.ts`:

```typescript
export function calculateQualityScore(criteria: PhotoQualityCriteria): number {
  const { sharpness, lighting, composition, content } = criteria;
  // Adjust weights as needed
  return Math.round((sharpness + lighting + composition + content) / 4);
}
```

### Pagination

Default: 12 photos per page

Change in `PhotoModeratorDashboard.tsx`:
```typescript
const [pagination, setPagination] = useState({
  offset: 0,
  limit: 20,  // Change this value
  total: 0,
});
```

### Rejection Reasons

Add/modify rejection reasons in `PhotoModerationCard.tsx` and `BulkApprovalPanel.tsx`:

```typescript
const rejectionReasons = [
  'Blurry or out of focus',
  'Poor lighting',
  'Your custom reason here',
  // ...
];
```

## Testing

### Test Endpoints

```bash
# Get pending photos
curl -X GET 'http://localhost:3000/api/admin/photos/pending' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Approve a photo
curl -X POST 'http://localhost:3000/api/admin/photos/{photoId}/approve' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Reject a photo
curl -X POST 'http://localhost:3000/api/admin/photos/{photoId}/reject' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "blurry",
    "rejection_notes": "Image is out of focus"
  }'

# Bulk approve
curl -X POST 'http://localhost:3000/api/admin/photos/bulk' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "approve",
    "photoIds": ["id1", "id2"]
  }'

# Get stats
curl -X GET 'http://localhost:3000/api/admin/photos/stats' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Test Data

To test with sample photos, insert test data:

```sql
INSERT INTO photos (
  user_id, dive_site_id, file_url, title, description, status
) VALUES (
  'user-uuid', 'site-uuid', 'https://example.com/photo.jpg', 
  'Test Photo', 'A test photo', 'pending'
);
```

## Deployment Checklist

- [ ] Run database migration
- [ ] Test admin endpoints with valid auth token
- [ ] Verify RLS policies are working
- [ ] Test photo approval/rejection workflow
- [ ] Test bulk operations
- [ ] Configure email notifications (if using)
- [ ] Update documentation
- [ ] Train admins on moderation workflow
- [ ] Set up monitoring for API endpoints
- [ ] Configure rate limiting if needed

## Troubleshooting

### 403 Forbidden Error
- Check if user has `admin` role in profiles table
- Verify RLS policies are enabled

### Photos not loading
- Check database migration ran successfully
- Verify table names match API queries
- Check Supabase connection in API routes

### Bulk operations failing
- Ensure all photo IDs exist and are UUIDs
- For reject operations, verify reason is provided
- Check batch size isn't exceeding database limits

### Images not displaying
- Verify file URLs are accessible
- Check Supabase Storage bucket permissions
- Ensure thumbnail URLs are correct if provided

## Support for Internationalization (i18n)

The system uses Tailwind CSS classes for styling. Add translations for:

In your i18n JSON files:
```json
{
  "admin": {
    "photos": {
      "title": "Photo Moderation",
      "pending": "Pending Review",
      "approved": "Approved",
      "rejected": "Rejected",
      "actions": {
        "approve": "Approve",
        "reject": "Reject",
        "selectReason": "Select Rejection Reason"
      }
    }
  }
}
```

## Performance Notes

- Indexes created on: status, user_id, dive_site_id, instructor_id, uploaded_at
- Query results paginated (default 12 per page)
- Stats cached and refreshed every 30 seconds
- Bulk operations process one-by-one (can be optimized with batch inserts)

## Next Steps

1. Deploy to production
2. Seed test data
3. Run moderation workflow with team
4. Monitor metrics and adjust if needed
5. Plan for future enhancements (ML-based quality scoring, etc.)

## Support

For issues or questions:
1. Check the PHOTO_MODERATION_SYSTEM.md for detailed documentation
2. Review API endpoint implementations in `src/app/api/admin/photos/`
3. Check Supabase logs for database-related errors
4. Verify auth token validity and admin role assignment

---

**System Ready for Production** ✅
