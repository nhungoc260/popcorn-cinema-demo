/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Cinematic Palette
        navy: { DEFAULT: '#0F172A', 800: '#1E293B', 700: '#334155', 600: '#475569' },
        cyan: { DEFAULT: '#22D3EE', light: '#67E8F9', dark: '#0891B2' },
        gold: { DEFAULT: '#FDE68A', dark: '#F59E0B' },
        glass: 'rgba(255,255,255,0.06)',
        // Cute Mode Palette
        cute: {
          bg: '#FFF7ED', primary: '#FFB3C1', secondary: '#BDE0FE',
          accent: '#FFD6A5', text: '#4A4A4A',
        }
      },
      fontFamily: {
        display: ['"Nunito"', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s infinite',
        'bounce-soft': 'bounce-soft 2s infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
        glow: { from: { boxShadow: '0 0 10px #22D3EE40' }, to: { boxShadow: '0 0 30px #22D3EE80, 0 0 60px #22D3EE40' } },
        shimmer: { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        'bounce-soft': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34,211,238,0.4)',
        'glow-gold': '0 0 20px rgba(253,230,138,0.4)',
        'card': '0 8px 32px rgba(0,0,0,0.3)',
        'glass': '0 4px 24px rgba(0,0,0,0.2)',
      }
    },
  },
  plugins: [],
}