# DIVE DROP Admin Panel - UI Wireframes

## 1. ADMIN DASHBOARD (Home)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DiveDrop                            🔍  🔔  👤                            │
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ DASH    │  Dashboard › Home                                             │
│ ─────   │                                                               │
│ Users   │  ┌─────────────────────────────────────────────────────────┐  │
│ Dive    │  │ Welcome back, Admin! 👋                                 │  │
│ Sites   │  │ Last login: Today at 2:30 PM                            │  │
│ Shuttles│  └─────────────────────────────────────────────────────────┘  │
│ ─────   │                                                               │
│ Analytics  ┌──────────────┬──────────────┬──────────────┬─────────────┐ │
│ Activity   │ Total Users  │ Dive Sites   │ Shuttles     │ Bookings    │ │
│ Log        │ 1,234        │ 48           │ 12           │ 523         │ │
│ ─────      │ ↑ 5%         │ ↑ 2%         │ ↓ 1%         │ ↑ 12%       │ │
│ Settings   └──────────────┴──────────────┴──────────────┴─────────────┘ │
│            ┌────────────────────────┬──────────────────────────────────┐ │
│            │ Recent Activity         │ System Health                    │ │
│            │ ────────────────────── │ ──────────────────────────────── │ │
│            │ New user signup (2h)   │ API Response: 45ms ✓              │ │
│            │ Dive site created (5h) │ Database: Healthy ✓              │ │
│            │ Booking confirmed (8h) │ Storage: 65% Used ⚠️              │ │
│            └────────────────────────┴──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. USERS LIST PAGE

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DiveDrop                            🔍  🔔  👤                            │
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ DASH    │  Admin › Users Management                                     │
│ ─────   │  ┌──────────────────────────────────────────────────┐        │
│ Users ◄─│  │ [+ Add User]  [⋮ Bulk Actions] [🔄 Refresh]     │        │
│ Dive    │  │ [Filters ▼] Search: [______________]             │        │
│ Sites   │  └──────────────────────────────────────────────────┘        │
│ Shuttles│                                                               │
│ ─────   │  ┌──────────────────────────────────────────────────────────┐│
│ Analytics  │ ☐ Email               │ Name      │ Role      │ Status   ││
│ Activity   │─────────────────────────────────────────────────────────── ││
│ Log        │ ☑ john@dive.com       │ John D.   │ Admin     │ Active  ││
│ ─────      │ ☐ sarah@dive.com      │ Sarah M.  │ User      │ Active  ││
│ Settings   │ ☐ mike@dive.com       │ Mike J.   │ Moderator │ Inactive││
│            │ ☐ emma@dive.com       │ Emma K.   │ User      │ Active  ││
│            │ ☐ alex@dive.com       │ Alex W.   │ User      │ Pending ││
│            │                                                            ││
│            │ [Edit] [Delete]  1 of 50 selected (25 per page)           ││
│            │                    [< 1 2 3 ... >]                        ││
│            └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Filter Panel (Expanded)

```
┌─────────────────────────────────┐
│ Filters                      ✕   │
├─────────────────────────────────┤
│ Search                          │
│ [__________________________]    │
│                                 │
│ Role                            │
│ ☑ Admin  ☐ Moderator  ☐ User   │
│                                 │
│ Status                          │
│ ☑ Active  ☑ Inactive  ☐ Pending │
│                                 │
│ Joined Date                     │
│ From [___________]              │
│ To   [___________]              │
│                                 │
│ [Clear All]  [Apply]            │
└─────────────────────────────────┘
```

