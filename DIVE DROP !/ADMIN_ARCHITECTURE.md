# DIVE DROP Admin Panel Architecture

## 1. FILE & FOLDER STRUCTURE

```
src/
├── app/
│   ├── [locale]/
│   │   ├── admin/
│   │   │   ├── layout.tsx                 # Admin root layout with sidebar
│   │   │   ├── page.tsx                   # Admin dashboard home
│   │   │   ├── users/
│   │   │   │   ├── page.tsx               # Users list view
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx           # User detail/edit page
│   │   │   │   │   └── delete/            # Delete confirmation
│   │   │   │   └── create/                # Create user form
│   │   │   ├── dive-sites/
│   │   │   │   ├── page.tsx               # Dive sites list view
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx           # Dive site detail/edit
│   │   │   │   │   └── delete/
│   │   │   │   └── create/
│   │   │   ├── shuttles/
│   │   │   │   ├── page.tsx               # Shuttles list view
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx           # Shuttle detail/edit
│   │   │   │   │   └── delete/
│   │   │   │   └── create/
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx               # Analytics & reporting dashboard
│   │   │   ├── settings/
│   │   │   │   └── page.tsx               # Admin settings & configuration
│   │   │   └── activity-log/
│   │   │       └── page.tsx               # Admin activity audit log
│   │
│   └── api/
│       ├── admin/
│       │   ├── users/
│       │   │   ├── route.ts               # GET, POST users
│       │   │   └── [id]/
│       │   │       ├── route.ts           # GET, PUT, DELETE user by ID
│       │   ├── dive-sites/
│       │   │   ├── route.ts
│       │   │   └── [id]/route.ts
│       │   ├── shuttles/
│       │   │   ├── route.ts
│       │   │   └── [id]/route.ts
│       │   └── analytics/route.ts         # Stats aggregation
│       │
│       └── auth/
│           └── admin-check/route.ts       # Verify admin status
│
├── components/
│   ├── admin/
│   │   ├── layout/
│   │   │   ├── AdminSidebar.tsx           # Collapsible sidebar with RTL support
│   │   │   ├── AdminHeader.tsx            # Admin page header
│   │   │   ├── AdminTopNav.tsx            # Horizontal breadcrumb/nav
│   │   │   └── AdminContainer.tsx         # Main content wrapper
│   │   │
│   │   ├── tables/
│   │   │   ├── DataTable.tsx              # Reusable table component (generic)
│   │   │   ├── TableHeader.tsx            # Column headers with sort/filter
│   │   │   ├── TableRow.tsx               # Row with actions
│   │   │   ├── TableActions.tsx           # Edit/Delete/View action buttons
│   │   │   ├── UsersTable.tsx             # Specific table for users
│   │   │   ├── DiveSitesTable.tsx         # Specific table for dive sites
│   │   │   └── ShuttlesTable.tsx          # Specific table for shuttles
│   │   │
│   │   ├── forms/
│   │   │   ├── UserForm.tsx               # User create/edit form
│   │   │   ├── DiveSiteForm.tsx           # Dive site create/edit form
│   │   │   ├── ShuttleForm.tsx            # Shuttle create/edit form
│   │   │   ├── FormField.tsx              # Reusable form field with validation
│   │   │   ├── FormSection.tsx            # Logical form grouping
│   │   │   └── SubmitButton.tsx           # Smart submit with loading/disabled states
│   │   │
│   │   ├── modals/
│   │   │   ├── AdminModal.tsx             # Base modal for admin context
│   │   │   ├── DeleteConfirmModal.tsx     # Reusable delete confirmation
│   │   │   ├── BulkActionModal.tsx        # Bulk operations dialog
│   │   │   └── ExportModal.tsx            # Export data dialog
│   │   │
│   │   ├── filters/
│   │   │   ├── FilterPanel.tsx            # Collapsible filter sidebar
│   │   │   ├── FilterField.tsx            # Individual filter control
│   │   │   ├── DateRangeFilter.tsx        # Date range picker
│   │   │   └── SearchFilter.tsx           # Global search field
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx              # KPI card component
│   │   │   ├── ChartCard.tsx              # Chart wrapper
│   │   │   └── AdminDashboard.tsx         # Dashboard grid layout
│   │   │
│   │   └── shared/
│   │       ├── AdminBadge.tsx             # Status badge (active/inactive/etc)
│   │       ├── AdminPagination.tsx        # Custom pagination controls
│   │       ├── AdminLoadingSpinner.tsx    # Loading state component
│   │       ├── AdminEmptyState.tsx        # No data state
│   │       └── AdminToast.tsx             # Toast notifications
│   │
│   └── (existing user-facing components)
│
├── stores/
│   ├── adminStore.ts                      # Zustand store for admin state
│   ├── adminTableStore.ts                 # Table selection/pagination state
│   ├── adminFilterStore.ts                # Filter state management
│   └── adminAuthStore.ts                  # Admin authentication & permissions
│
├── hooks/
│   ├── useAdminAuth.ts                    # Check admin role
│   ├── useAdminTable.ts                   # Table logic (sort, pagination, filter)
│   ├── useAdminForm.ts                    # Form state & validation
│   ├── useAdminApi.ts                     # API call wrapper with loading/error
│   └── useAdminNotification.ts            # Toast notifications
│
├── types/
│   ├── admin.ts                           # Admin-specific types
│   ├── user.ts                            # User schema
│   ├── dive-site.ts                       # Dive site schema
│   └── shuttle.ts                         # Shuttle schema
│
├── utils/
│   ├── admin/
│   │   ├── formatters.ts                  # Format dates, currencies, numbers
│   │   ├── validators.ts                  # Zod schemas for forms
│   │   ├── permissions.ts                 # Role-based access logic
│   │   └── export.ts                      # CSV/JSON export utilities
│   │
│   └── (existing utilities)
│
├── i18n/
│   ├── routing.ts                         # Existing routing config
│   └── admin-messages.ts                  # Admin UI translation strings
│
└── middleware/
    └── admin-auth.ts                      # Admin route protection
```

