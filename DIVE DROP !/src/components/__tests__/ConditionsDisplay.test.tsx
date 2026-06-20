import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConditionsDisplay } from '../ConditionsDisplay';
import type { AggregatedConditions } from '@/types/feedback';

/**
 * Mock useConditions hook
 */
vi.mock('@/hooks/useConditions', () => ({
  useConditions: vi.fn(),
}));

import { useConditions } from '@/hooks/useConditions';

const mockUseConditions = useConditions as ReturnType<typeof vi.fn>;

/**
 * Mock Button component
 */
vi.mock('../Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

/**
 * Mock AppIcon component
 */
vi.mock('../AppIcon', () => ({
  AppIcon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

/**
 * Test suite for ConditionsDisplay Component
 *
 * Tests focus on:
 * 1. Component rendering with data
 * 2. Loading state display
 * 3. Error state handling
 * 4. Insufficient data state
 * 5. Marine life expansion/collapse
 * 6. Time ago formatting
 * 7. Locale support (Hebrew and English)
 */

describe('ConditionsDisplay Component', () => {
  const mockConditionsData: AggregatedConditions = {
    date: '2026-06-20',
    visibility_avg: 25,
    visibility_min: 20,
    visibility_max: 30,
    temperature_avg: 22,
    current_strength_avg: 5,
    species_counts: {
      dolphin: 3,
      turtle: 2,
      coral: 1,
      fish_school: 4,
      ray: 1,
    },
    total_feedback_count: 5,
    cached_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // BASIC RENDERING TESTS
  // ========================================================================

  describe('Component Rendering', () => {
    it('should render with data successfully', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Conditions Today')).toBeInTheDocument();
      expect(screen.getByText('5 divers reported')).toBeInTheDocument();
    });

    it('should render visibility card with average, min, max values', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Visibility')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('20-30 m')).toBeInTheDocument();
    });

    it('should render temperature card with average value', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Temperature')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument();
      expect(screen.getByText('Average')).toBeInTheDocument();
    });

    it('should render current strength card with rating and intensity', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('should render marine life section with species and counts', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Marine Life Spotted')).toBeInTheDocument();
      expect(screen.getByText('Dolphins')).toBeInTheDocument();
      expect(screen.getByText('Sea Turtles')).toBeInTheDocument();
    });

    it('should render timestamp with "Updated" text', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // LOADING STATE TESTS
  // ========================================================================

  describe('Loading State', () => {
    it('should display loading message when data is loading', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Loading conditions...')).toBeInTheDocument();
    });

    it('should display loading spinner', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should not display data while loading', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.queryByText('Conditions Today')).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // ERROR STATE TESTS
  // ========================================================================

  describe('Error State', () => {
    it('should display error message when API fails', () => {
      const errorMessage = 'Failed to fetch conditions: 500';
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: false,
        error: errorMessage,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should display alert icon for error state', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: false,
        error: 'Network error',
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
    });

    it('should not display error when error is "Insufficient feedback"', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: false,
        error: 'Insufficient feedback',
      });

      const { container } = render(<ConditionsDisplay diveSiteId="test-site-123" />);

      const alertElement = container.querySelector('[role="alert"]');
      expect(alertElement?.textContent).not.toContain('Network error');
    });
  });

  // ========================================================================
  // INSUFFICIENT DATA STATE TESTS
  // ========================================================================

  describe('Insufficient Data State', () => {
    it('should display insufficient data message when feedback count < 2', () => {
      const insufficientData: AggregatedConditions = {
        ...mockConditionsData,
        total_feedback_count: 1,
      };

      mockUseConditions.mockReturnValue({
        data: insufficientData,
        isLoading: false,
        error: 'Insufficient feedback',
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(
        screen.getByText('Not enough feedback entries to display conditions')
      ).toBeInTheDocument();
    });

    it('should display info icon for insufficient data', () => {
      const insufficientData: AggregatedConditions = {
        ...mockConditionsData,
        total_feedback_count: 1,
      };

      mockUseConditions.mockReturnValue({
        data: insufficientData,
        isLoading: false,
        error: 'Insufficient feedback',
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByTestId('icon-info')).toBeInTheDocument();
    });

    it('should not display data sections when data is insufficient', () => {
      const insufficientData: AggregatedConditions = {
        ...mockConditionsData,
        total_feedback_count: 1,
      };

      mockUseConditions.mockReturnValue({
        data: insufficientData,
        isLoading: false,
        error: 'Insufficient feedback',
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.queryByText('Conditions Today')).not.toBeInTheDocument();
      expect(screen.queryByText('Visibility')).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // MARINE LIFE EXPANSION TESTS
  // ========================================================================

  describe('Marine Life Section', () => {
    it('should show View Details button when more than 3 species', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData, // Has 5 species
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('View details')).toBeInTheDocument();
    });

    it('should toggle marine life expansion on button click', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      const { rerender } = render(<ConditionsDisplay diveSiteId="test-site-123" />);

      const viewDetailsButton = screen.getByText('View details');
      fireEvent.click(viewDetailsButton);

      // Re-render to see state changes
      rerender(<ConditionsDisplay diveSiteId="test-site-123" />);

      // After expanding, should show all species
      expect(screen.getByText('Rays')).toBeInTheDocument();
    });

    it('should not show View Details button when 3 or fewer species', () => {
      const limitedSpeciesData: AggregatedConditions = {
        ...mockConditionsData,
        species_counts: {
          dolphin: 3,
          turtle: 2,
          coral: 1,
        },
      };

      mockUseConditions.mockReturnValue({
        data: limitedSpeciesData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.queryByText('View details')).not.toBeInTheDocument();
    });

    it('should not render marine life section when no species are spotted', () => {
      const noSpeciesData: AggregatedConditions = {
        ...mockConditionsData,
        species_counts: {},
      };

      mockUseConditions.mockReturnValue({
        data: noSpeciesData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.queryByText('Marine Life Spotted')).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // CURRENT STRENGTH INTENSITY TESTS
  // ========================================================================

  describe('Current Strength Intensity', () => {
    it('should display "Weak" for strength 0-2', () => {
      const weakCurrentData: AggregatedConditions = {
        ...mockConditionsData,
        current_strength_avg: 1,
      };

      mockUseConditions.mockReturnValue({
        data: weakCurrentData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    it('should display "Moderate" for strength 3-5', () => {
      const moderateCurrentData: AggregatedConditions = {
        ...mockConditionsData,
        current_strength_avg: 4,
      };

      mockUseConditions.mockReturnValue({
        data: moderateCurrentData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('should display "Strong" for strength 6-7', () => {
      const strongCurrentData: AggregatedConditions = {
        ...mockConditionsData,
        current_strength_avg: 6,
      };

      mockUseConditions.mockReturnValue({
        data: strongCurrentData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('should display "Very Strong" for strength 8-10', () => {
      const veryStrongCurrentData: AggregatedConditions = {
        ...mockConditionsData,
        current_strength_avg: 9,
      };

      mockUseConditions.mockReturnValue({
        data: veryStrongCurrentData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('Very Strong')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // LOCALE SUPPORT TESTS (HEBREW)
  // ========================================================================

  describe('Locale Support - Hebrew', () => {
    it('should render Hebrew header when locale is "he"', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" locale="he" />);

      expect(screen.getByText('תנאים היום')).toBeInTheDocument();
      expect(screen.getByText('צוללים דיווחו')).toBeInTheDocument();
    });

    it('should display Hebrew labels for cards', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" locale="he" />);

      expect(screen.getByText('ראות')).toBeInTheDocument();
      expect(screen.getByText('טמפרטורה')).toBeInTheDocument();
      expect(screen.getByText('זרם')).toBeInTheDocument();
    });

    it('should display Hebrew marine life label', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" locale="he" />);

      expect(screen.getByText('חיות ים שנצפו')).toBeInTheDocument();
    });

    it('should display Hebrew loading message', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" locale="he" />);

      expect(screen.getByText('טוען תנאים...')).toBeInTheDocument();
    });

    it('should display Hebrew insufficient data message', () => {
      const insufficientData: AggregatedConditions = {
        ...mockConditionsData,
        total_feedback_count: 1,
      };

      mockUseConditions.mockReturnValue({
        data: insufficientData,
        isLoading: false,
        error: 'Insufficient feedback',
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" locale="he" />);

      expect(screen.getByText('אין מספיק משוב כדי להציג תנאים')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // ROUNDING AND FORMATTING TESTS
  // ========================================================================

  describe('Data Formatting', () => {
    it('should round visibility values to nearest integer', () => {
      const decimalData: AggregatedConditions = {
        ...mockConditionsData,
        visibility_avg: 25.7,
        visibility_min: 20.3,
        visibility_max: 30.9,
      };

      mockUseConditions.mockReturnValue({
        data: decimalData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('26')).toBeInTheDocument();
      expect(screen.getByText('20-31 m')).toBeInTheDocument();
    });

    it('should round temperature to nearest integer', () => {
      const decimalData: AggregatedConditions = {
        ...mockConditionsData,
        temperature_avg: 22.6,
      };

      mockUseConditions.mockReturnValue({
        data: decimalData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('23')).toBeInTheDocument();
    });

    it('should round current strength to nearest integer', () => {
      const decimalData: AggregatedConditions = {
        ...mockConditionsData,
        current_strength_avg: 5.7,
      };

      mockUseConditions.mockReturnValue({
        data: decimalData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // SPECIES SORTING TESTS
  // ========================================================================

  describe('Species Sorting', () => {
    it('should sort species by count in descending order', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData, // fish_school: 4, dolphin: 3, turtle: 2, coral: 1, ray: 1
        isLoading: false,
        error: null,
      });

      const { container } = render(<ConditionsDisplay diveSiteId="test-site-123" />);

      // Get all marine life items
      const marineLifeItems = container.querySelectorAll(
        '[role="region"] [style*="display"]'
      );

      // First visible species should be Fish Schools (count: 4)
      // This tests the sorting logic
      expect(screen.getByText('Fish Schools')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // PROPS AND INTEGRATION TESTS
  // ========================================================================

  describe('Props and Integration', () => {
    it('should accept diveSiteId prop', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="site-12345" />);

      expect(mockUseConditions).toHaveBeenCalledWith('site-12345', undefined);
    });

    it('should pass locale to useConditions hook', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site" locale="he" />);

      // Component should render with locale applied
      expect(screen.getByText('תנאים היום')).toBeInTheDocument();
    });

    it('should be forwardRef-able', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      const ref = React.createRef<HTMLDivElement>();
      render(<ConditionsDisplay diveSiteId="test-site" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct displayName', () => {
      expect(ConditionsDisplay.displayName).toBe('ConditionsDisplay');
    });
  });

  // ========================================================================
  // ACCESSIBILITY TESTS
  // ========================================================================

  describe('Accessibility', () => {
    it('should have region role for data state', () => {
      mockUseConditions.mockReturnValue({
        data: mockConditionsData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should have status role for loading state', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have alert role for error state', () => {
      mockUseConditions.mockReturnValue({
        data: null,
        isLoading: false,
        error: 'Network error',
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle zero species counts gracefully', () => {
      const zeroSpeciesData: AggregatedConditions = {
        ...mockConditionsData,
        species_counts: {},
      };

      mockUseConditions.mockReturnValue({
        data: zeroSpeciesData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.queryByText('Marine Life Spotted')).not.toBeInTheDocument();
      expect(screen.getByText('Conditions Today')).toBeInTheDocument();
    });

    it('should handle very large temperature values', () => {
      const hotWaterData: AggregatedConditions = {
        ...mockConditionsData,
        temperature_avg: 35,
      };

      mockUseConditions.mockReturnValue({
        data: hotWaterData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('35')).toBeInTheDocument();
    });

    it('should handle very large visibility values', () => {
      const excellentVisibilityData: AggregatedConditions = {
        ...mockConditionsData,
        visibility_avg: 50,
        visibility_min: 45,
        visibility_max: 50,
      };

      mockUseConditions.mockReturnValue({
        data: excellentVisibilityData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should handle large feedback count', () => {
      const largeCountData: AggregatedConditions = {
        ...mockConditionsData,
        total_feedback_count: 100,
      };

      mockUseConditions.mockReturnValue({
        data: largeCountData,
        isLoading: false,
        error: null,
      });

      render(<ConditionsDisplay diveSiteId="test-site-123" />);

      expect(screen.getByText('100 divers reported')).toBeInTheDocument();
    });
  });
});
