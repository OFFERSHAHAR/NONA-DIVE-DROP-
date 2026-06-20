# DIVE DROP Admin Panel - Implementation Checklist

## Phase 1: Foundation (Days 1-2)

### Directory Structure
- [ ] Create `src/app/[locale]/admin/` structure
- [ ] Create `src/components/admin/` subdirectories
- [ ] Create `src/stores/` directory
- [ ] Create `src/hooks/admin/` directory
- [ ] Create `src/types/admin.ts`
- [ ] Create `src/utils/admin/` directory
- [ ] Create `src/app/api/admin/` directory

### Type Definitions
- [ ] Define `AdminRole` enum
- [ ] Define `UserStatus`, `DiveSiteDifficulty`, `ShuttleStatus` types
- [ ] Create `AdminUser` interface
- [ ] Create `DiveSite` interface
- [ ] Create `Shuttle` interface
- [ ] Create `ApiResponse<T>` generic
- [ ] Create `PaginationMeta` interface
- [ ] Create validators with Zod
  - [ ] `userFormSchema`
  - [ ] `diveSiteFormSchema`
  - [ ] `shuttleFormSchema`

### Zustand Stores
- [ ] Create `adminStore.ts` with:
  - [ ] sidebarOpen state
  - [ ] currentModule state
  - [ ] notifications array
  - [ ] modals object
  - [ ] toggleSidebar action
  - [ ] addNotification action
  - [ ] openDeleteModal action
- [ ] Create `adminAuthStore.ts` with:
  - [ ] isAdmin boolean
  - [ ] adminRole
  - [ ] permissions Set
  - [ ] checkPermission method
  - [ ] canRead/canCreate/canUpdate/canDelete methods
  - [ ] ROLE_PERMISSIONS mapping
- [ ] Create `adminFilterStore.ts` with:
  - [ ] usersFilters state
  - [ ] diveSitesFilters state
  - [ ] shuttlesFilters state
  - [ ] Filter update methods
- [ ] Create `adminTableStore.ts` with:
  - [ ] createTableStore factory
  - [ ] useUsersTableStore
  - [ ] useDiveSitesTableStore
  - [ ] useShuttlesTableStore

### Middleware & Auth
- [ ] Create `middleware/admin-auth.ts`
- [ ] Add admin route protection
- [ ] Create `/api/auth/admin-check` endpoint

---

## Phase 2: Core Components (Days 2-3)

### Layout Components
- [ ] Create `AdminLayout.tsx`
  - [ ] Wrap with auth check
  - [ ] Two-column layout (sidebar + main)
  - [ ] Pass locale prop
- [ ] Create `AdminSidebar.tsx`
  - [ ] Collapsible on mobile
  - [ ] Navigation items array
  - [ ] Active state highlighting
  - [ ] RTL support (sidebar position)
- [ ] Create `AdminHeader.tsx`
  - [ ] Breadcrumb/page title
  - [ ] Search bar (optional)
  - [ ] User dropdown
  - [ ] Notifications bell
- [ ] Create `AdminContainer.tsx`
  - [ ] Max-width wrapper
  - [ ] Padding/spacing
  - [ ] Background color

### Table Components
- [ ] Create `DataTable.tsx` (generic)
  - [ ] Column definitions
  - [ ] Row rendering
  - [ ] Sortable headers
  - [ ] Selectable rows (checkboxes)
  - [ ] Loading skeleton
  - [ ] Empty state
  - [ ] Responsive (card view on mobile)
- [ ] Create `TableHeader.tsx`
  - [ ] Column names
  - [ ] Sort indicator
  - [ ] Sort direction toggle
- [ ] Create `TableRow.tsx`
  - [ ] Checkbox for selection
  - [ ] Cell data
  - [ ] Hover state
  - [ ] Click handler
- [ ] Create `TableActions.tsx`
  - [ ] Edit button
  - [ ] Delete button
  - [ ] View button (optional)
  - [ ] More options (⋮) dropdown
- [ ] Create `UsersTable.tsx` (specific)
  - [ ] Extend DataTable
  - [ ] User-specific columns
  - [ ] Format date columns
  - [ ] Status badge
