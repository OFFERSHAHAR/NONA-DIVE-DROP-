'use client';

import { useTranslations } from 'next-intl';
import { useAdminStore } from '@/lib/stores/adminStore';
import { DiveSite } from '@/lib/types/admin';
import { deleteDiveSite } from '../../actions/adminActions';

interface DiveSiteTableProps {
  sites: DiveSite[];
}

export default function DiveSiteTable({ sites }: DiveSiteTableProps) {
  const t = useTranslations('admin');
  const { deleteDiveSite: deleteSiteFromStore, openDiveSiteModal } = useAdminStore();

  const handleEdit = (site: DiveSite) => {
    openDiveSiteModal(site);
  };

  const handleDelete = async (siteId: string) => {
    if (!confirm(t('common.confirm_delete'))) return;

    try {
      const result = await deleteDiveSite(siteId);
      if (result.success) {
        deleteSiteFromStore(siteId);
      } else {
        alert(result.error || 'Failed to delete site');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete site');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      intermediate: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      advanced: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return colors[difficulty] || colors.easy;
  };

  if (sites.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          {t('dive_sites.no_sites')}
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
                {t('dive_sites.table.name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('dive_sites.table.location')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('dive_sites.table.difficulty')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('dive_sites.table.max_depth')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('dive_sites.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sites.map((site) => (
              <tr key={site.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {site.images.length > 0 && (
                      <img
                        src={site.images[0]}
                        alt={site.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {site.name}
                      </p>
                      {site.nameHe && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {site.nameHe}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {site.location.address}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(site.difficulty)}`}>
                    {site.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {site.maxDepth}m
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(site)}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(site.id)}
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
