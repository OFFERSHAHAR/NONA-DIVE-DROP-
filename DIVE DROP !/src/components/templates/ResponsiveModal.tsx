import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AppIcon } from '@/components/AppIcon';

/**
 * ResponsiveModal - Modal respecting safe areas
 *
 * Features:
 * - Centered on desktop, full-screen capable on mobile
 * - Proper safe area handling (top, bottom, left, right)
 * - Close button with 44px+ touch target
 * - Keyboard navigation (Escape to close)
 * - Focus trap implementation
 * - Backdrop dismiss option
 * - Dark mode support
 * - Accessibility: ARIA modal, focus management
 * - Smooth animations
 */

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  isDismissible?: boolean;
  safeAreaInsets?: SafeAreaInsets;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  action?: React.ReactNode;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  full: 'sm:max-w-2xl',
};

/**
 * Focus trap hook
 */
const useFocusTrap = (isOpen: boolean, containerRef: React.RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, containerRef]);
};

/**
 * ResponsiveModal component
 */
export const ResponsiveModal = React.forwardRef<HTMLDivElement, ResponsiveModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      footer,
      size = 'md',
      showCloseButton = true,
      isDismissible = true,
      safeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 },
      className,
      contentClassName,
      headerClassName,
      footerClassName,
      action,
    },
    ref
  ) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const dialogRef = React.useRef<HTMLDivElement>(null);

    useFocusTrap(isOpen, containerRef);

    useEffect(() => {
      if (isOpen) {
        setIsAnimating(true);
        document.body.style.overflow = 'hidden';
      } else {
        setIsAnimating(false);
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen, onClose]);

    if (!isOpen && !isAnimating) return null;

    return (
      <div
        ref={containerRef}
        role="presentation"
        className={clsx(
          'fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center',
          'transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {/* Backdrop */}
        <button
          onClick={() => isDismissible && onClose()}
          aria-hidden="true"
          className={clsx(
            'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
            isAnimating ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Modal */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          className={clsx(
            'relative z-10 w-full transform rounded-t-2xl bg-card transition-all duration-300 dark:bg-card-dark sm:rounded-2xl',
            'max-h-[calc(100vh-var(--max-height-offset,0px))]',
            sizeClasses[size],
            isAnimating ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:scale-95',
            className
          )}
          style={{
            paddingTop: `calc(1rem + ${safeAreaInsets.top}px)`,
            paddingBottom: `calc(1rem + ${safeAreaInsets.bottom}px)`,
            paddingLeft: `calc(1rem + ${safeAreaInsets.left}px)`,
            paddingRight: `calc(1rem + ${safeAreaInsets.right}px)`,
          }}
        >
          {/* Handle indicator for mobile */}
          <div className="flex justify-center sm:hidden">
            <div className="mb-4 h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>

          {/* Header */}
          {title && (
            <header
              className={clsx(
                'mb-4 flex items-center justify-between gap-3',
                headerClassName
              )}
            >
              <h2
                id="modal-title"
                className="flex-1 text-lg font-bold text-text-primary dark:text-text-primary-dark sm:text-xl"
              >
                {title}
              </h2>
              {action && <div>{action}</div>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary dark:text-text-secondary-dark dark:hover:bg-bg-secondary-dark"
                >
                  <AppIcon name="x" className="h-6 w-6" />
                </button>
              )}
            </header>
          )}

          {/* Content */}
          <div
            className={clsx(
              'max-h-[calc(100vh-200px)] overflow-y-auto sm:max-h-[calc(100vh-300px)]',
              contentClassName
            )}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <footer
              className={clsx(
                'mt-6 border-t border-border-primary pt-4 dark:border-border-secondary',
                footerClassName
              )}
            >
              {footer}
            </footer>
          )}
        </div>
      </div>
    );
  }
);

ResponsiveModal.displayName = 'ResponsiveModal';

/**
 * Modal hook for easier state management
 */
export const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
};

/**
 * ConfirmModal - Pre-built confirmation dialog
 */
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  safeAreaInsets?: SafeAreaInsets;
}

export const ConfirmModal = React.forwardRef<HTMLDivElement, ConfirmModalProps>(
  (
    {
      isOpen,
      onClose,
      onConfirm,
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDangerous = false,
      isLoading = false,
      safeAreaInsets,
    },
    ref
  ) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
      setIsSubmitting(true);
      try {
        await Promise.resolve(onConfirm());
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <ResponsiveModal
        ref={ref}
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="sm"
        isDismissible={!isSubmitting && !isLoading}
        safeAreaInsets={safeAreaInsets}
      >
        <div className="mb-6">
          <p className="text-base text-text-secondary dark:text-text-secondary-dark">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="flex-1 rounded-lg border-2 border-border-primary bg-transparent px-4 py-2 font-semibold text-text-primary transition-all hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 dark:border-border-secondary dark:text-text-primary-dark dark:hover:bg-bg-secondary-dark"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className={clsx(
              'flex-1 rounded-lg px-4 py-2 font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-dark',
              isDangerous
                ? 'bg-error hover:bg-red-700 focus:ring-error'
                : 'bg-primary hover:bg-primary-dark focus:ring-primary'
            )}
          >
            {isSubmitting || isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </ResponsiveModal>
    );
  }
);

ConfirmModal.displayName = 'ConfirmModal';
