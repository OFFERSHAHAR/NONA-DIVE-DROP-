'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useEquipmentAdminStore } from '@/lib/stores/equipmentAdminStore';
import { Commission } from '@/lib/types/equipment';
import CommissionTable from './components/CommissionTable';
import CommissionModal from './components/CommissionModal';

export default function CommissionsPage() {
  const t = useTranslations('admin');
  const {
    commissions,
    commissionsLoading,
    setCommissions,
    setCommissionsLoading,
  } = useEquipmentAdminStore();

  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  useEffect(() => {
    loadCommissions();
  }, []);

  const loadCommissions = async () => {
    setCommissionsLoading(true);
    try {
      const response = await fetch('/api/admin/commissions');
      const data = await response.json();
      if (data.success) {
        setCommissions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load commissions:', error);
    } finally {
      setCommissionsLoading(false);
    }
  };

  const filteredCommissions = commissions.filter(
    (c) => filterStatus === 'all' || c.status === filterStatus
  );

  const totalOwed = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  const handleSelectCommission = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Commission & Revenue
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage lister commissions and payment tracking
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Commissions</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            ${commissions.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Amount Owed</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            ${totalOwed.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Amount Paid</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            ${totalPaid.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Unique Listers</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {new Set(commissions.map((c) => c.listerId)).size}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex gap-2">
          {['all', 'pending', 'paid'].map((status) => (
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

      {/* Commissions Table */}
      <CommissionTable
        commissions={filteredCommissions}
        loading={commissionsLoading}
        onSelectCommission={handleSelectCommission}
      />

      {/* Commission Modal */}
      {showModal && selectedCommission && (
        <CommissionModal
          commission={selectedCommission}
          onClose={() => {
            setShowModal(false);
            setSelectedCommission(null);
          }}
          onSave={loadCommissions}
        />
      )}
    </div>
  );
}
