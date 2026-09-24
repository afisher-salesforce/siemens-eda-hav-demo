/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        siemens: {
          teal: '#009999',
          dark: '#006666',
          darkest: '#003333',
          accent: 'var(--siemens-accent)',
          light: '#e0f5f5',
        },
        surface: {
          bg: 'var(--surface-bg)',
          card: 'var(--surface-card)',
          'card-hover': 'var(--surface-card-hover)',
          border: 'var(--surface-border)',
          'border-light': 'var(--surface-border-light)',
        },
        th: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
          inverse: 'var(--text-inverse)',
        },
        glow: {
          teal: 'rgba(0, 153, 153, 0.15)',
          blue: 'rgba(99, 102, 241, 0.15)',
          amber: 'rgba(245, 158, 11, 0.15)',
          red: 'rgba(239, 68, 68, 0.15)',
          emerald: 'rgba(16, 185, 129, 0.15)',
        },
      },
      fontFamily: {
        sans: ["'Inter'", "'Siemens Sans'", 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'glow-teal': '0 0 20px rgba(0, 153, 153, 0.15)',
        'glow-teal-lg': '0 0 30px rgba(0, 153, 153, 0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 153, 153, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 153, 153, 0.2)' },
        },
      },
    },
  },
  plugins: [],
};