## 3. USER CREATE/EDIT FORM

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DiveDrop                            🔍  🔔  👤                            │
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ Users ◄─│  Admin › Users › Create New User                              │
│         │  [← Back to Users List]                                       │
│         │                                                               │
│         │  ┌─────────────────────────────────────────────────────────┐  │
│         │  │ Personal Information                                    │  │
│         │  ├─────────────────────────────────────────────────────────┤  │
│         │  │                                                         │  │
│         │  │ Email Address *                                         │  │
│         │  │ [_______________________________@example.com]          │  │
│         │  │ error: "Email already exists"                         │  │
│         │  │                                                         │  │
│         │  │ Full Name *                                             │  │
│         │  │ [___________________________]                           │  │
│         │  │                                                         │  │
│         │  │ Phone Number                                            │  │
│         │  │ [___________________________]                           │  │
│         │  │                                                         │  │
│         │  │ ┌──────────────────┬──────────────────┐                │  │
│         │  │ │ Password *       │ Confirm Password │                │  │
│         │  │ │ [__________]     │ [__________]     │                │  │
│         │  │ │ ✓ Strong (85%)   │ ✓ Matches        │                │  │
│         │  │ └──────────────────┴──────────────────┘                │  │
│         │  └─────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         │  ┌─────────────────────────────────────────────────────────┐  │
│         │  │ Permissions & Role                                      │  │
│         │  ├─────────────────────────────────────────────────────────┤  │
│         │  │                                                         │  │
│         │  │ User Role *                                             │  │
│         │  │ ◉ User (limited access)                                 │  │
│         │  │ ○ Moderator (manage content)                            │  │
│         │  │ ○ Admin (full access)                                   │  │
│         │  │                                                         │  │
│         │  │ Status *                                                │  │
│         │  │ ◉ Active    ○ Inactive    ○ Suspended                   │  │
│         │  │                                                         │  │
│         │  │ ☑ Email verified                                        │  │
│         │  │ ☑ Accept terms                                          │  │
│         │  │ ☐ Newsletter subscription                               │  │
│         │  │                                                         │  │
│         │  └─────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         │  [Cancel]  [Save User]                                        │
│         │                                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4. DIVE SITES LIST PAGE

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DiveDrop                            🔍  🔔  👤                            │
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ Dive    │  Admin › Dive Sites Management                                │
│ Sites ◄─│  ┌──────────────────────────────────────────────────┐        │
│         │  │ [+ Add Site]  [Map View]  [🔄 Refresh]           │        │
│         │  │ [Filters ▼] Search: [______________]             │        │
│         │  └──────────────────────────────────────────────────┘        │
│         │                                                               │
│         │  ┌──────────────────────────────────────────────────────────┐│
│         │  │ ☐ Site Name         │ Location    │ Depth │ Difficulty ││
│         │  │────────────────────────────────────────────────────────── ││
│         │  │ ☐ Blue Hole         │ Belize      │ 124m  │ Advanced   ││
│         │  │ ☐ Great Barrier     │ Australia   │ 40m   │ Beginner   ││
│         │  │ ☐ Barents Sea       │ Norway      │ 120m  │ Advanced   ││
│         │  │ ☐ Red Sea Drop      │ Egypt       │ 200m  │ Advanced   ││
│         │  │ ☐ Caribbean Reef    │ Bahamas     │ 30m   │ Intermediate││
│         │  │                                                            ││
│         │  │ [Edit] [Delete] [Map]  1-5 of 48 sites                    ││
│         │  │                    [< 1 2 3 ... >]                        ││
│         │  └──────────────────────────────────────────────────────────┘│
│         │                                                               │
│         │  Map View (Optional)                                          │
│         │  ┌──────────────────────────────────────────────────────────┐│
│         │  │ 🗺️ [Interactive map with site markers]                  ││
│         │  └──────────────────────────────────────────────────────────┘│
│         │                                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5. DIVE SITE CREATE FORM (Mobile View)

```
┌─────────────────────────────────┐
│ DiveDrop          🔍 🔔 👤      │
├─────────────────────────────────┤
│ [← Back]  New Dive Site         │
├─────────────────────────────────┤
│                                 │
│ Site Name *                     │
│ [________________________]      │
│                                 │
│ Location / Country *            │
│ [Egypt            ▼]            │
│                                 │
│ Description                     │
│ [________________________]      │
│ [________________________]      │
│ [________________________]      │
│                                 │
│ Coordinates                     │
│ Latitude *                      │
│ [__________________]            │
│ Longitude *                     │
│ [__________________]            │
│ [📍 Use My Location]             │
│                                 │
│ Depth Range (meters)            │
│ Min [____]  Max [____]          │
│                                 │
│ Difficulty Level *              │
│ ○ Beginner                      │
│ ● Intermediate                  │
│ ○ Advanced                      │
│ ○ Professional Only             │
│                                 │
│ Featured Image                  │
│ [📷 Upload Image]               │
│ (or drag & drop)                │
│                                 │
│ [Cancel]  [Save Site]           │
│                                 │
└─────────────────────────────────┘
```