- [ ] Create `DiveSitesTable.tsx` (specific)
- [ ] Create `ShuttlesTable.tsx` (specific)
- [ ] Create `AdminPagination.tsx`
  - [ ] Page numbers
  - [ ] Previous/Next buttons
  - [ ] Page size selector
  - [ ] Total count display

### Form Components
- [ ] Create `FormField.tsx`
  - [ ] Label
  - [ ] Input wrapper
  - [ ] Error message
  - [ ] Required indicator
- [ ] Create `FormSection.tsx`
  - [ ] Section title
  - [ ] Group of fields
- [ ] Create `SubmitButton.tsx`
  - [ ] Loading state
  - [ ] Disabled state
  - [ ] Loading spinner
- [ ] Create `UserForm.tsx`
  - [ ] Email field
  - [ ] Name field
  - [ ] Password field (for create)
  - [ ] Role select
  - [ ] Status radios
  - [ ] Form submission
  - [ ] Validation errors
- [ ] Create `DiveSiteForm.tsx`
  - [ ] Name field
  - [ ] Location field
  - [ ] Coordinates (lat/long)
  - [ ] Depth fields
  - [ ] Difficulty select
  - [ ] Description textarea
  - [ ] Image upload
- [ ] Create `ShuttleForm.tsx`
  - [ ] Name field
  - [ ] Capacity field
  - [ ] Driver field
  - [ ] License field
  - [ ] Status select

### Modal Components
- [ ] Create `AdminModal.tsx` (base)
  - [ ] Open/close animation
  - [ ] Title
  - [ ] Content
  - [ ] Footer with actions
  - [ ] Close button (X)
  - [ ] Backdrop click to close
- [ ] Create `DeleteConfirmModal.tsx`
  - [ ] Warning icon
  - [ ] Confirmation checkbox
  - [ ] Delete button (red)
  - [ ] Cancel button
- [ ] Create `BulkActionModal.tsx`
  - [ ] Action selection
  - [ ] Confirmation
  - [ ] Progress indicator
- [ ] Create `ExportModal.tsx`
  - [ ] Format selection (CSV, JSON)
  - [ ] Column selection
  - [ ] Export button

### Filter Components
- [ ] Create `FilterPanel.tsx`
  - [ ] Collapsible panel
  - [ ] Filter fields
  - [ ] Clear button
  - [ ] Apply button
- [ ] Create `FilterField.tsx`
  - [ ] Label
  - [ ] Input/Select/Checkbox
- [ ] Create `SearchFilter.tsx`
  - [ ] Text input
  - [ ] Debounce search
- [ ] Create `DateRangeFilter.tsx`
  - [ ] From date
  - [ ] To date

### Dashboard Components
- [ ] Create `StatsCard.tsx`
  - [ ] Icon
  - [ ] Title
  - [ ] Value
  - [ ] Trend indicator (↑↓)
  - [ ] Percentage change
- [ ] Create `ChartCard.tsx`
  - [ ] Title
  - [ ] Chart component (placeholder)
  - [ ] Loading state

### Shared Components
- [ ] Create `AdminBadge.tsx`
  - [ ] Status colors
  - [ ] Configurable variants
- [ ] Create `AdminLoadingSpinner.tsx`
- [ ] Create `AdminEmptyState.tsx`
  - [ ] Icon
  - [ ] Message
  - [ ] Action button (optional)
- [ ] Create `AdminToast.tsx`
  - [ ] Toast container
  - [ ] Multiple toasts
  - [ ] Auto-dismiss
- [ ] Create `AdminButton.tsx` (variants)

---

## Phase 3: CRUD Pages (Days 3-5)

### Admin Layout Page
- [ ] Create `src/app/[locale]/admin/layout.tsx`
  - [ ] AdminLayout wrapper
  - [ ] NextIntlClientProvider
  - [ ] Auth check
- [ ] Create `src/app/[locale]/admin/page.tsx`
  - [ ] Dashboard page
  - [ ] Stats cards
  - [ ] Charts
  - [ ] Recent activity widget

### Users Module
- [ ] Create `src/app/[locale]/admin/users/page.tsx`
  - [ ] Users list
  - [ ] FilterPanel
  - [ ] UsersTable
  - [ ] Create button