## 2. ROUTING MAP

```
/[locale]/admin
  ├── /                             → Admin Dashboard (stats overview)
  ├── /users
  │   ├── /                         → Users List (data grid)
  │   ├── /create                   → Create User Form (modal or full page)
  │   └── /[id]
  │       ├── /                     → User Detail / Edit Form
  │       └── /delete               → Delete Confirmation (modal)
  │
  ├── /dive-sites
  │   ├── /                         → Dive Sites List
  │   ├── /create                   → Create Dive Site Form
  │   └── /[id]
  │       ├── /                     → Dive Site Detail / Edit
  │       └── /delete               → Delete Confirmation
  │
  ├── /shuttles
  │   ├── /                         → Shuttles List
  │   ├── /create                   → Create Shuttle Form
  │   └── /[id]
  │       ├── /                     → Shuttle Detail / Edit
  │       └── /delete               → Delete Confirmation
  │
  ├── /analytics                    → Analytics Dashboard (charts, KPIs)
  ├── /settings                     → Admin Settings & Config
  └── /activity-log                 → Admin Activity Audit Log
```

## 3. COMPONENT HIERARCHY & RESPONSIBILITIES

### Layout Components

**AdminLayout** (app/[locale]/admin/layout.tsx)
- Wraps all admin routes
- Provides sidebar + main content grid
- Handles admin auth check
- Manages sidebar collapse state
- RTL/LTR context

```
AdminLayout
├── AdminSidebar (fixed left/right based on RTL)
│   ├── BrandSection
│   ├── NavigationMenu
│   │   ├── Dashboard Link
│   │   ├── Users Link
│   │   ├── Dive Sites Link
│   │   ├── Shuttles Link
│   │   ├── Analytics Link
│   │   ├── Settings Link
│   │   └── Activity Log Link
│   └── UserProfileSection
├── main
│   ├── AdminHeader (breadcrumb, search, user dropdown)
│   └── [children] (page content)
```

