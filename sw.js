const CACHE = 'stock-cantos-v6';
const LOCAL = [
  './',
  './index.html',
  './firebase-config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Estos sitios externos se guardan para uso sin conexión.
// Las conexiones de Firebase (datos e ingreso) no pasan por acá.
const EXTERNOS = ['www.gstatic.com', 'cdn.tailwindcss.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(LOCAL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  if (!propio && !EXTERNOS.includes(url.hostname)) return;

  // Archivos de la app: primero internet (siempre la versión nueva), si no hay señal usa la copia guardada
  if (propio) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Librerías externas: copia guardada y se actualiza en segundo plano
  e.respondWith(
    caches.match(req).then(cacheada => {
      const red = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req, copia));
          }
          return res;
        })
        .catch(() => cacheada);
      return cacheada || red;
    })
  );
});
