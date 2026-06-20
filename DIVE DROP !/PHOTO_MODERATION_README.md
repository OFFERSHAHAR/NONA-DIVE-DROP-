# Photo Moderation System - Complete Implementation

## Overview

A production-ready Photo Moderation System for the DIVE DROP application that enables admins to review, approve, and reject user-uploaded photos with comprehensive quality assessment, bulk operations, and detailed audit trails.

## Key Features ✨

### Admin Dashboard
- **Three-Tab Interface**: Pending | Approved | Rejected
- **Real-time Statistics**: Metrics on pending count, approval rate, quality scores
- **Advanced Filtering**: By dive site, instructor, user
- **Search Capability**: Find photos by user or content
- **Pagination**: Efficient browsing of large photo libraries

### Photo Review
- **Full-Size Preview**: Comprehensive image inspection
- **Quality Score Display**: Visual indicator (0-100%)
- **User Information**: Name, email, profile link
- **Related Context**: Associated dive site and instructor
- **Upload Timestamps**: Track submission timing
- **Single & Bulk Operations**: Approve or reject one or many photos

### Approval Workflow
- **Quick Approve**: One-click approval for quality photos
- **Detailed Rejection**: Choose from 8 predefined reasons + custom notes
- **Bulk Actions**: Approve/reject multiple photos with consistent reasoning
- **Audit Trail**: Every action logged with timestamp and admin info

### Quality Assessment
- **Sharpness Check**: Is image in focus?
- **Lighting Assessment**: Appropriate exposure and brightness?
- **Composition Review**: Framing and visual appeal?
- **Content Validation**: Appropriate and relevant?
- **Calculated Score**: Automatic quality rating (0-100%)

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Admin UI (React)                      │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │  Pending     │  Approved    │  Rejected    │         │
│  │  Photos      │  Photos      │  Photos      │         │
│  └──────────────┴──────────────┴──────────────┘         │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js API Routes                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │ /api/admin/photos/pending          [GET]         │   │
│  │ /api/admin/photos/approved         [GET]         │   │
│  │ /api/admin/photos/rejected         [GET]         │   │
│  │ /api/admin/photos/{id}/approve     [POST]        │   │
│  │ /api/admin/photos/{id}/reject      [POST]        │   │
│  │ /api/admin/photos/bulk             [POST]        │   │
│  │ /api/admin/photos/stats            [GET]         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ tables:                                          │   │
│  │ • photos (user uploads)                         │   │
│  │ • photo_rejections (rejection records)          │   │
│  │ • photo_approvals (approval records)            │   │
│  │ • photo_moderation_audit (action logs)          │   │
│  │                                                  │   │
│  │ functions:                                      │   │
│  │ • get_photo_moderation_stats()                 │   │
│  │ • log_photo_moderation_action()                │   │
│  │ • update_photos_updated_at()                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## File Organization

### Database
```
src/lib/db/migrations/
└── 002_create_photo_moderation.sql    (Database schema & functions)
```

### API Routes
```
src/app/api/admin/photos/
├── pending/route.ts                   (GET pending photos)
├── approved/route.ts                  (GET approved photos)
├── rejected/route.ts                  (GET rejected photos)
├── stats/route.ts                     (GET moderation statistics)
├── bulk/route.ts                      (POST bulk approve/reject)
└── [id]/
    ├── approve/route.ts               (POST approve single photo)
    └── reject/route.ts                (POST reject single photo)
```

### UI Components
```
src/components/admin/
├── PhotoModerationCard.tsx            (Single photo card)
├── PhotoModeratorDashboard.tsx        (Main dashboard)
├── BulkApprovalPanel.tsx              (Bulk actions)
├── RejectionReasonDialog.tsx          (Rejection form)
├── PhotoModerationStats.tsx           (Statistics display)
└── PHOTO_MODERATION_SYSTEM.md         (Component documentation)
```

### Page Routes
```
src/app/[locale]/admin/photos/
├── page.tsx                           (Main page)
├── pending/page.tsx                   (Pending photos)
├── approved/page.tsx                  (Approved photos)
└── rejected/page.tsx                  (Rejected photos)
```

### Utilities & Hooks
```
src/lib/
├── admin/
│   ├── photo-moderation.ts            (Schemas & validation)
│   └── photo-moderation-examples.ts   (Usage examples)
└── hooks/
    └── usePhotoModeration.ts          (React hook)
```

### Documentation
```
root/
├── PHOTO_MODERATION_README.md         (This file)
└── PHOTO_MODERATION_INTEGRATION.md    (Integration guide)

src/components/admin/
└── PHOTO_MODERATION_SYSTEM.md         (Technical documentation)
```

