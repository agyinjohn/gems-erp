const CACHE = 'gems-store-v1';

const PRECACHE = [
  '/',
];

// Install — precache shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//  - API calls (/api/, /storefront/) → network-first, fall through on failure
//  - Next.js static assets (_next/static) → cache-first
//  - Everything else → network-first with cache fallback
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except same-origin API)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) return;

  // API / backend calls — network only (never cache)
  if (url.pathname.includes('/storefront/') || url.pathname.includes('/api/')) {
    e.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Static assets — cache first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Pages — network first, cache fallback
  e.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
