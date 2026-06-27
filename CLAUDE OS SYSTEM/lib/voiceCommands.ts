/**
 * Voice Command Parser - JARVIS-style command recognition
 * Parses natural language into structured commands with high confidence
 * NOT a chatbot - pure command-based intent detection
 */

export interface ParsedCommand {
  intent: CommandIntent;
  action: string;
  parameters: Record<string, any>;
  confidence: number;
  requiresConfirmation: boolean;
  alternativeInterpretations?: string[];
}

export enum CommandIntent {
  // Task Management
  CREATE_TASK = "create_task",
  LIST_TASKS = "list_tasks",
  COMPLETE_TASK = "complete_task",
  DELETE_TASK = "delete_task",
  UPDATE_TASK = "update_task",

  // Messaging
  SEND_MESSAGE = "send_message",
  SHOW_MESSAGES = "show_messages",

  // Calendar/Events
  CREATE_EVENT = "create_event",
  SHOW_CALENDAR = "show_calendar",
  LIST_EVENTS = "list_events",

  // Navigation/Apps
  OPEN_APP = "open_app",
  CLOSE_APP = "close_app",
  CLOSE_ALL = "close_all",

  // Vault/Notes
  SEARCH_VAULT = "search_vault",
  CREATE_NOTE = "create_note",

  // System
  SHOW_TIME = "show_time",
  SHOW_HELP = "show_help",
  LOCK_SCREEN = "lock_screen",

  // Fallback
  UNKNOWN = "unknown",
}

interface CommandPattern {
  keywords: string[];
  intent: CommandIntent;
  parameterExtractor: (text: string) => Record<string, any>;
}

/**
 * Command pattern library - maps natural language to intents
 */
