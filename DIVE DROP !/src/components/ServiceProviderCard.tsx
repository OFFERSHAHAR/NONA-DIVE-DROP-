'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ServiceProvider, ProviderService } from '@/types/service-provider';
import { Card } from '@/components/Card';
import { cn } from '@/utils/cn';

interface ServiceProviderCardProps {
  provider: ServiceProvider;
  services?: ProviderService[];
  locale: string;
  distance?: number;
}

export function ServiceProviderCard({
  provider,
  services = [],
  locale,
  distance,
}: ServiceProviderCardProps) {
  const t = useTranslations();
  const isRTL = locale === 'he';

  const minPrice = services.length > 0
    ? Math.min(...services.map((s) => s.price_shekel))
    : 0;

  return (
    <Link href={`/${locale}/service-providers/${provider.id}`}>
      <Card className={cn(
        'overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full',
        isRTL && 'text-right'
      )}>
        {/* Provider Image */}
        <div className="relative w-full h-40 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
          {provider.avatar_url ? (
            <img
              src={provider.avatar_url}
              alt={provider.business_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-500">
              <span className="text-4xl text-white">
                {provider.business_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Verified Badge */}
          {provider.is_verified && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 flex items-center gap-1 text-xs">
              <span>✓</span>
              <span>{isRTL ? 'מאומת' : 'Verified'}</span>
            </div>
          )}

          {/* Rating Badge */}
          <div className="absolute bottom-2 left-2 bg-yellow-400 text-gray-900 rounded-lg px-2 py-1 font-semibold text-sm flex items-center gap-1">
            <span>★</span>
            <span>{provider.average_rating.toFixed(1)}</span>
            <span className="text-xs">({provider.total_reviews})</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Provider Name & Type */}
          <div>
            <h3 className="font-bold text-lg line-clamp-2">{provider.business_name}</h3>
            <p className="text-sm text-gray-600">
              {t(`provider_types.${provider.provider_type}`)}
            </p>
          </div>

          {/* Location & Distance */}
          <div className={cn('flex items-center gap-2 text-sm text-gray-700', isRTL && 'flex-row-reverse')}>
            <span>📍</span>
            <span>{provider.primary_location}</span>
            {distance && (
              <span className="text-gray-500">({distance.toFixed(1)} km)</span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {provider.description}
          </p>

          {/* Services & Price */}
          {services.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                {isRTL ? 'שירותים' : 'Services'}:
              </p>
              <div className="flex flex-wrap gap-1">
                {services.slice(0, 3).map((service) => (
                  <span
                    key={service.id}
                    className="text-xs bg-blue-100 text-blue-800 rounded px-2 py-1"
                  >
                    {service.name}
                  </span>
                ))}
                {services.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{services.length - 3} {isRTL ? 'נוסף' : 'more'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Price */}
          {minPrice > 0 && (
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-700">
                {isRTL ? 'החל מ' : 'From'}:
              </span>
              <span className="text-lg font-bold text-green-600">
                {minPrice}₪
              </span>
            </div>
          )}

          {/* Response Rate */}
          {provider.response_rate !== undefined && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <span>⚡</span>
              <span>
                {isRTL ? 'תגובה' : 'Response'}: {Math.round(provider.response_rate * 100)}%
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
