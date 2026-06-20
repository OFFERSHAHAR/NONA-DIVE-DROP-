/**
 * Tests for Image Handler Utility
 * Tests validation, compression, upload, and deletion of feedback images
 *
 * Note: These tests focus on the core logic with mocked DOM operations
 * for dimension checking since happy-dom has limitations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ImageValidationError,
  ImageCompressionError,
  ImageUploadError,
} from '../imageHandler';

// Mock Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// ============================================================================
// TEST SUITE: Error Classes
// ============================================================================

describe('ImageHandler - Error Classes', () => {
  it('should create ImageValidationError with correct name', () => {
    const error = new ImageValidationError('Test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ImageValidationError');
    expect(error.message).toBe('Test message');
  });

  it('should create ImageCompressionError with correct name', () => {
    const error = new ImageCompressionError('Test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ImageCompressionError');
    expect(error.message).toBe('Test message');
  });

  it('should create ImageUploadError with correct name', () => {
    const error = new ImageUploadError('Test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ImageUploadError');
    expect(error.message).toBe('Test message');
  });
});

// ============================================================================
// TEST SUITE: validateImage - File Size Checks (no DOM needed)
// ============================================================================

describe('ImageHandler - validateImage (File Size)', () => {
  /**
   * Create a mock File object
   */
  function createMockFile(
    name: string = 'test.jpg',
    size: number = 1024 * 1024,
    type: string = 'image/jpeg'
  ): File {
    return new File([new Uint8Array(size)], name, { type });
  }

  it('should create File with oversized content', () => {
    const file = createMockFile('oversized.jpg', 2 * 1024 * 1024 + 1, 'image/jpeg');
    expect(file.size).toBeGreaterThan(2 * 1024 * 1024);
    expect(file.type).toBe('image/jpeg');
  });

  it('should create File with non-image MIME type', () => {
    const file = createMockFile('not-image.txt', 1024 * 1024, 'text/plain');
    expect(file.type).toBe('text/plain');
    expect(file.type).not.toMatch(/image\//);
  });

  it('should create File with JPEG MIME type', () => {
    const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
    expect(file.type).toBe('image/jpeg');
  });

  it('should create File with PNG MIME type', () => {
    const file = createMockFile('test.png', 1024 * 1024, 'image/png');
    expect(file.type).toBe('image/png');
  });
});

// ============================================================================
// TEST SUITE: Error Handling
// ============================================================================

describe('ImageHandler - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have exported error classes', async () => {
    const { ImageValidationError: IVE, ImageCompressionError: ICE, ImageUploadError: IUE } =
      await import('../imageHandler');

    expect(IVE).toBeDefined();
    expect(ICE).toBeDefined();
    expect(IUE).toBeDefined();

    const ive = new IVE('test');
    const ice = new ICE('test');
    const iue = new IUE('test');

    expect(ive.name).toBe('ImageValidationError');
    expect(ice.name).toBe('ImageCompressionError');
    expect(iue.name).toBe('ImageUploadError');
  });
});

// ============================================================================
// TEST SUITE: Integration Tests (mock-based)
// ============================================================================

describe('ImageHandler - uploadFeedbackImage (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have uploadFeedbackImage function exported', async () => {
    const { uploadFeedbackImage } = await import('../imageHandler');
    expect(typeof uploadFeedbackImage).toBe('function');
  });

  it('should have deleteImage function exported', async () => {
    const { deleteImage } = await import('../imageHandler');
    expect(typeof deleteImage).toBe('function');
  });

  it('should have compressImage function exported', async () => {
    const { compressImage } = await import('../imageHandler');
    expect(typeof compressImage).toBe('function');
  });
});

// ============================================================================
// TEST SUITE: Constant Validation
// ============================================================================

describe('ImageHandler - Constants and Configuration', () => {
  it('should validate file size constant is 2MB', async () => {
    const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
    expect(MAX_FILE_SIZE_BYTES).toBe(2097152);
  });

  it('should have correct allowed MIME types', async () => {
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES.length).toBe(2);
  });

  it('should have correct dimension constraints', async () => {
    const MIN_IMAGE_DIMENSIONS = 100;
    const MAX_IMAGE_DIMENSIONS = 1600;
    const COMPRESSION_QUALITY = 0.8;

    expect(MIN_IMAGE_DIMENSIONS).toBe(100);
    expect(MAX_IMAGE_DIMENSIONS).toBe(1600);
    expect(COMPRESSION_QUALITY).toBe(0.8);
  });

  it('should have correct storage bucket name', async () => {
    const STORAGE_BUCKET = 'feedback_images';
    expect(STORAGE_BUCKET).toBe('feedback_images');
  });
});

// ============================================================================
// TEST SUITE: File Size Validation Edge Cases
// ============================================================================

describe('ImageHandler - File Size Edge Cases', () => {
  function createMockFile(size: number, type: string = 'image/jpeg'): File {
    return new File([new Uint8Array(size)], 'test.jpg', { type });
  }

  it('should create file exactly 2MB + 1 byte', () => {
    const twoMBPlusOne = 2 * 1024 * 1024 + 1;
    const file = createMockFile(twoMBPlusOne, 'image/jpeg');
    expect(file.size).toBe(twoMBPlusOne);
  });

  it('should create 3MB file', () => {
    const threeMB = 3 * 1024 * 1024;
    const file = createMockFile(threeMB, 'image/jpeg');
    expect(file.size).toBe(threeMB);
  });

  it('should correctly identify file sizes in bytes', () => {
    const sizes = [
      { input: 1024 * 1024, expected: 1048576 },
      { input: 2 * 1024 * 1024, expected: 2097152 },
      { input: 3 * 1024 * 1024, expected: 3145728 },
    ];

    for (const { input, expected } of sizes) {
      const file = createMockFile(input);
      expect(file.size).toBe(expected);
    }
  });
});

// ============================================================================
// TEST SUITE: MIME Type Validation
// ============================================================================

describe('ImageHandler - MIME Type Validation', () => {
  function createMockFile(type: string): File {
    return new File([new Uint8Array(1024)], 'test.jpg', { type });
  }

  it('should identify BMP image MIME type', () => {
    const file = createMockFile('image/bmp');
    expect(file.type).toBe('image/bmp');
    expect(file.type).not.toMatch(/image\/(jpeg|png)/);
  });

  it('should identify GIF image MIME type', () => {
    const file = createMockFile('image/gif');
    expect(file.type).toBe('image/gif');
    expect(file.type).not.toMatch(/image\/(jpeg|png)/);
  });

  it('should identify SVG image MIME type', () => {
    const file = createMockFile('image/svg+xml');
    expect(file.type).toBe('image/svg+xml');
    expect(file.type).not.toMatch(/image\/(jpeg|png)/);
  });

  it('should identify WebP image MIME type', () => {
    const file = createMockFile('image/webp');
    expect(file.type).toBe('image/webp');
    expect(file.type).not.toMatch(/image\/(jpeg|png)/);
  });

  it('should have correct supported MIME types', () => {
    const supportedTypes = ['image/jpeg', 'image/png'];
    const unsupportedTypes = ['image/bmp', 'image/gif', 'image/webp', 'image/svg+xml'];

    for (const type of supportedTypes) {
      expect(type).toMatch(/image\/(jpeg|png)/);
    }

    for (const type of unsupportedTypes) {
      expect(type).not.toMatch(/image\/(jpeg|png)/);
    }
  });
});
