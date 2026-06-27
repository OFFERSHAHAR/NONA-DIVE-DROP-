"use client";

/**
 * VoiceControlIntegrated - Complete Voice Control Example
 *
 * This component demonstrates how to use the new voice feedback system:
 * - Smart, brief command confirmations
 * - Real-time listening/processing status
 * - Waveform visualization
 * - Error handling with hints
 * - Optional voice output
 * - Bilingual support
 *
 * Usage:
 * <VoiceControlIntegrated
 *   windowManager={windowManager}
 *   taskStore={taskStore}
 *   collaborationStore={collaborationStore}
 *   language="en"
 * />
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

import { VoiceButton } from "./VoiceButton";
import { VoiceHelp } from "./VoiceHelp";
import { VoiceCommandProcessor } from "./VoiceCommandProcessor";

import { VoiceStatus } from "@/components/UI/VoiceStatus";
import { useVoiceFeedback } from "@/lib/hooks";
import {
  VoiceFeedbackFormatter,
  type FeedbackMessage,
} from "@/lib/voiceFeedback";

interface VoiceControlIntegratedProps {
  windowManager?: any;
  taskStore?: any;
  collaborationStore?: any;
  language?: "en" | "he";
  className?: string;
  enableVoiceOutput?: boolean;
}

export const VoiceControlIntegrated: React.FC<VoiceControlIntegratedProps> = ({
  windowManager,
  taskStore,
  collaborationStore,
  language = "en",
  className = "",
  enableVoiceOutput = true,
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const processorRef = useRef<VoiceCommandProcessor>();
  const feedbackRef = useRef<ReturnType<typeof useVoiceFeedback> | null>(null);

  // Initialize feedback hook
  const feedback = useVoiceFeedback();
  feedbackRef.current = feedback;

  // Initialize command processor
  useEffect(() => {
    processorRef.current = new VoiceCommandProcessor(
      windowManager,
      taskStore,
      collaborationStore
    );
  }, [windowManager, taskStore, collaborationStore]);

  /**
   * Handle voice button status changes
   * Shows listening/processing status
   */
  const handleStatusChange = useCallback(
    (status: "idle" | "listening" | "processing" | "ready") => {
      switch (status) {
        case "listening":
          feedback.showListening();
          break;
        case "processing":
          feedback.showProcessing();
          break;
        case "ready":
          feedback.clearFeedback();
          break;
      }

      // Emit custom event for app integration
      window.dispatchEvent(
        new CustomEvent("voice-status-change", { detail: { status } })
      );
    },
    [feedback]
  );

  /**
   * Handle transcript from voice button
   * Processes command and shows appropriate feedback
   */
  const handleTranscript = useCallback(
    async (text: string) => {
      if (!processorRef.current) return;

      try {
        // Show processing
        feedback.showProcessing();

        // Process the command
        const result = await processorRef.current.process(text);

        // Prepare feedback message
        let feedbackMessage: FeedbackMessage;

        if (result.success) {
          // Success feedback
          if (result.action && result.data) {
            feedbackMessage = VoiceFeedbackFormatter.forCommand(
              result.action,
              result.data,
              language
            );
          } else {
            feedbackMessage = VoiceFeedbackFormatter.success(
              "Command",
              result.message,
              language
            );
          }

          // Show feedback
          feedback.showFeedback(feedbackMessage);

          // Play voice confirmation (optional)
          if (enableVoiceOutput && feedbackMessage.voiceText) {
            // Play voice asynchronously, don't wait
            feedback.playVoice(feedbackMessage.voiceText, 1.8).catch(() => {
              // Silently ignore voice errors
            });
          }
        } else {
          // Error feedback
          feedbackMessage = VoiceFeedbackFormatter.error(
            result.message,
            undefined,
            language
          );

          feedback.showFeedback(feedbackMessage);

          // Play error voice (optional)
          if (enableVoiceOutput && feedbackMessage.voiceText) {
            feedback.playVoice(feedbackMessage.voiceText).catch(() => {
              // Silently ignore voice errors
            });
          }
        }

        // Emit custom event for app integration
        window.dispatchEvent(
          new CustomEvent("voice-command", {
            detail: { result, transcript: text, feedback: feedbackMessage },
          })
        );
      } catch (error) {
        console.error("Error processing voice command:", error);

        const errorMsg = VoiceFeedbackFormatter.error(
          language === "he" ? "שגיאה בעיבוד" : "Error processing command",
          language === "he" ? "נסה שוב" : "Try again",
          language
        );

        feedback.showFeedback(errorMsg);

        if (enableVoiceOutput && errorMsg.voiceText) {
          feedback.playVoice(errorMsg.voiceText).catch(() => {
            // Silently ignore
          });
        }
      }
    },
    [feedback, language, enableVoiceOutput]
  );

  /**
   * Synthetic waveform data for demo/testing
   * In real implementation, this comes from the VoiceButton's audio analysis
   */
  useEffect(() => {
    if (feedback.feedback?.type === "listening") {
      // Simulate waveform during listening
      const interval = setInterval(() => {
        const newWaveform = Array.from({ length: 20 }, () => Math.random());
        setWaveformData(newWaveform);
        feedback.updateWaveform(newWaveform);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [feedback.feedback?.type, feedback]);

  return (
    <>
      {/* Voice Status Display - Top Center */}
      <VoiceStatus
        message={feedback.feedback}
        waveformData={waveformData}
        language={language}
        onDismiss={() => feedback.clearFeedback()}
      />

      {/* Voice Help Modal */}
      <VoiceHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        language={language}
      />

      {/* Voice Control Container - Bottom Left */}
      <motion.div
        className={`fixed bottom-20 left-4 z-40 flex flex-col items-center gap-4 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {/* Help Button */}
        <motion.button
          onClick={() => setIsHelpOpen(true)}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-os-info to-os-info-dark text-white shadow-lg hover:shadow-xl transition-all duration-250 flex items-center justify-center group hover:scale-105 active:scale-95"
          title={language === "he" ? "עזרה לפקודות" : "Command help"}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <HelpCircle className="w-5 h-5" />
        </motion.button>

        {/* Voice Button */}
        <VoiceButton
          onTranscript={handleTranscript}
          onStatusChange={handleStatusChange}
        />

        {/* Info Text */}
        {!feedback.feedback && (
          <motion.p
            className="text-xs text-gray-400 text-center max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {language === "he"
              ? 'לחץ על המיקרופון או לחץ Space/Alt+V'
              : "Click mic or press Space/Alt+V"}
          </motion.p>
        )}
      </motion.div>
    </>
  );
};

// Export for convenience
export { VoiceButton } from "./VoiceButton";
export { VoiceHelp } from "./VoiceHelp";
export { VoiceCommandProcessor, type CommandResult } from "./VoiceCommandProcessor";
