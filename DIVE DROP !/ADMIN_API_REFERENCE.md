# Admin API Reference

## Quick Start

### Authentication
All endpoints require a valid Supabase authentication token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

### Base URL
```
/api/admin
```

### Response Format
All responses follow this format:
```json
{
  "success": true|false,
  "data": {...},
  "error": "error message if success=false",
  "timestamp": "2026-06-20T10:00:00Z",
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

---

## Users

### List Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 20 | Items per page (1-100) |
| sortBy | string | created_at | Sort field |
| sortOrder | string | asc | Sort order (asc/desc) |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer token"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
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
    }
  ],
  "timestamp": "2026-06-20T10:00:00Z",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### Get Single User

**Endpoint:** `GET /api/admin/users/[id]`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | User ID |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer token"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
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

---

### Create User

**Endpoint:** `POST /api/admin/users`

**Request Body:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|-----------|
| email | string | Yes | User email | Must be valid email, max 255 chars |
| first_name | string | Yes | First name | Min 2, max 100 chars |
| last_name | string | Yes | Last name | Min 2, max 100 chars |
| diving_experience | enum | Yes | Experience level | beginner, intermediate, advanced, instructor |
| location | string | No | Location | Max 255 chars |
| bio | string | No | Bio | Max 500 chars |
| avatar_url | string | No | Avatar URL | Must be valid URL |
| is_active | boolean | No | Active status | Default: true |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "diving_experience": "intermediate",
    "location": "California",
    "bio": "New diver",
    "is_active": true
  }'
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "diving_experience": "intermediate",
    "location": "California",
    "bio": "New diver",
    "avatar_url": null,
    "is_active": true,
    "created_at": "2026-06-20T10:00:00Z",
    "updated_at": "2026-06-20T10:00:00Z"
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

---

### Update User

**Endpoint:** `PATCH /api/admin/users/[id]`

**Request Body:** (All fields optional)
```json
{
  "first_name": "Jane",
  "bio": "Updated bio",
  "location": "Florida"
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio text",
    "location": "Florida"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "diving_experience": "intermediate",
    "location": "Florida",
    "bio": "Updated bio text",
    "avatar_url": null,
    "is_active": true,
    "created_at": "2026-06-20T10:00:00Z",
    "updated_at": "2026-06-20T10:00:00Z"
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

---

### Delete User

**Endpoint:** `DELETE /api/admin/users/[id]`

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer token"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

---

### Bulk Import Users

**Endpoint:** `PUT /api/admin/users`

**Request Body:**
```json
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
```

**Constraints:**
- Maximum 1000 users per import
- Each user must pass validation

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "email": "bulk1@example.com",
        "first_name": "Bulk",
        "last_name": "User1",
        "diving_experience": "beginner"
      },
      {
        "email": "bulk2@example.com",
        "first_name": "Bulk",
        "last_name": "User2",
        "diving_experience": "advanced"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 2,
    "total": 2
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

---

## Dive Sites

### List Dive Sites

**Endpoint:** `GET /api/admin/dive-sites`

**Query Parameters:** (Same as users)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/dive-sites?page=1&limit=20" \
  -H "Authorization: Bearer token"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Great Barrier Reef",
      "description": "The world's largest coral reef system",
      "location": "Australia",
      "latitude": -18.2871,
      "longitude": 147.6992,
      "depth": 25,
      "difficulty": "intermediate",
      "image_url": "https://storage.example.com/dive-sites/image.jpg",
      "created_at": "2026-06-20T10:00:00Z",
      "updated_at": "2026-06-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

---

### Get Single Dive Site

**Endpoint:** `GET /api/admin/dive-sites/[id]`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/dive-sites/550e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer token"
```

---

### Create Dive Site

**Endpoint:** `POST /api/admin/dive-sites`

**Request:**
- **Content-Type:** `multipart/form-data` (if uploading image) or `application/json`

**Form Fields/JSON Fields:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|-----------|
| name | string | Yes | Site name | Min 3, max 255 chars |
| description | string | Yes | Description | Min 10, max 2000 chars |
| location | string | Yes | Location | Min 3, max 255 chars |
| latitude | number | Yes | Latitude | -90 to 90 |
| longitude | number | Yes | Longitude | -180 to 180 |
| depth | number | Yes | Depth (meters) | 0 to 500 |
| difficulty | enum | Yes | Difficulty | easy, intermediate, hard |
| image | file | No | Site image | PNG, JPG, WebP, GIF, max 5MB |

**Example Request (with image):**
```bash
curl -X POST "http://localhost:3000/api/admin/dive-sites" \
  -H "Authorization: Bearer token" \
  -F "name=Blue Hole" \
  -F "description=A spectacular diving destination with marine life" \
  -F "location=Belize" \
  -F "latitude=17.3167" \
  -F "longitude=-88.1667" \
  -F "depth=30" \
  -F "difficulty=hard" \
  -F "image=@/path/to/image.jpg"
```

**Example Request (JSON only):**
```bash
curl -X POST "http://localhost:3000/api/admin/dive-sites" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blue Hole",
    "description": "A spectacular diving destination with marine life",
    "location": "Belize",
    "latitude": 17.3167,
    "longitude": -88.1667,
    "depth": 30,
    "difficulty": "hard"
  }'
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Blue Hole",
    "description": "A spectacular diving destination with marine life",
    "location": "Belize",
    "latitude": 17.3167,
    "longitude": -88.1667,
    "depth": 30,
    "difficulty": "hard",
    "image_url": "https://storage.example.com/dive-sites/1719000000-abc123.jpg",
    "created_at": "2026-06-20T10:00:00Z",
    "updated_at": "2026-06-20T10:00:00Z"
  },
  "timestamp": "2026-06-20T10:00:00Z"
}
```

---

### Update Dive Site

**Endpoint:** `PATCH /api/admin/dive-sites/[id]`

**Request:** (All fields optional)
- Can be JSON or multipart/form-data
- If multipart, new image replaces old image

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/admin/dive-sites/550e8400-e29b-41d4-a716-446655440003" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "depth": 35,
    "difficulty": "intermediate"
  }'
```

