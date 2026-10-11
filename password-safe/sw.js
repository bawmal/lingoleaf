// Keeps the app working with no internet connection.
// Bump CACHE when any file below changes so phones pick up the new version.
const CACHE = 'password-safe-v7';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'fonts/inter.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

// The text reader (ocr/) is large and only downloaded the first time someone
// scans, so it lives in its own cache that survives app updates.
const OCR_CACHE = 'password-safe-ocr-v1';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== OCR_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// App files: try the network first so phones always get the newest version,
// and fall back to the saved copy when offline or the network is very slow.
// The text reader (ocr/) is large and never changes, so it's served from the
// saved copy first.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/ocr/')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(OCR_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })));
    return;
  }
  const network = fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 4000));
  event.respondWith(
    Promise.race([network, slow.then(() => caches.match(event.request, { ignoreSearch: true }))])
      .then((response) => response || network)
      .catch(() => caches.match(event.request, { ignoreSearch: true })));
});
