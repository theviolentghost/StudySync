// Users/norbertzych/Desktop/Projects/study_sinc/frontend/projects/music/public/sw.js
const CACHE_NAME = 'sinc-music-v1';
const networkStrategy = 'Network First';

// Only cache files we know exist and don't change names
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // Don't include hashed files here - we'll cache them dynamically
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching known static files...');
        // Cache each file individually to avoid 404 failures
        return Promise.allSettled(
          STATIC_CACHE_URLS.map(url => 
            cache.add(url).catch(error => {
              console.warn(`❌ Failed to cache ${url}:`, error.message);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('✅ Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔧 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Taking control of clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with intelligent caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  if (networkStrategy === "Network First") {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Check if the response is valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            // Fallback to cache if response is not valid
            return caches.match(request).then(cachedResponse => {
              if (cachedResponse) {
                console.log('📦 Served invalid response from cache:', url.pathname);
                return cachedResponse;
              } else if (request.mode === 'navigate') {
                // Return cached index.html for navigation requests (SPA routing)
                console.log('🏠 Serving index.html for navigation:', url.pathname);
                return caches.match('/') || caches.match('/index.html');
              }
              return response;
            });
          }

          // Cache ALL successful responses (this includes Angular files)
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
            console.log('💾 Cached:', url.pathname);
          });

          console.log('🌐 Served from network:', url.pathname);
          return response;
        })
        .catch(() => {
          // Network failed - try cache
          console.log('❌ Network failed for:', url.pathname);
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('📦 Served from cache:', url.pathname);
              return cachedResponse;
            } else if (request.mode === 'navigate') {
              // For navigation requests, serve the main app (SPA routing)
              console.log('🏠 Serving index.html for failed navigation:', url.pathname);
              return caches.match('/') || caches.match('/index.html');
            }
            
            // For other requests, return a basic offline response
            console.log('💀 No cache available for:', url.pathname);
            return new Response('Offline - Resource not available', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
  } else {
    // Cache First strategy
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          console.log('📦 Served from cache:', url.pathname);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('🌐 Fetching from network:', url.pathname);
        return fetch(request).then(response => {
          if (!response || response.status !== 200) {
            return response;
          }

          // Cache the response for future use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
            console.log('💾 Cached:', url.pathname);
          });
          return response;
        }).catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/') || caches.match('/index.html');
          }
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
      })
    );
  }
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  const { type, payload } = event.data;
  
  switch(type) {
    case "CLEAR_CACHE":
      event.waitUntil(
        caches.delete(CACHE_NAME).then(() => {
          console.log('🗑️ Cache cleared');
          if (event.source && event.source.postMessage) {
            event.source.postMessage({
              type: "CACHE_CLEARED"
            });
          }
        })
      );
      break;

    case "GET_CACHE_INFO":
      event.waitUntil(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          const urls = keys.map(request => request.url);
          
          if (event.source && event.source.postMessage) {
            event.source.postMessage({
              type: "CACHE_INFO",
              payload: {
                cacheName: CACHE_NAME,
                urls: urls,
                count: urls.length
              }
            });
          }
        })()
      );
      break;

    default:
      return;
  }
});

console.log('✅ Service Worker loaded successfully');