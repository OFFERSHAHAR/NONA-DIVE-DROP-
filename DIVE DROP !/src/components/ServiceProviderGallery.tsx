'use client';

import React, { useState } from 'react';
import type { ProviderGalleryItem } from '@/types/service-provider';
import { cn } from '@/utils/cn';

interface ServiceProviderGalleryProps {
  items: ProviderGalleryItem[];
  isRTL?: boolean;
  providerName: string;
}

export function ServiceProviderGallery({
  items,
  isRTL = false,
  providerName,
}: ServiceProviderGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {isRTL ? 'אין תמונות זמינות' : 'No images available'}
      </div>
    );
  }

  const selectedItem = items[selectedIndex];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div
        onClick={() => setShowLightbox(true)}
        className="relative w-full h-96 bg-gray-200 rounded-lg overflow-hidden cursor-pointer group"
      >
        {selectedItem.media_type === 'image' ? (
          <img
            src={selectedItem.url}
            alt={selectedItem.title || providerName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <video
            src={selectedItem.url}
            className="w-full h-full object-cover"
            controls
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Title & Description */}
      {selectedItem.title && (
        <div>
          <h3 className="font-semibold text-lg">{selectedItem.title}</h3>
          {selectedItem.description && (
            <p className="text-sm text-gray-600 mt-1">{selectedItem.description}</p>
          )}
        </div>
      )}

      {/* Thumbnails */}
      {items.length > 1 && (
        <div className={cn('flex gap-2 overflow-x-auto pb-2', isRTL && 'flex-row-reverse')}>
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-opacity',
                index === selectedIndex ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'
              )}
            >
              {item.media_type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="text-white text-2xl">▶</span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              ✕
            </button>

            {/* Navigation Buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
              }}
              className={cn(
                'absolute left-4 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors',
                isRTL && 'left-auto right-4'
              )}
            >
              {isRTL ? '▶' : '◀'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
              }}
              className={cn(
                'absolute right-4 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors',
                isRTL && 'right-auto left-4'
              )}
            >
              {isRTL ? '◀' : '▶'}
            </button>

            {/* Image/Video */}
            {selectedItem.media_type === 'image' ? (
              <img
                src={selectedItem.url}
                alt={selectedItem.title || 'Gallery image'}
                className="max-w-[90vw] max-h-[90vh] object-contain"
              />
            ) : (
              <video
                src={selectedItem.url}
                className="max-w-[90vw] max-h-[90vh] object-contain"
                controls
                autoPlay
              />
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/20 text-white px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {items.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
