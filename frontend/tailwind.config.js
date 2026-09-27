/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d8eeff',
          200: '#bae0ff',
          300: '#8acbff',
          400: '#52acff',
          500: '#298bff',
          600: '#0f6fb0',
          700: '#0c5890',
          800: '#0e4a77',
          900: '#113e63',
          950: '#0b2742',
        },
        navy: {
          800: '#1a2332',
          900: '#0f172a',
          950: '#090e1a',
        },
        priority: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#f59e0b',
          low: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
