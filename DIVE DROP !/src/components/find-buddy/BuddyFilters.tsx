'use client';

import { useState } from 'react';
import { AppIcon } from '@/components/AppIcon';
import type { BuddyFilters } from '@/types/buddy';

interface BuddyFiltersProps {
  isRTL: boolean;
  onFilterChange: (filters: BuddyFilters) => void;
  isLoading?: boolean;
}

const experienceLevels = [
  { value: 'beginner', he: 'מתחילים', en: 'Beginner' },
  { value: 'intermediate', he: 'בינוני', en: 'Intermediate' },
  { value: 'advanced', he: 'מתקדמים', en: 'Advanced' },
  { value: 'professional', he: 'מקצועי', en: 'Professional' },
];

const diveTypes = [
  { value: 'reef', he: 'שונית', en: 'Reef' },
  { value: 'wreck', he: 'הריסה', en: 'Wreck' },
  { value: 'open_water', he: 'מים פתוחים', en: 'Open Water' },
  { value: 'cave', he: 'מערה', en: 'Cave' },
  { value: 'boat', he: 'סירה', en: 'Boat' },
  { value: 'shore', he: 'חוף', en: 'Shore' },
];

export function BuddyFilters({ isRTL, onFilterChange, isLoading }: BuddyFiltersProps) {
  const [filters, setFilters] = useState<BuddyFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof BuddyFilters, value: string | number | undefined) => {
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
    <div dir={isRTL ? 'rtl' : 'ltr'} className="rounded-2xl bg-white shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <AppIcon name="search" className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-slate-900">{isRTL ? 'סינון' : 'Filters'}</span>
        </div>
        <AppIcon
          name="search"
          className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-slate-900 mb-2">
              {isRTL ? 'מיקום' : 'Location'}
            </label>
            <input
              id="location"
              type="text"
              placeholder={isRTL ? 'חפש מיקום' : 'Search location'}
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="experience_level" className="block text-sm font-semibold text-slate-900 mb-2">
              {isRTL ? 'רמת ניסיון' : 'Experience Level'}
            </label>
            <select
              id="experience_level"
              value={filters.experience_level || ''}
              onChange={(e) => handleFilterChange('experience_level', e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={isLoading}
            >
              <option value="">{isRTL ? 'הכל' : 'All'}</option>
              {experienceLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {isRTL ? level.he : level.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dive_type" className="block text-sm font-semibold text-slate-900 mb-2">
              {isRTL ? 'סוג צלילה' : 'Dive Type'}
            </label>
            <select
              id="dive_type"
              value={filters.dive_type || ''}
              onChange={(e) => handleFilterChange('dive_type', e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={isLoading}
            >
              <option value="">{isRTL ? 'הכל' : 'All'}</option>
              {diveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {isRTL ? type.he : type.en}
                </option>
              ))}
            </select>
          </div>

          {Object.keys(filters).length > 0 && (
            <button
              onClick={handleReset}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {isRTL ? 'אפס סינון' : 'Reset Filters'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
