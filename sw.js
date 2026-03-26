// ─── DrinkBitch Service Worker ────────────────────────────────────────────────
// Strategy:
//   index.html  → network-first (always fetches latest, falls back to cache)
//   everything else → cache-first (fast loads for assets)
//
// Bump CACHE_VERSION whenever you deploy to force all clients to update
const CACHE_VERSION = 'drinkbitch-v4';
const CACHE_STATIC  = CACHE_VERSION + '-static';

// Files to pre-cache on install (assets only — NOT index.html)
const PRECACHE = [
  '/manifest.json',
  '/drinks/redbull.png',
  '/drinks/vcola.jpg',
  '/drinks/water.avif',
  '/drinks/cappuccino.jpg',
  '/drinks/tea.jpg',
  '/drinks/wine.avif',
  '/drinks/guava.jpg',
  '/drinks/carrot-oj.jpg',
  '/drinks/lentil.jpeg',
];

// ── Install: pre-cache static assets ─────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: smart routing ──────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and external requests (Firebase, Google Fonts, etc.)
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // index.html → NETWORK FIRST
  // Always try to get the freshest version; fall back to cache when offline
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Store the fresh response in cache for offline fallback
          const clone = res.clone();
          caches.open(CACHE_STATIC).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Everything else → CACHE FIRST (drink images, manifest, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_STATIC).then(c => c.put(e.request, clone));
        return res;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
