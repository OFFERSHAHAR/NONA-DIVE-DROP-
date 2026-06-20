'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NotificationPayload } from '@/types/tracking';

interface UseNotificationsOptions {
  tripId: string;
  shuttleDistance?: number;
  etaMinutes?: number;
  enabled?: boolean;
  locale?: 'he' | 'en';
}

const NOTIFICATION_TRIGGERS = {
  DRIVER_NEARBY: 500, // meters
  DRIVER_ARRIVED: 50, // meters
  ETA_5_MIN: 5, // minutes
  ETA_1_MIN: 1, // minute
};

const notificationMessages = {
  he: {
    driver_arrived: {
      title: 'נהג הגיע! 🎉',
      message: 'הנהג שלך הגיע ממש! חכה בחוץ',
    },
    driver_nearby: {
      title: 'נהג קרוב 📍',
      message: 'הנהג שלך כמעט הגיע - בואו להכנות',
    },
    eta_5min: {
      title: 'עוד 5 דקות ⏱️',
      message: 'הנהג יגיע בעוד כחמש דקות',
    },
    eta_1min: {
      title: 'עוד דקה אחת! 🚗',
      message: 'הנהג יגיע תוך דקה בלבד',
    },
  },
  en: {
    driver_arrived: {
      title: 'Driver Arrived! 🎉',
      message: 'Your driver has arrived! Wait outside',
    },
    driver_nearby: {
      title: 'Driver Nearby 📍',
      message: 'Your driver is almost here - get ready',
    },
    eta_5min: {
      title: '5 Minutes Away ⏱️',
      message: 'Your driver will arrive in about 5 minutes',
    },
    eta_1min: {
      title: '1 Minute Away! 🚗',
      message: 'Your driver will arrive in just 1 minute',
    },
  },
};

export function useNotifications({
  tripId,
  shuttleDistance = 0,
  etaMinutes = 0,
  enabled = true,
  locale = 'he',
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const triggeredRef = useRef<Set<string>>(new Set());
  const notificationsRef = useRef<NotificationPayload[]>([]);

  // Request notification permission
  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      setPermission('granted');
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((result) => {
        setPermission(result);
      });
    }
  }, [enabled]);

  // Check and trigger notifications based on distance and ETA
  useEffect(() => {
    if (permission !== 'granted' || !enabled) return;

    const messages = notificationMessages[locale];

    // Driver arrived (< 50m)
    if (
      shuttleDistance <= NOTIFICATION_TRIGGERS.DRIVER_ARRIVED &&
      !triggeredRef.current.has('arrived')
    ) {
      const notif: NotificationPayload = {
        id: `arrived_${tripId}`,
        type: 'driver_arrived',
        title: messages.driver_arrived.title,
        message: messages.driver_arrived.message,
        timestamp: new Date().toISOString(),
        read: false,
      };

      triggerNotification(notif);
      triggeredRef.current.add('arrived');
    }

    // Driver nearby (< 500m)
    if (
      shuttleDistance <= NOTIFICATION_TRIGGERS.DRIVER_NEARBY &&
      shuttleDistance > NOTIFICATION_TRIGGERS.DRIVER_ARRIVED &&
      !triggeredRef.current.has('nearby')
    ) {
      const notif: NotificationPayload = {
        id: `nearby_${tripId}`,
        type: 'driver_nearby',
        title: messages.driver_nearby.title,
        message: messages.driver_nearby.message,
        timestamp: new Date().toISOString(),
        read: false,
      };

      triggerNotification(notif);
      triggeredRef.current.add('nearby');
    }

    // ETA 1 minute
    if (etaMinutes <= 1 && etaMinutes > 0 && !triggeredRef.current.has('eta_1')) {
      const notif: NotificationPayload = {
        id: `eta_1_${tripId}`,
        type: 'eta_1min',
        title: messages.eta_1min.title,
        message: messages.eta_1min.message,
        timestamp: new Date().toISOString(),
        read: false,
      };

      triggerNotification(notif);
      triggeredRef.current.add('eta_1');
    }

    // ETA 5 minutes
    if (
      etaMinutes <= NOTIFICATION_TRIGGERS.ETA_5_MIN &&
      etaMinutes > 1 &&
      !triggeredRef.current.has('eta_5')
    ) {
      const notif: NotificationPayload = {
        id: `eta_5_${tripId}`,
        type: 'eta_5min',
        title: messages.eta_5min.title,
        message: messages.eta_5min.message,
        timestamp: new Date().toISOString(),
        read: false,
      };

      triggerNotification(notif);
      triggeredRef.current.add('eta_5');
    }
  }, [permission, enabled, shuttleDistance, etaMinutes, tripId, locale]);

  const triggerNotification = useCallback((notif: NotificationPayload) => {
    if (permission !== 'granted') return;

    // Show browser notification
    try {
      new Notification(notif.title, {
        body: notif.message,
        icon: '/logo.png',
        badge: '/logo.png',
        requireInteraction: notif.type === 'driver_arrived',
        tag: notif.type,
        renotify: notif.type === 'driver_arrived',
      });
    } catch (err) {
      console.warn('Failed to show notification:', err);
    }

    // Add to UI notifications list
    notificationsRef.current = [notif, ...notificationsRef.current].slice(0, 10);
    setNotifications([...notificationsRef.current]);
  }, [permission]);

  const clearNotification = useCallback((id: string) => {
    notificationsRef.current = notificationsRef.current.filter((n) => n.id !== id);
    setNotifications([...notificationsRef.current]);
  }, []);

  const resetTriggers = useCallback(() => {
    triggeredRef.current.clear();
  }, []);

  const clearAll = useCallback(() => {
    notificationsRef.current = [];
    setNotifications([]);
  }, []);

  return {
    notifications,
    permission,
    triggerNotification,
    clearNotification,
    resetTriggers,
    clearAll,
  };
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
