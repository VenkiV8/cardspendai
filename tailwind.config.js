/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#002E6E', 700: '#0A3D80', 900: '#001F4D' },
        cyan: { brand: '#00B9F1' },
        crimson: '#EC184A',
        emerald: { brand: '#16A34A' },
        amber: { brand: '#D97706' },
        surface: '#F4F7FA',
        line: '#E2E8F0',
        canvas: '#F1F5F9',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(40px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(0.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.9)' },
          '15%': { opacity: '1', transform: 'translateY(0) scale(1.05)' },
          '70%': { opacity: '1', transform: 'translateY(-6px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-18px) scale(1)' },
        },
        slideIn: { '0%': { opacity: '0.85', transform: 'translateX(16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        // CardSense tile on the Paytm home screen: soft light-cyan ring (#00BAF2 at 30%) that breathes in and out.
        tileRing: {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(0,186,242,0.3)' },
          '50%': { boxShadow: '0 0 0 7px rgba(0,186,242,0.3)' },
        },
        tourPulse: { '0%, 100%': { '--tw-ring-color': 'rgba(0,185,241,1)' }, '50%': { '--tw-ring-color': 'rgba(0,185,241,0.35)' } },
      },
      animation: {
        fade: 'fade 240ms ease-out both',
        fadeIn: 'fadeIn 260ms ease-out both',
        slideUp: 'slideUp 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        pop: 'pop 420ms ease-out both',
        floatUp: 'floatUp 1800ms ease-out both',
        slideIn: 'slideIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        tileRing: 'tileRing 1.6s ease-in-out infinite',
        tourPulse: 'tourPulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
