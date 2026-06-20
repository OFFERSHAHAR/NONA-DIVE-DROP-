'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/adminStore';
import { createUser, updateUser } from '../../actions/adminActions';
import { createUserSchema, updateUserSchema } from '@/lib/validation/adminValidation';
import { AdminUser } from '@/lib/types/admin';

export default function UserModal() {
  const t = useTranslations('admin');
  const { selectedItem, closeUserModal, addUser, updateUser: updateUserInStore } = useAdminStore();
  const isEditing = !!selectedItem;

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'user' as const,
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && selectedItem) {
      setFormData({
        email: selectedItem.email,
        name: selectedItem.name,
        role: selectedItem.role,
        password: '',
      });
    }
  }, [isEditing, selectedItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isEditing && selectedItem) {
        const schema = updateUserSchema;
        const validatedData = schema.parse({
          ...formData,
          id: selectedItem.id,
        });

        const result = await updateUser(validatedData);
        if (result.success && result.data) {
          updateUserInStore(result.data);
          closeUserModal();
        } else {
          setError(result.error || 'Failed to update user');
        }
      } else {
        const schema = createUserSchema;
        const validatedData = schema.parse(formData);

        const result = await createUser(validatedData);
        if (result.success && result.data) {
          addUser(result.data);
          closeUserModal();
        } else {
          setError(result.error || 'Failed to create user');
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || (err instanceof Error ? err.message : 'Validation error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? t('users.edit_user') : t('users.add_user')}
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('users.form.name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('users.form.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('users.form.role')}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="driver">Driver</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('users.form.password')}
              {isEditing && <span className="text-xs text-slate-500 ml-1">(optional)</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEditing ? t('users.form.leave_blank') : undefined}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={!isEditing}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={closeUserModal}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? '...' : (isEditing ? t('common.update') : t('common.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
