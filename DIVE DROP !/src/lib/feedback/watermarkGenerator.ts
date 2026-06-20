/**
 * Watermark Generator for Feedback Images
 * Applies DIVE DROP branding watermarks to feedback images before upload
 *
 * Features:
 * - Multiple watermark styles: 'logo', 'badge', 'text'
 * - Position: bottom-right corner with padding
 * - Opacity: Semi-transparent (60-80%)
 * - Quality: Preserves original image quality
 * - Canvas-based: Works client-side without external dependencies
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Watermark configuration per style
 * Includes dimensions, positioning, and styling
 */
export const WATERMARK_STYLES = {
  logo: {
    width: 250,
    height: 100,
    opacity: 0.7,
    padding: 20,
    description: 'DIVE DROP logo watermark',
  },
  badge: {
    width: 200,
    height: 200,
    opacity: 0.65,
    padding: 15,
    description: 'Badge-style watermark',
  },
  text: {
    width: 300,
    height: 60,
    opacity: 0.75,
    padding: 25,
    description: 'Text-based watermark',
  },
} as const;

export type WatermarkStyle = keyof typeof WATERMARK_STYLES;

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Custom error for watermark application failures
 */
export class WatermarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WatermarkError';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Draws a text watermark on a canvas
 * Creates a simple text-based watermark with styling
 *
 * @param ctx - Canvas rendering context
 * @param watermarkText - Text to display (default: "© DIVE DROP")
 * @param x - X position
 * @param y - Y position
 * @param maxWidth - Maximum width for text
 */
function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  watermarkText: string,
  x: number,
  y: number,
  maxWidth: number
): void {
  // Text styling
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Add text shadow for visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Draw text with word wrapping
  const words = watermarkText.split(' ');
  let currentY = y;
  let currentText = '';

  for (const word of words) {
    const testText = currentText ? `${currentText} ${word}` : word;
    const metrics = ctx.measureText(testText);

    if (metrics.width > maxWidth && currentText) {
      ctx.fillText(currentText, x, currentY);
      currentText = word;
      currentY += 30;
    } else {
      currentText = testText;
    }
  }

  if (currentText) {
    ctx.fillText(currentText, x, currentY);
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
}

/**
 * Draws a badge-style watermark with border and background
 * Creates a rounded rectangle badge with centered text
 *
 * @param ctx - Canvas rendering context
 * @param x - X position
 * @param y - Y position
 * @param width - Badge width
 * @param height - Badge height
 */
function drawBadgeWatermark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const radius = 10;

  // Draw rounded rectangle background
  ctx.fillStyle = 'rgba(0, 100, 200, 0.8)';
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();

  // Draw border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw text
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // Add shadow to text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillText('DIVE DROP', centerX, centerY - 12);

  // Smaller subtext
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('Verified Diver', centerX, centerY + 14);

  // Reset shadow
  ctx.shadowColor = 'transparent';
}

/**
 * Draws a logo-style watermark
 * Creates a stylized logo representation with geometric shapes
 *
 * @param ctx - Canvas rendering context
 * @param x - X position
 * @param y - Y position
 */
function drawLogoWatermark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const logoSize = 60;
  const textX = x + logoSize + 15;

  // Draw stylized diving symbol (abstract wave)
  ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)';
  ctx.fillStyle = 'rgba(0, 150, 255, 0.7)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw water waves
  const waveY = y + 15;
  ctx.beginPath();
  ctx.moveTo(x + 10, waveY);
  ctx.quadraticCurveTo(x + 20, waveY - 8, x + 30, waveY);
  ctx.quadraticCurveTo(x + 40, waveY + 8, x + 50, waveY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 10, waveY + 15);
  ctx.quadraticCurveTo(x + 20, waveY + 7, x + 30, waveY + 15);
  ctx.quadraticCurveTo(x + 40, waveY + 23, x + 50, waveY + 15);
  ctx.stroke();

  // Draw diver figure (simple icon)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(x + 30, y + 50, 6, 0, Math.PI * 2);
  ctx.fill();

  // Diver body
  ctx.fillRect(x + 25, y + 58, 10, 15);

  // Diver legs
  ctx.fillRect(x + 24, y + 73, 3, 10);
  ctx.fillRect(x + 33, y + 73, 3, 10);

  // Draw text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillText('DIVE DROP', textX, y);
  ctx.font = '11px Arial, sans-serif';
  ctx.fillText('Feedback Verified', textX, y + 24);

  ctx.shadowColor = 'transparent';
}

/**
 * Loads an image from a Blob
 * @param blob - Image blob to load
 * @returns Promise resolving to an HTMLImageElement
 */
function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new WatermarkError('Failed to load image from blob'));
    };

    img.src = url;
  });
}

/**
 * Creates an off-screen canvas for watermark rendering
 * @param style - Watermark style to use
 * @returns Canvas element with watermark drawn
 */
