'use client';

import { EquipmentAnalytics } from '@/lib/types/equipment';

interface AnalyticsChartsProps {
  analytics: EquipmentAnalytics;
}

export default function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
  // Simple bar chart visualization for revenue
  const maxRevenue = Math.max(
    ...analytics.topEquipmentByRevenue.map((eq) => eq.revenue)
  );

  // Simple bar chart for damage rate by type
  const maxDamageRate = Math.max(
    ...analytics.damageRateByType.map((dt) => dt.damageRate)
  );

  return (
    <div className="space-y-6">
      {/* Revenue by Equipment Type */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          Revenue by Equipment Type
        </h2>
        <div className="space-y-4">
          {analytics.topEquipmentByRevenue.map((eq) => (
            <div key={eq.equipmentId}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {eq.equipmentName}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {eq.rentalCount} rentals • Avg: ${eq.averagePrice.toFixed(2)}
                  </p>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ${eq.revenue.toFixed(2)}
                </p>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(eq.revenue / maxRevenue) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Damage Rate by Equipment Type */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          Damage Rate by Equipment Type
        </h2>
        <div className="space-y-4">
          {analytics.damageRateByType.map((dt) => (
            <div key={dt.equipmentType}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {dt.equipmentType}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {dt.damageCount} reports • Avg repair: $
                    {dt.averageRepairCost.toFixed(2)}
                  </p>
                </div>
                <p className="text-lg font-bold text-red-600">
                  {(dt.damageRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{
                    width: `${(dt.damageRate / maxDamageRate) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
