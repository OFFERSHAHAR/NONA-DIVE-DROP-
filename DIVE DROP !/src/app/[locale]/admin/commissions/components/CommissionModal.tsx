'use client';

import { useState } from 'react';
import { Commission } from '@/lib/types/equipment';

interface CommissionModalProps {
  commission: Commission;
  onClose: () => void;
  onSave: () => void;
}

export default function CommissionModal({
  commission,
  onClose,
  onSave,
}: CommissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleMarkAsPaid = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/commissions/${commission.id}/mark-paid`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: 'bank_transfer',
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Commission marked as paid');
        setTimeout(() => {
          onSave();
          onClose();
        }, 1000);
      } else {
        setError(data.error || 'Failed to mark commission as paid');
      }
    } catch (err) {
      setError('An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/commissions/${commission.id}/send-invoice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: commission.listerEmail,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Invoice sent to lister');
      } else {
        setError(data.error || 'Failed to send invoice');
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Commission Details
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

          {/* Commission Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Lister Name
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {commission.listerName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Email
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {commission.listerEmail}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Month
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{commission.month}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Amount
              </label>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                ${commission.amount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Status Info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Payment Status
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
              {commission.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
            </p>
            {commission.paidDate && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Paid on {new Date(commission.paidDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Bit Payment Info */}
          {commission.bitPaymentId && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Bit Payment ID: {commission.bitPaymentId}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-6 border-t border-slate-200 dark:border-slate-700 flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSendInvoice}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send Invoice'}
          </button>
          {commission.status === 'pending' && (
            <button
              onClick={handleMarkAsPaid}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              {loading ? 'Processing...' : 'Mark as Paid'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
