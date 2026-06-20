'use client';

import { useState } from 'react';

interface BulkApprovalPanelProps {
  selectedCount: number;
  onApproveAll: () => Promise<void>;
  onRejectAll: (reason: string, notes?: string) => Promise<void>;
}

export function BulkApprovalPanel({
  selectedCount,
  onApproveAll,
  onRejectAll,
}: BulkApprovalPanelProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (window.confirm(`Approve ${selectedCount} photos?`)) {
      setLoading(true);
      try {
        await onApproveAll();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason) {
      alert('Please select a rejection reason');
      return;
    }

    if (
      window.confirm(
        `Reject ${selectedCount} photos with reason: "${rejectionReason}"?`
      )
    ) {
      setLoading(true);
      try {
        await onRejectAll(rejectionReason, rejectionNotes);
        setShowRejectForm(false);
        setRejectionReason('');
        setRejectionNotes('');
      } finally {
        setLoading(false);
      }
    }
  };

  const rejectionReasons = [
    'Blurry or out of focus',
    'Poor lighting',
    'Inappropriate content',
    'Not relevant to site/instructor',
    'Duplicate photo',
    'Watermark or text overlay',
    'Wrong orientation',
    'Other',
  ];

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      {!showRejectForm ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {selectedCount} photo{selectedCount !== 1 ? 's' : ''} selected
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
            >
              ✓ Approve All
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
            >
              ✗ Reject All
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Reject {selectedCount} photo{selectedCount !== 1 ? 's' : ''}
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-900 dark:text-white mb-1">
              Rejection Reason *
            </label>
            <select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              <option value="">Select a reason...</option>
              {rejectionReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-900 dark:text-white mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="Add feedback for the users..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRejectSubmit}
              disabled={loading || !rejectionReason}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-3 rounded transition-colors text-sm"
            >
              {loading ? 'Processing...' : 'Confirm Rejection'}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectionReason('');
                setRejectionNotes('');
              }}
              disabled={loading}
              className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium py-2 px-3 rounded transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
