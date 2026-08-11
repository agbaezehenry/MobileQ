/* =============================================================================
   sw.js — offline app shell.

   Strategy: cache-first for everything in SHELL, network fallback for the rest.
   Every path is relative to the service worker's own location, which is what
   makes this work from https://user.github.io/repo-name/ as well as from root.

   ⚠️  Bump CACHE_VERSION whenever you edit questions.js or any other file, or
       phones that already installed the app will keep serving the old copy.
   ============================================================================= */

const CACHE_VERSION = 'chalkboard-v7';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './fsrs.js',
  './questions.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

/* Install: pre-cache the shell so the very next load works offline. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* Activate: drop caches from older versions. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: serve from cache when we have it, otherwise go to the network and
   quietly stash a copy for next time. */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GETs, and only same-origin — never try to cache someone else's API.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;

      return fetch(req).then((res) => {
        // Opaque or error responses aren't worth caching.
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => {
        // Offline and uncached: fall back to the shell for navigations so the
        // app still opens instead of showing the browser's error page.
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