function createWatermarkCanvas(style: WatermarkStyle): HTMLCanvasElement {
  const config = WATERMARK_STYLES[style];
  const canvas = document.createElement('canvas');

  canvas.width = config.width;
  canvas.height = config.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new WatermarkError('Failed to get canvas context for watermark');
  }

  // Make transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw watermark based on style
  switch (style) {
    case 'text':
      drawTextWatermark(ctx, '© DIVE DROP - Verified Feedback', 15, 30, 270);
      break;
    case 'badge':
      drawBadgeWatermark(ctx, 10, 5, 180, 190);
      break;
    case 'logo':
      drawLogoWatermark(ctx, 10, 5);
      break;
  }

  return canvas;
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Applies a watermark to an image blob
 *
 * Process:
 * 1. Loads the image from blob
 * 2. Creates a watermark canvas based on style
 * 3. Draws both on a new canvas with proper positioning
 * 4. Returns watermarked image as blob
 *
 * The watermark is positioned in the bottom-right corner with configurable
 * padding and opacity, preserving the original image quality.
 *
 * @param imageBlob - The image blob to watermark
 * @param watermarkStyle - Style of watermark ('logo', 'badge', 'text')
 * @returns Promise<Blob> - Watermarked image as blob
 * @throws WatermarkError if watermarking fails
 *
 * @example
 * const compressedBlob = await compressImage(file);
 * const watermarkedBlob = await applyWatermark(compressedBlob, 'logo');
 * console.log('Watermarked image ready for upload');
 */
export async function applyWatermark(
  imageBlob: Blob,
  watermarkStyle: WatermarkStyle = 'logo'
): Promise<Blob> {
  try {
    // Validate style
    if (!(watermarkStyle in WATERMARK_STYLES)) {
      throw new WatermarkError(
        `Invalid watermark style: ${watermarkStyle}. Available styles: ${Object.keys(WATERMARK_STYLES).join(', ')}`
      );
    }

    // Load image from blob
    const image = await loadImageFromBlob(imageBlob);

    // Get watermark configuration
    const config = WATERMARK_STYLES[watermarkStyle];

    // Create watermark canvas
    const watermarkCanvas = createWatermarkCanvas(watermarkStyle);

    // Create final canvas with original image dimensions
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = image.width;
    finalCanvas.height = image.height;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
      throw new WatermarkError('Failed to get canvas context for final image');
    }

    // Draw original image
    ctx.drawImage(image, 0, 0);

    // Calculate watermark position (bottom-right with padding)
    const watermarkX = finalCanvas.width - config.width - config.padding;
    const watermarkY = finalCanvas.height - config.height - config.padding;

    // Apply opacity to watermark
    ctx.globalAlpha = config.opacity;

    // Draw watermark on bottom-right
    ctx.drawImage(watermarkCanvas, watermarkX, watermarkY);

    // Reset global alpha
    ctx.globalAlpha = 1;

    // Convert to blob (preserve original format)
    return new Promise((resolve, reject) => {
      finalCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new WatermarkError('Failed to create blob from watermarked canvas'));
            return;
          }
          resolve(blob);
        },
        imageBlob.type || 'image/jpeg',
        0.9 // High quality
      );
    });
  } catch (error) {
    if (error instanceof WatermarkError) {
      throw error;
    }
    throw new WatermarkError(
      `Watermark application failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets the list of available watermark styles
 * @returns Array of available watermark style names
 *
 * @example
 * const styles = getAvailableStyles();
 * console.log(styles); // ['logo', 'badge', 'text']
 */
export function getAvailableStyles(): WatermarkStyle[] {
  return Object.keys(WATERMARK_STYLES) as WatermarkStyle[];
}

/**
 * Gets description for a specific watermark style
 * @param style - The watermark style
 * @returns Description string for the style
 *
 * @example
 * const desc = getStyleDescription('logo');
 * console.log(desc); // "DIVE DROP logo watermark"
 */
export function getStyleDescription(style: WatermarkStyle): string {
  if (!(style in WATERMARK_STYLES)) {
    return 'Unknown style';
  }
  return WATERMARK_STYLES[style].description;
}

/**
 * Validates if a style is supported
 * @param style - The style to validate
 * @returns boolean indicating if style is supported
 */
export function isValidStyle(style: string): style is WatermarkStyle {
  return style in WATERMARK_STYLES;
}

// ============================================================================
// INLINE TESTS
// ============================================================================

/**
 * Test case 1: Verify available styles
 */
function testGetAvailableStyles() {
  const styles = getAvailableStyles();
  console.assert(
    styles.includes('logo') && styles.includes('badge') && styles.includes('text'),
    'Test 1 failed: All expected styles should be available'
  );
  console.log('Test 1 passed: All watermark styles available');
}

/**
 * Test case 2: Verify style descriptions
 */
function testGetStyleDescription() {
  const logoDesc = getStyleDescription('logo');
  console.assert(
    logoDesc !== 'Unknown style' && logoDesc.length > 0,
    'Test 2 failed: Logo style should have a description'
  );
  console.log('Test 2 passed: Style descriptions work correctly');
}

/**
 * Test case 3: Validate style validation
 */
function testValidateStyle() {
  console.assert(
    isValidStyle('logo') && isValidStyle('badge') && isValidStyle('text'),
    'Test 3 failed: Valid styles should pass validation'
  );
  console.assert(
    !isValidStyle('invalid') && !isValidStyle('unknown'),
    'Test 3 failed: Invalid styles should fail validation'
  );
  console.log('Test 3 passed: Style validation works correctly');
}

/**
 * Test case 4: Verify watermark configuration
 */
function testWatermarkConfig() {
  const config = WATERMARK_STYLES['logo'];
  console.assert(
    config.width > 0 && config.height > 0 && config.opacity > 0 && config.opacity <= 1,
    'Test 4 failed: Watermark config should have valid dimensions and opacity'
  );
  console.log('Test 4 passed: Watermark configuration is valid');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('=== Running Watermark Generator Tests ===\n');
  testGetAvailableStyles();
  testGetStyleDescription();
  testValidateStyle();
  testWatermarkConfig();
  console.log('\n=== All tests completed ===');
}

// Execute tests if module is run directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}

export { runAllTests };
