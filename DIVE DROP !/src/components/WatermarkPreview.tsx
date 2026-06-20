'use client';

/**
 * Watermark Preview Component
 * Shows original and watermarked image side-by-side with style selector
 *
 * Features:
 * - Side-by-side comparison view
 * - Watermark style selector with descriptions
 * - Confirm/Cancel buttons
 * - Loading state during watermark generation
 * - Error handling with user-friendly messages
 * - Responsive design for mobile and desktop
 */

import { useEffect, useRef, useState } from 'react';
import { applyWatermark, getAvailableStyles, getStyleDescription, WatermarkStyle } from '@/lib/feedback/watermarkGenerator';
import Button from './Button';
import Card from './Card';
import './WatermarkPreview.css';

// ============================================================================
// TYPES
// ============================================================================

export interface WatermarkPreviewProps {
  /**
   * Original image blob to display and watermark
   */
  originalBlob: Blob;

  /**
   * Callback when user confirms the watermarked image
   * Receives the watermarked blob as parameter
   */
  onConfirm: (watermarkedBlob: Blob) => void;

  /**
   * Callback when user cancels the preview
   * No parameters
   */
  onCancel: () => void;

  /**
   * Initial watermark style to display
   * Defaults to 'logo'
   */
  initialStyle?: WatermarkStyle;

  /**
   * Optional class name for custom styling
   */
  className?: string;
}

interface ImageState {
  blob: Blob | null;
  url: string;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function WatermarkPreview({
  originalBlob,
  onConfirm,
  onCancel,
  initialStyle = 'logo',
  className = '',
}: WatermarkPreviewProps) {
  // ========== STATE ==========

  const [selectedStyle, setSelectedStyle] = useState<WatermarkStyle>(initialStyle);
  const [originalImage, setOriginalImage] = useState<ImageState>({
    blob: originalBlob,
    url: '',
    loading: true,
    error: null,
  });
  const [watermarkedImage, setWatermarkedImage] = useState<ImageState>({
    blob: null,
    url: '',
    loading: true,
    error: null,
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const watermarkedCanvasRef = useRef<HTMLCanvasElement>(null);

  // ========== EFFECTS ==========

  /**
   * Load original image on mount
   */
  useEffect(() => {
    const loadOriginalImage = async () => {
      try {
        const url = URL.createObjectURL(originalBlob);
        setOriginalImage({
          blob: originalBlob,
          url,
          loading: false,
          error: null,
        });
      } catch (error) {
        setOriginalImage((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to load original image',
        }));
      }
    };

    loadOriginalImage();

    return () => {
      if (originalImage.url) {
        URL.revokeObjectURL(originalImage.url);
      }
    };
  }, [originalBlob]);

  /**
   * Generate watermarked image when style changes
   */
  useEffect(() => {
    const generateWatermarkedImage = async () => {
      setWatermarkedImage((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        // Apply watermark
        const watermarkedBlob = await applyWatermark(originalBlob, selectedStyle);

        // Create object URL for preview
        const url = URL.createObjectURL(watermarkedBlob);

        setWatermarkedImage({
          blob: watermarkedBlob,
          url,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to generate watermarked image';

        setWatermarkedImage((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    generateWatermarkedImage();

    return () => {
      if (watermarkedImage.url) {
        URL.revokeObjectURL(watermarkedImage.url);
      }
    };
  }, [selectedStyle, originalBlob]);

  // ========== EVENT HANDLERS ==========

  /**
   * Handle watermark style change
   */
  const handleStyleChange = (style: WatermarkStyle) => {
    setSelectedStyle(style);
  };

  /**
   * Handle confirm button click
   */
  const handleConfirm = async () => {
    if (!watermarkedImage.blob) {
      return;
    }

    setIsConfirming(true);
    try {
      onConfirm(watermarkedImage.blob);
    } finally {
      setIsConfirming(false);
    }
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = () => {
    // Clean up object URLs
    if (originalImage.url) {
      URL.revokeObjectURL(originalImage.url);
    }
    if (watermarkedImage.url) {
      URL.revokeObjectURL(watermarkedImage.url);
    }
    onCancel();
  };

  // ========== RENDER ==========

  return (
    <div className={`watermark-preview-container ${className}`}>
      {/* Header */}
      <div className="watermark-preview-header">
        <h2>Preview & Watermark Selection</h2>
        <p className="watermark-preview-subtitle">
          Choose a watermark style for your feedback image. The watermark will appear in the bottom-right corner.
        </p>
      </div>

      {/* Style Selector */}
      <Card className="watermark-style-selector">
        <div className="style-selector-header">
          <h3>Select Watermark Style</h3>
        </div>

        <div className="style-options">
          {getAvailableStyles().map((style) => (
            <button
              key={style}
              className={`style-option ${selectedStyle === style ? 'active' : ''}`}
              onClick={() => handleStyleChange(style)}
              type="button"
              aria-label={`Select ${style} watermark style`}
              aria-pressed={selectedStyle === style}
            >
              <div className="style-option-label">{style.charAt(0).toUpperCase() + style.slice(1)}</div>
              <div className="style-option-description">{getStyleDescription(style)}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Image Comparison */}
      <div className="watermark-comparison">
        {/* Original Image */}
        <div className="comparison-column">
          <div className="comparison-header">
            <h4>Original</h4>
          </div>

          <div className="image-container original-image">
            {originalImage.loading ? (
              <div className="image-loading">
                <div className="spinner"></div>
                <p>Loading original image...</p>
              </div>
            ) : originalImage.error ? (
              <div className="image-error">
                <p>{originalImage.error}</p>
              </div>
            ) : originalImage.url ? (
              <img
                ref={originalCanvasRef}
                src={originalImage.url}
                alt="Original image without watermark"
                className="preview-image"
              />
            ) : null}
          </div>
        </div>

        {/* Watermarked Image */}
        <div className="comparison-column">
          <div className="comparison-header">
            <h4>With Watermark</h4>
          </div>

          <div className="image-container watermarked-image">
            {watermarkedImage.loading ? (
              <div className="image-loading">
                <div className="spinner"></div>
                <p>Generating watermark...</p>
              </div>
            ) : watermarkedImage.error ? (
              <div className="image-error">
                <p>{watermarkedImage.error}</p>
              </div>
            ) : watermarkedImage.url ? (
              <img
                ref={watermarkedCanvasRef}
                src={watermarkedImage.url}
                alt="Image with watermark applied"
                className="preview-image"
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <Card className="watermark-info">
        <div className="info-content">
          <div className="info-icon">ℹ️</div>
          <div className="info-text">
            <h4>About Watermarks</h4>
            <p>
              Watermarks help verify the authenticity of feedback images. They appear in the bottom-right corner at 60-80% opacity
              and don't affect the quality of your photo.
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="watermark-actions">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isConfirming}
          className="action-button cancel-button"
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!watermarkedImage.blob || watermarkedImage.loading || isConfirming}
          className="action-button confirm-button"
        >
          {isConfirming ? 'Processing...' : 'Confirm & Continue'}
        </Button>
      </div>
    </div>
  );
}
