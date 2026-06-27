/**
 * Hooks Index
 * Centralized exports for all hooks
 *
 * Usage:
 * import { useRealtimeTasks, useVoiceFeedback } from '@/lib/hooks';
 */

// Realtime Hooks
export { useRealtimeTasks } from './useRealtimeTasks';
export type { UseRealtimeTasksReturn } from './useRealtimeTasks';

export { useRealtimeMessages } from './useRealtimeMessages';
export type { UseRealtimeMessagesReturn } from './useRealtimeMessages';

export { useRealtimePresence } from './useRealtimePresence';
export type { UseRealtimePresenceReturn, UserWithPresence } from './useRealtimePresence';

// Voice Feedback Hook
export { useVoiceFeedback } from './useVoiceFeedback';
export type { UseVoiceFeedbackReturn } from './useVoiceFeedback';
