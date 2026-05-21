import type { Config } from 'tailwindcss'

const config: Config = {
  // Tell Tailwind where to look for class names so it only ships the CSS you actually use.
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  // 'media' means dark mode follows the OS setting (light/dark toggle on the phone).
  darkMode: 'media',

  theme: {
    extend: {
      // The electric-blue accent used throughout the app.
      // We extend rather than override so all default Tailwind colours remain available.
      colors: {
        accent: {
          DEFAULT: '#0ea5e9', // sky-500
          light: '#38bdf8',   // sky-400 — slightly brighter for dark backgrounds
        },
      },
    },
  },
  plugins: [],
}

export default config
