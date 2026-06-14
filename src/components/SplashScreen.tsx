import { useEffect } from 'react'

// Fetches splash.html and injects it directly into the main document so WebGL,
// position:fixed, and touch events all work on iOS without iframe restrictions.
export default function SplashScreen() {
  useEffect(() => {
    const container = document.createElement('div')
    container.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
      'z-index:9998', 'background:#050505', 'overflow:hidden',
    ].join(';')
    document.body.appendChild(container)

    let styleEl: HTMLStyleElement | null = null

    fetch(`${import.meta.env.BASE_URL}splash.html`)
      .then(r => r.text())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html')

        // Inject splash styles into <head>
        const css = Array.from(doc.querySelectorAll('style'))
          .map(s => s.textContent ?? '')
          .join('\n')
        styleEl = document.createElement('style')
        styleEl.textContent = css
        document.head.appendChild(styleEl)

        // Inject splash body HTML into the container
        container.innerHTML = doc.body.innerHTML

        // Re-create each <script> element so the browser actually executes it
        // (innerHTML parsing strips script execution)
        Array.from(doc.querySelectorAll('script')).forEach(orig => {
          const s = document.createElement('script')
          s.textContent = orig.textContent ?? ''
          container.appendChild(s)
        })
      })
      .catch(() => {
        // Fetch failed — fire completion so the app isn't stuck
        window.dispatchEvent(new CustomEvent('drovik:splash-complete'))
      })

    return () => {
      if (document.body.contains(container)) document.body.removeChild(container)
      if (styleEl && document.head.contains(styleEl)) document.head.removeChild(styleEl)
    }
  }, [])

  return null
}
