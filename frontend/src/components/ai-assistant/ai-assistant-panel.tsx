/**
 * AIAssistantPanel Component
 *
 * Slide-in panel for AI Assistant chat interface
 * - Slides in from the right side
 * - Chat interface with message history
 * - Input for asking questions
 * - Display AI responses with cited nodes
 * - "Thinking" loader during queries
 * - Close button
 * - Proper state management
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { theme } from '@/styles/theme';
import {
  ASK_ASSISTANT,
  AskAssistantData,
  AskAssistantVariables,
  CitedNode,
} from '@/graphql/ai-queries';

export interface AIAssistantPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Current graph ID */
  graphId: string;
  /** Currently selected node IDs */
  selectedNodeIds?: string[];
  /** Additional context for the AI */
  context?: string;
  /** Callback when a cited node is clicked */
  onNodeClick?: (nodeId: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citedNodes?: CitedNode[];
  confidence?: number;
  timestamp: Date;
}

/**
 * AI Assistant Chat Panel
 */
export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  graphId,
  selectedNodeIds = [],
  context,
  onNodeClick,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [askAssistant, { loading: isThinking }] = useMutation<
    AskAssistantData,
    AskAssistantVariables
  >(ASK_ASSISTANT);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isThinking) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    try {
      const { data } = await askAssistant({
        variables: {
          input: {
            graphId,
            question: inputValue,
            selectedNodeIds,
            context,
          },
        },
      });

      if (data?.askAssistant) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.askAssistant.response,
          citedNodes: data.askAssistant.citedNodes,
          confidence: data.askAssistant.confidence,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error asking assistant:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  /**
   * Handle key press in input
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Clear chat history
   */
  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{
            backgroundColor: theme.colors.overlay.backdrop,
            transition: 'opacity 0.3s ease',
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '100vw',
          backgroundColor: theme.colors.bg.secondary,
          borderLeft: `1px solid ${theme.colors.border.primary}`,
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows.xl,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: theme.spacing.lg,
            borderBottom: `1px solid ${theme.colors.border.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: theme.colors.text.primary,
                marginBottom: '4px',
              }}
            >
              AI Assistant
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: theme.colors.text.tertiary,
              }}
            >
              Ask questions about your graph
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: theme.radius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: theme.colors.text.secondary,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close AI Assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: theme.spacing.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.md,
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: theme.spacing.md,
                color: theme.colors.text.tertiary,
                textAlign: 'center',
                padding: theme.spacing.xl,
              }}
            >
              <AlertCircle size={48} opacity={0.5} />
              <div>
                <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No messages yet
                </p>
                <p style={{ fontSize: '14px' }}>
                  Ask me anything about your graph, and I&apos;ll help you explore connections and insights.
                </p>
              </div>
              {selectedNodeIds.length > 0 && (
                <p
                  style={{
                    fontSize: '12px',
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.bg.elevated,
                    borderRadius: theme.radius.md,
                    marginTop: theme.spacing.sm,
                  }}
                >
                  Context: {selectedNodeIds.length} node{selectedNodeIds.length !== 1 ? 's' : ''}{' '}
                  selected
                </p>
              )}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onNodeClick={onNodeClick}
                />
              ))}
              {isThinking && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.bg.elevated,
                    borderRadius: theme.radius.lg,
                    maxWidth: '80%',
                  }}
                >
                  <Loader2
                    size={16}
                    style={{
                      color: theme.colors.text.tertiary,
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span style={{ color: theme.colors.text.tertiary, fontSize: '14px' }}>
                    Thinking...
                  </span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: theme.spacing.lg,
            borderTop: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              style={{
                fontSize: '12px',
                color: theme.colors.text.tertiary,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginBottom: theme.spacing.sm,
                padding: `${theme.spacing.xs} 0`,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.colors.text.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.colors.text.tertiary;
              }}
            >
              Clear chat history
            </button>
          )}

          <div
            style={{
              display: 'flex',
              gap: theme.spacing.sm,
              alignItems: 'center',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              disabled={isThinking}
              style={{
                flex: 1,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.input.bg,
                border: `1px solid ${theme.colors.input.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.text.primary,
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.input.focus;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.input.border;
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isThinking}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.button.primary.bg,
                color: theme.colors.button.primary.text,
                border: 'none',
                cursor: inputValue.trim() && !isThinking ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: inputValue.trim() && !isThinking ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (inputValue.trim() && !isThinking) {
                  e.currentTarget.style.backgroundColor = theme.colors.button.primary.hover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.button.primary.bg;
              }}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

/**
 * Individual message bubble component
 */
const MessageBubble: React.FC<{
  message: Message;
  onNodeClick?: (nodeId: string) => void;
}> = ({ message, onNodeClick }) => {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: theme.spacing.xs,
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: isUser ? theme.colors.button.primary.bg : theme.colors.bg.elevated,
          color: theme.colors.text.primary,
          fontSize: '14px',
          lineHeight: '1.5',
        }}
      >
        {message.content}

        {/* Confidence indicator */}
        {!isUser && message.confidence !== undefined && (
          <div
            style={{
              marginTop: theme.spacing.sm,
              paddingTop: theme.spacing.sm,
              borderTop: `1px solid ${theme.colors.border.primary}`,
              fontSize: '12px',
              color: theme.colors.text.tertiary,
            }}
          >
            Confidence: {(message.confidence * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Cited nodes */}
      {message.citedNodes && message.citedNodes.length > 0 && (
        <div
          style={{
            maxWidth: '80%',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xs,
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary,
              fontWeight: '500',
            }}
          >
            Referenced nodes:
          </p>
          {message.citedNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onNodeClick?.(node.id)}
              style={{
                padding: theme.spacing.sm,
                backgroundColor: theme.colors.bg.elevated,
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.sm,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.bg.elevated;
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '13px',
                    color: theme.colors.text.primary,
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {(node.props.label as string) || node.id}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: theme.colors.text.tertiary,
                  }}
                >
                  Relevance: {(node.relevance * 100).toFixed(0)}%
                </p>
              </div>
              <ExternalLink size={14} style={{ color: theme.colors.text.tertiary }} />
            </button>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <span
        style={{
          fontSize: '11px',
          color: theme.colors.text.tertiary,
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
        }}
      >
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};
