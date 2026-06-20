'use client';

import { useState } from 'react';

interface RejectionReasonDialogProps {
  isOpen: boolean;
  photoId: string;
  onSubmit: (reason: string, notes?: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function RejectionReasonDialog({
  isOpen,
  photoId,
  onSubmit,
  onClose,
  isLoading = false,
}: RejectionReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const rejectionReasons = [
    { value: 'blurry', label: 'Blurry or out of focus' },
    { value: 'poor_lighting', label: 'Poor lighting' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'not_relevant', label: 'Not relevant to site/instructor' },
    { value: 'duplicate', label: 'Duplicate photo' },
    { value: 'watermark', label: 'Watermark or text overlay' },
    { value: 'orientation', label: 'Wrong orientation' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      alert('Please select a reason');
      return;
    }

    await onSubmit(reason, notes);
    setReason('');
    setNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Reject Photo
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Rejection Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            >
              <option value="">Select a reason...</option>
              {rejectionReasons.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              placeholder="Provide specific feedback for the user..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-white font-medium py-2 px-3 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:opacity-50 text-white font-medium py-2 px-3 rounded transition-colors"
            >
              {isLoading ? 'Processing...' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
