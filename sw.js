// Keeps the app working with no internet connection.
// Bump CACHE when any file below changes so phones pick up the new version.
const CACHE = 'password-safe-v6';
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isOcr = new URL(event.request.url).pathname.includes('/ocr/');
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (isOcr && response.ok) {
          const copy = response.clone();
          caches.open(OCR_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }));
});
