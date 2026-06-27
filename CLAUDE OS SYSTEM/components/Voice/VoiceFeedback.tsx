"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface VoiceFeedbackProps {
  maxToasts?: number;
}

let toastId = 0;

export const VoiceFeedback: React.FC<VoiceFeedbackProps> = ({ maxToasts = 5 }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 3000) => {
      const id = `toast-${++toastId}`;
      const toast: Toast = { id, message, type, duration };

      setToasts((prev) => {
        const updated = [...prev, toast];
        return updated.length > maxToasts ? updated.slice(-maxToasts) : updated;
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Expose via window object for global access
  useEffect(() => {
    (window as any).voiceFeedback = { showToast, removeToast };
    return () => {
      delete (window as any).voiceFeedback;
    };
  }, [showToast, removeToast]);

  const iconMap = {
    success: Check,
    error: X,
    info: AlertCircle,
  };

  const colorMap = {
    success: "bg-os-success/20 border-os-success text-os-success",
    error: "bg-os-danger/20 border-os-danger text-os-danger",
    info: "bg-os-info/20 border-os-info text-os-info",
  };

  const bgColorMap = {
    success: "bg-os-success",
    error: "bg-os-danger",
    info: "bg-os-info",
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 400, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 400, scale: 0.8 }}
              transition={{ duration: 0.3, type: "spring" }}
              className={`flex items-center gap-3 px-4 py-3 rounded-os-md border backdrop-blur-glass pointer-events-auto ${colorMap[toast.type]} min-w-max max-w-sm`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Icon className={`w-5 h-5 flex-shrink-0`} />
              </motion.div>

              <span className="text-sm font-medium">{toast.message}</span>

              {toast.duration !== 0 && (
                <motion.div
                  className={`h-1 flex-grow rounded-full ${bgColorMap[toast.type]}`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: (toast.duration || 3000) / 1000 }}
                />
              )}

              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// Export function for easy global usage
export const useVoiceFeedback = () => {
  return {
    success: (message: string, duration?: number) =>
      (window as any).voiceFeedback?.showToast(message, "success", duration),
    error: (message: string, duration?: number) =>
      (window as any).voiceFeedback?.showToast(message, "error", duration),
    info: (message: string, duration?: number) =>
      (window as any).voiceFeedback?.showToast(message, "info", duration),
  };
};
