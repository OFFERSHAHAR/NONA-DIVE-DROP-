# DIVE DROP Architecture & Design Decisions

**Document:** Technical Architecture  
**Version:** 1.0  
**Last Updated:** June 20, 2026  
**Status:** Production-Ready

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Decisions](#technology-decisions)
3. [Security Architecture](#security-architecture)
4. [Data Architecture](#data-architecture)
5. [API Design](#api-design)
6. [Frontend Architecture](#frontend-architecture)
7. [Performance & Scalability](#performance--scalability)
8. [Disaster Recovery](#disaster-recovery)

---

## System Architecture

### High-Level Overview

```
Internet → Vercel Edge Network → Next.js Server → Supabase
     ↓            ↓                    ↓              ↓
  Clients    CDN/Cache          Auth/Business    Database
             Security            Logic            RLS
             Headers
```

### Component Breakdown

#### 1. Client Layer (React Components)

**Purpose:** User interface and client-side state management

**Technology:**
- React 19.2.4 - UI framework
- Next.js 16.2.9 - Framework with SSR
- TailwindCSS 4 - Styling
- Zustand - State management

**Key Patterns:**
- Server Components for static content
- Client Components for interactivity
- Server Actions for mutations
- Form validation with Zod

**Communication:**
- REST via fetch (API routes)
- Server Actions (tRPC-like)
- Real-time via Supabase subscriptions

#### 2. Server Layer (Next.js)

**Purpose:** Business logic, authorization, data orchestration

**Technology:**
- Next.js App Router
- Server Actions
- API Routes
- Middleware

**Responsibilities:**
- Authentication check
- Authorization (permissions matrix)
- Data validation
- Database queries
- Error handling

**Security Checks:**
```
Request → Rate Limit → CORS Check → Auth Check → Authorization → Database RLS
```

#### 3. Database Layer (Supabase/PostgreSQL)

**Purpose:** Persistent data storage with security

**Technology:**
- PostgreSQL (Supabase)
- Row-Level Security (RLS)
- Real-time subscriptions
- Full-text search

**Access Control:**
- RLS policies enforce authorization
- Automatic field filtering
- Cross-user isolation

**Tables:**
```
Core: users, listings, interests
Privacy: contact_reveals, blocks
Moderation: reports, audit_log
Content: feedback, photos
Payments: orders, commissions
```

---

## Technology Decisions

### Why Next.js 16?

**Decision:** Use Next.js 16 with App Router and Server Components

**Rationale:**
- ✅ Integrated auth & middleware
- ✅ Server Components reduce JS bundle
- ✅ Server Actions simplify client-server communication
- ✅ Built-in API routes for backend logic
- ✅ Vercel deployment with zero config
- ✅ Streaming support for large responses

**Trade-offs:**
- Learning curve for Server Components model
- Some React patterns don't work server-side (hooks, localStorage)
- Requires careful boundary between server/client code

**Alternative Considered:** SvelteKit, Remix
**Why Chosen:** Next.js ecosystem is most mature for this scale

---

### Why Supabase?

**Decision:** Use Supabase (PostgreSQL) as primary database

**Rationale:**
- ✅ Row-Level Security (RLS) perfect for multi-tenant access control
- ✅ Built-in Auth system (Supabase Auth)
- ✅ Real-time subscriptions for notifications
- ✅ PostgreSQL ecosystem (PostGIS, JSON, full-text search)
- ✅ Easy to self-host or use cloud
- ✅ Excellent admin dashboard
- ✅ Affordable pricing at scale

**Trade-offs:**
- RLS policies add complexity
- Difficult to migrate away from Supabase Auth
- Rate limiting must be client-side (need Redis for production)

**Alternative Considered:** Firebase, PlanetScale, Neon
**Why Chosen:** RLS is essential for security model

---

### Why Custom Auth System?

**Decision:** Build custom auth on top of Supabase Auth + JWT

**Rationale:**
- ✅ Fine-grained permission control
- ✅ Role-based access control (RBAC)
- ✅ Audit logging of all sensitive actions
- ✅ Can switch identity provider later
- ✅ Better control over token lifecycle

**Trade-offs:**
- More code to maintain
- Requires understanding JWT, cookies, token rotation
- Must implement own session management

**Architecture:**
```
Supabase Auth (identity) → JWT → Session (Redis) → Permissions → Resources
                           ↓
                        Cookies (HttpOnly)
```

**Token Strategy:**
- Access Token: 1 hour (short-lived)
- Refresh Token: 7 days (long-lived)
- Token Family: Detects reuse attacks
- Revocation List: Immediate logout

---

### Why TypeScript Everywhere?

**Decision:** Enforce TypeScript for entire codebase

**Rationale:**
- ✅ Prevents runtime errors
- ✅ Better IDE support & refactoring
- ✅ Self-documenting code
- ✅ Easier team onboarding
- ✅ Required for complex permission logic

**Type Safety:**
```typescript
// Permission types
type UserRole = 'anonymous' | 'registered' | 'admin';
type ResourceAction = 'VIEW_LISTING' | 'CREATE_LISTING' | 'DELETE_LISTING';

// Auth context
type AuthContext = {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  permissions: ResourceAction[];
};

// Server action signature
export async function createListing(
  data: CreateListingInput
): Promise<Result<Listing, CreateListingError>>;
```

---

### Why Zod for Validation?

**Decision:** Use Zod for runtime schema validation

**Rationale:**
- ✅ Works in server + client code
- ✅ Type inference from schemas
- ✅ Excellent error messages
- ✅ Composable validation rules
- ✅ Async validation support

**Pattern:**
```typescript
// Define schema once
const createListingSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20),
  divingLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  diveDate: z.string().datetime(),
  location: z.string().min(3),
});

type CreateListingInput = z.infer<typeof createListingSchema>;

// Use everywhere
const parsed = createListingSchema.parse(data); // Server action
const parsed = createListingSchema.safeParse(data); // Client form
```

---

### Why Zustand for State?

**Decision:** Use Zustand for client-side state

**Rationale:**
- ✅ Minimal boilerplate (vs Redux)
- ✅ Works with TypeScript
- ✅ No provider hell
- ✅ Easy testing
- ✅ Perfect for auth state

**Usage:**
```typescript
// Store definition
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  login: async (email, password) => { /* ... */ },
  logout: () => set({ user: null }),
}));

// Usage in components
export function Profile() {
  const { user, logout } = useAuthStore();
  return <button onClick={logout}>Logout {user?.email}</button>;
}
```

---

## Security Architecture

### Three-Layer Defense

#### Layer 1: Application Layer (TypeScript)

**Components:**
- Permission matrix (`permissions.ts`)
- Auth context (`auth-middleware.ts`)
- Authorization checks
- Input validation (`input-validation.ts`)

**Enforcement:**
```typescript
// Every protected action follows this pattern:
'use server';
import { getAuthContext, authorize, requireAuth } from '@/lib/security/auth-middleware';

export async function deleteListingAction(listingId: string) {
  const context = await getAuthContext();
  authorize(context, ResourceAction.DELETE_LISTING); // throws if not allowed
  const user = requireAuth(context);
  // Now we know user is authenticated and has permission
  // Proceed with business logic
}
```

#### Layer 2: Server Layer (HTTP)

**Components:**
- Rate limiting
- CORS validation
- Security headers
- Session management
- CSRF protection

**Flow:**
```
Request
  ↓
Rate Limiter (block repeated requests)
  ↓
CORS Check (origin validation)
  ↓
Auth Check (verify session/token)
  ↓
Route Handler (server action)
  ↓
RLS Check (database enforces)
  ↓
Response (with security headers)
```

#### Layer 3: Database Layer (RLS)

**Components:**
- Row-Level Security policies
- Field-level visibility
- Automatic filtering

**Example - User can only see their own data:**
```sql
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Even if user tries to SELECT * FROM users,
-- RLS automatically filters to auth.uid() = id
```

### Token Security

**Access Token:**
- Issued by Supabase Auth
- Stored in HttpOnly cookie
- Expires after 1 hour
- Used for API authentication

**Refresh Token:**
- Issued by Supabase Auth
- Stored in HttpOnly cookie
- Expires after 7 days
- Used to obtain new access token

**Token Family (Attack Detection):**
```
Initial Auth
  ↓
Create Token Family ID
  ↓
First Refresh: Generate New Token + New Family ID
  ↓
If Old Token Used Again: ATTACK DETECTED → Revoke All
```

### Rate Limiting

**Per-Endpoint Configuration:**
```typescript
// Login: 5 attempts per 5 minutes
'POST /api/auth/login': {
  maxRequests: 5,
  windowSeconds: 300,
  lockoutThreshold: 5,
  lockoutDurationSeconds: 900, // 15 min lockout
}

// Registration: 3 attempts per hour
'POST /api/auth/register': {
  maxRequests: 3,
  windowSeconds: 3600,
}
```

**Implementation:**
- **Development:** In-memory store
- **Production:** Redis with TTL

### CORS & Origin Validation

**Origins by Environment:**
```javascript
development: ['http://localhost:3000']
staging: ['https://staging.dive-drop.com']
production: ['https://dive-drop.com', 'https://www.dive-drop.com']
```

**Enforcement:**
```typescript
// Preflight requests (OPTIONS) are rejected if origin not allowed
if (request.method === 'OPTIONS' && !isOriginAllowed(origin)) {
  return new NextResponse('Forbidden', { status: 403 });
}

// Regular requests are rejected if origin not allowed
if (!isOriginAllowed(origin)) {
  return new NextResponse('CORS validation failed', { status: 403 });
}
```

### Security Headers

**Headers Applied to All Responses:**

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000 | Force HTTPS |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| Content-Security-Policy | script-src 'self' | Prevent XSS/injection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer |

**CSP Configuration by Page Type:**
- `default` - General pages
- `admin` - Strictest CSP (no unsafe-inline)
- `public` - Allows analytics/ads

---

## Data Architecture

### Schema Overview

```
USERS (core identity)
├── id (UUID)
├── email (unique)
├── password_hash
├── full_name
├── verified_at (email verification)
├── created_at
└── RLS: Users see only own profile

LISTINGS (buddy search)
├── id (UUID)
├── owner_id (FK users)
├── title
├── description
├── diving_level (enum)
├── location
├── dive_date
├── max_buddies
├── is_active
├── created_at
└── RLS: Users see all active listings, owners see own listings

INTERESTS (who's interested)
├── id (UUID)
├── listing_id (FK listings)
├── interested_user_id (FK users)
├── listing_owner_id (FK users)
├── created_at
└── RLS: Only owner sees interests, user sees own interests

CONTACT_REVEALS (mutual consent)
├── id (UUID)
├── listing_id (FK listings)
├── initiator_id (FK users)
├── recipient_id (FK users)
├── initiator_revealed_at
├── recipient_revealed_at
├── mutual_revealed_at
├── created_at
└── RLS: Only participants see own reveals

BLOCKS (user blocking)
├── id (UUID)
├── blocker_id (FK users)
├── blocked_user_id (FK users)
├── reason
├── created_at
└── RLS: Only blocker sees blocks

REPORTS (abuse reports)
├── id (UUID)
├── reporter_id (FK users)
├── reported_user_id (FK users)
├── report_type (enum)
├── description
├── status (enum)
├── created_at
├── resolved_at
└── RLS: Only reporter & admins see reports

AUDIT_LOG (compliance)
├── id (UUID)
├── user_id (FK users)
├── action (enum)
├── resource_type
├── resource_id
├── changes (JSON)
├── ip_address
├── created_at
└── RLS: Only admins see logs
```

### Normalization Strategy

**Rationale:** 3NF (Third Normal Form)
- Minimizes redundancy
- Easy to maintain referential integrity
- Supports RLS policies
- Performant with proper indexes

**Indexes:**
```sql
-- For filtering
CREATE INDEX listings_owner_id ON listings(owner_id);
CREATE INDEX listings_active_date ON listings(is_active, dive_date);
CREATE INDEX interests_listing_id ON interests(listing_id);

-- For searching
CREATE INDEX listings_search ON listings USING GIN(to_tsvector('english', title || ' ' || description));

-- For security
CREATE INDEX contact_reveals_participants ON contact_reveals(initiator_id, recipient_id);
CREATE INDEX blocks_blocker ON blocks(blocker_id);
```

---

## API Design

### Server Actions (Preferred)

**Pattern:** Server Actions for mutations

```typescript
// src/app/actions/listings.ts
'use server';

import { getAuthContext, authorize, requireAuth } from '@/lib/security/auth-middleware';
import { ResourceAction } from '@/lib/security/permissions';
import { createClient } from '@/lib/supabase/server';
import { createListingSchema } from '@/lib/schemas/listings';

export async function createListingAction(data: unknown) {
  // 1. Validate input
  const validated = createListingSchema.parse(data);
  
  // 2. Check auth & permission
  const context = await getAuthContext();
  authorize(context, ResourceAction.CREATE_LISTING);
  const user = requireAuth(context);
  
  // 3. Execute business logic
  const supabase = await createClient();
  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      owner_id: user.id,
      title: validated.title,
      description: validated.description,
      diving_level: validated.divingLevel,
      location: validated.location,
      dive_date: validated.diveDate,
      max_buddies: validated.maxBuddies,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // 4. Return result
  return { success: true, listing };
}
```

**Usage in Components:**
```typescript
'use client';

import { createListingAction } from '@/app/actions/listings';
import { useTransition } from 'react';

export function CreateListingForm() {
  const [isPending, startTransition] = useTransition();

  const onSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await createListingAction({
        title: formData.get('title'),
        description: formData.get('description'),
        // ...
      });
      
      if (result.success) {
        // Show success
      }
    });
  };

  return (
    <form action={onSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### REST API Routes (Secondary)

**Pattern:** Use for external integrations, webhooks

```typescript
// src/app/api/webhooks/payment/route.ts
import { verifyWebhookSignature } from '@/lib/payments/stripe';
import { handlePaymentConfirmed } from '@/lib/payments/logic';

export async function POST(request: Request) {
  const signature = request.headers.get('x-stripe-signature');
  const body = await request.text();

  // Verify webhook is from Stripe
  const verified = verifyWebhookSignature(body, signature);
  if (!verified) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Process webhook
  const event = JSON.parse(body);
  if (event.type === 'payment.success') {
    await handlePaymentConfirmed(event.data);
  }

  return new Response(JSON.stringify({ success: true }));
}
```

---

## Frontend Architecture

### Component Organization

```
components/
├── ui/
│   ├── Button.tsx           # Basic components (reusable)
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── Input.tsx
├── ListingCard.tsx          # Feature components (buddy search)
├── ContactRevealButton.tsx
├── BlockUserButton.tsx
└── ReportButton.tsx
```

### State Management

**Server State:**
```typescript
// Fetch from server with Next.js
export async function ListingsPage() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from('listings')
    .select('*');

  return <ListingsGrid listings={listings} />;
}
```

**Client State:**
```typescript
// UI state with Zustand
import { create } from 'zustand';

interface UIStore {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));
```

### Form Handling

**Pattern:**
```typescript
'use client';

import { useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { createListingAction } from '@/app/actions/listings';
import { createListingSchema } from '@/lib/schemas/listings';

export function CreateListingForm() {
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    try {
      // Parse form data
      const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        // ...
      };

      // Validate client-side
      const validated = createListingSchema.parse(data);

      // Submit to server action
      const result = await createListingAction(validated);

      if (result.success) {
        // Show success toast
        // Redirect or refresh
      } else {
        // Show error message
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Show validation errors
      }
    }
  }

  return (
    <form action={onSubmit}>
      <input name="title" type="text" required />
      <input name="description" type="textarea" required />
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Listing'}
      </button>
    </form>
  );
}
```

---

## Performance & Scalability

### Optimization Strategies

#### 1. Database Performance

**Indexes:**
- Foreign keys (automatic RLS checks)
- Timestamp columns (for time-range queries)
- Status/enum columns (for filtering)
- Full-text search (for text queries)

**Query Patterns:**
```typescript
// ❌ Avoid N+1 queries
const listings = await supabase.from('listings').select('*');
for (const listing of listings) {
  const owner = await supabase
    .from('users')
    .select('*')
    .eq('id', listing.owner_id)
    .single(); // Query per listing!
}

// ✅ Use joins
const listings = await supabase
  .from('listings')
  .select(`
    *,
    owner:owner_id(id, name, email)
  `);
```

#### 2. Caching Strategy

**Server-Side:**
```typescript
// Cache listings for 5 minutes
import { unstable_cache } from 'next/cache';

const getListings = unstable_cache(
  async () => {
    const supabase = await createClient();
    return supabase.from('listings').select('*');
  },
  ['listings'],
  { revalidate: 300 } // 5 minutes
);

// Revalidate on mutation
'use server';
export async function createListing(data) {
  // ... create listing
  revalidatePath('/find-buddy');
}
```

**Client-Side:**
```typescript
// SWR for client-side caching
import useSWR from 'swr';

export function ListingsGrid() {
  const { data: listings } = useSWR('/api/listings', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 min
  });
  return <div>{/* render listings */}</div>;
}
```

#### 3. Code Splitting

**Automatic in Next.js:**
- Each route is code-split
- Dynamic imports for heavy components
- Lazy load third-party libraries

```typescript
import dynamic from 'next/dynamic';

// Load only when used
const HeavyComponent = dynamic(() => import('@/components/Heavy'), {
  loading: () => <Skeleton />,
});

export default function Page() {
  return <HeavyComponent />;
}
```

#### 4. Image Optimization

```typescript
import Image from 'next/image';

export function ListingCard({ listing }) {
  return (
    <Image
      src={listing.imageUrl}
      alt={listing.title}
      width={400}
      height={300}
      priority={false} // lazy load by default
      quality={75} // compressed
    />
  );
}
```

### Scalability Roadmap

**Current (Single Server):**
- Vercel auto-scales horizontally
- Supabase handles connections pooling
- CDN caches static assets

**Next (Multi-Region):**
- Vercel Edge Network
- Multi-region Supabase replicas (read-only)
- Redis for session/rate-limit store

**Future (Enterprise):**
- Dedicated Vercel organization
- Supabase dedicated server
- Custom CDN
- Kafka for event streaming

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
- Supabase automatic daily backups (30 days)
- Manual weekly exports to S3
- Point-in-time recovery available

**Code Repository:**
- GitHub (primary)
- Nightly backup to S3

**Secrets:**
- Vercel secure environment variables
- No local .env files committed
- Rotation every 90 days

### Incident Response

**Process:**
1. Detect issue (error monitoring, alerts)
2. Assess severity (Sev-1/2/3)
3. Declare incident
4. Assemble team
5. Implement fix
6. Deploy (staging → production)
7. Verify (smoke tests)
8. Communicate (status page)
9. Postmortem

**Rollback Procedure:**
```bash
# Quick rollback to previous version
git revert <commit-hash>
git push origin main
# Vercel auto-deploys in ~2 min
```

**Communication:**
- Slack #incidents channel
- Status page update
- Customer email notification
- Public postmortem within 48 hours

---

## Technical Debt & Future Improvements

### Known Limitations

| Area | Current | Limitation | Plan |
|------|---------|-----------|------|
| Rate Limiting | In-memory | Single server only | Switch to Redis (v1.2) |
| Sessions | Memory | Lost on restart | Add Redis (v1.2) |
| Notifications | Polling | Inefficient | Real-time subscriptions (v1.1) |
| Analytics | None | Limited insights | Segment integration (v1.2) |
| Images | Vercel | Tight coupling | S3 + CloudFront (v1.3) |

### Refactoring Opportunities

1. **Extract permission logic to library**
   - Reuse across products
   - Version management

2. **Consolidate error handling**
   - Standard error codes
   - Structured logging

3. **Improve type safety**
   - Stricter RLS policy types
   - Branded types for IDs

---

## References & Standards

### Relevant Standards & Frameworks

- **OWASP Top 10:** Security testing checklist
- **NIST CSF:** Cybersecurity Framework alignment
- **CWE-200:** Information Exposure (avoid)
- **RFC 6265:** HTTP State Management (cookies)
- **RFC 7519:** JSON Web Tokens (JWT)
- **RFC 7231:** HTTP Semantics (status codes)

### External Resources

- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- TypeScript Handbook: https://www.typescriptlang.org/docs
- OWASP Guidelines: https://owasp.org/www-project-top-ten

---

## Architecture Review Checklist

- [x] Three-layer security model documented
- [x] Database schema normalized
- [x] Token lifecycle defined
- [x] Rate limiting configured
- [x] CORS policy defined
- [x] Security headers applied
- [x] Error handling strategy
- [x] Backup & recovery plan
- [x] Scalability path identified

**Last Review:** June 20, 2026  
**Next Review:** September 20, 2026
