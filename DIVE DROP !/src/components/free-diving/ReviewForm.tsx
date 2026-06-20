'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { AppIcon } from '@/components/AppIcon';

interface ReviewFormProps {
  sessionId: string;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function ReviewForm({ sessionId, onSubmit, isLoading = false }: ReviewFormProps) {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: '',
    instructionQualityRating: 0,
    safetyRating: 0,
    valueRating: 0,
  });

  const labels = {
    en: {
      overallRating: 'Overall Rating',
      instructionQuality: 'Instruction Quality',
      safety: 'Safety',
      value: 'Value for Money',
      title: 'Review Title',
      comment: 'Your Review',
      submit: 'Submit Review',
    },
    he: {
      overallRating: 'דירוג כללי',
      instructionQuality: 'איכות ההדרכה',
      safety: 'בטיחות',
      value: 'ערך לעומת מחיר',
      title: 'כותרת הביקורת',
      comment: 'הביקורת שלך',
      submit: 'שלח ביקורת',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];

  const StarRating = ({ value, onChange, onHover = null }: any) => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onHover?.(0)}
          className="transition"
        >
          <AppIcon
            name={star <= (hoveredRating || value) ? 'star' : 'star'}
            className={`h-6 w-6 ${
              star <= (hoveredRating || value) ? 'text-yellow-500' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.rating === 0) {
      alert(isRTL ? 'אנא בחר דירוג' : 'Please select a rating');
      return;
    }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6 rounded-xl bg-slate-50 p-6">
      {/* Overall Rating */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          {currentLabels.overallRating}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition"
            >
              <AppIcon
                name="star"
                className={`h-8 w-8 ${
                  star <= (hoveredRating || formData.rating) ? 'text-yellow-500' : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Sub-ratings */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.instructionQuality}
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, instructionQualityRating: star }))}
                className="transition"
              >
                <AppIcon
                  name="star"
                  className={`h-5 w-5 ${
                    star <= formData.instructionQualityRating ? 'text-yellow-500' : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.safety}
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, safetyRating: star }))}
                className="transition"
              >
                <AppIcon
                  name="star"
                  className={`h-5 w-5 ${
                    star <= formData.safetyRating ? 'text-yellow-500' : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {currentLabels.value}
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, valueRating: star }))}
                className="transition"
              >
                <AppIcon
                  name="star"
                  className={`h-5 w-5 ${
                    star <= formData.valueRating ? 'text-yellow-500' : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

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
          className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          placeholder={currentLabels.title}
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {currentLabels.comment}
        </label>
        <textarea
          name="comment"
          value={formData.comment}
          onChange={handleChange}
          required
          rows={4}
          minLength={10}
          className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
          placeholder={currentLabels.comment}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-700 to-cyan-500 py-3 font-bold text-white transition hover:shadow-lg disabled:opacity-50"
      >
        <AppIcon name="send" className="h-5 w-5" />
        {currentLabels.submit}
      </button>
    </form>
  );
}
