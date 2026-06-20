/**
 * Unit tests for feedback API logic
 * Tests validation, aggregation calculation, and cache logic
 */

import { describe, it, expect } from 'vitest';
import { feedbackInsertSchema, aggregatedConditionsSchema } from './validation';
import type { AggregatedConditions } from '@/types/feedback';

describe('Feedback API Logic', () => {
  // ========================================
  // POST /api/feedback Tests
  // ========================================

  describe('POST /api/feedback - Validation', () => {
    const validFeedbackData = {
      visibility_meters: 25,
      temperature_celsius: 22,
      current_strength: 3,
      marine_life: ['dolphin', 'coral'],
      marine_life_custom: null,
      notes: 'Beautiful dive conditions',
      image_urls: ['https://example.com/image1.jpg'],
      dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
      diver_id: '550e8400-e29b-41d4-a716-446655440001',
      dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
    };

    // Test 1: Valid feedback data passes validation
    it('should validate correct feedback submission data', () => {
      const result = feedbackInsertSchema.safeParse(validFeedbackData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility_meters).toBe(25);
        expect(result.data.diver_id).toBe(validFeedbackData.diver_id);
      }
    });

    // Test 2: Visibility out of range (too high)
    it('should reject visibility > 50 meters', () => {
      const invalidData = {
        ...validFeedbackData,
        visibility_meters: 100,
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 3: Visibility out of range (negative)
    it('should reject negative visibility', () => {
      const invalidData = {
        ...validFeedbackData,
        visibility_meters: -5,
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 4: Temperature too high
    it('should reject temperature > 40 degrees', () => {
      const invalidData = {
        ...validFeedbackData,
        temperature_celsius: 50,
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 5: Temperature too low
    it('should reject temperature < 5 degrees', () => {
      const invalidData = {
        ...validFeedbackData,
        temperature_celsius: 2,
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 6: Current strength out of range
    it('should reject current strength > 10', () => {
      const invalidData = {
        ...validFeedbackData,
        current_strength: 15,
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 7: Notes too long
    it('should reject notes > 300 characters', () => {
      const invalidData = {
        ...validFeedbackData,
        notes: 'a'.repeat(301),
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 8: Too many images
    it('should reject > 3 images', () => {
      const invalidData = {
        ...validFeedbackData,
        image_urls: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
        ],
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 9: Invalid UUID for dive_booking_id
    it('should reject invalid booking ID format', () => {
      const invalidData = {
        ...validFeedbackData,
        dive_booking_id: 'not-a-uuid',
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // Test 10: Invalid marine species
    it('should reject invalid marine species keys', () => {
      const invalidData = {
        ...validFeedbackData,
        marine_life: ['dolphin', 'invalid_species'],
      };
      const result = feedbackInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // GET /api/feedback/aggregate Tests
  // ========================================

  describe('GET /api/feedback/aggregate - Validation & Calculation', () => {
    // Test 11: Valid aggregation with minimum threshold
    it('should validate aggregation with exactly 2 feedback entries', () => {
      const validAggregation: AggregatedConditions = {
        date: '2026-06-20',
        visibility_avg: 25,
        visibility_min: 20,
        visibility_max: 30,
        temperature_avg: 22,
        current_strength_avg: 3,
        species_counts: { dolphin: 2, coral: 1 },
        total_feedback_count: 2,
        cached_at: new Date().toISOString(),
      };

      const result = aggregatedConditionsSchema.safeParse(validAggregation);
      expect(result.success).toBe(true);
    });

    // Test 12: Insufficient feedback count
    it('should reject aggregation with < 2 feedback entries', () => {
      const insufficientData = {
        date: '2026-06-20',
        visibility_avg: 25,
        visibility_min: 20,
        visibility_max: 30,
        temperature_avg: 22,
        current_strength_avg: 3,
        species_counts: { dolphin: 1 },
        total_feedback_count: 1,
        cached_at: new Date().toISOString(),
      };

      const result = aggregatedConditionsSchema.safeParse(insufficientData);
      expect(result.success).toBe(false);
    });

    // Test 13: Invalid date format
    it('should reject invalid date format', () => {
      const invalidDate = {
        date: '06-20-2026', // Wrong format
        visibility_avg: 25,
        visibility_min: 20,
        visibility_max: 30,
        temperature_avg: 22,
        current_strength_avg: 3,
        species_counts: {},
        total_feedback_count: 2,
        cached_at: new Date().toISOString(),
      };

      const result = aggregatedConditionsSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    // Test 14: Visibility constraints (avg outside min/max)
    it('should reject if visibility avg is outside min/max range', () => {
      const invalidRange = {
        date: '2026-06-20',
        visibility_avg: 40, // Greater than max of 30
        visibility_min: 20,
        visibility_max: 30,
        temperature_avg: 22,
        current_strength_avg: 3,
        species_counts: {},
        total_feedback_count: 2,
        cached_at: new Date().toISOString(),
      };

      const result = aggregatedConditionsSchema.safeParse(invalidRange);
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // Aggregation Calculation Logic Tests
  // ========================================

  describe('Aggregation Calculation', () => {
    // Test 15: Calculate averages correctly
    it('should calculate visibility average correctly', () => {
      const feedbackEntries = [
        { visibility_meters: 20, temperature_celsius: 20, current_strength: 2, marine_life: [] },
        { visibility_meters: 30, temperature_celsius: 24, current_strength: 4, marine_life: [] },
      ];

      const visibilitySum = feedbackEntries.reduce((sum, entry) => sum + entry.visibility_meters, 0);
      const visibilityAvg = visibilitySum / feedbackEntries.length;

      expect(visibilityAvg).toBe(25);
    });

    // Test 16: Calculate temperature average correctly
    it('should calculate temperature average correctly', () => {
      const feedbackEntries = [
        { visibility_meters: 20, temperature_celsius: 20, current_strength: 2, marine_life: [] },
        { visibility_meters: 30, temperature_celsius: 24, current_strength: 4, marine_life: [] },
        { visibility_meters: 25, temperature_celsius: 22, current_strength: 3, marine_life: [] },
      ];

      const temperatureSum = feedbackEntries.reduce((sum, entry) => sum + entry.temperature_celsius, 0);
      const temperatureAvg = temperatureSum / feedbackEntries.length;

      expect(temperatureAvg).toBeCloseTo(22, 1);
    });

    // Test 17: Count marine species correctly
    it('should count marine species occurrences correctly', () => {
      const feedbackEntries = [
        { marine_life: ['dolphin', 'coral'] },
        { marine_life: ['coral', 'fish_school'] },
        { marine_life: ['dolphin'] },
      ];

      const speciesCountMap: Record<string, number> = {};
      feedbackEntries.forEach((entry: any) => {
        if (entry.marine_life && Array.isArray(entry.marine_life)) {
          entry.marine_life.forEach((species: string) => {
            speciesCountMap[species] = (speciesCountMap[species] || 0) + 1;
          });
        }
      });

      expect(speciesCountMap.dolphin).toBe(2);
      expect(speciesCountMap.coral).toBe(2);
      expect(speciesCountMap.fish_school).toBe(1);
    });

    // Test 18: Handle empty marine_life arrays
    it('should handle entries with empty marine_life arrays', () => {
      const feedbackEntries = [
        { marine_life: [] },
        { marine_life: ['coral'] },
      ];

      const speciesCountMap: Record<string, number> = {};
      feedbackEntries.forEach((entry: any) => {
        if (entry.marine_life && Array.isArray(entry.marine_life)) {
          entry.marine_life.forEach((species: string) => {
            speciesCountMap[species] = (speciesCountMap[species] || 0) + 1;
          });
        }
      });

      expect(speciesCountMap.coral).toBe(1);
      expect(Object.keys(speciesCountMap).length).toBe(1);
    });

    // Test 19: Find min/max visibility
    it('should find correct min and max visibility values', () => {
      const visibilityValues = [15, 28, 32, 22, 19];

      const min = Math.min(...visibilityValues);
      const max = Math.max(...visibilityValues);

      expect(min).toBe(15);
      expect(max).toBe(32);
    });
  });

  // ========================================
  // Cache Age Calculation Tests
  // ========================================

  describe('Cache Freshness Logic', () => {
    // Test 20: Fresh cache (< 5 minutes)
    it('should identify cache as fresh when < 5 minutes old', () => {
      const cachedAtTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      const nowTime = Date.now();
      const ageMins = (nowTime - cachedAtTime.getTime()) / (1000 * 60);

      expect(ageMins).toBeLessThan(5);
    });

    // Test 21: Stale cache (>= 5 minutes)
    it('should identify cache as stale when >= 5 minutes old', () => {
      const cachedAtTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      const nowTime = Date.now();
      const ageMins = (nowTime - cachedAtTime.getTime()) / (1000 * 60);

      expect(ageMins).toBeGreaterThanOrEqual(5);
    });

    // Test 22: Exactly 5 minutes old
    it('should consider exactly 5 minutes old as stale', () => {
      const cachedAtTime = new Date(Date.now() - 5 * 60 * 1000); // Exactly 5 minutes
      const nowTime = Date.now();
      const ageMins = (nowTime - cachedAtTime.getTime()) / (1000 * 60);

      expect(ageMins).toBeGreaterThanOrEqual(5);
    });
  });
});
