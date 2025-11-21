/**
 * useGraphHistory Hook
 *
 * Manages undo/redo history for graph operations.
 * Provides a clean API for tracking and reverting changes.
 */

import { useState, useCallback } from 'react';
import type { HistoryItem } from '@/types/graph';

const MAX_HISTORY_SIZE = 50;

interface UseGraphHistoryResult {
  history: HistoryItem[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  addToHistory: (item: HistoryItem) => void;
  undo: () => HistoryItem | null;
  redo: () => HistoryItem | null;
  clearHistory: () => void;
}

/**
 * Hook for managing graph operation history (undo/redo)
 */
export function useGraphHistory(): UseGraphHistoryResult {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  /**
   * Add a new operation to history
   */
  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);

      // Add new item
      newHistory.push(item);

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }

      return newHistory;
    });

    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [historyIndex]);

  /**
   * Undo the last operation
   */
  const undo = useCallback((): HistoryItem | null => {
    if (!canUndo) return null;

    const item = history[historyIndex];
    setHistoryIndex((prev) => prev - 1);
    return item;
  }, [canUndo, history, historyIndex]);

  /**
   * Redo the next operation
   */
  const redo = useCallback((): HistoryItem | null => {
    if (!canRedo) return null;

    const item = history[historyIndex + 1];
    setHistoryIndex((prev) => prev + 1);
    return item;
  }, [canRedo, history, historyIndex]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    historyIndex,
    canUndo,
    canRedo,
    addToHistory,
    undo,
    redo,
    clearHistory,
  };
}
