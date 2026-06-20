# Photo Upload System - Testing Guide

## Test Plan

### Pre-Testing Checklist
- [ ] Database migration applied
- [ ] Storage bucket created
- [ ] Environment variables configured
- [ ] Application builds without errors
- [ ] All components import correctly

## Unit Tests

### PhotoUploadForm Component

```tsx
// __tests__/PhotoUploadForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoUploadForm } from '@/components/photos/PhotoUploadForm';

describe('PhotoUploadForm', () => {
  it('should render upload form', () => {
    render(
      <PhotoUploadForm
        diveSiteId="test-id"
        onUploadStart={() => {}}
        onUploadProgress={() => {}}
        onUploadComplete={() => {}}
        onUploadError={() => {}}
      />
    );
    
    expect(screen.getByText(/Select Photo/i)).toBeInTheDocument();
  });

  it('should validate file size', async () => {
    const onError = jest.fn();
    render(
      <PhotoUploadForm
        diveSiteId="test-id"
        onUploadStart={() => {}}
        onUploadProgress={() => {}}
        onUploadComplete={() => {}}
        onUploadError={onError}
      />
    );

    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });
    const input = screen.getByLabelText(/Select Photo/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/exceeds 5MB/i)).toBeInTheDocument();
    });
  });

  it('should validate file type', async () => {
    const onError = jest.fn();
    render(
      <PhotoUploadForm
        diveSiteId="test-id"
        onUploadStart={() => {}}
        onUploadProgress={() => {}}
        onUploadComplete={() => {}}
        onUploadError={onError}
      />
    );

    const file = new File(['content'], 'document.pdf', {
      type: 'application/pdf',
    });
    const input = screen.getByLabelText(/Select Photo/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid file', async () => {
    const onComplete = jest.fn();
    const { container } = render(
      <PhotoUploadForm
        diveSiteId="test-id"
        onUploadStart={() => {}}
        onUploadProgress={() => {}}
        onUploadComplete={onComplete}
        onUploadError={() => {}}
      />
    );

    const file = new File(['image data'], 'photo.jpg', {
      type: 'image/jpeg',
    });
    const input = screen.getByLabelText(/Select Photo/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
```

### PhotoPreview Component

```tsx
// __tests__/PhotoPreview.test.tsx
import { render, screen } from '@testing-library/react';
import { PhotoPreview } from '@/components/photos/PhotoPreview';

const mockPhotos = [
  {
    id: '1',
    file_url: 'https://example.com/photo1.jpg',
    caption: 'Beautiful coral',
    description: 'Pristine coral reef',
    rating: 4.5,
    rating_count: 10,
    created_at: '2026-06-20T10:00:00Z',
    visibility: 'public',
    status: 'approved',
    tags: ['coral', 'reef'],
  },
];

describe('PhotoPreview', () => {
  it('should render empty state', () => {
    render(<PhotoPreview photos={[]} />);
    expect(screen.getByText(/No photos yet/i)).toBeInTheDocument();
  });

  it('should render photos grid', () => {
    render(<PhotoPreview photos={mockPhotos} />);
    expect(screen.getByText('Beautiful coral')).toBeInTheDocument();
    expect(screen.getByText('Pristine coral reef')).toBeInTheDocument();
  });

  it('should show loading skeleton', () => {
    render(<PhotoPreview photos={[]} isLoading={true} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display rating', () => {
    render(<PhotoPreview photos={mockPhotos} />);
    expect(screen.getByText(/4.5/)).toBeInTheDocument();
    expect(screen.getByText(/\(10\)/)).toBeInTheDocument();
  });

  it('should display tags', () => {
    render(<PhotoPreview photos={mockPhotos} />);
    expect(screen.getByText(/#coral/)).toBeInTheDocument();
    expect(screen.getByText(/#reef/)).toBeInTheDocument();
  });
});
```

## Integration Tests

### Upload Flow

```bash
# Test 1: Complete upload flow
curl -X POST http://localhost:3000/api/photos/upload \
  -F "file=@test_photo.jpg" \
  -F "dive_site_id=site-123" \
  -F "caption=Test photo" \
  -F "description=Test description" \
  -F "visibility=public" \
  -F "tags=test,demo" \
  -H "Cookie: $(get_auth_cookie)" \
  -v

# Expected:
# - Status: 200
# - Response contains photo record with id
# - file_url is valid
```

