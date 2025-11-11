/**
 * FAB (Floating Action Button) Component
 *
 * Mobile-native floating action button for primary actions.
 * Supports speed dial (expandable menu) and single action modes.
 */

'use client';

import React, { useState } from 'react';
import { Plus, X, LucideIcon } from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';

export interface FABAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: string;
}

export interface FABProps {
  actions?: FABAction[]; // If provided, shows speed dial menu
  onClick?: () => void;  // If no actions, simple button
  icon?: LucideIcon;
  label?: string;
  color?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  className?: string;
}

export const FAB: React.FC<FABProps> = ({
  actions,
  onClick,
  icon: Icon = Plus,
  label,
  color = 'bg-primary text-primary-foreground',
  position = 'bottom-right',
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  const hasSpeedDial = actions && actions.length > 0;

  // Position styles
  const positionStyles = {
    'bottom-right': 'bottom-[calc(60px+env(safe-area-inset-bottom)+16px)] right-4',
    'bottom-center': 'bottom-[calc(60px+env(safe-area-inset-bottom)+16px)] left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-[calc(60px+env(safe-area-inset-bottom)+16px)] left-4',
  };

  const handleMainClick = () => {
    if (hasSpeedDial) {
      setExpanded(!expanded);
    } else if (onClick) {
      onClick();

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setExpanded(false);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className={`fixed ${positionStyles[position]} ${className}`} style={{ zIndex: mobileTheme.zIndex.sticky }}>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0"
          style={{ zIndex: -1 }}
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Speed Dial Actions */}
      {hasSpeedDial && expanded && (
        <div className="absolute bottom-full right-0 mb-4 flex flex-col gap-3">
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`flex items-center gap-3 ${action.color || 'bg-background text-foreground'} shadow-lg rounded-full pr-4 pl-3 py-3 hover:scale-105 transition-transform`}
                style={{
                  animation: `slideUp ${mobileTheme.animation.fast} ${index * 50}ms forwards`,
                  opacity: 0,
                }}
                aria-label={action.label}
              >
                <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center">
                  <ActionIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={handleMainClick}
        className={`flex items-center justify-center ${color} shadow-lg rounded-full hover:scale-105 active:scale-95 transition-transform ${
          label ? 'pr-6 pl-5 py-4 gap-3' : 'w-14 h-14'
        }`}
        style={{
          minWidth: mobileTheme.touch.large,
          minHeight: mobileTheme.touch.large,
        }}
        aria-label={label || 'Main action'}
        aria-expanded={expanded}
      >
        {hasSpeedDial && expanded ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <Icon className="w-6 h-6" />
            {label && <span className="text-sm font-semibold">{label}</span>}
          </>
        )}
      </button>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FAB;
