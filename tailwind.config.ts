import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: '#f5ede6',
        ember: '#f26419',
        card: '#ffffff',
        background: '#f5ede6',
        foreground: '#1a0c06',
        accent: '#f26419',
        'accent-foreground': '#ffffff',
        'muted-foreground': '#8a6a52',
        border: 'rgba(26,12,6,0.10)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(242,100,25,0.35), 0 0 80px rgba(242,100,25,0.15)',
        soft: '0 2px 20px rgba(0,0,0,0.4)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pop: 'pop 0.5s ease-in-out',
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
} satisfies Config
