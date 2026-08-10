/**
 * Offline shell for the public storefront.
 *
 * Scoped to /store/ and nothing else. It used to be registered at the origin
 * root, which meant one visit to a shop's page put this worker in charge of the
 * whole domain — the back office included. A customer-facing offline cache has
 * no business deciding whether the till loads.
 *
 * It also no longer caches build assets. Next.js filenames are content-hashed
 * and already served immutable, so the browser's own cache does that job
 * perfectly well; doing it again here only created a second copy that outlived
 * the deploy it belonged to and could be handed back after the real file was
 * gone. Pages are cached, because an offline shopper seeing the last version of
 * a page beats seeing nothing.
 *
 * Bump VERSION to throw away everything this worker has stored.
 */

const VERSION = 2;
const CACHE = `gems-store-v${VERSION}`;

/** Only pages under here are worth keeping for offline. */
const STOREFRONT = '/store/';

self.addEventListener('install', (e) => {
  // Nothing to precache: the shell is whichever store page you last opened,
  // and precaching '/' pulled in the marketing site nobody asked for.
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('gems-store-') && k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim())
      .catch(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Build assets: left entirely alone. Hashed and immutable, so the HTTP cache
  // handles them, and a stale copy here is how a deploy used to break a page
  // this worker should never have been controlling in the first place.
  if (url.pathname.startsWith('/_next/')) return;

  // Anything that talks to the backend is never cached — a shopper must not be
  // shown yesterday's stock or price from a cache.
  if (url.pathname.includes('/api/') || url.pathname.includes('/storefront/')) return;

  // Store pages: try the network, fall back to the last copy seen. Only
  // navigations, so a failure shows the page you had rather than nothing.
  const isStorePage = request.mode === 'navigate' && url.pathname.startsWith(STOREFRONT);
  if (!isStorePage) return;

  e.respondWith(
    fetch(request)
      .then((res) => {
        // Only a good response is worth keeping; caching a 404 or a 500 would
        // mean serving it back later as though it were the page.
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