## Quick Start

### 1. Run Database Migration

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase SQL Editor
# Copy & paste contents of: src/lib/db/migrations/002_create_photo_moderation.sql
```

### 2. Test the UI

Navigate to: `http://localhost:3000/admin/photos`

### 3. Upload Test Photos

Insert test data into the `photos` table:

```sql
INSERT INTO photos (user_id, dive_site_id, file_url, title, description, status)
VALUES (
  'user-uuid',
  'site-uuid',
  'https://example.com/test-photo.jpg',
  'Test Photo',
  'A test diving photo',
  'pending'
);
```

### 4. Start Moderating

1. Click "Photo Moderation" in admin sidebar
2. Review pending photos
3. Click "Approve" or "Reject"
4. For bulk operations, select photos and use bulk action panel

## API Reference

### Get Pending Photos
```
GET /api/admin/photos/pending?limit=20&offset=0
```

Query Parameters:
- `limit` (default: 20) - Photos per page
- `offset` (default: 0) - Pagination offset
- `dive_site_id` (optional) - Filter by site
- `instructor_id` (optional) - Filter by instructor
- `search` (optional) - Search by user

Response:
```json
{
  "photos": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### Approve Photo
```
POST /api/admin/photos/{id}/approve
```

Response:
```json
{
  "success": true,
  "message": "Photo approved successfully",
  "photo": {...}
}
```

### Reject Photo
```
POST /api/admin/photos/{id}/reject
Content-Type: application/json

{
  "reason": "blurry|poor_lighting|inappropriate|not_relevant|duplicate|watermark|orientation|other",
  "rejection_notes": "Optional feedback for user"
}
```

### Bulk Actions
```
POST /api/admin/photos/bulk
Content-Type: application/json

