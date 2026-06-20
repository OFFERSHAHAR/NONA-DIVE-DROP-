'use client';

import { useState, useRef } from 'react';
import { validatePhotoFile } from '@/lib/photos/upload';

export interface PhotoUploadFormProps {
  onUploadStart: () => void;
  onUploadProgress: (progress: number) => void;
  onUploadComplete: (result: any) => void;
  onUploadError: (error: string) => void;
  diveSiteId?: string;
  freeDivingId?: string;
  instructorId?: string;
  isLoading?: boolean;
}

export function PhotoUploadForm({
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  diveSiteId,
  freeDivingId,
  instructorId,
  isLoading = false,
}: PhotoUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const validation = validatePhotoFile(file);

    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (!diveSiteId && !freeDivingId && !instructorId) {
      setError('Missing required location information');
      return;
    }

    setUploading(true);
    setError(null);
    onUploadStart();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption);
      formData.append('description', description);
      formData.append('visibility', visibility);
      if (tags) formData.append('tags', tags);
      if (diveSiteId) formData.append('dive_site_id', diveSiteId);
      if (freeDivingId) formData.append('free_diving_id', freeDivingId);
      if (instructorId) formData.append('instructor_id', instructorId);

      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 30, 90);
        onUploadProgress(progress);
      }, 200);

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      onUploadProgress(100);

      // Reset form
      setSelectedFile(null);
      setCaption('');
      setDescription('');
      setVisibility('public');
      setTags('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      onUploadError(errorMessage);
      onUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow-md">
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
          Select Photo
        </label>
        <div className="relative">
          <input
            ref={fileInputRef}
            id="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading || isLoading}
            className="hidden"
          />
          <label
            htmlFor="file"
            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedFile ? (
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">{selectedFile.name}</div>
                <div className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600">📷 Click to select photo</div>
                <div className="text-xs text-gray-500">JPG, PNG, or WebP (max 5MB)</div>
              </div>
            )}
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
          Caption (optional)
        </label>
        <input
          id="caption"
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a short caption"
          disabled={uploading || isLoading}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:opacity-50"
        />
        <div className="text-xs text-gray-500 mt-1">{caption.length}/100</div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details about this photo"
          disabled={uploading || isLoading}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:opacity-50 resize-none"
        />
        <div className="text-xs text-gray-500 mt-1">{description.length}/500</div>
      </div>

      <div>
        <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
          Visibility
        </label>
        <select
          id="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          disabled={uploading || isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:opacity-50"
        >
          <option value="public">🌐 Public</option>
          <option value="friends_only">👥 Friends Only</option>
          <option value="private">🔒 Private</option>
        </select>
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags (optional, comma-separated)
        </label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., coral, fish, sunset"
          disabled={uploading || isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">❌ {error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedFile || uploading || isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploading ? '⏳ Uploading...' : '📤 Upload Photo'}
      </button>
    </form>
  );
}
