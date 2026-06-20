/**
 * Watermark Generator Test Suite
 * Tests for watermark application, style validation, and configuration
 */

import {
  applyWatermark,
  getAvailableStyles,
  getStyleDescription,
  isValidStyle,
  WATERMARK_STYLES,
  WatermarkError,
  type WatermarkStyle,
} from '../watermarkGenerator';

// ============================================================================
// TEST SETUP & UTILITIES
// ============================================================================

/**
 * Creates a mock image blob for testing
 * Returns a PNG blob with 100x100px dimensions
 */
function createMockImageBlob(): Blob {
  // Create a simple test image using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw a simple blue square
  ctx.fillStyle = 'rgb(0, 102, 204)';
  ctx.fillRect(0, 0, 100, 100);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Failed to create blob');
      resolve(blob);
    }, 'image/png');
  }) as unknown as Blob;
}

/**
 * Helper to convert blob to data URL for testing
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================================
// TEST CASES
// ============================================================================

/**
 * Test case 1: getAvailableStyles returns expected styles
 */
export async function testGetAvailableStyles() {
  const styles = getAvailableStyles();

  // Verify array contains expected styles
  if (
    !Array.isArray(styles) ||
    !styles.includes('logo') ||
    !styles.includes('badge') ||
    !styles.includes('text')
  ) {
    throw new Error('Test 1 failed: Expected styles not found in available styles');
  }

  // Verify no duplicate styles
  if (new Set(styles).size !== styles.length) {
    throw new Error('Test 1 failed: Duplicate styles found');
  }

  console.log(`Test 1 passed: Found ${styles.length} watermark styles`);
}

/**
 * Test case 2: getStyleDescription returns valid descriptions
 */
export async function testGetStyleDescription() {
  const styles = getAvailableStyles();

  for (const style of styles) {
    const description = getStyleDescription(style);

    if (typeof description !== 'string' || description.length === 0) {
      throw new Error(
        `Test 2 failed: Invalid description for style '${style}'`
      );
    }

    if (description === 'Unknown style') {
      throw new Error(
        `Test 2 failed: Style '${style}' returned 'Unknown style'`
      );
    }
  }

  console.log('Test 2 passed: All styles have valid descriptions');
}

/**
 * Test case 3: isValidStyle correctly validates style names
 */
export async function testIsValidStyle() {
  const validStyles = getAvailableStyles();
  const invalidStyles = ['invalid', 'unknown', 'test', 'watermark', ''];

  // Test valid styles
  for (const style of validStyles) {
    if (!isValidStyle(style)) {
      throw new Error(`Test 3 failed: Valid style '${style}' rejected`);
    }
  }

  // Test invalid styles
  for (const style of invalidStyles) {
    if (isValidStyle(style)) {
      throw new Error(`Test 3 failed: Invalid style '${style}' accepted`);
    }
  }

  console.log('Test 3 passed: Style validation works correctly');
}

/**
 * Test case 4: WATERMARK_STYLES config has valid structure
 */
export async function testWatermarkStylesConfig() {
  const requiredFields = ['width', 'height', 'opacity', 'padding', 'description'];

  for (const [styleName, config] of Object.entries(WATERMARK_STYLES)) {
    // Check all required fields exist
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(
          `Test 4 failed: Config for '${styleName}' missing field '${field}'`
        );
      }
    }

    // Validate dimensions are positive
    if (config.width <= 0 || config.height <= 0) {
      throw new Error(
        `Test 4 failed: Invalid dimensions for '${styleName}': ${config.width}x${config.height}`
      );
    }

    // Validate opacity is in valid range
    if (config.opacity <= 0 || config.opacity > 1) {
      throw new Error(
        `Test 4 failed: Invalid opacity for '${styleName}': ${config.opacity}`
      );
    }

    // Validate padding is non-negative
    if (config.padding < 0) {
      throw new Error(
        `Test 4 failed: Invalid padding for '${styleName}': ${config.padding}`
      );
    }

    // Validate description exists
    if (typeof config.description !== 'string' || config.description.length === 0) {
      throw new Error(
        `Test 4 failed: Invalid description for '${styleName}'`
      );
    }
  }

  console.log('Test 4 passed: Watermark styles configuration is valid');
}

/**
 * Test case 5: applyWatermark creates valid blob output
 * Note: Requires DOM/Canvas API (runs in browser environment)
 */
