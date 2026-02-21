// Minimal service worker — makes the client installable as PWA.
// No caching strategy — this is a demo.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
