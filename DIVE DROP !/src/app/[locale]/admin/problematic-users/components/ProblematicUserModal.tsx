'use client';

import { useState } from 'react';
import { ProblematicUser } from '@/lib/types/equipment';

interface ProblematicUserModalProps {
  user: ProblematicUser;
  onClose: () => void;
  onSave: () => void;
}

export default function ProblematicUserModal({
  user,
  onClose,
  onSave,
}: ProblematicUserModalProps) {
  const [flagStatus, setFlagStatus] = useState<'active' | 'inactive' | 'blacklisted'>(
    user.flagStatus as any
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUpdateStatus = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/problematic-users/${user.userId}/update-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flagStatus }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('User status updated successfully');
        setTimeout(() => {
          onSave();
          onClose();
        }, 1000);
      } else {
        setError(data.error || 'Failed to update user status');
      }
    } catch (err) {
      setError('An error occurred while updating the user');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromProblematic = async () => {
    if (!window.confirm('Remove this user from problematic list?')) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/problematic-users/${user.userId}/remove`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('User removed from problematic list');
        setTimeout(() => {
          onSave();
          onClose();
        }, 1000);
      } else {
        setError(data.error || 'Failed to remove user');
      }
    } catch (err) {
      setError('An error occurred while removing the user');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWarning = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/problematic-users/${user.userId}/send-warning`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Your account has been flagged due to: ${user.flagReason}. Please review our terms and guidelines.`,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Warning sent to user');
      } else {
        setError(data.error || 'Failed to send warning');
      }
    } catch (err) {
      setError('An error occurred while sending the warning');
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
            User Management
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

          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Name
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{user.userName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Email
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Current Status
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">
                {user.flagStatus.toUpperCase()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Issue Count
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{user.issueCount}</p>
            </div>
          </div>

          {/* Flag Reason */}
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Flag Reason
            </label>
            <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
              {user.flagReason}
            </p>
          </div>

          {/* Issue History */}
          {user.issues && user.issues.length > 0 && (
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-4">
                Issue History
              </h3>
              <div className="space-y-3">
                {user.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {issue.type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {issue.description}
                        </p>
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Update */}
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Update Status
            </label>
            <select
              value={flagStatus}
              onChange={(e) => setFlagStatus(e.target.value as any)}
              className="mt-2 w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="active">Active (Flagged)</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
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
            onClick={handleSendWarning}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send Warning'}
          </button>
          <button
            onClick={handleRemoveFromProblematic}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Removing...' : 'Remove from List'}
          </button>
          <button
            onClick={handleUpdateStatus}
            disabled={loading || flagStatus === user.flagStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
          >
            {loading ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
