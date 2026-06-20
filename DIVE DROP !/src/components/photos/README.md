# Photo Upload System Documentation

## Overview

The Photo Upload System enables users to upload, manage, and rate photos across the DIVE DROP platform. Photos can be associated with:
- Dive sites
- Free diving listings
- Instructor profiles

## Features

### 1. Photo Upload
- **File Validation**: Validates file size (max 5MB), type (JPEG, PNG, WebP)
- **Progress Tracking**: Real-time upload progress feedback
- **Metadata**: Caption, description, visibility, tags, ratings
- **Auto-approval**: Photos from verified instructors auto-approved

### 2. Photo Management
- **Visibility Control**: Public, Friends Only, Private
- **Tagging System**: Organize photos with custom tags
- **Rating System**: Community ratings (0-5 stars)
- **Deletion**: Users can delete their own photos

### 3. Photo Discovery
- **Gallery View**: Grid layout with responsive design
- **Pagination**: Load photos in chunks
- **Filtering**: By visibility, status, rating
- **Sorting**: By rating, date created

## Database Schema

### user_photos Table
```sql
- id (UUID, PK)
- user_id (UUID, FK to users)
- dive_site_id (UUID, FK to dive_sites, nullable)
- free_diving_id (UUID, FK to free_diving_listings, nullable)
- instructor_id (UUID, FK to users, nullable)
- file_name (TEXT)
- file_url (TEXT)
- file_size (INT)
- file_type (TEXT)
- caption (TEXT)
- description (TEXT)
- rating (FLOAT)
- rating_count (INT)
- status (TEXT: pending/approved/rejected)
- visibility (TEXT: public/private/friends_only)
- tags (TEXT[])
- metadata (JSONB)
- approved_by (UUID, FK to users)
- approved_at (TIMESTAMPTZ)
- rejection_reason (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### photo_ratings Table
```sql
- id (UUID, PK)
- photo_id (UUID, FK to user_photos)
- user_id (UUID, FK to users)
- rating (FLOAT: 0-5)
- created_at (TIMESTAMPTZ)
- UNIQUE(photo_id, user_id)
```

## Components

### PhotoUploadForm
Upload form with file selection, validation, and metadata.

**Props:**
- `diveSiteId?`: Associated dive site ID
- `freeDivingId?`: Associated free diving listing ID
- `instructorId?`: Associated instructor ID
- `onUploadStart`: Callback when upload starts
- `onUploadProgress`: Callback for progress updates (0-100)
- `onUploadComplete`: Callback when upload completes
- `onUploadError`: Callback on upload error
- `isLoading?`: Disable form while loading

**Example:**
```tsx
<PhotoUploadForm
  diveSiteId="site-123"
  onUploadStart={() => console.log('Upload started')}
  onUploadProgress={(p) => console.log(`${p}%`)}
  onUploadComplete={(photo) => console.log('Photo uploaded:', photo)}
  onUploadError={(error) => console.log('Error:', error)}
/>
```

### PhotoUploadProgress
Visual progress indicator for ongoing uploads.

**Props:**
- `progress`: Progress percentage (0-100)
- `isVisible`: Whether to show the component

**Example:**
```tsx
const [progress, setProgress] = useState(0);
return <PhotoUploadProgress progress={progress} isVisible={progress > 0} />;
```

### PhotoPreview
Gallery component for displaying photos.

**Props:**
- `photos`: Array of PhotoData objects
- `isLoading?`: Show skeleton loading state
- `onDelete?`: Callback for delete action
- `onRate?`: Callback for rating action
- `showActions?`: Show action buttons

**PhotoData Interface:**
```ts
{
  id: string;
  file_url: string;
  caption: string;
  description: string;
  rating: number;
  rating_count: number;
  created_at: string;
  user?: { id: string; email: string };
  tags?: string[];
  visibility: string;
  status: string;
}
```

**Example:**
```tsx
<PhotoPreview
  photos={photos}
  isLoading={isLoading}
  onDelete={async (id) => { /* delete logic */ }}
  onRate={async (id, rating) => { /* rate logic */ }}
/>
```

### PhotoUploadContainer
All-in-one container combining upload form, progress, and gallery.

**Props:**
- `diveSiteId?`: Associated dive site ID
- `freeDivingId?`: Associated free diving listing ID
- `instructorId?`: Associated instructor ID
- `onPhotoUploaded?`: Callback when photo is successfully uploaded

**Example:**
```tsx
<PhotoUploadContainer
  diveSiteId="site-123"
  onPhotoUploaded={(photo) => console.log('Photo uploaded:', photo)}
/>
```

## API Routes

### POST /api/photos/upload
Upload a photo.

**Request:**
```
Content-Type: multipart/form-data

file: File (required)
dive_site_id?: string
free_diving_id?: string
instructor_id?: string
caption?: string
description?: string
visibility?: 'public' | 'friends_only' | 'private' (default: 'public')
tags?: string (comma-separated)
```

**Response (200):**
```json
{
  "success": true,
  "photo": { /* photo record */ },
  "url": "https://..."
}
```

### GET /api/photos/site/[id]
Get photos for a dive site.

**Query Params:**
- `limit`: Max results (1-100, default: 12)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "photos": [],
  "total": 42,
  "limit": 12,
  "offset": 0,
  "hasMore": true
}
```

### GET /api/photos/free-diving/[id]
Get photos for a free diving listing.

**Same as `/api/photos/site/[id]`**

### GET /api/photos/instructor/[id]
Get photos from an instructor.

