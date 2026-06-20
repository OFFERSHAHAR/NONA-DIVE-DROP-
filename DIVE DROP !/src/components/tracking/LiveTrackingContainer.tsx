'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { TrackingMap } from './TrackingMap';
import { ShuttleInfoCard } from './ShuttleInfoCard';
import { NotificationCenter } from './NotificationCenter';
import { useTrackingMap } from '@/hooks/useTrackingMap';
import { useNotifications } from '@/hooks/useNotifications';

interface LiveTrackingContainerProps {
  tripId: string;
  className?: string;
}

export function LiveTrackingContainer({ tripId, className = '' }: LiveTrackingContainerProps) {
  const t = useTranslations('tracking');
  const [mapReady, setMapReady] = useState(false);

  const {
    trip,
    shuttle,
    userLocation,
    shuttleLocation,
    distance,
    etaMinutes,
    isLoading,
    error,
  } = useTrackingMap({
    tripId,
    updateInterval: 3000,
    onError: (err) => {
      console.error('Tracking error:', err);
    },
  });

  const { notifications, clearNotification } = useNotifications({
    tripId,
    shuttleDistance: distance,
    etaMinutes,
    enabled: !isLoading && shuttle !== null,
  });

  const mapCenterToUserRef = useRef<() => void>(() => {});
  const mapZoomInRef = useRef<() => void>(() => {});
  const mapZoomOutRef = useRef<() => void>(() => {});

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    console.log('Trip status changed:', status);
  }, []);

  const handleCenterToUser = useCallback(() => {
    mapCenterToUserRef.current?.();
  }, []);

  const handleZoomIn = useCallback(() => {
    mapZoomInRef.current?.();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapZoomOutRef.current?.();
  }, []);

  if (error && !trip) {
    return (
      <div className={`flex items-center justify-center min-h-screen bg-gray-100 p-4 ${className}`}>
        <div className="bg-white rounded-lg p-6 max-w-sm text-center">
          <svg
            className="w-16 h-16 mx-auto text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{t('error_loading')}</h2>
          <p className="text-gray-600 text-sm">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-gray-100 flex flex-col ${className}`}>
      {/* Map Container - Full Screen */}
      <div className="flex-1 relative overflow-hidden">
        <TrackingMap
          userLocation={userLocation}
          shuttleLocation={shuttleLocation}
          routePoints={[]}
          className="h-full w-full"
          onMapReady={handleMapReady}
          onCenterToUser={(fn) => { mapCenterToUserRef.current = fn; }}
          onZoomIn={(fn) => { mapZoomInRef.current = fn; }}
          onZoomOut={(fn) => { mapZoomOutRef.current = fn; }}
        />

        {/* Loading Overlay */}
        {isLoading && mapReady && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 space-y-3">
              <div className="flex justify-center">
                <div className="animate-spin">
                  <svg
                    className="w-8 h-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-gray-600 text-center text-sm">{t('loading_location')}</p>
            </div>
          </div>
        )}

        {/* Map Status Indicator */}
        {mapReady && (
          <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 text-sm z-30">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-700 font-medium">{t('live')}</span>
          </div>
        )}

        {/* Map Controls - Top Right */}
        {mapReady && userLocation && (
          <div className="absolute bottom-32 right-4 flex flex-col gap-2 z-30">
            <button
              onClick={handleCenterToUser}
              className="bg-white rounded-lg p-3 shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
              title={t('center_map')}
              aria-label={t('center_map')}
            >
              <svg
                className="w-5 h-5 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-5a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <button
              onClick={handleZoomIn}
              className="bg-white rounded-lg p-3 shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
              title={t('zoom_in')}
              aria-label={t('zoom_in')}
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6H6"
                />
              </svg>
            </button>

            <button
              onClick={handleZoomOut}
              className="bg-white rounded-lg p-3 shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
              title={t('zoom_out')}
              aria-label={t('zoom_out')}
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sheet - Shuttle Info */}
      <div className="h-auto max-h-1/2 bg-white rounded-t-2xl shadow-2xl overflow-y-auto">
        <ShuttleInfoCard
          shuttle={shuttle}
          trip={trip}
          distance={distance}
          etaMinutes={etaMinutes}
          isLoading={isLoading}
        />
      </div>

      {/* Notifications */}
      <NotificationCenter
        notifications={notifications}
        onDismiss={clearNotification}
      />
    </div>
  );
}
