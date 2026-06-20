'use client';

import { useState } from 'react';
import { AppIcon } from '@/components/AppIcon';

interface ContactRevealModalProps {
  isRTL: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  listingTitle: string;
}

export function ContactRevealModal({
  isRTL,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  listingTitle,
}: ContactRevealModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6">
          <div className="flex items-center gap-3">
            <AppIcon name="lock" className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">
              {isRTL ? 'חשוף פרטי קשר?' : 'Reveal Contact?'}
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-700">
            {isRTL
              ? `אתה הולך לחשוף את פרטי הקשר עבור "${listingTitle}"`
              : `You're about to reveal contact info for "${listingTitle}"`}
          </p>

          <p className="text-sm text-slate-600">
            {isRTL
              ? 'הבעלים של ההודעה יידעו שחשפת את פרטיו'
              : "The listing owner will know you've revealed their contact info"}
          </p>

          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm font-medium text-blue-900 flex items-start gap-2">
              <AppIcon name="info" className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {isRTL
                  ? 'אתה יוכל ליצור קשר ישיר עם בן הצלילה'
                  : 'You can now contact the buddy directly'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-200 p-4 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
          >
            {isRTL ? 'ביטול' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isLoading ? (isRTL ? 'חושף...' : 'Revealing...') : isRTL ? 'חשוף' : 'Reveal'}
          </button>
        </div>
      </div>
    </div>
  );
}
