'use client';

import { useEffect, useState } from 'react';
import { PhotoModerationCard } from './PhotoModerationCard';
import { BulkApprovalPanel } from './BulkApprovalPanel';

interface Photo {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  quality_score?: number;
  uploaded_at: string;
  profiles: { id: string; username: string; email: string };
  dive_sites?: { id: string; name: string } | null;
  instructors?: { id: string; username: string } | null;
}

interface DashboardProps {
  initialTab?: 'pending' | 'approved' | 'rejected';
}

export function PhotoModeratorDashboard({ initialTab = 'pending' }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>(
    initialTab
  );
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    diveSite: '',
    instructor: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 12,
    total: 0,
  });

  // Fetch photos
  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        ...(filters.diveSite && { dive_site_id: filters.diveSite }),
        ...(filters.instructor && { instructor_id: filters.instructor }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(
        `/api/admin/photos/${activeTab}?${params}`
      );
      const data = await response.json();

      setPhotos(data.photos || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setSelectedPhotos(new Set());
  }, [activeTab, filters]);

  useEffect(() => {
    fetchPhotos();
  }, [activeTab, pagination.offset, pagination.limit, filters]);

  // Handle approve
  const handleApprove = async (photoId: string) => {
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to approve');

      // Refresh list
      await fetchPhotos();
    } catch (error) {
      alert('Failed to approve photo');
    }
  };

  // Handle reject
  const handleReject = async (
    photoId: string,
    reason: string,
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, rejection_notes: notes }),
      });

      if (!response.ok) throw new Error('Failed to reject');

      // Refresh list
      await fetchPhotos();
    } catch (error) {
      alert('Failed to reject photo');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (
    action: 'approve' | 'reject',
    reason?: string,
    notes?: string
  ) => {
    const photoIds = Array.from(selectedPhotos);
    if (photoIds.length === 0) {
      alert('Select at least one photo');
      return;
    }

    try {
      const response = await fetch('/api/admin/photos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          photoIds,
          ...(action === 'reject' && { reason, rejection_notes: notes }),
        }),
      });

      if (!response.ok) throw new Error('Failed to process bulk action');

      setSelectedPhotos(new Set());
      await fetchPhotos();
    } catch (error) {
      alert('Failed to process bulk action');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Photo Moderation
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Review and moderate uploaded photos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {(['pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search by user..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
          <input
            type="text"
            placeholder="Filter by dive site ID..."
            value={filters.diveSite}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, diveSite: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
          <input
            type="text"
            placeholder="Filter by instructor ID..."
            value={filters.instructor}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, instructor: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPhotos.size > 0 && activeTab === 'pending' && (
        <BulkApprovalPanel
          selectedCount={selectedPhotos.size}
          onApproveAll={() => handleBulkAction('approve')}
          onRejectAll={(reason, notes) =>
            handleBulkAction('reject', reason, notes)
          }
        />
      )}

      {/* Photos Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400">
            No {activeTab} photos found
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative ${
                  activeTab === 'pending'
                    ? 'cursor-pointer'
                    : ''
                }`}
              >
                {activeTab === 'pending' && (
                  <input
                    type="checkbox"
                    checked={selectedPhotos.has(photo.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedPhotos);
                      if (e.target.checked) {
                        newSet.add(photo.id);
                      } else {
                        newSet.delete(photo.id);
                      }
                      setSelectedPhotos(newSet);
                    }}
                    className="absolute top-3 left-3 w-5 h-5 z-10 cursor-pointer"
                  />
                )}
                <PhotoModerationCard
                  id={photo.id}
                  fileUrl={photo.file_url}
                  thumbnailUrl={photo.thumbnail_url}
                  title={photo.title}
                  description={photo.description}
                  userName={photo.profiles?.username || 'Unknown'}
                  userEmail={photo.profiles?.email || ''}
                  diveSite={photo.dive_sites || undefined}
                  instructor={photo.instructors || undefined}
                  uploadedAt={photo.uploaded_at}
                  qualityScore={photo.quality_score}
                  onApprove={() => handleApprove(photo.id)}
                  onReject={(reason, notes) =>
                    handleReject(photo.id, reason, notes)
                  }
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    offset: Math.max(0, prev.offset - prev.limit),
                  }))
                }
                disabled={currentPage === 1}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded disabled:opacity-50 text-slate-900 dark:text-white"
              >
                Previous
              </button>
              <span className="text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    offset: prev.offset + prev.limit,
                  }))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded disabled:opacity-50 text-slate-900 dark:text-white"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
