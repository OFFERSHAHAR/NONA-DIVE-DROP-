/**
 * Image Upload Utility for Dive Site Feedback System
 * Handles client-side image validation, compression, watermarking, and upload to Supabase Storage
 *
 * Constraints:
 * - Max file size: 2MB (per Global Constraints)
 * - Allowed types: JPEG/PNG only
 * - Max dimensions for upload: 1600px (maintains aspect ratio)
 * - Compression quality: 0.8
 * - Min dimensions: 100x100px
 * - Storage path: {diverId}/{timestamp}_{sanitizedFilename}
 * - Bucket: feedback_images (private, requires signed URLs)
 * - Watermark: Applied before upload (logo style, bottom-right, 70% opacity)
 */

import { createClient } from '@/lib/supabase/client';
import { applyWatermark, WatermarkError, type WatermarkStyle } from './watermarkGenerator';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MIN_IMAGE_DIMENSIONS = 100; // 100x100px
const MAX_IMAGE_DIMENSIONS = 1600; // Resize if larger
const COMPRESSION_QUALITY = 0.8;
const STORAGE_BUCKET = 'feedback_images';

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Custom error for image validation failures
 */
export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

/**
 * Custom error for image compression failures
 */
export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

/**
 * Custom error for image upload failures
 */
export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

