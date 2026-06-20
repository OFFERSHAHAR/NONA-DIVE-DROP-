'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useEquipmentAdminStore } from '@/stores';
import { DamageReport } from '@/lib/types/equipment';
import DamageReportTable from './components/DamageReportTable';
import DamageReportModal from './components/DamageReportModal';

export default function DamageReportsPage() {
  const t = useTranslations('admin');
  const {
    damageReports,
    damageReportsLoading,
    setDamageReports,
    setDamageReportsLoading,
  } = useEquipmentAdminStore();

  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  useEffect(() => {
    loadDamageReports();
  }, []);

  const loadDamageReports = async () => {
    setDamageReportsLoading(true);
    try {
      const response = await fetch('/api/admin/damage-reports');
      const data = await response.json();
      if (data.success) {
        setDamageReports(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load damage reports:', error);
    } finally {
      setDamageReportsLoading(false);
    }
  };

  const filteredReports = damageReports.filter(
    (report) => filterStatus === 'all' || report.status === filterStatus
  );

  const pendingCount = damageReports.filter((r) => r.status === 'pending').length;
  const approvedCount = damageReports.filter((r) => r.status === 'approved').length;
  const rejectedCount = damageReports.filter((r) => r.status === 'rejected').length;

  const handleSelectReport = (report: DamageReport) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Damage Reports
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Review and approve damage claims from renters
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Reports</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {damageReports.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{approvedCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Rejected</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected', 'resolved'].map((status) => (
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

      {/* Damage Reports Table */}
      <DamageReportTable
        reports={filteredReports}
        loading={damageReportsLoading}
        onSelectReport={handleSelectReport}
      />

      {/* Damage Report Modal */}
      {showModal && selectedReport && (
        <DamageReportModal
          report={selectedReport}
          onClose={() => {
            setShowModal(false);
            setSelectedReport(null);
          }}
          onSave={loadDamageReports}
        />
      )}
    </div>
  );
}
