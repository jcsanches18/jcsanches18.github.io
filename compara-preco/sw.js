// Service worker do site (não roda no app nativo: index.html só o registra fora de localhost).
// Páginas: rede primeiro, cache se offline. Assets com hash: cache primeiro.
// Os apps do site dividem a mesma origem (jcsanches18.github.io) e o mesmo CacheStorage:
// cada um só mexe nos caches com o próprio prefixo.
const PREFIXO = 'compara-preco-';
const CACHE = PREFIXO + 'v4';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIXO) && k !== CACHE).map((k) => caches.delete(k))))
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
      }).catch(() => caches.open(CACHE).then((c) => c.match(req).then((r) => r || c.match('./index.html'))))
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then((c) => c.match(req)).then((cached) => cached || fetch(req).then((r) => {
      if (r && r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
      return r;
    }))
  );
});
