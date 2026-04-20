/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rabbit: {
          50: '#fdf4f3',
          100: '#fce8e6',
          500: '#e74c3c',
          600: '#c0392b',
          700: '#922b21',
          900: '#641e16',
        }
      }
    },
  },
  plugins: [],
}
