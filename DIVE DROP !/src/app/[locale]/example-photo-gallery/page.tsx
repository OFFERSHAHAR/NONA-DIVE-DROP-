'use client';

import { PhotoUploadContainer } from '@/components/photos/PhotoUploadContainer';

/**
 * Example page showing how to use the Photo Upload System
 *
 * Navigate to: http://localhost:3000/example-photo-gallery
 *
 * This demonstrates:
 * - PhotoUploadContainer integration
 * - File upload with progress tracking
 * - Photo gallery with ratings and deletion
 * - Error/success message handling
 */

export default function ExamplePhotoGalleryPage() {
  // Example dive site ID - replace with actual ID for testing
  const exampleDiveSiteId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📸 Photo Upload System Demo
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            This page demonstrates the full Photo Upload System for DIVE DROP. You can:
          </p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-2xl">📤</span>
              <span>Upload photos with caption, description, and tags</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <span>Rate photos from 0 to 5 stars</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-2xl">🗑️</span>
              <span>Delete your own photos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <span>Set visibility (Public, Private, Friends Only)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-2xl">🏷️</span>
              <span>Organize photos with tags</span>
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">
              Upload Photos for Dive Site
            </h2>
            <p className="text-blue-100 mt-2">
              Demo Site ID: {exampleDiveSiteId}
            </p>
          </div>

          <div className="p-8">
            <PhotoUploadContainer
              diveSiteId={exampleDiveSiteId}
              onPhotoUploaded={(photo) => {
                console.log('Photo uploaded:', photo);
              }}
            />
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Features */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Features</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>✅ File validation (max 5MB, JPEG/PNG/WebP)</li>
              <li>✅ Real-time upload progress</li>
              <li>✅ Photo metadata (caption, description, tags)</li>
              <li>✅ Community ratings system</li>
              <li>✅ Visibility controls (public/private/friends)</li>
              <li>✅ Responsive grid layout</li>
              <li>✅ Auto-approval for verified instructors</li>
              <li>✅ Row-level security (RLS)</li>
            </ul>
          </div>

          {/* Integration Guide */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Quick Integration
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Copy this code to add photos to any page:
            </p>
            <code className="bg-gray-100 p-4 rounded text-xs overflow-auto block text-gray-800">
{`import { PhotoUploadContainer } from '@/components/photos/PhotoUploadContainer';

export default function MyPage() {
  return (
    <PhotoUploadContainer
      diveSiteId="site-id"
      onPhotoUploaded={(photo) => {
        console.log('Photo:', photo);
      }}
    />
  );
}`}
            </code>
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">API Endpoints</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-600 pl-4">
              <code className="text-sm font-mono text-gray-800">POST /api/photos/upload</code>
              <p className="text-sm text-gray-600 mt-1">Upload a new photo</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <code className="text-sm font-mono text-gray-800">GET /api/photos/site/[id]</code>
              <p className="text-sm text-gray-600 mt-1">Get photos for a dive site</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <code className="text-sm font-mono text-gray-800">GET /api/photos/free-diving/[id]</code>
              <p className="text-sm text-gray-600 mt-1">Get photos for a free diving listing</p>
            </div>
            <div className="border-l-4 border-indigo-600 pl-4">
              <code className="text-sm font-mono text-gray-800">GET /api/photos/instructor/[id]</code>
              <p className="text-sm text-gray-600 mt-1">Get instructor profile photos</p>
            </div>
            <div className="border-l-4 border-red-600 pl-4">
              <code className="text-sm font-mono text-gray-800">DELETE /api/photos/[id]</code>
              <p className="text-sm text-gray-600 mt-1">Delete a photo</p>
            </div>
            <div className="border-l-4 border-yellow-600 pl-4">
              <code className="text-sm font-mono text-gray-800">POST /api/photos/[id]</code>
              <p className="text-sm text-gray-600 mt-1">Rate or update a photo</p>
            </div>
          </div>
        </div>

        {/* File Information */}
        <div className="mt-12 bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📁 System Files</h3>
          <div className="space-y-2 text-sm text-gray-700 font-mono">
            <div>📦 Database: <span className="text-gray-600">supabase/migrations/20260626_create_user_photos_table.sql</span></div>
            <div>🔧 Utils: <span className="text-gray-600">src/lib/photos/upload.ts</span></div>
            <div>🔐 Schemas: <span className="text-gray-600">src/lib/photos/schemas.ts</span></div>
            <div>⚙️ Config: <span className="text-gray-600">src/lib/photos/config.ts</span></div>
            <div>📤 Upload API: <span className="text-gray-600">src/app/api/photos/upload/route.ts</span></div>
            <div>🖼️ Components: <span className="text-gray-600">src/components/photos/</span></div>
            <div>📚 Docs: <span className="text-gray-600">src/components/photos/README.md</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>Photo Upload System v1.0 - Ready for Production</p>
          <p className="mt-2">For more info, see: src/components/photos/README.md</p>
        </div>
      </div>
    </div>
  );
}
