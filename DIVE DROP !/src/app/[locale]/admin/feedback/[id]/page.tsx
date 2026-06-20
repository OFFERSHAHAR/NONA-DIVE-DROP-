'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, Trash2, Flag, CheckCircle } from 'lucide-react';

interface FeedbackDetail {
  id: string;
  diver_id: string;
  diver_name?: string;
  diver_email?: string;
  dive_site_id: string;
  site_name?: string;
  visibility_meters: number;
  temperature_celsius: number;
  current_strength: number;
  marine_life: string[];
  marine_life_custom?: string;
  notes?: string;
  image_urls: string[];
  submitted_at: string;
  created_at: string;
  status?: string;
  dive_booking_id?: string;
}

export default function FeedbackDetailPage() {
  const params = useParams();
  const feedbackId = params.id as string;

  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/feedback/${feedbackId}`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Unauthorized: Admin access required');
          }
          if (response.status === 404) {
            throw new Error('Feedback not found');
          }
          throw new Error('Failed to fetch feedback');
        }

        const data = await response.json();
        setFeedback(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Feedback fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (feedbackId) {
      fetchFeedback();
    }
  }, [feedbackId]);

  const handleAction = async (
    action: 'approve' | 'flag' | 'delete',
    reason?: string
  ) => {
    setActionLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const endpoint = `/api/admin/feedback/${feedbackId}/${action}`;
      const body = action === 'flag' ? { reason } : undefined;

      const response = await fetch(endpoint, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to ${action} feedback`
        );
      }

      setSuccess(`Feedback ${action}d successfully`);

      if (action === 'delete') {
        setTimeout(() => {
          window.location.href = '/admin/feedback';
        }, 1500);
      } else {
        // Refresh feedback
        const refreshResponse = await fetch(`/api/admin/feedback/${feedbackId}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setFeedback(data.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error && !feedback) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-red-800 dark:text-red-400 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold mb-1">Error</h2>
          <p>{error}</p>
          <a
            href="/admin/feedback"
            className="text-red-600 dark:text-red-400 hover:underline text-sm mt-3 inline-block"
          >
            Back to Feedback List
          </a>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            Feedback Details
          </h1>
          <a
            href="/admin/feedback"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to Feedback List
          </a>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            ID: {feedback.id.slice(0, 8)}...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            {new Date(feedback.submitted_at).toLocaleDateString()} at{' '}
            {new Date(feedback.submitted_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-400 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Diver Information Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Diver Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Name</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {feedback.diver_name || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Email</span>
                <span className="font-medium text-slate-900 dark:text-white text-sm break-all">
                  {feedback.diver_email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Diver ID</span>
                <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                  {feedback.diver_id.slice(0, 8)}...
                </span>
              </div>
            </div>
            <a
              href={`/admin/users/${feedback.diver_id}`}
              className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              View Diver Profile →
            </a>
          </div>

          {/* Dive Site Information Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Dive Site Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Site Name</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {feedback.site_name || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Site ID</span>
                <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                  {feedback.dive_site_id.slice(0, 8)}...
                </span>
              </div>
            </div>
            <a
              href={`/admin/dive-sites/${feedback.dive_site_id}`}
              className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              View Site Details →
            </a>
          </div>

          {/* Dive Conditions Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Dive Conditions
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Visibility
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {feedback.visibility_meters}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">meters</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Temperature
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {feedback.temperature_celsius}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">celsius</p>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Current
                </p>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
                  {feedback.current_strength.toFixed(1)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">strength</p>
              </div>
            </div>
          </div>

          {/* Marine Life Card */}
          {feedback.marine_life && feedback.marine_life.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Marine Life Observations
              </h2>
              <div className="flex flex-wrap gap-2">
                {feedback.marine_life.map((species, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm"
                  >
                    {species}
                  </span>
                ))}
              </div>
              {feedback.marine_life_custom && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Custom Notes
                  </p>
                  <p className="text-slate-900 dark:text-white">{feedback.marine_life_custom}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes Card */}
          {feedback.notes && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Diver Notes
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {feedback.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Actions & Images */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Actions
            </h2>

            <button
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </>
              )}
            </button>

            <button
              onClick={() => {
                const reason = prompt('Reason for flagging (optional):');
                if (reason !== null) {
                  handleAction('flag', reason || undefined);
                }
              }}
              disabled={actionLoading}
              className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  Flag for Review
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')
                ) {
                  handleAction('delete');
                }
              }}
              disabled={actionLoading}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>

          {/* Images Card */}
          {feedback.image_urls && feedback.image_urls.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Images ({feedback.image_urls.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedback.image_urls.map((imageUrl, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`Feedback image ${idx + 1}`}
                      className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        window.open(imageUrl, '_blank');
                      }}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-700">
                      Image {idx + 1}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Card */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Metadata
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-slate-600 dark:text-slate-400">Submitted</p>
                <p className="text-slate-900 dark:text-white font-mono">
                  {new Date(feedback.submitted_at).toISOString()}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Created</p>
                <p className="text-slate-900 dark:text-white font-mono">
                  {new Date(feedback.created_at).toISOString()}
                </p>
              </div>
              {feedback.dive_booking_id && (
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Booking ID</p>
                  <p className="text-slate-900 dark:text-white font-mono">
                    {feedback.dive_booking_id.slice(0, 8)}...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
