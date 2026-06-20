'use client';

import { useTranslations } from 'next-intl';
import { useAdminStore } from '@/stores';
import { AdminUser } from '@/lib/types/admin';
import { deleteUser } from '../../actions/adminActions';

interface UserTableProps {
  users: AdminUser[];
}

export default function UserTable({ users }: UserTableProps) {
  const t = useTranslations('admin');
  const { deleteUser: deleteUserFromStore, openUserModal } = useAdminStore();

  const handleEdit = (user: AdminUser) => {
    openUserModal(user);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(t('common.confirm_delete'))) return;

    try {
      const result = await deleteUser(userId);
      if (result.success) {
        deleteUserFromStore(userId);
      } else {
        alert(result.error || 'Failed to delete user');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      manager: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      user: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      driver: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    };
    return colors[role] || colors.user;
  };

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          {t('users.no_users')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('users.table.name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('users.table.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('users.table.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('users.table.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('users.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    user.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                  }`}>
                    {user.isActive ? t('users.table.active') : t('users.table.inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
