/**
 * Global Theme Configuration
 * 
 * Centralized design tokens for the entire application.
 * All UI components should reference these tokens for consistency.
 */

export const theme = {
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    
    // Neutral grays
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    
    // Semantic colors
    success: {
      light: '#10b981',
      DEFAULT: '#059669',
      dark: '#047857',
      bg: '#ecfdf5',
      border: '#a7f3d0',
    },
    warning: {
      light: '#f59e0b',
      DEFAULT: '#d97706',
      dark: '#b45309',
      bg: '#fffbeb',
      border: '#fcd34d',
    },
    error: {
      light: '#ef4444',
      DEFAULT: '#dc2626',
      dark: '#b91c1c',
      bg: '#fef2f2',
      border: '#fecaca',
    },
    info: {
      light: '#3b82f6',
      DEFAULT: '#2563eb',
      dark: '#1d4ed8',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    
    // Credibility status colors
    credibility: {
      verified: '#10b981',    // Green - auto-amend threshold (0.85+)
      credible: '#0ea5e9',    // Blue - inclusion threshold (0.70+)
      weak: '#f59e0b',        // Amber - display threshold (0.30+)
      excluded: '#ef4444',    // Red - below display threshold
      neutral: '#737373',     // Gray - neutral/unknown
    },
    
    // Background colors
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#f5f5f5',
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    // Text colors
    text: {
      primary: '#171717',
      secondary: '#525252',
      tertiary: '#a3a3a3',
      inverse: '#ffffff',
      disabled: '#d4d4d4',
    },
    
    // Border colors
    border: {
      light: '#f5f5f5',
      DEFAULT: '#e5e5e5',
      medium: '#d4d4d4',
      dark: '#a3a3a3',
    },
  },
  
  // Spacing scale (rem-based)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px
    DEFAULT: '0.5rem', // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    full: '9999px',
  },
  
  // Typography
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Transitions
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Type exports for TypeScript
export type Theme = typeof theme;
export type ColorKey = keyof typeof theme.colors;
export type SpacingKey = keyof typeof theme.spacing;
export type CredibilityStatus = 'verified' | 'credible' | 'weak' | 'excluded';

// Helper functions
export function getCredibilityColor(score: number): string {
  if (score >= 0.85) return theme.colors.credibility.verified;
  if (score >= 0.70) return theme.colors.credibility.credible;
  if (score >= 0.30) return theme.colors.credibility.weak;
  return theme.colors.credibility.excluded;
}

export function getCredibilityLabel(score: number): string {
  if (score >= 0.85) return 'Verified';
  if (score >= 0.70) return 'Credible';
  if (score >= 0.30) return 'Weak';
  return 'Excluded';
}

export function getCredibilityStatus(score: number): CredibilityStatus {
  if (score >= 0.85) return 'verified';
  if (score >= 0.70) return 'credible';
  if (score >= 0.30) return 'weak';
  return 'excluded';
}

export function getThresholdDescription(status: CredibilityStatus): string {
  switch (status) {
    case 'verified':
      return 'High credibility - Can trigger node amendments (≥0.85)';
    case 'credible':
      return 'Credible - Included in node credibility calculation (≥0.70)';
    case 'weak':
      return 'Weak - Visible but not included in calculations (≥0.30)';
    case 'excluded':
      return 'Excluded - Hidden by default (<0.30)';
  }
}
