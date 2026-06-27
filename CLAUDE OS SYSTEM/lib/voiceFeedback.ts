/**
 * Voice Feedback Formatter
 * Converts voice command states into smart, brief command confirmations
 *
 * Philosophy: NOT chatbot responses, but command confirmation messages.
 * - Listening: Real-time status (mic active)
 * - Processing: Brief wait state
 * - Confirmation: Ask if misheard (only when needed)
 * - Success: ✓ Action + what happened
 * - Error: ✗ Problem + hint
 * - Results: Factual data only
 */

export type FeedbackType =
  | "listening"
  | "processing"
  | "confirmation"
  | "success"
  | "error"
  | "results"
  | "info";

export interface FeedbackMessage {
  type: FeedbackType;
  text: string;
  textHe?: string;
  duration?: number;
  icon?: "mic" | "loader" | "check" | "error" | "info" | "help";
  shouldSpeak?: boolean;
  voiceText?: string; // For text-to-speech output (1-2 words only)
}

export interface CommandConfirmation {
  action: string;
  heard: string;
  confidence: number; // 0-1, when < 0.7 ask for confirmation
}

/**
 * Generate appropriate feedback for voice command states
 */
export class VoiceFeedbackFormatter {
  /**
   * Listening state feedback
   * Shows user the system is actively recording
   */
  static listening(): FeedbackMessage {
    return {
      type: "listening",
      text: "Listening...",
      textHe: "מקשיב...",
      duration: 0, // Never auto-dismiss
      icon: "mic",
      shouldSpeak: false,
    };
  }

  /**
   * Processing state feedback
   * Shows command is being parsed
   */
  static processing(): FeedbackMessage {
    return {
      type: "processing",
      text: "Processing...",
      textHe: "עיבוד...",
      duration: 0, // Never auto-dismiss
      icon: "loader",
      shouldSpeak: false,
    };
  }

  /**
   * Confirmation feedback when speech recognition confidence is low
   * Ask user to confirm before executing
   */
  static confirmation(heard: string, language: "en" | "he" = "en"): FeedbackMessage {
    if (language === "he") {
      return {
        type: "confirmation",
        text: `I heard: "${heard}" - Is that right?`,
        textHe: `שמעתי: "${heard}" - זה נכון?`,
        duration: 5000,
        icon: "help",
        shouldSpeak: false,
      };
    }

    return {
      type: "confirmation",
      text: `I heard: "${heard}" - Is that right?`,
      textHe: `שמעתי: "${heard}" - זה נכון?`,
      duration: 5000,
      icon: "help",
      shouldSpeak: false,
    };
  }

  /**
   * Success feedback for completed commands
   * Format: ✓ Action: Result
   */
  static success(
    action: string,
    result: string,
    language: "en" | "he" = "en"
  ): FeedbackMessage {
    const text = `✓ ${action}: ${result}`;
    const textHe = `✓ ${action}: ${result}`;

    return {
      type: "success",
      text,
      textHe,
      duration: 3000,
      icon: "check",
      shouldSpeak: true,
      voiceText: language === "he" ? "בוצע" : "Done",
    };
  }

  /**
   * Error feedback for failed commands
   * Format: ✗ Problem + actionable hint
   */
  static error(
    problem: string,
    hint?: string,
    language: "en" | "he" = "en"
  ): FeedbackMessage {
    let text = `✗ ${problem}`;
    if (hint) text += ` (${hint})`;

    return {
      type: "error",
      text,
      textHe: text,
      duration: 4000,
      icon: "error",
      shouldSpeak: true,
      voiceText: language === "he" ? "שגיאה" : "Error",
    };
  }

  /**
   * Results feedback for query commands
   * Format: Factual count or data only
   */
  static results(
    count: number,
    itemName: string,
    language: "en" | "he" = "en"
  ): FeedbackMessage {
    const plural = count !== 1 ? "s" : "";
    const text = `Found ${count} ${itemName}${plural}`;
    const textHe = `נמצא ${count} ${itemName}`;

    return {
      type: "results",
      text,
      textHe,
      duration: 2500,
      icon: "info",
      shouldSpeak: false,
    };
  }

  /**
   * Info feedback for system messages
   * Format: Brief, no jargon
   */
  static info(message: string, language: "en" | "he" = "en"): FeedbackMessage {
    return {
      type: "info",
      text: message,
      textHe: message,
      duration: 2500,
      icon: "info",
      shouldSpeak: false,
    };
  }