const COMMAND_PATTERNS: CommandPattern[] = [
  // CREATE TASK variants
  {
    keywords: ["create task", "add task", "new task", "create a task", "add a task"],
    intent: CommandIntent.CREATE_TASK,
    parameterExtractor: (text) => {
      // Extract text after the trigger keywords
      const triggers = ["create task", "add task", "new task"];
      let title = "";
      for (const trigger of triggers) {
        const regex = new RegExp(`${trigger}[:\\s]+(.+?)(?:$|\\.|\\?|,)`, "i");
        const match = text.match(regex);
        if (match?.[1]) {
          title = match[1].trim();
          break;
        }
      }
      return { title, description: "" };
    },
  },

  // LIST TASKS variants
  {
    keywords: ["show my tasks", "list tasks", "what tasks", "my tasks", "show tasks"],
    intent: CommandIntent.LIST_TASKS,
    parameterExtractor: () => ({}),
  },

  // COMPLETE TASK variants - handles number extraction (3rd, task 3, task number 3)
  {
    keywords: ["complete task", "finish task", "mark done", "done", "check off", "complete"],
    intent: CommandIntent.COMPLETE_TASK,
    parameterExtractor: (text) => {
      // Extract task number: "complete task 3" or "complete the 3rd task"
      let taskId = "";
      let taskName = "";

      // Try number extraction: "task 3", "task number 3", "3rd", "3rd task"
      const numberMatch = text.match(/(?:task\s+(?:number\s+)?)?(\d+)(?:st|nd|rd|th)?/i);
      if (numberMatch?.[1]) {
        taskId = numberMatch[1];
      }

      // Try name extraction: "complete task [name]"
      const nameMatch = text.match(/complete\s+(?:task\s+)?(.+?)(?:$|\.|\?|,)/i);
      if (nameMatch?.[1]) {
        taskName = nameMatch[1].trim();
      }

      return { taskId, taskName };
    },
  },

  // DELETE TASK variants
  {
    keywords: ["delete task", "remove task", "trash task", "discard task"],
    intent: CommandIntent.DELETE_TASK,
    parameterExtractor: (text) => {
      const numberMatch = text.match(/(?:task\s+)?(\d+)/i);
      const taskId = numberMatch?.[1] || "";
      return { taskId };
    },
  },

  // UPDATE TASK (rename, reschedule, etc.)
  {
    keywords: ["update task", "rename task", "reschedule", "change task"],
    intent: CommandIntent.UPDATE_TASK,
    parameterExtractor: (text) => {
      const numberMatch = text.match(/task\s+(\d+)/i);
      const taskId = numberMatch?.[1] || "";
      return { taskId, updates: {} };
    },
  },

  // SEND MESSAGE variants
  {
    keywords: ["send message", "send to", "tell", "message", "send"],
    intent: CommandIntent.SEND_MESSAGE,
    parameterExtractor: (text) => {
      // Match: "send message to [name]: [message]" or "send [message] to [name]"
      let recipient = "";
      let message = "";

      // Pattern: "send [message] to [name]"
      const toPattern = /send\s+(?:message\s+)?(?:to\s+)?(.+?)\s*:\s*(.+)/i;
      const toMatch = text.match(toPattern);
      if (toMatch) {
        recipient = toMatch[1].trim();
        message = toMatch[2].trim();
      } else {
        // Pattern: "send to [name] [message]"
        const simplePattern = /send\s+to\s+(.+?)\s+(.+?)(?:$|\.)/i;
        const simpleMatch = text.match(simplePattern);
        if (simpleMatch) {
          recipient = simpleMatch[1].trim();
          message = simpleMatch[2].trim();
        }
      }

      return { recipient, message };
    },
  },

  // SHOW MESSAGES
  {
    keywords: ["show messages", "read messages", "my messages"],
    intent: CommandIntent.SHOW_MESSAGES,
    parameterExtractor: () => ({}),
  },

  // CREATE EVENT variants
  {
    keywords: ["schedule", "book meeting", "create event", "schedule meeting"],
    intent: CommandIntent.CREATE_EVENT,
    parameterExtractor: (text) => {
      // Match: "schedule [event] at [time]" or "schedule [event] on [date]"
      const match = text.match(
        /schedule\s+(.+?)\s+(?:at|on)\s+(.+?)(?:$|\.|\?|,)/i
      );
      return {
        title: match?.[1]?.trim() || "",
        dateTime: match?.[2]?.trim() || "",
      };
    },
  },

  // SHOW CALENDAR
  {
    keywords: ["show calendar", "open calendar", "my calendar"],
    intent: CommandIntent.SHOW_CALENDAR,
    parameterExtractor: () => ({}),
  },

  // OPEN APP variants
  {
    keywords: ["open", "launch", "show", "go to"],
    intent: CommandIntent.OPEN_APP,
    parameterExtractor: (text) => {
      // Extract app name after trigger
      const appMatch = text.match(/(?:open|launch|show|go to)\s+(.+?)(?:$|\.|\?|,)/i);
      const appName = appMatch?.[1]?.trim() || "";
      return { appName };
    },
  },

  // CLOSE APP
  {
    keywords: ["close", "close all", "clear screen"],
    intent: CommandIntent.CLOSE_ALL,
    parameterExtractor: () => ({}),
  },

  // SEARCH VAULT
  {
    keywords: ["search vault", "find note", "search notes"],
    intent: CommandIntent.SEARCH_VAULT,
    parameterExtractor: (text) => {
      const queryMatch = text.match(/search\s+(?:vault|notes?)?\s*(?:for)?\s*(.+?)(?:$|\.)/i);
      return { query: queryMatch?.[1]?.trim() || "" };
    },
  },

  // CREATE NOTE
  {
    keywords: ["create note", "add note", "new note"],
    intent: CommandIntent.CREATE_NOTE,
    parameterExtractor: (text) => {
      const noteMatch = text.match(/(?:create|add|new)\s+note[:\s]+(.+?)(?:$|\.)/i);
      return { content: noteMatch?.[1]?.trim() || "" };
    },
  },

  // TIME
  {
    keywords: ["what time", "current time", "show time", "time"],
    intent: CommandIntent.SHOW_TIME,
    parameterExtractor: () => ({}),
  },

  // HELP
  {
    keywords: ["help", "what can", "commands"],
    intent: CommandIntent.SHOW_HELP,
    parameterExtractor: () => ({}),
  },

  // LOCK SCREEN
  {
    keywords: ["lock screen", "lock", "logout"],
    intent: CommandIntent.LOCK_SCREEN,
    parameterExtractor: () => ({}),
  },
];

