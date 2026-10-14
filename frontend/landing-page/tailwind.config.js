/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        cyber: {
          blue: '#00d2ff',
          indigo: '#4338ca',
          violet: '#8b5cf6',
          neon: '#06b6d4',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.4)',
        'glow-indigo': '0 0 30px -5px rgba(99, 102, 241, 0.35)',
        'glow-gold': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
      }
    },
  },
  plugins: [],
}
