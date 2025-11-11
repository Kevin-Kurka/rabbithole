/**
 * SwipeableCard Component
 *
 * Card with swipe-to-reveal actions (like iOS mail).
 * Swipe left to reveal delete, swipe right to reveal favorite/archive.
 */

'use client';

import React, { useRef, useState } from 'react';
import { Trash2, Star, Archive, ChevronRight, LucideIcon } from 'lucide-react';
import { useGestures } from '@/hooks/useGestures';
import { mobileTheme } from '@/styles/mobileTheme';

export interface SwipeAction {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

export interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];   // Swipe right to reveal
  rightActions?: SwipeAction[];  // Swipe left to reveal
  onTap?: () => void;
  className?: string;
}

const DEFAULT_LEFT_ACTIONS: SwipeAction[] = [
  {
    id: 'favorite',
    label: 'Favorite',
    icon: Star,
    color: 'bg-yellow-500',
    onClick: () => console.log('Favorited'),
  },
];

const DEFAULT_RIGHT_ACTIONS: SwipeAction[] = [
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    color: 'bg-blue-500',
    onClick: () => console.log('Archived'),
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    color: 'bg-destructive',
    onClick: () => console.log('Deleted'),
  },
];

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftActions = DEFAULT_LEFT_ACTIONS,
  rightActions = DEFAULT_RIGHT_ACTIONS,
  onTap,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [actionTriggered, setActionTriggered] = useState(false);

  const actionWidth = 80; // Width of each action button
  const leftActionsWidth = leftActions.length * actionWidth;
  const rightActionsWidth = rightActions.length * actionWidth;
  const triggerThreshold = 0.5; // 50% of actions width to trigger

  // Handle swipe gestures
  const gesture = useGestures(cardRef, {
    onSwipe: (direction, velocity) => {
      // Determine if action should be triggered
      const offset = Math.abs(swipeOffset);
      const threshold =
        direction === 'left' ? rightActionsWidth * triggerThreshold : leftActionsWidth * triggerThreshold;

      if (offset > threshold || velocity > 1) {
        // Trigger the nearest action
        if (direction === 'left' && rightActions.length > 0) {
          const actionIndex = Math.min(
            Math.floor(offset / actionWidth),
            rightActions.length - 1
          );
          rightActions[actionIndex].onClick();
          setActionTriggered(true);
        } else if (direction === 'right' && leftActions.length > 0) {
          const actionIndex = Math.min(
            Math.floor(offset / actionWidth),
            leftActions.length - 1
          );
          leftActions[actionIndex].onClick();
          setActionTriggered(true);
        }
      }

      // Reset
      setTimeout(() => {
        setSwipeOffset(0);
        setActionTriggered(false);
      }, 200);
    },
  });

  // Update offset during swipe
  React.useEffect(() => {
    if (gesture.isActive && !actionTriggered) {
      const newOffset = Math.max(
        -rightActionsWidth,
        Math.min(leftActionsWidth, gesture.deltaX)
      );
      setSwipeOffset(newOffset);
    }
  }, [gesture.deltaX, gesture.isActive, actionTriggered, leftActionsWidth, rightActionsWidth]);

  const handleTap = () => {
    if (swipeOffset === 0 && onTap) {
      onTap();
    } else {
      // Close actions if open
      setSwipeOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden bg-background">
      {/* Left Actions (revealed by swiping right) */}
      {leftActions.length > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 flex"
          style={{ width: `${leftActionsWidth}px` }}
        >
          {leftActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setSwipeOffset(0);
                }}
                className={`${action.color} text-white flex flex-col items-center justify-center`}
                style={{ width: `${actionWidth}px` }}
                aria-label={action.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right Actions (revealed by swiping left) */}
      {rightActions.length > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 flex"
          style={{ width: `${rightActionsWidth}px` }}
        >
          {rightActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setSwipeOffset(0);
                }}
                className={`${action.color} text-white flex flex-col items-center justify-center`}
                style={{ width: `${actionWidth}px` }}
                aria-label={action.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Card Content */}
      <div
        ref={cardRef}
        onClick={handleTap}
        className={`relative bg-background border-b border-border ${className}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: gesture.isActive ? 'none' : `transform ${mobileTheme.animation.fast}`,
        }}
      >
        {children}

        {/* Swipe Indicator */}
        {swipeOffset === 0 && onTap && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <ChevronRight className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeableCard;
