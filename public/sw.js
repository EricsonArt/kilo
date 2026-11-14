// Minimal offline cache. Pages: network first, cached copy when offline.
// Built files have hashed names, so they are safe to serve from cache.
const CACHE = 'kilo-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
)

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return
  const save = (res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()))
    return res
  }
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).then(save).catch(() => caches.match(request).then((r) => r || caches.match('./'))))
  } else {
    e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then(save)))
  }
})
