'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores';
import { fetchUsers } from '../actions/adminActions';
import UserTable from './components/UserTable';
import UserModal from './components/UserModal';
import SearchBar from '../components/SearchBar';

export default function UsersPage() {
  const t = useTranslations('admin');
  const {
    users,
    usersLoading,
    usersError,
    showUserModal,
    setUsers,
    setUsersLoading,
    setUsersError,
    openUserModal,
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const result = await fetchUsers();
        if (result.success && result.data) {
          setUsers(result.data);
        } else {
          setUsersError(result.error || 'Failed to load users');
        }
      } catch (error) {
        setUsersError(error instanceof Error ? error.message : 'Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [setUsers, setUsersLoading, setUsersError]);

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('users.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('users.subtitle')} ({filteredUsers.length})
          </p>
        </div>
        <button
          onClick={() => openUserModal()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          + {t('users.add_user')}
        </button>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={t('users.search_placeholder')}
      />

      {/* Error Message */}
      {usersError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{usersError}</p>
        </div>
      )}

      {/* Users Table */}
      {usersLoading ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          Loading users...
        </div>
      ) : (
        <UserTable users={filteredUsers} />
      )}

      {/* User Modal */}
      {showUserModal && <UserModal />}
    </div>
  );
}
