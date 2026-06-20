import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import { AppIcon } from '@/components/AppIcon';

/**
 * DiveSiteCard - Responsive dive site card component
 *
 * Features:
 * - Responsive grid: 1 col mobile → 2 col tablet → 3 col desktop
 * - Image with proper aspect ratio and object-fit
 * - Star rating display with review count
 * - Touch-friendly action buttons (44px+ minimum)
 * - Dark mode support
 * - Accessibility: semantic HTML, ARIA labels, keyboard navigation
 */

const cardVariants = cva(
  'group overflow-hidden rounded-lg border border-border-primary bg-card transition-all duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary dark:border-border-secondary dark:bg-card-dark',
  {
    variants: {
      variant: {
        standard: 'hover:border-primary dark:hover:border-primary',
        featured: 'ring-2 ring-primary shadow-lg',
        compact: 'shadow-sm hover:shadow-md',
      },
    },
    defaultVariants: {
      variant: 'standard',
    },
  }
);

interface DiveSite {
  id: string;
  name: string;
  image: string;
  depth: number;
  maxDepth?: number;
  rating: number;
  reviewCount: number;
  location: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
}

export interface DiveSiteCardProps extends VariantProps<typeof cardVariants> {
  site: DiveSite;
  onViewDetails?: (siteId: string) => void;
  onAddToFavorites?: (siteId: string) => void;
  isFavorited?: boolean;
  loading?: boolean;
  className?: string;
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

/**
 * Render star rating with visual stars
 */
const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <AppIcon key={i} name={i < Math.floor(rating) ? 'star-filled' : 'star'} className={clsx('h-4 w-4 transition-colors', i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600')} />
      ))}
    </div>
    <span className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
      {rating.toFixed(1)} ({reviewCount})
    </span>
  </div>
);

/**
 * DiveSiteCard component
 */
export const DiveSiteCard = React.forwardRef<HTMLDivElement, DiveSiteCardProps>(
  (
    {
      site,
      variant,
      onViewDetails,
      onAddToFavorites,
      isFavorited = false,
      loading = false,
      className,
    },
    ref
  ) => {
    return (
      <article
        ref={ref}
        className={clsx(cardVariants({ variant }), className)}
        aria-label={`Dive site: ${site.name}`}
      >
        {/* Image Container with overlay */}
        <div className="relative overflow-hidden bg-gray-200 dark:bg-gray-800">
          <img
            src={site.image}
            alt={site.name}
            className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Difficulty Badge */}
          <div className="absolute right-3 top-3">
            <span
              className={clsx(
                'inline-block rounded-full px-3 py-1 text-xs font-semibold',
                difficultyColors[site.difficulty]
              )}
            >
              {site.difficulty.charAt(0).toUpperCase() + site.difficulty.slice(1)}
            </span>
          </div>
          {/* Favorite Button */}
          <button
            onClick={() => onAddToFavorites?.(site.id)}
            disabled={loading}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute left-3 top-3 rounded-full bg-white/90 p-2 text-red-500 transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:bg-gray-900/90 dark:hover:bg-gray-900"
          >
            <AppIcon name={isFavorited ? 'heart-filled' : 'heart'} className="h-5 w-5" />
          </button>
        </div>

        {/* Content Section */}
        <div className="flex flex-col gap-3 p-4">
          {/* Title and Location */}
          <div>
            <h3 className="text-lg font-bold text-text-primary dark:text-text-primary-dark line-clamp-2">
              {site.name}
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark line-clamp-1">
              {site.location}
            </p>
          </div>

          {/* Rating */}
          <StarRating rating={site.rating} reviewCount={site.reviewCount} />

          {/* Depth Info */}
          <div className="flex items-center gap-4 rounded-md bg-bg-secondary p-2 dark:bg-bg-secondary-dark">
            <div>
              <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Typical Depth
              </span>
              <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                {site.depth}m
                {site.maxDepth && ` - ${site.maxDepth}m`}
              </p>
            </div>
          </div>

          {/* Description */}
          {site.description && (
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark line-clamp-2">
              {site.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onViewDetails?.(site.id)}
              disabled={loading}
              aria-label={`View details for ${site.name}`}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-center font-semibold text-white transition-all hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-dark"
            >
              View Details
            </button>
            <button
              disabled={loading}
              aria-label={`Book dive at ${site.name}`}
              className="rounded-lg border-2 border-primary bg-transparent px-4 py-2 font-semibold text-primary transition-all hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-dark"
            >
              Book
            </button>
          </div>
        </div>
      </article>
    );
  }
);

DiveSiteCard.displayName = 'DiveSiteCard';

/**
 * Grid wrapper for responsive layout
 */
interface DiveSiteGridProps {
  sites: DiveSite[];
  onViewDetails?: (siteId: string) => void;
  onAddToFavorites?: (siteId: string) => void;
  favoritedIds?: Set<string>;
  loading?: boolean;
  variant?: VariantProps<typeof cardVariants>['variant'];
}

export const DiveSiteGrid = ({
  sites,
  onViewDetails,
  onAddToFavorites,
  favoritedIds = new Set(),
  loading = false,
  variant,
}: DiveSiteGridProps) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {sites.map((site) => (
      <DiveSiteCard
        key={site.id}
        site={site}
        variant={variant}
        onViewDetails={onViewDetails}
        onAddToFavorites={onAddToFavorites}
        isFavorited={favoritedIds.has(site.id)}
        loading={loading}
      />
    ))}
  </div>
);
