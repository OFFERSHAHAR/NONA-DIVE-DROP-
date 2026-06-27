/**
 * Voice Command Processor
 * Parses natural language voice input and dispatches appropriate actions
 */

export interface CommandResult {
  success: boolean;
  message: string;
  messageHe: string;
  action?: string;
  data?: any;
}

export class VoiceCommandProcessor {
  private windowManager: any;
  private taskStore: any;
  private collaborationStore: any;

  constructor(
    windowManager?: any,
    taskStore?: any,
    collaborationStore?: any
  ) {
    this.windowManager = windowManager;
    this.taskStore = taskStore;
    this.collaborationStore = collaborationStore;
  }

  /**
   * Process a voice command and return the result
   */
  async process(transcript: string): Promise<CommandResult> {
    const normalized = transcript.toLowerCase().trim();

    // Navigation commands
    if (this.matchesPattern(normalized, ["open", "launch", "show"])) {
      return this.handleOpenApp(normalized);
    }

    // Task commands
    if (this.matchesPattern(normalized, ["create task", "add task", "new task"])) {
      return this.handleCreateTask(normalized);
    }

    if (this.matchesPattern(normalized, ["complete task", "finish task", "mark done"])) {
      return this.handleCompleteTask(normalized);
    }

    if (this.matchesPattern(normalized, ["list tasks", "show tasks", "my tasks", "tasks"])) {
      return this.handleListTasks(normalized);
    }

    if (this.matchesPattern(normalized, ["delete task", "remove task"])) {
      return this.handleDeleteTask(normalized);
    }

    // Collaboration commands
    if (this.matchesPattern(normalized, ["send message", "send to", "tell"])) {
      return this.handleSendMessage(normalized);
    }

    if (this.matchesPattern(normalized, ["call", "video call", "start meeting"])) {
      return this.handleStartCall(normalized);
    }

    // Calendar commands
    if (this.matchesPattern(normalized, ["schedule", "book", "calendar", "meeting"])) {
      return this.handleScheduleEvent(normalized);
    }

    // System commands
    if (this.matchesPattern(normalized, ["lock screen", "lock", "logout"])) {
      return this.handleLockScreen();
    }

    if (this.matchesPattern(normalized, ["clear screen", "close all", "clear all"])) {
      return this.handleClearScreen();
    }

    if (this.matchesPattern(normalized, ["help", "commands", "what can i"])) {
      return this.handleHelp();
    }

    if (this.matchesPattern(normalized, ["time", "what time", "current time"])) {
      return this.handleTime();
    }

    if (this.matchesPattern(normalized, ["weather", "what is the weather"])) {
      return this.handleWeather();
    }

    // Search commands
    if (this.matchesPattern(normalized, ["search", "find"])) {
      return this.handleSearch(normalized);
    }

    // Default: command not recognized
    return {
      success: false,
      message: `Sorry, I didn't understand: "${transcript}"`,
      messageHe: `סליחה, לא הבנתי: "${transcript}"`,
    };
  }

  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) =>
      text.includes(pattern.toLowerCase())
    );
  }

  private extractValue(text: string, pattern: string): string {
    const regex = new RegExp(`${pattern}\\s+(.+)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  private handleOpenApp(transcript: string): CommandResult {
    const appName = this.extractValue(transcript, "open|launch|show");

    const appMap: { [key: string]: string } = {
      dashboard: "dashboard",
      tasks: "tasks",
      task: "tasks",
      calendar: "calendar",
      vault: "vault",
      settings: "settings",
      collaboration: "collaboration",
      chat: "collaboration",
      messages: "collaboration",
    };

    const app = appMap[appName] || appName.toLowerCase();

    if (this.windowManager?.openWindow) {
      this.windowManager.openWindow(app, appName);
      return {
        success: true,
        message: `Opening ${appName}`,
        messageHe: `פתיחת ${this.translateApp(appName)}`,
        action: "open-app",
        data: { app },
      };
    }

    return {
      success: true,
      message: `Opening ${appName}`,
      messageHe: `פתיחת ${this.translateApp(appName)}`,
      action: "open-app",
      data: { app },
    };
  }

  private handleCreateTask(transcript: string): CommandResult {
    const title = this.extractValue(
      transcript,
      "create task|add task|new task"
    );

    if (!title) {
      return {
        success: false,
        message: "Please specify a task title",
        messageHe: "אנא ציין כותרת משימה",
      };
    }

    if (this.taskStore?.addTask) {
      this.taskStore.addTask({
        title,
        description: "",
        completed: false,
        dueDate: new Date(),
      });
    }

    return {
      success: true,
      message: `Task created: ${title}`,
      messageHe: `משימה נוצרה: ${title}`,
      action: "create-task",
      data: { title },
    };
  }

  private handleCompleteTask(transcript: string): CommandResult {
    const taskName = this.extractValue(
      transcript,
      "complete task|finish task|mark done"
    );

    if (!taskName) {
      return {
        success: false,
        message: "Please specify which task to complete",
        messageHe: "אנא ציין איזו משימה להשלים",
      };
    }

    return {
      success: true,
      message: `Task completed: ${taskName}`,
      messageHe: `משימה הושלמה: ${taskName}`,
      action: "complete-task",
      data: { taskName },
    };
  }

  private handleListTasks(transcript: string): CommandResult {
    return {
      success: true,
      message: "Showing your tasks",
      messageHe: "מציג את המשימות שלך",
      action: "list-tasks",
    };
  }

  private handleDeleteTask(transcript: string): CommandResult {
    const taskName = this.extractValue(transcript, "delete task|remove task");

    if (!taskName) {
      return {
        success: false,
        message: "Please specify which task to delete",
        messageHe: "אנא ציין איזו משימה למחוק",
      };
    }

    return {
      success: true,
      message: `Task deleted: ${taskName}`,
      messageHe: `משימה נמחקה: ${taskName}`,
      action: "delete-task",
      data: { taskName },
    };
  }

  private handleSendMessage(transcript: string): CommandResult {
    const match = transcript.match(
      /send\s+(?:message\s+)?(?:to\s+)?(.+?)(?:\s+message)?\s+(.+)?/i
    );

    if (!match || !match[1]) {
      return {
        success: false,
        message: "Please specify recipient and message",
        messageHe: "אנא ציין נמען והודעה",
      };
    }

    const recipient = match[1].trim();
    const message = match[2]?.trim() || "";

    if (this.collaborationStore?.sendMessage) {
      this.collaborationStore.sendMessage({
        recipientId: recipient,
        message,
      });
    }

    return {
      success: true,
      message: `Message sent to ${recipient}`,
      messageHe: `הודעה נשלחה ל${recipient}`,
      action: "send-message",
      data: { recipient, message },
    };
  }

  private handleStartCall(transcript: string): CommandResult {
    const userName = this.extractValue(transcript, "call|video call|start meeting");

    if (!userName) {
      return {
        success: false,
        message: "Please specify who to call",
        messageHe: "אנא ציין למי להתקשר",
      };
    }

    return {
      success: true,
      message: `Starting call with ${userName}`,
      messageHe: `התחלת שיחה עם ${userName}`,
      action: "start-call",
      data: { userName },
    };
  }

  private handleScheduleEvent(transcript: string): CommandResult {
    const match = transcript.match(
      /schedule\s+(.+?)\s+(?:at|on)\s+(.+)/i
    );

    if (!match || !match[1] || !match[2]) {
      return {
        success: false,
        message: "Please specify event and time",
        messageHe: "אנא ציין אירוע ושעה",
      };
    }

    const event = match[1].trim();
    const time = match[2].trim();

    return {
      success: true,
      message: `Scheduled ${event} at ${time}`,
      messageHe: `תזמנו ${event} בשעה ${time}`,
      action: "schedule-event",
      data: { event, time },
    };
  }

  private handleLockScreen(): CommandResult {
    return {
      success: true,
      message: "Locking screen",
      messageHe: "נעילת מסך",
      action: "lock-screen",
    };
  }

  private handleClearScreen(): CommandResult {
    if (this.windowManager?.closeAllWindows) {
      this.windowManager.closeAllWindows();
    }

    return {
      success: true,
      message: "Closing all windows",
      messageHe: "סגירת כל החלונות",
      action: "clear-screen",
    };
  }

  private handleHelp(): CommandResult {
    return {
      success: true,
      message: "Showing available commands",
      messageHe: "הצגת הפקודות הזמינות",
      action: "show-help",
    };
  }

  private handleTime(): CommandResult {
    const time = new Date().toLocaleTimeString();
    return {
      success: true,
      message: `Current time is ${time}`,
      messageHe: `השעה הנוכחית היא ${time}`,
      action: "show-time",
    };
  }

  private handleWeather(): CommandResult {
    return {
      success: true,
      message: "Fetching weather information",
      messageHe: "קבלת מידע מזג אוויר",
      action: "show-weather",
    };
  }

  private handleSearch(transcript: string): CommandResult {
    const query = this.extractValue(transcript, "search|find");

    if (!query) {
      return {
        success: false,
        message: "Please specify what to search for",
        messageHe: "אנא ציין מה לחפש",
      };
    }

    return {
      success: true,
      message: `Searching for: ${query}`,
      messageHe: `חיפוש עבור: ${query}`,
      action: "search",
      data: { query },
    };
  }

  private translateApp(app: string): string {
    const translations: { [key: string]: string } = {
      dashboard: "דשבורד",
      tasks: "משימות",
      calendar: "לוח שנה",
      vault: "כספת",
      settings: "הגדרות",
      collaboration: "שיתוף פעולה",
    };

    return translations[app.toLowerCase()] || app;
  }
}
