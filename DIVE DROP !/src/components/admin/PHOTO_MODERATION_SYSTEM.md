# Photo Moderation System

## Overview

The Photo Moderation System provides a comprehensive solution for managing and moderating user-uploaded photos in the DIVE DROP application. Admins can review pending photos, approve high-quality submissions, and reject photos that don't meet quality or content standards.

## Features

### 1. Photo Management Tabs
- **Pending Photos**: Queue of photos awaiting review
- **Approved Photos**: Photos that have been approved by admins
- **Rejected Photos**: Photos that have been rejected with reasons

### 2. Photo Details
Each photo displays:
- Image preview (full-size)
- Quality score (0-100%)
- Title and description
- User information (name, email)
- Associated dive site and instructor (if applicable)
- Upload timestamp
- Rejection reason (for rejected photos)

### 3. Approval Workflow

#### Single Photo Approval
1. Admin views pending photo
2. Assesses quality and content
3. Clicks "Approve" or "Reject"
4. If rejecting, selects reason and adds optional notes
5. System updates photo status and sends notification

#### Bulk Approval
1. Admin selects multiple photos via checkboxes
2. Uses bulk action panel to approve/reject all selected
3. Can apply same rejection reason to multiple photos
4. System processes all photos in batch operation

### 4. Quality Assessment

Photos are evaluated on:
- **Sharpness**: Is the image in focus?
- **Lighting**: Is the lighting appropriate?
- **Composition**: Is the framing good?
- **Content**: Is the content appropriate and relevant?

Quality Score = Average of all criteria (0-100%)

### 5. Rejection Reasons

Predefined rejection reasons:
- Blurry or out of focus
- Poor lighting
- Inappropriate content
- Not relevant to site/instructor
- Duplicate photo
- Watermark or text overlay
- Wrong orientation
- Other (with custom notes)

### 6. Filtering & Search

Filter photos by:
- **Dive Site ID**: View photos from specific sites
- **Instructor ID**: View photos associated with specific instructors
- **User Search**: Find photos uploaded by specific users

### 7. Statistics Dashboard

Real-time stats:
- Pending photo count
- Approved photo count
- Rejected photo count
- Today's upload count
- Average quality score of approved photos
- Recent moderation activity

## API Endpoints

### Get Pending Photos
```
GET /api/admin/photos/pending?limit=20&offset=0&dive_site_id=&instructor_id=&search=
```

Response:
```json
{
  "photos": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### Get Approved Photos
```
GET /api/admin/photos/approved?limit=20&offset=0
```

### Get Rejected Photos
```
GET /api/admin/photos/rejected?limit=20&offset=0
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
  "reason": "blurry",
  "rejection_notes": "The image is significantly out of focus"
}
```

### Bulk Actions
```
POST /api/admin/photos/bulk
Content-Type: application/json

{
  "action": "approve|reject",
  "photoIds": ["id1", "id2", "id3"],
  "reason": "blurry",           // Required for reject
  "rejection_notes": "..."       // Optional
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

## Components

### PhotoModerationCard
Single photo card with:
- Image display with quality score
- User and related info
- Approve/Reject buttons
- Rejection reason selection

Props:
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
Main dashboard component with:
- Tab navigation (pending/approved/rejected)
- Filter controls
- Photo grid
- Bulk action panel
- Pagination

### BulkApprovalPanel
Bulk action interface showing:
- Count of selected photos
- Quick approve/reject buttons
- Rejection reason form

### PhotoModerationStats
Statistics display showing:
- Key metrics (pending, approved, rejected)
- Today's uploads
- Average quality score
- Recent activity feed

## Database Schema

### photos table
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  dive_site_id UUID,
  instructor_id UUID,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT ('pending', 'approved', 'rejected'),
  title TEXT,
  description TEXT,
  quality_score INTEGER (0-100),
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### photo_rejections table
```sql
CREATE TABLE photo_rejections (
  id UUID PRIMARY KEY,
  photo_id UUID NOT NULL,
  reason TEXT NOT NULL,
  admin_id UUID NOT NULL,
  rejection_notes TEXT,
  created_at TIMESTAMP
)
```

### photo_approvals table
```sql
CREATE TABLE photo_approvals (
  id UUID PRIMARY KEY,
  photo_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP
)
```

### photo_moderation_audit table
```sql
CREATE TABLE photo_moderation_audit (
  id UUID PRIMARY KEY,
  photo_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  action TEXT ('viewed', 'approved', 'rejected', 'flagged'),
  details JSONB,
  created_at TIMESTAMP
)
```

## Usage Examples

### Approve a Single Photo
```typescript
const handleApprove = async (photoId: string) => {
  const response = await fetch(`/api/admin/photos/${photoId}/approve`, {
    method: 'POST',
  });
  const data = await response.json();
  // Handle success/error
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
      rejection_notes: 'The image is out of focus'
    }),
  });
  const data = await response.json();
  // Handle success/error
};
```

### Bulk Approve Photos
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
  // Handle response
};
```

## Access Control

- **Authentication**: Only authenticated admins can access moderation endpoints
- **Authorization**: Role check ensures only users with 'admin' role can moderate
- **RLS Policies**: Supabase Row Level Security policies enforce data access

## Audit Trail

All moderation actions are logged in `photo_moderation_audit` table:
- Viewed
- Approved
- Rejected
- Flagged (for future use)

Track includes:
- Admin ID
- Action type
- Timestamp
- Additional details (reason, notes, etc.)

## Page Routes

- `/admin/photos` - Main moderation dashboard
- `/admin/photos/pending` - Pending photos queue
- `/admin/photos/approved` - Approved photos archive
- `/admin/photos/rejected` - Rejected photos with reasons

## Future Enhancements

1. **Image Quality Detection**: Automated quality scoring using computer vision
2. **Content Moderation**: AI-based inappropriate content detection
3. **Duplicate Detection**: Automated duplicate photo identification
4. **Batch Processing**: Queue system for large volumes
5. **Email Notifications**: Send approval/rejection emails to users
6. **Photo Analytics**: User photo upload patterns and trends
7. **Appeal System**: Allow users to appeal rejections
8. **Watermark Detection**: Auto-detect watermarks
9. **Advanced Filters**: Filter by quality range, upload date, etc.
10. **Export Reports**: Generate moderation reports

## Performance Considerations

- Pagination defaults to 12 photos per page
- Lazy loading for image previews
- Database indexes on status, user_id, dive_site_id, instructor_id
- Caching of stats (refreshes every 30 seconds)
- Bulk operations batched for efficiency

## Security

- RLS policies enforce row-level security
- Admin-only access to moderation endpoints
- Audit trail tracks all actions
- No direct access to rejection notes from users
- File URLs stored securely in Supabase Storage

## Integration Notes

To integrate with your email service for notifications:

1. Hook into photo approval/rejection endpoints
2. Fetch user email from photos/profiles table
3. Send notification email (approval or rejection with reason)
4. Log email send status in audit table

Example notification types:
- Photo Approved: "Your photo 'Beach Sunset' has been approved!"
- Photo Rejected: "Your photo was rejected: Poor lighting. Please try again."
