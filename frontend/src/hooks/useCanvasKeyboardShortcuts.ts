/**
 * Canvas Keyboard Shortcuts Hook
 *
 * Handles keyboard shortcuts for canvas operations
 */

'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutsConfig {
  onCreateThesis?: (position?: { x: number; y: number }) => void;
  onCreateCitation?: (position?: { x: number; y: number }) => void;
  onCreateReference?: (position?: { x: number; y: number }) => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  enabled?: boolean;
}

export const useCanvasKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  const { enabled = true } = config;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const { ctrlKey, shiftKey, metaKey, key } = event;
      const modKey = ctrlKey || metaKey; // Support both Ctrl (Windows/Linux) and Cmd (Mac)

      // Create node shortcuts
      if (modKey && !shiftKey) {
        switch (key.toLowerCase()) {
          case 't':
            event.preventDefault();
            config.onCreateThesis?.();
            break;
          case 'r':
            event.preventDefault();
            config.onCreateReference?.();
            break;
        }
      }

      // Create citation (Ctrl+Shift+C)
      if (modKey && shiftKey && key.toLowerCase() === 'c') {
        event.preventDefault();
        config.onCreateCitation?.();
      }

      // Delete (Delete or Backspace)
      if ((key === 'Delete' || key === 'Backspace') && !modKey) {
        event.preventDefault();
        config.onDelete?.();
      }

      // Copy (Ctrl+C)
      if (modKey && !shiftKey && key.toLowerCase() === 'c') {
        // Only handle if not already handled by citation shortcut
        if (!shiftKey) {
          config.onCopy?.();
        }
      }

      // Paste (Ctrl+V)
      if (modKey && key.toLowerCase() === 'v') {
        event.preventDefault();
        config.onPaste?.();
      }

      // Undo (Ctrl+Z)
      if (modKey && !shiftKey && key.toLowerCase() === 'z') {
        event.preventDefault();
        config.onUndo?.();
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((modKey && key.toLowerCase() === 'y') || (modKey && shiftKey && key.toLowerCase() === 'z')) {
        event.preventDefault();
        config.onRedo?.();
      }

      // Select All (Ctrl+A)
      if (modKey && key.toLowerCase() === 'a') {
        event.preventDefault();
        config.onSelectAll?.();
      }

      // Zoom shortcuts
      if (modKey) {
        switch (key) {
          case '+':
          case '=':
            event.preventDefault();
            config.onZoomIn?.();
            break;
          case '-':
            event.preventDefault();
            config.onZoomOut?.();
            break;
          case '0':
            event.preventDefault();
            config.onFitView?.();
            break;
        }
      }
    },
    [config, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
};
