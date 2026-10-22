// Service worker do site (não roda no app nativo: index.html só o registra fora de localhost).
// Páginas: rede primeiro, cache se offline. Assets com hash: cache primeiro.
const CACHE = 'compara-preco-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const navegacao = req.mode === 'navigate' || req.destination === 'document';
  if (navegacao || /manifest\.json$/.test(req.url)) {
    event.respondWith(
      fetch(req).then((r) => {
        if (r && r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
        return r;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((r) => {
      if (r && r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
      return r;
    }))
  );
});
