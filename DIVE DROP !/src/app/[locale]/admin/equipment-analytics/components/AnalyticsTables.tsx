'use client';

import { EquipmentAnalytics } from '@/lib/types/equipment';

interface AnalyticsTablesProps {
  analytics: EquipmentAnalytics;
}

export default function AnalyticsTables({ analytics }: AnalyticsTablesProps) {
  return (
    <div className="space-y-6">
      {/* Top Equipment by Revenue */}
      {analytics.topEquipmentByRevenue.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top Equipment by Revenue
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Rentals
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Total Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {analytics.topEquipmentByRevenue.map((eq) => (
                  <tr key={eq.equipmentId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {eq.equipmentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {eq.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {eq.rentalCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      ${eq.averagePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      ${eq.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Damage Rate by Type */}
      {analytics.damageRateByType.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Damage Rate by Equipment Type
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Equipment Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Damage Count
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Damage Rate
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Avg Repair Cost
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Risk Level
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {analytics.damageRateByType.map((dt) => (
                  <tr key={dt.equipmentType} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {dt.equipmentType}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {dt.damageCount}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">
                      {(dt.damageRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      ${dt.averageRepairCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          dt.damageRate > 0.2
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : dt.damageRate > 0.1
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}
                      >
                        {dt.damageRate > 0.2 ? 'High' : dt.damageRate > 0.1 ? 'Medium' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
