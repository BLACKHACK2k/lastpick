/* Last Pick — service worker
   Goal: make the app installable + usable offline, WITHOUT ever breaking live data.
   Strategy:
     - App shell (the HTML at "/") is served network-first so you always get updates
       when online, and falls back to a cached copy when offline.
     - Our own static assets (icons, manifest) are cache-first, refreshed in the background.
     - Everything cross-origin (Supabase, TMDb image CDN, cdnjs) and the /api/ proxy
       are left completely untouched — they always go straight to the network. */
const CACHE = 'lastpick-v1';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Only handle our own origin. Supabase / TMDb / CDN calls pass straight through.
  if (url.origin !== self.location.origin) return;
  // Never touch the serverless key-proxy — always network.
  if (url.pathname.startsWith('/api/')) return;

  // Page navigations: network-first (fresh when online), cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || caches.match(req)))
    );
    return;
  }

  // Same-origin static assets: cache-first, refresh in the background.
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
