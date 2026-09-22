'use client'
import { useEffect } from 'react'

// Registers the no-op service worker (public/sw.js) needed for PWA/TWA installability - see that
// file for why it deliberately does no caching.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installability just won't be met this session — nothing in the app depends on it.
      })
    }
  }, [])
  return null
}
