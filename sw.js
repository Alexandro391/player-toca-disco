// ============================================================================
// Service Worker — Toca-discos HF-33
// Cuida do cache para o app abrir e funcionar mesmo sem internet.
// Sempre que você alterar o HTML/CSS/JS do player, mude o CACHE_NAME abaixo
// (ex.: 'toca-discos-v2') para forçar a atualização do cache nos celulares.
// ============================================================================

// IMPORTANTE: mude este valor sempre que alterar index.html/CSS/JS/imagens.
// Sugestão: use a data do deploy, assim nunca fica em dúvida se já mudou.
const CACHE_NAME = 'toca-discos-2026-07-07-01';

// Arquivos do "esqueleto" do app — precisam existir na mesma pasta do sw.js
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instala o service worker e guarda os arquivos essenciais em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Ativa e remove caches antigos (de versões anteriores do app)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Estratégia: cache primeiro, com fallback para a rede.
// Além disso, qualquer arquivo novo buscado da rede (ex.: músicas em
// "musicas/faixa1.mp3") é guardado automaticamente no cache, para que
// da próxima vez toque offline também.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só cuidamos de requisições GET do mesmo site (ignora chamadas externas,
  // ex.: fontes do Google, chamadas de API, etc.)
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          // Só guarda respostas válidas
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // Sem internet e sem cache: não tem o que fazer para este arquivo
          return new Response('Offline e arquivo não encontrado em cache.', {
            status: 503,
            statusText: 'Offline'
          });
        });
    })
  );
});
