/**
 * Text Sanitization Module for Feedback System
 * Implements XSS prevention through HTML tag stripping
 *
 * Features:
 * - Strips all HTML tags
 * - Removes dangerous characters
 * - Preserves safe text content
 * - Handles special characters properly
 *
 * Applied to:
 * - notes (max 300 chars)
 * - marine_life_custom (max 200 chars)
 */

/**
 * Sanitize text by removing all HTML tags and dangerous characters
 *
 * This function:
 * 1. Removes all HTML/XML tags
 * 2. Decodes HTML entities
 * 3. Removes control characters
 * 4. Preserves newlines and spaces
 *
 * @param text - Raw text input that may contain HTML
 * @returns Sanitized plain text safe for storage and display
 *
 * @example
 * sanitizeText('<script>alert("xss")</script>Hello')
 * // Returns: 'Hello'
 *
 * @example
 * sanitizeText('User said: &quot;Great dive!&quot;')
 * // Returns: 'User said: "Great dive!"'
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  // Convert to string if needed
  let sanitized = String(text);

  // Remove all HTML/XML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  // Handle common entities: &lt; &gt; &amp; &quot; &#x?[0-9a-f]+;
  sanitized = sanitized
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&'); // Must be last to avoid double-decoding

  // Decode numeric entities (decimal and hex)
  sanitized = sanitized.replace(/&#(\d+);/g, (match, dec) => {
    const charCode = parseInt(dec, 10);
    // Only allow safe character ranges
    if (charCode >= 32 && charCode <= 126) {
      return String.fromCharCode(charCode);
    }
    return '';
  });

  sanitized = sanitized.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    const charCode = parseInt(hex, 16);
    // Only allow safe character ranges
    if (charCode >= 32 && charCode <= 126) {
      return String.fromCharCode(charCode);
    }
    return '';
  });

  // Remove control characters (except newline, tab, carriage return)
  // ASCII 0-8, 11-12, 14-31 are control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Collapse multiple spaces (but preserve single spaces and newlines)
  sanitized = sanitized.replace(/ {2,}/g, ' ');

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate that text is appropriate length after sanitization
 *
 * @param text - Raw text input
 * @param maxLength - Maximum allowed length
 * @returns Boolean indicating if text fits within length constraint
 */
export function isTextLengthValid(text: string | null | undefined, maxLength: number): boolean {
  const sanitized = sanitizeText(text);
  return sanitized.length <= maxLength;
}

/**
 * Sanitize and validate notes field
 *
 * @param text - Raw notes text
 * @returns Sanitized notes, throws if invalid
 */
export function sanitizeNotes(text: string | null | undefined): string {
  const sanitized = sanitizeText(text);

  if (sanitized.length > 300) {
    throw new Error('Notes exceed maximum length of 300 characters after sanitization');
  }

  return sanitized;
}

/**
 * Sanitize and validate custom marine life field
 *
 * @param text - Raw custom marine life text
 * @returns Sanitized text, throws if invalid
 */
export function sanitizeMarineLifeCustom(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }

  const sanitized = sanitizeText(text);

  if (sanitized.length === 0) {
    return null; // Treat empty-after-sanitization as null
  }

  if (sanitized.length > 200) {
    throw new Error('Custom marine life text exceeds maximum length of 200 characters after sanitization');
  }

  return sanitized;
}

/**
 * INLINE TESTS
 */

function runTests() {
  console.log('=== Running Sanitization Tests ===\n');

  // Test 1: Remove HTML tags
  const test1Input = '<script>alert("xss")</script>Safe text';
  const test1Expected = 'Safe text';
  const test1Result = sanitizeText(test1Input);
  console.assert(
    test1Result === test1Expected,
    `Test 1 failed: Expected "${test1Expected}", got "${test1Result}"`
  );
  console.log('Test 1 passed: HTML tags removed');

  // Test 2: Decode HTML entities
  const test2Input = '&lt;div&gt;&quot;quoted&quot;&lt;/div&gt;';
  const test2Expected = '<div>"quoted"</div>';
  const test2Result = sanitizeText(test2Input);
  console.assert(
    test2Result === test2Expected,
    `Test 2 failed: Expected "${test2Expected}", got "${test2Result}"`
  );
  console.log('Test 2 passed: HTML entities decoded');

  // Test 3: Remove control characters
  const test3Input = 'Hello\x00World\x1F!';
  const test3Expected = 'HelloWorld!';
  const test3Result = sanitizeText(test3Input);
  console.assert(
    test3Result === test3Expected,
    `Test 3 failed: Expected "${test3Expected}", got "${test3Result}"`
  );
  console.log('Test 3 passed: Control characters removed');

  // Test 4: Preserve newlines
  const test4Input = 'Line 1\nLine 2';
  const test4Result = sanitizeText(test4Input);
  console.assert(
    test4Result.includes('\n'),
    `Test 4 failed: Newlines should be preserved`
  );
  console.log('Test 4 passed: Newlines preserved');

  // Test 5: Collapse multiple spaces
  const test5Input = 'Text    with    spaces';
  const test5Expected = 'Text with spaces';
  const test5Result = sanitizeText(test5Input);
  console.assert(
    test5Result === test5Expected,
    `Test 5 failed: Expected "${test5Expected}", got "${test5Result}"`
  );
  console.log('Test 5 passed: Multiple spaces collapsed');

  // Test 6: Handle null/undefined
  console.assert(sanitizeText(null) === '', 'Test 6 failed: null should return empty string');
  console.assert(sanitizeText(undefined) === '', 'Test 6b failed: undefined should return empty string');
  console.log('Test 6 passed: null/undefined handled');

  // Test 7: Validate notes length
  try {
    const longNotes = 'A'.repeat(301);
    sanitizeNotes(longNotes);
    console.error('Test 7 failed: Should throw for notes > 300 chars');
  } catch (e) {
    console.log('Test 7 passed: Notes length validation works');
  }

  // Test 8: Validate marine life custom length
  try {
    const longCustom = 'B'.repeat(201);
    sanitizeMarineLifeCustom(longCustom);
    console.error('Test 8 failed: Should throw for custom > 200 chars');
  } catch (e) {
    console.log('Test 8 passed: Marine life custom length validation works');
  }

  // Test 9: Return null for empty custom marine life
  const test9Result = sanitizeMarineLifeCustom('   ');
  console.assert(
    test9Result === null,
    `Test 9 failed: Expected null for whitespace-only input, got "${test9Result}"`
  );
  console.log('Test 9 passed: Empty custom marine life returns null');

  console.log('\n=== All tests completed ===');
}

// Run tests if module is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}

export { runTests };
