/**
 * TrainingBrowser Component
 * Browse training programs with depth filtering, location, price, and ratings
 */

'use client';

import { useState, useEffect } from 'react';
import { TrainingProgram, TrainingDepthLevel } from '@/types/training';
import { useToast } from '@/hooks/useToast';

interface TrainingBrowserProps {
  onSelectTraining?: (training: TrainingProgram) => void;
  onEnroll?: (trainingId: string) => void;
}

export function TrainingBrowser({ onSelectTraining, onEnroll }: TrainingBrowserProps) {
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [depthLevel, setDepthLevel] = useState<TrainingDepthLevel | ''>('');
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [rating, setRating] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'price' | 'rating' | 'date'>(
    'relevance'
  );

  // Pagination
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const { showToast } = useToast();

  const fetchTrainings = async (newOffset = 0) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (depthLevel) params.append('depth_level', depthLevel);
      if (location) params.append('location', location);
      if (minPrice) params.append('min_price', minPrice.toString());
      if (maxPrice) params.append('max_price', maxPrice.toString());
      if (rating) params.append('instructor_rating', rating);
      params.append('sort_by', sortBy);
      params.append('limit', limit.toString());
      params.append('offset', newOffset.toString());

      const response = await fetch(`/api/training?${params}`);
      const result = await response.json();

      if (result.success) {
        setTrainings(result.data);
        setTotalCount(result.pagination.total);
        setOffset(newOffset);
      } else {
        showToast({
          type: 'error',
          message: result.error || 'Failed to load trainings',
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        message: 'An error occurred while loading trainings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings(0);
  }, [depthLevel, location, maxPrice, minPrice, rating, sortBy]);

  const handleFilter = () => {
    fetchTrainings(0);
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

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return stars;
  };

  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Filter Trainings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Depth Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Depth Level
            </label>
            <select
              value={depthLevel}
              onChange={(e) => setDepthLevel(e.target.value as TrainingDepthLevel | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner (0-10m)</option>
              <option value="intermediate">Intermediate (10-25m)</option>
              <option value="advanced">Advanced (25-40m)</option>
              <option value="expert">Expert (40m+)</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search by location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range (₪)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="Min"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="Max"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructor Rating
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Ratings</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="3.5">3.5+ Stars</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="relevance">Relevance</option>
              <option value="price">Price (Low to High)</option>
              <option value="rating">Rating (High to Low)</option>
              <option value="date">Upcoming Dates</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleFilter}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? 'Loading...' : 'Apply Filters'}
        </button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {trainings.length > 0 ? offset + 1 : 0} to{' '}
          {Math.min(offset + limit, totalCount)} of {totalCount} trainings
        </p>
      </div>

      {/* Training Programs Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-gray-500">Loading trainings...</div>
        </div>
      ) : trainings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainings.map((training) => (
            <div
              key={training.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelectTraining?.(training)}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {training.name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getDepthColor(training.depth_level)}`}
                  >
                    {training.depth_level.charAt(0).toUpperCase() + training.depth_level.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {training.depth_min_meters}-{training.depth_max_meters}m depth
                </p>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">{renderStars(training.average_rating)}</div>
                  <span className="text-sm font-semibold text-gray-900">
                    {training.average_rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-600">
                    ({training.total_ratings})
                  </span>
                </div>

                {/* Location */}
                <div className="text-sm text-gray-700">
                  <span className="font-medium">📍 </span>
                  {training.location}
                </div>

                {/* Duration */}
                <div className="text-sm text-gray-700">
                  <span className="font-medium">⏱️ </span>
                  {training.duration_hours}h ({training.duration_days} day
                  {training.duration_days > 1 ? 's' : ''})
                </div>

                {/* Price & Availability */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-lg font-semibold text-gray-900">
                    ₪{training.price_shekel.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-600">
                    {training.current_enrollment}/{training.max_students}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnroll?.(training.id);
                  }}
                  disabled={training.current_enrollment >= training.max_students}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {training.current_enrollment >= training.max_students
                    ? 'Full'
                    : 'Enroll Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500 mb-2">No trainings found</p>
            <p className="text-sm text-gray-400">
              Try adjusting your filters or clearing your search
            </p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchTrainings(Math.max(0, offset - limit))}
            disabled={offset === 0 || isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => fetchTrainings(i * limit)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchTrainings(offset + limit)}
            disabled={offset + limit >= totalCount || isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
