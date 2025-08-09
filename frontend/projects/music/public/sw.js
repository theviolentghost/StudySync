const CACHE_NAME_PREFIX = 'sinc_music';
const VERSION_URL = '/music/app/version.txt';  
const LOGGING_ENABLED = true;

let CURRENT_CACHE_NAME = `${CACHE_NAME_PREFIX}_v1`;

class File_Manager {
    static database_name = 'sinc_music_file_manager';
    static store_name = 'files';

    static STATIC_CACHE_URLS = [
        '/music/',
        '/music/index.html',
        '/music/app/manifest.webmanifest',
        '/music/app/version.txt',
    ];
    static STATIC_ASSET_DIRECTORIES = [
        '/music/app/'
    ];

    cache_all_static_files() {
        Promise.all(
            File_Manager.STATIC_CACHE_URLS.map(async (url) => {
                try {
                    const response = await fetch(url, { cache: 'no-cache' });
                    if (response.ok) {
                        const cache = await caches.open(CURRENT_CACHE_NAME);
                        await cache.put(url, response.clone());
                        if (LOGGING_ENABLED) console.log('Cached static file:', url);
                        // Store in IndexedDB as 'updated'
                        this.store_file(url, 'updated');
                    } else {
                        throw new Error(`Failed to fetch ${url}: ${response.status}`);
                    }
                } catch (error) {
                    console.warn('Error caching static file:', url, error.message);
                }
            })
        );

        // this.cache_all_static_files_in_directories();
    }

    cache_all_static_files_in_directories() {
        return Promise.all(
            File_Manager.STATIC_ASSET_DIRECTORIES.map(async (directory) => {
                try {
                    const response = await fetch(directory, { cache: 'no-cache' });
                    if (response.ok) {
                        const text = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(text, 'text/html');
                        const links = Array.from(doc.querySelectorAll('a'))
                            .map(a => a.getAttribute('href'))
                            .filter(href => href && !href.startsWith('http') && !href.startsWith('https') && !href.startsWith('//'))
                            .map(href => {
                                if (href.startsWith('/')) return href; // absolute path
                                if (directory.endsWith('/')) return directory + href; // relative to directory
                                return directory + '/' + href; // fallback
                            });
                        await Promise.all(
                            links.map(async (url) => {
                                try {
                                    const fileResponse = await fetch(url, { cache: 'no-cache' });
                                    if (fileResponse.ok) {
                                        const cache = await caches.open(CURRENT_CACHE_NAME);
                                        await cache.put(url, fileResponse.clone());
                                        if (LOGGING_ENABLED) console.log('Cached asset file:', url);
                                        // Store in IndexedDB as 'updated'
                                        this.store_file(url, 'updated');
                                    } else {
                                        throw new Error(`Failed to fetch ${url}: ${fileResponse.status}`);
                                    }
                                } catch (error) {
                                    console.warn('Error caching asset file:', url, error.message);
                                }
                            })
                        );
                    } else {
                        throw new Error(`Failed to fetch directory ${directory}: ${response.status}`);
                    }
                } catch (error) {
                    console.warn('Error processing directory:', directory, error.message);
                }
            })
        );
    }

    open_database() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(File_Manager.database_name, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(File_Manager.store_name)) {
                    const store = db.createObjectStore(File_Manager.store_name, { keyPath: 'url' });

                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('class', 'class', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // gets the file's type and then returns the classification
    // depending on the files type, we can classify if it needs an update based on the version update scheme:

    // tiny update: (0.0.#) -> highest priority (tiny)
    //      This is for files that are frequently updated, like small assets or configuration files.
    // minor update: (0.#.0) -> medium priority (minor)
    //      This is for files that are updated less frequently, like images or stylesheets.
    // major update: (#.0.0) -> lowest priority (major)
    //      This is for files that are rarely updated, like scripts or libraries. but when they are updated, they are significant changes.
    get_file_classification(url) {
        const file_extension = url.split('.').pop().toLowerCase();

        const classifications = {
            'js': 'tiny', 
            'ts': 'tiny', 
            'css': 'tiny', 
            'html': 'tiny', 
            'png': 'minor', 
            'jpg': 'minor',
            'jpeg': 'minor',
            'gif': 'minor',
            'svg': 'minor',
            'json': 'minor',
            'txt': 'tiny',
            'svg': 'minor',
        };

        return classifications[file_extension] || 'tiny'; // Default to tiny if not classified (meaning it is a frequently updated file)
    }

    // status = 'updated' | 'needs_update'
    async store_file(url, status = 'updated') {
        const db = await this.open_database();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(File_Manager.store_name, 'readwrite');
            const store = transaction.objectStore(File_Manager.store_name);

            const record = {
                url: url,
                status: status,
                class: this.get_file_classification(url), // classify the file based on its type
            };

            const request = store.put(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => {
                if (LOGGING_ENABLED) console.log('File stored:', url, 'Status:', status);
                db.close();
            }
            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            }
        });
    }

