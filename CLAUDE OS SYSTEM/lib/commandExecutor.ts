/**
 * JARVIS ZERO OS - Command Executor Engine
 *
 * Core execution engine for voice commands.
 * Handles:
 * - Command parsing and validation
 * - Direct Supabase integration
 * - Real-time UI updates
 * - Error handling and retries
 * - Audit logging
 */

import { createClient } from './supabase';
import type { Database } from './supabase';
import type {
  VoiceCommand,
  CommandType,
  CommandResult,
  CommandStatus,
  CreateTaskCommand,
  CompleteTaskCommand,
  DeleteTaskCommand,
  SendMessageCommand,
  CreateEventCommand,
  CommandExecutionOptions,
  ExecutionResponse,
} from '@/types/voiceCommands';
import { CommandStatus as Status } from '@/types/voiceCommands';

// Types
type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type Message = Database['public']['Tables']['messages']['Row'];
type CalendarEvent = Database['public']['Tables']['calendar_events']['Row'];
type WindowRecord = Database['public']['Tables']['app_windows']['Row'];

// ============================================================================
// COMMAND EXECUTOR CLASS
// ============================================================================

export class CommandExecutor {
  private supabase = createClient();
  private executionHistory: Map<string, CommandResult> = new Map();
  private executionCallbacks: Map<string, ((result: CommandResult) => void)[]> = new Map();

