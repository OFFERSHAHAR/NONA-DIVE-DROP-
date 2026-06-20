import { useState, useCallback } from 'react';

interface Photo {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  quality_score?: number;
  uploaded_at: string;
}

interface PaginationState {
  offset: number;
  limit: number;
  total: number;
}

interface Filters {
  diveSite: string;
  instructor: string;
  search: string;
}

export function usePhotoModeration() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    offset: 0,
    limit: 12,
    total: 0,
  });
  const [filters, setFilters] = useState<Filters>({
    diveSite: '',
    instructor: '',
    search: '',
  });

  const fetchPhotos = useCallback(
    async (tab: 'pending' | 'approved' | 'rejected') => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: pagination.limit.toString(),
          offset: pagination.offset.toString(),
          ...(filters.diveSite && { dive_site_id: filters.diveSite }),
          ...(filters.instructor && { instructor_id: filters.instructor }),
          ...(filters.search && { search: filters.search }),
        });

        const response = await fetch(`/api/admin/photos/${tab}?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }

        const data = await response.json();
        setPhotos(data.photos || []);
        setPagination((prev) => ({ ...prev, total: data.total || 0 }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.offset, filters]
  );

  const approvePhoto = useCallback(async (photoId: string) => {
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to approve photo');
      }

      // Remove photo from current list
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return false;
    }
  }, []);

  const rejectPhoto = useCallback(
    async (photoId: string, reason: string, notes?: string) => {
      try {
        const response = await fetch(`/api/admin/photos/${photoId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, rejection_notes: notes }),
        });

        if (!response.ok) {
          throw new Error('Failed to reject photo');
        }

        // Remove photo from current list
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        return false;
      }
    },
    []
  );

  const bulkApprove = useCallback(async (photoIds: string[]) => {
    try {
      const response = await fetch('/api/admin/photos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          photoIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve photos');
      }

      const data = await response.json();

      // Remove approved photos from list
      setPhotos((prev) =>
        prev.filter((p) => !photoIds.includes(p.id))
      );

      return {
        success: true,
        processedCount: data.processedCount,
        totalCount: data.totalCount,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return { success: false, processedCount: 0, totalCount: photoIds.length };
    }
  }, []);

  const bulkReject = useCallback(
    async (photoIds: string[], reason: string, notes?: string) => {
      try {
        const response = await fetch('/api/admin/photos/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            photoIds,
            reason,
            rejection_notes: notes,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to reject photos');
        }

        const data = await response.json();

        // Remove rejected photos from list
        setPhotos((prev) =>
          prev.filter((p) => !photoIds.includes(p.id))
        );

        return {
          success: true,
          processedCount: data.processedCount,
          totalCount: data.totalCount,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        return { success: false, processedCount: 0, totalCount: photoIds.length };
      }
    },
    []
  );

  return {
    photos,
    loading,
    error,
    pagination,
    filters,
    setPagination,
    setFilters,
    fetchPhotos,
    approvePhoto,
    rejectPhoto,
    bulkApprove,
    bulkReject,
  };
}
