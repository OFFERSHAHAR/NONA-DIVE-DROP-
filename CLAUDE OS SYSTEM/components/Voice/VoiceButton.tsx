"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  onStatusChange?: (status: "idle" | "listening" | "processing" | "ready") => void;
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  onStatusChange,
  className = "",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "ready">("ready");
  const [transcript, setTranscript] = useState("");
  const [waveformData, setWaveformData] = useState<number[]>(Array(20).fill(0));
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("listening");
      onStatusChange?.("listening");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        onTranscript?.(finalTranscript.trim());
        setStatus("processing");
        onStatusChange?.("processing");

        // Auto-reset after 2 seconds
        setTimeout(() => {
          setTranscript("");
          setStatus("ready");
          onStatusChange?.("ready");
        }, 2000);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setStatus("ready");
      onStatusChange?.("ready");
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus("ready");
      onStatusChange?.("ready");
      stopWaveform();
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript, onStatusChange]);

  // Waveform animation
  const startWaveform = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        const normalizedData = Array.from(dataArray)
          .slice(0, 20)
          .map((value) => value / 255);
        setWaveformData(normalizedData);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (error) {
      console.error("Microphone access error:", error);
    }
  }, []);

  const stopWaveform = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current = null;
    }
    setWaveformData(Array(20).fill(0));
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      stopWaveform();
    } else {
      setTranscript("");
      recognitionRef.current.start();
      startWaveform();
    }
  }, [isListening, startWaveform, stopWaveform]);

  // Keyboard shortcut (Alt+V or Spacebar when focused)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        toggleListening();
      }
      if (e.code === "Space" && !isListening) {
        e.preventDefault();
        toggleListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isListening) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isListening, toggleListening]);

  const statusColors = {
    idle: "from-gray-500 to-gray-600",
    listening: "from-os-primary to-os-primary-light animate-pulse-soft",
    processing: "from-os-success to-os-success-light",
    ready: "from-os-primary to-os-primary-dark",
  };

  const statusLabels = {
    idle: "Idle",
    listening: "Listening...",
    processing: "Processing...",
    ready: "Ready",
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <motion.button
        onClick={toggleListening}
        className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${statusColors[status]} text-white shadow-lg hover:shadow-xl transition-all duration-250 flex items-center justify-center group`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={`Voice Control (${isListening ? "Click to stop" : "Alt+V or Space to activate"})`}
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
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}

        <div className="absolute top-full mt-2 px-2 py-1 bg-os-panel border border-os-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          {statusLabels[status]}
        </div>
      </motion.button>

      {/* Waveform Visualization */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            className="flex items-center gap-1 h-8"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 32 }}
            exit={{ opacity: 0, height: 0 }}
          >
            {waveformData.map((value, index) => (
              <motion.div
                key={index}
                className="w-1 bg-gradient-to-t from-os-primary to-os-primary-light rounded-full"
                style={{
                  height: `${Math.max(4, value * 20)}px`,
                }}
                animate={{ height: `${Math.max(4, value * 20)}px` }}
                transition={{ duration: 0.05 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Display */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            className="max-w-xs px-3 py-2 bg-os-panel border border-os-border rounded-os-md text-xs text-gray-200 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {transcript}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicator */}
      {status === "processing" && (
        <motion.div
          className="flex items-center gap-2 text-xs text-os-success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Circle className="w-3 h-3 fill-current" />
          Processing...
        </motion.div>
      )}
    </div>
  );
};
