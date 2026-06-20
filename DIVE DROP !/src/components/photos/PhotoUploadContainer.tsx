'use client';

import { useState, useEffect } from 'react';
import { PhotoUploadForm } from './PhotoUploadForm';
import { PhotoUploadProgress } from './PhotoUploadProgress';
import { PhotoPreview, type PhotoData } from './PhotoPreview';

export interface PhotoUploadContainerProps {
  diveSiteId?: string;
  freeDivingId?: string;
  instructorId?: string;
  onPhotoUploaded?: (photo: any) => void;
}

export function PhotoUploadContainer({
  diveSiteId,
  freeDivingId,
  instructorId,
  onPhotoUploaded,
}: PhotoUploadContainerProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load photos when component mounts or when IDs change
  useEffect(() => {
    if (diveSiteId) {
      loadDiveSitePhotos();
    } else if (freeDivingId) {
      loadFreeDivingPhotos();
    } else if (instructorId) {
      loadInstructorPhotos();
    }
  }, [diveSiteId, freeDivingId, instructorId]);

  // Hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Hide error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const loadDiveSitePhotos = async () => {
    if (!diveSiteId) return;

    setIsLoadingPhotos(true);
    try {
      const response = await fetch(
        `/api/photos/site/${diveSiteId}?limit=12&offset=0`
      );
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const loadFreeDivingPhotos = async () => {
    if (!freeDivingId) return;

    setIsLoadingPhotos(true);
    try {
      const response = await fetch(
        `/api/photos/free-diving/${freeDivingId}?limit=12&offset=0`
      );
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const loadInstructorPhotos = async () => {
    if (!instructorId) return;

    setIsLoadingPhotos(true);
    try {
      const response = await fetch(
        `/api/photos/instructor/${instructorId}?limit=12&offset=0`
      );
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handleUploadStart = () => {
    setShowProgress(true);
    setUploadProgress(0);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleUploadProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  const handleUploadComplete = async (result: any) => {
    setSuccessMessage('✅ Photo uploaded successfully! Awaiting approval...');

    // Reload photos
    if (diveSiteId) {
      await loadDiveSitePhotos();
    } else if (freeDivingId) {
      await loadFreeDivingPhotos();
    } else if (instructorId) {
      await loadInstructorPhotos();
    }

    onPhotoUploaded?.(result.photo);

    // Hide progress bar after 2 seconds
    setTimeout(() => setShowProgress(false), 2000);
  };

  const handleUploadError = (error: string) => {
    setErrorMessage(`❌ Upload failed: ${error}`);
    setShowProgress(false);
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMessage('✅ Photo deleted successfully');
        setPhotos(photos.filter(p => p.id !== photoId));
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete photo');
      }
    } catch (error: any) {
      setErrorMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleRatePhoto = async (photoId: string, rating: number) => {
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rate', rating }),
      });

      if (response.ok) {
        // Update local photos with new rating
        setPhotos(
          photos.map(p =>
            p.id === photoId
              ? {
                  ...p,
                  rating: rating,
                  rating_count: (p.rating_count || 0) + 1,
                }
              : p
          )
        );
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rate photo');
      }
    } catch (error: any) {
      setErrorMessage(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Upload Form */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📸 Upload Photo</h3>
        <PhotoUploadForm
          diveSiteId={diveSiteId}
          freeDivingId={freeDivingId}
          instructorId={instructorId}
          onUploadStart={handleUploadStart}
          onUploadProgress={handleUploadProgress}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />
      </div>

      {/* Upload Progress */}
      <PhotoUploadProgress progress={uploadProgress} isVisible={showProgress} />

      {/* Photos Gallery */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📷 Photos ({photos.length})
        </h3>
        <PhotoPreview
          photos={photos}
          isLoading={isLoadingPhotos}
          onDelete={handleDeletePhoto}
          onRate={handleRatePhoto}
          showActions={true}
        />
      </div>
    </div>
  );
}