## 6. DELETE CONFIRMATION MODAL

```
┌────────────────────────────────────────────┐
│ Delete User?                            ✕   │
├────────────────────────────────────────────┤
│                                            │
│ ⚠️  Are you sure you want to delete        │
│    "john@dive.com"?                        │
│                                            │
│ This action cannot be undone. The user    │
│ and all associated data will be removed.   │
│                                            │
│ ☑ I understand the consequences            │
│                                            │
│                                            │
│           [Cancel]  [Delete]               │
│                                            │
└────────────────────────────────────────────┘
```

## 7. BULK ACTIONS MODAL

```
┌────────────────────────────────────────────┐
│ Bulk Actions (5 selected)               ✕   │
├────────────────────────────────────────────┤
│                                            │
│ What would you like to do?                 │
│                                            │
│ □ Change Status:                           │
│   ◉ Active    ○ Inactive    ○ Suspended    │
│                                            │
│ □ Change Role:                             │
│   [User         ▼]                         │
│                                            │
│ □ Send Email:                              │
│   [Message Template ▼]                     │
│                                            │
│ □ Delete Selected                          │
│   ☑ I confirm deletion (irreversible)      │
│                                            │
│           [Cancel]  [Apply]                │
│                                            │
└────────────────────────────────────────────┘
```

## 8. ANALYTICS DASHBOARD

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DiveDrop                            🔍  🔔  👤                            │
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ Analytics  Admin › Analytics & Reporting                                │
│ ◄────   │  [Date Range: Last 30 Days ▼] [Export as CSV]               │
│         │                                                               │
│ Activity   ┌────────────────┬────────────────┬──────────────┐          │
│ Log        │ Total Bookings │ Avg Rating     │ Revenue      │          │
│ ────      │ 2,341          │ 4.8/5 ⭐       │ $45,230      │          │
│ Settings   │ ↑ 23% YoY      │ ↑ 0.3 points   │ ↑ 18% YoY    │          │
│            └────────────────┴────────────────┴──────────────┘          │
│                                                                         │
│            ┌──────────────────────────────────────────────────────────┐│
│            │ Bookings Over Time (Last 30 Days)                        ││
│            │ ┌────────────────────────────────────────────────────┐   ││
│            │ │  350 │                                       ╱╲    │   ││
│            │ │      │   ╱╲          ╱╲      ╱╲   ╱╲ ╱╲  ╱  ╲╱╲╱  │   ││
│            │ │  200 │  ╱  ╲╱╲ ╱╲ ╱╲╱  ╲╱╲╱╲  ╲╱╲╱  ╲╱        │   ││
│            │ │      │ ╱                                        │   ││
│            │ │  0   └────────────────────────────────────────────┘   ││
│            │ │        1   5  10  15  20  25  30 (days)         │   ││
│            │ └────────────────────────────────────────────────────────┘│
│            └──────────────────────────────────────────────────────────┘│
│                                                                         │
│            ┌──────────────────────────┬──────────────────────────────┐ │
│            │ Users by Role            │ Shuttles Utilization         │ │
│            │ ┌──────────────────────┐ │ ┌──────────────────────────┐ │ │
│            │ │  Admin  3            │ │ │ Available: 4 (33%)  ▮▮▮░  │ │ │
│            │ │  Moderator 7         │ │ │ In Use: 6 (50%)    ▮▮▮▮▮  │ │ │
│            │ │  User 1,224          │ │ │ Maintenance: 2 (17%) ▮░░  │ │ │
│            │ └──────────────────────┘ │ └──────────────────────────┘ │ │
│            └──────────────────────────┴──────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 9. ACTIVITY LOG PAGE

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DiveDrop                            🔍  🔔  👤                            │
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ Activity   Admin › Activity Log                                         │
│ Log ◄──   │ [Filter by Action ▼] [Filter by User ▼] [🔄 Refresh]      │
│         │ Search: [______________]                                    │
│         │                                                               │
│         │ ┌──────────────────────────────────────────────────────────┐│
│         │ │ Time            │ User       │ Action        │ Details    ││
│         │ │──────────────────────────────────────────────────────────── ││
│         │ │ 2:45 PM         │ john       │ User Updated  │ ID: 456 ✓  ││
│         │ │ 2:30 PM         │ admin      │ User Created  │ sarah@...  ││
│         │ │ 1:15 PM         │ emma       │ Site Deleted  │ ID: 789 ✗  ││
│         │ │ 1:05 PM         │ john       │ Shuttle Added │ ID: 12  ✓  ││
│         │ │ 12:50 PM        │ admin      │ Password Reset│ ID: 456 ✓  ││
│         │ │ 10:30 AM        │ sara       │ Login Failed  │ IP: 192... ││
│         │ │ 10:20 AM        │ john       │ Bulk Export   │ 50 users   ││
│         │ │                                                            ││
│         │ │                    [< 1 2 3 ... >]                        ││
│         │ └──────────────────────────────────────────────────────────┘│
│         │                                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 10. RESPONSIVE SIDEBAR (Mobile)