### Table Components

**DataTable** (generic, reusable)
- Props: columns, data, loading, onSort, onRowClick, etc.
- Features: sorting, column visibility toggle, row selection
- Responsive: columns hide on mobile, becomes card view

**UsersTable, DiveSitesTable, ShuttlesTable** (specific)
- Extend DataTable with domain-specific columns
- Define action buttons (Edit, Delete, View)
- Format cells with type-specific data (dates, addresses, etc.)

### Form Components

**UserForm** (create/edit)
- Fields: email, name, role, status, phone
- Validation with Zod
- Submit handler with API integration

**DiveSiteForm** (create/edit)
- Fields: name, location, depth, difficulty, description, coordinates
- Image upload
- Validation

**ShuttleForm** (create/edit)
- Fields: name, capacity, driver, license, status
- Validation

**FormField** (reusable)
- Text input, select, checkbox, radio, textarea
- Label + error message
- RTL support
- Validation feedback

### Page Components

Each CRUD page follows pattern:

**ListPage** (e.g., /admin/users)
```tsx
function UsersListPage() {
  const [filters, setFilters] = useState({})
  const { data, loading, error } = useAdminApi('/api/admin/users', filters)
  
  return (
    <AdminContainer>
      <AdminHeader title="Users Management" />
      <FilterPanel />
      <UsersTable data={data} onDelete={handleDelete} onEdit={handleEdit} />
      <AdminPagination />
    </AdminContainer>
  )
}
```

**DetailPage** (e.g., /admin/users/[id])
```tsx
function UserDetailPage({ params }) {
  const { data, loading } = useAdminApi(`/api/admin/users/${params.id}`)
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <AdminContainer>
      <AdminHeader title="User Details" backLink="/admin/users" />
      {isEditing ? (
        <UserForm initialData={data} onSubmit={handleSave} />
      ) : (
        <UserDetailView data={data} onEdit={() => setIsEditing(true)} />
      )}
    </AdminContainer>
  )
}
```

## 4. DATA GRID/TABLE COMPONENT DESIGN

```tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  error?: Error | null
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string) => void
  onRowClick?: (row: T) => void
  selectedRows?: T[]
  onSelectRows?: (rows: T[]) => void
  pageSize?: number
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  actions?: (row: T) => ActionButton[]
  responsive?: boolean
}

interface ColumnDef<T> {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  format?: (value: any, row: T) => ReactNode
  width?: string
  hidden?: boolean
}
```

**Features:**
- Sortable columns (click header to toggle asc/desc)
- Filterable columns (via FilterPanel)
- Selectable rows (checkboxes for bulk actions)
- Responsive (stacks on mobile, or becomes card view)
- Pagination (10, 25, 50 rows per page)
- Empty states & loading skeletons
- Right-click context menu (optional)
- Column visibility toggle
- Mobile-optimized (horizontal scroll or card view)

## 5. MODAL/FORM DESIGN

**Modal Structure:**
```tsx
<AdminModal
  open={isOpen}
  title="Delete User?"
  description="This action cannot be undone."
  onClose={() => setIsOpen(false)}
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="danger" onClick={handleDelete}>Delete</Button>
    </>
  }
>
  {/* Modal content */}
</AdminModal>
```

**Form Submission Flow:**
```tsx
<form onSubmit={handleSubmit}>
  <FormSection title="Personal Information">
    <FormField
      label="Full Name"
      error={errors.name}
      required
    >
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
    </FormField>
  </FormSection>
  
  <FormSection title="Permissions">
    <FormField label="Role">
      <select value={formData.role} onChange={...}>
        <option>User</option>
        <option>Moderator</option>
        <option>Admin</option>
      </select>
    </FormField>
  </FormSection>

  <SubmitButton loading={isSubmitting} disabled={!isValid}>
    Save Changes
  </SubmitButton>
</form>
```

