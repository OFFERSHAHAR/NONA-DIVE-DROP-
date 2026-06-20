'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PhotoModerationCardProps {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  userName: string;
  userEmail: string;
  diveSite?: { id: string; name: string };
  instructor?: { id: string; username: string };
  uploadedAt: string;
  qualityScore?: number;
  onApprove: () => Promise<void>;
  onReject: (reason: string, notes?: string) => Promise<void>;
  isLoading?: boolean;
}

export function PhotoModerationCard({
  id,
  fileUrl,
  thumbnailUrl,
  title,
  description,
  userName,
  userEmail,
  diveSite,
  instructor,
  uploadedAt,
  qualityScore,
  onApprove,
  onReject,
  isLoading = false,
}: PhotoModerationCardProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');

  const handleRejectSubmit = async () => {
    if (!rejectionReason) {
      alert('Please select a rejection reason');
      return;
    }

    try {
      await onReject(rejectionReason, rejectionNotes);
      setIsRejecting(false);
      setRejectionReason('');
      setRejectionNotes('');
    } catch (error) {
      alert('Failed to reject photo');
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Container */}
      <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-700">
        <Image
          src={fileUrl}
          alt={title || 'Photo for moderation'}
          fill
          className="object-cover"
          priority={false}
        />
        {qualityScore !== undefined && (
          <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            Quality: {qualityScore}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Description */}
        {title && (
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* User Info */}
        <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {userName}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {userEmail}
          </p>
        </div>

        {/* Related Info */}
        <div className="space-y-1 mb-3 text-xs text-slate-600 dark:text-slate-400">
          {diveSite && (
            <p>
              <span className="font-medium">Dive Site:</span> {diveSite.name}
            </p>
          )}
          {instructor && (
            <p>
              <span className="font-medium">Instructor:</span>{' '}
              {instructor.username}
            </p>
          )}
          <p>
            <span className="font-medium">Uploaded:</span>{' '}
            {new Date(uploadedAt).toLocaleString()}
          </p>
        </div>

        {/* Action Buttons */}
        {!isRejecting ? (
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-3 rounded transition-colors text-sm"
            >
              {isLoading ? 'Processing...' : '✓ Approve'}
            </button>
            <button
              onClick={() => setIsRejecting(true)}
              disabled={isLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-3 rounded transition-colors text-sm"
            >
              ✗ Reject
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-900 dark:text-white">
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

            <label className="block text-xs font-medium text-slate-900 dark:text-white">
              Additional Notes
            </label>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="Optional: Add specific feedback for the user..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              rows={2}
            />

            <div className="flex gap-2">
              <button
                onClick={handleRejectSubmit}
                disabled={isLoading || !rejectionReason}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-3 rounded transition-colors text-sm"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setIsRejecting(false);
                  setRejectionReason('');
                  setRejectionNotes('');
                }}
                disabled={isLoading}
                className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium py-2 px-3 rounded transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
