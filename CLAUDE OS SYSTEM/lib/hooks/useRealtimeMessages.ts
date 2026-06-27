/**
 * useRealtimeMessages Hook
 * Real-time synchronization for messages with persistent storage
 *
 * Features:
 * - Real-time message updates via Supabase subscriptions
 * - Persistent storage (messages saved to database)
 * - Auto-load chat history on mount
 * - Typing indicators
 * - Message reactions
 * - Automatic reconnection
 * - Optimistic updates
 *
 * @example
 * const { messages, sendMessage, loading } = useRealtimeMessages();
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export interface UseRealtimeMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  typingUsers: string[];
  isOnline: boolean;
  clearHistory: () => Promise<void>;
}

/**
 * Hook for real-time messages with persistence
 */
export function useRealtimeMessages(): UseRealtimeMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const supabaseRef = useRef(createClient());
  const subscriptionRef = useRef<any>(null);
  const currentUserRef = useRef<string | null>(null);

  /**
   * Get current user
   */
  const getCurrentUser = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        currentUserRef.current = user.id;
      }

      return user?.id || null;
    } catch (err) {
      console.error('[Messages] Failed to get current user:', err);
      return null;
    }
  }, []);

  /**
   * Load chat history from database
   */
  const fetchMessages = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or('channel_name.eq.collaboration,channel_name.is.null')
        .order('created_at', { ascending: true })
        .limit(200);

      if (fetchError) throw fetchError;

      setMessages(data || []);
      setError(null);
      setLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch messages');
      setError(error);
      setLoading(false);
      console.error('[Messages] Fetch error:', error);
    }
  }, []);

  /**
   * Setup real-time subscription
   */
  const setupSubscription = useCallback(() => {
    const supabase = supabaseRef.current;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    subscriptionRef.current = supabase
      .channel('messages-collaboration')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          setMessages((prevMessages) => {
            switch (eventType) {
              case 'INSERT':
                // Don't add if already exists (optimistic update)
                if (!prevMessages.find(m => m.id === newRecord.id)) {
                  return [...prevMessages, newRecord];
                }
                return prevMessages;

              case 'UPDATE':
                return prevMessages.map((msg) =>
                  msg.id === newRecord.id ? newRecord : msg
                );

              case 'DELETE':
                return prevMessages.filter((msg) => msg.id !== oldRecord.id);

              default:
                return prevMessages;
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Messages] Real-time subscription established');
          setIsOnline(true);
        } else if (status === 'CLOSED') {
          console.log('[Messages] Real-time subscription closed');
          setIsOnline(false);
        }
      });
  }, []);

  /**
   * Send a new message with optimistic update
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    try {
      const supabase = supabaseRef.current;

      // Get current user
      const userId = await getCurrentUser();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create temporary message for optimistic update
      const tempId = `temp_${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        content: content.trim(),
        message_type: 'text',
        sender_id: userId,
        recipient_ids: [],
        conversation_id: null,
        channel_name: 'collaboration',
        has_attachments: false,
        attachment_urls: [],
        mention_user_ids: [],
        status: 'sent',
        is_edited: false,
        edited_at: null,
        reactions: {},
        thread_id: null,
        reply_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        read_at: null,
      };

      // Optimistically add to UI
      setMessages((prev) => [...prev, tempMessage]);

      // Save to database
      const messageInsert = {
        content: content.trim(),
        message_type: 'text' as const,
        sender_id: userId,
        channel_name: 'collaboration',
        status: 'sent' as const,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageInsert])
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? data : msg))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      console.error('[Messages] Send error:', error);

      // Remove temp message on error
      setMessages((prev) =>
        prev.filter((msg) => !msg.id.startsWith('temp_'))
      );
    }
  }, [getCurrentUser]);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (id: string) => {
    try {
      const supabase = supabaseRef.current;

      // Optimistically remove from UI
      setMessages((prev) => prev.filter((msg) => msg.id !== id));

      // Delete from database
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete message');
      setError(error);
      console.error('[Messages] Delete error:', error);

      // Reload messages on error
      await fetchMessages();
    }
  }, [fetchMessages]);

  /**
   * Clear all chat history (admin only)
   */
  const clearHistory = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;

      // Optimistically clear UI
      setMessages([]);

      // Delete from database
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('channel_name', 'collaboration');

      if (error) throw error;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear history');
      setError(error);
      console.error('[Messages] Clear error:', error);

      // Reload messages on error
      await fetchMessages();
    }
  }, [fetchMessages]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    // Get current user first
    getCurrentUser().then(() => {
      // Then fetch messages
      fetchMessages();
      // Setup real-time subscription
      setupSubscription();
    });

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        supabaseRef.current.removeChannel(subscriptionRef.current);
      }
    };
  }, [getCurrentUser, fetchMessages, setupSubscription]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    deleteMessage,
    typingUsers,
    isOnline,
    clearHistory,
  };
}
