'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { AppIcon } from '@/components/AppIcon';

interface SessionFormProps {
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function SessionForm({ onSubmit, isLoading = false }: SessionFormProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sessionType: 'group_apnea_training',
    level: 'beginner',
    location: '',
    startDate: '',
    startTime: '',
    endTime: '',
    capacity: '10',
    price: '',
    durationMinutes: '',
    maxDepth: '',
    imageUrl: '',
  });

  const sessionTypes = [
    { value: 'group_apnea_training', label: { en: 'Group Apnea Training', he: 'הדרכת חנייה בקבוצה' } },
    { value: 'certification_course', label: { en: 'Certification Course', he: 'קורס הסמכה' } },
    { value: 'competition_prep', label: { en: 'Competition Prep', he: 'הכנה תחרויות' } },
    { value: 'depth_training', label: { en: 'Depth Training', he: 'הדרכת עומק' } },
    { value: 'partner_sessions', label: { en: 'Partner Sessions', he: 'צלילות זוגיות' } },
  ];

  const levels = [
    { value: 'beginner', label: { en: 'Beginner', he: 'מתחיל' } },
    { value: 'intermediate', label: { en: 'Intermediate', he: 'ביניים' } },
    { value: 'advanced', label: { en: 'Advanced', he: 'מתקדם' } },
    { value: 'expert', label: { en: 'Expert', he: 'מומחה' } },
  ];

  const labels = {
    en: {
      title: 'Session Title',
      description: 'Description',
      sessionType: 'Session Type',
      level: 'Difficulty Level',
      location: 'Location',
      startDate: 'Start Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      capacity: 'Max Participants',
      price: 'Price (₪)',
      durationMinutes: 'Duration (minutes)',
      maxDepth: 'Max Depth (meters)',
      imageUrl: 'Image URL',
      submit: 'Create Session',
    },
    he: {
      title: 'כותרת הצלילה',
      description: 'תיאור',
      sessionType: 'סוג הצלילה',
      level: 'רמת קושי',
      location: 'מיקום',
      startDate: 'תאריך התחלה',
      startTime: 'שעת התחלה',
      endTime: 'שעת סיום',
      capacity: 'מקסימום משתתפים',
      price: 'מחיר (₪)',
      durationMinutes: 'משך הזמן (דקות)',
      maxDepth: 'עומק מקסימלי (מטרים)',
      imageUrl: 'כתובת התמונה',
      submit: 'צור צלילה',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: formData.title,
      description: formData.description,
      sessionType: formData.sessionType,
      level: formData.level,
      location: formData.location,
      startDate: formData.startDate,
      startTime: formData.startTime,
      endTime: formData.endTime || undefined,
      capacity: parseInt(formData.capacity),
      price: parseFloat(formData.price),
      durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
      maxDepth: formData.maxDepth ? parseInt(formData.maxDepth) : undefined,
      imageUrl: formData.imageUrl || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {currentLabels.title}
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          placeholder={currentLabels.title}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {currentLabels.description}
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          placeholder={currentLabels.description}
        />
      </div>

      {/* Session Type & Level */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.sessionType}
          </label>
          <select
            name="sessionType"
            value={formData.sessionType}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          >
            {sessionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label[locale as 'en' | 'he']}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.level}
          </label>
          <select
            name="level"
            value={formData.level}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          >
            {levels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label[locale as 'en' | 'he']}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {currentLabels.location}
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          placeholder={currentLabels.location}
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.startDate}
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.startTime}
          </label>
          <input
            type="time"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.endTime}
          </label>
          <input
            type="time"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Capacity & Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.capacity}
          </label>
          <input
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            required
            min="1"
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.price}
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            step="10"
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Optional Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.durationMinutes}
          </label>
          <input
            type="number"
            name="durationMinutes"
            value={formData.durationMinutes}
            onChange={handleChange}
            min="15"
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.maxDepth}
          </label>
          <input
            type="number"
            name="maxDepth"
            value={formData.maxDepth}
            onChange={handleChange}
            min="1"
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {currentLabels.imageUrl}
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          placeholder="https://..."
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-700 to-cyan-500 py-3 font-bold text-white transition hover:shadow-lg disabled:opacity-50"
      >
        <AppIcon name="plus" className="h-5 w-5" />
        {currentLabels.submit}
      </button>
    </form>
  );
}
