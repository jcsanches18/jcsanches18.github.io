// Service worker do site (não roda no app nativo: index.html só o registra em https fora de localhost).
// Instalação: guarda a página e os arquivos que ela carrega, para o app abrir offline já na segunda vez.
// Páginas: rede primeiro, cache se offline. Arquivos com hash: cache primeiro.
// Os apps do site dividem a mesma origem (jcsanches18.github.io) e o mesmo CacheStorage:
// cada um só mexe nos caches com o próprio prefixo.
const PREFIXO = 'massalab-';
const CACHE = PREFIXO + 'v2'; // v2: a v1 podia ter gravado outra página (privacidade.html) no lugar do app

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch('./', { cache: 'no-store' });
      if (res.ok) {
        const html = await res.clone().text();
        await cache.put('./', res);
        const urls = [...html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)].map((m) => m[1]);
        await cache.addAll([...new Set(urls)]);
      }
    } catch { /* offline na instalação: o cache enche no uso */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIXO) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** A navegação é para a página do app (a pasta do service worker ou o index.html dela)? */
function ehRaiz(url) {
  const pasta = new URL('./', self.location.href).pathname;
  const caminho = new URL(url).pathname;
  return caminho === pasta || caminho === pasta + 'index.html';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const page = req.mode === 'navigate' || req.destination === 'document';
  if (page || /manifest\.json$/.test(req.url)) {
    // Só a raiz do app (ou o index.html, com ou sem ?query) vai para a chave './'; outra página do site
    // (privacidade.html) fica com a própria URL e nunca toma o lugar do app no cache.
    const raiz = page && ehRaiz(req.url);
    const chave = raiz ? './' : req;
    event.respondWith(
      fetch(req).then((r) => {
        if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(chave, copy)); }
        return r;
      }).catch(() => caches.open(CACHE).then((c) => c.match(chave).then((r) => r || (raiz ? c.match('./') : Response.error()))))
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then((c) => c.match(req)).then((cached) => cached || fetch(req).then((r) => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return r;
    }))
  );
});
