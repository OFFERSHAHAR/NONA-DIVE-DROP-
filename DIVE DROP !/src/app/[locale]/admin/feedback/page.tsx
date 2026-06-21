'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, ChevronDown, Search, Filter } from 'lucide-react';

interface FeedbackEntry {
  id: string;
  diver_id: string;
  dive_site_id: string;
  diver_name?: string;
  site_name?: string;
  visibility_meters: number;
  temperature_celsius: number;
  current_strength: number;
  marine_life: string[];
  notes?: string;
  image_count: number;
  submitted_at: string;
  status?: string;
}

interface Filters {
  dive_site_id?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'date' | 'rating' | 'site';
  sortOrder: 'asc' | 'desc';
}

export default function FeedbackDashboard() {
  const t = useTranslations('admin');
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [diveSites, setDiveSites] = useState<Array<{ id: string; name: string }>>([]);

  const itemsPerPage = 20;

  // Fetch dive sites for filter dropdown
  useEffect(() => {
    const fetchDiveSites = async () => {
      try {
        const response = await fetch('/api/admin/dive-sites?limit=100');
        if (response.ok) {
          const data = await response.json();
          setDiveSites(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch dive sites:', err);
      }
    };

    fetchDiveSites();
  }, []);

  // Fetch feedback with pagination and filters
  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: itemsPerPage.toString(),
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (filters.dive_site_id) {
          queryParams.append('dive_site_id', filters.dive_site_id);
        }
        if (filters.status) {
          queryParams.append('status', filters.status);
        }
        if (filters.dateFrom) {
          queryParams.append('dateFrom', filters.dateFrom);
        }
        if (filters.dateTo) {
          queryParams.append('dateTo', filters.dateTo);
        }
        if (searchTerm) {
          queryParams.append('search', searchTerm);
        }

        const response = await fetch(`/api/admin/feedback?${queryParams.toString()}`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Unauthorized: Admin access required');
          }
          throw new Error('Failed to fetch feedback');
        }

        const data = await response.json();
        setFeedbackList(data.data || []);
        setTotalCount(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Feedback fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchFeedback();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [page, filters, searchTerm]);

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPage(1); // Reset to first page when filters change
  };

  const handleSort = (field: 'date' | 'rating' | 'site') => {
    if (filters.sortBy === field) {
      setFilters(prev => ({
        ...prev,
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        sortBy: field,
        sortOrder: 'desc',
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Feedback Management
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          View, moderate, and analyze dive condition feedback from divers
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Feedback</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">This Page</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {feedbackList.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Average Visibility</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {feedbackList.length > 0
              ? (
                  feedbackList.reduce((acc, f) => acc + f.visibility_meters, 0) /
                  feedbackList.length
                ).toFixed(1)
              : '—'}
            m
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Avg Temperature</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {feedbackList.length > 0
              ? (
                  feedbackList.reduce((acc, f) => acc + f.temperature_celsius, 0) /
                  feedbackList.length
                ).toFixed(1)
              : '—'}
            °C
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <label htmlFor="feedback-search" className="sr-only">
              Search by diver name or site
            </label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
            <input
              id="feedback-search"
              type="search"
              placeholder="Search by diver name or site..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="filter-dive-site" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dive Site
                </label>
                <select
                  id="filter-dive-site"
                  value={filters.dive_site_id || ''}
                  onChange={e => handleFilterChange('dive_site_id', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">All Sites</option>
                  {diveSites.map(site => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-date-from" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date From
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={e => handleFilterChange('dateFrom', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="filter-date-to" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date To
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={e => handleFilterChange('dateTo', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setFilters({
                    sortBy: 'date',
                    sortOrder: 'desc',
                  })
                }
                className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Feedback Table */}
      {!loading && feedbackList.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                  >
                    Submitted{' '}
                    {filters.sortBy === 'date' &&
                      (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Diver
                  </th>
                  <th
                    onClick={() => handleSort('site')}
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                  >
                    Site {filters.sortBy === 'site' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Visibility
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Temp
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Current
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Images
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map((feedback, index) => (
                  <tr
                    key={feedback.id}
                    className={`border-b border-slate-200 dark:border-slate-700 ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-slate-800'
                        : 'bg-slate-50 dark:bg-slate-700/50'
                    } hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(feedback.submitted_at).toLocaleDateString()}{' '}
                      {new Date(feedback.submitted_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                      {feedback.diver_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {feedback.site_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                        {feedback.visibility_meters}m
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-xs">
                        {feedback.temperature_celsius}°C
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 rounded text-xs">
                        {feedback.current_strength.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {feedback.image_count > 0 ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                          {feedback.image_count} image{feedback.image_count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={`/admin/feedback/${feedback.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && feedbackList.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">No feedback found matching your filters</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && feedbackList.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {(page - 1) * itemsPerPage + 1} to{' '}
            {Math.min(page * itemsPerPage, totalCount)} of {totalCount} feedback entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
