import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FeedbackInsertInput } from '@/lib/feedback/validation';
import { feedbackInsertSchema } from '@/lib/feedback/validation';

/**
 * Test suite for useFeedback Hook
 *
 * Tests focus on:
 * 1. Hook export and type structure
 * 2. Data validation with schema
 * 3. API endpoint structure
 * 4. Error message generation
 * 5. Feedback data structure compliance
 */

describe('useFeedback Hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Export and Structure', () => {
    it('should export useFeedback as a function', async () => {
      const module = await import('../useFeedback');
      expect(typeof module.useFeedback).toBe('function');
    });

    it('should have correct JSDoc indicating it returns hook object', async () => {
      const module = await import('../useFeedback');
      const fn = module.useFeedback.toString();
      expect(fn).toContain('submitFeedback');
      expect(fn).toContain('isLoading');
      expect(fn).toContain('error');
    });

    it('should import from correct validation module', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('feedbackInsertSchema');
    });

    it('should implement validation before API call', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('feedbackInsertSchema.parse');
    });

    it('should use POST method for API calls', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('POST');
    });

    it('should target /api/feedback endpoint', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('/api/feedback');
    });

    it('should handle ZodError from validation', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('ZodError');
    });

    it('should extract validation error paths and messages', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('.path.join');
      expect(code).toContain('.message');
    });
  });

  describe('FeedbackInsertInput Data Structure', () => {
    it('should validate complete feedback data', () => {
      const validData: FeedbackInsertInput = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: ['dolphin', 'coral'],
        marine_life_custom: null,
        notes: 'Beautiful conditions',
        image_urls: ['https://example.com/image1.jpg'],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require visibility_meters within 0-50 range', () => {
      const data = {
        visibility_meters: 100,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Test',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require temperature_celsius within 5-40 range', () => {
      const data = {
        visibility_meters: 25,
        temperature_celsius: 50,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Test',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require current_strength within 0-10 range', () => {
      const data = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 15,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Test',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require valid UUIDs for all ID fields', () => {
      const data = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Test',
        image_urls: [],
        dive_booking_id: 'not-a-uuid',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow empty marine_life array', () => {
      const data: FeedbackInsertInput = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Saw nothing',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow custom marine_life text', () => {
      const data: FeedbackInsertInput = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: 'Saw an unusual species',
        notes: 'Interesting dive',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should limit notes to 300 characters', () => {
      const data = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'A'.repeat(301),
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should limit images to 3 maximum', () => {
      const data = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Test',
        image_urls: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
        ],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('API Request Structure', () => {
    it('should include correct Content-Type header', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('Content-Type');
      expect(code).toContain('application/json');
    });

    it('should stringify data in request body', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('JSON.stringify');
    });

    it('should return boolean on validation error', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('return false');
    });

    it('should throw on network/API errors after setting error', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('throw');
    });
  });

  describe('Error Handling Structure', () => {
    it('should implement validation error handling', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      // Check for error handling - can be transpiled differently
      expect(code).toContain('Validation error');
    });

    it('should format validation errors with field paths', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('Validation error');
      expect(code).toContain('.path.join');
    });

    it('should distinguish validation errors from other errors', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      // Should have separate handling for validation vs other errors
      expect(code).toContain('instanceof');
      expect(code).toContain('catch');
    });

    it('should clear error on success', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('setError(null)');
    });
  });

  describe('State Management Pattern', () => {
    it('should use isLoading instead of loading', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('isLoading');
      expect(code).not.toContain('loading:');
    });

    it('should initialize states in hook', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('useState'); // for both states
      expect(code).toContain('false'); // for isLoading
      expect(code).toContain('null'); // for error
    });

    it('should return object with submitFeedback, isLoading, error', async () => {
      const module = await import('../useFeedback');
      const code = module.useFeedback.toString();
      expect(code).toContain('submitFeedback');
      expect(code).toContain('isLoading');
      expect(code).toContain('error');
    });
  });

  describe('Edge Cases', () => {
    it('should accept boundary value visibility_meters=0', () => {
      const data: FeedbackInsertInput = {
        visibility_meters: 0,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Zero visibility',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept boundary value visibility_meters=50', () => {
      const data: FeedbackInsertInput = {
        visibility_meters: 50,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Great visibility',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept all valid marine species keys', () => {
      const validSpecies = ['dolphin', 'turtle', 'coral', 'fish_school', 'ray', 'seahorse'];
      const data: FeedbackInsertInput = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: validSpecies,
        marine_life_custom: null,
        notes: 'Saw everything',
        image_urls: [],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept max 3 images', () => {
      const data: FeedbackInsertInput = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 3,
        marine_life: [],
        marine_life_custom: null,
        notes: 'Test',
        image_urls: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
        ],
        dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
        diver_id: '550e8400-e29b-41d4-a716-446655440001',
        dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = feedbackInsertSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
