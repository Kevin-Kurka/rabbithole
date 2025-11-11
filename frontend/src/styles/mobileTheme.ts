/**
 * Mobile Design System
 *
 * Mobile-first design tokens following iOS Human Interface Guidelines
 * and Material Design 3 specifications.
 */

export const mobileTheme = {
  // Touch target sizes (WCAG 2.5.5)
  touch: {
    minimum: '44px',      // Minimum for all interactive elements
    comfortable: '48px',  // Recommended for frequently used actions
    large: '56px',        // For critical primary actions
    spacing: '8px',       // Minimum spacing between adjacent targets
  },

  // Typography scale (mobile-optimized, 16px base to prevent iOS zoom)
  fontSize: {
    xs: '0.75rem',    // 12px - Fine print, timestamps
    sm: '0.875rem',   // 14px - Labels, secondary text
    base: '1rem',     // 16px - Primary body text (prevents iOS zoom)
    lg: '1.125rem',   // 18px - Emphasized text, subheadings
    xl: '1.25rem',    // 20px - Section headings
    '2xl': '1.5rem',  // 24px - Page titles
    '3xl': '1.875rem', // 30px - Hero text
  },

  // Line heights optimized for mobile reading
  lineHeight: {
    tight: '1.2',    // Headings
    normal: '1.5',   // Body text
    relaxed: '1.75', // Long-form content
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Spacing scale (8px base unit)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  // Safe areas (iOS notch, Android gesture bar)
  safe: {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  },

  // Layout dimensions
  layout: {
    headerHeight: '56px',
    headerHeightSafe: 'calc(56px + env(safe-area-inset-top))',
    bottomNavHeight: '60px',
    bottomNavHeightSafe: 'calc(60px + env(safe-area-inset-bottom))',
    sidebarWidth: '280px',
    maxContentWidth: '100vw',
  },

  // Border radius
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows (mobile-optimized, lighter than desktop)
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1010,
    fixed: 1020,
    modalBackdrop: 1030,
    modal: 1040,
    popover: 1050,
    toast: 1060,
  },

  // Animation durations
  animation: {
    fast: '150ms',      // Micro-interactions (button press, toggle)
    normal: '250ms',    // Standard transitions (page nav, drawer)
    slow: '350ms',      // Complex animations (modal, bottom sheet)
    verySlow: '500ms',  // Large-scale transitions
  },

  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy spring effect
  },

  // Breakpoints (mobile-first)
  breakpoints: {
    mobile: {
      min: 0,
      max: 767,
    },
    tablet: {
      min: 768,
      max: 1023,
    },
    desktop: {
      min: 1024,
      max: Infinity,
    },
  },

  // Media queries (for use in styled-components or CSS-in-JS)
  mediaQueries: {
    mobile: '@media (max-width: 767px)',
    tablet: '@media (min-width: 768px) and (max-width: 1023px)',
    desktop: '@media (min-width: 1024px)',
    tabletAndUp: '@media (min-width: 768px)',
    desktopAndUp: '@media (min-width: 1024px)',
    mobileLandscape: '@media (max-width: 767px) and (orientation: landscape)',
    tabletPortrait: '@media (min-width: 768px) and (max-width: 1023px) and (orientation: portrait)',
    tabletLandscape: '@media (min-width: 768px) and (max-width: 1023px) and (orientation: landscape)',
    touch: '@media (hover: none) and (pointer: coarse)',
    mouse: '@media (hover: hover) and (pointer: fine)',
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
    darkMode: '@media (prefers-color-scheme: dark)',
  },

  // Gesture thresholds
  gestures: {
    swipeThreshold: 50,       // Minimum distance (px) for swipe detection
    longPressDelay: 500,      // Time (ms) to trigger long press
    doubleTapDelay: 300,      // Max time (ms) between taps for double-tap
    pinchThreshold: 0.1,      // Minimum scale change to detect pinch
    velocityThreshold: 0.5,   // Minimum velocity for fling gestures
  },
} as const;

/**
 * Tailwind CSS extension for mobile theme
 * Add this to your tailwind.config.ts
 */
export const tailwindMobileExtension = {
  extend: {
    spacing: {
      'safe-top': 'env(safe-area-inset-top)',
      'safe-bottom': 'env(safe-area-inset-bottom)',
      'safe-left': 'env(safe-area-inset-left)',
      'safe-right': 'env(safe-area-inset-right)',
      'header': '56px',
      'bottom-nav': '60px',
    },
    minHeight: {
      'touch': '44px',
      'touch-comfortable': '48px',
      'touch-large': '56px',
    },
    minWidth: {
      'touch': '44px',
      'touch-comfortable': '48px',
      'touch-large': '56px',
    },
    zIndex: mobileTheme.zIndex,
    transitionDuration: {
      fast: mobileTheme.animation.fast,
      normal: mobileTheme.animation.normal,
      slow: mobileTheme.animation.slow,
    },
  },
};

export default mobileTheme;
