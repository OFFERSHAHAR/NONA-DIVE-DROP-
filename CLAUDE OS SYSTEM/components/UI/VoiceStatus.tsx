"use client";

import React, { useState, useEffect } from "react";
import { Mic, Loader, Check, AlertCircle, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FeedbackMessage, FeedbackType } from "@/lib/voiceFeedback";

interface VoiceStatusProps {
  message?: FeedbackMessage | null;
  waveformData?: number[];
  isVisible?: boolean;
  language?: "en" | "he";
  onDismiss?: () => void;
  className?: string;
}

/**
 * VoiceStatus Component
 * Displays voice feedback with appropriate visual and textual indicators
 *
 * Features:
 * - Status-specific icons and animations
 * - Waveform visualization during listening
 * - Auto-dismiss based on feedback type
 * - Supports bilingual (en/he) display
 * - Progress bar for duration-based messages
 */
export const VoiceStatus: React.FC<VoiceStatusProps> = ({
  message,
  waveformData = [],
  isVisible = true,
  language = "en",
  onDismiss,
  className = "",
}) => {
  const [isShown, setIsShown] = useState(isVisible);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss timer
  useEffect(() => {
    if (!message || !message.duration || message.duration === 0) {
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (message.duration! / 50));
        if (next <= 0) {
          setIsShown(false);
          onDismiss?.();
          return 100;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [message, onDismiss]);

  // Show/hide logic
  useEffect(() => {
    setIsShown(isVisible && !!message);
    setProgress(100);
  }, [message, isVisible]);

  if (!message || !isShown) {
    return null;
  }

  const text = language === "he" ? message.textHe || message.text : message.text;
  const isDark = message.type === "listening" || message.type === "processing";

  // Icon component
  const renderIcon = () => {
    switch (message.icon) {
      case "mic":
        return <Mic className="w-5 h-5 animate-pulse" />;
      case "loader":
        return <Loader className="w-5 h-5 animate-spin" />;
      case "check":
        return (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Check className="w-5 h-5" />
          </motion.div>
        );
      case "error":
        return (
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AlertCircle className="w-5 h-5" />
          </motion.div>
        );
      case "help":
        return <Volume2 className="w-5 h-5" />;
      case "info":
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Color scheme by type
  const colorScheme = {
    listening: "bg-os-primary/20 border-os-primary text-os-primary",
    processing: "bg-os-primary/20 border-os-primary text-os-primary",
    confirmation: "bg-os-info/20 border-os-info text-os-info",
    success: "bg-os-success/20 border-os-success text-os-success",
    error: "bg-os-danger/20 border-os-danger text-os-danger",
    results: "bg-os-info/20 border-os-info text-os-info",
    info: "bg-os-info/20 border-os-info text-os-info",
  };

  const progressColor = {
    listening: "bg-os-primary",
    processing: "bg-os-primary",
    confirmation: "bg-os-info",
    success: "bg-os-success",
    error: "bg-os-danger",
    results: "bg-os-info",
    info: "bg-os-info",
  };

  const containerClass = colorScheme[message.type];
  const progressClass = progressColor[message.type];

  return (
    <AnimatePresence>
      <motion.div
        key={`status-${message.type}`}
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={`
          fixed top-4 left-1/2 -translate-x-1/2 z-50
          px-4 py-3 rounded-lg border backdrop-blur-glass
          ${containerClass}
          ${className}
        `}
      >
        <div className="flex items-center gap-3 min-w-max max-w-md">
          {/* Icon */}
          <div className="flex-shrink-0">{renderIcon()}</div>

          {/* Main content */}
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium leading-tight">{text}</div>

            {/* Waveform visualization during listening */}
            {message.type === "listening" && waveformData.length > 0 && (
              <div className="flex items-center gap-0.5 h-6">
                {waveformData.map((value, index) => (
                  <motion.div
                    key={index}
                    className="w-1 bg-gradient-to-t from-os-primary to-os-primary-light rounded-full"
                    style={{
                      height: `${Math.max(4, value * 16)}px`,
                    }}
                    animate={{ height: `${Math.max(4, value * 16)}px` }}
                    transition={{ duration: 0.05 }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Dismiss button (optional) */}
          {message.type === "confirmation" && (
            <button
              onClick={() => setIsShown(false)}
              className="ml-2 text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>

        {/* Progress bar for auto-dismiss messages */}
        {message.duration && message.duration > 0 && (
          <motion.div
            className={`absolute bottom-0 left-0 h-1 rounded-b-lg ${progressClass}`}
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: "linear" }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * VoiceStatusBar - Compact status bar version
 * Useful for mobile or minimal space layouts
 */
export const VoiceStatusBar: React.FC<VoiceStatusProps> = ({
  message,
  waveformData = [],
  isVisible = true,
  language = "en",
  onDismiss,
  className = "",
}) => {
  const [isShown, setIsShown] = useState(isVisible);

  useEffect(() => {
    setIsShown(isVisible && !!message);
  }, [message, isVisible]);

  if (!message || !isShown) {
    return null;
  }

  const text = language === "he" ? message.textHe || message.text : message.text;

  const statusIndicator = {
    listening: "h-1 bg-os-primary animate-pulse",
    processing: "h-1 bg-os-primary animate-pulse",
    success: "h-1 bg-os-success",
    error: "h-1 bg-os-danger",
    confirmation: "h-1 bg-os-info",
    results: "h-1 bg-os-info",
    info: "h-1 bg-os-info",
  };

  return (
    <motion.div
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      exit={{ scaleY: 0 }}
      transition={{ duration: 0.2 }}
      className={`w-full ${statusIndicator[message.type]} ${className}`}
    >
      <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs text-gray-300 bg-os-panel/50">
        <div className="flex-shrink-0">{renderMiniIcon(message.icon)}</div>
        <span>{text}</span>
      </div>
    </motion.div>
  );
};

// Helper function for mini icon
function renderMiniIcon(icon?: string) {
  switch (icon) {
    case "mic":
      return <Mic className="w-3 h-3 animate-pulse" />;
    case "loader":
      return <Loader className="w-3 h-3 animate-spin" />;
    case "check":
      return <Check className="w-3 h-3" />;
    case "error":
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <AlertCircle className="w-3 h-3" />;
  }
}
