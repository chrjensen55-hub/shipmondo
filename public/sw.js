// Deliberately does no caching. This app runs on a shop kiosk showing live prices, shipment
// history and admin data - caching any of that risks a customer or staff member acting on stale
// information, which is worse than the app not working offline at all. This file exists only to
// satisfy PWA/TWA installability checks (a registered service worker), not to add offline support.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
