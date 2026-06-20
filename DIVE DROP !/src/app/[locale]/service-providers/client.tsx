'use client';

import { useEffect, useCallback, useState } from 'react';
import { useLocale } from 'next-intl';
import { ResponsiveGrid } from '@/components/ResponsiveGrid';
import { ServiceProviderCard } from '@/components/ServiceProviderCard';
import { ServiceProviderSearch } from '@/components/ServiceProviderSearch';
import { useServiceProviderStore } from '@/stores';
import { serviceProviderClient } from '@/lib/service-provider/client';
import type { ProviderFilters } from '@/types/service-provider';

export function ServiceProviderBrowse() {
  const locale = useLocale();
  const isRTL = locale === 'he';

  const {
    providers,
    searchResults,
    isLoading,
    error,
    currentPage,
    currentFilters,
    setSearchResults,
    setLoading,
    setError,
    setCurrentPage,
    setFilters,
  } = useServiceProviderStore();

  const [isMounted, setIsMounted] = useState(false);

  // Hydration fix
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initial search on mount
  useEffect(() => {
    if (isMounted) {
      handleSearch({});
    }
  }, [isMounted]);

  const handleSearch = useCallback(
    async (newFilters: Partial<ProviderFilters>) => {
      setLoading(true);
      setError(null);

      try {
        const filters: ProviderFilters = {
          ...currentFilters,
          ...newFilters,
          page: newFilters.page || 1,
        };

        setFilters(filters);

        const results = await serviceProviderClient.searchProviders(filters);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [currentFilters, setFilters, setSearchResults, setLoading, setError]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      handleSearch({ page: newPage });
    },
    [handleSearch, setCurrentPage]
  );

  if (!isMounted) {
    return null;
  }

  const currentProviders = searchResults?.providers || providers;
  const hasMore = searchResults?.has_more || false;
  const totalCount = searchResults?.total || 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-3xl font-bold mb-2">
          {isRTL ? 'ספר שירותים' : 'Service Provider Directory'}
        </h1>
        <p className="text-gray-600">
          {isRTL
            ? 'גלה מטפלים קצרים, מדריכים ועוד באזורך'
            : 'Discover certified instructors, guides, rentals and more in your area'}
        </p>
      </div>

      {/* Search */}
      <ServiceProviderSearch
        onSearch={handleSearch}
        isLoading={isLoading}
        isRTL={isRTL}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {isRTL ? 'שגיאה: ' : 'Error: '}
          {error}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && totalCount > 0 && (
        <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL
            ? `נמצאו ${totalCount} ספקי שירות`
            : `Found ${totalCount} service providers`}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="mt-2 text-gray-600">
            {isRTL ? 'טוען...' : 'Loading...'}
          </p>
        </div>
      )}

      {/* Providers Grid */}
      {!isLoading && currentProviders.length > 0 ? (
        <>
          <ResponsiveGrid>
            {currentProviders.map((provider) => (
              <ServiceProviderCard
                key={provider.id}
                provider={provider}
                locale={locale}
              />
            ))}
          </ResponsiveGrid>

          {/* Pagination */}
          {totalCount > 20 && (
            <div
              className={`flex justify-between items-center py-6 ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {isRTL ? 'הקודם' : 'Previous'}
              </button>

              <div className="text-sm text-gray-600">
                {isRTL
                  ? `עמוד ${currentPage} מתוך ${Math.ceil(totalCount / 20)}`
                  : `Page ${currentPage} of ${Math.ceil(totalCount / 20)}`}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasMore || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {isRTL ? 'הבא' : 'Next'}
              </button>
            </div>
          )}
        </>
      ) : !isLoading ? (
        <div className="text-center py-12 text-gray-500">
          {isRTL
            ? 'לא נמצאו ספקי שירות. נסה לשנות את הסינונים שלך'
            : 'No service providers found. Try adjusting your filters.'}
        </div>
      ) : null}
    </div>
  );
}
