/**
 * Chat Component
 *
 * Real-time chat interface for collaborative graph editing.
 * Features:
 * - Scrollable message list with auto-scroll
 * - Input box with send button
 * - Username and timestamp display
 * - Keyboard shortcuts (Enter to send)
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/collaboration';
import { Send } from 'lucide-react';

export interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  currentUserId?: string;
  className?: string;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // If today, show only time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // If this year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Otherwise, show full date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function Chat({
  messages,
  onSendMessage,
  currentUserId,
  className = '',
}: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);

    try {
      await onSendMessage(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-900"
        style={{ maxHeight: 'calc(100% - 80px)' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.userId === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex flex-col ${
                  isCurrentUser ? 'items-end' : 'items-start'
                }`}
              >
                {/* Username and timestamp */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium ${
                      isCurrentUser ? 'text-blue-400' : 'text-gray-400'
                    }`}
                  >
                    {isCurrentUser ? 'You' : message.username}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