- [ ] Create `src/app/[locale]/admin/users/create/page.tsx`
  - [ ] UserForm
  - [ ] Form submission handler
  - [ ] Success/error notification
- [ ] Create `src/app/[locale]/admin/users/[id]/page.tsx`
  - [ ] Load user data
  - [ ] Toggle edit mode
  - [ ] Show user details or form
  - [ ] Delete button
- [ ] Create `src/app/[locale]/admin/users/[id]/delete/page.tsx`
  - [ ] DeleteConfirmModal
  - [ ] Confirm handler
  - [ ] Redirect on success

### Dive Sites Module
- [ ] Create `src/app/[locale]/admin/dive-sites/page.tsx`
  - [ ] Dive sites list
  - [ ] FilterPanel
  - [ ] DiveSitesTable
  - [ ] Map view (optional)
- [ ] Create `src/app/[locale]/admin/dive-sites/create/page.tsx`
  - [ ] DiveSiteForm
  - [ ] Image upload handler
  - [ ] Success notification
- [ ] Create `src/app/[locale]/admin/dive-sites/[id]/page.tsx`
  - [ ] Load site data
  - [ ] Edit mode
  - [ ] Display on map
- [ ] Create `src/app/[locale]/admin/dive-sites/[id]/delete/page.tsx`

### Shuttles Module
- [ ] Create `src/app/[locale]/admin/shuttles/page.tsx`
  - [ ] Shuttles list
  - [ ] FilterPanel
  - [ ] ShuttlesTable
- [ ] Create `src/app/[locale]/admin/shuttles/create/page.tsx`
  - [ ] ShuttleForm
  - [ ] Success notification
- [ ] Create `src/app/[locale]/admin/shuttles/[id]/page.tsx`
  - [ ] Load shuttle data
  - [ ] Edit mode
- [ ] Create `src/app/[locale]/admin/shuttles/[id]/delete/page.tsx`

### Analytics Page
- [ ] Create `src/app/[locale]/admin/analytics/page.tsx`
  - [ ] StatsCards (KPIs)
  - [ ] Line chart (bookings over time)
  - [ ] Pie chart (users by role)
  - [ ] Bar chart (shuttle utilization)
  - [ ] Date range filter

### Activity Log Page
- [ ] Create `src/app/[locale]/admin/activity-log/page.tsx`
  - [ ] Activity table
  - [ ] Timestamp column
  - [ ] User column
  - [ ] Action column
  - [ ] Details column
  - [ ] Filters (action type, user, date)

### Settings Page
- [ ] Create `src/app/[locale]/admin/settings/page.tsx`
  - [ ] Admin settings form
  - [ ] Notification preferences
  - [ ] System configuration

---

## Phase 4: Hooks & Integration (Day 4)

### Custom Hooks
- [ ] Create `hooks/admin/useAdminAuth.ts`
  - [ ] Verify admin status
  - [ ] Redirect if not admin
- [ ] Create `hooks/admin/useAdminApi.ts`
  - [ ] Fetch data
  - [ ] Handle loading/error
  - [ ] Support filters
- [ ] Create `hooks/admin/useAdminForm.ts`
  - [ ] Form state management
  - [ ] Validation
  - [ ] Error handling
  - [ ] Submit handler
- [ ] Create `hooks/admin/useAdminNotification.ts`
  - [ ] Notify helper functions
  - [ ] Auto-dismiss timers

### Utilities
- [ ] Create `utils/admin/formatters.ts`
  - [ ] formatDate
  - [ ] formatCurrency
  - [ ] formatNumber
  - [ ] formatStatus
- [ ] Create `utils/admin/permissions.ts`
  - [ ] checkPermission helper
  - [ ] buildRolePermissions
- [ ] Create `utils/admin/export.ts`
  - [ ] exportToCSV
  - [ ] exportToJSON
- [ ] Create `utils/admin/validators.ts`
  - [ ] Zod schemas
  - [ ] Custom validation functions

---

## Phase 5: API Routes (Day 5)

