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
          DEFAULT: '#FFCA10',
          dark:    '#B8900A',
          darker:  '#8A6C00',
          light:   '#FFF9E0',
        },
        app: {
          bg:     '#F4F6F9',
          card:   '#ffffff',
          border: '#E3E5E5',
          text:   '#241F20',
          muted:  '#7A7980',
          faint:  '#C8C8C8',
        },
      },
    },
  },
  plugins: [],
}

export default config
