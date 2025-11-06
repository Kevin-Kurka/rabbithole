export const theme = {
  colors: {
    // Zinc color palette
    zinc: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },

    // Semantic colors
    white: '#ffffff',
    black: '#000000',

    // UI Element colors
    bg: {
      primary: '#000000', // black
      secondary: '#18181b', // zinc-900
      elevated: '#27272a', // zinc-800
      hover: '#3f3f46', // zinc-700
    },

    text: {
      primary: '#ffffff', // white
      secondary: '#d4d4d8', // zinc-300
      tertiary: '#71717a', // zinc-500
      muted: '#52525b', // zinc-600
    },

    border: {
      primary: '#ffffff', // white
      secondary: '#3f3f46', // zinc-700
      subtle: '#27272a', // zinc-800
    },

    input: {
      bg: 'transparent',
      border: '#ffffff', // white
      placeholder: '#71717a', // zinc-500
      text: '#ffffff', // white
    },

    button: {
      primary: {
        bg: '#ffffff', // white
        text: '#000000', // black
        hover: '#f4f4f5', // zinc-100
        disabled: '#27272a', // zinc-800
        disabledText: '#52525b', // zinc-600
      },
      icon: {
        active: '#ffffff', // white
        inactive: '#71717a', // zinc-500
        hover: '#d4d4d8', // zinc-300
      },
    },
  },

  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
  },

  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
  },

  fontFamily: {
    sans: 'var(--font-geist-sans), system-ui, sans-serif',
    mono: 'var(--font-geist-mono), monospace',
  },

  radius: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    full: '9999px',
  },

  borderWidth: {
    thin: '0.6px',
    base: '1px',
    thick: '2px',
  },

  iconSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
  },

  transition: {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
  },
} as const;

export type Theme = typeof theme;