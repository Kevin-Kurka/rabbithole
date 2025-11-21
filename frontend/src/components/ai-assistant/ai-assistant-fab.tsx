/**
 * AIAssistantFAB Component
 *
 * Floating Action Button for the AI Assistant
 * - Bottom-right corner positioning
 * - Brain/sparkle icon (lucide-react)
 * - Smooth hover animations
 * - Badge for new suggestions
 * - Tailwind CSS styling
 */

'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { theme } from '@/styles/theme';

export interface AIAssistantFABProps {
  /** Whether the AI panel is currently open */
  isOpen: boolean;
  /** Callback when FAB is clicked */
  onClick: () => void;
  /** Number of unread suggestions */
  suggestionCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Floating Action Button for AI Assistant
 */
export const AIAssistantFAB: React.FC<AIAssistantFABProps> = ({
  isOpen,
  onClick,
  suggestionCount = 0,
  className = '',
}) => {
  const hasSuggestions = suggestionCount > 0;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 ${className}`}
      style={{
        filter: theme.shadows.xl,
      }}
    >
      <button
        onClick={onClick}
        className="relative group"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: theme.radius.full,
          backgroundColor: isOpen ? theme.colors.button.primary.hover : theme.colors.button.primary.bg,
          color: theme.colors.button.primary.text,
          border: `2px solid ${theme.colors.border.primary}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = theme.colors.button.primary.hover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = theme.colors.button.primary.bg;
          }
        }}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        aria-expanded={isOpen}
      >
        {/* Icon with rotation animation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <Sparkles
            size={28}
            strokeWidth={2}
            style={{
              animation: hasSuggestions && !isOpen ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
            }}
          />
        </div>

        {/* Badge for suggestion count */}
        {hasSuggestions && !isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '24px',
              height: '24px',
              borderRadius: theme.radius.full,
              backgroundColor: '#ef4444', // red-500 for visibility
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
              border: `2px solid ${theme.colors.bg.primary}`,
              animation: 'bounce 1s infinite',
            }}
            aria-label={`${suggestionCount} new suggestions`}
          >
            {suggestionCount > 9 ? '9+' : suggestionCount}
          </div>
        )}

        {/* Ripple effect on click */}
        <span
          className="absolute inset-0 rounded-full opacity-0 group-active:opacity-20 transition-opacity"
          style={{
            backgroundColor: theme.colors.interactive.active,
            borderRadius: theme.radius.full,
          }}
        />
      </button>

      {/* Tooltip */}
      <div
        className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
        style={{
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.overlay.modal,
            color: theme.colors.text.primary,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.radius.md,
            fontSize: '14px',
            border: `1px solid ${theme.colors.border.primary}`,
            boxShadow: theme.shadows.md,
          }}
        >
          {isOpen ? 'Close AI Assistant' : 'Ask AI Assistant'}
          {hasSuggestions && !isOpen && (
            <span
              style={{
                marginLeft: theme.spacing.xs,
                color: '#ef4444',
                fontWeight: '600',
              }}
            >
              ({suggestionCount} new)
            </span>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
};
