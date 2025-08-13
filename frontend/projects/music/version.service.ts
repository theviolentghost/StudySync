import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
    private _version: string = '0.0.0';
    private _minor_outdated: boolean = false; // is app minor outdated? (0.0.0 -> 0.1.0) or (0.0.0 -> 0.0.1)
    private _major_outdated: boolean = false; // is app major outdated? (0.0.0 -> 1.0.0) or (0.0.0 -> 1.1.0)
    
    // Observable for critical updates that require reload
    private _critical_update_available = new BehaviorSubject<boolean>(false);
    public critical_update_available$ = this._critical_update_available.asObservable();
    
    private _update_message: string = '';
    private _show_update_prompt: boolean = false;

    constructor() {
        this.initialize_service_worker_listener();
    }

    private initialize_service_worker_listener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, payload } = event.data;
                
                switch (type) {
                    case 'update_stored_version':
                        this.version = payload.version;
                        break;
                        
                    case 'critical_update_available':
                        this._critical_update_available.next(true);
                        this._update_message = payload.message || 'A critical update is available.';
                        this._show_update_prompt = true;
                        this.show_update_notification();
                        break;
                        
                    case 'critical_update_status':
                        if (payload.has_critical_update) {
                            this._critical_update_available.next(true);
                            this._show_update_prompt = true;
                        }
                        break;
                }
            });

            // Listen for service worker updates
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // Service worker has been updated, reload the page
                if (this._critical_update_available.value) {
                    this.force_reload();
                }
            });

            // Check if there's already a critical update pending
            this.check_for_pending_critical_update();
        }
    }

    private async check_for_pending_critical_update() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_CRITICAL_UPDATE'
            });
        }
    }

    private show_update_notification() {
        // Show update notification to user
        if (this.is_standalone_mode()) {
            // In PWA mode, show a more prominent notification
            this.show_standalone_update_dialog();
        } else {
            // In browser mode, can be less intrusive
            console.log('🔄 Update available:', this._update_message);
        }
    }

    private is_standalone_mode(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches ||
               (window.navigator as any).standalone === true;
    }

    private show_standalone_update_dialog() {
        // Create a simple update dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #007AFF;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 90%;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #007AFF;">Update Available</h3>
            <p style="margin: 0 0 20px 0; color: #333;">${this._update_message}</p>
            <button id="update-now" style="
                background: #007AFF;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 12px 24px;
                font-size: 16px;
                margin-right: 10px;
                cursor: pointer;
            ">Update Now</button>
            <button id="update-later" style="
                background: #f0f0f0;
                color: #333;
                border: none;
                border-radius: 8px;
                padding: 12px 24px;
                font-size: 16px;
                cursor: pointer;
            ">Later</button>
        `;

        document.body.appendChild(dialog);

        // Handle button clicks
        dialog.querySelector('#update-now')?.addEventListener('click', () => {
            this.apply_update();
            document.body.removeChild(dialog);
        });

        dialog.querySelector('#update-later')?.addEventListener('click', () => {
            document.body.removeChild(dialog);
            this._show_update_prompt = false;
        });
    }

    public async apply_update() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration && registration.waiting) {
                    // Tell the service worker to skip waiting
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                } else {
                    // No waiting service worker, just reload
                    this.force_reload();
                }
            } catch (error) {
                console.error('Error applying update:', error);
                this.force_reload();
            }
        }
    }

    private force_reload() {
        window.location.reload();
    }

    // Existing getters and setters
    set version(value: string) {
        this._version = value;
    }
    get version(): string {
        return this._version;
    }   
    set minor_outdated(value: boolean) {
        this._minor_outdated = value;
    }
    get minor_outdated(): boolean {
        return this._minor_outdated;
    }
    set major_outdated(value: boolean) {
        this._major_outdated = value;
    }
    get major_outdated(): boolean {
        return this._major_outdated;
    }

    get show_update_prompt(): boolean {
        return this._show_update_prompt;
    }

    get update_message(): string {
        return this._update_message;
    }
}
