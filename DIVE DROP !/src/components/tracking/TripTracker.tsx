'use client';

import React, { useEffect } from 'react';
import { usePassengerTracking } from '@/hooks/useLocationTracking';
import { LiveMap } from './LiveMap';

interface TripTrackerProps {
  tripId: string;
  token: string;
  pollingInterval?: number;
}

/**
 * Trip Tracker Component
 * Shows passenger the live location of their shuttle with ETA
 */
export function TripTracker({
  tripId,
  token,
  pollingInterval = 3000,
}: TripTrackerProps) {
  const tracking = usePassengerTracking({
    tripId,
    token,
    interval: pollingInterval,
  });

  useEffect(() => {
    tracking.startTracking();
    return () => tracking.stopTracking();
  }, [tripId, token]);

  if (tracking.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (tracking.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-semibold">Error tracking trip</p>
        <p className="text-red-600">{tracking.error}</p>
      </div>
    );
  }

  if (!tracking.tripDetails) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-700">Trip details not available</p>
      </div>
    );
  }

  const details = tracking.tripDetails;
  const isInProgress = ['in_progress', 'arrived_at_pickup', 'picked_up'].includes(
    details.status
  );

  return (
    <div className="space-y-4">
      {/* Map */}
      <LiveMap tripDetails={details} isLoading={tracking.isLoading} />

      {/* ETA and Distance */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-sm">Estimated Time</p>
            <p className="text-2xl font-bold text-blue-600">{details.eta_formatted}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Distance</p>
            <p className="text-2xl font-bold text-blue-600">{details.distance_formatted}</p>
          </div>
        </div>
      </div>

      {/* Driver Info */}
      {details.driver_info && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm mb-2">Driver</p>
          <div className="flex items-center gap-3">
            {details.driver_info.avatar_url && (
              <img
                src={details.driver_info.avatar_url}
                alt={details.driver_info.name}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-semibold">{details.driver_info.name}</p>
              <p className="text-sm text-gray-600">{details.driver_info.vehicle_name}</p>
              {details.driver_info.vehicle_plate && (
                <p className="text-xs text-gray-500">{details.driver_info.vehicle_plate}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-gray-500 text-sm mb-2">Trip Status</p>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${isInProgress ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
          />
          <p className="font-semibold capitalize">{details.status.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Last Update */}
      <p className="text-xs text-gray-500 text-center">
        Last update: {new Date(details.last_update).toLocaleTimeString()}
      </p>
    </div>
  );
}