### Users API
- [ ] Create `src/app/api/admin/users/route.ts`
  - [ ] GET (list with pagination, sorting, filtering)
  - [ ] POST (create user)
- [ ] Create `src/app/api/admin/users/[id]/route.ts`
  - [ ] GET (user detail)
  - [ ] PUT (update user)
  - [ ] DELETE (delete user)
- [ ] Create `src/app/api/admin/users/bulk/route.ts`
  - [ ] POST (bulk actions)

### Dive Sites API
- [ ] Create `src/app/api/admin/dive-sites/route.ts`
  - [ ] GET (list)
  - [ ] POST (create)
- [ ] Create `src/app/api/admin/dive-sites/[id]/route.ts`
  - [ ] GET (detail)
  - [ ] PUT (update)
  - [ ] DELETE (delete)

### Shuttles API
- [ ] Create `src/app/api/admin/shuttles/route.ts`
  - [ ] GET (list)
  - [ ] POST (create)
- [ ] Create `src/app/api/admin/shuttles/[id]/route.ts`
  - [ ] GET (detail)
  - [ ] PUT (update)
  - [ ] DELETE (delete)

### Analytics API
- [ ] Create `src/app/api/admin/analytics/route.ts`
  - [ ] GET (stats and metrics)

### Activity Log API
- [ ] Create `src/app/api/admin/activity-log/route.ts`
  - [ ] GET (activity history)
  - [ ] POST (log activity)

### Auth API
- [ ] Create `src/app/api/auth/admin-check/route.ts`
  - [ ] Check admin status
  - [ ] Return role and permissions

---

## Phase 6: Advanced Features (Days 5-6)

### Data Export
- [ ] Implement CSV export
- [ ] Implement JSON export
- [ ] Add export button to each list page
- [ ] Add column selection to export

### Bulk Operations
- [ ] Implement bulk select all
- [ ] Implement bulk status change
- [ ] Implement bulk delete
- [ ] Add bulk actions modal

### Activity Logging
- [ ] Log all CRUD operations
- [ ] Track user changes
- [ ] Track IP addresses
- [ ] Create activity log table schema

### Search
- [ ] Implement global search (optional)
- [ ] Implement per-module search
- [ ] Add search debouncing

### Notifications
- [ ] Implement toast notifications
- [ ] Add auto-dismiss timers
- [ ] Add notification icons

---

## Phase 7: RTL Support (Day 6)

### Layout RTL
- [ ] Update sidebar positioning
- [ ] Adjust form layouts
- [ ] Reverse flex directions
- [ ] Update padding/margins

### Text Direction
- [ ] Update text alignment
- [ ] Update icon placement
- [ ] Update button layouts

### Locale Support
- [ ] Create i18n admin messages
- [ ] Add Hebrew translations
- [ ] Add English translations
- [ ] Update form labels

---

## Phase 8: Mobile Responsiveness (Day 6)

### Sidebar
- [ ] Hide sidebar on mobile
- [ ] Add hamburger menu
- [ ] Slide-out overlay menu

### Tables
- [ ] Switch to card view on mobile
- [ ] Stack columns vertically
- [ ] Hide non-essential columns
- [ ] Horizontal scroll option

### Forms
- [ ] Single column on mobile
- [ ] Full-width inputs
- [ ] Touch-friendly buttons
- [ ] Larger input heights

### Modals
- [ ] Full-screen on mobile
- [ ] Bottom sheet option
- [ ] Touch-friendly buttons

---

## Phase 9: Testing (Days 7-8)

### Unit Tests
- [ ] Test form validation
- [ ] Test permission checks
- [ ] Test formatters
- [ ] Test utility functions

### Integration Tests
- [ ] Test table with sorting
- [ ] Test table with filtering
- [ ] Test form submission
- [ ] Test modal interactions

### E2E Tests (Playwright)
- [ ] Test login to admin panel
- [ ] Test user creation flow
- [ ] Test user edit flow
- [ ] Test user delete flow
- [ ] Test filters and search
- [ ] Test permissions enforcement
- [ ] Test RTL rendering
- [ ] Test mobile responsiveness

### Accessibility Tests
- [ ] Check contrast ratios
- [ ] Test keyboard navigation
- [ ] Test screen reader
- [ ] Test focus management
- [ ] Verify ARIA labels

