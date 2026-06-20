/**
 * Photo Upload System Configuration
 */

export const PHOTO_CONFIG = {
  // Supabase Storage
  STORAGE_BUCKET: 'user-photos',
  STORAGE_URL_EXPIRY: 31536000, // 1 year in seconds

  // File constraints
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'] as const,

  // Display
  GRID_COLS: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  PHOTOS_PER_PAGE: 12,
  MAX_PHOTOS_PER_PAGE: 100,

  // Metadata
  MAX_CAPTION_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 30,

  // Visibility options
  VISIBILITY_OPTIONS: ['public', 'private', 'friends_only'] as const,
  DEFAULT_VISIBILITY: 'public' as const,

  // Photo status
  STATUS_OPTIONS: ['pending', 'approved', 'rejected'] as const,
  DEFAULT_STATUS: 'pending' as const,

  // Rating
  MIN_RATING: 0,
  MAX_RATING: 5,
  RATING_STEP: 0.5,

  // Auto-approval settings
  AUTO_APPROVE_INSTRUCTOR_PHOTOS: true,
  INSTRUCTOR_ROLE: 'instructor',

  // Moderation
  REQUIRE_MODERATION: true,
  AUTO_APPROVE_VERIFIED_USERS: true,

  // Messages
  MESSAGES: {
    UPLOAD_SUCCESS: 'Photo uploaded successfully! Awaiting approval.',
    UPLOAD_ERROR: 'Failed to upload photo',
    DELETE_SUCCESS: 'Photo deleted successfully',
    DELETE_ERROR: 'Failed to delete photo',
    RATE_SUCCESS: 'Rating submitted',
    RATE_ERROR: 'Failed to rate photo',
    FILE_TOO_LARGE: 'File size exceeds 5MB limit',
    INVALID_FILE_TYPE: 'Invalid file type. Allowed: JPEG, PNG, WebP',
    NO_FILE_SELECTED: 'Please select a file',
    MISSING_LOCATION: 'Please specify a dive site, free diving listing, or instructor',
    UNAUTHORIZED: 'You must be logged in to upload photos',
    NOT_FOUND: 'Photo not found',
    CONFIRM_DELETE: 'Are you sure you want to delete this photo?',
  },

  // Cloudinary / Image optimization (if enabled)
  IMAGE_OPTIMIZATION_ENABLED: false,
  IMAGE_OPTIMIZATION_SERVICE: 'supabase', // 'supabase' | 'cloudinary' | 'imgix'

  // Watermarking
  WATERMARK_ENABLED: false,
  WATERMARK_TEXT: 'DIVE DROP',
  WATERMARK_OPACITY: 0.3,
  WATERMARK_POSITION: 'bottom-right',

  // AI Moderation (if enabled)
  AI_MODERATION_ENABLED: false,
  AI_MODERATION_SERVICE: 'google_safe_search', // 'google_safe_search' | 'aws_rekognition'
  AI_MODERATION_CONFIDENCE_THRESHOLD: 0.8,

  // Performance
  IMAGE_LAZY_LOAD: true,
  ENABLE_COMPRESSION: true,
  COMPRESSION_QUALITY: 0.8,

  // Caching
  CACHE_EXPIRY: 3600, // 1 hour in seconds
  CACHE_MAXAGE: 31536000, // 1 year for public URLs
} as const;

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mimeToExt[mimeType] || 'jpg';
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(ext: string): string {
  const extToMime: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return extToMime[ext.toLowerCase()] || 'image/jpeg';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file against constraints
 */
export function validateFileConstraints(file: File): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (file.size > PHOTO_CONFIG.MAX_FILE_SIZE) {
    errors.push(
      `${PHOTO_CONFIG.MESSAGES.FILE_TOO_LARGE} (${formatFileSize(file.size)})`
    );
  }

  if (!PHOTO_CONFIG.ALLOWED_TYPES.includes(file.type as any)) {
    errors.push(PHOTO_CONFIG.MESSAGES.INVALID_FILE_TYPE);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get storage path for photo
 */
export function getPhotoStoragePath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`;
}

/**
 * Parse tags from comma-separated string
 */
export function parseTags(tagsString: string): string[] {
  return tagsString
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length <= PHOTO_CONFIG.MAX_TAG_LENGTH)
    .slice(0, PHOTO_CONFIG.MAX_TAGS);
}

/**
 * Format rating display
 */
export function formatRating(rating: number, count: number): string {
  return `${rating.toFixed(1)}⭐ (${count} ${count === 1 ? 'vote' : 'votes'})`;
}
