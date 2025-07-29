// Users/norbertzych/Desktop/Projects/study_sinc/frontend/projects/music/public/sw.js
const CACHE_NAME_PREFIX = 'sinc-music';
const VERSION_URL = '/music/version.txt';  // Updated path
const CURRENT_VERSION_KEY = 'app_version';


console.log('🔧 Service Worker initializing... in music');
// Update STATIC_CACHE_URLS to include the /music/ prefix
const STATIC_CACHE_URLS = [
  '/music/',
  '/music/index.html',
  '/music/manifest.webmanifest',

  // version file
  '/music/version.txt',
];

let CURRENT_CACHE_NAME = `${CACHE_NAME_PREFIX}-v1`;

// Install event - check version and cache accordingly
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    checkVersionAndCache()
      .then(() => {
        console.log('✅ Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Installation failed:', error);
        // Fallback to existing cache if version check fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔧 Service Worker activating...');
  
  event.waitUntil(
    cleanupOldCaches()
      .then(() => {
        console.log('✅ Taking control of clients');
        return self.clients.claim();
      })
  );
});

// Check version and update cache if needed
async function checkVersionAndCache() {
  try {
    console.log('🔍 Checking app version...');
    
    // Get stored version from cache first
    const cache = await caches.open(CURRENT_CACHE_NAME);
    const storedVersionResponse = await cache.match(VERSION_URL);
    const storedVersion = storedVersionResponse ? 
      (await storedVersionResponse.text()).trim() : null;
    
    console.log('📦 Cached version:', storedVersion || 'none');
    
    // Try to fetch current version from server
    let serverVersion = null;
    try {
      const versionResponse = await fetch(VERSION_URL, { 
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (versionResponse.ok) {
        serverVersion = (await versionResponse.text()).trim();
        console.log('📊 Server version:', serverVersion);
      } else {
        throw new Error(`Version fetch failed: ${versionResponse.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch server version:', error.message);
      if (storedVersion) {
        console.log('📦 Using cached version as fallback');
        return; // Use existing cache
      } else {
        throw new Error('No version available (server unreachable and no cache)');
      }
    }
    
    // Compare versions
    if (serverVersion !== storedVersion) {
      console.log('🔄 Version mismatch - updating cache...');
      await updateCache(serverVersion);
    } else {
      console.log('✅ Version matches - using existing cache');
    }
    
  } catch (error) {
    console.warn('⚠️ Version check failed:', error.message);
    console.log('📦 Continuing with existing cache if available');
    // Continue with existing cache - don't fail the install
  }
}

// Update cache with new files
async function updateCache(newVersion) {
  try {
    // Update cache name to include version
    CURRENT_CACHE_NAME = `${CACHE_NAME_PREFIX}-${newVersion.replace(/\./g, '-')}`;
    
    const cache = await caches.open(CURRENT_CACHE_NAME);
    
    // Cache version file first
    const versionResponse = await fetch(VERSION_URL, { cache: 'no-cache' });
    if (versionResponse.ok) {
      await cache.put(VERSION_URL, versionResponse.clone());
    }
    
    // Cache static files
    console.log('💾 Caching static files...');
    const cachePromises = STATIC_CACHE_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache',});
        if (response.ok) {
          const responseClone = response.clone();
          await cache.put(url, responseClone);
          console.log('✅ Cached:', url);
        } else {
          console.warn('⚠️ Failed to fetch:', url, response.status);
        }
      } catch (error) {
        console.warn('❌ Error caching:', url, error.message);
      }
    });
    
    await Promise.allSettled(cachePromises);
    console.log('🎉 Cache update complete');
    
  } catch (error) {
    console.error('❌ Cache update failed:', error);
    // Don't throw - let SW continue with existing cache
  }
}

// Clean up old caches
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const deletionPromises = cacheNames
    .filter(name => name.startsWith(CACHE_NAME_PREFIX) && name !== CURRENT_CACHE_NAME)
    .map(name => {
      console.log('🗑️ Deleting old cache:', name);
      return caches.delete(name);
    });
  
  await Promise.all(deletionPromises);
}

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Only intercept requests for our own domain/app
  if (!url.pathname.startsWith('/music/')) {
    return; // Let external requests (like YouTube thumbnails) pass through
  }
  
  // Handle version.txt requests specially
  if (url.pathname === VERSION_URL) {
    event.respondWith(handleVersionRequest(request));
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

// Handle version.txt requests - cache first for regular requests
async function handleVersionRequest(request) {
  // For version requests, try cache first for performance
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log('📦 Served version from cache');
    return cachedResponse;
  }
  
  // If not in cache, try network
  try {
    const networkResponse = await fetch(request, { cache: 'no-cache' });
    if (networkResponse.ok) {
      // Update cache with new version
      const cache = await caches.open(CURRENT_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('🌐 Served version from network and cached');
      return networkResponse;
    }
  } catch (error) {
    console.warn('⚠️ Network failed for version check:', error.message);
  }
  
  // Fallback response if both cache and network fail
  return new Response('0.0.0', { 
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Handle regular requests - cache first strategy
async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Try cache first for all /music/ assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log('📦 Served from cache:', url.pathname);
    return cachedResponse;
  }
  
  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses for future use
      const cache = await caches.open(CURRENT_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('🌐 Served from network and cached:', url.pathname);
      return networkResponse;
    }
  } catch (error) {
    console.log('❌ Network failed for:', url.pathname);
  }
  
  // For navigation requests, try serving index.html from cache
  if (request.mode === 'navigate') {
    const indexResponse = await caches.match('/music/') || await caches.match('/music/index.html');
    if (indexResponse) {
      console.log('🏠 Serving cached index.html for navigation:', url.pathname);
      return indexResponse;
    }
  }
  
  // No cache available and network failed
  console.log('💀 No cache available and network failed for:', url.pathname);
  return new Response('Offline - Resource not available', { 
    status: 503, 
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  const { type, payload } = event.data;
  
  switch(type) {
    case "CHECK_VERSION":
      event.waitUntil(
        (async () => {
          try {
            // Get current version from cache first
            const cache = await caches.open(CURRENT_CACHE_NAME);
            const storedVersionResponse = await cache.match(VERSION_URL);
            let currentVersion = '0.0.0';
            
            if (storedVersionResponse) {
              currentVersion = (await storedVersionResponse.text()).trim();
            }
            
            // Try to get latest version from server
            try {
              const serverVersionResponse = await fetch(VERSION_URL, { 
                cache: 'no-cache',
                headers: { 'Cache-Control': 'no-cache' }
              });
              
              if (serverVersionResponse.ok) {
                const serverVersion = (await serverVersionResponse.text()).trim();
                
                if (serverVersion !== currentVersion) {
                  console.log('🔄 Version mismatch detected');
                  await updateCache(serverVersion);
                  currentVersion = serverVersion;
                }
              }
            } catch (error) {
              console.warn('⚠️ Could not fetch server version for check:', error.message);
              // Continue with cached version
            }
            
            if (event.source && event.source.postMessage) {
              event.source.postMessage({
                type: "VERSION_CHECKED",
                payload: {
                  version: currentVersion,
                  cacheName: CURRENT_CACHE_NAME
                }
              });
            }
          } catch (error) {
            console.error('❌ Version check failed:', error);
            if (event.source && event.source.postMessage) {
              event.source.postMessage({
                type: "VERSION_ERROR",
                payload: {
                  error: error.message
                }
              });
            }
          }
        })()
      );
      break;

    case "CLEAR_CACHE":
      event.waitUntil(
        caches.delete(CURRENT_CACHE_NAME).then(() => {
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
          const cache = await caches.open(CURRENT_CACHE_NAME);
          const keys = await cache.keys();
          const urls = keys.map(request => request.url);
          
          if (event.source && event.source.postMessage) {
            event.source.postMessage({
              type: "CACHE_INFO",
              payload: {
                cacheName: CURRENT_CACHE_NAME,
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