## 6. RTL/LTR SUPPORT

**Approach:**
- Use CSS logical properties (margin-inline, padding-block, etc.)
- Flexbox with `direction` context from `useLocale()`
- Sidebar: `fixed ${isRTL ? 'right' : 'left'}-0`
- Text alignment: `text-${isRTL ? 'right' : 'left'}`
- Utility classes: margin-inline-start, padding-inline-end
- Tailwind RTL support via `[dir=rtl]` selector

**Admin Messages (i18n):**
```ts
// i18n/admin-messages.ts
export const adminMessages = {
  en: {
    users: {
      title: 'Users Management',
      addButton: 'Add User',
      table: {
        email: 'Email',
        name: 'Full Name',
        role: 'Role',
        status: 'Status',
        joinedDate: 'Joined',
        actions: 'Actions',
      },
      form: {
        email: 'Email Address',
        name: 'Full Name',
        // ... more
      },
    },
    // ... other modules
  },
  he: {
    users: {
      title: 'ניהול משתמשים',
      addButton: 'הוסף משתמש',
      // ... Hebrew translations
    },
  },
}
```

## 7. MOBILE RESPONSIVENESS

**Sidebar:** 
- Desktop: Fixed sidebar (200-250px width)
- Mobile: Hidden by default, slide-out overlay menu
- Toggle button in AdminHeader

**Table:**
- Desktop: Full data grid with all columns
- Tablet: Hide non-essential columns (join date, etc.)
- Mobile: Switch to card-based view (one record per card)

```tsx
// Card view for mobile
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:hidden">
  {data.map(user => (
    <UserCard key={user.id} user={user} />
  ))}
</div>

// Table view for desktop
<div className="hidden lg:block overflow-x-auto">
  <DataTable {...props} />
</div>
```

## 8. NAVIGATION MENU STRUCTURE

**Sidebar Navigation:**
```
DASHBOARD
├── Dashboard (icon: 📊)

DATA MANAGEMENT
├── Users (icon: 👥)
├── Dive Sites (icon: 🏝️)
└── Shuttles (icon: 🚤)

INSIGHTS & REPORTING
├── Analytics (icon: 📈)
└── Activity Log (icon: 📋)

CONFIGURATION
├── Settings (icon: ⚙️)
└── [Admin Profile Dropdown]
    ├── My Profile
    ├── Change Password
    └── Logout
```

**Active State Indicator:**
- Highlight current page in sidebar
- Breadcrumb in top nav shows full path
- Page title in header reflects current module

## 9. ZUSTAND STATE MANAGEMENT STRATEGY

### Store Architecture

**adminStore.ts** (global admin UI state)
```ts
interface AdminState {
  sidebarOpen: boolean
  currentModule: 'users' | 'dive-sites' | 'shuttles' | 'analytics'
  
  toggleSidebar: () => void
  setCurrentModule: (module: string) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  sidebarOpen: true,
  currentModule: 'dashboard',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentModule: (module) => set({ currentModule: module }),
}))
```

**adminTableStore.ts** (per-table state)
```ts
interface TableState {
  selectedRows: string[] // IDs of selected rows
  sortBy: string | null
  sortOrder: 'asc' | 'desc'
  currentPage: number
  pageSize: number
  filters: Record<string, any>
  
  toggleRowSelection: (id: string) => void
  selectAllRows: (ids: string[]) => void
  clearSelection: () => void
  setSort: (column: string, order: 'asc' | 'desc') => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setFilters: (filters: Record<string, any>) => void
  reset: () => void
}

// Create separate store instance per module
export const useUsersTableStore = create<TableState>(...)
export const useDiveSitesTableStore = create<TableState>(...)
export const useShuttlesTableStore = create<TableState>(...)
```

