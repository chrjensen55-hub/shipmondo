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
        ink: '#0F172A',
        muted: '#64748B',
        body: '#334155',
        green: '#0B6EF3',
        'green-dark': '#0958C9',
        mint: '#EAF2FE',
        cream: '#F5F9FF',
        line: '#E2E8F0',
        white: '#ffffff',
        orange: '#F59E0B',
        sky: '#38bdf8',
        ocean: '#0B6EF3',
        error: '#a33b2e',
        'error-bg': '#fff1ee',
        success: '#16A34A',
        'success-bg': '#E7F8ED',
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
