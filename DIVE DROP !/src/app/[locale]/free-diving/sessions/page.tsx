export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { SessionCard } from '@/components/free-diving/SessionCard';
import { AppIcon } from '@/components/AppIcon';

interface Session {
  id: string;
  title: string;
  session_type: string;
  level: string;
  location: string;
  start_date: string;
  start_time: string;
  capacity: number;
  current_participants: number;
  price_shekel: number;
  image_url?: string;
}

export default function FreeDivingSessionsPage() {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sessionType: '',
    level: '',
    location: '',
    maxPrice: '',
  });

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams();

        if (filters.sessionType) query.append('sessionType', filters.sessionType);
        if (filters.level) query.append('level', filters.level);
        if (filters.location) query.append('location', filters.location);
        if (filters.maxPrice) query.append('maxPrice', filters.maxPrice);

        const response = await fetch(`/api/free-diving-sessions?${query}`);
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [filters]);

  const labels = {
    en: {
      title: 'Free Diving Sessions',
      subtitle: 'Browse and book amazing free diving experiences',
      filters: 'Filters',
      sessionType: 'Session Type',
      level: 'Difficulty',
      location: 'Location',
      maxPrice: 'Max Price',
      clear: 'Clear Filters',
      noResults: 'No sessions found',
      loading: 'Loading sessions...',
    },
    he: {
      title: 'צלילות צלילה חופשית',
      subtitle: 'עיין והזמן חוויות צלילה חופשית מדהימות',
      filters: 'סינון',
      sessionType: 'סוג הצלילה',
      level: 'רמת קושי',
      location: 'מיקום',
      maxPrice: 'מחיר מקסימלי',
      clear: 'נקה סינון',
      noResults: 'לא נמצאו צלילות',
      loading: 'טוען צלילות...',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];

  const sessionTypes = [
    { value: 'group_apnea_training', label: { en: 'Group Apnea Training', he: 'הדרכת חנייה בקבוצה' } },
    { value: 'certification_course', label: { en: 'Certification Course', he: 'קורס הסמכה' } },
    { value: 'competition_prep', label: { en: 'Competition Prep', he: 'הכנה תחרויות' } },
    { value: 'depth_training', label: { en: 'Depth Training', he: 'הדרכת עומק' } },
    { value: 'partner_sessions', label: { en: 'Partner Sessions', he: 'צלילות זוגיות' } },
  ];

  const levels = [
    { value: 'beginner', label: { en: 'Beginner', he: 'מתחיל' } },
    { value: 'intermediate', label: { en: 'Intermediate', he: 'ביניים' } },
    { value: 'advanced', label: { en: 'Advanced', he: 'מתקדם' } },
    { value: 'expert', label: { en: 'Expert', he: 'מומחה' } },
  ];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 py-8 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-white">{currentLabels.title}</h1>
          <p className="mt-2 text-lg text-blue-100">{currentLabels.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <AppIcon name="filter" className="h-5 w-5" />
            {currentLabels.filters}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Session Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {currentLabels.sessionType}
              </label>
              <select
                value={filters.sessionType}
                onChange={(e) => setFilters(prev => ({ ...prev, sessionType: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Types</option>
                {sessionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label[locale as 'en' | 'he']}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {currentLabels.level}
              </label>
              <select
                value={filters.level}
                onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Levels</option>
                {levels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label[locale as 'en' | 'he']}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {currentLabels.location}
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Search location..."
              />
            </div>

            {/* Max Price Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {currentLabels.maxPrice}
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="₪"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {Object.values(filters).some(f => f) && (
            <button
              onClick={() => setFilters({ sessionType: '', level: '', location: '', maxPrice: '' })}
              className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
            >
              {currentLabels.clear}
            </button>
          )}
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <AppIcon name="loader" className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg font-semibold">{currentLabels.loading}</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-md">
            <AppIcon name="coral" className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-600">{currentLabels.noResults}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                id={session.id}
                title={session.title}
                sessionType={session.session_type}
                level={session.level}
                location={session.location}
                date={session.start_date}
                time={session.start_time}
                capacity={session.capacity}
                currentParticipants={session.current_participants}
                price={session.price_shekel}
                imageUrl={session.image_url}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