### Retrieval Flow

```bash
# Test 2: Get photos for dive site
curl http://localhost:3000/api/photos/site/site-123?limit=12&offset=0 \
  -H "Accept: application/json" \
  -v

# Expected:
# - Status: 200
# - photos array contains uploaded photo
# - total count is correct
```

### Rating Flow

```bash
# Test 3: Rate a photo
curl -X POST http://localhost:3000/api/photos/PHOTO_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $(get_auth_cookie)" \
  -d '{"action":"rate","rating":4.5}' \
  -v

# Expected:
# - Status: 200
# - rating field updated
# - rating_count incremented
```

### Deletion Flow

```bash
# Test 4: Delete a photo
curl -X DELETE http://localhost:3000/api/photos/PHOTO_ID \
  -H "Cookie: $(get_auth_cookie)" \
  -v

# Expected:
# - Status: 200
# - Photo removed from storage
# - Photo removed from database
```

## Manual Testing Scenarios

### Scenario 1: Basic Upload
1. Navigate to `/example-photo-gallery`
2. Click "Click to select photo"
3. Choose a JPEG under 5MB
4. Enter caption "Test photo"
5. Leave description empty
6. Keep visibility as "Public"
7. Click "Upload Photo"
8. Observe progress bar 0-100%
9. Verify success message appears
10. Check photo appears in gallery

**Expected:**
- ✅ No errors in console
- ✅ Photo appears in gallery
- ✅ File size shown correctly
- ✅ Progress completes smoothly

### Scenario 2: File Validation
1. Try uploading 10MB file
   - Expected: Error "File size exceeds 5MB"
2. Try uploading .pdf file
   - Expected: Error "Invalid file type"
3. Try uploading with different extensions (.jpeg, .png, .webp)
   - Expected: All accepted

**Expected:**
- ✅ Errors show immediately
- ✅ File input cleared after error

### Scenario 3: Metadata
1. Upload photo with:
   - Caption: "Beautiful sunset dive"
   - Description: "Amazing colors at 30m depth"
   - Visibility: "Private"
   - Tags: "sunset, deep, amazing"
2. Verify in gallery

**Expected:**
- ✅ All metadata displayed correctly
- ✅ Tags show with # prefix
- ✅ Visibility badge shows 🔒

### Scenario 4: Rating System
1. Upload a photo
2. Hover over photo
3. Click star icon
4. Click to set rating to 4 stars
5. Refresh page
6. Verify rating persisted

**Expected:**
- ✅ Rating updates in real-time
- ✅ Rating count increments
- ✅ Rating persists after refresh

### Scenario 5: Deletion
1. Upload a photo
2. Wait for success message
3. Hover over photo
4. Click trash icon
5. Confirm deletion
6. Verify photo removed from gallery and storage

**Expected:**
- ✅ Photo disappears immediately
- ✅ File removed from Supabase Storage
- ✅ Database record deleted

### Scenario 6: Multi-user Interaction
1. User A uploads photo
2. User B views photo gallery
3. User B rates photo
4. User A deletes photo
5. User B refreshes - photo gone

**Expected:**
- ✅ All users see same data
- ✅ Real-time updates work
- ✅ Proper auth/authorization

### Scenario 7: Responsive Design
1. View gallery on desktop (1200px+)
   - Expected: 3-column grid
2. View on tablet (768-1200px)
   - Expected: 2-column grid
3. View on mobile (< 768px)
   - Expected: 1-column grid
4. Upload form works on all sizes

**Expected:**
- ✅ Layout adapts correctly
- ✅ Touch targets adequate size
- ✅ No horizontal scroll

## Database Testing

### Check Data Integrity

```sql
-- Verify photos created
SELECT COUNT(*) FROM user_photos;

-- Check ratings aggregated
SELECT 
  photo_id,
  rating,
  rating_count
FROM user_photos
WHERE rating IS NOT NULL;

-- Verify RLS working
SELECT * FROM user_photos
WHERE status = 'approved' AND visibility = 'public';

-- Check storage relationships
SELECT 
  up.id,
  up.file_url,
  up.status,
  COUNT(pr.id) as ratings
FROM user_photos up
LEFT JOIN photo_ratings pr ON up.id = pr.photo_id
GROUP BY up.id;
```

