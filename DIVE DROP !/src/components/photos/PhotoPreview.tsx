'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface PhotoData {
  id: string;
  file_url: string;
  caption: string;
  description: string;
  rating: number;
  rating_count: number;
  created_at: string;
  user?: {
    id: string;
    email: string;
  };
  tags?: string[];
  visibility: string;
  status: string;
}

export interface PhotoPreviewProps {
  photos: PhotoData[];
  isLoading?: boolean;
  onDelete?: (photoId: string) => Promise<void>;
  onRate?: (photoId: string, rating: number) => Promise<void>;
  showActions?: boolean;
}

export function PhotoPreview({
  photos,
  isLoading = false,
  onDelete,
  onRate,
  showActions = true,
}: PhotoPreviewProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ratingPhotoId, setRatingPhotoId] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  const handleDelete = async (photoId: string) => {
    if (!onDelete) return;
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    setDeletingId(photoId);
    try {
      await onDelete(photoId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRate = async (photoId: string, rating: number) => {
    if (!onRate) return;

    setRatingPhotoId(photoId);
    try {
      await onRate(photoId, rating);
      setUserRatings(prev => ({
        ...prev,
        [photoId]: rating,
      }));
    } finally {
      setRatingPhotoId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-300 rounded-lg aspect-square" />
            <div className="mt-2 bg-gray-300 h-4 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">📸 No photos yet</p>
        <p className="text-gray-400 text-sm mt-2">Be the first to upload a photo!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="group relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white">
          {/* Image Container */}
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            <Image
              src={photo.file_url}
              alt={photo.caption || 'Photo'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />

            {/* Overlay on hover */}
            {showActions && (onDelete || onRate) && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {onRate && (
                  <button
                    onClick={() => handleRate(photo.id, (userRatings[photo.id] || photo.rating) + 1 > 5 ? 0 : (userRatings[photo.id] || photo.rating) + 1)}
                    disabled={ratingPhotoId === photo.id}
                    className="bg-yellow-500 text-white p-2 rounded-full hover:bg-yellow-600 disabled:opacity-50"
                    title="Rate this photo"
                  >
                    ⭐
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => handleDelete(photo.id)}
                    disabled={deletingId === photo.id}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 disabled:opacity-50"
                    title="Delete this photo"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}

            {/* Status badge */}
            {photo.status !== 'approved' && (
              <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded">
                {photo.status === 'pending' ? '⏳ Pending' : '❌ Rejected'}
              </div>
            )}

            {/* Visibility badge */}
            {photo.visibility !== 'public' && (
              <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded">
                {photo.visibility === 'private' ? '🔒' : '👥'}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="p-3">
            {photo.caption && (
              <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                {photo.caption}
              </h4>
            )}

            {photo.description && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {photo.description}
              </p>
            )}

            {/* Tags */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {photo.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
                {photo.tags.length > 2 && (
                  <span className="text-xs text-gray-500">+{photo.tags.length - 2}</span>
                )}
              </div>
            )}

            {/* Rating */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <span>⭐</span>
                <span className="font-medium">
                  {(userRatings[photo.id] ?? photo.rating).toFixed(1)}
                </span>
                <span className="text-gray-500">({photo.rating_count})</span>
              </div>
              <time className="text-gray-500">
                {new Date(photo.created_at).toLocaleDateString()}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
