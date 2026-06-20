import React from 'react';
import { Star, Eye, ThumbsUp, MessageSquare, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface PhotoStatsProps {
  avgRating: number;
  ratingCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  overallScore?: number;
  percentileRank?: number;
  showTrending?: boolean;
  compact?: boolean;
}

export const PhotoStats: React.FC<PhotoStatsProps> = ({
  avgRating,
  ratingCount,
  viewCount,
  likeCount,
  commentCount,
  overallScore,
  percentileRank,
  showTrending = true,
  compact = false,
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-yellow-500';
    if (rating >= 4) return 'text-yellow-500';
    if (rating >= 3) return 'text-amber-500';
    if (rating >= 2) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTrendingBadge = () => {
    if (!showTrending || !overallScore) return null;

    if (overallScore >= 0.8) {
      return (
        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          Trending
        </div>
      );
    }

    if (overallScore >= 0.6) {
      return (
        <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          Popular
        </div>
      );
    }

    return null;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        {/* Rating */}
        <div className="flex items-center gap-1">
          <Star className={clsx('w-4 h-4 fill-current', getRatingColor(avgRating))} />
          <span className="font-semibold">{avgRating.toFixed(1)}</span>
          {ratingCount > 0 && (
            <span className="text-gray-500">({ratingCount})</span>
          )}
        </div>

        {/* Views */}
        <div className="flex items-center gap-1 text-gray-600">
          <Eye className="w-4 h-4" />
          <span>{formatNumber(viewCount)}</span>
        </div>

        {/* Likes */}
        <div className="flex items-center gap-1 text-gray-600">
          <ThumbsUp className="w-4 h-4" />
          <span>{formatNumber(likeCount)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Trending Badge */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Photo stats</h3>
        {getTrendingBadge()}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Rating */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Star className={clsx('w-4 h-4 fill-current', getRatingColor(avgRating))} />
            <span className="text-xs font-medium text-gray-600">Rating</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {avgRating.toFixed(1)}
            <span className="text-xs text-gray-500 ml-1">/ 5</span>
          </div>
          {ratingCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              from {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
            </p>
          )}
        </div>

        {/* Views */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-600">Views</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatNumber(viewCount)}
          </div>
        </div>

        {/* Likes */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsUp className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-gray-600">Likes</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatNumber(likeCount)}
          </div>
        </div>

        {/* Comments */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-600">Comments</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatNumber(commentCount)}
          </div>
        </div>
      </div>

      {/* Score & Percentile */}
      {overallScore !== undefined && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Overall score</p>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-blue-600">
                  {(overallScore * 100).toFixed(0)}
                </div>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${overallScore * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {percentileRank !== undefined && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Percentile rank</p>
                <div className="text-2xl font-bold text-green-600">
                  {percentileRank}
                  <span className="text-sm">th</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Top {100 - percentileRank}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rating Distribution (future enhancement) */}
      <details className="cursor-pointer group">
        <summary className="text-sm font-medium text-gray-700 group-open:text-gray-900">
          Rating breakdown
        </summary>
        <div className="mt-3 space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars} className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-600 min-w-[20px]">{stars}★</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full" />
              <span className="text-xs text-gray-500 min-w-[30px] text-right">0%</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};
