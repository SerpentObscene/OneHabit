import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Guard: skip service worker when running inside Capacitor native runtime.
// On iOS/Android the SW is irrelevant and can interfere with native networking.
// This check is safe to call even before Capacitor is installed — it's a no-op
// when `window.Capacitor` is undefined.
const isNativePlatform = (): boolean => {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return typeof cap !== 'undefined' && cap?.isNativePlatform?.() === true
}

if ('serviceWorker' in navigator && !isNativePlatform()) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
