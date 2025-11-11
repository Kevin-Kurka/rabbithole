/**
 * BottomSheet Component
 *
 * Mobile-native modal that slides up from the bottom.
 * Supports snap points, drag gestures, and backdrop dismiss.
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBottomSheet, useBottomSheetDrag, BottomSheetConfig } from '@/hooks/useBottomSheet';
import { useGestures } from '@/hooks/useGestures';
import { mobileTheme } from '@/styles/mobileTheme';

export interface BottomSheetProps extends BottomSheetConfig {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen = false,
  onClose,
  title,
  children,
  showHandle = true,
  showCloseButton = true,
  className = '',
  ...config
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useBottomSheet({
    ...config,
    initialState: isOpen ? 'half' : 'closed',
  });

  const snapPoints = {
    closed: 0,
    peek: config.peekHeight || 100,
    half: config.halfHeight || (typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.4) : 300),
    full: config.fullHeight || (typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.9) : 600),
  };

  const { dragOffset, handleDragStart, handleDragMove, handleDragEnd } = useBottomSheetDrag(
    controls,
    snapPoints
  );

  // Gesture detection
  useGestures(sheetRef, {
    onSwipeDown: () => {
      if (config.closeOnSwipeDown !== false) {
        controls.close();
        onClose?.();
      }
    },
  });

  // Sync external isOpen with internal state
  useEffect(() => {
    if (isOpen && controls.state === 'closed') {
      controls.open('half');
    } else if (!isOpen && controls.state !== 'closed') {
      controls.close();
    }
  }, [isOpen, controls]);

  // Handle backdrop click
  const handleBackdropClick = () => {
    if (config.closeOnBackdropTap !== false) {
      controls.close();
      onClose?.();
    }
  };

  // Prevent body scroll when open
  useEffect(() => {
    if (controls.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [controls.isOpen]);

  if (typeof window === 'undefined') {
    return null;
  }

  const content = (
    <>
      {/* Backdrop */}
      {controls.isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          style={{
            zIndex: mobileTheme.zIndex.modalBackdrop,
            opacity: controls.state === 'closed' ? 0 : 1,
          }}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-xl shadow-2xl transition-transform ${className}`}
        style={{
          zIndex: mobileTheme.zIndex.modal,
          height: `${controls.height + dragOffset}px`,
          transform: controls.state === 'closed' ? 'translateY(100%)' : 'translateY(0)',
          transitionDuration: controls.isDragging ? '0ms' : mobileTheme.animation.normal,
          willChange: 'transform',
          touchAction: 'none',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      >
        {/* Drag Handle */}
        {showHandle && (
          <div
            className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onTouchMove={(e) => {
              if (controls.isDragging) {
                const touch = e.touches[0];
                const startY = parseInt(e.currentTarget.dataset.startY || '0', 10);
                const deltaY = touch.clientY - startY;
                handleDragMove(deltaY);
              }
            }}
            onTouchEnd={(e) => {
              if (controls.isDragging) {
                const touch = e.changedTouches[0];
                const startY = parseInt(e.currentTarget.dataset.startY || '0', 10);
                const deltaY = touch.clientY - startY;
                const timeDelta = Date.now() - parseInt(e.currentTarget.dataset.startTime || '0', 10);
                const velocity = deltaY / timeDelta;
                handleDragEnd(velocity);
              }
            }}
            data-start-y="0"
            data-start-time="0"
          >
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            {title && (
              <h2 id="bottom-sheet-title" className="text-lg font-semibold">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={() => {
                  controls.close();
                  onClose?.();
                }}
                className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${controls.height}px - 80px)` }}>
          {children}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default BottomSheet;
