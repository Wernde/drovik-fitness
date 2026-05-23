import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Register the service worker (vite-plugin-pwa injects this automatically during build).
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

// When a new service worker takes control (after autoUpdate + clientsClaim),
// reload the page so the user gets the latest version immediately.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
