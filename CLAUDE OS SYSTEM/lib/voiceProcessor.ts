/**
 * Voice Processor - Web Speech API wrapper
 * Handles speech recognition, transcription, and audio visualization
 */

export interface VoiceProcessorConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxDuration?: number; // ms before auto-stop
}

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  resultIndex: number;
}

export type VoiceStatusType = "idle" | "listening" | "processing" | "error" | "ready";

export interface VoiceProcessorState {
  status: VoiceStatusType;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  isListening: boolean;
  error?: string;
}

export class VoiceProcessor {
  private recognition: any;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private config: Required<VoiceProcessorConfig>;
  private state: VoiceProcessorState;
  private timeoutId: NodeJS.Timeout | null = null;

  // Callbacks
  private onStatusChange?: (status: VoiceStatusType) => void;
  private onTranscript?: (result: VoiceRecognitionResult) => void;
  private onWaveform?: (data: number[]) => void;
  private onError?: (error: string) => void;

  constructor(config: VoiceProcessorConfig = {}) {
    this.config = {
      language: config.language || "en-US",
      continuous: config.continuous !== false,
      interimResults: config.interimResults !== false,
      maxDuration: config.maxDuration || 30000, // 30 seconds
    };

    this.state = {
      status: "idle",
      transcript: "",
      interimTranscript: "",
      confidence: 0,
      isListening: false,
    };

    this.initializeRecognition();
  }

  /**
   * Initialize Web Speech API
   */
  private initializeRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.setState({ status: "error", error: "Speech Recognition API not supported" });
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;

    // Handlers
    this.recognition.onstart = () => this.handleStart();
    this.recognition.onresult = (event: any) => this.handleResult(event);
    this.recognition.onerror = (event: any) => this.handleError(event);
    this.recognition.onend = () => this.handleEnd();
  }

  /**
   * Start listening
   */
  public async start(): Promise<void> {
    if (this.state.isListening) return;

    try {
      this.setState({ status: "listening", isListening: true });
      this.resetTranscript();

      // Start audio visualization
      await this.startAudioVisualization();

      // Start recognition
      if (this.recognition) {
        this.recognition.start();
      }

      // Auto-stop after max duration
      this.timeoutId = setTimeout(() => {
        this.stop();
      }, this.config.maxDuration);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to start listening";
      this.setState({ status: "error", error: errorMsg });
      this.onError?.(errorMsg);
    }
  }

  /**
   * Stop listening
   */
  public stop(): void {
    if (!this.state.isListening) return;

    if (this.recognition) {
      this.recognition.stop();
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.stopAudioVisualization();
    this.setState({ status: "ready", isListening: false });
  }

  /**
   * Abort recognition without firing final result
   */
  public abort(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
    this.stopAudioVisualization();
    this.setState({
      status: "idle",
      isListening: false,
      transcript: "",
      interimTranscript: "",
    });
  }

  /**
   * Set language (e.g., "en-US", "he-IL")
   */
  public setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Start audio visualization with frequency analysis
   */
  private async startAudioVisualization(): Promise<void> {
    try {
      // Get microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create audio context for analysis
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      // Start animation loop
      this.animateWaveform();
    } catch (error) {
      console.warn("Microphone access failed:", error);
      // Don't fail if we can't visualize - still continue with recognition
    }
  }

  /**
   * Stop audio visualization
   */
  private stopAudioVisualization(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.onWaveform?.([]);
  }

  /**
   * Animate waveform data
   */
  private animateWaveform(): void {
    if (!this.analyser || !this.state.isListening) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Normalize and downsample to 20 bars
    const normalizedData = Array.from(dataArray)
      .slice(0, 40)
      .reduce((acc, val, idx) => {
        if (idx % 2 === 0) acc.push(val);
        return acc;
      }, [] as number[])
      .map((v) => v / 255)
      .slice(0, 20);

    // Pad if needed
    while (normalizedData.length < 20) {
      normalizedData.push(0);
    }

    this.onWaveform?.(normalizedData);
    this.animationFrameId = requestAnimationFrame(() => this.animateWaveform());
  }

  /**
   * Handle recognition start
   */
  private handleStart(): void {
    this.setState({ status: "listening" });
    this.onStatusChange?.("listening");
  }

  /**
   * Handle recognition results
   */
  private handleResult(event: any): void {
    let interimTranscript = "";
    let finalTranscript = "";
    let maxConfidence = 0;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence || 0;

      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
        maxConfidence = Math.max(maxConfidence, confidence);
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      const cleanTranscript = finalTranscript.trim();
      this.setState({
        status: "processing",
        transcript: cleanTranscript,
        confidence: maxConfidence,
        interimTranscript: "",
      });

      this.onStatusChange?.("processing");
      this.onTranscript?.({
        transcript: cleanTranscript,
        isFinal: true,
        confidence: maxConfidence,
        resultIndex: event.resultIndex,
      });
    } else if (interimTranscript) {
      this.setState({ interimTranscript });
    }
  }

  /**
   * Handle recognition error
   */
  private handleError(event: any): void {
    const errorMsg = event.error || "Unknown error";
    this.setState({ status: "error", error: errorMsg });
    this.onError?.(errorMsg);
  }

  /**
   * Handle recognition end
   */
  private handleEnd(): void {
    this.stopAudioVisualization();
    if (!this.state.transcript) {
      this.setState({ status: "ready", isListening: false });
    }
  }

  /**
   * Reset transcript
   */
  private resetTranscript(): void {
    this.setState({
      transcript: "",
      interimTranscript: "",
      confidence: 0,
    });
  }

  /**
   * Update internal state
   */
  private setState(updates: Partial<VoiceProcessorState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Get current state
   */
  public getState(): VoiceProcessorState {
    return { ...this.state };
  }

  /**
   * Register callbacks
   */
  public on(
    event: "statusChange" | "transcript" | "waveform" | "error",
    callback: (...args: any[]) => void
  ): void {
    switch (event) {
      case "statusChange":
        this.onStatusChange = callback;
        break;
      case "transcript":
        this.onTranscript = callback;
        break;
      case "waveform":
        this.onWaveform = callback;
        break;
      case "error":
        this.onError = callback;
        break;
    }
  }

  /**
   * Unregister callbacks
   */
  public off(event: "statusChange" | "transcript" | "waveform" | "error"): void {
    switch (event) {
      case "statusChange":
        this.onStatusChange = undefined;
        break;
      case "transcript":
        this.onTranscript = undefined;
        break;
      case "waveform":
        this.onWaveform = undefined;
        break;
      case "error":
        this.onError = undefined;
        break;
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.abort();
    if (this.recognition) {
      this.recognition = null;
    }
  }
}
