'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { uploadFeedbackImage, deleteImage } from '@/lib/feedback/imageHandler';
import type { ImageValidationError, ImageUploadError } from '@/lib/feedback/imageHandler';

/**
 * Props for the FeedbackImageUpload component
 */
interface FeedbackImageUploadProps {
  /** User ID for organizing uploaded images */
  userId: string;
  /** Callback when images change */
  onChange: (urls: string[]) => void;
  /** Maximum number of files to allow (default: 3) */
  maxFiles?: number;
}

/**
 * FeedbackImageUpload Component
 *
 * Allows users to upload up to 3 images with preview, delete functionality,
 * and error handling. Images are validated and compressed before upload.
 *
 * @component
 * @example
 * const [imageUrls, setImageUrls] = useState<string[]>([]);
 * return (
 *   <FeedbackImageUpload
 *     userId={currentUser.id}
 *     onChange={setImageUrls}
 *     maxFiles={3}
 *   />
 * );
 */
export const FeedbackImageUpload: React.FC<FeedbackImageUploadProps> = ({
  userId,
  onChange,
  maxFiles = 3,
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files) return;

    // Check if we can add more files
    const remainingSlots = maxFiles - images.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${maxFiles} images allowed`);
      return;
    }

    // Process only as many files as we can accept
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setError(null);
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map((file) => uploadFeedbackImage(file, userId));
      const uploadedUrls = await Promise.all(uploadPromises);

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onChange(newImages);

      // Reset file input
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload image. Please try again.';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (index: number) => {
    const imageUrl = images[index];
    setError(null);

    try {
      // Extract path from signed URL (simplified approach - assumes standard S3 format)
      // In production, you might want to store the path separately
      const pathMatch = imageUrl.match(/feedback_images\/([^?]+)/);
      if (pathMatch) {
        const imagePath = pathMatch[1];
        await deleteImage(imagePath);
      }

      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      onChange(newImages);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete image. Please try again.';
      setError(errorMessage);
    }
  };

  const canAddMore = images.length < maxFiles;

  return (
    <div className="w-full">
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-error-hard/10 border border-error-hard rounded-md">
          <p className="text-sm text-error-hard">{error}</p>
        </div>
      )}

      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((imageUrl, index) => (
              <div
                key={index}
                className="relative group aspect-square rounded-lg overflow-hidden bg-bg-secondary"
              >
                <img
                  src={imageUrl}
                  alt={`Feedback image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Delete button overlay */}
                <button
                  type="button"
                  onClick={() => handleDeleteImage(index)}
                  disabled={uploading}
                  className={clsx(
                    'absolute top-2 right-2 bg-error-hard text-white rounded-full w-6 h-6',
                    'flex items-center justify-center opacity-0 group-hover:opacity-100',
                    'transition-opacity duration-200 font-bold',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label={`Delete image ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-tertiary">
            {images.length} of {maxFiles} images uploaded
          </p>
        </div>
      )}

      {/* Upload button (only show if we can add more) */}
      {canAddMore && (
        <div className="relative">
          <input
            key={fileInputKey}
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="feedback-image-input"
            aria-label="Upload feedback images"
          />
          <label
            htmlFor="feedback-image-input"
            className={clsx(
              'inline-flex items-center justify-center px-4 py-3 rounded-md',
              'border-2 border-dashed border-border-primary hover:border-primary',
              'bg-bg-secondary hover:bg-bg-primary cursor-pointer transition-colors',
              'text-sm font-medium text-text-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              {
                'opacity-50 cursor-not-allowed': uploading,
              }
            )}
          >
            {uploading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <span className="mr-2">📷</span>
                Add Images ({images.length}/{maxFiles})
              </>
            )}
          </label>
        </div>
      )}

      {/* Message when max images reached */}
      {!canAddMore && images.length > 0 && (
        <p className="text-xs text-text-tertiary mt-2">
          Maximum {maxFiles} images reached
        </p>
      )}
    </div>
  );
};

export default FeedbackImageUpload;
