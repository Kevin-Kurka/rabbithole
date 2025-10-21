// Zinc-based theme configuration
// All colors are from Tailwind's zinc palette

export const theme = {
  colors: {
    // Backgrounds
    bg: {
      primary: '#27272a',      // zinc-800
      secondary: '#18181b',    // zinc-900
      tertiary: '#09090b',     // zinc-950
      elevated: '#3f3f46',     // zinc-700
      hover: '#52525b',        // zinc-600
    },

    // Text
    text: {
      primary: '#fafafa',      // zinc-50
      secondary: '#e4e4e7',    // zinc-200
      tertiary: '#a1a1aa',     // zinc-400
      muted: '#71717a',        // zinc-500
      disabled: '#52525b',     // zinc-600
    },

    // Borders
    border: {
      primary: '#3f3f46',      // zinc-700
      secondary: '#52525b',    // zinc-600
      muted: '#71717a',        // zinc-500
    },

    // Interactive states
    interactive: {
      default: '#fafafa',      // zinc-50
      hover: '#e4e4e7',        // zinc-200
      active: '#d4d4d8',       // zinc-300
      disabled: '#52525b',     // zinc-600
    },

    // Status colors (using zinc for consistency)
    status: {
      info: '#a1a1aa',         // zinc-400
      success: '#71717a',      // zinc-500
      warning: '#52525b',      // zinc-600
      error: '#3f3f46',        // zinc-700
    },

    // Canvas
    canvas: {
      bg: '#27272a',           // zinc-850 (custom)
      dots: '#71717a',         // zinc-500
      grid: '#3f3f46',         // zinc-700
    },

    // Input fields
    input: {
      bg: '#3f3f46',           // zinc-700
      border: '#52525b',       // zinc-600
      focus: '#71717a',        // zinc-500
      placeholder: '#a1a1aa',  // zinc-400
    },

    // Buttons
    button: {
      primary: {
        bg: '#09090b',         // zinc-950
        text: '#fafafa',       // zinc-50
        hover: '#18181b',      // zinc-900
      },
      secondary: {
        bg: '#3f3f46',         // zinc-700
        text: '#fafafa',       // zinc-50
        hover: '#52525b',      // zinc-600
      },
      ghost: {
        bg: 'transparent',
        text: '#fafafa',       // zinc-50
        hover: '#3f3f46',      // zinc-700
      },
    },

    // Overlays
    overlay: {
      backdrop: 'rgba(9, 9, 11, 0.5)',    // zinc-950 at 50%
      modal: '#18181b',                    // zinc-900
    },
  },

  // Spacing (using Tailwind's spacing scale)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Border radius
  radius: {
    none: '0px',     // 0px
    sm: '2px',       // 2px
    md: '4px',       // 4px
    lg: '6px',       // 6px
    full: '9999px',
  },

  // Shadows (using zinc colors)
  shadows: {
    sm: '0 1px 2px 0 rgba(39, 39, 42, 0.05)',
    md: '0 4px 6px -1px rgba(39, 39, 42, 0.1), 0 2px 4px -1px rgba(39, 39, 42, 0.06)',
    lg: '0 10px 15px -3px rgba(39, 39, 42, 0.1), 0 4px 6px -2px rgba(39, 39, 42, 0.05)',
    xl: '0 20px 25px -5px rgba(39, 39, 42, 0.1), 0 10px 10px -5px rgba(39, 39, 42, 0.04)',
  },

  // Typography
  fonts: {
    sans: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'var(--font-geist-mono), "Fira Code", "Cascadia Code", "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
} as const;

// Type-safe theme access
export type Theme = typeof theme;
export type ColorPath = keyof typeof theme.colors;
