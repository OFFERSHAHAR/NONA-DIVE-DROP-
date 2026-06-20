/**
 * Shuttle Tracker Component
 * Real-time map display for divers tracking their shuttle
 */

"use client";

import React, { useEffect, useState } from "react";
import { useDiverTracking } from "@/hooks/useShuttleTracking";
import type { ShuttleTrip, ShuttlePassenger } from "@/types/shuttle";

interface ShuttleTrackerProps {
  tripId: string;
  userLatitude: number;
  userLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  onStatusChange?: (trip: ShuttleTrip) => void;
}

export function ShuttleTracker({
  tripId,
  userLatitude,
  userLongitude,
  dropoffLatitude,
  dropoffLongitude,
  onStatusChange,
}: ShuttleTrackerProps) {
  const { trip, passengers, distance, eta, status, error } = useDiverTracking({
    tripId,
    userLat: userLatitude,
    userLon: userLongitude,
    dropoffLat: dropoffLatitude,
    dropoffLon: dropoffLongitude,
    enabled: true,
  });

  const [mapUrl, setMapUrl] = useState<string>("");

  // Generate Google Maps embed URL when shuttle location is available
  useEffect(() => {
    if (!trip?.current_latitude || !trip?.current_longitude) return;

    const params = new URLSearchParams({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
      center: `${trip.current_latitude},${trip.current_longitude}`,
      zoom: "15",
      markers: `color:red|${trip.current_latitude},${trip.current_longitude}|label:S`,
    });

    setMapUrl(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
  }, [trip?.current_latitude, trip?.current_longitude]);

  // Notify parent when trip status changes
  useEffect(() => {
    if (trip && onStatusChange) {
      onStatusChange(trip);
    }
  }, [trip, onStatusChange]);

  if (status === "loading") {
    return <div className="p-4 text-center">Loading shuttle information...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        Error: {error.message}
      </div>
    );
  }

  if (!trip) {
    return <div className="p-4 text-center">No trip data available</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_route":
        return "text-blue-600 bg-blue-50";
      case "arrived":
        return "text-green-600 bg-green-50";
      case "completed":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Status Badge */}
      <div className={`p-3 rounded-lg mb-4 font-medium ${getStatusColor(trip.status)}`}>
        Shuttle Status: {trip.status.replace("_", " ").toUpperCase()}
      </div>

      {/* Map */}
      {mapUrl && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-200">
          <img
            src={mapUrl}
            alt="Shuttle Location"
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Location Info */}
      {trip.current_latitude && trip.current_longitude && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="text-sm text-gray-600">Current Location</div>
          <div className="font-mono text-sm">
            {trip.current_latitude.toFixed(6)}, {trip.current_longitude.toFixed(6)}
          </div>
          {trip.accuracy && (
            <div className="text-xs text-gray-500 mt-1">
              Accuracy: ±{trip.accuracy.toFixed(0)}m
            </div>
          )}
        </div>
      )}

      {/* Distance & ETA */}
      {distance && eta && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600">Distance</div>
            <div className="text-2xl font-bold text-blue-900">
              {distance.distance_km.toFixed(1)}
            </div>
            <div className="text-xs text-blue-600">km away</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600">ETA</div>
            <div className="text-2xl font-bold text-green-900">
              {eta.eta_minutes}
            </div>
            <div className="text-xs text-green-600">minutes</div>
          </div>
        </div>
      )}

      {/* Trip Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">Pickup Location</div>
            <div className="font-medium">{trip.pickup_location}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Dropoff Location</div>
            <div className="font-medium">{trip.dropoff_location}</div>
          </div>
          {trip.started_at && (
            <div>
              <div className="text-sm text-gray-600">Started</div>
              <div className="font-medium">
                {new Date(trip.started_at).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Passengers */}
      {passengers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-medium mb-3">
            Passengers ({passengers.length})
          </div>
          <div className="space-y-2">
            {passengers.map((passenger) => (
              <div
                key={passenger.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <div className="text-sm font-medium">
                    {passenger.pickup_location}
                  </div>
                  <div className="text-xs text-gray-500">
                    → {passenger.dropoff_location}
                  </div>
                </div>
                <div
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    passenger.status === "picked_up"
                      ? "bg-green-100 text-green-700"
                      : passenger.status === "dropped_off"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {passenger.status.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Full Page Shuttle Tracking View
 */
export function ShuttleTrackingPage({ tripId }: { tripId: string }) {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get user's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  if (!userLocation) {
    return (
      <div className="p-4 text-center">
        Getting your location...
      </div>
    );
  }

  // Example dropoff coordinates (these would come from actual data)
  const dropoffLat = 20.8;
  const dropoffLon = -87.0;

  return (
    <ShuttleTracker
      tripId={tripId}
      userLatitude={userLocation.latitude}
      userLongitude={userLocation.longitude}
      dropoffLatitude={dropoffLat}
      dropoffLongitude={dropoffLon}
    />
  );
}
