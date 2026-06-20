# Admin Panel Setup & Implementation Guide

## Prerequisites Checklist

Before deploying the admin API, ensure the following are set up:

---

## Step 1: Create Missing Database Tables

### 1.1 Shuttles Table

```sql
CREATE TABLE shuttles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  registration VARCHAR(20) NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 100),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'available' 
    CHECK (status IN ('available', 'in-use', 'maintenance', 'archived')),
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE shuttles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_shuttles_status ON shuttles(status);
CREATE INDEX idx_shuttles_created ON shuttles(created_at DESC);
```

### 1.2 Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL 
    CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT')),
  entity_type VARCHAR(50) NOT NULL 
    CHECK (entity_type IN ('users', 'dive_sites', 'shuttles')),
  entity_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
```

---

## Step 2: Add Admin Role to Users

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' 
  CHECK (role IN ('user', 'admin', 'instructor'));

-- Update existing admin users
UPDATE users SET role = 'admin' WHERE id = 'your-admin-uuid';

-- Create helper function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
SELECT EXISTS(
  SELECT 1 FROM users WHERE id = user_id AND role = 'admin'
) AS is_admin;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Step 3: Setup Storage Bucket

In Supabase Dashboard:

1. **Storage → Create Bucket**
   - Name: `dive-drop-assets`
   - Make public: Yes

2. **CORS Configuration:**
   ```json
   [
     {
       "origin": ["http://localhost:3000", "https://yourdomain.com"],
       "methods": ["GET", "POST", "PUT", "DELETE"],
       "allowedHeaders": ["*"]
     }
   ]
   ```

---

## Step 4: Add Database Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at DESC);
CREATE INDEX idx_dive_sites_difficulty ON dive_sites(difficulty);
CREATE INDEX idx_dive_sites_created ON dive_sites(created_at DESC);
```

---

## Step 5: Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step 6: Update TypeScript Types

Update `src/types/supabase.ts` to include shuttles and audit_logs tables.

---

## Step 7: Test the API

### Get Authentication Token

1. Sign in to app
2. DevTools → Application → Cookies
3. Find `sb-[project-id]-auth-token`

### Test with cURL

```bash
TOKEN="your-token"
BASE_URL="http://localhost:3000"

# List users
curl -X GET "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $TOKEN"

# Create user
curl -X POST "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "diving_experience": "beginner"
  }'
```

---

## File Structure Summary

### Created Files

```
src/lib/admin/
├── schemas.ts           # Zod validation schemas
├── middleware.ts        # Auth, rate limiting, response helpers
├── audit.ts            # Audit logging functions
├── file-upload.ts      # File upload to Supabase Storage
└── server-actions.ts   # Server actions for CRUD

src/app/api/admin/
├── users/
│   ├── route.ts        # GET, POST, PUT (list, create, bulk import)
│   └── [id]/route.ts   # GET, PATCH, DELETE (single operations)
├── dive-sites/
│   ├── route.ts        # GET, POST, PUT (with image upload)
│   └── [id]/route.ts   # GET, PATCH, DELETE (with image handling)
└── shuttles/
    ├── route.ts        # GET, POST
    └── [id]/route.ts   # GET, PATCH, DELETE

Documentation/
├── ADMIN_API_DESIGN.md        # Complete design document
├── ADMIN_API_REFERENCE.md     # API endpoint reference
└── SETUP_GUIDE.md             # This file
```

---

## Key Features Implemented

### 1. Authentication & Authorization

- `withAdminAuth()` middleware
- Checks Supabase auth and admin role
- Returns admin context with IP, user agent for audit logging

### 2. Input Validation

- Zod schemas for all entities
- Validation in API routes
- Type-safe TypeScript support

### 3. CRUD Operations

**Server Actions (preferred for simple operations):**
- `createUser()`, `updateUser()`, `deleteUser()`, `getUsers()`
- `createDiveSite()`, `updateDiveSite()`, `deleteDiveSite()`, `getDiveSites()`
- `createShuttle()`, `updateShuttle()`, `deleteShuttle()`, `getShuttles()`

**API Routes (for complex operations):**
- Batch import (PUT /api/admin/users, PUT /api/admin/dive-sites)
- File uploads (POST/PATCH with multipart/form-data)
- Single CRUD via REST endpoints

### 4. File Upload Handling

- Upload dive site images to Supabase Storage
- Validate file type (png/jpg/webp/gif) and size (max 5MB)
- Generate unique filenames with timestamp
- Return public URLs
- Cleanup on delete

### 5. Audit Logging

- Log all admin actions
- Record: action, entity, user, changes, IP, user agent
- Support for CREATE, UPDATE, DELETE, IMPORT, EXPORT
- Queryable audit trail

### 6. Error Handling

- Standardized error responses
- HTTP status codes (400, 401, 403, 404, 500)
- Validation error messages
- Database error mapping

