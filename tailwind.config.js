/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crt: {
          bg: '#000000',
          fg: '#00ff00',
          accent: '#23ff18',
          selection: '#083905',
          muted: '#00a600',
          dim: '#666666',
          border: '#0a3d0a',
          error: '#e50000',
          warning: '#e5e500',
          info: '#00a6b2',
        }
      },
      fontFamily: {
        mono: ['"SF Mono"', '"Fira Code"', '"JetBrains Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0',
        none: '0',
        sm: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '0',
      },
    },
  },
  plugins: [],
}
