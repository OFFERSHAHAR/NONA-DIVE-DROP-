CREATE TABLE IF NOT EXISTS content_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  title_he TEXT NOT NULL,
  title_en TEXT DEFAULT '' NOT NULL,
  summary_he TEXT DEFAULT '' NOT NULL,
  summary_en TEXT DEFAULT '' NOT NULL,
  body_he TEXT DEFAULT '' NOT NULL,
  body_en TEXT DEFAULT '' NOT NULL,
  location TEXT DEFAULT '' NOT NULL,
  image_url TEXT DEFAULT '' NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
  sort_order INT DEFAULT 100 NOT NULL,
  is_published BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT content_items_kind_slug_unique UNIQUE (kind, slug),
  CONSTRAINT content_items_kind_check CHECK (
    kind IN ('dive_site', 'club', 'instructor', 'pickup', 'boat', 'dive_option', 'free_diving', 'equipment', 'asset')
  )
);

CREATE INDEX IF NOT EXISTS content_items_kind_published_idx ON content_items(kind, is_published, sort_order);
CREATE INDEX IF NOT EXISTS content_items_slug_idx ON content_items(slug);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published content is public" ON content_items;
CREATE POLICY "Published content is public"
  ON content_items FOR SELECT
  USING (is_published = true);

CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT DEFAULT 'booking' NOT NULL,
  category TEXT DEFAULT '' NOT NULL,
  module TEXT DEFAULT '' NOT NULL,
  site_slug TEXT DEFAULT '' NOT NULL,
  item_slug TEXT DEFAULT '' NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '' NOT NULL,
  preferred_date DATE,
  diver_level TEXT DEFAULT '' NOT NULL,
  notes TEXT DEFAULT '' NOT NULL,
  status TEXT DEFAULT 'new' NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT booking_requests_status_check CHECK (status IN ('new', 'contacted', 'confirmed', 'cancelled', 'archived'))
);

CREATE INDEX IF NOT EXISTS booking_requests_status_idx ON booking_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS booking_requests_site_idx ON booking_requests(site_slug);

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public booking request reads" ON booking_requests;
CREATE POLICY "No public booking request reads"
  ON booking_requests FOR SELECT
  USING (false);
