'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useAdminStore } from '@/lib/stores/adminStore';
import { fetchShuttles, fetchUsers } from '../actions/adminActions';
import ShuttleTable from './components/ShuttleTable';
import ShuttleModal from './components/ShuttleModal';
import SearchBar from '../components/SearchBar';

export default function ShuttlesPage() {
  const t = useTranslations('admin');
  const {
    shuttles,
    shuttlesLoading,
    shuttlesError,
    showShuttleModal,
    users,
    setShuttles,
    setShuttlesLoading,
    setShuttlesError,
    setUsers,
    openShuttleModal,
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadShuttles = async () => {
      setShuttlesLoading(true);
      try {
        const result = await fetchShuttles();
        if (result.success && result.data) {
          setShuttles(result.data);
        } else {
          setShuttlesError(result.error || 'Failed to load shuttles');
        }
      } catch (error) {
        setShuttlesError(error instanceof Error ? error.message : 'Failed to load shuttles');
      } finally {
        setShuttlesLoading(false);
      }
    };

    const loadUsers = async () => {
      try {
        const result = await fetchUsers();
        if (result.success && result.data) {
          setUsers(result.data);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadShuttles();
    if (users.length === 0) {
      loadUsers();
    }
  }, [setShuttles, setShuttlesLoading, setShuttlesError, setUsers, users.length]);

  const filteredShuttles = shuttles.filter((shuttle) =>
    shuttle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shuttle.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('shuttles.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('shuttles.subtitle')} ({filteredShuttles.length})
          </p>
        </div>
        <button
          onClick={() => openShuttleModal()}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          + {t('shuttles.add_shuttle')}
        </button>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={t('shuttles.search_placeholder')}
      />

      {/* Error Message */}
      {shuttlesError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{shuttlesError}</p>
        </div>
      )}

      {/* Shuttles Table */}
      {shuttlesLoading ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          Loading shuttles...
        </div>
      ) : (
        <ShuttleTable shuttles={filteredShuttles} />
      )}

      {/* Shuttle Modal */}
      {showShuttleModal && <ShuttleModal />}
    </div>
  );
}
