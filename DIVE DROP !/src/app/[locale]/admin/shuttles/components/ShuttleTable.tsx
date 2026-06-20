'use client';

import { useTranslations } from 'next-intl';
import { useAdminStore } from '@/stores';
import { Shuttle } from '@/lib/types/admin';
import { deleteShuttle } from '../../actions/adminActions';

interface ShuttleTableProps {
  shuttles: Shuttle[];
}

export default function ShuttleTable({ shuttles }: ShuttleTableProps) {
  const t = useTranslations('admin');
  const { deleteShuttle: deleteShuttleFromStore, openShuttleModal, users } = useAdminStore();

  const handleEdit = (shuttle: Shuttle) => {
    openShuttleModal(shuttle);
  };

  const handleDelete = async (shuttleId: string) => {
    if (!confirm(t('common.confirm_delete'))) return;

    try {
      const result = await deleteShuttle(shuttleId);
      if (result.success) {
        deleteShuttleFromStore(shuttleId);
      } else {
        alert(result.error || 'Failed to delete shuttle');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete shuttle');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      in_use: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      maintenance: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      offline: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300',
    };
    return colors[status] || colors.offline;
  };

  const getDriverName = (driverId: string) => {
    const driver = users.find((u) => u.id === driverId);
    return driver?.name || 'Unknown Driver';
  };

  if (shuttles.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          {t('shuttles.no_shuttles')}
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
                {t('shuttles.table.name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('shuttles.table.driver')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('shuttles.table.registration')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('shuttles.table.capacity')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('shuttles.table.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('shuttles.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {shuttles.map((shuttle) => (
              <tr key={shuttle.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900 dark:text-white">
                    🚐 {shuttle.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(shuttle.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {getDriverName(shuttle.driverId)}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">
                  {shuttle.registrationNumber}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {shuttle.capacity} seats
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(shuttle.status)}`}>
                    {shuttle.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(shuttle)}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(shuttle.id)}
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