{
  "action": "approve|reject",
  "photoIds": ["id1", "id2", "id3"],
  "reason": "blurry",              // Required for reject
  "rejection_notes": "Optional"    // Optional
}
```

Response:
```json
{
  "success": true,
  "message": "Bulk approve completed",
  "processedCount": 3,
  "totalCount": 3,
  "errors": []
}
```

### Get Statistics
```
GET /api/admin/photos/stats
```

Response:
```json
{
  "stats": {
    "pendingCount": 15,
    "approvedCount": 450,
    "rejectedCount": 120,
    "todayUploads": 8,
    "averageQualityScore": 82
  },
  "recentActivity": [...]
}
```

## Database Schema

### photos Table
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  dive_site_id UUID REFERENCES dive_sites,
  instructor_id UUID REFERENCES profiles,
  file_url TEXT,
  thumbnail_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  title TEXT,
  description TEXT,
  quality_score INTEGER (0-100),
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### photo_rejections Table
```sql
CREATE TABLE photo_rejections (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES photos,
  reason TEXT,
  admin_id UUID REFERENCES profiles,
  rejection_notes TEXT,
  created_at TIMESTAMP
)
```

### photo_approvals Table
```sql
CREATE TABLE photo_approvals (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES photos,
  admin_id UUID REFERENCES profiles,
  created_at TIMESTAMP
)
```

### photo_moderation_audit Table
```sql
CREATE TABLE photo_moderation_audit (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES photos,
  admin_id UUID REFERENCES profiles,
  action TEXT CHECK (action IN ('viewed', 'approved', 'rejected', 'flagged')),
  details JSONB,
  created_at TIMESTAMP
)
```

## Component Props

### PhotoModerationCard
```typescript
interface PhotoModerationCardProps {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  userName: string;
  userEmail: string;
  diveSite?: { id: string; name: string };
  instructor?: { id: string; username: string };
  uploadedAt: string;
  qualityScore?: number;
  onApprove: () => Promise<void>;
  onReject: (reason: string, notes?: string) => Promise<void>;
  isLoading?: boolean;
}
```

### PhotoModeratorDashboard
```typescript
interface DashboardProps {
  initialTab?: 'pending' | 'approved' | 'rejected';
}
```

### BulkApprovalPanel
```typescript
interface BulkApprovalPanelProps {
  selectedCount: number;
  onApproveAll: () => Promise<void>;
  onRejectAll: (reason: string, notes?: string) => Promise<void>;
}
```

## React Hook

### usePhotoModeration
```typescript
const {
  photos,
  loading,
  error,
  pagination,
  filters,
  setPagination,
  setFilters,
  fetchPhotos,
  approvePhoto,
  rejectPhoto,
  bulkApprove,
  bulkReject,
} = usePhotoModeration();
```

## Usage Examples

### Approve a Photo
```typescript
const handleApprove = async (photoId: string) => {
  const response = await fetch(`/api/admin/photos/${photoId}/approve`, {
    method: 'POST',
  });
  const data = await response.json();
  if (data.success) {
    console.log('Photo approved!');
  }
};
```

### Reject with Reason
```typescript
const handleReject = async (photoId: string) => {
  const response = await fetch(`/api/admin/photos/${photoId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'blurry',
      rejection_notes: 'Image is out of focus'
    }),
  });
  const data = await response.json();
};
```

### Bulk Approve
```typescript
const handleBulkApprove = async (photoIds: string[]) => {
  const response = await fetch('/api/admin/photos/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      photoIds,
    }),
  });
  const data = await response.json();
  console.log(`Processed ${data.processedCount} photos`);
};
```

## Integration with Photo Upload

When users upload photos, insert into `photos` table:

```typescript
const { data: photo, error } = await supabase
  .from('photos')
  .insert({
    user_id: userId,
    dive_site_id: siteId,
    instructor_id: instructorId,
    file_url: url,
    title: title,
    description: description,
    status: 'pending',
    uploaded_at: new Date().toISOString(),
  });
```

## Email Notifications (Optional)

Update API routes to send emails on approval/rejection:

```typescript
// In /api/admin/photos/[id]/approve
await sendEmail({
  to: photo.profiles.email,
  subject: 'Your photo has been approved!',
  html: `<p>Your photo "${photo.title}" is now visible.</p>`,
});
```

## Access Control

- **Authentication**: OAuth via Supabase
- **Authorization**: Admin role required
- **RLS Policies**: Row-level security on all tables
- **Audit**: All actions logged with admin ID

## Performance Metrics

- **Query Performance**: Indexes on status, user_id, dive_site_id
- **Pagination**: 12 photos per page by default
- **Stats Refresh**: 30-second cache interval
- **Bulk Operations**: Batch processing for efficiency

## Security Features

- ✅ RLS policies on all tables
- ✅ Admin role verification
- ✅ Audit trail for accountability
- ✅ Secure file storage via Supabase
- ✅ No sensitive data in logs
- ✅ CSRF protection via Next.js

## Monitoring & Logging

- All moderation actions logged to `photo_moderation_audit`
- Statistics available via `/api/admin/photos/stats`
- Recent activity feed in dashboard
- Error logging in browser console and server logs

## Deployment Checklist

- [ ] Run database migration
- [ ] Test with sample photos
- [ ] Verify admin can access `/admin/photos`
- [ ] Test approve/reject workflow
- [ ] Test bulk operations
- [ ] Check audit logs are created
- [ ] Monitor API performance
- [ ] Configure rate limiting if needed
- [ ] Set up error alerts
- [ ] Train admins on workflow

## Troubleshooting

### 403 Forbidden
- Ensure user has 'admin' role in profiles table

### Photos not loading
- Check database migration ran
- Verify table names in API queries
- Check Supabase connection

### Images not displaying
- Verify file URLs are accessible
- Check Supabase Storage bucket permissions

### Bulk operations failing
- Ensure all photo IDs are valid UUIDs
- For reject: verify reason is provided

## Future Enhancements

1. **AI-Powered Quality Scoring**: Automated quality detection
2. **Content Moderation**: AI-based inappropriate content detection
3. **Duplicate Detection**: Find and flag duplicate submissions
4. **Mobile Moderation**: Mobile-optimized moderation interface
5. **Team Workflows**: Assign photos to specific moderators
6. **Appeals System**: Allow users to contest rejections
7. **Advanced Analytics**: Trends and patterns in uploads
8. **Webhook Notifications**: Alert when new photos arrive
9. **Export Reports**: Generate moderation reports
10. **Performance Optimization**: Caching and indexing improvements

## Support & Documentation

- **Component Docs**: `src/components/admin/PHOTO_MODERATION_SYSTEM.md`
- **Integration Guide**: `PHOTO_MODERATION_INTEGRATION.md`
- **Usage Examples**: `src/lib/admin/photo-moderation-examples.ts`
- **Best Practices**: See PHOTO_MODERATION_SYSTEM.md

## Team Guidelines

### Moderation Standards
- Review quality across multiple criteria
- Provide specific rejection reasons
- Include helpful notes when possible
- Maintain consistent standards

### Response Time
- Aim for review within 24-48 hours
- Prioritize based on site activity
- Flag urgent issues for team review

### Quality Assurance
- Regular calibration meetings
- Random sample audits
- User feedback integration
- Continuous improvement

## License

Part of the DIVE DROP platform. All rights reserved.

---

**System Status**: ✅ Production Ready

For questions or issues, consult the documentation or review the code examples.
