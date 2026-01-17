// Service Worker for PWA
// 版本号会在构建时被 scripts/build-version.js 替换为真实版本
const APP_VERSION = '2916d955'
const CACHE_PREFIX = 'quick-notes-'
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`

const scope = new URL(self.registration.scope)
const scopePath = scope.pathname.replace(/\/$/, '')
const withScope = (path) => `${scopePath}${path}`

const urlsToCache = [
  withScope('/'),
  withScope('/favicon.png'),
  withScope('/icons/icon-144x144.png'),
  withScope('/icons/icon-192x192.png'),
  withScope('/icons/icon-512x512.png'),
  withScope('/manifest.json'),
  withScope('/version.json'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => (
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith(CACHE_PREFIX)) {
            return caches.delete(cacheName)
          }
          return undefined
        }),
      )
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  const isExternalRequest = url.origin !== self.location.origin
  if (isExternalRequest || request.method !== 'GET') return

  if (url.pathname.startsWith(withScope('/api/'))) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const fallback = await caches.match(withScope('/'))
          return fallback || Response.error()
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((response) => response || fetch(request)),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
