'use client';

import { useState } from 'react';
import { AppIcon } from '@/components/AppIcon';
import clsx from 'clsx';
import type { CreateFreeDivingListingInput } from '@/lib/validations/free-diving';

interface FreeDivingListingFormProps {
  isRTL: boolean;
  onSubmit: (data: CreateFreeDivingListingInput) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<CreateFreeDivingListingInput>;
}

const listingTypes = [
  { value: 'instructor', he: 'מחפש מדריך', en: 'Looking for Instructor' },
  { value: 'partner', he: 'מחפש בן זוג', en: 'Looking for Partner' },
  { value: 'group-session', he: 'זימון קבוצה', en: 'Group Session' },
];

const instructorTypes = [
  { value: 'apnea-training', he: 'הדרכת apnea', en: 'Apnea Training' },
  { value: 'courses', he: 'קורסים', en: 'Courses' },
  { value: 'competition', he: 'תחרויות', en: 'Competition' },
  { value: 'depth', he: 'צלילות עומק', en: 'Depth Diving' },
];

const experienceLevels = [
  { value: 'beginner', he: 'מתחילים', en: 'Beginner' },
  { value: 'intermediate', he: 'בינוני', en: 'Intermediate' },
  { value: 'advanced', he: 'מתקדמים', en: 'Advanced' },
  { value: 'professional', he: 'מקצועי', en: 'Professional' },
];

export function FreeDivingListingForm({
  isRTL,
  onSubmit,
  isLoading = false,
  initialData = {},
}: FreeDivingListingFormProps) {
  const [formData, setFormData] = useState<CreateFreeDivingListingInput>({
    listing_type: (initialData.listing_type as any) || 'partner',
    instructor_type: initialData.instructor_type,
    title: initialData.title || '',
    description: initialData.description || '',
    location: initialData.location || '',
    experience_level: initialData.experience_level || 'intermediate',
    max_participants: initialData.max_participants || 4,
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
        <label htmlFor="listing_type" className="block text-sm font-semibold text-slate-900 mb-2">
          {isRTL ? 'סוג הודעה' : 'Listing Type'} *
        </label>
        <select
          id="listing_type"
          name="listing_type"
          value={formData.listing_type}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
          required
        >
          {listingTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {isRTL ? type.he : type.en}
            </option>
          ))}
        </select>
      </div>

      {formData.listing_type === 'instructor' && (
        <div>
          <label htmlFor="instructor_type" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'סוג הדרכה' : 'Instructor Type'} *
          </label>
          <select
            id="instructor_type"
            name="instructor_type"
            value={formData.instructor_type || ''}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
            required
          >
            <option value="">{isRTL ? 'בחר סוג' : 'Select type'}</option>
            {instructorTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {isRTL ? type.he : type.en}
              </option>
            ))}
          </select>
        </div>
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
          placeholder={isRTL ? 'חפש מדריך apnea מנוסה' : 'Looking for experienced apnea instructor'}
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
        <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
          {isRTL ? 'תיאור' : 'Description'}
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder={isRTL ? 'תיאור מפורט' : 'Detailed description'}
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
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
          <label htmlFor="max_participants" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'מספר משתתפים' : 'Max Participants'}
          </label>
          <input
            id="max_participants"
            name="max_participants"
            type="number"
            min="1"
            max="20"
            value={formData.max_participants}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_date" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'תאריך התחלה' : 'Start Date'} *
          </label>
          <input
            id="start_date"
            name="start_date"
            type="datetime-local"
            value={formData.start_date}
            onChange={handleChange}
            className={clsx(
              'w-full rounded-lg border px-4 py-2.5 text-sm transition',
              errors.start_date
                ? 'border-red-300 bg-red-50'
                : 'border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            )}
            required
          />
          {errors.start_date && <p className="mt-1 text-xs text-red-600">{errors.start_date}</p>}
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'תאריך סיום' : 'End Date'} *
          </label>
          <input
            id="end_date"
            name="end_date"
            type="datetime-local"
            value={formData.end_date}
            onChange={handleChange}
            className={clsx(
              'w-full rounded-lg border px-4 py-2.5 text-sm transition',
              errors.end_date
                ? 'border-red-300 bg-red-50'
                : 'border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            )}
            required
          />
          {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact_email" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'דוא"ל' : 'Email'}
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={handleChange}
            placeholder="contact@example.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="contact_phone" className="block text-sm font-semibold text-slate-900 mb-2">
            {isRTL ? 'טלפון' : 'Phone'}
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={handleChange}
            placeholder="+1234567890"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
        <input
          id="contact_hidden"
          name="contact_hidden"
          type="checkbox"
          checked={formData.contact_hidden}
          onChange={handleChange}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="contact_hidden" className="text-sm text-slate-700">
          {isRTL ? 'הסתר את פרטי הקשר עד לחשיפה' : 'Hide contact details until revealed'}
        </label>
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
