'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { EquipmentListing } from '@/types/equipment';
import { formatCurrency } from '@/lib/payments/bit.config';

interface EquipmentCardProps {
  listing: EquipmentListing;
  onRent?: (listingId: string) => void;
  distance?: number; // in km
}

export function EquipmentCard({
  listing,
  onRent,
  distance,
}: EquipmentCardProps) {
  const displayPrice = useMemo(() => {
    return formatCurrency(listing.rental_price_per_day);
  }, [listing.rental_price_per_day]);

  const availability = useMemo(() => {
    const now = new Date();
    const availFrom = new Date(listing.available_from);
    const availTo = listing.available_until
      ? new Date(listing.available_until)
      : null;

    if (now < availFrom) {
      return 'future';
    }

    if (availTo && now > availTo) {
      return 'expired';
    }

    return 'available';
  }, [listing.available_from, listing.available_until]);

  const conditionColor: Record<string, string> = {
    excellent: 'bg-green-100 text-green-800',
    very_good: 'bg-emerald-100 text-emerald-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-orange-100 text-orange-800',
  };

  const equipmentIcon: Record<string, string> = {
    fins: '🦶',
    wetsuit: '🏊',
    tank: '🎒',
    weights: '⚖️',
    bcd: '📦',
    regulator: '🌊',
    mask: '👁️',
    snorkel: '💨',
    dive_computer: '⌚',
    torch: '🔦',
    knife: '🔪',
    camera: '📸',
    clothing: '👕',
    other: '🎁',
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* Image */}
      <div className="relative w-full h-48 bg-gray-200">
        {listing.photo_urls.length > 0 ? (
          <Image
            src={listing.photo_urls[0]}
            alt={`${listing.equipment_type} - ${listing.model || listing.brand || 'Equipment'}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {equipmentIcon[listing.equipment_type]}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 right-3 space-y-2">
          <div className={`px-2 py-1 rounded text-xs font-semibold ${conditionColor[listing.condition]}`}>
            {listing.condition.replace('_', ' ')}
          </div>
          {availability === 'available' && (
            <div className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
              Available
            </div>
          )}
          {availability === 'future' && (
            <div className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
              Coming Soon
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {listing.brand || listing.equipment_type}
          </h3>
          <span className="text-2xl ml-2">{equipmentIcon[listing.equipment_type]}</span>
        </div>

        {/* Type */}
        <p className="text-sm text-gray-600 mb-2">
          {listing.equipment_type.replace('_', ' ')}
          {listing.model && ` - ${listing.model}`}
        </p>

        {/* Description */}
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {listing.description}
        </p>

        {/* Specs */}
        <div className="text-xs text-gray-500 mb-3 space-y-1">
          {listing.size && <div>Size: {listing.size}</div>}
          {listing.year_purchased && (
            <div>Year: {listing.year_purchased}</div>
          )}
          <div>Location: {listing.location_name}</div>
        </div>

        {/* Rating & Reviews */}
        {listing.review_count > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex text-yellow-400">
              {'⭐'.repeat(Math.round(listing.rating_average || 5))}
            </div>
            <span className="text-xs text-gray-600">
              {listing.rating_average?.toFixed(1)} ({listing.review_count})
            </span>
          </div>
        )}

        {/* Distance */}
        {distance !== undefined && (
          <div className="text-xs text-gray-500 mb-3">
            📍 {distance.toFixed(1)} km away
          </div>
        )}

        {/* Price & Button */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-left">
            <p className="text-2xl font-bold text-blue-600">{displayPrice}</p>
            <p className="text-xs text-gray-600">/day</p>
          </div>

          <button
            onClick={() => onRent?.(listing.id)}
            disabled={availability !== 'available'}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              availability === 'available'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            {availability === 'available' ? 'Rent Now' : 'Unavailable'}
          </button>
        </div>

        {listing.min_rental_days && (
          <p className="text-xs text-gray-500 mt-2">
            Min: {listing.min_rental_days} days
          </p>
        )}
      </div>
    </div>
  );
}
