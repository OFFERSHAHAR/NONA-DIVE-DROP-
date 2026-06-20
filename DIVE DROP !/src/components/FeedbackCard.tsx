'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { FeedbackImageUpload } from './FeedbackImageUpload';
import { useAuth } from '@/hooks/useAuth';
import { useFeedback } from '@/hooks/useFeedback';
import { MARINE_SPECIES } from '@/types/feedback';
import type { FeedbackFormData } from '@/types/feedback';

/**
 * Props for the FeedbackCard component
 */
interface FeedbackCardProps {
  /** UUID of the dive site being reviewed */
  diveSiteId: string;
  /** UUID of the dive booking associated with this feedback */
  diveBookingId: string;
  /** Optional callback when feedback is successfully submitted */
  onSuccess?: () => void;
}

/**
 * FeedbackCard Component
 *
 * Main feedback form component that allows divers to report dive conditions,
 * marine life observations, and upload images after a completed dive.
 *
 * Form includes:
 * - Sea condition sliders (visibility, temperature, current strength)
 * - Marine life checkboxes with optional custom entry
 * - Text area for additional notes
 * - Image upload (up to 3 images)
 * - Submit button with loading state
 *
 * @component
 * @example
 * return (
 *   <FeedbackCard
 *     diveSiteId="dive-site-uuid"
 *     diveBookingId="booking-uuid"
 *     onSuccess={() => console.log('Feedback submitted')}
 *   />
 * );
 */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  diveSiteId,
  diveBookingId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { loading: submitting, error: submitError, submitFeedback } = useFeedback();

  // Form state
  const [visibility, setVisibility] = useState(25);
  const [temperature, setTemperature] = useState(22);
  const [currentStrength, setCurrentStrength] = useState(5);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherSpecies, setOtherSpecies] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handle marine life checkbox changes
  const handleSpeciesChange = (species: string, checked: boolean) => {
    if (species === 'other') {
      setShowOtherInput(checked);
      if (!checked) {
        setOtherSpecies('');
      }
    } else {
      setSelectedSpecies((prev) =>
        checked ? [...prev, species] : prev.filter((s) => s !== species)
      );
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (!user?.id) {
      setValidationError('You must be logged in to submit feedback');
      return;
    }

    if (selectedSpecies.length === 0 && !showOtherInput) {
      setValidationError('Please select at least one marine species or enter custom observation');
      return;
    }

    if (notes.trim().length === 0) {
      setValidationError('Please add some additional notes');
      return;
    }

    try {
      const feedbackData: FeedbackFormData = {
        visibility_meters: visibility,
        temperature_celsius: temperature,
        current_strength: currentStrength,
        marine_life: selectedSpecies,
        marine_life_custom: showOtherInput ? otherSpecies || null : null,
        notes: notes.trim(),
        image_urls: imageUrls,
      };

      await submitFeedback(diveSiteId, diveBookingId, user.id, feedbackData);

      // Reset form on success
      setVisibility(25);
      setTemperature(22);
      setCurrentStrength(5);
      setSelectedSpecies([]);
      setShowOtherInput(false);
      setOtherSpecies('');
      setNotes('');
      setImageUrls([]);

      // Call success callback
      onSuccess?.();
    } catch (err) {
      // Error is already set by useFeedback hook
      console.error('Feedback submission error:', err);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-border-primary dark:border-border-dark p-6">
      <h2 className="text-2xl font-bold text-text-primary dark:text-text-light mb-6">
        Dive Conditions Feedback
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error messages */}
        {(validationError || submitError) && (
          <div className="p-4 bg-error-hard/10 border border-error-hard rounded-md">
            <p className="text-sm text-error-hard">{validationError || submitError}</p>
          </div>
        )}

        {/* Sea Conditions Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary dark:text-text-light">
            Sea Conditions
          </h3>

          {/* Visibility */}
          <div className="space-y-2">
            <label
              htmlFor="visibility"
              className="block text-sm font-medium text-text-primary dark:text-text-light"
            >
              Visibility
              <span className="ml-2 text-primary font-bold">{visibility}m</span>
            </label>
            <div className="flex gap-3 items-end">
              <input
                type="range"
                id="visibility"
                min="0"
                max="50"
                value={visibility}
                onChange={(e) => setVisibility(Number(e.target.value))}
                className="flex-1 h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <Input
                type="number"
                min="0"
                max="50"
                value={visibility}
                onChange={(e) => setVisibility(Math.max(0, Math.min(50, Number(e.target.value))))}
                className="w-20"
              />
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <label
              htmlFor="temperature"
              className="block text-sm font-medium text-text-primary dark:text-text-light"
            >
              Temperature
              <span className="ml-2 text-primary font-bold">{temperature}°C</span>
            </label>
            <div className="flex gap-3 items-end">
              <input
                type="range"
                id="temperature"
                min="5"
                max="40"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="flex-1 h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <Input
                type="number"
                min="5"
                max="40"
                value={temperature}
                onChange={(e) =>
                  setTemperature(Math.max(5, Math.min(40, Number(e.target.value))))
                }
                className="w-20"
              />
            </div>
          </div>

          {/* Current Strength */}
          <div className="space-y-2">
            <label
              htmlFor="current"
              className="block text-sm font-medium text-text-primary dark:text-text-light"
            >
              Current Strength
              <span className="ml-2 text-primary font-bold">{currentStrength}/10</span>
            </label>
            <input
              type="range"
              id="current"
              min="0"
              max="10"
              value={currentStrength}
              onChange={(e) => setCurrentStrength(Number(e.target.value))}
              className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-text-tertiary">
              {currentStrength <= 3
                ? 'Calm'
                : currentStrength <= 6
                  ? 'Moderate'
                  : currentStrength <= 8
                    ? 'Strong'
                    : 'Very Strong'}
            </p>
          </div>
        </div>

        {/* Marine Life Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text-primary dark:text-text-light">
            Marine Life Spotted
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MARINE_SPECIES.map((species) => (
              <label
                key={species.key}
                className="flex items-center p-3 rounded-lg border border-border-primary dark:border-border-dark hover:bg-bg-secondary cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSpecies.includes(species.key)}
                  onChange={(e) => handleSpeciesChange(species.key, e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span className="ml-2 text-sm font-medium text-text-primary dark:text-text-light">
                  {species.icon} {species.label}
                </span>
              </label>
            ))}
          </div>

          {/* Other species checkbox */}
          <label className="flex items-center p-3 rounded-lg border border-border-primary dark:border-border-dark hover:bg-bg-secondary cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={showOtherInput}
              onChange={(e) => handleSpeciesChange('other', e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <span className="ml-2 text-sm font-medium text-text-primary dark:text-text-light">
              Other
            </span>
          </label>

          {/* Custom species text input */}
          {showOtherInput && (
            <Input
              id="other-species"
              placeholder="Describe what you saw (max 500 characters)"
              value={otherSpecies}
              onChange={(e) => setOtherSpecies(e.target.value.slice(0, 500))}
              maxLength={500}
              helperText={`${otherSpecies.length}/500 characters`}
            />
          )}
        </div>

        {/* General Feedback Section */}
        <div className="space-y-2">
          <TextArea
            id="notes"
            label="Additional Notes"
            placeholder="Share any other observations or feedback about the dive..."
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 300))}
            maxLength={300}
            required
            helperText={`${notes.length}/300 characters`}
          />
        </div>

        {/* Image Upload Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary dark:text-text-light">
            Upload Images
          </label>
          <p className="text-xs text-text-tertiary mb-3">
            Share photos from your dive (optional, max 3 images)
          </p>
          {user?.id && (
            <FeedbackImageUpload userId={user.id} onChange={setImageUrls} maxFiles={3} />
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackCard;
