/**
 * Dive Site Feedback System Validation Schemas
 * Zod schemas for runtime validation of feedback data
 */

import { z } from 'zod';
import { MARINE_SPECIES } from '@/types/feedback';

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

const VALID_MARINE_SPECIES_KEYS = MARINE_SPECIES.map((s) => s.key);

// ============================================================================
// FORM SCHEMA (Client-side validation)
// ============================================================================

/**
 * feedbackFormSchema validates user input from the feedback form.
 * Ensures data integrity before submission to the backend.
 *
 * Constraints:
 * - visibility_meters: 0-50 range
 * - temperature_celsius: 5-40 range
 * - current_strength: 0-10 range
 * - marine_life: valid species keys
 * - notes: max 300 characters
 * - image_urls: max 3 files, validated for format/size (client-side enforcement)
 */
export const feedbackFormSchema = z.object({
  visibility_meters: z
    .number()
    .min(0, 'Visibility must be at least 0 meters')
    .max(50, 'Visibility cannot exceed 50 meters'),
  temperature_celsius: z
    .number()
    .min(5, 'Temperature must be at least 5°C')
    .max(40, 'Temperature cannot exceed 40°C'),
  current_strength: z
    .number()
    .min(0, 'Current strength must be at least 0')
    .max(10, 'Current strength cannot exceed 10'),
  marine_life: z
    .array(z.enum(VALID_MARINE_SPECIES_KEYS as [string, ...string[]]))
    .default([]),
  marine_life_custom: z.string().max(200, 'Custom species text must be at most 200 characters').nullable().default(null),
  notes: z
    .string()
    .max(300, 'Notes must be at most 300 characters')
    .default(''),
  image_urls: z
    .array(z.string().url('Invalid image URL'))
    .max(3, 'Maximum 3 images allowed')
    .default([]),
});

// ============================================================================
// INSERT SCHEMA (Database insertion)
// ============================================================================

/**
 * feedbackInsertSchema extends feedbackFormSchema with required database fields.
 * Used for inserting feedback records into the database.
 *
 * Row-level security: Divers can only see/edit their own feedback.
 */
export const feedbackInsertSchema = feedbackFormSchema.extend({
  dive_booking_id: z.string().uuid('Invalid booking ID'),
  diver_id: z.string().uuid('Invalid diver ID'),
  dive_site_id: z.string().uuid('Invalid dive site ID'),
  // submitted_at and created_at are typically set by the database
  submitted_at: z.string().datetime('Invalid submission timestamp').optional(),
  created_at: z.string().datetime('Invalid creation timestamp').optional(),
});

// ============================================================================
// AGGREGATED CONDITIONS SCHEMA (Read/cache validation)
// ============================================================================

/**
 * aggregatedConditionsSchema validates aggregated dive conditions.
 * Ensures aggregations meet minimum data requirements (2+ feedback entries).
 *
 * Constraints:
 * - total_feedback_count: minimum 2 entries required to display
 * - Aggregation cache TTL: 5 minutes
 * - Performance target: page load < 2s (with cache)
 */
export const aggregatedConditionsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  visibility_avg: z.number().nonnegative('Average visibility cannot be negative'),
  visibility_min: z.number().nonnegative('Minimum visibility cannot be negative'),
  visibility_max: z.number().nonnegative('Maximum visibility cannot be negative'),
  temperature_avg: z.number(),
  current_strength_avg: z.number().nonnegative('Average current cannot be negative'),
  species_counts: z.record(z.string(), z.number().nonnegative('Species count cannot be negative')),
  total_feedback_count: z
    .number()
    .int('Feedback count must be an integer')
    .min(2, 'Minimum 2 feedback entries required to display conditions'),
  cached_at: z.string().datetime('Invalid cache timestamp'),
}).refine(
  (data) => data.visibility_min <= data.visibility_avg && data.visibility_avg <= data.visibility_max,
  {
    message: 'Average visibility must be between min and max',
    path: ['visibility_avg'],
  }
);

// ============================================================================
// TYPE INFERENCE (For TypeScript consumers)
// ============================================================================

