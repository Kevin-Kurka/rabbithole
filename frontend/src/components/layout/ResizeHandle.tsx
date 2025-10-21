"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import { theme } from '@/styles/theme';

export type ResizeDirection = 'horizontal' | 'vertical';
export type ResizeEdge = 'left' | 'right' | 'top' | 'bottom';

export interface ResizeHandleProps {
  /** Direction of resize: horizontal (left/right) or vertical (top/bottom) */
  direction: ResizeDirection;
  /** Which edge to place the handle on */
  edge?: ResizeEdge;
  /** Callback when resize occurs */
  onResize: (delta: number) => void;
  /** Optional className for custom styling */
  className?: string;
  /** Optional minimum size in pixels */
  minSize?: number;
  /** Optional maximum size in pixels */
  maxSize?: number;
}

export default function ResizeHandle({
  direction,
  edge,
  onResize,
  className = '',
  minSize,
  maxSize,
}: ResizeHandleProps) {
  const isDraggingRef = useRef(false);
  const startPositionRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      startPositionRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      const currentPosition = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPosition - startPositionRef.current;

      // Only update if delta is significant (reduces jitter)
      if (Math.abs(delta) < 1) return;

      onResize(delta);
      startPositionRef.current = currentPosition;
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isDraggingRef.current) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize, minSize, maxSize]);

  const isHorizontal = direction === 'horizontal';

  // Determine edge placement
  const defaultEdge = isHorizontal ? 'right' : 'bottom';
  const actualEdge = edge || defaultEdge;

  // Position styles based on edge
  const getPositionStyles = () => {
    if (isHorizontal) {
      return {
        top: 0,
        bottom: 0,
        width: '4px',
        cursor: 'col-resize',
        ...(actualEdge === 'left' ? { left: 0 } : { right: 0 }),
      };
    } else {
      return {
        left: 0,
        right: 0,
        height: '4px',
        cursor: 'row-resize',
        ...(actualEdge === 'top' ? { top: 0 } : { bottom: 0 }),
      };
    }
  };

  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        ...getPositionStyles(),
        backgroundColor: 'transparent',
        zIndex: 10,
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.button.primary.bg;
      }}
      onMouseLeave={(e) => {
        if (!isDraggingRef.current) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    />
  );
}
