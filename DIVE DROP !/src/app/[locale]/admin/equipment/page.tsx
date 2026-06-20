'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useEquipmentAdminStore } from '@/stores';
import { Equipment } from '@/lib/types/equipment';
import SearchBar from '../components/SearchBar';
import EquipmentTable from './components/EquipmentTable';
import EquipmentModal from './components/EquipmentModal';

export default function EquipmentManagementPage() {
  const t = useTranslations('admin');
  const {
    equipment,
    equipmentLoading,
    equipmentSearchQuery,
    equipmentStatusFilter,
    setEquipment,
    setEquipmentLoading,
    setEquipmentSearchQuery,
    setEquipmentStatusFilter,
  } = useEquipmentAdminStore();

  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setEquipmentLoading(true);
    try {
      const response = await fetch('/api/admin/equipment');
      const data = await response.json();
      if (data.success) {
        setEquipment(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      setEquipmentLoading(false);
    }
  };

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(equipmentSearchQuery.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(equipmentSearchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(equipmentSearchQuery.toLowerCase());

    const matchesStatus =
      equipmentStatusFilter === 'all' || item.status === equipmentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSelectEquipment = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Equipment Management
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage rental equipment, track status, and view rental history
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchBar
            value={equipmentSearchQuery}
            onChange={setEquipmentSearchQuery}
            placeholder="Search by equipment name, owner, or type..."
          />
          <select
            value={equipmentStatusFilter}
            onChange={(e) => setEquipmentStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="in_rental">In Rental</option>
            <option value="unavailable">Unavailable</option>
            <option value="damaged">Damaged</option>
            <option value="missing">Missing</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
            <p className="text-sm text-slate-600 dark:text-slate-400">Total Equipment</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {equipment.length}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
            <p className="text-sm text-slate-600 dark:text-slate-400">Available</p>
            <p className="text-2xl font-bold text-green-600">
              {equipment.filter((e) => e.status === 'available').length}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
            <p className="text-sm text-slate-600 dark:text-slate-400">Missing</p>
            <p className="text-2xl font-bold text-red-600">
              {equipment.filter((e) => e.status === 'missing').length}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
            <p className="text-sm text-slate-600 dark:text-slate-400">Damaged</p>
            <p className="text-2xl font-bold text-orange-600">
              {equipment.filter((e) => e.status === 'damaged').length}
            </p>
          </div>
        </div>
      </div>

      {/* Equipment Table */}
      <EquipmentTable
        equipment={filteredEquipment}
        loading={equipmentLoading}
        onSelectEquipment={handleSelectEquipment}
      />

      {/* Equipment Modal */}
      {showModal && selectedEquipment && (
        <EquipmentModal
          equipment={selectedEquipment}
          onClose={() => {
            setShowModal(false);
            setSelectedEquipment(null);
          }}
          onSave={loadEquipment}
        />
      )}
    </div>
  );
}
