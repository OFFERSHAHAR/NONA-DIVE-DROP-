"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { VoiceButton } from "./VoiceButton";
import { VoiceFeedback, useVoiceFeedback } from "./VoiceFeedback";
import { VoiceHelp } from "./VoiceHelp";
import { VoiceCommandProcessor } from "./VoiceCommandProcessor";
import { HelpCircle } from "lucide-react";

interface VoiceControlProps {
  windowManager?: any;
  taskStore?: any;
  collaborationStore?: any;
  language?: "en" | "he";
  className?: string;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  windowManager,
  taskStore,
  collaborationStore,
  language = "en",
  className = "",
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const processorRef = useRef<VoiceCommandProcessor>();
  const feedbackRef = useRef<ReturnType<typeof useVoiceFeedback> | null>(null);

  // Initialize command processor
  useEffect(() => {
    processorRef.current = new VoiceCommandProcessor(
      windowManager,
      taskStore,
      collaborationStore
    );
  }, [windowManager, taskStore, collaborationStore]);

  // Get feedback reference
  useEffect(() => {
    feedbackRef.current = useVoiceFeedback();
  }, []);

  const handleTranscript = useCallback(async (text: string) => {
    if (!processorRef.current) return;

    try {
      const result = await processorRef.current.process(text);

      if (result.success) {
        feedbackRef.current?.success(result.message, 3000);
      } else {
        feedbackRef.current?.error(result.message, 3000);
      }

      // Dispatch custom event for app integration
      window.dispatchEvent(
        new CustomEvent("voice-command", {
          detail: { result, transcript: text },
        })
      );
    } catch (error) {
      console.error("Error processing voice command:", error);
      feedbackRef.current?.error("Error processing command", 3000);
    }
  }, []);

  const handleStatusChange = useCallback(
    (status: "idle" | "listening" | "processing" | "ready") => {
      window.dispatchEvent(
        new CustomEvent("voice-status-change", {
          detail: { status },
        })
      );
    },
    []
  );

  return (
    <>
      {/* Voice Feedback Toast Container */}
      <VoiceFeedback maxToasts={5} />

      {/* Voice Help Modal */}
      <VoiceHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        language={language}
      />

      {/* Voice Control Container */}
      <div
        className={`fixed bottom-20 left-4 z-40 flex flex-col items-center gap-4 ${className}`}
      >
        {/* Help Button */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-os-info to-os-info-dark text-white shadow-lg hover:shadow-xl transition-all duration-250 flex items-center justify-center group hover:scale-105 active:scale-95"
          title={language === "he" ? "עזרה לפקודות" : "Command help"}
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Voice Button */}
        <VoiceButton
          onTranscript={handleTranscript}
          onStatusChange={handleStatusChange}
        />
      </div>
    </>
  );
};

// Export components individually for flexibility
export { VoiceButton } from "./VoiceButton";
export { VoiceFeedback, useVoiceFeedback } from "./VoiceFeedback";
export { VoiceHelp } from "./VoiceHelp";
export { VoiceCommandProcessor, type CommandResult } from "./VoiceCommandProcessor";