    async get_file(url) {
        const db = await this.open_database();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(File_Manager.store_name, 'readonly');
            const store = transaction.objectStore(File_Manager.store_name);
            const request = store.get(url);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => {
                if (LOGGING_ENABLED) console.log('File retrieved:', url);
                db.close();
            }
            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            }
        });
    }

    async get_all_files_by_status(status) {
        const db = await this.open_database();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(File_Manager.store_name, 'readonly');
            const store = transaction.objectStore(File_Manager.store_name);
            const index = store.index('status');
            const request = index.getAll(status);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => {
                if (LOGGING_ENABLED) console.log('Files retrieved by status:', status);
                db.close();
            }
            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            }
        });
    }

    async get_all_files_by_classification(classification) {
        const db = await this.open_database();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(File_Manager.store_name, 'readonly');
            const store = transaction.objectStore(File_Manager.store_name);
            const index = store.index('class');
            const request = index.getAll(classification);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => {
                if (LOGGING_ENABLED) console.log('Files retrieved by classification:', classification);
                db.close();
            }
            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            }
        });
    }

    // Consume a fetch request and check IndexedDB for the file
    // If the file is updated, use the cache strategy: cache_first
    // if file not found or marked as 'needs_update', fetch from network and store in IndexedDB: network_first
    async get_strategy(url) {
        // consume fetch request
        const file = await this.get_file(url.pathname);

        if (file) {
            if (LOGGING_ENABLED) console.log('File found in IndexedDB:', file.url, 'Status:', file.status);
            // If the file is marked as 'needs_update', we can still serve it from cache
            if (file.status === 'needs_update') {
                if (LOGGING_ENABLED) console.log('needs_update status:', file.url);
                return 'network_first';
            }

            return 'cache_first';
        }

        // Default to network_first
        if (LOGGING_ENABLED) console.log('File not found in IndexedDB, proceeding with fetch:', url.pathname);
        return 'network_first';
    }

    async handle_fetch_request(request) {
        const url = new URL(request.url);
        const strategy = await this.get_strategy(url);

        if (LOGGING_ENABLED) console.log('Fetch strategy for', url.pathname, ':', strategy);

        try {
            if (strategy === 'cache_first') return await this.cache_first(request, url);
            else return await this.network_first(request, url); // default to network_first
        } catch (error) {
            // Log the error and return a fallback response
            console.error(`Error in fetch strategy for ${url.pathname}:`, error);
            return new Response('Error fetching resource', {
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    }

    async network_first(request, url) {
        try {
            const network_response = await fetch(request, { cache: 'no-cache' });
            if (!network_response.ok) throw new Error(`Network response not ok: ${network_response.status}`);

            // Cache successful responses
            const cache = await caches.open(CURRENT_CACHE_NAME);
            await cache.put(request, network_response.clone());
            if (LOGGING_ENABLED) console.log('Served from network and cached:', url);

            // Store in IndexedDB
            this.store_file(url.pathname, 'updated');

            return network_response; // Return the network response directly
        } catch (error) {
            // last resort, try to serve from cache
            const cached_response = await caches.match(request);
            if (!cached_response) throw new Error(`Network first strategy failed for "${url.pathname}": ${error.message}`);
            if (LOGGING_ENABLED) console.warn('Served from cache (network_first):', url.pathname);
            return cached_response;
        }
    }

    async cache_first(request, url) {
        try {
            const cached_response = await caches.match(request);
            if (cached_response) {
                if (LOGGING_ENABLED) console.log('🌐 Served from cache (cache_first):', url.pathname);
                return cached_response;
            }

            // not in cache, try network
            return await this.network_first(request, url);
        } catch (error) {
            throw new Error(`Cache first strategy failed for "${url.pathname}": ${error.message}`);
        }
    }

    async update_all_files_status_by_version_update(update_type) {
        if(update_type === 'tiny') {
            // update all files marked as 'updated' to 'needs_update'
            const files = await this.get_all_files_by_classification('tiny');
            for (const file of files) {
                await this.store_file(file.url, 'needs_update');
                if (LOGGING_ENABLED) console.log(`Updated file status to 'needs_update': ${file.url}`);
            }
        }
        else if(update_type === 'minor') {
            // update all files marked as 'updated' to 'needs_update'
            const files = [...(await this.get_all_files_by_classification('minor')), ...(await this.get_all_files_by_classification('tiny'))];
            for (const file of files) {
                await this.store_file(file.url, 'needs_update');
                if (LOGGING_ENABLED) console.log(`Updated file status to 'needs_update': ${file.url}`);
            }
        } 
        else if(update_type === 'major') {
            // CLEAR ALL FILES
            const files = await this.get_all_files_by_status('updated');
            for (const file of files) {
                await this.store_file(file.url, 'needs_update');
                if (LOGGING_ENABLED) console.log(`Updated file status to 'needs_update': ${file.url}`);
            }
        }
        else if (update_type === 'full') {
            // CLEAR CACHE AND DATABASE
            if( LOGGING_ENABLED) console.warn('Clearing all files in IndexedDB');
        }
    }

    get_version_update_type(current_version, server_version) {
        const current_parts = current_version.split('.').map(Number);
        const server_parts = server_version.split('.').map(Number);

        if (server_parts[0] > current_parts[0]) return 'major'; // Major update
        if (server_parts[1] > current_parts[1]) return 'minor'; // Minor update
        if (server_parts[2] > current_parts[2]) return 'tiny'; // Tiny update

        return null; // No update needed
    }
}

const file_manager = new File_Manager();

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
            // update_cache(server_version);
            file_manager.update_all_files_status_by_version_update(file_manager.get_version_update_type(stored_version, server_version));
        } else {
            // version match or no server version available (use existing cache)

            console.log(server_version ? 'Version match, using existing cache' : 'No server version available, using existing cache');
        }

    } catch (error) {
        console.error('Error during version check and cache update:', error);
        throw error; // Rethrow to let the install event handle it
    }
}

