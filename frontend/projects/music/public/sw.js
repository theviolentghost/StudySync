const CACHE_NAME_PREFIX = 'sinc_music';
const VERSION_URL = '/music/version.txt';  
const LOGGING_ENABLED = false;


console.log('🔧 Service Worker initializing... in music');
// Update STATIC_CACHE_URLS to include the /music/ prefix
const STATIC_CACHE_URLS = [
  '/music/',
  '/music/index.html',
  '/music/manifest.webmanifest',

  // version file
  '/music/version.txt',
];

let CURRENT_CACHE_NAME = `${CACHE_NAME_PREFIX}_v1`;

// Install event - check version and cache accordingly
self.addEventListener('install', (event) => {
    if(LOGGING_ENABLED) console.log('installing sw...');
    event.waitUntil(
        check_version_and_cache()
            .then(() => {
                if(LOGGING_ENABLED) console.log('sw installed');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('sw installation failed:', error);
                return self.skipWaiting();
            })
    )
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

async function check_version_and_cache() {
    try {
        const cache = await caches.open(CURRENT_CACHE_NAME);
        const stored_version_response = await cache.match(VERSION_URL);
        const stored_version = stored_version_response ?
            (await stored_version_response.text()).trim().toLowerCase() :
            '0.0.0'; // Default version if not found

        if(LOGGING_ENABLED) console.log('Stored version:', stored_version);

        // Fetch the current version from the server
        let server_version = null;
        try {
            const response = await fetch(VERSION_URL, {
                cache: 'no-cache',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
                server_version = (await response.text()).trim().toLowerCase();
                if(LOGGING_ENABLED) console.log('Server version:', server_version);
            } else {
                throw new Error(`${response.status}`);
            }
        } catch (error) {
            console.warn('Could not fetch server version:', error.message);
        }

        // compare versions
        if (server_version && server_version !== stored_version) {
            // version mismatch - update cache
            update_cache(server_version);
        } else {
            // version match or no server version available (use existing cache)

            console.log(server_version ? 'Version match, using existing cache' : 'No server version available, using existing cache');
        }

    } catch (error) {
        console.error('Error during version check and cache update:', error);
        throw error; // Rethrow to let the install event handle it
    }
}

async function update_cache(new_version) {
    try {
        // first update the local cache version
        let cache = await caches.open(CURRENT_CACHE_NAME);
        await cache.put(VERSION_URL, new Response(new_version, { headers: { 'Content-Type': 'text/plain' } }));
        if(LOGGING_ENABLED) console.log('Updated local version to:', new_version);

        // then update the cache with static files
        if(LOGGING_ENABLED) console.log('static files');
        const static_files_promises = STATIC_CACHE_URLS.map(async (url) => {
            try {
                const response = await fetch(url, { cache: 'no-cache' });
                if (response.ok) {
                    await cache.put(url, response.clone());
                    if(LOGGING_ENABLED) console.log('Cached:', url);
                } else {
                    throw new Error(`Failed to fetch ${url}: ${response.status}`);
                }
            } catch (error) {
                console.warn('Error caching:', url, error.message);
            }
        });

        await Promise.allSettled(static_files_promises);
        if(LOGGING_ENABLED) console.log('Static files cached');

    } catch (error) {
        console.error('Error updating cache:', error);
        throw error; // Rethrow to let the install event handle it
    }
}

// Clean up old caches
// async function cleanupOldCaches() {
//   const cacheNames = await caches.keys();
//   const deletionPromises = cacheNames
//     .filter(name => name.startsWith(CACHE_NAME_PREFIX) && name !== CURRENT_CACHE_NAME)
//     .map(name => {
//       console.log('🗑️ Deleting old cache:', name);
//       return caches.delete(name);
//     });
  
//   await Promise.all(deletionPromises);
// }

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Only intercept requests for our own domain/app
    if (!url.pathname.startsWith('/music/')) return; // Let external requests (like YouTube thumbnails) pass through

    // Handle version.txt requests specially
    if (url.pathname === VERSION_URL) {
        event.respondWith(handle_version_request(request));
        return;
    }

    // For all other requests, use cache first strategy
    event.respondWith(
        handle_fetch_request(request)
    );
});


// Handle version.txt requests - cache first for regular requests
async function handle_version_request(request) {
    try {
        const network_response = await fetch(request, { cache: 'no-cache' });
        if (network_response.ok) {
            // Update stored version in storage
            const version_text = await network_response.text();
            const cache = await caches.open(CURRENT_CACHE_NAME);
            await cache.put(VERSION_URL, new Response(version_text, { headers: { 'Content-Type': 'text/plain' } }));
            
            if(LOGGING_ENABLED) console.log('🌐 Served version from network and stored');
            return network_response;
        }
    } catch (error) {
        console.warn('⚠️ Network failed for version check:', error.message);
    }
  
    // Fallback response if  network fail
    return new Response('0.0.0', { 
        headers: { 'Content-Type': 'text/plain' }
    });
}

async function handle_fetch_request(request) {
    try {
        const url = new URL(request.url);

        if(LOGGING_ENABLED) console.log('🔍 Fetching:', url.pathname);

        // Check cache first
        const cached_response = await caches.match(request);
        if (cached_response) {
            if(LOGGING_ENABLED) console.log('📦 Served from cache:', url.pathname);
            return cached_response;
        }

        // not in cache, try network
        try {
            const network_response = await fetch(request, { cache: 'no-cache' });
            if (network_response.ok) {
                // Cache successful responses
                const cache = await caches.open(CURRENT_CACHE_NAME);
                cache.put(request, network_response.clone());
                if(LOGGING_ENABLED) console.log('🌐 Served from network and cached:', url.pathname);
                return network_response;
            } else {
                throw new Error(`Network response not ok: ${network_response.status}`);
            }
        } catch (network_error) {
            // Network failed, try cache again
            const fallback_response = await caches.match(request);
            if (fallback_response) {
                if(LOGGING_ENABLED) console.log('📦 Served fallback from cache:', url.pathname);
                return fallback_response;
            }
            // Optionally, serve a custom offline page
            if (url.pathname === '/music/' || url.pathname === '/music/index.html') {
                return new Response('<h1>Offline</h1><p>The app is offline and the server is unreachable.</p>', {
                    headers: { 'Content-Type': 'text/html' }
                });
            }
            // Otherwise, return a generic offline response
            return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }

        // If we reach here, it means both cache and network failed
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  const { type, payload } = event.data;

  console.log('🔧 Service Worker received message:', type, payload) ;
  
//   switch(type) {
//     case "CHECK_VERSION":
//       event.waitUntil(
//         (async () => {
//           try {
//             // Get current version from cache first
//             const cache = await caches.open(CURRENT_CACHE_NAME);
//             const storedVersionResponse = await cache.match(VERSION_URL);
//             let currentVersion = '0.0.0';
            
//             if (storedVersionResponse) {
//               currentVersion = (await storedVersionResponse.text()).trim();
//             }
            
//             // Try to get latest version from server
//             try {
//               const serverVersionResponse = await fetch(VERSION_URL, { 
//                 cache: 'no-cache',
//                 headers: { 'Cache-Control': 'no-cache' }
//               });
              
//               if (serverVersionResponse.ok) {
//                 const serverVersion = (await serverVersionResponse.text()).trim();
                
//                 if (serverVersion !== currentVersion) {
//                   console.log('🔄 Version mismatch detected');
//                   await updateCache(serverVersion);
//                   currentVersion = serverVersion;
//                 }
//               }
//             } catch (error) {
//               console.warn('⚠️ Could not fetch server version for check:', error.message);
//               // Continue with cached version
//             }
            
//             if (event.source && event.source.postMessage) {
//               event.source.postMessage({
//                 type: "VERSION_CHECKED",
//                 payload: {
//                   version: currentVersion,
//                   cacheName: CURRENT_CACHE_NAME
//                 }
//               });
//             }
//           } catch (error) {
//             console.error('❌ Version check failed:', error);
//             if (event.source && event.source.postMessage) {
//               event.source.postMessage({
//                 type: "VERSION_ERROR",
//                 payload: {
//                   error: error.message
//                 }
//               });
//             }
//           }
//         })()
//       );
//       break;

//     case "CLEAR_CACHE":
//       event.waitUntil(
//         caches.delete(CURRENT_CACHE_NAME).then(() => {
//           console.log('🗑️ Cache cleared');
//           if (event.source && event.source.postMessage) {
//             event.source.postMessage({
//               type: "CACHE_CLEARED"
//             });
//           }
//         })
//       );
//       break;

//     case "GET_CACHE_INFO":
//       event.waitUntil(
//         (async () => {
//           const cache = await caches.open(CURRENT_CACHE_NAME);
//           const keys = await cache.keys();
//           const urls = keys.map(request => request.url);
          
//           if (event.source && event.source.postMessage) {
//             event.source.postMessage({
//               type: "CACHE_INFO",
//               payload: {
//                 cacheName: CURRENT_CACHE_NAME,
//                 urls: urls,
//                 count: urls.length
//               }
//             });
//           }
//         })()
//       );
//       break;

//     default:
//       return;
//   }
});

console.log('✅ Service Worker loaded successfully');