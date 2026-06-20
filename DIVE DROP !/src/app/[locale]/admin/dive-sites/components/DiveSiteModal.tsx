'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/stores';
import { createDiveSite, updateDiveSite } from '../../actions/adminActions';
import { createDiveSiteSchema, updateDiveSiteSchema } from '@/lib/validation/adminValidation';
import { DiveSite } from '@/lib/types/admin';

export default function DiveSiteModal() {
  const t = useTranslations('admin');
  const { selectedItem, closeDiveSiteModal, addDiveSite, updateDiveSite: updateSiteInStore } = useAdminStore();
  const isEditing = !!selectedItem;

  const [formData, setFormData] = useState({
    name: '',
    nameHe: '',
    description: '',
    descriptionHe: '',
    location: {
      latitude: 29.5505,
      longitude: 34.9255,
      address: '',
    },
    difficulty: 'easy' as const,
    maxDepth: 40,
    tags: [] as string[],
    images: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && selectedItem) {
      setFormData({
        name: selectedItem.name,
        nameHe: selectedItem.nameHe || '',
        description: selectedItem.description,
        descriptionHe: selectedItem.descriptionHe || '',
        location: selectedItem.location,
        difficulty: selectedItem.difficulty,
        maxDepth: selectedItem.maxDepth,
        tags: selectedItem.tags,
        images: selectedItem.images,
      });
    }
  }, [isEditing, selectedItem]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isEditing && selectedItem) {
        const schema = updateDiveSiteSchema;
        const validatedData = schema.parse({
          ...formData,
          id: selectedItem.id,
        });

        const result = await updateDiveSite(validatedData);
        if (result.success && result.data) {
          updateSiteInStore(result.data);
          closeDiveSiteModal();
        } else {
          setError(result.error || 'Failed to update site');
        }
      } else {
        const schema = createDiveSiteSchema;
        const validatedData = schema.parse(formData);

        const result = await createDiveSite(validatedData);
        if (result.success && result.data) {
          addDiveSite(result.data);
          closeDiveSiteModal();
        } else {
          setError(result.error || 'Failed to create site');
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || (err instanceof Error ? err.message : 'Validation error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? t('dive_sites.edit_site') : t('dive_sites.add_site')}
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.name')} (English)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Name Hebrew */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.name')} (Hebrew)
            </label>
            <input
              type="text"
              value={formData.nameHe}
              onChange={(e) => setFormData({ ...formData, nameHe: e.target.value })}
              dir="rtl"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.description')} (English)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
              required
            />
          </div>

          {/* Description Hebrew */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.description')} (Hebrew)
            </label>
            <textarea
              value={formData.descriptionHe}
              onChange={(e) => setFormData({ ...formData, descriptionHe: e.target.value })}
              dir="rtl"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t('dive_sites.form.latitude')}
              </label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={formData.location.latitude}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, latitude: parseFloat(e.target.value) },
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t('dive_sites.form.longitude')}
              </label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={formData.location.longitude}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, longitude: parseFloat(e.target.value) },
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.address')}
            </label>
            <input
              type="text"
              value={formData.location.address}
              onChange={(e) => setFormData({
                ...formData,
                location: { ...formData.location, address: e.target.value },
              })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.difficulty')}
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="easy">Easy</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Max Depth */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.max_depth')} (m)
            </label>
            <input
              type="number"
              min="0"
              value={formData.maxDepth}
              onChange={(e) => setFormData({ ...formData, maxDepth: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('dive_sites.form.tags')}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag and press Enter"
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="font-bold hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={closeDiveSiteModal}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? '...' : (isEditing ? t('common.update') : t('common.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
