'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AppIcon, type AppIconName } from './AppIcon';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

export interface ToastContainerProps {
  position?: ToastPosition;
  maxToasts?: number;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      id,
      message,
      type = 'info',
      duration = 4000,
      action,
      onClose,
    },
    ref
  ) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
      if (duration <= 0) return;

      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          onClose?.();
        }, 300); // Match fade-out animation duration
      }, duration);

      return () => clearTimeout(timer);
    }, [duration, onClose]);

    const typeStyles = {
      success: 'bg-success text-white border-success shadow-success-glow border-l-4',
      error: 'bg-error text-white border-error shadow-error-glow border-l-4',
      warning: 'bg-warning text-black border-warning shadow-warning-glow border-l-4',
      info: 'bg-info text-white border-info shadow-info-glow border-l-4',
    };

    const typeIcons: Record<ToastType, AppIconName> = { success: 'check', error: 'x', warning: 'fire', info: 'info' };

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={clsx(
          'toast-item',
          'flex items-center gap-3 px-4 py-3 rounded-lg',
          'shadow-lg backdrop-blur-sm',
          'min-w-[320px] max-w-[420px]',
          'transition-all duration-300',
          typeStyles[type],
          isExiting ? 'toast-exit' : 'toast-enter'
        )}
      >
        <div className="flex-shrink-0">
          <AppIcon name={typeIcons[type]} className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug break-words">{message}</p>
        </div>

        {action && (
          <button
            onClick={action.onClick}
            className={clsx(
              'flex-shrink-0 ml-2 font-semibold text-sm',
              'hover:opacity-80 transition-opacity',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'px-3 py-1 rounded'
            )}
            aria-label={action.label}
          >
            {action.label}
          </button>
        )}

        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => {
              onClose?.();
            }, 300);
          }}
          className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
          aria-label="Close notification"
        >
          <AppIcon name="x" className="h-5 w-5" />
        </button>
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export default Toast;