export type FeedbackFormInput = z.infer<typeof feedbackFormSchema>;
export type FeedbackInsertInput = z.infer<typeof feedbackInsertSchema>;
export type AggregatedConditionsInput = z.infer<typeof aggregatedConditionsSchema>;

// ============================================================================
// INLINE TESTS
// ============================================================================

/**
 * Test case 1: Valid form data passes validation
 */
function testValidFormData() {
  const validData: FeedbackFormInput = {
    visibility_meters: 25,
    temperature_celsius: 22,
    current_strength: 3,
    marine_life: ['dolphin', 'coral'],
    marine_life_custom: null,
    notes: 'Beautiful conditions, saw a dolphin pod',
    image_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  };

  const result = feedbackFormSchema.safeParse(validData);
  console.assert(result.success, 'Test 1 failed: Valid form data should pass validation');
  console.log('Test 1 passed: Valid form data validates correctly');
}

/**
 * Test case 2: Invalid data is rejected
 */
function testInvalidFormData() {
  const invalidData = {
    visibility_meters: 100, // Exceeds max
    temperature_celsius: 50, // Exceeds max
    current_strength: 15, // Exceeds max
    marine_life: ['invalid_species'],
    marine_life_custom: null,
    notes: 'A'.repeat(301), // Exceeds max length
    image_urls: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg', 'https://example.com/4.jpg'], // 4 images, exceeds max
  };

  const result = feedbackFormSchema.safeParse(invalidData);
  console.assert(!result.success, 'Test 2 failed: Invalid data should fail validation');
  console.log('Test 2 passed: Invalid data is correctly rejected');
}

/**
 * Test case 3: AggregatedConditions with minimum feedback count passes
 */
function testValidAggregatedConditions() {
  const validAggregation: AggregatedConditionsInput = {
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
  console.assert(result.success, 'Test 3 failed: Valid aggregated conditions should pass');
  console.log('Test 3 passed: Valid aggregated conditions validates correctly');
}

/**
 * Test case 4: AggregatedConditions below minimum feedback count fails
 */
function testInsufficientFeedbackCount() {
  const insufficientData = {
    date: '2026-06-20',
    visibility_avg: 25,
    visibility_min: 20,
    visibility_max: 30,
    temperature_avg: 22,
    current_strength_avg: 3,
    species_counts: { dolphin: 1 },
    total_feedback_count: 1, // Below minimum of 2
    cached_at: new Date().toISOString(),
  };

  const result = aggregatedConditionsSchema.safeParse(insufficientData);
  console.assert(!result.success, 'Test 4 failed: Insufficient feedback count should fail');
  console.log('Test 4 passed: Insufficient feedback count is correctly rejected');
}

/**
 * Test case 5: FeedbackInsertSchema includes required database fields
 */
function testFeedbackInsertWithDatabaseFields() {
  const insertData: FeedbackInsertInput = {
    visibility_meters: 25,
    temperature_celsius: 22,
    current_strength: 3,
    marine_life: ['dolphin'],
    marine_life_custom: 'Saw some unusual rays',
    notes: 'Great dive',
    image_urls: ['https://example.com/image1.jpg'],
    dive_booking_id: '550e8400-e29b-41d4-a716-446655440000',
    diver_id: '550e8400-e29b-41d4-a716-446655440001',
    dive_site_id: '550e8400-e29b-41d4-a716-446655440002',
  };

  const result = feedbackInsertSchema.safeParse(insertData);
  console.assert(result.success, 'Test 5 failed: Valid insert data with all fields should pass');
  console.log('Test 5 passed: FeedbackInsertSchema validates correctly with database fields');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('=== Running Feedback Validation Tests ===\n');
  testValidFormData();
  testInvalidFormData();
  testValidAggregatedConditions();
  testInsufficientFeedbackCount();
  testFeedbackInsertWithDatabaseFields();
  console.log('\n=== All tests completed ===');
}

// Execute tests if this module is run directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}

// Export test runner for use in test suites
export { runAllTests };
