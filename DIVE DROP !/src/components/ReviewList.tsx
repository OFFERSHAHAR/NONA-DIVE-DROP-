'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { cn } from '@/utils/cn';
import type { ProviderReview } from '@/types/service-provider';

interface ReviewListProps {
  reviews: ProviderReview[];
  averageRating: number;
  totalCount: number;
  isRTL?: boolean;
}

export function ReviewList({
  reviews,
  averageRating,
  totalCount,
  isRTL = false,
}: ReviewListProps) {
  const ratingDistribution = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  return (
    <div className={cn('space-y-6', isRTL && 'text-right')}>
      {/* Rating Summary */}
      <Card className="p-6 space-y-4">
        <h3 className="text-xl font-bold">
          {isRTL ? 'דירוגים וביקורות' : 'Ratings & Reviews'}
        </h3>

        <div className={cn('flex items-end gap-6', isRTL && 'flex-row-reverse')}>
          {/* Overall Rating */}
          <div className={cn('flex flex-col items-center', isRTL && 'items-center')}>
            <div className="text-5xl font-bold text-yellow-500">{averageRating.toFixed(1)}</div>
            <div className="flex text-yellow-400 text-xl">
              {'★'.repeat(Math.round(averageRating))}
            </div>
            <div className="text-sm text-gray-600">
              {isRTL ? 'מתוך' : 'out of'} {totalCount} {isRTL ? 'ביקורות' : 'reviews'}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                <span className="text-sm font-semibold w-8">{rating}★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{
                      width: `${totalCount > 0 ? (ratingDistribution[rating as keyof typeof ratingDistribution] / totalCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">
                  {ratingDistribution[rating as keyof typeof ratingDistribution]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              {/* Header */}
              <div className={cn('flex justify-between items-start mb-3', isRTL && 'flex-row-reverse')}>
                <div>
                  {review.title && <h4 className="font-semibold">{review.title}</h4>}
                  <div className="flex text-yellow-400 text-sm">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(review.created_at).toLocaleDateString(
                    isRTL ? 'he-IL' : 'en-US'
                  )}
                </div>
              </div>

              {/* Comment */}
              <p className="text-gray-700 mb-3">{review.comment}</p>

              {/* Sub Ratings */}
              {(review.safety_rating || review.professionalism_rating || review.value_rating) && (
                <div className={cn('grid grid-cols-3 gap-2 text-xs', isRTL && 'text-right')}>
                  {review.safety_rating && (
                    <div>
                      <span className="text-gray-600">
                        {isRTL ? 'בטיחות' : 'Safety'}:
                      </span>
                      <div className="flex text-yellow-400">
                        {'★'.repeat(review.safety_rating)}
                      </div>
                    </div>
                  )}
                  {review.professionalism_rating && (
                    <div>
                      <span className="text-gray-600">
                        {isRTL ? 'מקצועיות' : 'Professionalism'}:
                      </span>
                      <div className="flex text-yellow-400">
                        {'★'.repeat(review.professionalism_rating)}
                      </div>
                    </div>
                  )}
                  {review.value_rating && (
                    <div>
                      <span className="text-gray-600">
                        {isRTL ? 'ערך' : 'Value'}:
                      </span>
                      <div className="flex text-yellow-400">
                        {'★'.repeat(review.value_rating)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Verified Booking Badge */}
              {review.is_verified_booking && (
                <div className="mt-3 inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  ✓ {isRTL ? 'הזמנה מאומתת' : 'Verified Booking'}
                </div>
              )}

              {/* Helpful Count */}
              {review.is_helpful_count > 0 && (
                <div className={cn('mt-3 text-xs text-gray-600', isRTL && 'text-right')}>
                  👍 {review.is_helpful_count} {isRTL ? 'מצאו זה מועיל' : 'found this helpful'}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500">
          {isRTL ? 'עדיין אין ביקורות' : 'No reviews yet'}
        </Card>
      )}
    </div>
  );
}
