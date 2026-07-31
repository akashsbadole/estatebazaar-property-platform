// Service Worker for EstateBazaar PWA
// Provides:
//   - App shell caching (HTML, CSS, JS)
//   - Static asset caching (images, fonts)
//   - API response caching with network-first strategy
//   - Offline fallback page

const CACHE_VERSION = 'estatebazaar-v1'
const OFFLINE_URL = '/offline.html'

// Resources to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
]

// Strategies by route pattern
const CACHE_STRATEGIES = [
  // Static assets: cache-first
  { pattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/i, strategy: 'cache-first', maxAge: 86400 * 7 },
  // Next.js chunks: cache-first (immutable)
  { pattern: /\/_next\/static\//, strategy: 'cache-first', maxAge: 86400 * 30 },
  // API calls: network-first (fall back to cache when offline)
  { pattern: /\/api\//, strategy: 'network-first', maxAge: 60 },
  // HTML pages: network-first
  { pattern: /\/$/, strategy: 'network-first', maxAge: 0 },
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Find matching strategy
  const match = CACHE_STRATEGIES.find(s => s.pattern.test(request.url))
  if (!match) return

  if (match.strategy === 'cache-first') {
    event.respondWith(cacheFirst(request, match.maxAge))
  } else if (match.strategy === 'network-first') {
    event.respondWith(networkFirst(request, match.maxAge))
  }
})

async function cacheFirst(request, maxAge) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

async function networkFirst(request, maxAge) {
  try {
    const response = await fetch(request)
    if (response.ok && request.url.includes('/api/')) {
      // Cache successful API responses briefly
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    // Network failed — try cache
    const cached = await caches.match(request)
    if (cached) return cached
    // If it's a navigation request, show offline page
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL)
      if (offlinePage) return offlinePage
    }
    return new Response(
      JSON.stringify({ error: 'You are offline. Please check your internet connection.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Handle messages from the page (e.g., trigger update)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
