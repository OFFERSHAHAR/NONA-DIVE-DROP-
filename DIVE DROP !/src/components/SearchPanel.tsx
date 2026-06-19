import React, { useState } from 'react';
import clsx from 'clsx';
import { Button } from './Button';

export interface SearchFilters {
  location?: string;
  date?: string;
  diveLevel?: string;
}

export interface SearchPanelProps {
  onSearch?: (filters: SearchFilters) => void;
  locale: 'en' | 'he';
}

type TabType = 'צלילה' | 'אתר צלילה' | 'קבוצה';

export const SearchPanel = React.forwardRef<HTMLDivElement, SearchPanelProps>(
  ({ onSearch, locale = 'he' }, ref) => {
    const isRTL = locale === 'he';
    const [activeTab, setActiveTab] = useState<TabType>('צלילה');
    const [filters, setFilters] = useState<SearchFilters>({
      location: '',
      date: '',
      diveLevel: '',
    });

    const tabs: TabType[] = ['צלילה', 'אתר צלילה', 'קבוצה'];

    const handleSearch = () => {
      onSearch?.(filters);
    };

    const diveLevels = [
      'מתחיל',
      'Open Water',
      'Advanced Open Water',
      'Rescue Diver',
      'Divemaster',
    ];

    const locations = [
      'הגנים היפנים',
      'שונית הכרישים',
      'אתר הטובים',
      'מפרץ אילת',
      'האי האדום',
    ];

    return (
      <div
        ref={ref}
        className={clsx(
          'flex flex-col gap-4 p-4 sm:p-6 lg:p-8',
          'bg-white dark:bg-slate-900 rounded-lg shadow-md',
          'border border-slate-200 dark:border-slate-700'
        )}
      >
        {/* Header */}
        <div className={clsx('flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
          <span className="text-lg font-bold text-slate-900 dark:text-white">חיפוש צלילה</span>
          <div className="flex-1 h-px bg-gradient-to-r from-blue-500 to-transparent" />
        </div>

        {/* Tabs */}
        <div className={clsx('flex gap-2 border-b border-slate-200 dark:border-slate-700', isRTL ? 'flex-row-reverse' : '')}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 text-sm font-medium transition-colors duration-200',
                'border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:focus:ring-offset-slate-900',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tab-${tab}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div id={`tab-${activeTab}`} role="tabpanel" className="flex flex-col gap-4">
          {/* Location Dropdown */}
          <div className={clsx('flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <span className="text-lg">📍</span>
            <select
              value={filters.location || ''}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className={clsx(
                'flex-1 px-4 py-3 rounded-md',
                'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
                'border border-slate-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:focus:ring-offset-slate-900',
                'transition-colors duration-200',
                isRTL ? 'text-right' : ''
              )}
              aria-label="בחר אתר צלילה"
            >
              <option value="">בחר אתר צלילה</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Date Dropdown */}
          <div className={clsx('flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <span className="text-lg">📅</span>
            <input
              type="date"
              value={filters.date || ''}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className={clsx(
                'flex-1 px-4 py-3 rounded-md',
                'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
                'border border-slate-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:focus:ring-offset-slate-900',
                'transition-colors duration-200'
              )}
              aria-label="בחר תאריך"
            />
          </div>

          {/* Dive Level Dropdown */}
          <div className={clsx('flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <span className="text-lg">🎓</span>
            <select
              value={filters.diveLevel || ''}
              onChange={(e) => setFilters({ ...filters, diveLevel: e.target.value })}
              className={clsx(
                'flex-1 px-4 py-3 rounded-md',
                'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
                'border border-slate-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:focus:ring-offset-slate-900',
                'transition-colors duration-200',
                isRTL ? 'text-right' : ''
              )}
              aria-label="בחר דרגת צולל"
            >
              <option value="">דרגת צולל</option>
              {diveLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            variant="primary"
            size="md"
            fullWidth
            className="mt-2"
            aria-label="חפש צלילות"
          >
            <span className="flex items-center justify-center gap-2">
              <span>🔍</span>
              <span>חפש</span>
            </span>
          </Button>
        </div>
      </div>
    );
  }
);

SearchPanel.displayName = 'SearchPanel';

export default SearchPanel;
