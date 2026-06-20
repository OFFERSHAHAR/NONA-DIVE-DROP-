-- Create user_photos table for storing photos from divers, instructors, and other users
CREATE TABLE IF NOT EXISTS user_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  free_diving_id UUID REFERENCES free_diving_listings(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT NOT NULL,
  file_type TEXT NOT NULL,
  caption TEXT DEFAULT '',
  description TEXT DEFAULT '',
  rating FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending' NOT NULL,
  visibility TEXT DEFAULT 'public' NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}',
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Check constraints
  CONSTRAINT status_valid CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT visibility_valid CHECK (visibility IN ('public', 'private', 'friends_only')),
  CONSTRAINT file_size_valid CHECK (file_size > 0 AND file_size <= 5242880),
  CONSTRAINT file_type_valid CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT at_least_one_reference CHECK (
    dive_site_id IS NOT NULL OR
    free_diving_id IS NOT NULL OR
    instructor_id IS NOT NULL
  ),
  CONSTRAINT rating_valid CHECK (rating >= 0 AND rating <= 5)
);

-- Create indexes for common queries
CREATE INDEX user_photos_user_id_idx ON user_photos(user_id);
CREATE INDEX user_photos_dive_site_id_idx ON user_photos(dive_site_id);
CREATE INDEX user_photos_free_diving_id_idx ON user_photos(free_diving_id);
CREATE INDEX user_photos_instructor_id_idx ON user_photos(instructor_id);
CREATE INDEX user_photos_status_idx ON user_photos(status);
CREATE INDEX user_photos_visibility_idx ON user_photos(visibility);
CREATE INDEX user_photos_created_at_idx ON user_photos(created_at DESC);
CREATE INDEX user_photos_rating_idx ON user_photos(rating DESC);

-- Create composite indexes for common filtering patterns
CREATE INDEX user_photos_dive_site_status_idx ON user_photos(dive_site_id, status);
CREATE INDEX user_photos_dive_site_visibility_idx ON user_photos(dive_site_id, visibility);
CREATE INDEX user_photos_free_diving_status_idx ON user_photos(free_diving_id, status);
CREATE INDEX user_photos_free_diving_visibility_idx ON user_photos(free_diving_id, visibility);

-- Enable RLS
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view approved photos of public dive sites
CREATE POLICY "View approved public photos"
  ON user_photos FOR SELECT
  USING (
    (status = 'approved' AND visibility = 'public') OR
    (auth.uid() = user_id)
  );

-- Policy: Users can see their own photos regardless of status
CREATE POLICY "Users see own photos"
  ON user_photos FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Approved photos are visible based on visibility setting
CREATE POLICY "View based on visibility"
  ON user_photos FOR SELECT
  USING (
    status = 'approved' AND (
      visibility = 'public' OR
      (visibility = 'private' AND auth.uid() = user_id) OR
      (visibility = 'friends_only' AND auth.uid() IN (
        SELECT friend_id FROM user_friends WHERE user_id = user_photos.user_id AND status = 'accepted'
        UNION
        SELECT user_id FROM user_friends WHERE friend_id = user_photos.user_id AND status = 'accepted'
      ))
    )
  );

-- Policy: Users can insert their own photos
CREATE POLICY "Insert own photos"
  ON user_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own photos
CREATE POLICY "Update own photos"
  ON user_photos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own photos
CREATE POLICY "Delete own photos"
  ON user_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can update status and approvals
CREATE POLICY "Admin approve photos"
  ON user_photos FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create a photo_ratings table for user ratings
CREATE TABLE IF NOT EXISTS photo_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES user_photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rating FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(photo_id, user_id),
  CONSTRAINT rating_valid CHECK (rating >= 0 AND rating <= 5)
);

-- Create index on photo_ratings
CREATE INDEX photo_ratings_photo_id_idx ON photo_ratings(photo_id);
CREATE INDEX photo_ratings_user_id_idx ON photo_ratings(user_id);

-- Enable RLS on photo_ratings
ALTER TABLE photo_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all ratings
CREATE POLICY "View all photo ratings"
  ON photo_ratings FOR SELECT
  USING (true);

-- Policy: Users can rate photos
CREATE POLICY "Rate photos"
  ON photo_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own ratings
CREATE POLICY "Update own ratings"
  ON photo_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own ratings
CREATE POLICY "Delete own ratings"
  ON photo_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to update photo rating aggregate
CREATE OR REPLACE FUNCTION update_photo_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_photos
  SET
    rating = (
      SELECT AVG(rating) FROM photo_ratings WHERE photo_id = NEW.photo_id
    ),
    rating_count = (
      SELECT COUNT(*) FROM photo_ratings WHERE photo_id = NEW.photo_id
    ),
    updated_at = now()
  WHERE id = NEW.photo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update photo rating on rating insert/update/delete
CREATE TRIGGER photo_rating_update_insert
AFTER INSERT ON photo_ratings
FOR EACH ROW
EXECUTE FUNCTION update_photo_rating();

CREATE TRIGGER photo_rating_update_update
AFTER UPDATE ON photo_ratings
FOR EACH ROW
EXECUTE FUNCTION update_photo_rating();

CREATE TRIGGER photo_rating_update_delete
AFTER DELETE ON photo_ratings
FOR EACH ROW
EXECUTE FUNCTION update_photo_rating();

-- Create a function to auto-approve photos from verified instructors
CREATE OR REPLACE FUNCTION auto_approve_instructor_photos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.instructor_id IS NOT NULL THEN
    UPDATE user_photos
    SET status = 'approved', approved_at = now()
    WHERE id = NEW.id AND NEW.status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-approval
CREATE TRIGGER auto_approve_photos
AFTER INSERT ON user_photos
FOR EACH ROW
EXECUTE FUNCTION auto_approve_instructor_photos();
