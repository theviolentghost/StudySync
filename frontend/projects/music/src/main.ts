import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { isDevMode } from '@angular/core';

let version = '0.0.0';
let minor_outdated = false; // is app minor outdated? (0.0.0 -> 0.1.0) or (0.0.0 -> 0.0.1)
let major_outdated = false; // is app major outdated? (0.0.0 -> 1.0.0)

const CACHE_NAME_PREFIX = 'sinc_music';
const VERSION_URL = '/music/version.txt';  
let CURRENT_CACHE_NAME = `${CACHE_NAME_PREFIX}_v1`;


// Register service worker
if ('serviceWorker' in navigator && !isDevMode()) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/music/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, payload } = event.data;

                // console.log('SW message received:', type, payload);

                //   switch(type) {
                //     case 'GET_STORED_VERSION':
                //       const version = localStorage.getItem('app-version');
                //       event.ports[0].postMessage({ version });
                //       break;

                //     case 'UPDATE_STORED_VERSION':
                //       localStorage.setItem('app-version', payload.version);
                //       console.log('📦 Version updated in localStorage:', payload.version);
                //       break;
                //   }
                });

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const new_worker = registration.installing;
                    if (new_worker) {
                        new_worker.addEventListener('statechange', async () => {
                        if (new_worker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available - check if we should prompt user

                            const cache = await caches.open(CURRENT_CACHE_NAME);
                            const stored_version_response = await cache.match(VERSION_URL);
                            const stored_version = stored_version_response ?
                                (await stored_version_response.text()).trim().toLowerCase() :
                                '0.0.0'; // Default version if not found

                            const should_update = await should_update_app(stored_version);
                            console.log('🔄 Update check complete, should update:', should_update);
                            if (should_update) {
                                window.location.reload();
                            }
                        }
                    });
                    }
                });
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

async function should_update_app(stored_version: string): Promise<boolean> {
    try {
        // Fetch server version with cache busting
        const server_version_response = await fetch('/music/version.txt');
        if (!server_version_response.ok) {
            throw new Error(`Failed to fetch version.txt: ${server_version_response.status}`);
        }

        const server_version = (await server_version_response.text()).trim();

        // Compare versions
        if (stored_version !== server_version) {
            version = server_version;

            const { minor, major } = version_update_severity(stored_version, server_version);
            minor_outdated = minor;
            major_outdated = major;
            
            // Only prompt if there was a previous version (not first visit)
            const should_prompt = stored_version !== null;
            return should_prompt;
        }

        console.log('✅ Versions match - no update needed');
        return false;
    } catch (error) {
        console.error('❌ Error checking version:', error);
        return false;
    }
}

function version_update_severity(stored_version: string, server_version: string): { minor: boolean, major: boolean } {
    const stored_parts = stored_version.split('.').map(Number);
    const server_parts = server_version.split('.').map(Number);

    if (stored_parts.length !== 3 || server_parts.length !== 3) {
        console.error('Invalid version format:', stored_version, server_version);
        return { minor: false, major: false };
    }

    // Compare major versions
    if (server_parts[0] > stored_parts[0]) {
        return { minor: false, major: true }; // Major update
    }
    if (server_parts[0] === stored_parts[0]) {
        // Compare minor versions
        if (server_parts[1] > stored_parts[1]) {
            return { minor: true, major: false }; // Minor update
        }
        if (server_parts[1] === stored_parts[1]) {
            // Compare patch versions
            if (server_parts[2] > stored_parts[2]) {
                return { minor: false, major: false }; // Patch update
            }
        }
    }

    // No update needed
    return { minor: false, major: false };
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
