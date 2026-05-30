import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark:    'var(--color-accent-dark)',
          darker:  'var(--color-accent-darker)',
          light:   'var(--color-accent-light)',
        },
        app: {
          bg:     'var(--color-app-bg)',
          card:   'var(--color-app-card)',
          border: 'var(--color-app-border)',
          text:   'var(--color-app-text)',
          muted:  'var(--color-app-muted)',
          faint:  'var(--color-app-faint)',
        },
      },
    },
  },
  plugins: [],
}

export default config
