// Zinc Theme Tokens (shadcn/ui)
// https://ui.shadcn.com/themes

export const zincTheme = {
    // Background colors
    background: 'hsl(240 10% 3.9%)',        // zinc-950
    foreground: 'hsl(0 0% 98%)',            // zinc-50

    // Card colors
    card: 'hsl(240 10% 3.9%)',              // zinc-950
    cardForeground: 'hsl(0 0% 98%)',        // zinc-50

    // Popover colors
    popover: 'hsl(240 10% 3.9%)',           // zinc-950
    popoverForeground: 'hsl(0 0% 98%)',     // zinc-50

    // Primary (white for monochrome)
    primary: 'hsl(0 0% 98%)',               // zinc-50
    primaryForeground: 'hsl(240 5.9% 10%)', // zinc-900

    // Secondary
    secondary: 'hsl(240 3.7% 15.9%)',       // zinc-800
    secondaryForeground: 'hsl(0 0% 98%)',   // zinc-50

    // Muted
    muted: 'hsl(240 3.7% 15.9%)',           // zinc-800
    mutedForeground: 'hsl(240 5% 64.9%)',   // zinc-400

    // Accent
    accent: 'hsl(240 3.7% 15.9%)',          // zinc-800
    accentForeground: 'hsl(0 0% 98%)',      // zinc-50

    // Destructive
    destructive: 'hsl(0 62.8% 30.6%)',      // red-900
    destructiveForeground: 'hsl(0 0% 98%)', // zinc-50

    // Border
    border: 'hsl(240 3.7% 15.9%)',          // zinc-800
    input: 'hsl(240 3.7% 15.9%)',           // zinc-800
    ring: 'hsl(0 0% 83.1%)',                // zinc-300

    // Chart colors (only colored elements)
    chart: {
        high: 'hsl(142.1 76.2% 36.3%)',       // green-600
        medium: 'hsl(37.7 92.1% 50.2%)',      // orange-500
        low: 'hsl(0 72.2% 50.6%)',            // red-600
    },

    // Radius
    radius: '0.5rem',
} as const;

// Zinc scale
export const zinc = {
    50: 'hsl(0 0% 98%)',
    100: 'hsl(240 4.8% 95.9%)',
    200: 'hsl(240 5.9% 90%)',
    300: 'hsl(240 4.9% 83.9%)',
    400: 'hsl(240 5% 64.9%)',
    500: 'hsl(240 3.8% 46.1%)',
    600: 'hsl(240 5.2% 33.9%)',
    700: 'hsl(240 5.3% 26.1%)',
    800: 'hsl(240 3.7% 15.9%)',
    900: 'hsl(240 5.9% 10%)',
    950: 'hsl(240 10% 3.9%)',
} as const;
