'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useEquipmentAdminStore } from '@/lib/stores/equipmentAdminStore';
import { MissingEquipment } from '@/lib/types/equipment';
import MissingEquipmentTable from './components/MissingEquipmentTable';
import MissingEquipmentModal from './components/MissingEquipmentModal';

export default function MissingEquipmentPage() {
  const t = useTranslations('admin');
  const {
    missingEquipment,
    missingEquipmentLoading,
    setMissingEquipment,
    setMissingEquipmentLoading,
  } = useEquipmentAdminStore();

  const [selectedEquipment, setSelectedEquipment] = useState<MissingEquipment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('reported');

  useEffect(() => {
    loadMissingEquipment();
  }, []);

  const loadMissingEquipment = async () => {
    setMissingEquipmentLoading(true);
    try {
      const response = await fetch('/api/admin/missing-equipment');
      const data = await response.json();
      if (data.success) {
        setMissingEquipment(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load missing equipment:', error);
    } finally {
      setMissingEquipmentLoading(false);
    }
  };

  const filteredEquipment = missingEquipment.filter(
    (eq) => filterStatus === 'all' || eq.status === filterStatus
  );

  const totalValue = filteredEquipment.reduce((sum, eq) => sum + eq.estimatedValue, 0);
  const averageDaysOverdue =
    filteredEquipment.length > 0
      ? Math.round(
          filteredEquipment.reduce((sum, eq) => sum + eq.daysOverdue, 0) /
            filteredEquipment.length
        )
      : 0;

  const handleSelectEquipment = (eq: MissingEquipment) => {
    setSelectedEquipment(eq);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Missing Equipment
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Track unreturned equipment and manage theft reports
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Missing</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {missingEquipment.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            ${totalValue.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Avg Days Overdue</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{averageDaysOverdue}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Theft Reports</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {missingEquipment.filter((eq) => eq.status === 'theft_filed').length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'reported', 'investigating', 'recovered', 'theft_filed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Missing Equipment Table */}
      <MissingEquipmentTable
        equipment={filteredEquipment}
        loading={missingEquipmentLoading}
        onSelectEquipment={handleSelectEquipment}
      />

      {/* Modal */}
      {showModal && selectedEquipment && (
        <MissingEquipmentModal
          equipment={selectedEquipment}
          onClose={() => {
            setShowModal(false);
            setSelectedEquipment(null);
          }}
          onSave={loadMissingEquipment}
        />
      )}
    </div>
  );
}
