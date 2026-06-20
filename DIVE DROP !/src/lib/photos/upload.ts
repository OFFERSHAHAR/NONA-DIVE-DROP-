import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configuration
const UPLOAD_BUCKET = 'user-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export interface PhotoUploadValidation {
  isValid: boolean;
  error?: string;
}

export interface PhotoUploadResult {
  url: string;
  path: string;
  fileName: string;
  size: number;
  type: string;
}

/**
 * Validate photo file before upload
 */
export function validatePhotoFile(file: File): PhotoUploadValidation {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: JPEG, PNG, WebP`,
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Generate unique file name with timestamp and random string
 */
export function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.split('.').slice(0, -1).join('.');

  // Sanitize file name
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);

  return `${sanitized}-${timestamp}-${random}.${extension}`;
}

/**
 * Upload photo to Supabase Storage
 */
export async function uploadPhotoToStorage(
  file: File,
  userId: string
): Promise<PhotoUploadResult> {
  // Validate file
  const validation = validatePhotoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Generate unique file name
  const fileName = generateFileName(file.name);
  const path = `${userId}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(UPLOAD_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    path: data.path,
    fileName: fileName,
    size: file.size,
    type: file.type,
  };
}

/**
 * Delete photo from Supabase Storage
 */
export async function deletePhotoFromStorage(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Create photo record in database
 */
export async function createPhotoRecord(
  userId: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  {
    diveSiteId,
    freeDivingId,
    instructorId,
    caption,
    description,
    visibility,
    tags,
  }: {
    diveSiteId?: string;
    freeDivingId?: string;
    instructorId?: string;
    caption?: string;
    description?: string;
    visibility?: string;
    tags?: string[];
  } = {}
) {
  const { data, error } = await supabase
    .from('user_photos')
    .insert({
      user_id: userId,
      dive_site_id: diveSiteId,
      free_diving_id: freeDivingId,
      instructor_id: instructorId,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      caption: caption || '',
      description: description || '',
      visibility: visibility || 'public',
      tags: tags || [],
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Get photos for a specific dive site
 */
export async function getPhotosForDiveSite(
  diveSiteId: string,
  limit = 12,
  offset = 0
) {
  const { data, count, error } = await supabase
    .from('user_photos')
    .select('*, user:user_id(id, email)', { count: 'exact' })
    .eq('dive_site_id', diveSiteId)
    .eq('status', 'approved')
    .eq('visibility', 'public')
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Query error: ${error.message}`);
  }

  return { photos: data || [], total: count || 0 };
}

/**
 * Get photos for a specific free diving listing
 */
export async function getPhotosForFreeDiving(
  freeDivingId: string,
  limit = 12,
  offset = 0
) {
  const { data, count, error } = await supabase
    .from('user_photos')
    .select('*, user:user_id(id, email)', { count: 'exact' })
    .eq('free_diving_id', freeDivingId)
    .eq('status', 'approved')
    .eq('visibility', 'public')
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Query error: ${error.message}`);
  }

  return { photos: data || [], total: count || 0 };
}

/**
 * Get photos from an instructor
 */
export async function getInstructorPhotos(
  instructorId: string,
  limit = 12,
  offset = 0
) {
  const { data, count, error } = await supabase
    .from('user_photos')
    .select('*, user:user_id(id, email)', { count: 'exact' })
    .eq('instructor_id', instructorId)
    .eq('status', 'approved')
    .eq('visibility', 'public')
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Query error: ${error.message}`);
  }

  return { photos: data || [], total: count || 0 };
}

/**
 * Get user's own photos
 */
export async function getUserPhotos(userId: string, limit = 20, offset = 0) {
  const { data, count, error } = await supabase
    .from('user_photos')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Query error: ${error.message}`);
  }

  return { photos: data || [], total: count || 0 };
}

/**
 * Delete photo and associated database record
 */
export async function deletePhoto(photoId: string, userId: string) {
  // Get photo record to find storage path
  const { data: photo, error: fetchError } = await supabase
    .from('user_photos')
    .select('file_name')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw new Error(`Photo not found: ${fetchError.message}`);
  }

  // Delete from storage
  if (photo?.file_name) {
    const path = `${userId}/${photo.file_name}`;
    await deletePhotoFromStorage(path);
  }

  // Delete database record
  const { error: deleteError } = await supabase
    .from('user_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Delete failed: ${deleteError.message}`);
  }
}

/**
 * Rate a photo
 */
export async function ratePhoto(
  photoId: string,
  userId: string,
  rating: number
) {
  if (rating < 0 || rating > 5) {
    throw new Error('Rating must be between 0 and 5');
  }

  const { data, error } = await supabase
    .from('photo_ratings')
    .upsert(
      {
        photo_id: photoId,
        user_id: userId,
        rating,
      },
      {
        onConflict: 'photo_id,user_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Rating failed: ${error.message}`);
  }

  return data;
}
