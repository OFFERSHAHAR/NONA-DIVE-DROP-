# DIVE DROP Admin Panel - Zustand State Management Patterns

## Overview

This guide details the Zustand store architecture for the admin panel, including global state, per-module state, and best practices.

## Store Hierarchy

```
useAdminStore (Global UI State)
├── sidebarOpen
├── currentModule
├── notifications
└── modals state

useAdminAuthStore (Authentication & Permissions)
├── isAdmin
├── adminRole
└── permissions

useAdminFilterStore (Filter State Across Modules)
├── usersFilters
├── diveSitesFilters
└── shuttlesFilters

Table-Specific Stores (Created per module)
├── useUsersTableStore
├── useDiveSitesTableStore
└── useShuttlesTableStore
```

## 1. Global Admin Store

**Purpose:** UI state shared across the entire admin panel (sidebar, modals, notifications)

**File: `src/stores/adminStore.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number // milliseconds, 0 = permanent
  actionLabel?: string
  onAction?: () => void
}

export interface AdminState {
  // Sidebar state
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Current module tracking
  currentModule: 'dashboard' | 'users' | 'dive-sites' | 'shuttles' | 'analytics' | 'settings'
  setCurrentModule: (module: AdminState['currentModule']) => void
  
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Modal state
  modals: {
    deleteConfirm: {
      open: boolean
      title?: string
      message?: string
      onConfirm?: () => Promise<void>
    }
    bulkActions: {
      open: boolean
      selectedCount: number
    }
    export: {
      open: boolean
      format: 'csv' | 'json'
    }
  }
  
  // Modal actions
  openDeleteModal: (config: {
    title: string
    message: string
    onConfirm: () => Promise<void>
  }) => void
  closeDeleteModal: () => void
  openBulkActionsModal: (selectedCount: number) => void
  closeBulkActionsModal: () => void
  openExportModal: (format: 'csv' | 'json') => void
  closeExportModal: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      // Module
      currentModule: 'dashboard',
      setCurrentModule: (module) => set({ currentModule: module }),
      
      // Notifications
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: `${Date.now()}-${Math.random()}`,
            },
          ],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
      
      // Modals
      modals: {
        deleteConfirm: { open: false },
        bulkActions: { open: false, selectedCount: 0 },
        export: { open: false, format: 'csv' },
      },
      openDeleteModal: (config) =>
        set((state) => ({
          modals: {
            ...state.modals,
            deleteConfirm: {
              open: true,
              title: config.title,
              message: config.message,
              onConfirm: config.onConfirm,
            },
          },
        })),
      closeDeleteModal: () =>
        set((state) => ({
          modals: {
            ...state.modals,
            deleteConfirm: { open: false },
          },
        })),
      openBulkActionsModal: (selectedCount) =>
        set((state) => ({
          modals: {
            ...state.modals,
            bulkActions: { open: true, selectedCount },
          },
        })),
      closeBulkActionsModal: () =>
        set((state) => ({
          modals: {
            ...state.modals,
            bulkActions: { open: false, selectedCount: 0 },
          },
        })),
      openExportModal: (format) =>
        set((state) => ({
          modals: {
            ...state.modals,
            export: { open: true, format },
          },
        })),
      closeExportModal: () =>
        set((state) => ({
          modals: {
            ...state.modals,
            export: { open: false, format: 'csv' },
          },
        })),
    }),
    {
      name: 'admin-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        currentModule: state.currentModule,
      }),
    }
  )
)

// Notification helper hooks
export const useNotification = () => {
  const { addNotification, removeNotification } = useAdminStore()
  
  return {
    success: (message: string, duration = 3000) => {
      const id = Date.now().toString()
      addNotification({
        type: 'success',
        message,
        duration,
      })
      if (duration) {
        setTimeout(() => removeNotification(id), duration)
      }
    },
    error: (message: string, duration = 5000) => {
      const id = Date.now().toString()
      addNotification({
        type: 'error',
        message,
        duration,
      })
      if (duration) {
        setTimeout(() => removeNotification(id), duration)
      }
    },
    warning: (message: string, duration = 4000) => {
      const id = Date.now().toString()
      addNotification({
        type: 'warning',
        message,
        duration,
      })
      if (duration) {
        setTimeout(() => removeNotification(id), duration)
      }
    },
    info: (message: string, duration = 3000) => {
      const id = Date.now().toString()
      addNotification({
        type: 'info',
        message,
        duration,
      })
      if (duration) {
        setTimeout(() => removeNotification(id), duration)
      }
    },
  }
}
```

