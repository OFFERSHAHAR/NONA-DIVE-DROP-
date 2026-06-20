'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useEquipmentAdminStore } from '@/lib/stores/equipmentAdminStore';
import { Dispute } from '@/lib/types/equipment';
import DisputeTable from './components/DisputeTable';
import DisputeModal from './components/DisputeModal';

export default function DisputesPage() {
  const t = useTranslations('admin');
  const {
    disputes,
    disputesLoading,
    setDisputes,
    setDisputesLoading,
  } = useEquipmentAdminStore();

  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('open');

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setDisputesLoading(true);
    try {
      const response = await fetch('/api/admin/disputes');
      const data = await response.json();
      if (data.success) {
        setDisputes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load disputes:', error);
    } finally {
      setDisputesLoading(false);
    }
  };

  const filteredDisputes = disputes.filter(
    (d) => filterStatus === 'all' || d.status === filterStatus
  );

  const openCount = disputes.filter((d) => d.status === 'open').length;
  const resolvedCount = disputes.filter((d) => d.status === 'resolved').length;

  const handleSelectDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Dispute Resolution
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage disputes between renters and listers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Disputes</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {disputes.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Open</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{openCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Resolved</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{resolvedCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Closed</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {disputes.filter((d) => d.status === 'closed').length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'open', 'resolved', 'closed'].map((status) => (
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

      {/* Disputes Table */}
      <DisputeTable
        disputes={filteredDisputes}
        loading={disputesLoading}
        onSelectDispute={handleSelectDispute}
      />

      {/* Dispute Modal */}
      {showModal && selectedDispute && (
        <DisputeModal
          dispute={selectedDispute}
          onClose={() => {
            setShowModal(false);
            setSelectedDispute(null);
          }}
          onSave={loadDisputes}
        />
      )}
    </div>
  );
}