**adminFilterStore.ts** (filter state across the admin)
```ts
interface FilterState {
  usersFilters: {
    search?: string
    role?: string
    status?: 'active' | 'inactive'
    joinedAfter?: Date
  }
  diveSitesFilters: {
    search?: string
    difficulty?: string
    minDepth?: number
    maxDepth?: number
  }
  // ... other modules
  
  setUsersFilters: (filters) => void
  clearUsersFilters: () => void
  // ... per-module helpers
}

export const useAdminFilterStore = create<FilterState>(...)
```

**adminAuthStore.ts** (permissions & auth)
```ts
interface AuthState {
  isAdmin: boolean
  adminRole: 'super_admin' | 'admin' | 'moderator'
  permissions: Set<string>
  
  checkPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  
  setAdminStatus: (isAdmin: boolean, role: string, permissions: string[]) => void
}

export const useAdminAuthStore = create<AuthState>(...)
```

**Usage in Components:**
```tsx
function UsersListPage() {
  const { filters, setFilters } = useAdminFilterStore((state) => ({
    filters: state.usersFilters,
    setFilters: state.setUsersFilters,
  }))
  
  const { sortBy, sortOrder, setSort, currentPage, setPage } = useUsersTableStore()
  
  return (
    <>
      <FilterPanel filters={filters} onChange={setFilters} />
      <DataTable
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={setSort}
        currentPage={currentPage}
        onPageChange={setPage}
      />
    </>
  )
}
```

## 10. TAILWIND STYLING APPROACH

**Color Palette for Admin:**
```css
/* Primary actions */
--color-admin-primary: #0ea5e9 (sky-500)
--color-admin-success: #10b981 (emerald-500)
--color-admin-danger: #ef4444 (red-500)
--color-admin-warning: #f59e0b (amber-500)

/* Backgrounds */
--color-admin-bg: #f8fafc (slate-50)
--color-admin-surface: #ffffff
--color-admin-surface-hover: #f1f5f9 (slate-100)

/* Text */
--color-admin-text-primary: #1e293b (slate-800)
--color-admin-text-secondary: #64748b (slate-500)
--color-admin-text-disabled: #cbd5e1 (slate-300)

/* Borders */
--color-admin-border: #e2e8f0 (slate-200)
--color-admin-border-focus: #0ea5e9 (sky-500)
```

**Component Patterns:**

```tsx
// Button variants
<Button variant="primary">Save</Button>      // Blue
<Button variant="secondary">Cancel</Button> // Gray
<Button variant="danger">Delete</Button>    // Red
<Button variant="ghost">More Options</Button>

// Card styling
<div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
  {/* content */}
</div>

// Table row hover
<tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
  {/* cells */}
</tr>

// Input focus
<input className="border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />

// Dark mode (if supported)
<div className="dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800" />
```

**Responsive Classes:**
```tsx
// Sidebar: visible on md+, hidden on mobile with overlay
<aside className="hidden md:flex fixed right-0 w-64 h-screen bg-white shadow-lg" />

// Table: stack on mobile, grid on tablet, table on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden">
  {/* Mobile card view */}
</div>
<div className="hidden lg:block overflow-x-auto">
  {/* Desktop table */}
</div>

// Form: two columns on desktop, single on mobile
<form className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <FormField />
  <FormField />
</form>
```

**RTL Utilities:**
```tsx
className={clsx(
  'p-4',
  isRTL ? 'text-right pr-6' : 'text-left pl-6',
)}

// Or use logical properties (preferred)
className="px-4 md:pl-6 [dir=rtl]:md:pr-6"
```

## 11. AUTHENTICATION & ROUTE PROTECTION

**Middleware (middleware/admin-auth.ts):**
```ts
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check if route is admin
  if (request.nextUrl.pathname.includes('/admin')) {
    // Verify admin status via session or JWT
    const isAdmin = await checkAdminStatus(request)
    
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/:locale/admin/:path*'],
}
```

