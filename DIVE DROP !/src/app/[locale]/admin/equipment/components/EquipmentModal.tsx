'use client';

import { useState } from 'react';
import { Equipment, EquipmentStatus } from '@/lib/types/equipment';

interface EquipmentModalProps {
  equipment: Equipment;
  onClose: () => void;
  onSave: () => void;
}

export default function EquipmentModal({
  equipment,
  onClose,
  onSave,
}: EquipmentModalProps) {
  const [status, setStatus] = useState<EquipmentStatus>(equipment.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/equipment/${equipment.id}/update-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onSave();
        onClose();
      } else {
        setError(data.error || 'Failed to update equipment status');
      }
    } catch (err) {
      setError('An error occurred while updating the equipment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate this equipment?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/equipment/${equipment.id}/deactivate`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        onSave();
        onClose();
      } else {
        setError(data.error || 'Failed to deactivate equipment');
      }
    } catch (err) {
      setError('An error occurred while deactivating the equipment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Equipment Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Equipment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Name
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{equipment.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Type
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{equipment.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Owner
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{equipment.ownerName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Rental Price
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                ${equipment.rentalPrice}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Description
            </label>
            <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
              {equipment.description}
            </p>
          </div>

          {/* Images */}
          {equipment.images && equipment.images.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Images
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {equipment.images.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                      src={img}
                      alt={`Equipment ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Update */}
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Update Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
              className="mt-2 w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="available">Available</option>
              <option value="in_rental">In Rental</option>
              <option value="unavailable">Unavailable</option>
              <option value="damaged">Damaged</option>
              <option value="missing">Missing</option>
            </select>
          </div>

          {/* Rental History */}
          {equipment.rentalHistory && equipment.rentalHistory.length > 0 && (
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-4">
                Rental History
              </h3>
              <div className="space-y-3">
                {equipment.rentalHistory.map((rental) => (
                  <div
                    key={rental.id}
                    className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {rental.renterName}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(rental.startDate).toLocaleDateString()} -{' '}
                          {new Date(rental.endDate).toLocaleDateString()}
                        </p>
                        {rental.returnedLate && (
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            Returned {rental.daysLate} days late
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ${rental.rentalPrice}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateStatus}
            disabled={loading || status === equipment.status}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Update Status'}
          </button>
          <button
            onClick={handleDeactivate}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
          >
            {loading ? 'Deactivating...' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}