### 7. Pagination

- Configurable page and limit
- Total count in response
- Calculate total pages

### 8. Rate Limiting

- In-memory rate limiter (100 req/min per user)
- Redis support for production
- Rate limit headers in response

---

## API Endpoints Summary

### Users
```
GET    /api/admin/users              - List (paginated)
POST   /api/admin/users              - Create
GET    /api/admin/users/[id]         - Get single
PATCH  /api/admin/users/[id]         - Update
DELETE /api/admin/users/[id]         - Delete
PUT    /api/admin/users              - Bulk import
```

### Dive Sites
```
GET    /api/admin/dive-sites         - List (paginated)
POST   /api/admin/dive-sites         - Create with image
GET    /api/admin/dive-sites/[id]    - Get single
PATCH  /api/admin/dive-sites/[id]    - Update with image
DELETE /api/admin/dive-sites/[id]    - Delete (cleanup image)
PUT    /api/admin/dive-sites         - Bulk import
```

### Shuttles
```
GET    /api/admin/shuttles           - List
POST   /api/admin/shuttles           - Create
GET    /api/admin/shuttles/[id]      - Get single
PATCH  /api/admin/shuttles/[id]      - Update
DELETE /api/admin/shuttles/[id]      - Delete
```

---

## Usage Examples

### Create User (Server Action)
```typescript
import { createUser } from '@/lib/admin/server-actions';

const result = await createUser({
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  diving_experience: 'advanced',
});
```

### Create Dive Site with Image (API Route)
```typescript
const formData = new FormData();
formData.append('name', 'Great Reef');
formData.append('description', '...');
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/admin/dive-sites', {
  method: 'POST',
  body: formData,
});
```

### List with Pagination
```typescript
const response = await fetch('/api/admin/users?page=1&limit=20');
const { data, pagination } = await response.json();
```

---

## Security Considerations

✅ **Implemented:**
- Authentication via Supabase Auth
- Authorization check for admin role
- Input validation with Zod
- Audit logging for all actions
- Rate limiting
- File upload validation
- HTTPS recommended for production
- Secrets in environment variables

📋 **To Implement:**
- Row Level Security (RLS) policies on tables
- Redis rate limiting for production
- Error tracking (Sentry)
- IP whitelisting (optional)
- Two-factor authentication (optional)

---

## Performance Tips

1. **Database Indexes:** Already added for common queries
2. **Connection Pooling:** Enable PgBouncer in Supabase
3. **Pagination:** Always paginate list endpoints
4. **Selective Columns:** Don't fetch unnecessary columns
5. **Caching:** Use Next.js unstable_cache for static data
6. **CDN:** Configure Supabase storage for CDN

---

## Troubleshooting

### "Admin access required" Error
```sql
-- Assign admin role
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### File Upload Failed
- Check bucket exists: Storage → dive-drop-assets
- Verify bucket is public
- Check CORS configuration
- Ensure file < 5MB and correct format

### "Unauthorized" Error
- Token format: `Authorization: Bearer <token>`
- Token not expired
- User authenticated in Supabase

### Validation Errors
- Check all required fields present
- Validate email format
- Check field lengths (min/max)
- Verify enum values

---

## Next Steps

1. ✅ Setup database tables (done)
2. ✅ Create API routes (done)
3. ✅ Add validation schemas (done)
4. ✅ Implement middleware (done)
5. ⏳ **Build Admin UI Components**
   - Data table for listing
   - Forms for CRUD
   - Image uploader
   - Pagination controls
   - Search/filter
6. ⏳ **Add Advanced Features**
   - Bulk import UI
   - Export functionality
   - Audit log viewer
   - Activity dashboard
7. ⏳ **Production Setup**
   - RLS policies
   - Redis rate limiting
   - Error tracking
   - Backups
   - Monitoring

---

## Documentation Files

- **ADMIN_API_DESIGN.md** - Complete architecture & design
- **ADMIN_API_REFERENCE.md** - Detailed endpoint reference with examples
- **SETUP_GUIDE.md** - This implementation guide

---

## Quick Reference

| Concept | Location | Key File |
|---------|----------|----------|
| Validation | `src/lib/admin/` | `schemas.ts` |
| Auth Middleware | `src/lib/admin/` | `middleware.ts` |
| Audit Logging | `src/lib/admin/` | `audit.ts` |
| File Upload | `src/lib/admin/` | `file-upload.ts` |
| CRUD (Server Actions) | `src/lib/admin/` | `server-actions.ts` |
| REST API (Users) | `src/app/api/admin/users/` | `route.ts`, `[id]/route.ts` |
| REST API (Sites) | `src/app/api/admin/dive-sites/` | `route.ts`, `[id]/route.ts` |
| REST API (Shuttles) | `src/app/api/admin/shuttles/` | `route.ts`, `[id]/route.ts` |