---

## Phase 10: Polish & Documentation (Days 8-10)

### Code Quality
- [ ] Fix all linting errors
- [ ] Remove console.logs
- [ ] Add TypeScript strict mode
- [ ] Optimize bundle size

### Performance
- [ ] Implement code splitting
- [ ] Add React.lazy for components
- [ ] Optimize images
- [ ] Add table virtualization (for 1000+ rows)

### Documentation
- [ ] Add JSDoc comments
- [ ] Document component props
- [ ] Document Zustand stores
- [ ] Create API documentation
- [ ] Create user guide

### Deployment
- [ ] Set up environment variables
- [ ] Configure CORS if needed
- [ ] Set up logging/monitoring
- [ ] Configure database backups
- [ ] Create admin user role

---

## Final Verification Checklist

### Functionality
- [ ] All CRUD operations work (Users)
- [ ] All CRUD operations work (Dive Sites)
- [ ] All CRUD operations work (Shuttles)
- [ ] Filtering works on all tables
- [ ] Sorting works on all tables
- [ ] Pagination works on all tables
- [ ] Bulk actions work
- [ ] Delete confirmations work
- [ ] Form validation works
- [ ] Error handling works

### UI/UX
- [ ] Pages are visually consistent
- [ ] Colors match design system
- [ ] Typography is correct
- [ ] Spacing is consistent
- [ ] Buttons are clickable (50px+ height)
- [ ] Loading states are visible
- [ ] Error messages are clear
- [ ] Success messages are shown
- [ ] Empty states are shown

### RTL
- [ ] Sidebar position correct for Hebrew
- [ ] Text alignment correct
- [ ] Form layouts correct
- [ ] Modal layouts correct
- [ ] All text is in correct language

### Responsive
- [ ] Works on mobile (375px)
- [ ] Works on tablet (768px)
- [ ] Works on desktop (1440px)
- [ ] Touch targets are 44px+ minimum
- [ ] Sidebar collapses on mobile
- [ ] Tables become cards on mobile

### Security
- [ ] Admin routes are protected
- [ ] API endpoints check permissions
- [ ] Form inputs are validated
- [ ] XSS prevention implemented
- [ ] SQL injection prevention implemented
- [ ] CSRF protection enabled
- [ ] Activity is logged

### Accessibility
- [ ] Color contrast is WCAG AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus visible on all buttons
- [ ] Form labels are associated
- [ ] Error messages are linked to fields
- [ ] Modals trap focus

### Performance
- [ ] Initial load < 2 seconds
- [ ] API responses < 500ms
- [ ] Table renders < 1 second
- [ ] No console errors
- [ ] No console warnings
- [ ] Bundle size < 250KB (gzipped)

---

## Timeline Summary

```
Phase 1: Foundation          | Days 1-2   | Types, Stores, Middleware
Phase 2: Core Components     | Days 2-3   | Layout, Tables, Forms, Modals
Phase 3: CRUD Pages         | Days 3-5   | Users, Sites, Shuttles modules
Phase 4: Hooks & API        | Day 4      | Custom hooks, utilities
Phase 5: API Routes         | Day 5      | Backend endpoints
Phase 6: Advanced Features  | Days 5-6   | Export, bulk actions, logging
Phase 7: RTL Support        | Day 6      | Hebrew translations
Phase 8: Responsiveness     | Day 6      | Mobile optimizations
Phase 9: Testing            | Days 7-8   | Unit, integration, E2E tests
Phase 10: Polish & Deploy   | Days 8-10  | Documentation, optimization

Total: 8-10 working days
```

---

## Success Criteria

✅ All three CRUD modules (Users, Sites, Shuttles) fully functional
✅ Full RTL support for Hebrew
✅ Mobile-responsive design
✅ Permission-based access control
✅ Activity logging
✅ All tests passing
✅ Performance targets met
✅ Documentation complete
✅ No critical bugs
✅ Accessibility compliant

---

**Status**: Ready for implementation
**Start Date**: [TBD]
**Estimated Completion**: [Start Date] + 10 days
**Team Size Recommended**: 2-3 developers