### Performance Testing

```sql
-- Check index performance
EXPLAIN ANALYZE
SELECT * FROM user_photos
WHERE dive_site_id = 'site-123'
AND status = 'approved'
AND visibility = 'public'
ORDER BY rating DESC
LIMIT 12;

-- Should use indexes efficiently

-- Check rating trigger performance
EXPLAIN ANALYZE
SELECT * FROM photo_ratings
WHERE photo_id = 'photo-123';
```

## Error Handling Tests

### Test Cases

```typescript
// 1. Missing authentication
POST /api/photos/upload (no auth)
→ Expected: 401 Unauthorized

// 2. Invalid file
POST /api/photos/upload (file=null)
→ Expected: 400 Bad Request

// 3. Missing location
POST /api/photos/upload (no dive_site_id/free_diving_id/instructor_id)
→ Expected: 400 Bad Request

// 4. Non-existent photo
DELETE /api/photos/nonexistent-id
→ Expected: 404 Not Found

// 5. Unauthorized deletion
DELETE /api/photos/other-users-photo
→ Expected: 401/403 Unauthorized

// 6. Invalid rating
POST /api/photos/[id] {rating: 10}
→ Expected: 400 Bad Request

// 7. Network error during upload
(Disconnect network mid-upload)
→ Expected: Error shown, form resets

// 8. Large payload
POST /api/photos/upload (form data > 10MB)
→ Expected: 413 Payload Too Large
```

## Performance Testing

### Load Testing

```bash
# Test with 100 concurrent uploads
ab -n 100 -c 10 \
  -p upload_data.txt \
  -T multipart/form-data \
  http://localhost:3000/api/photos/upload

# Expected:
# - < 2s average response time
# - < 1% error rate
```

### Gallery Load Time

```bash
# Initial load
time curl http://localhost:3000/api/photos/site/site-123?limit=12

# Expected: < 500ms

# Pagination
time curl http://localhost:3000/api/photos/site/site-123?limit=12&offset=12

# Expected: < 500ms
```

## Browser Compatibility

- [ ] Chrome/Chromium latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Edge latest
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Accessibility Testing

```bash
# Run axe accessibility scan
npx axe-core http://localhost:3000/example-photo-gallery

# Check for:
# - Alt text on images
# - Color contrast
# - Keyboard navigation
# - Screen reader compatibility
```

## Security Testing

### SQL Injection

```bash
# Try injection in caption
curl -X POST http://localhost:3000/api/photos/upload \
  -F "caption='; DROP TABLE user_photos; --"

# Expected: Safely escaped, no data loss
```

### File Upload Security

```bash
# Try uploading PHP/JS file
curl -X POST http://localhost:3000/api/photos/upload \
  -F "file=@malicious.php" \
  -F "dive_site_id=site-123"

# Expected: Rejected as invalid type
```

### RLS Bypass

```bash
# Try accessing other users' private photos
curl http://localhost:3000/api/photos/site/site-123 \
  -H "Authorization: Bearer OTHER_USER_TOKEN"

# Expected: Private photos not returned
```

## Checklist for Go/No-Go

### Frontend
- [ ] All components render without errors
- [ ] Upload form validates correctly
- [ ] Progress bar animates smoothly
- [ ] Photos display in grid
- [ ] Rating system works
- [ ] Deletion works
- [ ] Responsive on all screen sizes
- [ ] Accessibility meets WCAG AA
- [ ] No console errors

### Backend
- [ ] All API endpoints respond correctly
- [ ] File validation working
- [ ] Database records created
- [ ] RLS policies enforced
- [ ] Authentication required
- [ ] Error messages clear
- [ ] Performance acceptable
- [ ] No security vulnerabilities

### Database
- [ ] Migration applied successfully
- [ ] Indexes created
- [ ] Triggers working
- [ ] RLS policies active
- [ ] Data consistent

### DevOps
- [ ] Environment variables set
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Storage bucket configured
- [ ] Backups in place

---

**Ready to Deploy When:** All checks passed ✅
