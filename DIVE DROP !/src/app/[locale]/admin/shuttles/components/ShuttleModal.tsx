'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/adminStore';
import { createShuttle, updateShuttle } from '../../actions/adminActions';
import { createShuttleSchema, updateShuttleSchema } from '@/lib/validation/adminValidation';
import { Shuttle, DayOfWeek } from '@/lib/types/admin';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ShuttleModal() {
  const t = useTranslations('admin');
  const { selectedItem, closeShuttleModal, addShuttle, updateShuttle: updateShuttleInStore, users } = useAdminStore();
  const isEditing = !!selectedItem;

  const [formData, setFormData] = useState({
    name: '',
    driverId: '',
    capacity: 6,
    registrationNumber: '',
    availability: {
      monday: [{ startTime: '08:00', endTime: '18:00' }],
      tuesday: [{ startTime: '08:00', endTime: '18:00' }],
      wednesday: [{ startTime: '08:00', endTime: '18:00' }],
      thursday: [{ startTime: '08:00', endTime: '18:00' }],
      friday: [{ startTime: '08:00', endTime: '18:00' }],
      saturday: [{ startTime: '09:00', endTime: '17:00' }],
      sunday: [{ startTime: '09:00', endTime: '17:00' }],
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && selectedItem) {
      setFormData({
        name: selectedItem.name,
        driverId: selectedItem.driverId,
        capacity: selectedItem.capacity,
        registrationNumber: selectedItem.registrationNumber,
        availability: selectedItem.availability || {},
      });
    }
  }, [isEditing, selectedItem]);

  const handleAvailabilityChange = (day: DayOfWeek, index: number, field: string, value: string) => {
    const currentAvailability = formData.availability[day] || [];
    const updated = [...currentAvailability];
    if (updated[index]) {
      (updated[index] as any)[field] = value;
    }
    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [day]: updated,
      },
    });
  };

  const addTimeSlot = (day: DayOfWeek) => {
    const currentAvailability = formData.availability[day] || [];
    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [day]: [...currentAvailability, { startTime: '08:00', endTime: '18:00' }],
      },
    });
  };

  const removeTimeSlot = (day: DayOfWeek, index: number) => {
    const currentAvailability = formData.availability[day] || [];
    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [day]: currentAvailability.filter((_, i) => i !== index),
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isEditing && selectedItem) {
        const schema = updateShuttleSchema;
        const validatedData = schema.parse({
          ...formData,
          id: selectedItem.id,
        });

        const result = await updateShuttle(validatedData);
        if (result.success && result.data) {
          updateShuttleInStore(result.data);
          closeShuttleModal();
        } else {
          setError(result.error || 'Failed to update shuttle');
        }
      } else {
        const schema = createShuttleSchema;
        const validatedData = schema.parse(formData);

        const result = await createShuttle(validatedData);
        if (result.success && result.data) {
          addShuttle(result.data);
          closeShuttleModal();
        } else {
          setError(result.error || 'Failed to create shuttle');
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || (err instanceof Error ? err.message : 'Validation error'));
    } finally {
      setIsLoading(false);
    }
  };

  const driverOptions = users.filter((u) => u.role === 'driver' || u.role === 'manager');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? t('shuttles.edit_shuttle') : t('shuttles.add_shuttle')}
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t('shuttles.form.name')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t('shuttles.form.registration')}
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Driver & Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t('shuttles.form.driver')}
              </label>
              <select
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a driver</option>
                {driverOptions.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} ({driver.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t('shuttles.form.capacity')}
              </label>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Availability Schedule */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              {t('shuttles.form.availability')}
            </h3>
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
              {DAYS.map((day) => (
                <div key={day} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                      {day}
                    </label>
                    <button
                      type="button"
                      onClick={() => addTimeSlot(day)}
                      className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      + Add slot
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(formData.availability[day] || []).map((slot, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleAvailabilityChange(day, index, 'startTime', e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-500">-</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleAvailabilityChange(day, index, 'endTime', e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-900 dark:text-white"
                        />
                        {(formData.availability[day] || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(day, index)}
                            className="px-2 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={closeShuttleModal}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? '...' : (isEditing ? t('common.update') : t('common.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
