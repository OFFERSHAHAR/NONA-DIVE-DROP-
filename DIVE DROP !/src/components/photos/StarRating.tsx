import React, { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

interface StarRatingProps {
  value: number; // Current value (0-5)
  onChange: (rating: number) => void;
  disabled?: boolean;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  disabled = false,
  interactive = true,
  size = 'md',
  showLabel = true,
}) => {
  const [hoverValue, setHoverValue] = useState<number>(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayValue = hoverValue || value;

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'gap-0.5';
      case 'lg':
        return 'gap-1';
      default:
        return 'gap-1';
    }
  };

  const getContainerClass = () => {
    switch (size) {
      case 'sm':
        return 'flex-col gap-1';
      case 'lg':
        return 'flex-col gap-2';
      default:
        return 'flex-col gap-1.5';
    }
  };

  return (
    <div className={clsx('flex', getContainerClass())}>
      <div
        className={clsx(
          'flex',
          getSizeClass(),
          interactive && !disabled && 'cursor-pointer',
        )}
        onMouseLeave={() => interactive && setHoverValue(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && !disabled && onChange(star)}
            onMouseEnter={() => interactive && setHoverValue(star)}
            disabled={disabled || !interactive}
            className={clsx(
              sizeClasses[size],
              'transition-all duration-150',
              interactive && !disabled && 'hover:scale-110',
              disabled && 'opacity-50 cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded',
            )}
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              className={clsx(
                'transition-all duration-150',
                star <= displayValue
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300',
              )}
            />
          </button>
        ))}
      </div>

      {showLabel && (
        <div className="text-sm text-gray-600 font-medium">
          {displayValue > 0 ? (
            <>
              <span className="text-yellow-500">{displayValue}</span>
              <span className="text-gray-400"> / 5</span>
            </>
          ) : (
            <span className="text-gray-400">No rating</span>
          )}
        </div>
      )}
    </div>
  );
};