export async function testApplyWatermarkOutput() {
  // Skip if not in browser environment
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    console.log('Test 5 skipped: Not in browser environment (Canvas API required)');
    return;
  }

  try {
    const originalBlob = await createMockImageBlob();
    const style: WatermarkStyle = 'logo';

    const watermarkedBlob = await applyWatermark(originalBlob, style);

    // Verify output is a Blob
    if (!(watermarkedBlob instanceof Blob)) {
      throw new Error('Test 5 failed: Output is not a Blob');
    }

    // Verify output has content
    if (watermarkedBlob.size === 0) {
      throw new Error('Test 5 failed: Watermarked blob is empty');
    }

    // Verify output is a valid image type
    if (!['image/png', 'image/jpeg'].includes(watermarkedBlob.type)) {
      throw new Error(`Test 5 failed: Invalid blob type: ${watermarkedBlob.type}`);
    }

    console.log(
      `Test 5 passed: Watermarked blob created (size: ${watermarkedBlob.size} bytes, type: ${watermarkedBlob.type})`
    );
  } catch (error) {
    if (error instanceof WatermarkError) {
      throw new Error(`Test 5 failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Test case 6: applyWatermark works with all styles
 * Note: Requires DOM/Canvas API (runs in browser environment)
 */
export async function testApplyWatermarkAllStyles() {
  // Skip if not in browser environment
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    console.log('Test 6 skipped: Not in browser environment (Canvas API required)');
    return;
  }

  try {
    const originalBlob = await createMockImageBlob();
    const styles = getAvailableStyles();

    for (const style of styles) {
      const watermarkedBlob = await applyWatermark(originalBlob, style);

      if (!(watermarkedBlob instanceof Blob) || watermarkedBlob.size === 0) {
        throw new Error(`Test 6 failed: Failed to apply '${style}' watermark`);
      }
    }

    console.log(`Test 6 passed: All ${styles.length} watermark styles work correctly`);
  } catch (error) {
    if (error instanceof WatermarkError) {
      throw new Error(`Test 6 failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Test case 7: applyWatermark rejects invalid styles
 * Note: Requires DOM/Canvas API (runs in browser environment)
 */
export async function testApplyWatermarkInvalidStyle() {
  // Skip if not in browser environment
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    console.log('Test 7 skipped: Not in browser environment (Canvas API required)');
    return;
  }

  try {
    const originalBlob = await createMockImageBlob();
    const invalidStyle = 'invalid' as WatermarkStyle;

    try {
      await applyWatermark(originalBlob, invalidStyle);
      throw new Error('Test 7 failed: Invalid style should be rejected');
    } catch (error) {
      if (error instanceof WatermarkError && error.message.includes('Invalid watermark style')) {
        console.log('Test 7 passed: Invalid watermark style correctly rejected');
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Test 7 passed')) {
      // Expected behavior
      console.log('Test 7 passed: Invalid watermark style correctly rejected');
    } else {
      throw error;
    }
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run all test cases
 * Returns array of test results with pass/fail status
 */
export async function runAllTests() {
  console.log('=== Running Watermark Generator Tests ===\n');

  const tests = [
    { name: 'getAvailableStyles', fn: testGetAvailableStyles },
    { name: 'getStyleDescription', fn: testGetStyleDescription },
    { name: 'isValidStyle', fn: testIsValidStyle },
    { name: 'Watermark Styles Config', fn: testWatermarkStylesConfig },
    { name: 'applyWatermark Output', fn: testApplyWatermarkOutput },
    { name: 'applyWatermark All Styles', fn: testApplyWatermarkAllStyles },
    { name: 'applyWatermark Invalid Style', fn: testApplyWatermarkInvalidStyle },
  ];

  const results = [];

  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, status: 'PASSED' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name: test.name, status: 'FAILED', message });
      console.error(`❌ ${message}\n`);
    }
  }

  console.log('\n=== Test Summary ===');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed === 0) {
    console.log('\n✓ All tests passed!');
  }

  return results;
}

// Export for use in test frameworks (Jest, Vitest, etc.)
export { testGetAvailableStyles as test1 };
export { testGetStyleDescription as test2 };
export { testIsValidStyle as test3 };
export { testWatermarkStylesConfig as test4 };
export { testApplyWatermarkOutput as test5 };
export { testApplyWatermarkAllStyles as test6 };
export { testApplyWatermarkInvalidStyle as test7 };
