'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Shuttle, DiveTrip } from '@/types/tracking';

interface ShuttleInfoCardProps {
  shuttle: Shuttle | null;
  trip: DiveTrip | null;
  distance: number;
  etaMinutes: number;
  isLoading?: boolean;
}

export function ShuttleInfoCard({
  shuttle,
  trip,
  distance,
  etaMinutes,
  isLoading = false,
}: ShuttleInfoCardProps) {
  const t = useTranslations('tracking');

  if (isLoading) {
    return (
      <div className="bg-white rounded-t-2xl p-4 space-y-4 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg" />
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shuttle || !trip) {
    return (
      <div className="bg-white rounded-t-2xl p-4 shadow-lg">
        <p className="text-gray-500 text-center">{t('no_shuttle_assigned')}</p>
      </div>
    );
  }

  const statusColor =
    {
      pending: 'bg-gray-100 text-gray-800',
      driver_assigned: 'bg-blue-100 text-blue-800',
      driver_en_route: 'bg-green-100 text-green-800',
      driver_arrived: 'bg-emerald-100 text-emerald-800',
      en_route_to_site: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
    }[trip.status] || 'bg-gray-100 text-gray-800';

  const statusLabel = {
    pending: t('status.pending'),
    driver_assigned: t('status.assigned'),
    driver_en_route: t('status.en_route'),
    driver_arrived: t('status.arrived'),
    en_route_to_site: t('status.to_site'),
    completed: t('status.completed'),
  };

  const isArrived = distance < 50;

  return (
    <div className="bg-white rounded-t-2xl shadow-lg overflow-hidden">
      {/* Status Bar */}
      <div className={`${statusColor} px-4 py-2 text-center font-semibold text-sm`}>
        {statusLabel[trip.status]}
      </div>

      <div className="p-4 space-y-4">
        {/* Driver Info */}
        <div className="flex gap-3">
          {shuttle.driver.avatar_url ? (
            <Image
              src={shuttle.driver.avatar_url}
              alt={shuttle.driver.name}
              width={56}
              height={56}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {shuttle.driver.name.charAt(0)}
            </div>
          )}

          <div className="flex-1">
            <h3 className="font-semibold text-lg">{shuttle.driver.name}</h3>
            <p className="text-gray-600 text-sm">{shuttle.driver.license_number}</p>

            {shuttle.driver.rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-medium">{shuttle.driver.rating}</span>
                <span className="text-gray-500 text-xs">
                  ({shuttle.driver.reviews_count} {t('reviews')})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-600 text-xs font-semibold uppercase">{t('vehicle')}</p>
            <p className="text-sm font-semibold">{shuttle.plate_number}</p>
            <p className="text-xs text-gray-500">{shuttle.model}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-600 text-xs font-semibold uppercase">{t('capacity')}</p>
            <p className="text-sm font-semibold">
              {shuttle.current_passengers}/{shuttle.capacity}
            </p>
          </div>
        </div>

        {/* Distance & ETA */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg ${isArrived ? 'bg-emerald-50' : 'bg-blue-50'}`}>
            <p className="text-gray-600 text-xs font-semibold uppercase">{t('distance')}</p>
            <p className={`text-2xl font-bold ${isArrived ? 'text-emerald-600' : 'text-blue-600'}`}>
              {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
            </p>
          </div>

          <div className={`p-3 rounded-lg ${isArrived ? 'bg-emerald-50' : 'bg-blue-50'}`}>
            <p className="text-gray-600 text-xs font-semibold uppercase">{t('eta')}</p>
            <p className={`text-2xl font-bold ${isArrived ? 'text-emerald-600' : 'text-blue-600'}`}>
              {isArrived ? t('arriving_now') : `${etaMinutes}m`}
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="flex gap-2">
          <a
            href={`tel:${shuttle.driver.phone}`}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.908 1.34c.165.39.337.773.515 1.148a12.01 12.01 0 001.82 2.238l1.5-1.065a1 1 0 011.187.12l3.75 3.75a1 1 0 01.12 1.187l-1.065 1.5a12.01 12.01 0 002.238 1.82c.375.178.758.35 1.148.515l1.34-1.908a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a2 2 0 01-2 2H3a2 2 0 01-2-2V3z" />
            </svg>
            {t('call_driver')}
          </a>

          <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0L10 9.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
            {t('message')}
          </button>
        </div>

        {/* Arrived Alert */}
        {isArrived && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded">
            <p className="text-emerald-800 font-semibold text-sm">{t('driver_arrived_msg')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