**Hook (hooks/useAdminAuth.ts):**
```ts
export function useAdminAuth() {
  const { isAdmin, adminRole } = useAdminAuthStore()
  const router = useRouter()
  const { locale } = useLocale()
  
  useEffect(() => {
    if (!isAdmin) {
      router.push(`/${locale}/login`)
    }
  }, [isAdmin])
  
  return { isAdmin, adminRole }
}
```

**Protected Component:**
```tsx
function AdminPage() {
  const { isAdmin } = useAdminAuth()
  
  if (!isAdmin) {
    return <div>Unauthorized</div>
  }
  
  return <AdminContainer>{/* content */}</AdminContainer>
}
```

## 12. API ENDPOINTS DESIGN

**Pattern:** `/api/admin/[resource]/[action]`

```ts
// GET /api/admin/users?page=1&limit=25&sort=name&order=asc&filter[role]=admin
// Response:
{
  success: true,
  data: User[],
  pagination: {
    page: 1,
    limit: 25,
    total: 150,
    totalPages: 6,
  },
  timestamp: ISO8601,
}

// POST /api/admin/users (create)
// Body: { email, name, role, status, password }
// Response:
{
  success: true,
  data: User,
  message: "User created successfully"
}

// PUT /api/admin/users/[id] (update)
// Body: { email, name, role, status }
// Response:
{
  success: true,
  data: User,
  message: "User updated successfully"
}

// DELETE /api/admin/users/[id]
// Response:
{
  success: true,
  message: "User deleted successfully"
}

// Error Response:
{
  success: false,
  error: "Validation failed",
  details: [
    { field: "email", message: "Invalid email format" }
  ],
  timestamp: ISO8601,
}
```

## 13. VALIDATION SCHEMAS (Zod)

```ts
// types/validators.ts

import { z } from 'zod'

export const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['user', 'moderator', 'admin']),
  status: z.enum(['active', 'inactive', 'suspended']),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

export type UserFormData = z.infer<typeof userFormSchema>

export const diveSiteFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  location: z.string().min(2, 'Location is required'),
  depth: z.number().min(0, 'Depth must be positive'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const shuttleFormSchema = z.object({
  name: z.string().min(2),
  capacity: z.number().min(1).max(50),
  driver: z.string().min(2),
  license: z.string(),
  status: z.enum(['available', 'in_use', 'maintenance']),
})
```

## 14. PERFORMANCE OPTIMIZATIONS

**Code Splitting:**
- Admin routes in `/admin/*` are lazy-loaded
- Heavy components (charts, tables) use `React.lazy()` + `Suspense`

**Pagination:**
- Load 25 items per page by default
- Implement cursor-based pagination for large datasets
- Lazy-load next page on scroll or button click

**Caching:**
- Use React Query / SWR for API caching
- Stale-while-revalidate pattern for list views
- Invalidate cache on create/update/delete

**Table Virtualization:**
- For large datasets (1000+), consider `react-virtual` or `TanStack Virtual`
- Render only visible rows to DOM

**Image Optimization:**
- Compress dive site images before upload
- Use Next.js `Image` component with `priority={false}`

---

## Summary

This architecture provides:

✅ **Scalable:** Easy to add new modules (Reports, etc.)
✅ **Maintainable:** Clear folder structure, reusable components
✅ **Type-safe:** TypeScript + Zod validation
✅ **Accessible:** ARIA labels, keyboard navigation
✅ **RTL-ready:** Full Hebrew/English support with CSS logical properties
✅ **Mobile-responsive:** Works on all devices
✅ **Performant:** Code splitting, lazy loading, pagination
✅ **Secure:** Route protection, admin-only endpoints, permission checks

Next steps:
1. Create base layout components (AdminLayout, AdminSidebar, AdminHeader)
2. Build reusable table & form components
3. Implement first module (Users) completely as template
4. Extend to Dive Sites and Shuttles modules
5. Add analytics dashboard
6. Set up activity logging