**Same as `/api/photos/site/[id]`**

### DELETE /api/photos/[id]
Delete a photo (only the owner).

**Response (200):**
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

### POST /api/photos/[id]
Rate a photo or update metadata.

**Request:**
```json
{
  "action": "rate" | "update",
  "rating": 4.5,           // for rate action
  "caption": "...",         // for update action
  "description": "...",
  "visibility": "public",
  "tags": ["tag1", "tag2"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Photo rated/updated successfully",
  "rating": { /* rating record */ },
  "photo": { /* updated photo */ }
}
```

## Utilities

### validatePhotoFile(file)
Validates a photo file before upload.

**Returns:**
```ts
{
  isValid: boolean;
  error?: string;
}
```

### uploadPhotoToStorage(file, userId)
Uploads file to Supabase Storage.

**Returns:**
```ts
{
  url: string;
  path: string;
  fileName: string;
  size: number;
  type: string;
}
```

### createPhotoRecord(userId, fileUrl, fileName, fileSize, fileType, options)
Creates photo record in database.

**Options:**
```ts
{
  diveSiteId?: string;
  freeDivingId?: string;
  instructorId?: string;
  caption?: string;
  description?: string;
  visibility?: string;
  tags?: string[];
}
```

### getPhotosForDiveSite(diveSiteId, limit, offset)
Gets approved public photos for a dive site.

### getPhotosForFreeDiving(freeDivingId, limit, offset)
Gets approved public photos for a free diving listing.

### getInstructorPhotos(instructorId, limit, offset)
Gets approved public photos from an instructor.

### deletePhoto(photoId, userId)
Deletes a photo (from storage and database).

### ratePhoto(photoId, userId, rating)
Rate a photo (0-5 scale).

## Security

### Row-Level Security (RLS)
- Users can only see approved photos or their own photos
- Visibility settings (public/private/friends_only) are enforced
- Users can only delete/update their own photos
- Only service role can approve photos

### File Security
- File types validated (JPEG, PNG, WebP only)
- File size limited to 5MB
- Stored in Supabase Storage with signed URLs
- User ID included in storage path

### Authentication
- All upload/delete operations require authenticated user
- User ID verified on server side
- Instructor photos auto-approved for trusted users

## Integration Examples

### For Dive Sites
```tsx
// pages/dive-sites/[id]/page.tsx
import { PhotoUploadContainer } from '@/components/photos/PhotoUploadContainer';

export default function DiveSitePage({ params }) {
  return (
    <div>
      <h1>Dive Site Details</h1>
      <PhotoUploadContainer diveSiteId={params.id} />
    </div>
  );
}
```

### For Free Diving
```tsx
// pages/free-diving/[id]/page.tsx
import { PhotoUploadContainer } from '@/components/photos/PhotoUploadContainer';

export default function FreeDivingPage({ params }) {
  return (
    <div>
      <h1>Free Diving Session</h1>
      <PhotoUploadContainer freeDivingId={params.id} />
    </div>
  );
}
```

### For Instructor Profiles
```tsx
// pages/instructors/[id]/page.tsx
import { PhotoUploadContainer } from '@/components/photos/PhotoUploadContainer';

export default function InstructorPage({ params }) {
  return (
    <div>
      <h1>Instructor Profile</h1>
      <PhotoUploadContainer instructorId={params.id} />
    </div>
  );
}
```

### Custom Implementation
```tsx
import { PhotoUploadForm } from '@/components/photos/PhotoUploadForm';
import { PhotoPreview } from '@/components/photos/PhotoPreview';
import { PhotoUploadProgress } from '@/components/photos/PhotoUploadProgress';

export default function CustomPhotoPage() {
  const [progress, setProgress] = useState(0);
  const [photos, setPhotos] = useState([]);

  return (
    <div className="space-y-8">
      <PhotoUploadForm
        diveSiteId="site-123"
        onUploadStart={() => setProgress(0)}
        onUploadProgress={setProgress}
        onUploadComplete={(result) => {
          setProgress(100);
          // Reload photos...
        }}
        onUploadError={(error) => console.log(error)}
      />

      <PhotoUploadProgress progress={progress} isVisible={progress > 0} />

      <PhotoPreview photos={photos} />
    </div>
  );
}
```

## Performance Considerations

### Pagination
- Always use limit/offset for large galleries
- Default limit is 12, max is 100
- Implement infinite scroll or "Load more" button

### Image Optimization
- Use Next.js Image component (included in PhotoPreview)
- Images are auto-compressed by Supabase CDN
- Store at appropriate resolution

### Database Indexes
- Queries use indexed columns for fast filtering
- Ratings are aggregated automatically
- Composite indexes for common filter patterns

## Troubleshooting

### Upload fails with "Invalid file type"
- Ensure file is JPEG, PNG, or WebP
- Check file extension matches type

### Upload fails with "File size exceeds 5MB"
- Compress image before uploading
- Use WebP format for smaller file sizes

### Photos not showing up
- Check photo status (must be 'approved')
- Check visibility (must be 'public' or current user)
- Ensure correct dive_site_id/free_diving_id/instructor_id

### Rating not updating
- Ensure user is authenticated
- Check photo exists and is visible

## Future Enhancements

- [ ] Image compression/resizing
- [ ] Virus scanning integration
- [ ] Batch upload
- [ ] Photo editing (crop, filter)
- [ ] AI moderation for inappropriate content
- [ ] Photo licensing/commercial use tracking
- [ ] Watermarking
- [ ] Social sharing
- [ ] Photo albums/collections