// async function update_cache(new_version) {
//     try {
//         // first update the local cache version
//         let cache = await caches.open(CURRENT_CACHE_NAME);
//         await cache.put(VERSION_URL, new Response(new_version, { headers: { 'Content-Type': 'text/plain' } }));
//         if(LOGGING_ENABLED) console.log('Updated local version to:', new_version);

//         // then update the cache with static files
//         if(LOGGING_ENABLED) console.log('static files');
//         const static_files_promises = STATIC_CACHE_URLS.map(async (url) => {
//             try {
//                 const response = await fetch(url, { cache: 'no-cache' });
//                 if (response.ok) {
//                     await cache.put(url, response.clone());
//                     if(LOGGING_ENABLED) console.log('Cached:', url);
//                 } else {
//                     throw new Error(`Failed to fetch ${url}: ${response.status}`);
//                 }
//             } catch (error) {
//                 console.warn('Error caching:', url, error.message);
//             }
//         });

//         await Promise.allSettled(static_files_promises);
//         if(LOGGING_ENABLED) console.log('Static files cached');

//     } catch (error) {
//         console.error('Error updating cache:', error);
//         throw error; // Rethrow to let the install event handle it
//     }
// }

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
        file_manager.handle_fetch_request(request)
    );
});


// Handle version.txt requests - cache first for regular requests
async function handle_version_request(request) {
    try {
        const network_response = await fetch(request, { cache: 'no-cache' });
        if (network_response.ok) {
            // Clone the response before consuming its body
            const response_clone = network_response.clone();
            const version_text = await response_clone.text();
            const cache = await caches.open(CURRENT_CACHE_NAME);
            await cache.put(VERSION_URL, new Response(version_text, { headers: { 'Content-Type': 'text/plain' } }));
            
            if(LOGGING_ENABLED) console.log('🌐 Served version from network and stored');
            // Return a new response with the version text to avoid body lock issues
            return new Response(version_text, { 
                status: network_response.status,
                statusText: network_response.statusText,
                headers: network_response.headers 
            });
        }
    } catch (error) {
        console.warn('⚠️ Network failed for version check:', error.message);
    }
  
    // Fallback response if  network fail
    return new Response('0.0.0', { 
        headers: { 'Content-Type': 'text/plain' }
    });
}

// async function handle_fetch_request(request) {
//     try {
//         const url = new URL(request.url);

//         if(LOGGING_ENABLED) console.log('🔍 Fetching:', url.pathname);

//         // Check cache first
//         const cached_response = await caches.match(request);
//         if (cached_response) {
//             if(LOGGING_ENABLED) console.log('📦 Served from cache:', url.pathname);
//             return cached_response;
//         }

//         // not in cache, try network
//         try {
//             const network_response = await fetch(request, { cache: 'no-cache' });
//             if (network_response.ok) {
//                 // Cache successful responses
//                 const cache = await caches.open(CURRENT_CACHE_NAME);
//                 cache.put(request, network_response.clone());
//                 if(LOGGING_ENABLED) console.log('🌐 Served from network and cached:', url.pathname);
//                 return network_response;
//             } else {
//                 throw new Error(`Network response not ok: ${network_response.status}`);
//             }
//         } catch (network_error) {
//             // Network failed, try cache again
//             const fallback_response = await caches.match(request);
//             if (fallback_response) {
//                 if(LOGGING_ENABLED) console.log('📦 Served fallback from cache:', url.pathname);
//                 return fallback_response;
//             }
//             // Optionally, serve a custom offline page
//             if (url.pathname === '/music/' || url.pathname === '/music/index.html') {
//                 return new Response('<h1>Offline</h1><p>The app is offline and the server is unreachable.</p>', {
//                     headers: { 'Content-Type': 'text/html' }
//                 });
//             }
//             // Otherwise, return a generic offline response
//             return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
//         }

//         // If we reach here, it means both cache and network failed
//     } catch (error) {
//         console.error('Fetch error:', error);
//     }
// }

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