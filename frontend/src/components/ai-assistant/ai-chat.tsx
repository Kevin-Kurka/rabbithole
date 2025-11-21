/**
 * AIChat Component
 *
 * AI-powered chat interface integrated with GraphRAG.
 * Features:
 * - GraphRAG question answering with node citations
 * - Clickable cited nodes that highlight in graph
 * - Vector similarity search
 * - Suggested prompts based on methodology
 * - Message history with loading states
 * - Rate limit display
 * - Error handling and retry
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, Trash2, Search, BookOpen } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { AIMessage } from '@/types/ai-assistant';

export interface AIChatProps {
  graphId: string;
  selectedNodeIds?: string[];
  onNodeClick?: (nodeId: string) => void;
  onNodeHighlight?: (nodeId: string) => void;
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

/**
 * Render message content with cited node links
 */
function MessageContent({
  message,
  onNodeClick,
}: {
  message: AIMessage;
  onNodeClick?: (nodeId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

      {/* Cited Nodes */}
      {message.citedNodes && message.citedNodes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            Referenced nodes:
          </p>
          <div className="space-y-1">
            {message.citedNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => onNodeClick?.(node.id)}
                className="block w-full text-left px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700 rounded transition-colors"
              >
                <div className="font-medium text-blue-400">
                  {node.props.label || node.props.name || node.id}
                </div>
                <div className="text-gray-500 text-[10px] mt-0.5">{node.relevance}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AIChat({
  graphId,
  selectedNodeIds = [],
  onNodeClick,
  onNodeHighlight,
  className = '',
}: AIChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // AI Assistant hook
  const {
    messages,
    loading,
    error,
    remainingRequests,
    suggestedPrompts,
    askQuestion,
    clearHistory,
    retryLast,
  } = useAIAssistant({
    graphId,
    selectedNodeIds,
    onNodeCited: onNodeHighlight,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const query = inputValue;
    setInputValue('');
    setShowPrompts(false);

    await askQuestion(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
    setShowPrompts(false);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">AI Assistant</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Rate limit indicator */}
          <div className="text-xs text-gray-400">
            {remainingRequests} / 10 requests
          </div>

          {/* Clear history button */}
          <button
            onClick={clearHistory}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-3 p-4"
        style={{ maxHeight: 'calc(100% - 140px)' }}
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Timestamp */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${isUser ? 'text-blue-400' : 'text-purple-400'}`}>
                  {isUser ? 'You' : 'AI Assistant'}
                </span>
                <span className="text-xs text-gray-600">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>

              {/* Message bubble */}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100 border border-gray-700'
                }`}
              >
                <MessageContent message={message} onNodeClick={onNodeClick} />
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-start">
            <div className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin">
                  <RefreshCw className="w-4 h-4" />
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex flex-col items-start">
            <div className="bg-red-900/20 border border-red-800 px-3 py-2 rounded-lg max-w-[85%]">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={retryLast}
                className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {showPrompts && suggestedPrompts.length > 0 && (
        <div className="px-4 pb-2 max-h-32 overflow-y-auto border-t border-gray-800">
          <p className="text-xs text-gray-400 mb-2 mt-2">Suggested questions:</p>
          <div className="space-y-1">
            {suggestedPrompts.slice(0, 5).map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                className="block w-full text-left px-2 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors text-gray-300"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-2">
          {/* Show prompts button */}
          <button
            onClick={() => setShowPrompts(!showPrompts)}
            className={`p-2 rounded-lg transition-colors ${
              showPrompts
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            title="Show suggested prompts"
          >
            <Search className="w-4 h-4 text-white" />
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your graph..."
            disabled={loading}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="Ask AI (Enter)"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Character count */}
        <div className="mt-1 text-xs text-gray-600 text-right">
          {inputValue.length} / 1000
        </div>
      </div>
    </div>
  );
}

export default AIChat;
