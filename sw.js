// Cache-first app shell. Everything the app needs is listed here, so once it
// has been opened a single time it works with no connection at all.

// Bump this whenever the shell files change, so stale copies are evicted.
const VERSION = 'v2';
const CACHE = `lcmaths-${VERSION}`;

const SHELL = [
  '.',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'js/app.js',
  'js/questions.js',
  'js/store.js',
  'js/rng.js',
  'js/fmt.js',
  'js/mathexpr.js',
  'js/mathrender.js',
  'js/ascii-bg.js',
  'js/topics/algebra.js',
  'js/topics/functions.js',
  'js/topics/calculus.js',
  'js/topics/trig.js',
  'js/topics/geometry.js',
  'js/topics/stats.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        // Refresh in the background so an updated file lands on the next load.
        event.waitUntil(
          fetch(request)
            .then((res) => res.ok && caches.open(CACHE).then((c) => c.put(request, res.clone())))
            .catch(() => {}),
        );
        return hit;
      }
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put(request, copy)));
          }
          return res;
        })
        .catch(() => caches.match('index.html'));
    }),
  );
});
