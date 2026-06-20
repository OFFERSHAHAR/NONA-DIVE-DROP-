'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ServiceProviderGallery } from '@/components/ServiceProviderGallery';
import { ReviewList } from '@/components/ReviewList';
import { cn } from '@/utils/cn';
import { serviceProviderClient } from '@/lib/service-provider/client';
import type { ProviderDetailResponse } from '@/types/service-provider';

interface ServiceProviderProfileProps {
  providerId: string;
  locale: string;
}

export function ServiceProviderProfile({
  providerId,
  locale,
}: ServiceProviderProfileProps) {
  const isRTL = locale === 'he';
  const [details, setDetails] = useState<ProviderDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'reviews' | 'gallery'>('overview');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const data = await serviceProviderClient.getProviderDetails(providerId);
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load provider details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [providerId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="mt-2 text-gray-600">Loading provider details...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error || 'Provider not found'}
        </div>
        <Link href={`/${locale}/service-providers`}>
          <Button className="mt-4">
            {isRTL ? 'חזור לספר' : 'Back to Directory'}
          </Button>
        </Link>
      </div>
    );
  }

  const { provider, services, reviews, gallery } = details;

  return (
    <div className={cn('container mx-auto px-4 py-8', isRTL && 'text-right')}>
      {/* Header */}
      <Link href={`/${locale}/service-providers`} className="text-blue-600 hover:underline mb-4 inline-block">
        ← {isRTL ? 'חזור' : 'Back'}
      </Link>

      {/* Provider Info Card */}
      <Card className="overflow-hidden mb-8">
        {/* Cover Image */}
        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600">
          {provider.cover_image_url && (
            <img
              src={provider.cover_image_url}
              alt={provider.business_name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Provider Details */}
        <div className="p-6">
          <div className={cn('flex gap-6', isRTL && 'flex-row-reverse')}>
            {/* Avatar */}
            <div className="flex-shrink-0">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={provider.business_name}
                  className="w-24 h-24 rounded-lg object-cover border-4 border-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-blue-500 flex items-center justify-center text-white text-3xl border-4 border-white">
                  {provider.business_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{provider.business_name}</h1>
              <p className="text-gray-600 text-lg mb-2">{provider.provider_type}</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-yellow-400">
                  {'★'.repeat(Math.round(provider.average_rating))}
                </div>
                <span className="font-semibold">{provider.average_rating.toFixed(1)}</span>
                <span className="text-gray-600">({provider.total_reviews} reviews)</span>
                {provider.is_verified && (
                  <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                    ✓ Verified
                  </span>
                )}
              </div>

              {/* Location */}
              <p className="text-gray-700 mb-4">📍 {provider.primary_location}</p>

              {/* Description */}
              <p className="text-gray-700 leading-relaxed mb-4">
                {provider.description}
              </p>

              {/* Contact & Actions */}
              <div className={cn('flex gap-4', isRTL && 'flex-row-reverse')}>
                <a href={`tel:${provider.phone}`}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    📞 {isRTL ? 'קרא' : 'Call'}
                  </Button>
                </a>
                <a href={`mailto:${provider.email}`}>
                  <Button variant="outline">
                    📧 {isRTL ? 'דוא"ל' : 'Email'}
                  </Button>
                </a>
                {provider.website_url && (
                  <a href={provider.website_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      🌐 {isRTL ? 'אתר' : 'Website'}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t', isRTL && 'text-center')}>
            {provider.years_experience !== undefined && (
              <div>
                <p className="text-sm text-gray-600">
                  {isRTL ? 'שנות ניסיון' : 'Experience'}
                </p>
                <p className="font-semibold">{provider.years_experience}+ years</p>
              </div>
            )}
            {provider.response_rate !== undefined && (
              <div>
                <p className="text-sm text-gray-600">
                  {isRTL ? 'זמן תגובה' : 'Response Rate'}
                </p>
                <p className="font-semibold">{Math.round(provider.response_rate * 100)}%</p>
              </div>
            )}
            {services.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">
                  {isRTL ? 'שירותים' : 'Services'}
                </p>
                <p className="font-semibold">{services.length}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'רדיוס' : 'Service Radius'}
              </p>
              <p className="font-semibold">{provider.service_radius_km} km</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className={cn('flex gap-2 mb-6 border-b', isRTL && 'flex-row-reverse')}>
        {(['overview', 'services', 'reviews', 'gallery'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 font-semibold border-b-2 transition',
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            {tab === 'overview' && (isRTL ? 'סקירה' : 'Overview')}
            {tab === 'services' && (isRTL ? 'שירותים' : 'Services')}
            {tab === 'reviews' && (isRTL ? 'ביקורות' : 'Reviews')}
            {tab === 'gallery' && (isRTL ? 'גלריה' : 'Gallery')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Certifications */}
          {provider.certifications && provider.certifications.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {isRTL ? 'הסמכות' : 'Certifications'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {provider.certifications.map((cert, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    {cert}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* License Info */}
          {provider.license_number && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {isRTL ? 'רישיון' : 'License'}
              </h3>
              <div className={cn('space-y-2', isRTL && 'text-right')}>
                <p>
                  <span className="font-semibold">
                    {isRTL ? 'מספר רישיון' : 'License Number'}:
                  </span>{' '}
                  {provider.license_number}
                </p>
                {provider.license_expiry && (
                  <p>
                    <span className="font-semibold">
                      {isRTL ? 'תוקף עד' : 'Expires'}:
                    </span>{' '}
                    {new Date(provider.license_expiry).toLocaleDateString(
                      isRTL ? 'he-IL' : 'en-US'
                    )}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Insurance Info */}
          {provider.insurance_provider && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {isRTL ? 'ביטוח' : 'Insurance'}
              </h3>
              <div className={cn('space-y-2', isRTL && 'text-right')}>
                <p>
                  <span className="font-semibold">
                    {isRTL ? 'ספק' : 'Provider'}:
                  </span>{' '}
                  {provider.insurance_provider}
                </p>
                {provider.insurance_expiry && (
                  <p>
                    <span className="font-semibold">
                      {isRTL ? 'תוקף עד' : 'Expires'}:
                    </span>{' '}
                    {new Date(provider.insurance_expiry).toLocaleDateString(
                      isRTL ? 'he-IL' : 'en-US'
                    )}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Next Available */}
          {details.availability_summary?.next_available && (
            <Card className="p-6 bg-green-50">
              <p className="text-green-800">
                <span className="font-semibold">
                  {isRTL ? 'זמין הבא' : 'Next Available'}:
                </span>{' '}
                {new Date(details.availability_summary.next_available).toLocaleDateString(
                  isRTL ? 'he-IL' : 'en-US'
                )}
              </p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-4">
          {services.length > 0 ? (
            services.map((service) => (
              <Card key={service.id} className="p-6">
                <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                <p className="text-gray-700 mb-4">{service.description}</p>

                <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', isRTL && 'text-right')}>
                  <div>
                    <p className="text-sm text-gray-600">
                      {isRTL ? 'מחיר' : 'Price'}
                    </p>
                    <p className="font-bold text-lg text-green-600">
                      {service.price_shekel}₪
                    </p>
                  </div>
                  {service.duration_minutes && (
                    <div>
                      <p className="text-sm text-gray-600">
                        {isRTL ? 'משך' : 'Duration'}
                      </p>
                      <p className="font-bold">{service.duration_minutes} min</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">
                      {isRTL ? 'גודל קבוצה' : 'Group Size'}
                    </p>
                    <p className="font-bold">
                      {service.group_size_min}-{service.group_size_max}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {isRTL ? 'הזמנה' : 'Booking'}
                    </p>
                    <p className="font-bold">
                      {service.booking_required
                        ? (isRTL ? 'נדרשת' : 'Required')
                        : (isRTL ? 'אופציונלית' : 'Optional')}
                    </p>
                  </div>
                </div>

                {service.min_experience_level && (
                  <p className="mt-3 text-sm text-gray-600">
                    {isRTL ? 'רמה מינימלית' : 'Min Experience'}:{' '}
                    <span className="font-semibold">{service.min_experience_level}</span>
                  </p>
                )}
              </Card>
            ))
          ) : (
            <Card className="p-6 text-center text-gray-500">
              {isRTL ? 'אין שירותים זמינים' : 'No services available'}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <ReviewList
          reviews={reviews.items}
          averageRating={reviews.average_rating}
          totalCount={reviews.total_count}
          isRTL={isRTL}
        />
      )}

      {activeTab === 'gallery' && (
        <ServiceProviderGallery
          items={gallery}
          isRTL={isRTL}
          providerName={provider.business_name}
        />
      )}
    </div>
  );
}