  /**
   * Format success message for specific command types
   * Maps command action → human-readable result
   */
  static forCommand(
    action: string,
    data: Record<string, any>,
    language: "en" | "he" = "en"
  ): FeedbackMessage {
    switch (action) {
      case "create-task":
        return this.success(
          language === "he" ? "משימה" : "Task",
          data.title,
          language
        );

      case "complete-task":
        return this.success(
          language === "he" ? "משימה הושלמה" : "Completed",
          data.taskName,
          language
        );

      case "delete-task":
        return this.success(
          language === "he" ? "משימה נמחקה" : "Deleted",
          data.taskName,
          language
        );

      case "send-message":
        return this.success(
          language === "he" ? "הודעה" : "Message",
          `to ${data.recipient}`,
          language
        );

      case "start-call":
        return this.success(
          language === "he" ? "שיחה" : "Call",
          data.userName,
          language
        );

      case "schedule-event":
        return this.success(
          language === "he" ? "תזמון" : "Scheduled",
          `${data.event} at ${data.time}`,
          language
        );

      case "open-app":
        return this.success(
          language === "he" ? "פתיחה" : "Opening",
          data.app,
          language
        );

      case "search":
        return this.results(
          data.count || 0,
          data.itemName || "result",
          language
        );

      case "list-tasks":
        return this.results(
          data.count || 0,
          language === "he" ? "משימה" : "task",
          language
        );

      default:
        return this.info(data.message || "Command executed", language);
    }
  }

  /**
   * Format error message with actionable hints
   */
  static forError(
    code: string,
    language: "en" | "he" = "en"
  ): FeedbackMessage {
    const errorMap = {
      "no-microphone": {
        en: "Microphone access denied",
        he: "אין גישה למיקרופון",
        hint: "Check browser permissions",
        hintHe: "בדוק הרשאות דפדפן",
      },
      "network-error": {
        en: "Network error",
        he: "שגיאת רשת",
        hint: "Check your connection",
        hintHe: "בדוק את החיבור שלך",
      },
      "speech-error": {
        en: "Didn't catch that",
        he: "לא הבנתי",
        hint: "Try again",
        hintHe: "נסה שוב",
      },
      "invalid-command": {
        en: "Command not recognized",
        he: "הפקודה לא מוכרת",
        hint: "Say 'help' for options",
        hintHe: "אמור 'help' לאפשרויות",
      },
      "task-not-found": {
        en: "Task not found",
        he: "משימה לא נמצאה",
        hint: "Check the task name",
        hintHe: "בדוק את שם המשימה",
      },
      "recipient-not-found": {
        en: "Recipient not found",
        he: "הנמען לא נמצא",
        hint: "Check the name",
        hintHe: "בדוק את השם",
      },
    };

    const error = errorMap[code as keyof typeof errorMap] || {
      en: "Error",
      he: "שגיאה",
      hint: "Try again",
      hintHe: "נסה שוב",
    };

    const hint = language === "he" ? error.hintHe : error.hint;
    const message = language === "he" ? error.he : error.en;

    return this.error(message, hint, language);
  }

  /**
   * Extract command confidence from speech recognition result
   * Returns 0-1, where 1 is very confident
   */
  static calculateConfidence(isFinal: boolean, confidence: number = 1): number {
    // Interim results have lower confidence
    if (!isFinal) return Math.min(confidence, 0.7);
    return confidence;
  }

  /**
   * Check if we should ask for confirmation
   * Returns true if confidence < threshold
   */
  static shouldConfirm(confidence: number, threshold: number = 0.7): boolean {
    return confidence < threshold;
  }
}

/**
 * Hook-friendly factory for creating feedback messages
 */
export function useFeedbackFactory() {
  return {
    listening: () => VoiceFeedbackFormatter.listening(),
    processing: () => VoiceFeedbackFormatter.processing(),
    confirmation: (heard: string, lang?: "en" | "he") =>
      VoiceFeedbackFormatter.confirmation(heard, lang),
    success: (action: string, result: string, lang?: "en" | "he") =>
      VoiceFeedbackFormatter.success(action, result, lang),
    error: (problem: string, hint?: string, lang?: "en" | "he") =>
      VoiceFeedbackFormatter.error(problem, hint, lang),
    results: (count: number, itemName: string, lang?: "en" | "he") =>
      VoiceFeedbackFormatter.results(count, itemName, lang),
    info: (message: string, lang?: "en" | "he") =>
      VoiceFeedbackFormatter.info(message, lang),
    forCommand: (action: string, data: Record<string, any>, lang?: "en" | "he") =>
      VoiceFeedbackFormatter.forCommand(action, data, lang),
    forError: (code: string, lang?: "en" | "he") =>
      VoiceFeedbackFormatter.forError(code, lang),
  };
}
