// Service Worker for PWA
// 版本号将在构建时被替换
const APP_VERSION = 'sw-fix-' + Date.now();
const CACHE_NAME = `quick-notes-${APP_VERSION}`;
const urlsToCache = [
  '/',
  '/favicon.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // 跳过对外部API的拦截（MinIO、头像API等）
  const url = new URL(event.request.url);
  const isExternalAPI = 
    url.hostname.includes('minio') ||
    url.hostname.includes('dicebear.com') ||
    url.hostname !== self.location.hostname;
  
  // 跳过非GET请求的拦截（POST、PUT、DELETE等）
  const isNonGetRequest = event.request.method !== 'GET';
  
  if (isExternalAPI || isNonGetRequest) {
    // 直接发送请求，不经过缓存
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除所有旧版本的缓存
          if (cacheName !== CACHE_NAME && cacheName.startsWith('quick-notes-')) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 监听来自主线程的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
