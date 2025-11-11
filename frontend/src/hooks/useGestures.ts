/**
 * useGestures Hook
 *
 * Detects and handles touch gestures:
 * - Swipe (left, right, up, down)
 * - Pinch (zoom in/out)
 * - Long press
 * - Double tap
 */

import { RefObject, useEffect, useRef, useState, useCallback } from 'react';
import { mobileTheme } from '@/styles/mobileTheme';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type GestureType = 'swipe' | 'pinch' | 'longpress' | 'doubletap' | 'tap' | null;

export interface GestureState {
  type: GestureType;
  direction?: SwipeDirection;
  scale?: number;
  velocity?: number;
  deltaX: number;
  deltaY: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isActive: boolean;
}

export interface GestureHandlers {
  onSwipe?: (direction: SwipeDirection, velocity: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: (scale: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onTap?: (x: number, y: number) => void;
}

interface Touch {
  x: number;
  y: number;
  timestamp: number;
}

const { gestures } = mobileTheme;

/**
 * Calculate distance between two points
 */
const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Calculate velocity (pixels per millisecond)
 */
const getVelocity = (distance: number, time: number): number => {
  return time > 0 ? distance / time : 0;
};

/**
 * Determine swipe direction from delta
 */
const getSwipeDirection = (deltaX: number, deltaY: number): SwipeDirection | null => {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  // Horizontal swipe
  if (absX > absY && absX > gestures.swipeThreshold) {
    return deltaX > 0 ? 'right' : 'left';
  }

  // Vertical swipe
  if (absY > absX && absY > gestures.swipeThreshold) {
    return deltaY > 0 ? 'down' : 'up';
  }

  return null;
};

/**
 * Hook for gesture detection
 */
export const useGestures = (
  ref: RefObject<HTMLElement>,
  handlers: GestureHandlers = {}
): GestureState => {
  const [state, setState] = useState<GestureState>({
    type: null,
    deltaX: 0,
    deltaY: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isActive: false,
  });

  // Track touches
  const touchStart = useRef<Touch | null>(null);
  const touchPrevious = useRef<Touch | null>(null);
  const lastTap = useRef<Touch | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistance = useRef<number | null>(null);

  // Handlers
  const {
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onPinchStart,
    onPinchEnd,
    onLongPress,
    onDoubleTap,
    onTap,
  } = handlers;

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: now,
    };

    touchPrevious.current = touchStart.current;

    setState({
      type: null,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      isActive: true,
    });

    // Check for double tap
    if (lastTap.current && now - lastTap.current.timestamp < gestures.doubleTapDelay) {
      if (onDoubleTap) {
        onDoubleTap(touch.clientX, touch.clientY);
      }
      lastTap.current = null;
      return;
    }

    lastTap.current = { x: touch.clientX, y: touch.clientY, timestamp: now };

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress(touch.clientX, touch.clientY);
        setState(prev => ({ ...prev, type: 'longpress' }));
      }, gestures.longPressDelay);
    }

    // Handle pinch start (2 fingers)
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getDistance(
        touch1.clientX,
        touch1.clientY,
        touch2.clientX,
        touch2.clientY
      );
      initialPinchDistance.current = distance;

      if (onPinchStart) {
        onPinchStart();
      }

      setState(prev => ({ ...prev, type: 'pinch', scale: 1 }));
    }
  }, [onDoubleTap, onLongPress, onPinchStart]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    // Cancel long press on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    setState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
    }));

    // Handle pinch (2 fingers)
    if (e.touches.length === 2 && initialPinchDistance.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getDistance(
        touch1.clientX,
        touch1.clientY,
        touch2.clientX,
        touch2.clientY
      );

      const scale = currentDistance / initialPinchDistance.current;

      if (Math.abs(scale - 1) > gestures.pinchThreshold) {
        if (onPinch) {
          onPinch(scale);
        }

        setState(prev => ({ ...prev, type: 'pinch', scale }));
      }
    }

    touchPrevious.current = { x: touch.clientX, y: touch.clientY, timestamp: Date.now() };
  }, [onPinch]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    // Cancel long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const timeDelta = Date.now() - touchStart.current.timestamp;
    const distance = getDistance(
      touchStart.current.x,
      touchStart.current.y,
      touch.clientX,
      touch.clientY
    );
    const velocity = getVelocity(distance, timeDelta);

    // Handle pinch end
    if (initialPinchDistance.current && state.scale) {
      if (onPinchEnd) {
        onPinchEnd(state.scale);
      }
      initialPinchDistance.current = null;

      setState(prev => ({ ...prev, type: null, isActive: false, scale: undefined }));
      return;
    }

    // Detect swipe
    const direction = getSwipeDirection(deltaX, deltaY);
    if (direction && velocity > gestures.velocityThreshold) {
      if (onSwipe) {
        onSwipe(direction, velocity);
      }

      // Call specific direction handlers
      switch (direction) {
        case 'left':
          if (onSwipeLeft) onSwipeLeft();
          break;
        case 'right':
          if (onSwipeRight) onSwipeRight();
          break;
        case 'up':
          if (onSwipeUp) onSwipeUp();
          break;
        case 'down':
          if (onSwipeDown) onSwipeDown();
          break;
      }

      setState(prev => ({
        ...prev,
        type: 'swipe',
        direction,
        velocity,
        isActive: false
      }));
      return;
    }

    // Handle tap (no significant movement)
    if (distance < 10 && onTap) {
      onTap(touch.clientX, touch.clientY);
    }

    setState(prev => ({ ...prev, type: 'tap', isActive: false }));
    touchStart.current = null;
    touchPrevious.current = null;
  }, [onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinchEnd, onTap, state.scale]);

  /**
   * Attach listeners
   */
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);

      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
};

/**
 * Simplified swipe detection hook
 */
export const useSwipe = (
  ref: RefObject<HTMLElement>,
  onSwipe: (direction: SwipeDirection) => void
) => {
  return useGestures(ref, {
    onSwipe: (direction) => onSwipe(direction),
  });
};

/**
 * Long press detection hook
 */
export const useLongPress = (
  ref: RefObject<HTMLElement>,
  onLongPress: (x: number, y: number) => void
) => {
  return useGestures(ref, { onLongPress });
};

/**
 * Double tap detection hook
 */
export const useDoubleTap = (
  ref: RefObject<HTMLElement>,
  onDoubleTap: (x: number, y: number) => void
) => {
  return useGestures(ref, { onDoubleTap });
};

export default useGestures;
