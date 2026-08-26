// Keeps the app usable with no signal in the gym. Assets are content-hashed by
// Vite, so caching them forever is safe; the HTML shell is refreshed when
// online and served from cache when not.
//
// Bumping CACHE evicts everything from the previous version on activate. v3
// clears shells poisoned by the bug fixed below, where an auth redirect could
// be stored as the app itself.
const CACHE = 'workout-v3'

// Fonts are the only cross-origin assets; cache them so the app keeps its
// typography offline instead of falling back mid-workout.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  // Tolerant: a failed precache shouldn't block the new worker from taking
  // over, since every request path falls back to the network anyway.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled([c.add('/'), c.add('/manifest.webmanifest')]))
      .catch(() => undefined),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

/**
 * Only ever store a real page from this origin.
 *
 * Without this, anything the network hands back gets cached as the app shell —
 * including a login redirect from deployment protection, or an error page.
 * The result is an origin that keeps serving that junk (or a stale shell)
 * long after the real cause is gone.
 */
function isStorableShell(res) {
  return res.ok && !res.redirected && res.type === 'basic'
}

/** Opaque font responses have ok === false but are still worth keeping. */
function isStorableAsset(res, sameOrigin) {
  if (sameOrigin) return res.ok && res.type === 'basic'
  return res.ok || res.type === 'opaque'
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (isStorableShell(res)) {
            const copy = res.clone()
            void caches.open(CACHE).then((c) => c.put('/', copy))
          }
          return res
        })
        .catch(() => caches.match('/').then((hit) => hit ?? Response.error())),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (isStorableAsset(res, sameOrigin)) {
            const copy = res.clone()
            void caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})