```
Mobile (Hidden by default)
┌─────────────────────────────┐
│ ☰ DiveDrop          ✕        │
├─────────────────────────────┤
│ Dashboard                   │
│ Users                       │
│ Dive Sites                  │
│ Shuttles                    │
│ Analytics                   │
│ Activity Log                │
│ Settings                    │
├─────────────────────────────┤
│ Admin Profile               │
│ Logout                      │
└─────────────────────────────┘

Tablet/Desktop (Always Visible)
┌──────────┐
│ DASH     │
│ ─────    │
│ Users    │
│ Dive     │
│ Sites    │
│ Shuttles │
│ ─────    │
│ Analytics│
│ Activity │
│ Log      │
│ ─────    │
│ Settings │
└──────────┘
```

## 11. NOTIFICATION STATES IN TABLES

```
Success
┌─────────────────────────────┐
│ ✓ User created successfully │
│ "john@dive.com"             │
└─────────────────────────────┘

Error
┌─────────────────────────────┐
│ ✕ Failed to delete user      │
│ Email already in use         │
└─────────────────────────────┘

Warning
┌─────────────────────────────┐
│ ⚠ 5 items require attention │
│ 2 failed exports pending    │
└─────────────────────────────┘

Info
┌─────────────────────────────┐
│ ℹ Updated 3 user roles      │
│ Changes will sync shortly   │
└─────────────────────────────┘
```

## 12. TABLE RESPONSIVE BEHAVIOR

### Desktop (Full Table)
```
┌──────────────────────────────────────────────────┐
│ Email      │ Name   │ Role   │ Status │ Actions  │
├──────────────────────────────────────────────────┤
│ john@dive  │ John   │ Admin  │ Active │ Edit Del │
│ sarah@dive │ Sarah  │ User   │ Active │ Edit Del │
└──────────────────────────────────────────────────┘
```

### Tablet (Hide Non-Essential Columns)
```
┌────────────────────────────────┐
│ Name   │ Role   │ Status │ Ac. │
├────────────────────────────────┤
│ John   │ Admin  │ Active │ ... │
│ Sarah  │ User   │ Active │ ... │
└────────────────────────────────┘
```

### Mobile (Card View)
```
┌─────────────────────────────┐
│ John D.                 ✓   │
│ john@dive.com               │
│ Role: Admin                 │
│ Status: Active              │
│ [Edit]  [Delete]            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Sarah M.                ✓   │
│ sarah@dive.com              │
│ Role: User                  │
│ Status: Active              │
│ [Edit]  [Delete]            │
└─────────────────────────────┘
```

---

These wireframes guide the UI/UX implementation and show:
- Clear information hierarchy
- Intuitive navigation
- Consistent action patterns
- Accessible forms with validation
- Mobile-first responsive design
- RTL-ready layouts (mirror for Hebrew)
- Status indicators and feedback
