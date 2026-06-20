'use client';

import { useState } from 'react';
import { DamageReport } from '@/lib/types/equipment';

interface DamageReportModalProps {
  report: DamageReport;
  onClose: () => void;
  onSave: () => void;
}

export default function DamageReportModal({
  report,
  onClose,
  onSave,
}: DamageReportModalProps) {
  const [status, setStatus] = useState<'approved' | 'rejected' | 'pending'>(
    report.status as any
  );
  const [repairCost, setRepairCost] = useState<string>(
    report.repairCost?.toString() || ''
  );
  const [rejectionReason, setRejectionReason] = useState<string>(
    report.rejectionReason || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!repairCost) {
      setError('Please set a repair cost');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/damage-reports/${report.id}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repairCost: parseFloat(repairCost),
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onSave();
        onClose();
      } else {
        setError(data.error || 'Failed to approve damage report');
      }
    } catch (err) {
      setError('An error occurred while approving the report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      setError('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/damage-reports/${report.id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rejectionReason,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onSave();
        onClose();
      } else {
        setError(data.error || 'Failed to reject damage report');
      }
    } catch (err) {
      setError('An error occurred while rejecting the report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Damage Report Review
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Report Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Renter
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {report.renterName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Status
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {report.status.toUpperCase()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Report Date
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Reported By
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {report.reportedBy}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Damage Description
            </label>
            <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
              {report.description}
            </p>
          </div>

          {/* Photos */}
          {report.photosUrl && report.photosUrl.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Evidence Photos
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {report.photosUrl.map((url, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700"
                  >
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.status === 'pending' && (
            <>
              {/* Repair Cost */}
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Estimated Repair Cost
                </label>
                <input
                  type="number"
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Rejection Reason */}
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why you're rejecting this claim..."
                  rows={4}
                  className="mt-2 w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>

          {report.status === 'pending' && (
            <>
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
              >
                {loading ? 'Processing...' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
