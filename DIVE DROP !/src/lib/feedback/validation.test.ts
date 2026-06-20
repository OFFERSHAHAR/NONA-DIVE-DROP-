/**
 * Feedback Validation Tests
 * Run with: npx tsx src/lib/feedback/validation.test.ts
 */

import { z } from 'zod';
import {
  feedbackFormSchema,
  feedbackInsertSchema,
  aggregatedConditionsSchema,
  type FeedbackFormInput,
  type FeedbackInsertInput,
  type AggregatedConditionsInput,
} from './validation';

// ============================================================================
// TEST SUITE
// ============================================================================

const testResults: { name: string; passed: boolean; error?: string }[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// TEST 1: Valid form data passes validation
// ============================================================================
function test1_ValidFormData() {
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
  assert(result.success, 'Valid form data should pass validation');
  assert(result.data.visibility_meters === 25, 'Visibility should be 25');
  assert(result.data.marine_life.length === 2, 'Marine life array should have 2 items');
}

// ============================================================================
// TEST 2: Invalid data is rejected
// ============================================================================
function test2_InvalidFormData() {
  const testCases = [
    {
      name: 'visibility exceeds max',
      data: { visibility_meters: 100, temperature_celsius: 20, current_strength: 3, marine_life: [], marine_life_custom: null, notes: '', image_urls: [] },
    },
    {
      name: 'temperature exceeds max',
      data: { visibility_meters: 25, temperature_celsius: 50, current_strength: 3, marine_life: [], marine_life_custom: null, notes: '', image_urls: [] },
    },
    {
      name: 'current strength exceeds max',
      data: { visibility_meters: 25, temperature_celsius: 22, current_strength: 15, marine_life: [], marine_life_custom: null, notes: '', image_urls: [] },
    },
    {
      name: 'notes exceed max length',
      data: { visibility_meters: 25, temperature_celsius: 22, current_strength: 3, marine_life: [], marine_life_custom: null, notes: 'A'.repeat(301), image_urls: [] },
    },
    {
      name: 'too many images',
      data: { visibility_meters: 25, temperature_celsius: 22, current_strength: 3, marine_life: [], marine_life_custom: null, notes: '', image_urls: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg', 'https://example.com/4.jpg'] },
    },
  ];

  testCases.forEach(({ name, data }) => {
    const result = feedbackFormSchema.safeParse(data);
    assert(!result.success, `Invalid data (${name}) should fail validation`);
  });
}

// ============================================================================
// TEST 3: Valid aggregated conditions with minimum feedback count passes
// ============================================================================
function test3_ValidAggregatedConditions() {
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
  assert(result.success, 'Valid aggregated conditions should pass');
  assert(result.data.total_feedback_count === 2, 'Feedback count should be 2');
  assert(result.data.date === '2026-06-20', 'Date should be in YYYY-MM-DD format');
}

// ============================================================================
// TEST 4: Aggregated conditions below minimum feedback count fails
// ============================================================================
function test4_InsufficientFeedbackCount() {
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
  assert(!result.success, 'Insufficient feedback count should fail validation');
}

// ============================================================================
// TEST 5: FeedbackInsertSchema with database fields
// ============================================================================
function test5_FeedbackInsertWithDatabaseFields() {
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
  assert(result.success, 'Valid insert data with all fields should pass');
  assert(result.data.dive_booking_id === '550e8400-e29b-41d4-a716-446655440000', 'Booking ID should match');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  console.log('=== Feedback Validation Test Suite ===\n');

  const tests = [
    { name: 'Test 1: Valid form data', fn: test1_ValidFormData },
    { name: 'Test 2: Invalid form data', fn: test2_InvalidFormData },
    { name: 'Test 3: Valid aggregated conditions', fn: test3_ValidAggregatedConditions },
    { name: 'Test 4: Insufficient feedback count', fn: test4_InsufficientFeedbackCount },
    { name: 'Test 5: Insert with database fields', fn: test5_FeedbackInsertWithDatabaseFields },
  ];

  for (const test of tests) {
    try {
      test.fn();
      testResults.push({ name: test.name, passed: true });
      console.log(`✓ ${test.name}`);
    } catch (error) {
      testResults.push({ name: test.name, passed: false, error: (error as Error).message });
      console.log(`✗ ${test.name}: ${(error as Error).message}`);
    }
  }

  const passed = testResults.filter((t) => t.passed).length;
  const total = testResults.length;

  console.log(`\n=== Test Results: ${passed}/${total} passed ===`);

  if (passed !== total) {
    console.log('\nFailed tests:');
    testResults.filter((t) => !t.passed).forEach((t) => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
    process.exit(1);
  }

  process.exit(0);
}

runAllTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
