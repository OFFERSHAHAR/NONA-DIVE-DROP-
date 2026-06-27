/**
 * JARVIS ZERO OS - Voice Command Executor Component
 *
 * Integration component for executing voice commands with real-time UI updates.
 * Handles command parsing, execution, and notification display.
 *
 * Features:
 * ✅ Parse voice input into commands
 * ✅ Execute commands instantly
 * ✅ Show loading states
 * ✅ Display results in toast notifications
 * ✅ Handle errors gracefully
 * ✅ Update app state in real-time
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { useCommandExecution, parseVoiceInput, formatCommandResult } from '@/hooks/useCommandExecution';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import type { VoiceCommand } from '@/types/voiceCommands';

interface VoiceCommandExecutorProps {
  userId: string;
  onCommandExecuted?: (result: any) => void;
  onError?: (error: string) => void;
}

interface ExecutionNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: number;
  duration?: number;
}

/**
 * Voice Command Executor Component
 * Wire this into your VoiceControl component
 */
export function VoiceCommandExecutor({
  userId,
  onCommandExecuted,
  onError,
}: VoiceCommandExecutorProps) {
  const { executeCommand, isLoading, error } = useCommandExecution();
  const { tasks, addTask, markComplete, deleteTask } = useRealtimeTasks(userId);
  const { messages, sendMessage } = useRealtimeMessages(userId);

  const [notifications, setNotifications] = useState<ExecutionNotification[]>([]);

  /**
   * Add notification to queue
   */
  const addNotification = useCallback(
    (
      type: 'success' | 'error' | 'info' | 'warning',
      message: string,
      duration = 3000
    ) => {
      const id = `notif-${Date.now()}`;
      const notification: ExecutionNotification = {
        id,
        type,
        message,
        timestamp: Date.now(),
        duration,
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-remove notification
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  /**
   * Execute a voice command from VoiceControl
   * This is the main entry point for voice commands
   */
  const executeVoiceCommand = useCallback(
    async (voiceInput: string) => {
      try {
        // Parse the voice input into a command
        const command = parseVoiceInput(voiceInput, userId);

        if (!command) {
          addNotification('warning', `Unknown command: ${voiceInput}`);
          onError?.(`Unknown command: ${voiceInput}`);
          return null;
        }

        addNotification('info', `Executing: ${command.type}`);

        // Execute the command
        const response = await executeCommand(command, {
          showNotification: false, // We'll handle notifications manually
          updateUI: true,
          retryOnError: true,
          maxRetries: 2,
          timeout: 5000,
        });

        // Handle response
        if (response.success) {
          const message = formatCommandResult({ ...command, status: 'success', data: response.result, executionTime: 0, timestamp: Date.now(), type: command.type });
          addNotification('success', `${command.type}: ${message}`);
          onCommandExecuted?.(response.result);
          return response.result;
        } else {
          const errorMsg = response.error?.message || 'Command execution failed';
          addNotification('error', `${command.type} failed: ${errorMsg}`);
          onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        addNotification('error', `Execution error: ${errorMsg}`);
        onError?.(errorMsg);
        console.error('[VoiceCommandExecutor] Error:', err);
        return null;
      }
    },
    [userId, executeCommand, addNotification, onCommandExecuted, onError]
  );

  /**
   * Listen for voice commands from VoiceControl
   * Dispatch this from your VoiceControl component
   */
  useEffect(() => {
    const handleVoiceCommand = (event: CustomEvent<{ text: string }>) => {
      executeVoiceCommand(event.detail.text);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('voice-command' as any, handleVoiceCommand as EventListener);
      return () => {
        window.removeEventListener('voice-command' as any, handleVoiceCommand as EventListener);
      };
    }
  }, [executeVoiceCommand]);

  return (
    <VoiceCommandNotificationCenter
      notifications={notifications}
      isLoading={isLoading}
      error={error}
    />
  );
}

/**
 * Notification Center for displaying command execution results
 */
interface NotificationCenterProps {
  notifications: ExecutionNotification[];
  isLoading: boolean;
  error: string | null;
}

function VoiceCommandNotificationCenter({
  notifications,
  isLoading,
  error,
}: NotificationCenterProps) {
  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-md">
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Executing command...</span>
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Notifications */}
      {notifications.map((notif) => (
        <NotificationToast key={notif.id} notification={notif} />
      ))}
    </div>
  );
}

/**
 * Individual notification toast
 */
interface NotificationToastProps {
  notification: ExecutionNotification;
}

function NotificationToast({ notification }: NotificationToastProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div
      className={`flex items-center gap-2 ${getColor(notification.type)} text-white px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-5 duration-300`}
      role="alert"
    >
      <span className="text-lg font-bold">{getIcon(notification.type)}</span>
      <span className="flex-1 text-sm">{notification.message}</span>
    </div>
  );
}

/**
 * Hook to dispatch voice commands from anywhere in the app
 * Usage in a component:
 * const { dispatchVoiceCommand } = useVoiceCommandDispatcher();
 * dispatchVoiceCommand("Create task: Buy groceries");
 */
export function useVoiceCommandDispatcher() {
  return {
    dispatchVoiceCommand: (text: string) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('voice-command', { detail: { text } }));
      }
    },
  };
}

/**
 * Quick command templates for common operations
 */
export const VOICE_COMMAND_TEMPLATES = {
  // Task templates
  createTask: (title: string) => `Create task: ${title}`,
  completeTask: (taskId: string) => `Complete task ${taskId}`,
  deleteTask: (taskId: string) => `Delete task ${taskId}`,
  showTasks: () => 'Show tasks',
  showPendingTasks: () => 'Show pending tasks',

  // Message templates
  sendMessage: (recipientName: string, text: string) => `Send message to ${recipientName}: ${text}`,
  readMessages: () => 'Read latest messages',

  // App templates
  openTasks: () => 'Open tasks',
  openChat: () => 'Open chat',
  openCalendar: () => 'Open calendar',
  openVault: () => 'Open vault',

  // Calendar templates
  createEvent: (title: string) => `Create event: ${title}`,
  showEvents: () => 'Show events',

  // Window templates
  closeWindow: () => 'Close this window',
  minimize: () => 'Minimize',
  closeAll: () => 'Close all',
};

/**
 * Example usage in a component:
 *
 * function MyComponent() {
 *   const { dispatchVoiceCommand } = useVoiceCommandDispatcher();
 *
 *   const handleCreateTask = () => {
 *     dispatchVoiceCommand(VOICE_COMMAND_TEMPLATES.createTask('Buy groceries'));
 *   };
 *
 *   return (
 *     <button onClick={handleCreateTask}>
 *       Create Task
 *     </button>
 *   );
 * }
 */
