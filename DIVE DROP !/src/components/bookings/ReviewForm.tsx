'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

interface ReviewFormProps {
  bookingId: string;
  reviewedUserName: string;
  onSubmit: (review: { rating: number; review_text: string; would_recommend: boolean }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ReviewForm({
  bookingId,
  reviewedUserName,
  onSubmit,
  onCancel,
  isLoading = false,
}: ReviewFormProps) {
  const t = useTranslations('bookings');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRtl = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError(t('ratingRequired'));
      return;
    }

    if (reviewText.trim().length < 10) {
      setError(t('reviewTooShort'));
      return;
    }

    try {
      await onSubmit({
        rating,
        review_text: reviewText,
        would_recommend: wouldRecommend,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('submitError'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-light mb-2">
          {t('reviewFor')} {reviewedUserName}
        </h3>
        <p className="text-text-secondary dark:text-text-secondary-light">
          {t('shareExperience')}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-3">
          {t('rating')} *
        </label>
        <div className={clsx('flex gap-2 justify-center', isRtl && 'flex-row-reverse')}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-4xl transition-all hover:scale-110"
            >
              <span
                className={
                  star <= (hoverRating || rating)
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }
              >
                ★
              </span>
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-text-secondary dark:text-text-secondary-light mt-2">
            {rating} {t('outOf')} 5
          </p>
        )}
      </div>

      {/* Review Text */}
      <div>
        <label htmlFor="review" className="block text-sm font-medium text-text-primary dark:text-text-light mb-2">
          {t('yourReview')} *
        </label>
        <textarea
          id="review"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder={t('reviewPlaceholder')}
          maxLength={1000}
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input text-text-primary dark:text-text-light placeholder-text-secondary dark:placeholder-text-secondary-light focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-between items-center mt-2 text-xs text-text-secondary dark:text-text-secondary-light">
          <p>{t('minimumCharacters', { count: 10 })}</p>
          <p>
            {reviewText.length}/1000
          </p>
        </div>
      </div>

      {/* Would Recommend */}
      <div>
        <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-3">
          {t('wouldYouRecommend')}
        </label>
        <div className={clsx('flex gap-4', isRtl && 'flex-row-reverse')}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recommend"
              value="yes"
              checked={wouldRecommend}
              onChange={() => setWouldRecommend(true)}
              className="w-4 h-4"
            />
            <span className="text-text-primary dark:text-text-light">{t('yes')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recommend"
              value="no"
              checked={!wouldRecommend}
              onChange={() => setWouldRecommend(false)}
              className="w-4 h-4"
            />
            <span className="text-text-primary dark:text-text-light">{t('no')}</span>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className={clsx('flex gap-4', isRtl && 'flex-row-reverse')}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-text-primary dark:text-text-light hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading || rating === 0 || reviewText.trim().length < 10}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t('submitting') : t('submitReview')}
        </button>
      </div>
    </form>
  );
}
