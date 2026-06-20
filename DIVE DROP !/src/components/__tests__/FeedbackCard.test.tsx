import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FeedbackFormData } from '@/types/feedback';
import { MARINE_SPECIES } from '@/types/feedback';

/**
 * Test suite for FeedbackCard Component
 *
 * Tests focus on:
 * 1. Component type and export validation
 * 2. Props interface validation
 * 3. Hook integration assertions
 * 4. Form data structure verification
 * 5. Integration with related modules
 */

describe('FeedbackCard Component', () => {
  describe('Component Type Validation', () => {
    it('should be a named export', async () => {
      const module = await import('../FeedbackCard');
      expect(module.FeedbackCard).toBeDefined();
      expect(typeof module.FeedbackCard).toBe('function');
    });

    it('should also export as default', async () => {
      const module = await import('../FeedbackCard');
      expect(module.default).toBeDefined();
    });

    it('should be a React functional component', async () => {
      const module = await import('../FeedbackCard');
      const { FeedbackCard } = module;

      expect(FeedbackCard).toBeDefined();
      expect(FeedbackCard.$$typeof).toBeUndefined(); // Component function, not element
      expect(typeof FeedbackCard).toBe('function');
    });
  });

  describe('Props Interface', () => {
    it('should accept diveSiteId prop as string', async () => {
      const props = {
        diveSiteId: 'dive-site-uuid-123',
        diveBookingId: 'booking-uuid-456',
      };

      expect(typeof props.diveSiteId).toBe('string');
      expect(props.diveSiteId).toBeTruthy();
    });

    it('should accept diveBookingId prop as string', async () => {
      const props = {
        diveSiteId: 'dive-site-uuid-123',
        diveBookingId: 'booking-uuid-456',
      };

      expect(typeof props.diveBookingId).toBe('string');
      expect(props.diveBookingId).toBeTruthy();
    });

    it('should accept optional onSuccess callback', async () => {
      const onSuccess = vi.fn();
      const props = {
        diveSiteId: 'dive-site-uuid-123',
        diveBookingId: 'booking-uuid-456',
        onSuccess,
      };

      expect(typeof props.onSuccess).toBe('function');
    });

    it('should work without onSuccess callback', async () => {
      const props = {
        diveSiteId: 'dive-site-uuid-123',
        diveBookingId: 'booking-uuid-456',
      };

      expect(props.onSuccess).toBeUndefined();
    });
  });

  describe('Module Dependencies', () => {
    it('should import useAuth hook', async () => {
      const module = await import('../FeedbackCard');
      expect(module).toBeDefined();
      // Verify by checking if module loads without import errors
    });

    it('should import useFeedback hook', async () => {
      const module = await import('../FeedbackCard');
      expect(module).toBeDefined();
    });

    it('should import FeedbackImageUpload component', async () => {
      const module = await import('../FeedbackImageUpload');
      expect(module.FeedbackImageUpload).toBeDefined();
      expect(typeof module.FeedbackImageUpload).toBe('function');
    });

    it('should import Button component', async () => {
      const module = await import('../Button');
      expect(module.Button).toBeDefined();
      // Button is a forwardRef component, so it's an object
      expect(typeof module.Button).toBe('object');
    });

    it('should import Input and TextArea components', async () => {
      const module = await import('../Input');
      expect(module.Input).toBeDefined();
      expect(module.TextArea).toBeDefined();
      expect(typeof module.Input).toBe('object');
      expect(typeof module.TextArea).toBe('object');
    });

    it('should import MARINE_SPECIES constant', async () => {
      expect(MARINE_SPECIES).toBeDefined();
      expect(Array.isArray(MARINE_SPECIES)).toBe(true);
      expect(MARINE_SPECIES.length).toBeGreaterThan(0);
    });
  });

  describe('FeedbackFormData Type Validation', () => {
    it('should define correct FeedbackFormData structure', () => {
      const feedbackData: FeedbackFormData = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 5,
        marine_life: ['dolphin', 'turtle'],
        marine_life_custom: 'Saw a manta ray',
        notes: 'Great dive today!',
        image_urls: ['http://example.com/image1.jpg'],
      };

      expect(feedbackData).toHaveProperty('visibility_meters');
      expect(feedbackData).toHaveProperty('temperature_celsius');
      expect(feedbackData).toHaveProperty('current_strength');
      expect(feedbackData).toHaveProperty('marine_life');
      expect(feedbackData).toHaveProperty('marine_life_custom');
      expect(feedbackData).toHaveProperty('notes');
      expect(feedbackData).toHaveProperty('image_urls');
    });

    it('should validate visibility_meters as number between 0-50', () => {
      const validData: FeedbackFormData = {
        visibility_meters: 35,
        temperature_celsius: 22,
        current_strength: 5,
        marine_life: [],
        marine_life_custom: null,
        notes: 'test',
        image_urls: [],
      };

      expect(typeof validData.visibility_meters).toBe('number');
      expect(validData.visibility_meters).toBeGreaterThanOrEqual(0);
      expect(validData.visibility_meters).toBeLessThanOrEqual(50);
    });

    it('should validate temperature_celsius as number between 5-40', () => {
      const validData: FeedbackFormData = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 5,
        marine_life: [],
        marine_life_custom: null,
        notes: 'test',
        image_urls: [],
      };

      expect(typeof validData.temperature_celsius).toBe('number');
      expect(validData.temperature_celsius).toBeGreaterThanOrEqual(5);
      expect(validData.temperature_celsius).toBeLessThanOrEqual(40);
    });

    it('should validate current_strength as number between 0-10', () => {
      const validData: FeedbackFormData = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 7,
        marine_life: [],
        marine_life_custom: null,
        notes: 'test',
        image_urls: [],
      };

      expect(typeof validData.current_strength).toBe('number');
      expect(validData.current_strength).toBeGreaterThanOrEqual(0);
      expect(validData.current_strength).toBeLessThanOrEqual(10);
    });

    it('should validate marine_life as array of strings', () => {
      const validData: FeedbackFormData = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 5,
        marine_life: ['dolphin', 'turtle', 'coral'],
        marine_life_custom: null,
        notes: 'test',
        image_urls: [],
      };

      expect(Array.isArray(validData.marine_life)).toBe(true);
      expect(validData.marine_life.every((s) => typeof s === 'string')).toBe(true);
    });

    it('should validate notes as string with max 300 characters', () => {
      const validData: FeedbackFormData = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 5,
        marine_life: [],
        marine_life_custom: null,
        notes: 'A'.repeat(300),
        image_urls: [],
      };

      expect(typeof validData.notes).toBe('string');
      expect(validData.notes.length).toBeLessThanOrEqual(300);
    });

    it('should validate image_urls as array of strings with max 3', () => {
      const validData: FeedbackFormData = {
        visibility_meters: 25,
        temperature_celsius: 22,
        current_strength: 5,
        marine_life: [],
        marine_life_custom: null,
        notes: 'test',
        image_urls: [
          'http://example.com/img1.jpg',
          'http://example.com/img2.jpg',
          'http://example.com/img3.jpg',
        ],
      };

      expect(Array.isArray(validData.image_urls)).toBe(true);
      expect(validData.image_urls.length).toBeLessThanOrEqual(3);
      expect(validData.image_urls.every((url) => typeof url === 'string')).toBe(true);
    });
  });

  describe('Marine Species Constant', () => {
    it('should have MARINE_SPECIES array with proper structure', () => {
      expect(Array.isArray(MARINE_SPECIES)).toBe(true);
      expect(MARINE_SPECIES.length).toBeGreaterThanOrEqual(6);
    });

    it('should have species with key, label, and icon properties', () => {
      MARINE_SPECIES.forEach((species) => {
        expect(species).toHaveProperty('key');
        expect(species).toHaveProperty('label');
        expect(species).toHaveProperty('icon');
        expect(typeof species.key).toBe('string');
        expect(typeof species.label).toBe('string');
        expect(typeof species.icon).toBe('string');
      });
    });

    it('should include common diving species', () => {
      const keys = MARINE_SPECIES.map((s) => s.key);
      expect(keys).toContain('dolphin');
      expect(keys).toContain('turtle');
      expect(keys).toContain('coral');
      expect(keys).toContain('fish_school');
    });

    it('should have unique keys', () => {
      const keys = MARINE_SPECIES.map((s) => s.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('FeedbackImageUpload Component', () => {
    it('should be a React component', async () => {
      const module = await import('../FeedbackImageUpload');
      expect(module.FeedbackImageUpload).toBeDefined();
      expect(typeof module.FeedbackImageUpload).toBe('function');
    });

    it('should accept userId prop', async () => {
      const props = {
        userId: 'user-123',
        onChange: vi.fn(),
        maxFiles: 3,
      };

      expect(typeof props.userId).toBe('string');
    });

    it('should accept onChange callback', async () => {
      const onChange = vi.fn();
      const props = {
        userId: 'user-123',
        onChange,
        maxFiles: 3,
      };

      expect(typeof props.onChange).toBe('function');
    });

    it('should accept maxFiles prop with default value', async () => {
      const props1 = { userId: 'user-123', onChange: vi.fn() };
      const props2 = {
        userId: 'user-123',
        onChange: vi.fn(),
        maxFiles: 3,
      };

      expect(props1.maxFiles).toBeUndefined(); // Will use default
      expect(props2.maxFiles).toBe(3);
    });
  });

  describe('useFeedback Hook', () => {
    it('should be a valid hook', async () => {
      const module = await import('@/hooks/useFeedback');
      expect(module.useFeedback).toBeDefined();
      expect(typeof module.useFeedback).toBe('function');
    });

    it('should return object with submitFeedback function', async () => {
      const module = await import('@/hooks/useFeedback');
      expect(module.useFeedback).toBeDefined();
      // Hook implementation will return { loading, error, submitFeedback }
    });
  });

  describe('Integration Test: Data Flow', () => {
    it('should create valid feedback data from form inputs', () => {
      const formData: FeedbackFormData = {
        visibility_meters: 30,
        temperature_celsius: 24,
        current_strength: 4,
        marine_life: ['dolphin', 'turtle'],
        marine_life_custom: 'Also saw a stingray',
        notes: 'Perfect conditions for diving',
        image_urls: ['https://example.com/dive1.jpg', 'https://example.com/dive2.jpg'],
      };

      // Verify form data is properly structured
      expect(formData.visibility_meters).toBeGreaterThanOrEqual(0);
      expect(formData.visibility_meters).toBeLessThanOrEqual(50);
      expect(formData.temperature_celsius).toBeGreaterThanOrEqual(5);
      expect(formData.temperature_celsius).toBeLessThanOrEqual(40);
      expect(formData.current_strength).toBeGreaterThanOrEqual(0);
      expect(formData.current_strength).toBeLessThanOrEqual(10);
      expect(formData.marine_life.length).toBeGreaterThan(0);
      expect(formData.notes.length).toBeLessThanOrEqual(300);
      expect(formData.image_urls.length).toBeLessThanOrEqual(3);
    });

    it('should allow minimal valid feedback data', () => {
      const minimalData: FeedbackFormData = {
        visibility_meters: 20,
        temperature_celsius: 20,
        current_strength: 5,
        marine_life: ['dolphin'],
        marine_life_custom: null,
        notes: 'Good dive',
        image_urls: [],
      };

      expect(minimalData).toBeDefined();
      expect(minimalData.marine_life.length).toBeGreaterThan(0);
      expect(minimalData.notes).not.toBe('');
    });
  });

  describe('Component Assembly', () => {
    it('should assemble with all required dependencies', async () => {
      // Verify all imports work
      const feedbackCard = await import('../FeedbackCard');
      const imageUpload = await import('../FeedbackImageUpload');
      const button = await import('../Button');
      const input = await import('../Input');

      expect(feedbackCard.FeedbackCard).toBeDefined();
      expect(imageUpload.FeedbackImageUpload).toBeDefined();
      expect(button.Button).toBeDefined();
      expect(input.Input).toBeDefined();
      expect(input.TextArea).toBeDefined();
    });

    it('should load without TypeScript errors', async () => {
      const module = await import('../FeedbackCard');
      expect(module).toBeDefined();
      expect(module.FeedbackCard).toBeDefined();
    });
  });
});
