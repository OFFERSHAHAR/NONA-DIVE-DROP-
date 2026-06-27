/**
 * useVoiceFeedback Hook
 * Manages voice feedback state, display, and optional audio output
 *
 * Usage:
 * const { feedback, showFeedback, clearFeedback, playVoice } = useVoiceFeedback();
 *
 * showFeedback(message, onDismiss);
 * playVoice("Task created");
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { FeedbackMessage, VoiceFeedbackFormatter } from "@/lib/voiceFeedback";

export interface UseVoiceFeedbackReturn {
  // State
  feedback: FeedbackMessage | null;
  isPlaying: boolean;
  waveformData: number[];

  // Methods
  showFeedback: (message: FeedbackMessage, onDismiss?: () => void) => void;
  clearFeedback: () => void;
  playVoice: (text: string, rate?: number) => Promise<void>;
  stopVoice: () => void;
  updateWaveform: (data: number[]) => void;

  // Convenience methods
  showSuccess: (action: string, result: string, lang?: "en" | "he") => void;
  showError: (problem: string, hint?: string, lang?: "en" | "he") => void;
  showInfo: (message: string, lang?: "en" | "he") => void;
  showResults: (count: number, itemName: string, lang?: "en" | "he") => void;
  showConfirmation: (heard: string, lang?: "en" | "he") => void;
  showListening: () => void;
  showProcessing: () => void;
}

/**
 * Hook for managing voice feedback display and audio output
 */
export function useVoiceFeedback(): UseVoiceFeedbackReturn {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const dismissTimeoutRef = useRef<NodeJS.Timeout>();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
      if (utteranceRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Show feedback message
   * Auto-dismisses after duration if specified
   */
  const showFeedback = useCallback(
    (message: FeedbackMessage, onDismiss?: () => void) => {
      // Clear previous timeout
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }

      setFeedback(message);

      // Set up auto-dismiss
      if (message.duration && message.duration > 0) {
        dismissTimeoutRef.current = setTimeout(() => {
          setFeedback(null);
          onDismiss?.();
        }, message.duration);
      }
    },
    []
  );

  /**
   * Clear feedback immediately
   */
  const clearFeedback = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    setFeedback(null);
  }, []);

  /**
   * Play voice output using Web Speech API
   * Only plays 1-2 word confirmations (fast and non-intrusive)
   *
   * @param text - Short text to speak (1-2 words recommended)
   * @param rate - Speech rate (0.5-2, default 1.5 for speed)
   */
  const playVoice = useCallback(async (text: string, rate: number = 1.5) => {
    return new Promise<void>((resolve) => {
      // Check browser support
      if (!("speechSynthesis" in window)) {
        console.warn("Speech Synthesis not supported");
        resolve();
        return;
      }

      // Only speak if text is provided
      if (!text || text.trim().length === 0) {
        resolve();
        return;
      }

      try {
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = Math.max(0.5, Math.min(2, rate));
        utterance.pitch = 1;
        utterance.volume = 0.8;

        // Set up event handlers
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
          setIsPlaying(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          resolve();
        };

        utteranceRef.current = utterance;

        // Speak
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Speech synthesis error:", error);
        setIsPlaying(false);
        resolve();
      }
    });
  }, []);

  /**
   * Stop voice output
   */
  const stopVoice = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  /**
   * Update waveform visualization data
   * Called from voice input listeners
   */
  const updateWaveform = useCallback((data: number[]) => {
    setWaveformData(data);
  }, []);

  // Convenience methods
  const showSuccess = useCallback(
    (action: string, result: string, lang: "en" | "he" = "en") => {
      const message = VoiceFeedbackFormatter.success(action, result, lang);
      showFeedback(message);
      if (message.shouldSpeak && message.voiceText) {
        playVoice(message.voiceText, 1.8);
      }
    },
    [showFeedback, playVoice]
  );

  const showError = useCallback(
    (problem: string, hint?: string, lang: "en" | "he" = "en") => {
      const message = VoiceFeedbackFormatter.error(problem, hint, lang);
      showFeedback(message);
      if (message.shouldSpeak && message.voiceText) {
        playVoice(message.voiceText);
      }
    },
    [showFeedback, playVoice]
  );

  const showInfo = useCallback(
    (message: string, lang: "en" | "he" = "en") => {
      const feedbackMsg = VoiceFeedbackFormatter.info(message, lang);
      showFeedback(feedbackMsg);
    },
    [showFeedback]
  );

  const showResults = useCallback(
    (count: number, itemName: string, lang: "en" | "he" = "en") => {
      const message = VoiceFeedbackFormatter.results(count, itemName, lang);
      showFeedback(message);
    },
    [showFeedback]
  );

  const showConfirmation = useCallback(
    (heard: string, lang: "en" | "he" = "en") => {
      const message = VoiceFeedbackFormatter.confirmation(heard, lang);
      showFeedback(message);
    },
    [showFeedback]
  );

  const showListening = useCallback(() => {
    const message = VoiceFeedbackFormatter.listening();
    showFeedback(message);
  }, [showFeedback]);

  const showProcessing = useCallback(() => {
    const message = VoiceFeedbackFormatter.processing();
    showFeedback(message);
  }, [showFeedback]);

  return {
    feedback,
    isPlaying,
    waveformData,
    showFeedback,
    clearFeedback,
    playVoice,
    stopVoice,
    updateWaveform,
    showSuccess,
    showError,
    showInfo,
    showResults,
    showConfirmation,
    showListening,
    showProcessing,
  };
}