  /**
   * Execute a voice command with full validation and error handling
   */
  async execute<T = any>(
    command: VoiceCommand,
    options: CommandExecutionOptions = {}
  ): Promise<ExecutionResponse<T>> {
    const startTime = Date.now();
    const commandId = command.id || this.generateCommandId();

    try {
      console.log(`[CommandExecutor] Executing: ${command.type}`, command);

      // Validate command
      this.validateCommand(command);

      // Set default options
      const opts = {
        showNotification: true,
        updateUI: true,
        retryOnError: true,
        maxRetries: 3,
        timeout: 5000,
        ...options,
      };

      // Execute based on command type
      let result: any;

      switch (command.type) {
        // Task Commands
        case 'create_task':
          result = await this.handleCreateTask(command as CreateTaskCommand, opts);
          break;
        case 'complete_task':
          result = await this.handleCompleteTask(command as CompleteTaskCommand, opts);
          break;
        case 'delete_task':
          result = await this.handleDeleteTask(command as DeleteTaskCommand, opts);
          break;
        case 'show_tasks':
          result = await this.handleShowTasks(command, opts);
          break;
        case 'show_pending_tasks':
          result = await this.handleShowPendingTasks(command, opts);
          break;

        // Message Commands
        case 'send_message':
          result = await this.handleSendMessage(command as SendMessageCommand, opts);
          break;
        case 'read_latest_messages':
          result = await this.handleReadLatestMessages(command, opts);
          break;

        // Calendar Commands
        case 'create_event':
          result = await this.handleCreateEvent(command as CreateEventCommand, opts);
          break;
        case 'show_events':
          result = await this.handleShowEvents(command, opts);
          break;

        // App Commands
        case 'open_tasks':
          result = await this.handleOpenApp(command, 'tasks', opts);
          break;
        case 'open_chat':
          result = await this.handleOpenApp(command, 'messages', opts);
          break;
        case 'open_calendar':
          result = await this.handleOpenApp(command, 'calendar', opts);
          break;
        case 'open_vault':
          result = await this.handleOpenApp(command, 'vault', opts);
          break;

        // Window Commands
        case 'close_window':
          result = await this.handleCloseWindow(command, opts);
          break;
        case 'minimize_window':
          result = await this.handleMinimizeWindow(command, opts);
          break;
        case 'close_all':
          result = await this.handleCloseAll(command, opts);
          break;

        default:
          throw new Error(`Unknown command type: ${command.type}`);
      }

      const executionTime = Date.now() - startTime;

      // Store result in history
      const commandResult: CommandResult = {
        commandId,
        type: command.type,
        status: Status.SUCCESS,
        data: result,
        executionTime,
        timestamp: Date.now(),
      };

      this.executionHistory.set(commandId, commandResult);
      this.notifyListeners(commandId, commandResult);

      console.log(`[CommandExecutor] Success: ${command.type} (${executionTime}ms)`);

      return {
        success: true,
        result,
        metadata: {
          executionTime,
          cached: false,
        },
      };
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const error = err instanceof Error ? err : new Error(String(err));

      console.error(`[CommandExecutor] Error: ${command.type}`, error);

      // Store error result
      const errorResult: CommandResult = {
        commandId,
        type: command.type,
        status: Status.ERROR,
        error: error.message,
        executionTime,
        timestamp: Date.now(),
      };

      this.executionHistory.set(commandId, errorResult);
      this.notifyListeners(commandId, errorResult);

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
          details: error,
        },
        metadata: {
          executionTime,
        },
      };
    }
  }

  // ========================================================================
  // TASK COMMAND HANDLERS
  // ========================================================================

  private async handleCreateTask(
    command: CreateTaskCommand,
    opts: CommandExecutionOptions
  ): Promise<Task> {
    const { title, description, priority, dueDate, ownerId } = command.params;

    if (!title || !ownerId) {
      throw new Error('Task title and owner ID are required');
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .insert([
        {
          title,
          description: description || null,
          priority: priority || 'medium',
          status: 'todo',
          owner_id: ownerId,
          due_date: dueDate || null,
          progress_percentage: 0,
        } as any,
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create task: ${error.message}`);

    return data as Task;
  }

  private async handleCompleteTask(
    command: CompleteTaskCommand,
    opts: CommandExecutionOptions
  ): Promise<boolean> {
    const { taskId } = command.params;

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const { error } = await this.supabase
      .from('tasks')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
      })
      .eq('id', taskId);

    if (error) throw new Error(`Failed to complete task: ${error.message}`);

    return true;
  }

  private async handleDeleteTask(
    command: DeleteTaskCommand,
    opts: CommandExecutionOptions
  ): Promise<boolean> {
    const { taskId } = command.params;

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw new Error(`Failed to delete task: ${error.message}`);

    return true;
  }

  private async handleShowTasks(
    command: VoiceCommand,
    opts: CommandExecutionOptions
  ): Promise<Task[]> {
    const { ownerId } = command.params;

    let query = this.supabase.from('tasks').select('*');

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);

    return data as Task[];
  }

  private async handleShowPendingTasks(
    command: VoiceCommand,
    opts: CommandExecutionOptions
  ): Promise<Task[]> {
    const { ownerId } = command.params;

    let query = this.supabase
      .from('tasks')
      .select('*')
      .in('status', ['todo', 'in_progress', 'blocked']);

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch pending tasks: ${error.message}`);

    return data as Task[];
  }

  // ========================================================================
  // MESSAGE COMMAND HANDLERS
  // ========================================================================

  private async handleSendMessage(
    command: SendMessageCommand,
    opts: CommandExecutionOptions
  ): Promise<Message> {
    const { content, senderId, recipientName } = command.params;

    if (!content || !senderId) {
      throw new Error('Content and sender ID are required');
    }

    const { data, error } = await this.supabase
      .from('messages')
      .insert([
        {
          content,
          message_type: 'text',
          sender_id: senderId,
          channel_name: recipientName || 'direct',
          status: 'sent',
        } as any,
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to send message: ${error.message}`);

    return data as Message;
  }

  private async handleReadLatestMessages(
    command: VoiceCommand,
    opts: CommandExecutionOptions
  ): Promise<Message[]> {
    const { limit = 5 } = command.params;

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);

    return data as Message[];
  }

  // ========================================================================
  // CALENDAR COMMAND HANDLERS
  // ========================================================================

  private async handleCreateEvent(
    command: CreateEventCommand,
    opts: CommandExecutionOptions
  ): Promise<CalendarEvent> {
    const { title, description, startTime, endTime, organizerId } = command.params;

    if (!title || !startTime || !organizerId) {
      throw new Error('Title, start time, and organizer ID are required');
    }

    const { data, error } = await this.supabase
      .from('calendar_events')
      .insert([
        {
          title,
          description: description || null,
          start_time: startTime,
          end_time: endTime || startTime,
          organizer_id: organizerId,
          status: 'scheduled',
          event_type: 'personal',
        } as any,
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create event: ${error.message}`);

    return data as CalendarEvent;
  }

  private async handleShowEvents(
    command: VoiceCommand,
    opts: CommandExecutionOptions
  ): Promise<CalendarEvent[]> {
    const { organizerId } = command.params;

    let query = this.supabase.from('calendar_events').select('*');

    if (organizerId) {
      query = query.eq('organizer_id', organizerId);
    }

    const { data, error } = await query
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true });

    if (error) throw new Error(`Failed to fetch events: ${error.message}`);

    return data as CalendarEvent[];
  }

  // ========================================================================
  // APP COMMAND HANDLERS
  // ========================================================================

  private async handleOpenApp(
    command: VoiceCommand,
    appName: 'tasks' | 'messages' | 'calendar' | 'vault',
    opts: CommandExecutionOptions
  ): Promise<WindowRecord | null> {
    const { userId } = command;

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check if window already exists
    const { data: existing, error: fetchError } = await this.supabase
      .from('app_windows')
      .select('*')
      .eq('user_id', userId)
      .eq('app_name', appName)
      .eq('is_open', true)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing window: ${fetchError.message}`);
    }

    if (existing) {
      // Window already open - bring to focus
      const { error: updateError } = await this.supabase
        .from('app_windows')
        .update({ is_focused: true, last_focused_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) throw new Error(`Failed to focus window: ${updateError.message}`);

      return existing;
    }

    // Create new window
    const { data, error } = await this.supabase
      .from('app_windows')
      .insert([
        {
          window_id: `window-${Date.now()}`,
          user_id: userId,
          app_name: appName,
          is_open: true,
          is_focused: true,
          x: 0,
          y: 0,
          width: 1200,
          height: 800,
          z_index: 1000,
        } as any,
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to open app: ${error.message}`);

    return data as WindowRecord;
  }

  // ========================================================================
  // WINDOW COMMAND HANDLERS
  // ========================================================================

  private async handleCloseWindow(
    command: VoiceCommand,
    opts: CommandExecutionOptions
  ): Promise<boolean> {
    const { userId } = command;

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get the currently focused window
    const { data: windows, error: fetchError } = await this.supabase
      .from('app_windows')
      .select('*')
      .eq('user_id', userId)
      .eq('is_open', true)
      .order('last_focused_at', { ascending: false })
      .limit(1);

    if (fetchError) throw new Error(`Failed to fetch window: ${fetchError.message}`);

    if (!windows || windows.length === 0) {
      throw new Error('No open windows to close');
    }

    const window = windows[0];

    const { error: deleteError } = await this.supabase
      .from('app_windows')
      .update({ is_open: false })
      .eq('id', window.id);

    if (deleteError) throw new Error(`Failed to close window: ${deleteError.message}`);

    return true;
  }

  private async handleMinimizeWindow(
    command: VoiceCommand,
    opts: CommandExecutionOptions
  ): Promise<boolean> {
    const { userId } = command;

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get the currently focused window
    const { data: windows, error: fetchError } = await this.supabase
      .from('app_windows')
      .select('*')
      .eq('user_id', userId)
      .eq('is_open', true)
      .order('last_focused_at', { ascending: false })
      .limit(1);

    if (fetchError) throw new Error(`Failed to fetch window: ${fetchError.message}`);

    if (!windows || windows.length === 0) {
      throw new Error('No open windows to minimize');
    }

    const window = windows[0];

    const { error: updateError } = await this.supabase
      .from('app_windows')
      .update({ is_minimized: true })
      .eq('id', window.id);

    if (updateError) throw new Error(`Failed to minimize window: ${updateError.message}`);

    return true;
  }

  private async handleCloseAll(
    command: VoiceCommand,
    opts: CommandExecutionOptions
  ): Promise<boolean> {
    const { userId } = command;

    if (!userId) {
      throw new Error('User ID is required');
    }

    const { error } = await this.supabase
      .from('app_windows')
      .update({ is_open: false })
      .eq('user_id', userId)
      .eq('is_open', true);

    if (error) throw new Error(`Failed to close all windows: ${error.message}`);

    return true;
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private validateCommand(command: VoiceCommand): void {
    if (!command.type) {
      throw new Error('Command type is required');
    }

    if (!command.id) {
      throw new Error('Command ID is required');
    }
  }

  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register a callback for command execution updates
   */
  onCommandExecuted(
    commandId: string,
    callback: (result: CommandResult) => void
  ): () => void {
    if (!this.executionCallbacks.has(commandId)) {
      this.executionCallbacks.set(commandId, []);
    }

    this.executionCallbacks.get(commandId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.executionCallbacks.get(commandId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(commandId: string, result: CommandResult): void {
    const callbacks = this.executionCallbacks.get(commandId);
    if (callbacks) {
      callbacks.forEach((cb) => cb(result));
    }
  }

  /**
   * Get execution history for a command
   */
  getExecutionHistory(commandId: string): CommandResult | undefined {
    return this.executionHistory.get(commandId);
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory.clear();
  }
}

// Export singleton instance
export const commandExecutor = new CommandExecutor();