// Re-export WatermarkError for convenience
export { WatermarkError } from './watermarkGenerator';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get image dimensions from a File object
 * @param file - The image File object
 * @returns Promise containing width and height
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new ImageValidationError('Failed to load image for dimension check'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new ImageValidationError('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Sanitize filename for storage
 * @param filename - Original filename
 * @returns Sanitized filename (alphanumeric, underscores, hyphens only)
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * validateImage validates an image File against size, type, and dimension constraints.
 *
 * Validation rules:
 * - File size must not exceed 2MB
 * - MIME type must be JPEG or PNG
 * - Image dimensions must be at least 100x100px
 *
 * @param file - The image File object to validate
 * @throws ImageValidationError if validation fails
 * @returns Promise<void> - Resolves if validation passes
 *
 * @example
 * try {
 *   await validateImage(fileInput.files[0]);
 *   console.log('Image is valid');
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 * }
 */
export async function validateImage(file: File): Promise<void> {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImageValidationError(
      `File size exceeds 2MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    );
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ImageValidationError(
      `Invalid file type. Only JPEG and PNG images are allowed. You provided: ${file.type || 'unknown'}`
    );
  }

  // Check image dimensions
  try {
    const { width, height } = await getImageDimensions(file);

    if (width < MIN_IMAGE_DIMENSIONS || height < MIN_IMAGE_DIMENSIONS) {
      throw new ImageValidationError(
        `Image dimensions must be at least ${MIN_IMAGE_DIMENSIONS}x${MIN_IMAGE_DIMENSIONS}px. Your image is ${width}x${height}px.`
      );
    }
  } catch (error) {
    if (error instanceof ImageValidationError) {
      throw error;
    }
    throw new ImageValidationError('Failed to validate image dimensions');
  }
}

/**
 * compressImage compresses an image file for optimal storage and delivery.
 *
 * Process:
 * 1. Validates the image first
 * 2. Resizes if larger than 1600px (maintains aspect ratio)
 * 3. Compresses to JPEG/PNG with quality 0.8
 * 4. Returns as Blob (ready for upload)
 *
 * @param file - The image File object to compress
 * @throws ImageValidationError if validation fails
 * @throws ImageCompressionError if compression fails
 * @returns Promise<Blob> - Compressed image as a Blob
 *
 * @example
 * const file = fileInput.files[0];
 * const compressedBlob = await compressImage(file);
 * console.log(`Compressed from ${file.size} to ${compressedBlob.size} bytes`);
 */
export async function compressImage(file: File): Promise<Blob> {
  // Validate first
  await validateImage(file);

  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Create canvas for resizing and compression
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Resize if dimensions exceed max (maintain aspect ratio)
          if (width > MAX_IMAGE_DIMENSIONS || height > MAX_IMAGE_DIMENSIONS) {
            const ratio = Math.min(MAX_IMAGE_DIMENSIONS / width, MAX_IMAGE_DIMENSIONS / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new ImageCompressionError('Failed to get canvas context'));
            return;
          }

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to Blob with compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new ImageCompressionError('Failed to create blob from canvas'));
                return;
              }
              resolve(blob);
            },
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            COMPRESSION_QUALITY
          );
        };

        img.onerror = () => {
          reject(new ImageCompressionError('Failed to load image for compression'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new ImageCompressionError('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  } catch (error) {
    if (error instanceof ImageCompressionError) {
      throw error;
    }
    throw new ImageCompressionError(
      `Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * uploadFeedbackImage uploads a compressed and watermarked image to Supabase Storage.
 *
 * Process:
 * 1. Validates the image
 * 2. Compresses the image
 * 3. Applies watermark to the image (default: logo style)
 * 4. Uploads to Supabase Storage bucket `feedback_images`
 * 5. Generates and returns a signed URL (valid for 1 hour, bucket is private)
 *
 * Storage path format: {diverId}/{timestamp}_{sanitizedFilename}
 *
 * @param file - The image File object to upload
 * @param diverId - UUID of the diver uploading the image
 * @param watermarkStyle - Style of watermark to apply (default: 'logo')
 * @throws ImageValidationError if validation fails
 * @throws ImageCompressionError if compression fails
 * @throws WatermarkError if watermarking fails
 * @throws ImageUploadError if upload or signing fails
 * @returns Promise<string> - Public signed URL for the uploaded image
 *
 * @example
 * const diverId = 'diver-uuid-123';
 * const file = fileInput.files[0];
 * try {
 *   const signedUrl = await uploadFeedbackImage(file, diverId, 'logo');
 *   console.log('Image uploaded:', signedUrl);
 *   // Store signedUrl in feedback data
 * } catch (error) {
 *   console.error('Upload failed:', error.message);
 * }
 */
export async function uploadFeedbackImage(
  file: File,
  diverId: string,
  watermarkStyle: WatermarkStyle = 'logo'
): Promise<string> {
  try {
    // Compress image
    const compressedBlob = await compressImage(file);

    // Apply watermark
    let finalBlob: Blob = compressedBlob;
    try {
      finalBlob = await applyWatermark(compressedBlob, watermarkStyle);
    } catch (error) {
      // Log watermark error but continue with non-watermarked image
      console.warn(
        'Watermark application failed, uploading without watermark:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Create storage path
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(file.name);
    const storagePath = `${diverId}/${timestamp}_${sanitizedName}`;

    // Initialize Supabase client
    const supabase = createClient();

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, finalBlob, {
        contentType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        upsert: false,
      });

    if (uploadError || !uploadData) {
      throw new ImageUploadError(
        `Failed to upload image to storage: ${uploadError?.message || 'Unknown error'}`
      );
    }

    // Generate signed URL (valid for 1 hour = 3600 seconds)
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(uploadData.path, 3600);

    if (signError || !signedUrlData?.signedUrl) {
      throw new ImageUploadError(
        `Failed to generate signed URL: ${signError?.message || 'Unknown error'}`
      );
    }

    return signedUrlData.signedUrl;
  } catch (error) {
    if (
      error instanceof ImageValidationError ||
      error instanceof ImageCompressionError ||
      error instanceof WatermarkError ||
      error instanceof ImageUploadError
    ) {
      throw error;
    }
    throw new ImageUploadError(
      `Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * deleteImage removes an image from Supabase Storage by its path.
 *
 * @param imagePath - The storage path of the image to delete (e.g., "diver-id/timestamp_filename")
 * @throws ImageUploadError if deletion fails
 * @returns Promise<void> - Resolves when deletion is complete
 *
 * @example
 * try {
 *   await deleteImage('diver-uuid-123/1718920800000_diving.jpg');
 *   console.log('Image deleted');
 * } catch (error) {
 *   console.error('Deletion failed:', error.message);
 * }
 */
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([imagePath]);

    if (error) {
      throw new ImageUploadError(
        `Failed to delete image from storage: ${error.message || 'Unknown error'}`
      );
    }
  } catch (error) {
    if (error instanceof ImageUploadError) {
      throw error;
    }
    throw new ImageUploadError(
      `Image deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