## 2. Authentication & Permissions Store

**Purpose:** Store admin role and granular permissions

**File: `src/stores/adminAuthStore.ts`**

```ts
import { create } from 'zustand'
import { AdminRole } from '@/types/admin'

export type Permission =
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'sites:read'
  | 'sites:create'
  | 'sites:update'
  | 'sites:delete'
  | 'shuttles:read'
  | 'shuttles:create'
  | 'shuttles:update'
  | 'shuttles:delete'
  | 'analytics:read'
  | 'admin:manage_admins'
  | 'admin:view_logs'

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'sites:read',
    'sites:create',
    'sites:update',
    'sites:delete',
    'shuttles:read',
    'shuttles:create',
    'shuttles:update',
    'shuttles:delete',
    'analytics:read',
    'admin:manage_admins',
    'admin:view_logs',
  ],
  admin: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'sites:read',
    'sites:create',
    'sites:update',
    'sites:delete',
    'shuttles:read',
    'shuttles:create',
    'shuttles:update',
    'shuttles:delete',
    'analytics:read',
    'admin:view_logs',
  ],
  moderator: [
    'users:read',
    'users:update',
    'sites:read',
    'sites:create',
    'sites:update',
    'shuttles:read',
    'shuttles:update',
    'analytics:read',
    'admin:view_logs',
  ],
  user: [],
}

export interface AdminAuthState {
  isAdmin: boolean
  adminRole: AdminRole | null
  permissions: Set<Permission>
  
  // Actions
  setAdminStatus: (
    isAdmin: boolean,
    role: AdminRole | null,
    permissions?: Permission[]
  ) => void
  
  checkPermission: (permission: Permission) => boolean
  checkAnyPermission: (permissions: Permission[]) => boolean
  checkAllPermissions: (permissions: Permission[]) => boolean
  
  canRead: (resource: 'users' | 'sites' | 'shuttles' | 'analytics') => boolean
  canCreate: (resource: 'users' | 'sites' | 'shuttles') => boolean
  canUpdate: (resource: 'users' | 'sites' | 'shuttles') => boolean
  canDelete: (resource: 'users' | 'sites' | 'shuttles') => boolean
  
  reset: () => void
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  isAdmin: false,
  adminRole: null,
  permissions: new Set(),
  
  setAdminStatus: (isAdmin, role, permissions) =>
    set({
      isAdmin,
      adminRole: role,
      permissions: new Set(permissions || (role ? ROLE_PERMISSIONS[role] : [])),
    }),
  
  checkPermission: (permission) => {
    const { permissions } = get()
    return permissions.has(permission)
  },
  
  checkAnyPermission: (permissions) => {
    const { checkPermission } = get()
    return permissions.some((p) => checkPermission(p))
  },
  
  checkAllPermissions: (permissions) => {
    const { checkPermission } = get()
    return permissions.every((p) => checkPermission(p))
  },
  
  canRead: (resource) => {
    const { checkPermission } = get()
    return checkPermission(`${resource}:read` as Permission)
  },
  
  canCreate: (resource) => {
    const { checkPermission } = get()
    return checkPermission(`${resource}:create` as Permission)
  },
  
  canUpdate: (resource) => {
    const { checkPermission } = get()
    return checkPermission(`${resource}:update` as Permission)
  },
  
  canDelete: (resource) => {
    const { checkPermission } = get()
    return checkPermission(`${resource}:delete` as Permission)
  },
  
  reset: () =>
    set({
      isAdmin: false,
      adminRole: null,
      permissions: new Set(),
    }),
}))

// Hook for using in components
export const useAdminPermission = () => {
  const state = useAdminAuthStore()
  return {
    isAdmin: state.isAdmin,
    role: state.adminRole,
    check: state.checkPermission,
    can: {
      read: state.canRead,
      create: state.canCreate,
      update: state.canUpdate,
      delete: state.canDelete,
    },
  }
}
```

## 3. Filter Store

**Purpose:** Manage filter state across all admin modules independently

**File: `src/stores/adminFilterStore.ts`**

