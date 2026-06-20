/**
 * TrainingRecommendationCard Component
 * Displays a recommended training program with matching score and action buttons
 */

'use client';

import { useState } from 'react';
import { RecommendationResponse } from '@/types/training';
import { useToast } from '@/hooks/useToast';

interface TrainingRecommendationCardProps {
  recommendation: RecommendationResponse;
  onEnroll?: (trainingId: string) => void;
  onView?: (trainingId: string) => void;
}

export function TrainingRecommendationCard({
  recommendation,
  onEnroll,
  onView,
}: TrainingRecommendationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 0.8) return 'bg-green-50';
    if (score >= 0.6) return 'bg-yellow-50';
    return 'bg-orange-50';
  };

  const getDepthColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-purple-100 text-purple-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/training/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_program_id: recommendation.training_program_id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast({
          type: 'success',
          message: 'Successfully enrolled in training program!',
        });
        onEnroll?.(recommendation.training_program_id);
      } else {
        showToast({
          type: 'error',
          message: result.error || 'Failed to enroll',
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        message: 'An error occurred while enrolling',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = () => {
    onView?.(recommendation.training_program_id);
  };

  const confidencePercent = (recommendation.confidence_score * 100).toFixed(0);

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${getConfidenceBg(recommendation.confidence_score)}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 line-clamp-2">
              {recommendation.program_name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              by {recommendation.instructor_name}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${getDepthColor(recommendation.depth_level)}`}>
            {recommendation.depth_level.charAt(0).toUpperCase() + recommendation.depth_level.slice(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Confidence Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Match Score</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getConfidenceColor(recommendation.confidence_score).replace('text-', 'bg-')}`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className={`text-sm font-semibold ${getConfidenceColor(recommendation.confidence_score)}`}>
              {confidencePercent}%
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="bg-white bg-opacity-50 rounded p-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">Why: </span>
            {recommendation.reason}
          </p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600 text-xs">Price</p>
            <p className="font-semibold text-gray-900">
              ₪{recommendation.price_shekel.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-xs">Location</p>
            <p className="font-semibold text-gray-900 truncate">
              {recommendation.location}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-white bg-opacity-50 border-t border-gray-200 flex gap-2">
        <button
          onClick={handleView}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={handleEnroll}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Enrolling...' : 'Enroll Now'}
        </button>
      </div>
    </div>
  );
}