/**
 * Parse voice transcript into structured command
 * Returns null if confidence is too low or command is unrecognized
 */
export function parseVoiceCommand(transcript: string): ParsedCommand | null {
  if (!transcript || transcript.trim().length === 0) {
    return null;
  }

  const normalized = transcript.toLowerCase().trim();
  let bestMatch: {
    pattern: CommandPattern;
    confidence: number;
    matchedKeyword: string;
  } | null = null;

  // Find best matching pattern
  for (const pattern of COMMAND_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword)) {
        // Calculate confidence based on how well the keywords match
        const keywordCount = pattern.keywords.filter((k) =>
          normalized.includes(k)
        ).length;
        const wordMatchCount = keyword.split(" ").filter((w) =>
          normalized.includes(w)
        ).length;
        const confidence = Math.min(
          1,
          (wordMatchCount / keyword.split(" ").length) * (keywordCount * 0.5 + 0.5)
        );

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            pattern,
            confidence,
            matchedKeyword: keyword,
          };
        }
      }
    }
  }

  // If no pattern found or confidence too low
  if (!bestMatch || bestMatch.confidence < 0.6) {
    return {
      intent: CommandIntent.UNKNOWN,
      action: "unknown",
      parameters: { originalText: transcript },
      confidence: bestMatch?.confidence || 0,
      requiresConfirmation: true,
    };
  }

  const parameters = bestMatch.pattern.parameterExtractor(normalized);
  const requiresConfirmation = bestMatch.confidence < 0.85;

  return {
    intent: bestMatch.pattern.intent,
    action: bestMatch.pattern.intent.toLowerCase(),
    parameters,
    confidence: bestMatch.confidence,
    requiresConfirmation,
  };
}

/**
 * Extract a person's name from text (for messaging commands)
 * Handles: "to John", "send to Aur", "tell Sarah", etc.
 */
export function extractPersonName(text: string): string {
  // Common patterns for recipient names
  const namePatterns = [
    /(?:to|tell)\s+([A-Z][a-z]+)/,
    /message\s+([A-Z][a-z]+)/,
    /send\s+(?:to\s+)?([A-Z][a-z]+)/,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

/**
 * Extract task number from various formats:
 * "3", "3rd", "the 3rd", "task 3", "task number 3"
 */
export function extractTaskNumber(text: string): number | null {
  const match = text.match(/(?:task\s+)?(?:number\s+)?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Format a ParsedCommand into human-readable format for confirmation
 */
export function formatCommandForConfirmation(cmd: ParsedCommand): string {
  switch (cmd.intent) {
    case CommandIntent.CREATE_TASK:
      return `Create task: "${cmd.parameters.title}"`;
    case CommandIntent.COMPLETE_TASK:
      return cmd.parameters.taskId
        ? `Complete task #${cmd.parameters.taskId}`
        : `Complete task: "${cmd.parameters.taskName}"`;
    case CommandIntent.DELETE_TASK:
      return `Delete task #${cmd.parameters.taskId}`;
    case CommandIntent.SEND_MESSAGE:
      return `Send message to ${cmd.parameters.recipient}: "${cmd.parameters.message}"`;
    case CommandIntent.OPEN_APP:
      return `Open ${cmd.parameters.appName}`;
    case CommandIntent.CREATE_EVENT:
      return `Schedule "${cmd.parameters.title}" for ${cmd.parameters.dateTime}`;
    case CommandIntent.SEARCH_VAULT:
      return `Search vault for: "${cmd.parameters.query}"`;
    case CommandIntent.CREATE_NOTE:
      return `Create note: "${cmd.parameters.content}"`;
    default:
      return "Execute command";
  }
}

/**
 * Confidence levels for UI feedback
 */
export function getConfidenceLevel(
  confidence: number
): "high" | "medium" | "low" {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}