```ts
import { create } from 'zustand'
import { UserStatus, DiveSiteDifficulty, ShuttleStatus } from '@/types/admin'

export interface UsersFilters {
  search?: string
  role?: 'admin' | 'moderator' | 'user'
  status?: UserStatus
  joinedAfter?: Date
  joinedBefore?: Date
}

export interface DiveSitesFilters {
  search?: string
  difficulty?: DiveSiteDifficulty
  minDepth?: number
  maxDepth?: number
  location?: string
}

export interface ShuttlesFilters {
  search?: string
  status?: ShuttleStatus
  minCapacity?: number
  maxCapacity?: number
}

export interface AdminFilterState {
  usersFilters: UsersFilters
  diveSitesFilters: DiveSitesFilters
  shuttlesFilters: ShuttlesFilters
  
  // Users filters
  setUsersFilters: (filters: UsersFilters) => void
  updateUsersFilter: (key: keyof UsersFilters, value: any) => void
  clearUsersFilters: () => void
  
  // Dive Sites filters
  setDiveSitesFilters: (filters: DiveSitesFilters) => void
  updateDiveSitesFilter: (key: keyof DiveSitesFilters, value: any) => void
  clearDiveSitesFilters: () => void
  
  // Shuttles filters
  setShuttlesFilters: (filters: ShuttlesFilters) => void
  updateShuttlesFilter: (key: keyof ShuttlesFilters, value: any) => void
  clearShuttlesFilters: () => void
}

export const useAdminFilterStore = create<AdminFilterState>((set) => ({
  usersFilters: {},
  diveSitesFilters: {},
  shuttlesFilters: {},
  
  // Users
  setUsersFilters: (filters) => set({ usersFilters: filters }),
  updateUsersFilter: (key, value) =>
    set((state) => ({
      usersFilters: {
        ...state.usersFilters,
        [key]: value || undefined,
      },
    })),
  clearUsersFilters: () => set({ usersFilters: {} }),
  
  // Dive Sites
  setDiveSitesFilters: (filters) => set({ diveSitesFilters: filters }),
  updateDiveSitesFilter: (key, value) =>
    set((state) => ({
      diveSitesFilters: {
        ...state.diveSitesFilters,
        [key]: value || undefined,
      },
    })),
  clearDiveSitesFilters: () => set({ diveSitesFilters: {} }),
  
  // Shuttles
  setShuttlesFilters: (filters) => set({ shuttlesFilters: filters }),
  updateShuttlesFilter: (key, value) =>
    set((state) => ({
      shuttlesFilters: {
        ...state.shuttlesFilters,
        [key]: value || undefined,
      },
    })),
  clearShuttlesFilters: () => set({ shuttlesFilters: {} }),
}))
```

## 4. Table State Store (Factory Pattern)

**Purpose:** Manage per-table state (pagination, sorting, selection)

**File: `src/stores/adminTableStore.ts`**

```ts
import { create, StoreApi, UseBoundStore } from 'zustand'

export interface TableState {
  selectedRows: Set<string>
  sortBy: string | null
  sortOrder: 'asc' | 'desc'
  currentPage: number
  pageSize: number
  
  // Actions
  toggleRowSelection: (id: string) => void
  selectAllRows: (ids: string[]) => void
  clearSelection: () => void
  isRowSelected: (id: string) => boolean
  getSelectedCount: () => number
  
  setSort: (column: string, order: 'asc' | 'desc') => void
  toggleSort: (column: string) => void
  
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  
  setPageSize: (size: number) => void
  
  reset: () => void
}

// Factory function to create table stores
export const createTableStore = (): UseBoundStore<StoreApi<TableState>> =>
  create<TableState>((set, get) => ({
    selectedRows: new Set(),
    sortBy: null,
    sortOrder: 'asc',
    currentPage: 1,
    pageSize: 25,
    
    toggleRowSelection: (id) =>
      set((state) => {
        const newSelected = new Set(state.selectedRows)
        if (newSelected.has(id)) {
          newSelected.delete(id)
        } else {
          newSelected.add(id)
        }
        return { selectedRows: newSelected }
      }),
    
    selectAllRows: (ids) => set({ selectedRows: new Set(ids) }),
    
    clearSelection: () => set({ selectedRows: new Set() }),
    
    isRowSelected: (id) => {
      const { selectedRows } = get()
      return selectedRows.has(id)
    },
    
    getSelectedCount: () => {
      const { selectedRows } = get()
      return selectedRows.size
    },
    
    setSort: (column, order) => set({ sortBy: column, sortOrder: order }),
    
    toggleSort: (column) =>
      set((state) => ({
        sortBy: column,
        sortOrder:
          state.sortBy === column && state.sortOrder === 'asc'
            ? 'desc'
            : 'asc',
      })),
    
    setPage: (page) => set({ currentPage: page }),
    
    nextPage: () => set((state) => ({ currentPage: state.currentPage + 1 })),
    
    prevPage: () =>
      set((state) => ({
        currentPage: Math.max(1, state.currentPage - 1),
      })),
    
    setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
    
    reset: () =>
      set({
        selectedRows: new Set(),
        sortBy: null,
        sortOrder: 'asc',
        currentPage: 1,
        pageSize: 25,
      }),
  }))

// Create separate stores for each module
export const useUsersTableStore = createTableStore()
export const useDiveSitesTableStore = createTableStore()
export const useShuttlesTableStore = createTableStore()
```

