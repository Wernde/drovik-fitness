import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from /drovik-fitness/, so all asset paths need this prefix.
  base: '/drovik-fitness/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // silently updates the service worker when a new build is deployed
      manifest: {
        name: 'Drovik Fitness',
        short_name: 'Drovik',
        description: 'Personal fitness tracker',
        theme_color: '#a3e635',       // sky-500
        background_color: '#0f172a',  // slate-950 (used while the app is loading)
        display: 'standalone',        // hides the browser chrome when installed
        orientation: 'portrait',
        start_url: './',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache all these file types so the app works fully offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Take control of all open tabs immediately after the new SW activates,
        // which triggers the controllerchange event in main.tsx → page reloads.
        clientsClaim: true,
      },
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
})