---

### Delete Dive Site

**Endpoint:** `DELETE /api/admin/dive-sites/[id]`

**Note:** Associated image is automatically deleted from storage

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/admin/dive-sites/550e8400-e29b-41d4-a716-446655440003" \
  -H "Authorization: Bearer token"
```

---

### Bulk Import Dive Sites

**Endpoint:** `PUT /api/admin/dive-sites`

**Request Body:**
```json
{
  "sites": [
    {
      "name": "Site 1",
      "description": "Description 1",
      "location": "Location 1",
      "latitude": 0,
      "longitude": 0,
      "depth": 20,
      "difficulty": "easy"
    }
  ]
}
```

**Constraints:**
- Maximum 500 sites per import

---

## Shuttles

### List Shuttles

**Endpoint:** `GET /api/admin/shuttles`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/shuttles?page=1&limit=20" \
  -H "Authorization: Bearer token"
```

---

### Get Single Shuttle

**Endpoint:** `GET /api/admin/shuttles/[id]`

---

### Create Shuttle

**Endpoint:** `POST /api/admin/shuttles`

**Request Body:**
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|-----------|
| name | string | Yes | Shuttle name | Min 3, max 255 chars |
| registration | string | Yes | Registration plate | Min 1, max 20 chars |
| capacity | number | Yes | Passenger capacity | 1-100 |
| location | string | No | Current location | Max 255 chars |
| status | enum | No | Status | available, in-use, maintenance, archived |
| contact_person | string | No | Contact name | Max 255 chars |
| phone | string | No | Phone number | Valid format |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/shuttles" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dive Master One",
    "registration": "DMO-001",
    "capacity": 15,
    "location": "Honolulu",
    "status": "available",
    "contact_person": "John Smith",
    "phone": "+1-808-555-0100"
  }'
```

---

### Update Shuttle

**Endpoint:** `PATCH /api/admin/shuttles/[id]`

---

### Delete Shuttle

**Endpoint:** `DELETE /api/admin/shuttles/[id]`

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation error: Invalid email address",
  "timestamp": "2026-06-20T10:00:00Z"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Unauthorized: Missing or invalid authentication",
  "timestamp": "2026-06-20T10:00:00Z"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "error": "Forbidden: Admin access required",
  "timestamp": "2026-06-20T10:00:00Z"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "User not found",
  "timestamp": "2026-06-20T10:00:00Z"
}
```

### Rate Limited (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "timestamp": "2026-06-20T10:00:00Z"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "timestamp": "2026-06-20T10:00:00Z"
}
```

---

## Client Examples

### JavaScript/TypeScript

**Create User:**
```typescript
const response = await fetch('/api/admin/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe',
    diving_experience: 'advanced',
  }),
});

const { success, data, error } = await response.json();
if (success) {
  console.log('User created:', data);
} else {
  console.error('Error:', error);
}
```

**Upload Dive Site with Image:**
```typescript
const formData = new FormData();
formData.append('name', 'Great Reef');
formData.append('description', '...');
formData.append('location', 'Hawaii');
formData.append('latitude', '-18.2871');
formData.append('longitude', '147.6992');
formData.append('depth', '25');
formData.append('difficulty', 'intermediate');
formData.append('image', imageFile);

const response = await fetch('/api/admin/dive-sites', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const { data } = await response.json();
console.log('Image uploaded:', data.image_url);
```

**List with Pagination:**
```typescript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
});

const response = await fetch(`/api/admin/users?${params}`, {
  headers: { 'Authorization': `Bearer ${token}` },
});

const { data, pagination } = await response.json();
console.log(`Page ${pagination.page} of ${pagination.totalPages}`);
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
}

# Create user
response = requests.post(
    'http://localhost:3000/api/admin/users',
    json={
        'email': 'user@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'diving_experience': 'advanced',
    },
    headers=headers,
)

print(response.json())
```

---

## Postman Collection

Import this into Postman for easy API testing:

```json
{
  "info": {
    "name": "DIVE DROP Admin API",
    "version": "1.0.0"
  },
  "baseUrl": "{{baseUrl}}/api/admin",
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{token}}"
      }
    ]
  },
  "item": [
    {
      "name": "Users",
      "item": [
        {
          "name": "List Users",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/admin/users?page=1&limit=20"
          }
        },
        {
          "name": "Create User",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": "{{baseUrl}}/api/admin/users",
            "body": {
              "raw": "{\"email\": \"user@example.com\", \"first_name\": \"John\", \"last_name\": \"Doe\", \"diving_experience\": \"advanced\"}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## Rate Limiting

- **Default:** 100 requests per minute per user
- **Returns:** 429 Too Many Requests
- **Retry-After:** Included in response headers

For production deployment, configure Redis-based rate limiting for better performance.

---

## Audit Logging

All API requests are logged with:
- Action (CREATE, READ, UPDATE, DELETE, EXPORT, IMPORT)
- Entity type and ID
- Admin user ID
- Request IP address
- User agent
- Timestamp

Access audit logs via the admin panel or query `audit_logs` table directly.
