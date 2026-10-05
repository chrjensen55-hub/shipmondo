/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
// Palette mirrors src/lib/theme.ts (same values as the web app's :root tokens) so migrated
// Tailwind screens and not-yet-migrated StyleSheet screens look identical during the transition.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0f2436',
        muted: '#5c7080',
        green: '#0369a1',
        'green-dark': '#075985',
        mint: '#e0f2fe',
        cream: '#f2f8fc',
        line: '#d7e3ec',
        white: '#ffffff',
        orange: '#e96d3a',
        sky: '#38bdf8',
        ocean: '#075985',
        error: '#a33b2e',
        'error-bg': '#fff1ee',
        success: '#0a7a4a',
        'success-bg': '#e8f9f0',
      },
      borderRadius: {
        sm: '9px',
        md: '12px',
        lg: '15px',
        xl: '18px',
      },
    },
  },
  plugins: [],
}
