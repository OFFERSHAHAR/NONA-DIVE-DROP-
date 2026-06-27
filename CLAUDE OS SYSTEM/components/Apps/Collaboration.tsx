"use client";

import { Send, User, Clock, Trash2, AlertCircle, Loader } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";

export function Collaboration() {
  const {
    messages,
    loading,
    error,
    sendMessage,
    deleteMessage,
    isOnline,
    clearHistory,
  } = useRealtimeMessages();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!inputValue.trim() || isSending) return;

    try {
      setIsSending(true);
      await sendMessage(inputValue);
      setInputValue("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setInputValue(e.currentTarget.value);
  };

  const handleDeleteMessage = async (id: string) => {
    if (window.confirm("Delete this message?")) {
      try {
        await deleteMessage(id);
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Clear all chat history? This cannot be undone.")) {
      try {
        await clearHistory();
      } catch (err) {
        console.error("Failed to clear history:", err);
      }
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "now";
    }
  };

  const getSenderName = (senderId: string) => {
    // In a real app, this would look up the user
    // For now, we'll detect if it's the current user
    return senderId === "aur" ? "Aur" : "You";
  };

  return (
    <div
      className="p-6 h-full bg-gradient-to-br from-os-bg to-os-panel flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Collaboration</h1>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-green-500" : "bg-gray-500"
              }`}
            />
            <span className="text-xs text-gray-400">
              {isOnline ? "Connected" : "Reconnecting..."}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 bg-os-primary rounded-full border border-os-bg flex items-center justify-center flex-shrink-0 text-xs font-bold">
              You
            </div>
            <div className="w-8 h-8 bg-os-accent rounded-full border border-os-bg flex items-center justify-center flex-shrink-0 text-xs font-bold">
              Aur
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearHistory();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-4 pr-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-os-primary" />
              <p className="text-sm text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-400 text-sm">No messages yet. Start a conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.sender_id !== "aur";
            const senderName = getSenderName(msg.sender_id);

            return (
              <div
                key={msg.id}
                className={`flex gap-3 group ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs break-words ${
                    isOwnMessage
                      ? "bg-os-primary text-white"
                      : "bg-os-hover text-gray-100"
                  } rounded-lg px-4 py-2 shadow-sm relative`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 text-os-accent">
                      {senderName}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <div className="flex items-center gap-1 mt-1 justify-between">
                    <p className="text-xs opacity-70 flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {formatTime(msg.created_at)}
                    </p>
                    {msg.is_edited && (
                      <span className="text-xs opacity-60">(edited)</span>
                    )}
                  </div>
                </div>

                {/* Delete button (hover) */}
                {isOwnMessage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(msg.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1"
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="flex gap-2 flex-shrink-0"
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          disabled={isSending || !isOnline}
          className="flex-1 bg-os-hover border border-os-hover rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-os-primary transition-colors disabled:opacity-50"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSendMessage(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={isSending || !isOnline || !inputValue.trim()}
          className="px-3 py-2 bg-os-primary hover:bg-os-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0 flex items-center gap-1"
          type="button"
        >
          {isSending ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
