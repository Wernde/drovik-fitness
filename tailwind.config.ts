import type { Config } from 'tailwindcss'

const config: Config = {
  // Tell Tailwind where to look for class names so it only ships the CSS you actually use.
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  // 'class' means dark mode is controlled by a 'dark' class on the <html> element.
  // index.html always sets class="dark" so the app is permanently dark-themed.
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#a3e635', // lime-400 — primary action colour
          light: '#bef264',   // lime-300 — lighter variant
        },
      },
    },
  },
  plugins: [],
}

export default config
