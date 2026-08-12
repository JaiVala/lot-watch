const CACHE_NAME = 'lotwatch-cache-v6';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('cdnjs.cloudflare.com')) return;

  // The app shell (the HTML page itself) is always fetched network-first now.
  // This is the fix for the "stuck on an old cached version" problem: as long
  // as the phone has any connectivity, it always gets the latest code. The
  // cached copy is only used as a fallback when there's genuinely no signal —
  // which is the actual point of offline support, without it also trapping
  // you on stale code indefinitely.
  const isAppShell = event.request.mode === 'navigate' || event.request.destination === 'document';
  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Static assets (icons, manifest) stay cache-first — they rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('./index.html')))
  );
});
