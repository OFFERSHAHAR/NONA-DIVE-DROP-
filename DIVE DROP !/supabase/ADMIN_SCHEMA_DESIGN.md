# DIVE DROP Admin Panel - Database Schema Design

**Version**: 1.0  
**Created**: 2026-06-20  
**Target**: Supabase (PostgreSQL)  
**Scope**: Admin user management, role-based access control, dive site management, and shuttle scheduling

---

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Relationships Diagram](#relationships-diagram)
4. [Data Model Details](#data-model-details)
5. [RLS Policies](#rls-policies)
6. [Indexes and Performance](#indexes-and-performance)
7. [Migration Guide](#migration-guide)
8. [TypeScript Types](#typescript-types)

---

## Overview

This schema supports a lightweight admin panel for a small team (<5 admins) managing:

- **Users**: Diver profiles with enhanced metadata (existing, extended)
- **Dive Sites**: Location, details, images, metadata (existing, enhanced)
- **Shuttles**: Transport logistics with schedules and availability
- **Admin RBAC**: Role-based access control with granular permissions
- **Audit Trail**: Track admin actions for compliance

### Key Design Principles

- **Row-Level Security (RLS)**: All tables enforce RLS policies
- **Referential Integrity**: Foreign keys with appropriate cascading rules
- **Soft Deletes**: Support for data retention and compliance (deleted_at timestamps)
- **Multi-language Support**: Metadata supports Hebrew/English labels
- **Performance**: Indexed queries for common operations
- **Auditability**: Track who created/modified what and when

---

## Core Tables

### 1. `admin_roles` - Role Definitions

Defines available admin roles with permission inheritance.

```sql
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  display_name_en TEXT NOT NULL,
  display_name_he TEXT NOT NULL,
  priority INT DEFAULT 100 NOT NULL,
  is_system BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 1000),
  CONSTRAINT name_no_spaces CHECK (name ~ '^[a-z_]+$')
);
```

**Predefined Roles**:
- `super_admin`: Full system access
- `site_manager`: Manage dive sites
- `shuttle_manager`: Manage shuttles/pickups
- `user_admin`: Manage user accounts and profiles
- `content_moderator`: Approve user content, manage reviews
- `auditor`: Read-only access to all data and audit logs
- `viewer`: Read-only access to specific resources

---

### 2. `admin_permissions` - Permission Definitions

Fine-grained permissions for granular access control.

```sql
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_resource CHECK (resource IN (
    'users', 'dive_sites', 'shuttles', 'profiles', 
    'reviews', 'audit_logs', 'admin_users', 'reports'
  )),
  CONSTRAINT valid_action CHECK (action IN (
    'view', 'create', 'update', 'delete', 'approve', 'export'
  ))
);
```

**Permission Examples**:
- `dive_sites:view`, `dive_sites:create`, `dive_sites:update`, `dive_sites:delete`
- `shuttles:view`, `shuttles:create`, `shuttles:update`, `shuttles:delete`
- `users:view`, `users:update`, `users:delete`
- `audit_logs:view`, `audit_logs:export`

---

### 3. `role_permissions` - Role-Permission Mapping

Junction table for role-to-permission relationships.

```sql
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  PRIMARY KEY (role_id, permission_id)
);
```

---

### 4. `admin_users` - Admin User Accounts

Links users to admin roles with activation tracking.

```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role_id UUID REFERENCES admin_roles(id) ON DELETE RESTRICT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deactivated_at TIMESTAMPTZ DEFAULT NULL,
  last_login_at TIMESTAMPTZ DEFAULT NULL,
  login_count INT DEFAULT 0 NOT NULL,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_login_count CHECK (login_count >= 0)
);
```

---

### 5. `dive_sites_enhanced` - Extended Dive Site Metadata

Adds admin-specific fields to track site content moderation.

```sql
CREATE TABLE IF NOT EXISTS dive_sites_enhanced (
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  moderation_status TEXT DEFAULT 'pending' NOT NULL,
  featured BOOLEAN DEFAULT false NOT NULL,
  published BOOLEAN DEFAULT true NOT NULL,
  view_count INT DEFAULT 0 NOT NULL,
  booking_count INT DEFAULT 0 NOT NULL,
  moderation_notes TEXT DEFAULT '',
  last_moderated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  last_moderated_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_moderation_status CHECK (moderation_status IN (
    'pending', 'approved', 'rejected', 'needs_revision'
  ))
);
```

---

### 6. `dive_site_images` - Manage Dive Site Images

Allows admins to manage multiple images per site with ordering and metadata.

```sql
CREATE TABLE IF NOT EXISTS dive_site_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_storage_path TEXT NOT NULL,
  alt_text_en TEXT DEFAULT '',
  alt_text_he TEXT DEFAULT '',
  order_index INT DEFAULT 0 NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  uploaded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  moderation_status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_moderation_status CHECK (moderation_status IN (
    'pending', 'approved', 'rejected'
  ))
);
```

---

### 7. `shuttles` - Transport Logistics

Schedules and manages dive shuttles/pickups with availability tracking.

```sql
CREATE TABLE IF NOT EXISTS shuttles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'boat' NOT NULL,
  capacity INT NOT NULL,
  current_occupancy INT DEFAULT 0 NOT NULL,
  
  -- Location Details
  departure_location TEXT NOT NULL,
  departure_latitude FLOAT NOT NULL,
  departure_longitude FLOAT NOT NULL,
  destination_dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  
  -- Scheduling
  departure_time TIME NOT NULL,
  return_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  frequency TEXT DEFAULT 'daily' NOT NULL,
  operating_days TEXT DEFAULT 'Mo,Tu,We,Th,Fr,Sa,Su' NOT NULL,
  
  -- Pricing
  price_per_person FLOAT NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_full BOOLEAN DEFAULT false NOT NULL,
  
  -- Metadata
  amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
  equipment_provided TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  
  -- Audit
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_type CHECK (type IN ('boat', 'van', 'bus', 'other')),
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'custom')),
  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_occupancy CHECK (current_occupancy >= 0 AND current_occupancy <= capacity),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0),
  CONSTRAINT valid_price CHECK (price_per_person >= 0)
);
```

---

### 8. `shuttle_schedules` - Individual Shuttle Runs

Tracks specific instances of shuttle runs with bookings.

```sql
CREATE TABLE IF NOT EXISTS shuttle_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shuttle_id UUID REFERENCES shuttles(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_departure TIMESTAMPTZ NOT NULL,
  scheduled_return TIMESTAMPTZ NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'scheduled' NOT NULL,
  current_occupancy INT DEFAULT 0 NOT NULL,
  is_full BOOLEAN DEFAULT false NOT NULL,
  
  -- Metadata
  notes TEXT DEFAULT '',
  captain_name TEXT DEFAULT '',
  weather_forecast TEXT DEFAULT '',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cancelled_at TIMESTAMPTZ DEFAULT NULL,
  cancelled_reason TEXT DEFAULT '',

  CONSTRAINT valid_status CHECK (status IN (
    'scheduled', 'confirmed', 'boarding', 'departed', 'returned', 'cancelled'
  )),
  CONSTRAINT valid_occupancy CHECK (current_occupancy >= 0 AND current_occupancy <= (
    SELECT capacity FROM shuttles WHERE id = shuttle_id
  )),
  UNIQUE (shuttle_id, scheduled_date, scheduled_departure)
);
```

---

### 9. `shuttle_bookings` - User Shuttle Reservations

Links users to shuttle schedules with booking status.

```sql
CREATE TABLE IF NOT EXISTS shuttle_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shuttle_schedule_id UUID REFERENCES shuttle_schedules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Booking Details
  number_of_persons INT DEFAULT 1 NOT NULL,
  total_price FLOAT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NULL,
  cancelled_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Payment
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  payment_method TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',
  
  -- Contact
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  
  -- Notes
  special_requests TEXT DEFAULT '',
  dietary_restrictions TEXT DEFAULT '',
  medical_notes TEXT DEFAULT '',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT valid_persons CHECK (number_of_persons > 0),
  CONSTRAINT valid_price CHECK (total_price >= 0),
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled'
  )),
  CONSTRAINT valid_payment_status CHECK (payment_status IN (
    'pending', 'completed', 'failed', 'refunded'
  )),
  UNIQUE (shuttle_schedule_id, user_id)
);
```

---

### 10. `audit_logs` - Admin Action Audit Trail

Comprehensive logging of all admin actions for compliance and troubleshooting.

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT DEFAULT '',
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT '',
  status TEXT DEFAULT 'success' NOT NULL,
  error_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'partial'))
);
```

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTH.USERS (Supabase)                      │
│                          (id, email)                             │
└────────────────┬────────────────────────────────────┬───────────┘
                 │                                    │
         ┌───────▼────────┐                  ┌────────▼──────────┐
         │     USERS      │                  │  ADMIN_USERS      │
         │  (id, auth_id) │                  │  (user_id, role)  │
         └────────────────┘                  └────────┬──────────┘
                 ▲                                     │
                 │                          ┌──────────▼─────────┐
                 │                          │   ADMIN_ROLES      │
         ┌───────┴────────────┐             │   (id, name)       │
         │   PROFILES         │             └──────────┬─────────┘
         │  (user_id)         │                        │
         └────────────────────┘             ┌──────────▼──────────┐
                                            │ ROLE_PERMISSIONS    │
         ┌────────────────────┐             │ (role_id, perm_id)  │
         │   DIVE_SITES       │             └──────────┬──────────┘
         │  (id, created_by)  │                        │
         └──────┬─────────────┘             ┌──────────▼──────────────┐
                │                           │ ADMIN_PERMISSIONS       │
                │                           │ (id, resource, action)  │
         ┌──────▼──────────────────┐        └─────────────────────────┘
         │ DIVE_SITES_ENHANCED     │
         │ (dive_site_id)          │
         └─────────────────────────┘
                 ▲
                 │
         ┌───────┴──────────────┐
         │ DIVE_SITE_IMAGES     │
         │ (dive_site_id)       │
         └──────────────────────┘

         ┌──────────────────┐
         │    SHUTTLES      │
         │  (destination)   │───────┐
         └────┬─────────────┘       │
              │                     │
         ┌────▼──────────────────┐  │
         │ SHUTTLE_SCHEDULES     │  │
         │ (shuttle_id)          │  │
         └──────┬────────────────┘  │
                │                   │
         ┌──────▼──────────────────┐│
         │  SHUTTLE_BOOKINGS       ││
         │ (schedule_id, user_id)  ││
         └─────────────────────────┘│
                                    │
         ┌─────────────────────────▼┐
         │    AUDIT_LOGS            │
         │  (admin_user_id, action) │
         └──────────────────────────┘
```

---

## Data Model Details

### Admin Roles Hierarchy

| Role | Priority | Permissions | Notes |
|------|----------|-------------|-------|
| `super_admin` | 1 | All | Full system access |
| `site_manager` | 10 | Dive sites (CRUD), featured status | Manages site content |
| `shuttle_manager` | 20 | Shuttles (CRUD), bookings (view) | Manages transport logistics |
| `user_admin` | 30 | Users (view/update/delete), profiles | Manages user accounts |
| `content_moderator` | 40 | Reviews (approve), dive sites (moderate) | Moderates user content |
| `auditor` | 100 | All resources (view), audit logs (export) | Read-only compliance |
| `viewer` | 150 | Specific resources (view) | Limited read-only access |

### Shuttle Status Lifecycle

```
scheduled → confirmed → boarding → departed → returned
     ↓                                           ↓
  cancelled ←──────────────────────────────────┘
```

### Booking Status Lifecycle

```
pending → confirmed → checked_in → completed
   ↓                      ↓
cancelled            no_show
```

---

## RLS Policies

### 1. `admin_users` Table

```sql
-- Super admins can view all admin users
CREATE POLICY "super_admin_view_all_admin_users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name = 'super_admin'
      AND au.is_active = true
    )
  );

-- Admins can view themselves
CREATE POLICY "admin_view_own_admin_account"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- Only super admins can insert admin users
CREATE POLICY "super_admin_create_admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name = 'super_admin'
      AND au.is_active = true
    )
  );

-- Only super admins can update admin users
CREATE POLICY "super_admin_update_admin_users"
  ON admin_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name = 'super_admin'
      AND au.is_active = true
    )
  );

-- Prevent deletion (use soft delete via deleted_at)
CREATE POLICY "prevent_admin_user_delete"
  ON admin_users FOR DELETE
  USING (false);
```

### 2. `dive_sites` Table - Enhanced Policy

```sql
-- Everyone can view published dive sites
CREATE POLICY "view_published_dive_sites"
  ON dive_sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dive_sites_enhanced
      WHERE dive_site_id = dive_sites.id
      AND published = true
      AND moderation_status IN ('approved', 'needs_revision')
    ) OR
    -- Admins with site_manager role can view all
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      JOIN role_permissions rp ON ar.id = rp.role_id
      JOIN admin_permissions ap ON rp.permission_id = ap.id
      WHERE au.user_id = auth.uid()
      AND ap.resource = 'dive_sites'
      AND au.is_active = true
    )
  );

-- Site managers can create dive sites
CREATE POLICY "site_manager_create_dive_sites"
  ON dive_sites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      JOIN role_permissions rp ON ar.id = rp.role_id
      JOIN admin_permissions ap ON rp.permission_id = ap.id
      WHERE au.user_id = auth.uid()
      AND ap.resource = 'dive_sites'
      AND ap.action = 'create'
      AND au.is_active = true
    )
  );

-- Site managers can update dive sites they created or with permission
CREATE POLICY "site_manager_update_dive_sites"
  ON dive_sites FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      JOIN role_permissions rp ON ar.id = rp.role_id
      JOIN admin_permissions ap ON rp.permission_id = ap.id
      WHERE au.user_id = auth.uid()
      AND ap.resource = 'dive_sites'
      AND ap.action = 'update'
      AND au.is_active = true
    )
  );
```

### 3. `shuttles` Table

```sql
-- Everyone can view active shuttles
CREATE POLICY "view_active_shuttles"
  ON shuttles FOR SELECT
  USING (is_active = true);

-- Shuttle managers can view all shuttles
CREATE POLICY "shuttle_manager_view_all_shuttles"
  ON shuttles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      JOIN role_permissions rp ON ar.id = rp.role_id
      JOIN admin_permissions ap ON rp.permission_id = ap.id
      WHERE au.user_id = auth.uid()
      AND ap.resource = 'shuttles'
      AND au.is_active = true
    )
  );

-- Shuttle managers can create/update shuttles
CREATE POLICY "shuttle_manager_create_shuttles"
  ON shuttles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      JOIN role_permissions rp ON ar.id = rp.role_id
      JOIN admin_permissions ap ON rp.permission_id = ap.id
      WHERE au.user_id = auth.uid()
      AND ap.resource = 'shuttles'
      AND ap.action = 'create'
      AND au.is_active = true
    )
  );

CREATE POLICY "shuttle_manager_update_shuttles"
  ON shuttles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      JOIN role_permissions rp ON ar.id = rp.role_id
      JOIN admin_permissions ap ON rp.permission_id = ap.id
      WHERE au.user_id = auth.uid()
      AND ap.resource = 'shuttles'
      AND ap.action = 'update'
      AND au.is_active = true
    )
  );
```

### 4. `shuttle_bookings` Table

```sql
-- Users can view their own bookings
CREATE POLICY "user_view_own_bookings"
  ON shuttle_bookings FOR SELECT
  USING (user_id = auth.uid());

-- Shuttle managers can view all bookings
CREATE POLICY "shuttle_manager_view_all_bookings"
  ON shuttle_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      JOIN role_permissions rp ON ar.id = rp.role_id
      JOIN admin_permissions ap ON rp.permission_id = ap.id
      WHERE au.user_id = auth.uid()
      AND ap.resource = 'shuttles'
      AND au.is_active = true
    )
  );

-- Authenticated users can create bookings
CREATE POLICY "user_create_booking"
  ON shuttle_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Users can update their own pending bookings
CREATE POLICY "user_update_own_booking"
  ON shuttle_bookings FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('pending', 'confirmed'));

-- Shuttle managers can update any booking
CREATE POLICY "shuttle_manager_update_booking"
  ON shuttle_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name IN ('super_admin', 'shuttle_manager')
      AND au.is_active = true
    )
  );
```

### 5. `audit_logs` Table

```sql
-- Only auditors and super admins can view logs
CREATE POLICY "auditor_view_logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.name IN ('super_admin', 'auditor')
      AND au.is_active = true
    )
  );

-- Admins (system-level) can insert logs
CREATE POLICY "admin_create_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Prevent updates and deletes
CREATE POLICY "prevent_log_modification"
  ON audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "prevent_log_deletion"
  ON audit_logs FOR DELETE
  USING (false);
```

---

## Indexes and Performance

### Critical Indexes

```sql
-- Admin Users
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role_id ON admin_users(role_id);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_users_deleted_at ON admin_users(deleted_at);

-- Dive Sites Enhanced
CREATE INDEX idx_dive_sites_enhanced_status ON dive_sites_enhanced(moderation_status, published);
CREATE INDEX idx_dive_sites_enhanced_featured ON dive_sites_enhanced(featured) WHERE published = true;

-- Dive Site Images
CREATE INDEX idx_dive_site_images_site ON dive_site_images(dive_site_id, order_index);
CREATE INDEX idx_dive_site_images_moderation ON dive_site_images(moderation_status) WHERE deleted_at IS NULL;

-- Shuttles
CREATE INDEX idx_shuttles_active ON shuttles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_shuttles_dive_site ON shuttles(destination_dive_site_id) WHERE is_active = true;
CREATE INDEX idx_shuttles_location ON shuttles(departure_latitude, departure_longitude);

-- Shuttle Schedules
CREATE INDEX idx_shuttle_schedules_shuttle ON shuttle_schedules(shuttle_id, scheduled_date);
CREATE INDEX idx_shuttle_schedules_date ON shuttle_schedules(scheduled_date) WHERE status != 'cancelled';
CREATE INDEX idx_shuttle_schedules_status ON shuttle_schedules(status);

-- Shuttle Bookings
CREATE INDEX idx_shuttle_bookings_user ON shuttle_bookings(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shuttle_bookings_schedule ON shuttle_bookings(shuttle_schedule_id) WHERE status IN ('pending', 'confirmed', 'checked_in');
CREATE INDEX idx_shuttle_bookings_status ON shuttle_bookings(status) WHERE deleted_at IS NULL;

-- Audit Logs
CREATE INDEX idx_audit_logs_admin_user ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### Query Optimization Notes

1. **Admin Role Lookups**: Cache role-to-permissions mapping in application layer
2. **Shuttle Availability**: Materialize view for real-time occupancy queries
3. **Booking Aggregations**: Pre-calculate daily/weekly booking counts
4. **Audit Trail**: Archive logs older than 12 months to hot/cold storage

---

## Migration Guide

### Step 1: Create Admin Role Tables

```sql
-- Migration file: supabase/migrations/20260620_create_admin_rbac.sql
-- Creates: admin_roles, admin_permissions, role_permissions
```

**Breaking Changes**: None - purely additive tables

### Step 2: Create Admin User Mapping

```sql
-- Migration file: supabase/migrations/20260621_create_admin_users.sql
-- Creates: admin_users table
-- Links existing users to admin roles
```

**Pre-migration**:
1. Backup all data
2. Identify current admins from deployment/infrastructure configs
3. Create `super_admin` role as baseline

**Post-migration**:
1. Assign super_admin role to current admins via INSERT
2. Test RLS policies with test accounts
3. Verify audit logging is functioning

### Step 3: Extend Dive Sites Schema

```sql
-- Migration file: supabase/migrations/20260622_enhance_dive_sites.sql
-- Creates: dive_sites_enhanced, dive_site_images
-- Modifies: dive_sites RLS policies
```

**Data Migration**:
```sql
-- Backfill dive_sites_enhanced
INSERT INTO dive_sites_enhanced (dive_site_id, published, moderation_status)
SELECT id, true, 'approved' FROM dive_sites;

-- Backfill dive_site_images from images array
INSERT INTO dive_site_images (dive_site_id, image_url, image_storage_path, order_index, is_primary)
SELECT 
  id, 
  unnest(images), 
  '', 
  row_number() OVER (PARTITION BY id ORDER BY 1) - 1,
  row_number() OVER (PARTITION BY id ORDER BY 1) = 1
FROM dive_sites
WHERE images IS NOT NULL AND array_length(images, 1) > 0;
```

### Step 4: Create Shuttle Infrastructure

```sql
-- Migration file: supabase/migrations/20260623_create_shuttles.sql
-- Creates: shuttles, shuttle_schedules, shuttle_bookings
```

**No data migration required** - new tables

### Step 5: Create Audit Trail

```sql
-- Migration file: supabase/migrations/20260624_create_audit_logs.sql
-- Creates: audit_logs table with triggers
```

**Trigger Setup**:
```sql
-- Trigger on admin_users changes
CREATE TRIGGER log_admin_user_changes
AFTER INSERT OR UPDATE OR DELETE ON admin_users
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- Trigger on dive_sites changes
CREATE TRIGGER log_dive_site_changes
AFTER UPDATE ON dive_sites
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
```

---

## TypeScript Types

### Admin Types

```typescript
// types/admin.ts

export interface AdminRole {
  id: string;
  name: string;
  display_name_en: string;
  display_name_he: string;
  description: string;
  priority: number;
  is_system: boolean;
  created_at: string;
}

export interface AdminPermission {
  id: string;
  name: string;
  resource: 'users' | 'dive_sites' | 'shuttles' | 'reviews' | 'audit_logs';
  action: 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export';
  description: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  activated_at: string;
  deactivated_at: string | null;
  last_login_at: string | null;
  login_count: number;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined relations
  role?: AdminRole;
  user?: User;
}
```

### Shuttle Types

```typescript
// types/shuttle.ts

export interface Shuttle {
  id: string;
  name: string;
  type: 'boat' | 'van' | 'bus' | 'other';
  capacity: number;
  current_occupancy: number;
  departure_location: string;
  departure_latitude: number;
  departure_longitude: number;
  destination_dive_site_id: string | null;
  departure_time: string; // HH:MM
  return_time: string; // HH:MM
  duration_minutes: number;
  frequency: 'daily' | 'weekly' | 'custom';
  operating_days: string; // 'Mo,Tu,We,Th,Fr,Sa,Su'
  price_per_person: number;
  currency: string;
  is_active: boolean;
  amenities: string[];
  equipment_provided: string[];
  created_at: string;
}

export interface ShuttleSchedule {
  id: string;
  shuttle_id: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_departure: string; // ISO timestamp
  scheduled_return: string; // ISO timestamp
  status: 'scheduled' | 'confirmed' | 'boarding' | 'departed' | 'returned' | 'cancelled';
  current_occupancy: number;
  is_full: boolean;
  notes: string;
  captain_name: string;
  created_at: string;
}

export interface ShuttleBooking {
  id: string;
  shuttle_schedule_id: string;
  user_id: string;
  number_of_persons: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'no_show' | 'cancelled';
  confirmed_at: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  special_requests: string;
  created_at: string;
}
```

---

## Implementation Checklist

- [ ] Create migration files for all tables
- [ ] Test RLS policies with multiple role scenarios
- [ ] Create admin dashboard components (React/Next.js)
- [ ] Implement audit logging trigger functions
- [ ] Set up admin role assignment workflow
- [ ] Create API endpoints for admin operations
- [ ] Add multi-language support for role/permission names
- [ ] Implement booking management UI
- [ ] Set up email notifications for shuttles/bookings
- [ ] Create admin documentation and training materials
- [ ] Test soft-delete and data retention policies
- [ ] Performance test with expected load (5 admins, 100+ bookings/day)

---

## Notes

1. **Authentication**: All admin operations require valid `auth.uid()` and active admin_user record
2. **Role Inheritance**: Roles inherit all permissions from the role_permissions junction table
3. **Soft Deletes**: All tables with `deleted_at` support soft deletion; hard deletes are prevented by RLS
4. **Audit Trail**: Every admin action should log to audit_logs via application code or triggers
5. **Internationalization**: Admin role display names are stored separately for English and Hebrew
6. **Performance**: Indexes are critical for real-time queries; monitor slow query logs

