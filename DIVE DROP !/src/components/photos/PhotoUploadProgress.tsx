'use client';

export interface PhotoUploadProgressProps {
  progress: number;
  isVisible: boolean;
}

export function PhotoUploadProgress({
  progress,
  isVisible,
}: PhotoUploadProgressProps) {
  if (!isVisible) return null;

  const isComplete = progress >= 100;
  const isStarted = progress > 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900">Uploading Photo</h4>
          <p className="text-sm text-gray-500 mt-1">{Math.round(progress)}%</p>
        </div>
        {isComplete && <span className="text-xl">✅</span>}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isComplete ? 'bg-green-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isComplete && (
        <p className="text-sm text-green-600 mt-2 font-medium">Upload complete!</p>
      )}
    </div>
  );
}
