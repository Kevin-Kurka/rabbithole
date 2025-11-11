/**
 * PullToRefresh Component
 *
 * Mobile-native pull-to-refresh gesture for refreshing content.
 * Works like iOS Safari and mobile apps.
 */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';

export interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  pullDistance?: number;      // Distance to pull before triggering (default: 80px)
  refreshThreshold?: number;   // Threshold to trigger refresh (default: 60px)
  disabled?: boolean;
  className?: string;
}

const DEFAULT_PULL_DISTANCE = 80;
const DEFAULT_THRESHOLD = 60;

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  pullDistance = DEFAULT_PULL_DISTANCE,
  refreshThreshold = DEFAULT_THRESHOLD,
  disabled = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullOffset, setPullOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const scrollTop = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only allow pull-to-refresh when scrolled to top
    scrollTop.current = container.scrollTop;
    if (scrollTop.current === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // Only allow pulling down (positive deltaY) when at top
    if (deltaY > 0 && scrollTop.current === 0) {
      // Prevent default scroll behavior
      e.preventDefault();

      // Apply resistance (exponential curve)
      const resistance = 0.5;
      const offset = Math.min(
        pullDistance,
        deltaY * resistance * (1 - deltaY / (pullDistance * 3))
      );

      setPullOffset(offset);
    }
  }, [isPulling, disabled, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    // Trigger refresh if pulled past threshold
    if (pullOffset > refreshThreshold) {
      setIsRefreshing(true);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullOffset(0);
      }
    } else {
      // Snap back
      setPullOffset(0);
    }
  }, [isPulling, disabled, pullOffset, refreshThreshold, onRefresh]);

  // Calculate indicator states
  const progress = Math.min(1, pullOffset / refreshThreshold);
  const showIndicator = isPulling || isRefreshing;
  const indicatorRotation = isPulling ? progress * 360 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto h-full ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Pull-to-Refresh Indicator */}
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
          style={{
            height: `${pullOffset}px`,
            transition: isPulling ? 'none' : `height ${mobileTheme.animation.fast}`,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              opacity: progress,
              transform: `scale(${Math.min(1, progress)})`,
            }}
          >
            {isRefreshing ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <RefreshCw
                className="w-6 h-6 text-primary"
                style={{
                  transform: `rotate(${indicatorRotation}deg)`,
                  transition: 'transform 0.1s',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isPulling ? pullOffset : 0}px)`,
          transition: isPulling ? 'none' : `transform ${mobileTheme.animation.fast}`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
