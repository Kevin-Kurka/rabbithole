/**
 * useBottomSheet Hook
 *
 * Controls bottom sheet state and animations.
 * Bottom sheets are mobile-native modals that slide up from the bottom.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export type BottomSheetState = 'closed' | 'peek' | 'half' | 'full';

export interface BottomSheetConfig {
  initialState?: BottomSheetState;
  peekHeight?: number;     // Height when peeking (default: 100px)
  halfHeight?: number;     // Height when half-open (default: 40% of viewport)
  fullHeight?: number;     // Height when full (default: 90% of viewport)
  snapPoints?: number[];   // Custom snap points in pixels
  closeOnBackdropTap?: boolean;
  closeOnSwipeDown?: boolean;
  enableDrag?: boolean;
}

export interface BottomSheetControls {
  state: BottomSheetState;
  isOpen: boolean;
  height: number;
  open: (target?: BottomSheetState) => void;
  close: () => void;
  toggle: () => void;
  snapTo: (state: BottomSheetState) => void;
  setDragging: (dragging: boolean) => void;
  isDragging: boolean;
}

const DEFAULT_CONFIG: Required<BottomSheetConfig> = {
  initialState: 'closed',
  peekHeight: 100,
  halfHeight: 0, // Will be calculated
  fullHeight: 0, // Will be calculated
  snapPoints: [],
  closeOnBackdropTap: true,
  closeOnSwipeDown: true,
  enableDrag: true,
};

/**
 * Calculate snap point heights based on viewport
 */
const calculateSnapPoints = (
  viewportHeight: number,
  config: BottomSheetConfig
): Record<BottomSheetState, number> => {
  const peekHeight = config.peekHeight || DEFAULT_CONFIG.peekHeight;
  const halfHeight = config.halfHeight || Math.floor(viewportHeight * 0.4);
  const fullHeight = config.fullHeight || Math.floor(viewportHeight * 0.9);

  return {
    closed: 0,
    peek: peekHeight,
    half: halfHeight,
    full: fullHeight,
  };
};

/**
 * Find nearest snap point
 */
const findNearestSnapPoint = (
  currentHeight: number,
  snapPoints: Record<BottomSheetState, number>
): BottomSheetState => {
  let nearest: BottomSheetState = 'closed';
  let minDistance = Infinity;

  (Object.entries(snapPoints) as [BottomSheetState, number][]).forEach(([state, height]) => {
    const distance = Math.abs(currentHeight - height);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = state;
    }
  });

  return nearest;
};

/**
 * Hook for bottom sheet control
 */
export const useBottomSheet = (config: BottomSheetConfig = {}): BottomSheetControls => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<BottomSheetState>(mergedConfig.initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const snapPointsRef = useRef<Record<BottomSheetState, number>>({
    closed: 0,
    peek: 0,
    half: 0,
    full: 0,
  });

  // Update viewport height on mount and resize
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
      snapPointsRef.current = calculateSnapPoints(height, config);
    };

    updateViewport();

    window.addEventListener('resize', updateViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
      }
    };
  }, [config]);

  /**
   * Get current height based on state
   */
  const height = snapPointsRef.current[state] || 0;

  /**
   * Open bottom sheet to a specific state
   */
  const open = useCallback((target: BottomSheetState = 'half') => {
    setState(target);
  }, []);

  /**
   * Close bottom sheet
   */
  const close = useCallback(() => {
    setState('closed');
  }, []);

  /**
   * Toggle between closed and half
   */
  const toggle = useCallback(() => {
    setState(prev => (prev === 'closed' ? 'half' : 'closed'));
  }, []);

  /**
   * Snap to a specific state
   */
  const snapTo = useCallback((newState: BottomSheetState) => {
    setState(newState);
  }, []);

  /**
   * Set dragging state
   */
  const setDraggingState = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
  }, []);

  return {
    state,
    isOpen: state !== 'closed',
    height,
    open,
    close,
    toggle,
    snapTo,
    setDragging: setDraggingState,
    isDragging,
  };
};

/**
 * Hook for bottom sheet drag handling
 */
export const useBottomSheetDrag = (
  controls: BottomSheetControls,
  snapPoints: Record<BottomSheetState, number>
) => {
  const [dragOffset, setDragOffset] = useState(0);
  const startHeightRef = useRef(0);

  const handleDragStart = useCallback(() => {
    controls.setDragging(true);
    startHeightRef.current = controls.height;
  }, [controls]);

  const handleDragMove = useCallback((deltaY: number) => {
    // Negative deltaY = dragging up (opening)
    // Positive deltaY = dragging down (closing)
    const newHeight = startHeightRef.current - deltaY;
    const clampedHeight = Math.max(0, Math.min(snapPoints.full, newHeight));
    setDragOffset(clampedHeight - startHeightRef.current);
  }, [snapPoints.full]);

  const handleDragEnd = useCallback((velocity: number) => {
    controls.setDragging(false);

    const finalHeight = startHeightRef.current + dragOffset;

    // If swiping down fast, close it
    if (velocity > 0.5 && dragOffset < 0) {
      controls.close();
      setDragOffset(0);
      return;
    }

    // Otherwise snap to nearest point
    const nearestState = findNearestSnapPoint(finalHeight, snapPoints);
    controls.snapTo(nearestState);
    setDragOffset(0);
  }, [controls, dragOffset, snapPoints]);

  return {
    dragOffset,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
};

export default useBottomSheet;
