'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useAdminStore } from '@/lib/stores/adminStore';
import { fetchDiveSites } from '../actions/adminActions';
import DiveSiteTable from './components/DiveSiteTable';
import DiveSiteModal from './components/DiveSiteModal';
import SearchBar from '../components/SearchBar';

export default function DiveSitesPage() {
  const t = useTranslations('admin');
  const {
    diveSites,
    diveSitesLoading,
    diveSitesError,
    showDiveSiteModal,
    setDiveSites,
    setDiveSitesLoading,
    setDiveSitesError,
    openDiveSiteModal,
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadDiveSites = async () => {
      setDiveSitesLoading(true);
      try {
        const result = await fetchDiveSites();
        if (result.success && result.data) {
          setDiveSites(result.data);
        } else {
          setDiveSitesError(result.error || 'Failed to load dive sites');
        }
      } catch (error) {
        setDiveSitesError(error instanceof Error ? error.message : 'Failed to load dive sites');
      } finally {
        setDiveSitesLoading(false);
      }
    };

    loadDiveSites();
  }, [setDiveSites, setDiveSitesLoading, setDiveSitesError]);

  const filteredSites = diveSites.filter((site) =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('dive_sites.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('dive_sites.subtitle')} ({filteredSites.length})
          </p>
        </div>
        <button
          onClick={() => openDiveSiteModal()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          + {t('dive_sites.add_site')}
        </button>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={t('dive_sites.search_placeholder')}
      />

      {/* Error Message */}
      {diveSitesError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{diveSitesError}</p>
        </div>
      )}

      {/* Dive Sites Table */}
      {diveSitesLoading ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          Loading dive sites...
        </div>
      ) : (
        <DiveSiteTable sites={filteredSites} />
      )}

      {/* Dive Site Modal */}
      {showDiveSiteModal && <DiveSiteModal />}
    </div>
  );
}
