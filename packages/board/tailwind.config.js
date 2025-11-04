/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx}',
    './dist/**/*.{js,mjs}',
    './examples/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        asakaa: {
          bg: {
            primary: '#0a0a0a',
            secondary: '#141414',
            tertiary: '#1f1f1f',
          },
          border: '#2a2a2a',
          text: {
            primary: '#ffffff',
            secondary: '#a3a3a3',
            tertiary: '#737373',
          },
          accent: {
            blue: '#3b82f6',
            green: '#10b981',
            amber: '#f59e0b',
            red: '#ef4444',
            purple: '#a855f7',
          },
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
