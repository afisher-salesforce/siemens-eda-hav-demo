/** @type {import('tailwindcss').Config} */
export default {
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
          accent: '#00b8b8',
          light: '#e0f5f5',
        },
        surface: {
          bg: '#0a0f1a',
          card: '#111827',
          'card-hover': '#1a2234',
          border: '#1e293b',
          'border-light': '#334155',
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
        card: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
        'card-hover': '0 4px 12px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
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
