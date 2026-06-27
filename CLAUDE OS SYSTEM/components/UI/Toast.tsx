"use client";

import { ReactNode, createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextType {
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      if (toast.duration !== 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration || 5000);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const iconMap = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  const bgColorMap = {
    success:
      "bg-os-success/20 border-os-success/30 text-os-success",
    error:
      "bg-os-danger/20 border-os-danger/30 text-os-danger",
    info:
      "bg-os-info/20 border-os-info/30 text-os-info",
    warning:
      "bg-os-warning/20 border-os-warning/30 text-os-warning",
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-3 p-4 rounded-os-lg border",
        "animate-slide-in-right",
        bgColorMap[toast.type]
      )}
      role="alert"
    >
      <div className="flex-shrink-0">{iconMap[toast.type]}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>

      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="flex-shrink-0 text-sm font-medium hover:opacity-80 transition-opacity"
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={onClose}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Hook for easy toast creation
export function useToastNotification() {
  const { addToast } = useToast();

  return {
    success: (message: string) =>
      addToast({
        type: "success",
        message,
      }),
    error: (message: string) =>
      addToast({
        type: "error",
        message,
        duration: 0,
      }),
    info: (message: string) =>
      addToast({
        type: "info",
        message,
      }),
    warning: (message: string) =>
      addToast({
        type: "warning",
        message,
      }),
  };
}

export { ToastProvider, ToastContainer, ToastItem };
