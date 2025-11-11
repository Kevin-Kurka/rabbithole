/**
 * useResponsive Hook
 *
 * Detects device type, screen size, orientation, and capabilities.
 * Provides reactive values that update on window resize.
 */

import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
  // Device detection
  device: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Screen dimensions
  width: number;
  height: number;
  orientation: Orientation;

  // Capabilities
  touchEnabled: boolean;
  mouseEnabled: boolean;
  hoverEnabled: boolean;

  // Safe areas (iOS notch, Android gesture bar)
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

  // Viewport calculations
  isLandscape: boolean;
  isPortrait: boolean;
  viewportHeight: number; // Excludes browser chrome on mobile
}

/**
 * Get device type based on screen width
 */
const getDeviceType = (width: number): DeviceType => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Get orientation based on dimensions
 */
const getOrientation = (width: number, height: number): Orientation => {
  return height > width ? 'portrait' : 'landscape';
};

/**
 * Get safe area insets (iOS notch, Android gesture bar)
 */
const getSafeAreaInsets = (): ResponsiveState['safeArea'] => {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);

  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
  };
};

/**
 * Detect device capabilities
 */
const getCapabilities = () => {
  if (typeof window === 'undefined') {
    return {
      touchEnabled: false,
      mouseEnabled: true,
      hoverEnabled: true,
    };
  }

  return {
    touchEnabled: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    mouseEnabled: window.matchMedia('(pointer: fine)').matches,
    hoverEnabled: window.matchMedia('(hover: hover)').matches,
  };
};

/**
 * Hook for responsive design
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        device: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
        orientation: 'landscape',
        touchEnabled: false,
        mouseEnabled: true,
        hoverEnabled: true,
        safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
        isLandscape: true,
        isPortrait: false,
        viewportHeight: 768,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const device = getDeviceType(width);
    const orientation = getOrientation(width, height);
    const capabilities = getCapabilities();
    const safeArea = getSafeAreaInsets();

    return {
      device,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop',
      width,
      height,
      orientation,
      ...capabilities,
      safeArea,
      isLandscape: orientation === 'landscape',
      isPortrait: orientation === 'portrait',
      viewportHeight: window.visualViewport?.height || height,
    };
  });

  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const device = getDeviceType(width);
    const orientation = getOrientation(width, height);
    const capabilities = getCapabilities();
    const safeArea = getSafeAreaInsets();

    setState({
      device,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop',
      width,
      height,
      orientation,
      ...capabilities,
      safeArea,
      isLandscape: orientation === 'landscape',
      isPortrait: orientation === 'portrait',
      viewportHeight: window.visualViewport?.height || height,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update on resize
    window.addEventListener('resize', updateState);

    // Update on orientation change
    window.addEventListener('orientationchange', updateState);

    // Update on visual viewport change (mobile keyboard, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateState);
    }

    // Initial update
    updateState();

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateState);
      }
    };
  }, [updateState]);

  return state;
};

/**
 * Hook for media query matching
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
};

/**
 * Specific device detection hooks
 */
export const useIsMobile = (): boolean => {
  const { isMobile } = useResponsive();
  return isMobile;
};

export const useIsTablet = (): boolean => {
  const { isTablet } = useResponsive();
  return isTablet;
};

export const useIsDesktop = (): boolean => {
  const { isDesktop } = useResponsive();
  return isDesktop;
};

export const useOrientation = (): Orientation => {
  const { orientation } = useResponsive();
  return orientation;
};

export const useIsTouchDevice = (): boolean => {
  const { touchEnabled } = useResponsive();
  return touchEnabled;
};

/**
 * Hook for viewport dimensions (excludes browser chrome on mobile)
 */
export const useViewportHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      setHeight(window.visualViewport?.height || window.innerHeight);
    };

    updateHeight();

    window.addEventListener('resize', updateHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight);
      }
    };
  }, []);

  return height;
};

export default useResponsive;
