# Admin Panel Backend API Design

**Project**: DIVE DROP  
**Framework**: Next.js 16 (App Router)  
**Database**: Supabase PostgreSQL  
**Auth**: Supabase Auth  
**Status**: Complete Design Document

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Actions vs API Routes Strategy](#server-actions-vs-api-routes-strategy)
3. [API Endpoint Structure](#api-endpoint-structure)
4. [CRUD Operations](#crud-operations)
5. [Validation Layer](#validation-layer)
6. [Error Handling](#error-handling)
7. [Authentication & Authorization](#authentication--authorization)
8. [Audit Logging](#audit-logging)
9. [File Upload Handling](#file-upload-handling)
10. [Batch Operations](#batch-operations)
11. [Rate Limiting](#rate-limiting)
12. [Database Optimization](#database-optimization)
13. [Implementation Files](#implementation-files)

---

## Architecture Overview

The admin backend follows a **layered architecture** with separation of concerns:

```
Request
  ↓
Authentication Middleware (withAdminAuth)
  ↓
Input Validation (Zod schemas)
  ↓
Business Logic (Server Actions or API Routes)
  ↓
Database Operations (Supabase)
  ↓
Audit Logging (logAudit)
  ↓
Response Formatting (successResponse/errorResponse)
  ↓
Client
```

### Entity Model

Three main entities managed through the admin panel:

```
┌─────────────────────────────────────────────────┐
│                   USERS                         │
├─────────────────────────────────────────────────┤
│ id (UUID, PK)                                   │
│ email (VARCHAR, UNIQUE)                         │
│ first_name (VARCHAR)                            │
│ last_name (VARCHAR)                             │
│ diving_experience (ENUM)                        │
│ location (VARCHAR)                              │
│ bio (TEXT)                                      │
│ avatar_url (VARCHAR)                            │
│ is_active (BOOLEAN)                             │
│ created_at (TIMESTAMP)                          │
│ updated_at (TIMESTAMP)                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 DIVE_SITES                      │
├─────────────────────────────────────────────────┤
│ id (UUID, PK)                                   │
│ name (VARCHAR)                                  │
│ description (TEXT)                              │
│ location (VARCHAR)                              │
│ latitude (NUMERIC)                              │
│ longitude (NUMERIC)                             │
│ depth (NUMERIC)                                 │
│ difficulty (ENUM: easy|intermediate|hard)      │
│ image_url (VARCHAR)                             │
│ created_at (TIMESTAMP)                          │
│ updated_at (TIMESTAMP)                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 SHUTTLES                        │
├─────────────────────────────────────────────────┤
│ id (UUID, PK)                                   │
│ name (VARCHAR)                                  │
│ registration (VARCHAR)                          │
│ capacity (INTEGER)                              │
│ location (VARCHAR)                              │
│ status (ENUM)                                   │
│ contact_person (VARCHAR)                        │
│ phone (VARCHAR)                                 │
│ created_at (TIMESTAMP)                          │
│ updated_at (TIMESTAMP)                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              AUDIT_LOGS                         │
├─────────────────────────────────────────────────┤
│ id (UUID, PK)                                   │
│ action (ENUM: CREATE|READ|UPDATE|DELETE)       │
│ entity_type (VARCHAR)                           │
│ entity_id (UUID)                                │
│ user_id (UUID, FK)                              │
│ changes (JSONB)                                 │
│ ip_address (INET)                               │
│ user_agent (TEXT)                               │
│ created_at (TIMESTAMP)                          │
└─────────────────────────────────────────────────┘
```

---

## Server Actions vs API Routes Strategy

### Server Actions (Preferred for Simple CRUD)

**Use Server Actions for:**
- Single entity operations (create, update, delete)
- Operations called from client components
- Forms with built-in CSRF protection
- Direct database access without serialization
- Simpler error handling

**Advantages:**
- No JSON serialization overhead
- Built-in CSRF protection
- Direct server function calls from client
- Simpler authentication handling

**Location**: `src/lib/admin/server-actions.ts`

**Example:**
```typescript
export async function createUser(input: CreateUserInput) {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error('Unauthorized');
  
  const { data, error } = await supabase
    .from('users')
    .insert([input])
    .select()
    .single();
  
  await logCreate('users', data.id, currentUser.id, input);
  return { success: true, data };
}
```

### API Routes (Preferred for Complex/Batch Operations)

**Use API Routes for:**
- Batch operations (import/export)
- File uploads (multipart/form-data)
- Webhooks and external integrations
- Mobile client support
- Complex query parameters
- Rate limiting requirements

**Advantages:**
- Handles multipart/form-data
- Standard HTTP methods
- Explicit request/response handling
- Easier to rate limit

**Locations:**
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/dive-sites/route.ts`
- `src/app/api/admin/dive-sites/[id]/route.ts`
- `src/app/api/admin/shuttles/route.ts`
- `src/app/api/admin/shuttles/[id]/route.ts`

---

## API Endpoint Structure

### RESTful Endpoints

```
# USERS
GET    /api/admin/users                  - List users (paginated)
POST   /api/admin/users                  - Create user
GET    /api/admin/users/[id]             - Get single user
PATCH  /api/admin/users/[id]             - Update user
DELETE /api/admin/users/[id]             - Delete user
PUT    /api/admin/users                  - Bulk import users

# DIVE SITES
GET    /api/admin/dive-sites             - List sites (paginated)
POST   /api/admin/dive-sites             - Create site (with image upload)
GET    /api/admin/dive-sites/[id]        - Get single site
PATCH  /api/admin/dive-sites/[id]        - Update site (with image upload)
DELETE /api/admin/dive-sites/[id]        - Delete site
PUT    /api/admin/dive-sites             - Bulk import sites

# SHUTTLES
GET    /api/admin/shuttles               - List shuttles
POST   /api/admin/shuttles               - Create shuttle
GET    /api/admin/shuttles/[id]          - Get single shuttle
PATCH  /api/admin/shuttles/[id]          - Update shuttle
DELETE /api/admin/shuttles/[id]          - Delete shuttle

# EXPORT/IMPORT
POST   /api/admin/export/users           - Export users (JSON/CSV)
POST   /api/admin/export/dive-sites      - Export dive sites
POST   /api/admin/export/shuttles        - Export shuttles
```

### Query Parameters

**Pagination (all list endpoints):**
```
GET /api/admin/users?page=1&limit=20
```

**Sorting (optional):**
```
GET /api/admin/users?page=1&limit=20&sortBy=created_at&sortOrder=desc
```

**Filtering (custom per resource):**
```
GET /api/admin/users?experience=advanced&active=true
```

---

## CRUD Operations

### Users

#### Create User
```typescript
POST /api/admin/users
Content-Type: application/json

{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "diving_experience": "advanced",
  "location": "Hawaii",
  "bio": "Experienced diver",
  "is_active": true
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "diving_experience": "advanced",
    "location": "Hawaii",
    "bio": "Experienced diver",
    "avatar_url": null,
    "is_active": true,
    "created_at": "2026-06-20T10:00:00Z",
    "updated_at": "2026-06-20T10:00:00Z"
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

#### Update User
```typescript
PATCH /api/admin/users/[id]
Content-Type: application/json

{
  "bio": "Updated bio",
  "location": "California"
}

Response:
{
  "success": true,
  "data": { /* updated user */ },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

#### Delete User
```typescript
DELETE /api/admin/users/[id]

Response:
{
  "success": true,
  "data": { "deleted": true },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

#### List Users
```typescript
GET /api/admin/users?page=1&limit=20

Response:
{
  "success": true,
  "data": [ /* array of users */ ],
  "timestamp": "2026-06-20T10:00:00Z",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Dive Sites

#### Create Dive Site with Image
```typescript
POST /api/admin/dive-sites
Content-Type: multipart/form-data

FormData:
  - name: "Great Barrier Reef"
  - description: "Beautiful coral reef dive site..."
  - location: "Australia"
  - latitude: -18.2871
  - longitude: 147.6992
  - depth: 25
  - difficulty: "intermediate"
  - image: <File>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Great Barrier Reef",
    "image_url": "https://storage.example.com/dive-sites/timestamp-random.jpg",
    // ... other fields
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

#### Update Dive Site
```typescript
PATCH /api/admin/dive-sites/[id]
Content-Type: multipart/form-data or application/json

// With image
FormData:
  - name: "Updated Name"
  - image: <File>

// Without image
{
  "depth": 30,
  "difficulty": "hard"
}

Response: Updated site object
```

---

## Validation Layer

### Zod Schemas

All inputs validated using Zod schemas in `src/lib/admin/schemas.ts`:

```typescript
// User Schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  diving_experience: z.enum(['beginner', 'intermediate', 'advanced', 'instructor']),
  location: z.string().max(255).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial();

// Dive Site Schemas
export const createDiveSiteSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().min(10).max(2000),
  location: z.string().min(3).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  depth: z.number().min(0).max(500),
  difficulty: z.enum(['easy', 'intermediate', 'hard']),
  image_url: z.string().url().optional().nullable(),
});

export const updateDiveSiteSchema = createDiveSiteSchema.partial();

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### Validation in API Routes

```typescript
const validation = createUserSchema.safeParse(body);

if (!validation.success) {
  return errorResponse(
    `Validation error: ${validation.error.errors[0].message}`,
    400
  );
}

// Use validated data
const { data, error } = await supabase
  .from('users')
  .insert([validation.data])
  .select()
  .single();
```

---

## Error Handling

### Standard Error Response

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// 400 Bad Request - Validation
{
  "success": false,
  "error": "Validation error: Invalid email address",
  "timestamp": "2026-06-20T10:00:00Z"
}

// 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized: Missing or invalid authentication",
  "timestamp": "2026-06-20T10:00:00Z"
}

// 403 Forbidden
{
  "success": false,
  "error": "Forbidden: Admin access required",
  "timestamp": "2026-06-20T10:00:00Z"
}

// 404 Not Found
{
  "success": false,
  "error": "User not found",
  "timestamp": "2026-06-20T10:00:00Z"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Internal server error",
  "timestamp": "2026-06-20T10:00:00Z"
}
```

### Error Handling Pattern

```typescript
try {
  // Operation
  const { data, error } = await supabase.from('users').select('*');
  
  if (error) throw error;
  
  return NextResponse.json(successResponse(data));
} catch (error: any) {
  console.error('Operation error:', error);
  
  // Map database errors to HTTP status codes
  if (error.code === 'PGRST116') {
    return errorResponse('Entity not found', 404);
  }
  
  if (error.code === '23505') { // Unique violation
    return errorResponse('Resource already exists', 409);
  }
  
  return errorResponse(error.message || 'Internal server error', 500);
}
```

---

## Authentication & Authorization

### Middleware: `withAdminAuth`

```typescript
export async function withAdminAuth(
  request: NextRequest
): Promise<{ data: AdminContext; error: NextResponse | null }> {
  // 1. Get current user from Supabase
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // 2. Verify authentication (401)
  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }
  
  // 3. Verify admin role (403)
  // TODO: Add role field to users table and query it
  // const isAdmin = user.role === 'admin';
  const isAdmin = true; // Placeholder
  
  if (!isAdmin) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      ),
    };
  }
  
  // 4. Return context for audit logging
  return {
    data: {
      userId: user.id,
      email: user.email,
      isAdmin: true,
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    },
    error: null,
  };
}
```

### Usage in API Routes

```typescript
export async function POST(request: NextRequest) {
  // Apply middleware
  const { data: context, error: authError } = await withAdminAuth(request);
  if (authError) return authError;
  
  // Now context contains userId, email, ip, etc.
  try {
    // ... handle request
    await logCreate('users', userId, context.userId, data);
  } catch (error) {
    // ...
  }
}
```

### Required Database Schema Update

Add admin role to users table:

```sql
ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user';
ALTER TABLE users ADD CHECK (role IN ('user', 'admin', 'instructor'));

-- Update authentication check
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
SELECT EXISTS(
  SELECT 1 FROM users WHERE id = user_id AND role = 'admin'
) AS is_admin;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Audit Logging

### Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT')),
  entity_type VARCHAR CHECK (entity_type IN ('users', 'dive_sites', 'shuttles')),
  entity_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### Audit Log Functions

```typescript
// Create
await logCreate('users', userId, adminId, { ...newData });

// Update
await logUpdate('users', userId, adminId, { field: 'oldValue→newValue' });

// Delete
await logDelete('users', userId, adminId);

// Batch import
await logImport('users', adminId, { count: 50 });

// Export
await logExport('users', adminId, { format: 'json', count: 150 });
```

### Audit Trail Usage

Track all admin actions for:
- **Compliance**: GDPR, data retention policies
- **Security**: Detect unauthorized access
- **Debugging**: Understand data changes
- **Analytics**: Usage patterns

---

## File Upload Handling

### Setup: Supabase Storage

1. Create bucket in Supabase:
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('dive-drop-assets', 'dive-drop-assets', true);
   ```

2. Set CORS policy:
   ```json
   [
     {
       "origin": ["https://yourdomain.com"],
       "methods": ["GET", "POST", "PUT", "DELETE"],
       "allowedHeaders": ["*"]
     }
   ]
   ```

### Upload Implementation

```typescript
// File upload endpoint
POST /api/admin/dive-sites
Content-Type: multipart/form-data

FormData:
  - name: "Site Name"
  - description: "..."
  - image: <File (max 5MB, png/jpg/webp)>

// Handler
if (contentType.includes('multipart/form-data')) {
  const formData = await request.formData();
  const image = formData.get('image') as Blob;
  
  const uploadResult = await uploadDiveSiteImage(image, image.name);
  // uploadResult = { url: "https://...", filename: "...", size: ... }
}
```

### Image Optimization

```typescript
// In production, add:
- Image resizing (sharp library)
- Format conversion (WebP)
- CDN caching headers
- Thumbnail generation

Example:
const optimized = await sharp(buffer)
  .resize(800, 600, { fit: 'cover' })
  .webp({ quality: 80 })
  .toBuffer();
```

---

## Batch Operations

### Bulk Import Users

```typescript
PUT /api/admin/users
Content-Type: application/json

{
  "users": [
    {
      "email": "user1@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "diving_experience": "advanced"
    },
    {
      "email": "user2@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "diving_experience": "beginner"
    }
  ],
  "skipDuplicates": true
}

Response:
{
  "success": true,
  "data": {
    "imported": 2,
    "total": 2
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

### Bulk Import Implementation

```typescript
export async function PUT(request: NextRequest) {
  // 1. Validate
  const { users } = await request.json();
  const validations = users.map(u => createUserSchema.safeParse(u));
  
  // 2. Filter invalid records
  const validUsers = validations
    .map((v, i) => (v.success ? v.data : null))
    .filter(Boolean);
  
  // 3. Insert batch
  const { data } = await supabase
    .from('users')
    .insert(validUsers)
    .select();
  
  // 4. Log import
  await logImport('users', context.userId, { count: data?.length });
  
  return NextResponse.json(
    successResponse({ imported: data?.length, total: users.length })
  );
}
```

### Export Users (JSON/CSV)

```typescript
GET /api/admin/users/export?format=csv

Response:
CSV formatted data:
id,email,first_name,last_name,diving_experience,location,created_at
uuid,user@example.com,John,Doe,advanced,Hawaii,2026-06-20...
```

---

## Rate Limiting

### In-Memory Rate Limiter

```typescript
// Implement basic rate limiting for admin endpoints
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(maxRequests: number = 100, windowSeconds: number = 60) {
  return (key: string): { allowed: boolean; remaining: number } => {
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
  };
}
```

### Usage in Routes

```typescript
// Limit to 100 requests per minute per user
const rateLimitCheck = withRateLimit(100, 60);
const { allowed, remaining } = rateLimitCheck(context.userId);

if (!allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: { 'Retry-After': '60' } }
  );
}
```

### Production: Redis-based Rate Limiting

For production, use Redis:
```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

const { success } = await ratelimit.limit(context.userId);
if (!success) return errorResponse('Rate limited', 429);
```

---

## Database Optimization

### Indexes

Add these indexes for optimal query performance:

```sql
-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_experience ON users(diving_experience);
CREATE INDEX idx_users_created ON users(created_at DESC);
CREATE INDEX idx_users_active ON users(is_active);

-- Dive sites indexes
CREATE INDEX idx_dive_sites_difficulty ON dive_sites(difficulty);
CREATE INDEX idx_dive_sites_location ON dive_sites(location);
CREATE INDEX idx_dive_sites_created ON dive_sites(created_at DESC);
CREATE INDEX idx_dive_sites_geo ON dive_sites USING GIST (
  ll_to_earth(latitude, longitude)
); -- For geo-queries

-- Shuttles indexes
CREATE INDEX idx_shuttles_status ON shuttles(status);
CREATE INDEX idx_shuttles_created ON shuttles(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

### Query Optimization Tips

1. **Always paginate**: Use LIMIT/OFFSET for list queries
   ```typescript
   const offset = (page - 1) * limit;
   .range(offset, offset + limit - 1)
   ```

2. **Use selective columns**: Don't fetch all columns if not needed
   ```typescript
   .select('id, email, first_name, last_name') // Not SELECT *
   ```

3. **Index frequently filtered columns**: Experience, difficulty, status

4. **Use count with head: true** for total counts:
   ```typescript
   const { count } = await supabase
     .from('users')
     .select('*', { count: 'exact', head: true });
   ```

5. **Batch operations**: Insert multiple rows at once
   ```typescript
   await supabase.from('users').insert([...users]);
   ```

6. **Connection pooling**: Use Supabase connection pooling (PgBouncer)

---

## Implementation Files

### Created Files

1. **`src/lib/admin/schemas.ts`**
   - Zod validation schemas for all entities
   - Pagination, CRUD input, export/import schemas
   - Type exports for TypeScript

2. **`src/lib/admin/middleware.ts`**
   - `withAdminAuth()` - Authentication guard
   - `withRateLimit()` - Rate limiting
   - Response helpers: `successResponse()`, `errorResponse()`

3. **`src/lib/admin/audit.ts`**
   - `logAudit()` - Core audit function
   - Specialized loggers: `logCreate()`, `logUpdate()`, `logDelete()`, etc.
   - Append-only audit trail implementation

4. **`src/lib/admin/file-upload.ts`**
   - `uploadDiveSiteImage()` - File upload to storage
   - `uploadUserAvatar()` - Avatar uploads
   - `deleteFile()` - Cleanup
   - Validation, size limits, MIME type checking

5. **`src/lib/admin/server-actions.ts`**
   - All CRUD server actions (createUser, updateUser, etc.)
   - Each action includes auth check and audit logging
   - Utility: `convertToCSV()` for export

6. **`src/app/api/admin/users/route.ts`**
   - GET: List users (paginated)
   - POST: Create user
   - PUT: Bulk import users

7. **`src/app/api/admin/users/[id]/route.ts`**
   - GET: Get single user
   - PATCH: Update user
   - DELETE: Delete user

8. **`src/app/api/admin/dive-sites/route.ts`**
   - GET: List dive sites
   - POST: Create site with image upload
   - PUT: Bulk import sites

9. **`src/app/api/admin/dive-sites/[id]/route.ts`**
   - GET: Get single site
   - PATCH: Update site with image upload
   - DELETE: Delete site (with image cleanup)

### To Be Created

10. **`src/app/api/admin/shuttles/route.ts`** - Shuttles list/create/import
11. **`src/app/api/admin/shuttles/[id]/route.ts`** - Shuttles single operations
12. **`src/app/api/admin/export/[entity]/route.ts`** - Export endpoints
13. **`src/app/api/admin/audit-logs/route.ts`** - Audit log viewer

---

## Usage Examples

### Create User (Server Action)

```typescript
import { createUser } from '@/lib/admin/server-actions';

// In server component or form action
const result = await createUser({
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  diving_experience: 'advanced',
});

if (result.success) {
  console.log('User created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Create Dive Site with Image (API Route)

```typescript
const formData = new FormData();
formData.append('name', 'Great Reef');
formData.append('description', '...');
formData.append('latitude', '-18.2871');
formData.append('longitude', '147.6992');
formData.append('depth', '25');
formData.append('difficulty', 'intermediate');
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/admin/dive-sites', {
  method: 'POST',
  body: formData,
});

const { data } = await response.json();
console.log('Site created with image:', data.image_url);
```

### List Users with Pagination

```typescript
const response = await fetch(
  '/api/admin/users?page=1&limit=20'
);

const { data, pagination } = await response.json();
console.log(`Page ${pagination.page} of ${pagination.totalPages}`);
data.forEach(user => console.log(user.email));
```

### Bulk Import Users

```typescript
const response = await fetch('/api/admin/users', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    users: [
      { email: 'user1@example.com', first_name: 'John', ... },
      { email: 'user2@example.com', first_name: 'Jane', ... },
    ],
  }),
});

const { data } = await response.json();
console.log(`Imported ${data.imported} out of ${data.total} users`);
```

---

## Security Considerations

1. **Authentication**: All endpoints require valid Supabase auth token
2. **Authorization**: Check admin role before processing
3. **Input Validation**: Zod schemas validate all inputs
4. **Rate Limiting**: Prevent abuse with rate limiting
5. **Audit Logging**: All actions logged with IP and user agent
6. **CSRF Protection**: Server Actions have built-in CSRF protection
7. **File Upload**: Validate file type, size, and scan for malware
8. **SQL Injection**: Supabase ORM prevents SQL injection
9. **XSS Prevention**: Next.js handles HTML encoding
10. **Secrets**: Use environment variables for API keys

---

## Next Steps

1. **Add role field** to users table schema
2. **Create audit_logs table** in Supabase
3. **Create shuttles table** if not exists
4. **Setup storage bucket** 'dive-drop-assets' in Supabase
5. **Add indexes** to database as listed above
6. **Create admin UI components** that call these endpoints
7. **Implement export endpoints** for CSV/JSON download
8. **Add Redis rate limiting** for production
9. **Setup webhook logging** (optional)
10. **Write integration tests** for admin endpoints
