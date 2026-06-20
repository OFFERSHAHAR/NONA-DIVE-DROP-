import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { MessageCircle, Send } from 'lucide-react';
import clsx from 'clsx';

interface RatingFormProps {
  photoId: string;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  existingRating?: {
    rating: number;
    comment?: string;
  };
  isLoading?: boolean;
  disabled?: boolean;
}

export const RatingForm: React.FC<RatingFormProps> = ({
  photoId,
  onSubmit,
  existingRating,
  isLoading = false,
  disabled = false,
}) => {
  const [rating, setRating] = useState<number>(existingRating?.rating || 0);
  const [comment, setComment] = useState<string>(existingRating?.comment || '');
  const [showComment, setShowComment] = useState(!!existingRating?.comment);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    try {
      await onSubmit(rating, comment.trim() || undefined);
      setSuccess(existingRating ? 'Rating updated' : 'Rating submitted');
      setTimeout(() => setSuccess(''), 3000);

      // Reset form if new rating
      if (!existingRating) {
        setRating(0);
        setComment('');
        setShowComment(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Rate this photo</h3>
        {existingRating && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            Your rating
          </span>
        )}
      </div>

      {/* Star Rating */}
      <div>
        <StarRating
          value={rating}
          onChange={setRating}
          interactive={!disabled && !isLoading}
          size="lg"
          showLabel={true}
        />
        <p className="text-xs text-gray-500 mt-2">
          {rating === 0 && 'Click stars to rate (1-5)'}
          {rating === 1 && 'Poor quality'}
          {rating === 2 && 'Fair quality'}
          {rating === 3 && 'Good quality'}
          {rating === 4 && 'Very good'}
          {rating === 5 && 'Excellent'}
        </p>
      </div>

      {/* Comment Section */}
      {(showComment || comment) && (
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>Optional comment</span>
            </div>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts... (optional)"
            maxLength={500}
            disabled={disabled || isLoading}
            className={clsx(
              'w-full px-3 py-2 text-sm border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'placeholder-gray-400',
              disabled || isLoading ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white',
            )}
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>
      )}

      {/* Toggle Comment */}
      {!showComment && !comment && (
        <button
          type="button"
          onClick={() => setShowComment(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add a comment
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-2 justify-end">
        {showComment && !comment && (
          <button
            type="button"
            onClick={() => setShowComment(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Hide comment
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || isLoading || rating === 0}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm',
            'transition-colors duration-200',
            rating === 0 || disabled || isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
        >
          <Send className="w-4 h-4" />
          {isLoading ? 'Submitting...' : existingRating ? 'Update rating' : 'Submit rating'}
        </button>
      </div>
    </form>
  );
};
