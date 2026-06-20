'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { NotificationPayload } from '@/types/tracking';

interface NotificationCenterProps {
  notifications: NotificationPayload[];
  onDismiss: (id: string) => void;
  autoHideDuration?: number;
}

export function NotificationCenter({
  notifications,
  onDismiss,
  autoHideDuration = 5000,
}: NotificationCenterProps) {
  const t = useTranslations('tracking');

  // Auto-dismiss notifications
  useEffect(() => {
    const timers = notifications.map((notif) => {
      if (notif.type === 'driver_arrived') return null; // Don't auto-dismiss arrival

      return setTimeout(() => {
        onDismiss(notif.id);
      }, autoHideDuration);
    });

    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [notifications, onDismiss, autoHideDuration]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-2 max-h-96 overflow-y-auto">
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onDismiss={() => onDismiss(notif.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationPayload;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const iconColor =
    {
      driver_arrived: 'bg-emerald-100 text-emerald-600',
      driver_nearby: 'bg-blue-100 text-blue-600',
      eta_5min: 'bg-amber-100 text-amber-600',
      eta_1min: 'bg-red-100 text-red-600',
      status_change: 'bg-purple-100 text-purple-600',
    }[notification.type] || 'bg-gray-100 text-gray-600';

  const iconPath =
    {
      driver_arrived:
        'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
      driver_nearby:
        'M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z',
      eta_5min:
        'M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z',
      eta_1min:
        'M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z',
      status_change:
        'M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z',
    };

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-4 flex gap-3 items-start animate-in slide-in-from-top-2 duration-300"
      role="alert"
    >
      <div className={`p-2 rounded-lg flex-shrink-0 ${iconColor}`}>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d={iconPath} clipRule="evenodd" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">{notification.title}</h3>
        <p className="text-gray-600 text-xs mt-0.5">{notification.message}</p>
      </div>

      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
