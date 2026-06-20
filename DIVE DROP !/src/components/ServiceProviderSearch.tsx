'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { cn } from '@/utils/cn';
import type { ProviderFilters } from '@/types/service-provider';
import { ProviderType, ServiceCategory } from '@/lib/service-provider/schemas';

interface ServiceProviderSearchProps {
  onSearch: (filters: Partial<ProviderFilters>) => void;
  isLoading?: boolean;
  isRTL?: boolean;
}

export function ServiceProviderSearch({
  onSearch,
  isLoading = false,
  isRTL = false,
}: ServiceProviderSearchProps) {
  const t = useTranslations();

  const [searchQuery, setSearchQuery] = useState('');
  const [providerType, setProviderType] = useState<string>('');
  const [serviceCategory, setServiceCategory] = useState<string>('');
  const [location, setLocation] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(100000);
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'distance' | 'newest'>('rating');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback(() => {
    onSearch({
      search: searchQuery,
      provider_type: providerType || undefined,
      service_category: serviceCategory || undefined,
      location: location || undefined,
      min_rating: minRating,
      price_min: priceMin,
      price_max: priceMax,
      sort_by: sortBy,
      page: 1,
    });
  }, [searchQuery, providerType, serviceCategory, location, minRating, priceMin, priceMax, sortBy, onSearch]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setProviderType('');
    setServiceCategory('');
    setLocation('');
    setMinRating(0);
    setPriceMin(0);
    setPriceMax(100000);
    setSortBy('rating');
    onSearch({
      search: '',
      provider_type: undefined,
      service_category: undefined,
      location: undefined,
      min_rating: 0,
      price_min: 0,
      price_max: 100000,
      sort_by: 'rating',
      page: 1,
    });
  }, [onSearch]);

  return (
    <div className={cn('space-y-4', isRTL && 'text-right')}>
      {/* Main Search Bar */}
      <Card className="p-4">
        <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
          <Input
            type="text"
            placeholder={isRTL ? 'חיפוש שם עסק...' : 'Search business name...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4"
          >
            {isLoading ? '...' : (isRTL ? 'חיפוש' : 'Search')}
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className={cn(isRTL && 'flex-row-reverse')}
          >
            {isRTL ? 'סינון' : 'Filters'} {showFilters ? '▼' : '▶'}
          </Button>
        </div>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4 space-y-4">
          {/* Provider Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {isRTL ? 'סוג שירות' : 'Service Type'}
            </label>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isRTL ? 'הכל' : 'All'}</option>
              <option value={ProviderType.INSTRUCTOR}>{isRTL ? 'מדריך' : 'Instructor'}</option>
              <option value={ProviderType.SHOP}>{isRTL ? 'חנות' : 'Shop'}</option>
              <option value={ProviderType.GUIDE}>{isRTL ? 'מדריך טיולים' : 'Guide'}</option>
              <option value={ProviderType.BOAT_OPERATOR}>{isRTL ? 'הפעלת סירה' : 'Boat Operator'}</option>
              <option value={ProviderType.RENTAL}>{isRTL ? 'השכרה' : 'Rental'}</option>
              <option value={ProviderType.PHOTOGRAPHY}>{isRTL ? 'צילום' : 'Photography'}</option>
            </select>
          </div>

          {/* Service Category */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {isRTL ? 'קטגוריית שירות' : 'Service Category'}
            </label>
            <select
              value={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isRTL ? 'הכל' : 'All'}</option>
              <option value={ServiceCategory.TRAINING}>{isRTL ? 'הדרכה' : 'Training'}</option>
              <option value={ServiceCategory.GUIDING}>{isRTL ? 'הנחיה' : 'Guiding'}</option>
              <option value={ServiceCategory.EQUIPMENT}>{isRTL ? 'ציוד' : 'Equipment'}</option>
              <option value={ServiceCategory.BOAT}>{isRTL ? 'סירה' : 'Boat'}</option>
              <option value={ServiceCategory.PHOTOGRAPHY}>{isRTL ? 'צילום' : 'Photography'}</option>
              <option value={ServiceCategory.TRANSPORT}>{isRTL ? 'הובלה' : 'Transport'}</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {isRTL ? 'מיקום' : 'Location'}
            </label>
            <Input
              type="text"
              placeholder={isRTL ? 'עיר או אזור' : 'City or area'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {isRTL ? 'דירוג מינימלי' : 'Minimum Rating'}
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                disabled={isLoading}
                className="flex-1"
              />
              <span className="font-semibold min-w-fit">★ {minRating}</span>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              {isRTL ? 'טווח מחיר (₪)' : 'Price Range (₪)'}
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={isRTL ? 'מינימום' : 'Min'}
                value={priceMin}
                onChange={(e) => setPriceMin(Number(e.target.value))}
                disabled={isLoading}
              />
              <Input
                type="number"
                placeholder={isRTL ? 'מקסימום' : 'Max'}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              {isRTL ? 'מיין לפי' : 'Sort By'}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rating">{isRTL ? 'דירוג גבוה' : 'Rating (High)'}</option>
              <option value="price_asc">{isRTL ? 'מחיר (נמוך)' : 'Price (Low)'}</option>
              <option value="price_desc">{isRTL ? 'מחיר (גבוה)' : 'Price (High)'}</option>
              <option value="newest">{isRTL ? 'חדש ביותר' : 'Newest'}</option>
            </select>
          </div>

          {/* Reset Button */}
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isLoading}
            className="w-full"
          >
            {isRTL ? 'איפוס' : 'Reset Filters'}
          </Button>
        </Card>
      )}
    </div>
  );
}
