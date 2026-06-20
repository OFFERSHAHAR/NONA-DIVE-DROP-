import { createClient } from '@/lib/supabase/server';

/**
 * FILE UPLOAD HANDLER
 *
 * Handles file uploads to Supabase Storage
 * - Validates file type and size
 * - Generates unique filenames
 * - Returns public URLs
 *
 * Setup required:
 * 1. Create storage bucket in Supabase: 'dive-drop-assets'
 * 2. Set bucket to public
 * 3. Add CORS configuration
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export async function uploadDiveSiteImage(
  file: Blob,
  filename: string
): Promise<UploadResult> {
  // Validate
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const extension = file.type.split('/')[1];
  const uniqueFilename = `dive-sites/${timestamp}-${randomId}.${extension}`;

  try {
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase.storage
      .from('dive-drop-assets')
      .upload(uniqueFilename, file, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dive-drop-assets')
      .getPublicUrl(uniqueFilename);

    return {
      url: publicUrl,
      filename: uniqueFilename,
      size: file.size,
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

export async function uploadUserAvatar(
  file: Blob,
  userId: string
): Promise<UploadResult> {
  // Validate
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const extension = file.type.split('/')[1];
  const filename = `avatars/${userId}.${extension}`;

  try {
    const supabase = (await createClient()) as any;

    // Delete old avatar if exists
    try {
      await supabase.storage
        .from('dive-drop-assets')
        .remove([filename]);
    } catch {
      // Ignore if file doesn't exist
    }

    const { data, error } = await supabase.storage
      .from('dive-drop-assets')
      .upload(filename, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('dive-drop-assets')
      .getPublicUrl(filename);

    return {
      url: publicUrl,
      filename,
      size: file.size,
    };
  } catch (error) {
    console.error('Avatar upload error:', error);
    throw error;
  }
}

export async function deleteFile(filename: string): Promise<void> {
  try {
    const supabase = (await createClient()) as any;

    const { error } = await supabase.storage
      .from('dive-drop-assets')
      .remove([filename]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('File delete error:', error);
    throw error;
  }
}
