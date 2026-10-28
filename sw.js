// Subí el número de versión cada vez que cambies index.html para forzar la actualización
const CACHE = 'stock-cantos-v2';
const LOCAL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL)).then(() => self.skipWaiting()));
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

  // Página: primero red (para recibir actualizaciones), si no hay conexión usa la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto (íconos, Tailwind, Font Awesome): usa la copia guardada y la actualiza en segundo plano
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
