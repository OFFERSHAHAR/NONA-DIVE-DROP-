'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useEquipmentAdminStore } from '@/lib/stores/equipmentAdminStore';
import { ProblematicUser } from '@/lib/types/equipment';
import ProblematicUserTable from './components/ProblematicUserTable';
import ProblematicUserModal from './components/ProblematicUserModal';

export default function ProblematicUsersPage() {
  const t = useTranslations('admin');
  const {
    problematicUsers,
    problematicUsersLoading,
    setProblematicUsers,
    setProblematicUsersLoading,
  } = useEquipmentAdminStore();

  const [selectedUser, setSelectedUser] = useState<ProblematicUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    loadProblematicUsers();
  }, []);

  const loadProblematicUsers = async () => {
    setProblematicUsersLoading(true);
    try {
      const response = await fetch('/api/admin/problematic-users');
      const data = await response.json();
      if (data.success) {
        setProblematicUsers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load problematic users:', error);
    } finally {
      setProblematicUsersLoading(false);
    }
  };

  const filteredUsers = problematicUsers.filter(
    (user) => filterStatus === 'all' || user.flagStatus === filterStatus
  );

  const activeCount = problematicUsers.filter((u) => u.flagStatus === 'active').length;
  const inactiveCount = problematicUsers.filter((u) => u.flagStatus === 'inactive').length;
  const blacklistedCount = problematicUsers.filter(
    (u) => u.flagStatus === 'blacklisted'
  ).length;

  const handleSelectUser = (user: ProblematicUser) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Problematic Users
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage flagged users with history of issues
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Flagged</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {problematicUsers.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Inactive</p>
          <p className="text-3xl font-bold text-gray-600 mt-2">{inactiveCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Blacklisted</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{blacklistedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'blacklisted'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Problematic Users Table */}
      <ProblematicUserTable
        users={filteredUsers}
        loading={problematicUsersLoading}
        onSelectUser={handleSelectUser}
      />

      {/* Problematic User Modal */}
      {showModal && selectedUser && (
        <ProblematicUserModal
          user={selectedUser}
          onClose={() => {
            setShowModal(false);
            setSelectedUser(null);
          }}
          onSave={loadProblematicUsers}
        />
      )}
    </div>
  );
}
