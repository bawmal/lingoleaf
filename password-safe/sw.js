// Keeps the app working with no internet connection.
// Bump CACHE when any file below changes so phones pick up the new version.
const CACHE = 'password-safe-v9';
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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// Try the network first so phones always get the newest version, and fall
// back to the saved copy when offline or the network is very slow.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  const saved = () => caches.match(event.request, { ignoreSearch: true });
  // A "not found" or server error (for example if the website is taken down)
  // falls back to the saved copy, so the installed app keeps working.
  const network = fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }
    return saved().then((cached) => cached || response);
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 4000));
  event.respondWith(
    Promise.race([network, slow.then(saved)])
      .then((response) => response || network)
      .catch(saved));
});
