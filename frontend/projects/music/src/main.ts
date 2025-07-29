import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { isDevMode } from '@angular/core';

// Register service worker
if ('serviceWorker' in navigator && !isDevMode()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/music/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          const { type, payload } = event.data;
          
          switch(type) {
            case 'GET_STORED_VERSION':
              const version = localStorage.getItem('app-version');
              event.ports[0].postMessage({ version });
              break;
              
            case 'UPDATE_STORED_VERSION':
              localStorage.setItem('app-version', payload.version);
              console.log('📦 Version updated in localStorage:', payload.version);
              break;
          }
        });
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', async () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available - check if we should prompt user
                const should_update = await should_update_app();
                console.log('🔄 Update check complete, should update:', should_update);
                if (should_update && confirm('New version available! Reload to update?')) {
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

async function should_update_app(): Promise<boolean> {
  try {
    // Get current stored version from localStorage
    const storedVersion = localStorage.getItem('app-version');
    
    // Fetch server version with cache busting
    const response = await fetch('/music/version.txt?' + Date.now());
    if (!response.ok) {
      throw new Error(`Failed to fetch version.txt: ${response.status}`);
    }
    
    const serverVersion = (await response.text()).trim();
    console.log('🔍 Version check - Stored:', storedVersion, 'Server:', serverVersion);
    
    // Compare versions
    if (storedVersion !== serverVersion) {
      // Update stored version in localStorage
      localStorage.setItem('app-version', serverVersion);
      
      // Only prompt if there was a previous version (not first visit)
      const shouldPrompt = storedVersion !== null;
      console.log('📊 Version mismatch detected, should prompt:', shouldPrompt);
      return shouldPrompt;
    }
    
    console.log('✅ Versions match - no update needed');
    return false;
  } catch (error) {
    console.error('❌ Error checking version:', error);
    // Default to allowing update on error (but don't update localStorage)
    return true;
  }
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
