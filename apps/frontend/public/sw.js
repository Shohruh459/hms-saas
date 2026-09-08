const CACHE_NAME = 'hms-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

/**
 * HMS real-vaqt ma'lumotlar (xonalar, so'rovlar, to'lovlar) bilan ishlaydi,
 * shuning uchun sahifalar/API har doim tarmoqdan olinadi (eskirgan holatni
 * ko'rsatmaslik uchun) — faqat statik Next.js build fayllari cache qilinadi,
 * bu esa PWA "installable" mezonini qondiradi va qayta tashriflarni
 * tezlashtiradi.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isStaticAsset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
