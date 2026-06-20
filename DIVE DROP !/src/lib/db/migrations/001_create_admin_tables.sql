-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user', 'driver')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- Create dive_sites table
CREATE TABLE IF NOT EXISTS dive_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_he VARCHAR(255),
  description TEXT NOT NULL,
  description_he TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address VARCHAR(500) NOT NULL,
  difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('easy', 'intermediate', 'advanced')),
  max_depth INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX idx_dive_sites_location ON dive_sites(latitude, longitude);
CREATE INDEX idx_dive_sites_difficulty ON dive_sites(difficulty);

-- Create dive_site_images table
CREATE TABLE IF NOT EXISTS dive_site_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dive_site_images_site ON dive_site_images(dive_site_id);

-- Create dive_site_tags table
CREATE TABLE IF NOT EXISTS dive_site_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dive_site_id, tag)
);

CREATE INDEX idx_dive_site_tags_site ON dive_site_tags(dive_site_id);
CREATE INDEX idx_dive_site_tags_tag ON dive_site_tags(tag);

-- Create shuttles table
CREATE TABLE IF NOT EXISTS shuttles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  driver_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  status VARCHAR(50) NOT NULL CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')) DEFAULT 'offline',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shuttles_driver ON shuttles(driver_id);
CREATE INDEX idx_shuttles_status ON shuttles(status);

-- Create shuttle_availability table
CREATE TABLE IF NOT EXISTS shuttle_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shuttle_id UUID NOT NULL REFERENCES shuttles(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shuttle_id, day_of_week, start_time, end_time)
);

CREATE INDEX idx_shuttle_availability_shuttle ON shuttle_availability(shuttle_id);
CREATE INDEX idx_shuttle_availability_day ON shuttle_availability(day_of_week);

-- Create admin_activity_log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  activity_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_activity_log_user ON admin_activity_log(user_id);
CREATE INDEX idx_admin_activity_log_type ON admin_activity_log(activity_type);
CREATE INDEX idx_admin_activity_log_created ON admin_activity_log(created_at DESC);

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user', 'driver')),
  permission VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission)
);

-- Insert default permissions
INSERT INTO admin_permissions (role, permission) VALUES
  ('admin', 'users.read'),
  ('admin', 'users.create'),
  ('admin', 'users.update'),
  ('admin', 'users.delete'),
  ('admin', 'dive_sites.read'),
  ('admin', 'dive_sites.create'),
  ('admin', 'dive_sites.update'),
  ('admin', 'dive_sites.delete'),
  ('admin', 'shuttles.read'),
  ('admin', 'shuttles.create'),
  ('admin', 'shuttles.update'),
  ('admin', 'shuttles.delete'),
  ('admin', 'admin.view'),
  ('manager', 'users.read'),
  ('manager', 'users.create'),
  ('manager', 'users.update'),
  ('manager', 'dive_sites.read'),
  ('manager', 'dive_sites.create'),
  ('manager', 'dive_sites.update'),
  ('manager', 'shuttles.read'),
  ('manager', 'shuttles.update'),
  ('user', 'users.read'),
  ('driver', 'shuttles.read')
ON CONFLICT DO NOTHING;

-- Create RLS policies (if using Supabase)
-- These policies are optional and depend on your authentication setup
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dive_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
