'use client';

import { useState } from 'react';
import { AppIcon } from '@/components/AppIcon';
import clsx from 'clsx';
import type { CreateBuddyListingInput } from '@/lib/validations/buddy';

interface BuddyListingFormProps {
  isRTL: boolean;
  onSubmit: (data: CreateBuddyListingInput) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<CreateBuddyListingInput>;
}

const experienceLevels = [
  { value: 'beginner', he: 'מתחילים', en: 'Beginner' },
  { value: 'intermediate', he: 'בינוני', en: 'Intermediate' },
  { value: 'advanced', he: 'מתקדמים', en: 'Advanced' },
  { value: 'professional', he: 'מקצועי', en: 'Professional' },
];

const diveTypes = [
  { value: 'reef', he: 'שונית', en: 'Reef' },
  { value: 'wreck', he: 'הריסה', en: 'Wreck' },
  { value: 'open_water', he: 'מים פתוחים', en: 'Open Water' },
  { value: 'cave', he: 'מערה', en: 'Cave' },
  { value: 'boat', he: 'סירה', en: 'Boat' },
  { value: 'shore', he: 'חוף', en: 'Shore' },
];

export function BuddyListingForm({
  isRTL,
  onSubmit,
  isLoading = false,
  initialData = {},
}: BuddyListingFormProps) {
  const [formData, setFormData] = useState<CreateBuddyListingInput>({
    title: initialData.title || '',
    description: initialData.description || '',
    location: initialData.location || '',
    experience_level: initialData.experience_level || 'intermediate',
    dive_type: initialData.dive_type || 'reef',
    max_divers: initialData.max_divers || 4,
    start_date: initialData.start_date || '',
    end_date: initialData.end_date || '',
    contact_email: initialData.contact_email || '',
    contact_phone: initialData.contact_phone || '',
    contact_hidden: initialData.contact_hidden !== false,
    language_preference: initialData.language_preference || 'he',
    notes: initialData.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ submit: error.message });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {errors.submit && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{errors.submit}</div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
          {isRTL ? 'כותרת' : 'Title'} *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          placeholder={isRTL ? 'חפש בן צלילה' : 'Looking for dive buddy'}
          className={clsx(
            'w-full rounded-lg border px-4 py-2.5 text-sm transition',
            errors.title
              ? 'border-red-300 bg-red-50 text-red-900'
              : 'border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          )}
          required
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-semibold text-slate-900 mb-2">
          {isRTL ? 'מיקום' : 'Location'} *
        </label>
        <input
          id="location"
          name="location"
          type="text"
          value={formData.location}
          onChange={handleChange}
          placeholder={isRTL ? 'אילת, ים המלח' : 'Eilat, Dead Sea'}
          className={clsx(
            'w-full rounded-lg border px-4 py-2.5 text-sm transition',
            errors.location
              ? 'border-red-300 bg-red-50 text-red-900'
              : 'border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          )}
          required
        />
        {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="experience_level" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'רמת ניסיון' : 'Experience Level'} *
          </label>
          <select
            id="experience_level"
            name="experience_level"
            value={formData.experience_level}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
            required
          >
            {experienceLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {isRTL ? level.he : level.en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dive_type" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'סוג צלילה' : 'Dive Type'} *
          </label>
          <select
            id="dive_type"
            name="dive_type"
            value={formData.dive_type}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
            required
          >
            {diveTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {isRTL ? type.he : type.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={clsx(
          'w-full rounded-lg px-4 py-3 font-semibold text-white transition',
          isLoading
            ? 'bg-slate-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        )}
      >
        {isLoading ? (isRTL ? 'יוצר...' : 'Creating...') : isRTL ? 'צור הודעה' : 'Create Listing'}
      </button>
    </form>
  );
}
