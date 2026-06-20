'use client';

import { AppIcon } from '@/components/AppIcon';

interface ContactRevealModalProps {
  isRTL: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  listingTitle: string;
}

export function ContactRevealModal({
  isRTL,
  isOpen,
  onClose,
  onConfirm,
  listingTitle,
}: ContactRevealModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="rounded-2xl bg-white p-8 shadow-2xl max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-blue-100 p-3">
            <AppIcon name="eye" className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-2">
          {isRTL ? 'חשוף איש קשר?' : 'Reveal Contact?'}
        </h2>

        <p className="text-sm text-slate-600 text-center mb-6">
          {isRTL
            ? `בחשיפת פרטי קשר עבור "${listingTitle}", בן הצלילה יידע שאתה מעוניין`
            : `By revealing contact for "${listingTitle}", the person will know you're interested`}
        </p>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <AppIcon name="check" className="h-5 w-5" />
            {isRTL ? 'חשוף' : 'Reveal Contact'}
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            {isRTL ? 'ביטול' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
