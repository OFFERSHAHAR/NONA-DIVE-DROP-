/**
 * Dive Site Feedback System Type Definitions
 * Complete TypeScript definitions for feedback collection and aggregation
 */

// ============================================================================
// MARINE SPECIES CONSTANT
// ============================================================================

export interface MarineSpecies {
  key: string;
  label: string;
  icon: string;
}

export const MARINE_SPECIES: MarineSpecies[] = [
  { key: 'dolphin', label: 'Dolphins', icon: '🐬' },
  { key: 'turtle', label: 'Sea Turtles', icon: '🐢' },
  { key: 'coral', label: 'Coral Reef', icon: '🪸' },
  { key: 'fish_school', label: 'Fish Schools', icon: '🐠' },
  { key: 'ray', label: 'Rays', icon: '🦑' },
  { key: 'seahorse', label: 'Seahorses', icon: '🐴' },
];

// ============================================================================
// FEEDBACK FORM DATA (Client-side input)
// ============================================================================

/**
 * FeedbackFormData represents the shape of feedback data as submitted by a diver.
 * This is the input shape for the feedback form, without database-specific fields.
 *
 * @property visibility_meters - Water visibility in meters (0-50)
 * @property temperature_celsius - Water temperature in Celsius (5-40)
 * @property current_strength - Current strength rating (0-10 scale)
 * @property marine_life - Array of observed marine species keys
 * @property marine_life_custom - Optional custom text for "Other" species
 * @property notes - Additional notes about the dive conditions (max 300 chars)
 * @property image_urls - Array of image URLs (max 3 images, 2MB each JPEG/PNG)
 */
export interface FeedbackFormData {
  visibility_meters: number;
  temperature_celsius: number;
  current_strength: number;
  marine_life: string[];
  marine_life_custom: string | null;
  notes: string;
  image_urls: string[];
}

// ============================================================================
// FEEDBACK ENTITY (Database record)
// ============================================================================

/**
 * FeedbackEntity represents a complete feedback record as stored in the database.
 * Extends FeedbackFormData with database identifiers and timestamps.
 *
 * @property id - UUID identifier for the feedback record (primary key)
 * @property dive_booking_id - UUID reference to the associated dive booking
 * @property diver_id - UUID reference to the diver who submitted the feedback
 * @property dive_site_id - UUID reference to the dive site being reviewed
 * @property submitted_at - Timestamp when feedback was submitted (ISO 8601)
 * @property created_at - Timestamp when record was created (ISO 8601)
 */
export interface FeedbackEntity extends FeedbackFormData {
  id: string;
  dive_booking_id: string;
  diver_id: string;
  dive_site_id: string;
  submitted_at: string;
  created_at: string;
}

// ============================================================================
// AGGREGATED CONDITIONS (Site-level aggregation)
// ============================================================================

/**
 * AggregatedConditions represents aggregated dive conditions for a site.
 * Calculated from multiple feedback entries with minimum 2 entries required.
 *
 * @property date - Date of aggregation in DATE format (YYYY-MM-DD)
 * @property visibility_avg - Average visibility across feedback entries
 * @property visibility_min - Minimum visibility recorded
 * @property visibility_max - Maximum visibility recorded
 * @property temperature_avg - Average temperature across entries
 * @property current_strength_avg - Average current strength across entries
 * @property species_counts - Count of sightings per species
 * @property total_feedback_count - Total number of feedback entries (minimum 2 to display)
 * @property cached_at - Timestamp when cache was last generated (ISO 8601)
 */
export interface AggregatedConditions {
  date: string;
  visibility_avg: number;
  visibility_min: number;
  visibility_max: number;
  temperature_avg: number;
  current_strength_avg: number;
  species_counts: Record<string, number>;
  total_feedback_count: number;
  cached_at: string;
}
