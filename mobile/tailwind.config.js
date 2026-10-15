/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
// Palette mirrors src/lib/theme.ts (the "Parcel App – Base Design System" tokens) so migrated
// Tailwind screens and not-yet-migrated StyleSheet screens look identical during the transition.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0F1E33',
        muted: '#6B7280',
        body: '#334155',
        green: '#0B4F82',
        'green-dark': '#093F69',
        mint: '#E8F0F8',
        cream: '#F4F7FB',
        line: '#E2E8F0',
        white: '#ffffff',
        orange: '#F59E0B',
        sky: '#38bdf8',
        ocean: '#0B4F82',
        error: '#a33b2e',
        'error-bg': '#fff1ee',
        success: '#22A05B',
        'success-bg': '#E6F5EC',
        disabled: '#94A3B8',
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
