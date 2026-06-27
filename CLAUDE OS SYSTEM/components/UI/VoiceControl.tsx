"use client";

import React, { useState, useEffect } from "react";
import { useVoiceControl } from "@/hooks/useVoiceControl";
import { Mic, MicOff, Volume2, X, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ParsedCommand, CommandIntent } from "@/lib/voiceCommands";

interface VoiceControlProps {
  language?: "en" | "he";
  onCommandExecuted?: (command: ParsedCommand) => void;
  className?: string;
}

/**
 * Enhanced Voice Control Component - JARVIS-style command execution
 * NOT a chatbot - pure command-based interface
 */
export const VoiceControl: React.FC<VoiceControlProps> = ({
  language = "en",
  onCommandExecuted,
  className = "",
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    status,
    isListening,
    transcript,
    interimTranscript,
    waveformData,
    lastCommand,
    pendingConfirmation,
    getConfirmationText,
    getConfidence,
    startListening,
    stopListening,
    toggleListening,
    confirmCommand,
    rejectCommand,
  } = useVoiceControl({
    language: language === "he" ? "he-IL" : "en-US",
    autoExecute: true,
    onCommandDetected: (cmd) => {
      // Show confirmation if needed
      if (cmd.requiresConfirmation) {
        setShowConfirmation(true);
      }
    },
    onCommandExecuted: (result) => {
      onCommandExecuted?.(result.command);
    },
  });

  // Update confirmation visibility
  useEffect(() => {
    if (pendingConfirmation) {
      setShowConfirmation(true);
    }
  }, [pendingConfirmation]);

  const statusColors = {
    idle: "from-gray-500 to-gray-600",
    listening: "from-os-primary to-os-primary-light animate-pulse-soft",
    processing: "from-os-success to-os-success-light",
    error: "from-os-error to-os-error-light",
    ready: "from-os-primary to-os-primary-dark",
  };

  const statusLabels = {
    en: {
      idle: "Ready",
      listening: "Listening...",
      processing: "Processing...",
      error: "Error",
      ready: "Ready",
    },
    he: {
      idle: "מוכן",
      listening: "האזנה...",
      processing: "עיבוד...",
      error: "שגיאה",
      ready: "מוכן",
    },
  };

  const labels = statusLabels[language];

  return (
    <>
      {/* Voice Control Button */}
      <div
        className={`fixed bottom-20 left-4 z-40 flex flex-col items-center gap-4 ${className}`}
      >
        {/* Help Button */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-os-info to-os-info-dark text-white shadow-lg hover:shadow-xl transition-all duration-250 flex items-center justify-center group hover:scale-105 active:scale-95"
          title={language === "he" ? "עזרה לפקודות" : "Command help"}
        >
          <Volume2 className="w-5 h-5" />
        </button>

        {/* Mic Button */}
        <motion.button
          onClick={toggleListening}
          className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${statusColors[status]} text-white shadow-lg hover:shadow-xl transition-all duration-250 flex items-center justify-center group`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={`${isListening ? "Stop" : "Start"} voice control`}
        >
          <AnimatePresence>
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white"
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.2, opacity: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </AnimatePresence>

          {isListening ? (
            <MicOff className="w-7 h-7" />
          ) : (
            <Mic className="w-7 h-7" />
          )}

          {/* Status Tooltip */}
          <div className="absolute top-full mt-2 px-3 py-1 bg-os-panel border border-os-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            {labels[status as keyof typeof labels]}
          </div>
        </motion.button>

        {/* Waveform Visualization */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              className="flex items-end gap-1 h-10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 40 }}
              exit={{ opacity: 0, height: 0 }}
            >
              {waveformData.map((value, index) => (
                <motion.div
                  key={index}
                  className="w-1 bg-gradient-to-t from-os-primary to-os-primary-light rounded-full"
                  style={{
                    height: `${Math.max(4, value * 24)}px`,
                  }}
                  animate={{ height: `${Math.max(4, value * 24)}px` }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcript Display */}
        <AnimatePresence>
          {(transcript || interimTranscript) && (
            <motion.div
              className="max-w-xs px-3 py-2 bg-os-panel border border-os-border rounded-os-md text-xs text-gray-200 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="font-semibold mb-1">
                {interimTranscript || transcript}
              </div>
              {lastCommand && (
                <div className="text-xs text-os-primary-light">
                  Confidence: {(lastCommand.confidence * 100).toFixed(0)}%
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && pendingConfirmation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => rejectCommand()}
          >
            <motion.div
              className="bg-os-panel border border-os-border rounded-lg p-6 max-w-sm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-os-warning" />
                <h3 className="text-sm font-semibold text-white">
                  {language === "he" ? "אישור פקודה" : "Confirm Command"}
                </h3>
              </div>

              {/* Command Preview */}
              <div className="bg-black/30 rounded p-3 mb-4">
                <p className="text-sm text-gray-100 mb-1">
                  {getConfirmationText()}
                </p>
                <p className="text-xs text-gray-400">
                  {language === "he" ? "בטוחים?" : "Are you sure?"}
                </p>
              </div>

              {/* Confidence Indicator */}
              {lastCommand && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">
                      {language === "he" ? "ביטחון" : "Confidence"}
                    </span>
                    <span className="text-os-primary">
                      {(lastCommand.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-os-primary to-os-primary-light"
                      initial={{ width: 0 }}
                      animate={{ width: `${lastCommand.confidence * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    rejectCommand();
                    setShowConfirmation(false);
                  }}
                  className="flex-1 px-4 py-2 rounded bg-os-error/20 text-os-error hover:bg-os-error/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {language === "he" ? "בטל" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    confirmCommand();
                    setShowConfirmation(false);
                  }}
                  className="flex-1 px-4 py-2 rounded bg-os-success/20 text-os-success hover:bg-os-success/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {language === "he" ? "אישור" : "Confirm"}
                </button>
              </div>

              {/* Keyboard Hint */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                {language === "he" ? "Enter לאישור, Esc לביטול" : "Press Enter to confirm, Esc to cancel"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="fixed bottom-24 left-4 z-40 bg-os-panel border border-os-border rounded-lg p-4 max-w-xs shadow-xl"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
          >
            <div className="mb-3 flex justify-between items-center">
              <h4 className="font-semibold text-sm text-white">
                {language === "he" ? "פקודות זמינות" : "Available Commands"}
              </h4>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-300">
              <div>
                <span className="text-os-primary font-medium">
                  {language === "he" ? "משימות:" : "Tasks:"}
                </span>
                <div className="ml-2 mt-1 space-y-1">
                  <p>{language === "he" ? '"צור משימה [כותרת]"' : '"Create task [title]"'}</p>
                  <p>{language === "he" ? '"הצג משימות"' : '"Show tasks"'}</p>
                  <p>{language === "he" ? '"סיים משימה [מספר]"' : '"Complete task [number]"'}</p>
                </div>
              </div>

              <div>
                <span className="text-os-primary font-medium">
                  {language === "he" ? "הודעות:" : "Messages:"}
                </span>
                <div className="ml-2 mt-1 space-y-1">
                  <p>{language === "he" ? '"שלח הודעה ל[שם]: [הודעה]"' : '"Send message to [name]: [msg]"'}</p>
                </div>
              </div>

              <div>
                <span className="text-os-primary font-medium">
                  {language === "he" ? "אפליקציות:" : "Apps:"}
                </span>
                <div className="ml-2 mt-1 space-y-1">
                  <p>{language === "he" ? '"פתח [שם אפליקציה]"' : '"Open [app name]"'}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-os-border text-xs text-gray-500">
              {language === "he" ? "Space בעת ההאזנה" : "Space to start listening"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts
        isListening={isListening}
        onToggle={toggleListening}
        onConfirm={() => {
          confirmCommand();
          setShowConfirmation(false);
        }}
        onReject={() => {
          rejectCommand();
          setShowConfirmation(false);
        }}
        hasConfirmation={!!pendingConfirmation}
      />
    </>
  );
};

/**
 * Keyboard shortcut handler component
 */
const KeyboardShortcuts: React.FC<{
  isListening: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onReject: () => void;
  hasConfirmation: boolean;
}> = ({ isListening, onToggle, onConfirm, onReject, hasConfirmation }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space: Toggle listening
      if (e.code === "Space" && !hasConfirmation) {
        e.preventDefault();
        onToggle();
      }

      // Enter: Confirm pending command
      if (e.key === "Enter" && hasConfirmation) {
        e.preventDefault();
        onConfirm();
      }

      // Escape: Reject pending command
      if (e.key === "Escape" && hasConfirmation) {
        e.preventDefault();
        onReject();
      }

      // Alt+V: Emergency stop
      if (e.altKey && e.key.toLowerCase() === "v" && isListening) {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isListening, onToggle, onConfirm, onReject, hasConfirmation]);

  return null;
};

export default VoiceControl;