## 5. Usage Examples in Components

### Example 1: Using Admin Store in a Component

```tsx
import { useAdminStore, useNotification } from '@/stores/adminStore'

export function UserListHeader() {
  const { addNotification } = useAdminStore()
  const notify = useNotification()
  
  const handleRefresh = async () => {
    try {
      notify.info('Refreshing...')
      // API call
      notify.success('Data refreshed successfully')
    } catch (error) {
      notify.error('Failed to refresh data')
    }
  }
  
  return <button onClick={handleRefresh}>Refresh</button>
}
```

### Example 2: Using Table Store with Filters

```tsx
import { useUsersTableStore } from '@/stores/adminTableStore'
import { useAdminFilterStore } from '@/stores/adminFilterStore'

export function UsersTable() {
  const tableStore = useUsersTableStore()
  const { usersFilters, updateUsersFilter } = useAdminFilterStore()
  
  const handleSort = (column: string) => {
    tableStore.toggleSort(column)
  }
  
  const handleFilterChange = (key: string, value: any) => {
    updateUsersFilter(key as any, value)
  }
  
  return (
    <>
      <FilterPanel onChange={handleFilterChange} />
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>Name</th>
            {/* more headers */}
          </tr>
        </thead>
      </table>
    </>
  )
}
```

### Example 3: Permission Checking in Components

```tsx
import { useAdminPermission } from '@/stores/adminAuthStore'

export function UserActions({ userId }: { userId: string }) {
  const { can } = useAdminPermission()
  
  if (!can.read('users')) {
    return <div>No access</div>
  }
  
  return (
    <div className="space-x-2">
      {can.update('users') && <button>Edit</button>}
      {can.delete('users') && <button>Delete</button>}
    </div>
  )
}
```

### Example 4: Modal Management

```tsx
import { useAdminStore } from '@/stores/adminStore'

export function DeleteUserButton({ userId, userName }: any) {
  const { openDeleteModal } = useAdminStore()
  
  const handleDelete = () => {
    openDeleteModal({
      title: 'Delete User?',
      message: `Are you sure you want to delete "${userName}"?`,
      onConfirm: async () => {
        await deleteUser(userId)
      },
    })
  }
  
  return <button onClick={handleDelete}>Delete</button>
}
```

## Best Practices

### 1. Selector Hooks to Avoid Unnecessary Re-renders

```ts
// Instead of destructuring everything
const { notifications, addNotification } = useAdminStore()

// Use selectors for specific data
const notifications = useAdminStore((state) => state.notifications)
const addNotification = useAdminStore((state) => state.addNotification)
```

### 2. Separate Concerns

- **useAdminStore**: UI state (sidebar, modals, notifications)
- **useAdminAuthStore**: Authentication & permissions
- **useAdminFilterStore**: Filter state per module
- **useXxxTableStore**: Pagination, sorting, selection per module

### 3. Reset State on Module Change

```ts
useEffect(() => {
  usersTableStore.reset()
  return () => {
    // Optional cleanup
  }
}, [])
```

### 4. Persist Where Appropriate

Use `persist` middleware only for:
- Sidebar state (user preference)
- Page size (user preference)

Don't persist:
- Filter values (should reset when navigating)
- Selected rows (security concern)
- Auth state (use server-side sessions)

---

This Zustand architecture provides:
✅ Clear separation of concerns
✅ Easy to test and debug
✅ Scalable for adding new modules
✅ Type-safe with TypeScript
✅ Performant with granular selectors
