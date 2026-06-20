'use client';

import { useState } from 'react';
import { Dispute, DisputeResolution } from '@/lib/types/equipment';

interface DisputeModalProps {
  dispute: Dispute;
  onClose: () => void;
  onSave: () => void;
}

export default function DisputeModal({
  dispute,
  onClose,
  onSave,
}: DisputeModalProps) {
  const [resolution, setResolution] = useState<DisputeResolution | ''>('');
  const [details, setDetails] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResolveDispute = async () => {
    if (!resolution) {
      setError('Please select a resolution');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
          resolutionDetails: details,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Dispute resolved successfully');
        setTimeout(() => {
          onSave();
          onClose();
        }, 1000);
      } else {
        setError(data.error || 'Failed to resolve dispute');
      }
    } catch (err) {
      setError('An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Dispute Resolution
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

          {successMessage && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Dispute Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Equipment
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{dispute.equipmentName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Type
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {dispute.type.toUpperCase()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Renter
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{dispute.renterName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Lister
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{dispute.listerName}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Dispute Description
            </label>
            <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
              {dispute.description}
            </p>
          </div>

          {/* Evidence */}
          <div className="grid grid-cols-2 gap-4">
            {dispute.renterEvidence && dispute.renterEvidence.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Renter Evidence ({dispute.renterEvidence.length})
                </label>
                <div className="mt-2 space-y-2">
                  {dispute.renterEvidence.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {ev.type}
                      </span>
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dispute.listerEvidence && dispute.listerEvidence.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Lister Evidence ({dispute.listerEvidence.length})
                </label>
                <div className="mt-2 space-y-2">
                  {dispute.listerEvidence.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {ev.type}
                      </span>
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resolution */}
          {dispute.status === 'open' && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Resolution Decision
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as DisputeResolution)}
                  className="mt-2 w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Select resolution...</option>
                  <option value="charge_renter">Charge Renter</option>
                  <option value="refund_lister">Refund Lister</option>
                  <option value="split">Split 50/50</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Resolution Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Explain your decision..."
                  rows={4}
                  className="mt-2 w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </>
          )}

          {dispute.status !== 'open' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Resolution
              </p>
              <p className="mt-2 text-slate-900 dark:text-white font-semibold">
                {dispute.resolution ? dispute.resolution.replace('_', ' ').toUpperCase() : 'Pending'}
              </p>
              {dispute.resolutionDetails && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {dispute.resolutionDetails}
                </p>
              )}
            </div>
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
          {dispute.status === 'open' && (
            <button
              onClick={handleResolveDispute}
              disabled={loading || !resolution}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              {loading ? 'Resolving...' : 'Resolve Dispute'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
