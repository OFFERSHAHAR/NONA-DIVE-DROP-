'use client';

import { useState } from 'react';
import { AppIcon } from '@/components/AppIcon';
import type { FreeDivingFilters as FreeDivingFiltersType } from '@/types/free-diving';

interface FreeDivingFiltersProps {
  isRTL: boolean;
  onFilterChange: (filters: FreeDivingFiltersType) => void;
  isLoading?: boolean;
}

const listingTypes = [
  { value: 'instructor', he: 'מדריך', en: 'Instructor' },
  { value: 'partner', he: 'בן זוג', en: 'Partner' },
  { value: 'group-session', he: 'קבוצה', en: 'Group' },
];

const instructorTypes = [
  { value: 'apnea-training', he: 'Apnea', en: 'Apnea' },
  { value: 'courses', he: 'קורסים', en: 'Courses' },
  { value: 'competition', he: 'תחרויות', en: 'Competition' },
  { value: 'depth', he: 'עומק', en: 'Depth' },
];

const experienceLevels = [
  { value: 'beginner', he: 'מתחיל', en: 'Beginner' },
  { value: 'intermediate', he: 'בינוני', en: 'Intermediate' },
  { value: 'advanced', he: 'מתקדם', en: 'Advanced' },
  { value: 'professional', he: 'מקצועי', en: 'Professional' },
];

export function FreeDivingFilters({ isRTL, onFilterChange, isLoading }: FreeDivingFiltersProps) {
  const [filters, setFilters] = useState<FreeDivingFiltersType>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof FreeDivingFiltersType, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <AppIcon name="filter" className="h-5 w-5" />
          {isRTL ? 'סינון' : 'Filters'}
        </h3>
        {Object.keys(filters).length > 0 && (
          <button
            onClick={handleReset}
            className="text-sm text-blue-600 hover:underline"
            disabled={isLoading}
          >
            {isRTL ? 'אפס' : 'Reset'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Listing Type */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'סוג הודעה' : 'Listing Type'}
          </label>
          <select
            value={filters.listing_type || ''}
            onChange={(e) => handleFilterChange('listing_type', e.target.value || undefined)}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">{isRTL ? 'הכל' : 'All'}</option>
            {listingTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {isRTL ? type.he : type.en}
              </option>
            ))}
          </select>
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'רמה' : 'Level'}
          </label>
          <select
            value={filters.experience_level || ''}
            onChange={(e) => handleFilterChange('experience_level', e.target.value || undefined)}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">{isRTL ? 'הכל' : 'All'}</option>
            {experienceLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {isRTL ? level.he : level.en}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'מיקום' : 'Location'}
          </label>
          <input
            type="text"
            value={filters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
            disabled={isLoading}
            placeholder={isRTL ? 'אילת...' : 'Eilat...'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {/* Dates Toggle */}
        <div className="flex items-end">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <AppIcon name="calendar" className="h-4 w-4" />
            {isRTL ? 'תאריכים' : 'Dates'}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              {isRTL ? 'מתאריך' : 'From Date'}
            </label>
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value || undefined)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              {isRTL ? 'עד תאריך' : 'To Date'}
            </label>
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value || undefined)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
