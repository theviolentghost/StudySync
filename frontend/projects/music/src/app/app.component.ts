import { Component, ElementRef } from '@angular/core';
import { AuthService } from '../../../../src/app/auth.service';

import { set, get } from 'idb-keyval';

@Component({
    selector: 'app-root',
    imports: [],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})

export class AppComponent {
    title = 'music';

    constructor(private elementRef: ElementRef, private Auth: AuthService) {}

    async download_audio_blob_to_indexDB(url: string, key: string): Promise<void> {
        try {
            // console.log('Downloading audio blob from URL:', url, `${this.Auth.backendURL}/${url}`);
            const response = await fetch(`${this.Auth.backendURL}/${url}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            this.save_audio_blob_to_indexDB(key, blob);
        } catch (error) {
            console.error('Error downloading audio blob:', error);
        }

    }
    async save_audio_blob_to_indexDB(key: string, blob: Blob) {
        await set(key, blob);
    }
    async load_audio_blob_from_indexDB(key: string): Promise<string | null> {
        const blob = await get(key);
        if (blob) {
            return URL.createObjectURL(blob);
        }
        return null;
    }

    async load_audio_blob_from_indexDB_and_play(key: string): Promise<void> {
        const audio_element = this.elementRef.nativeElement.querySelector('audio');
        audio_element.src = await this.load_audio_blob_from_indexDB(key);
        audio_element.load(); // Load the new source
        audio_element.play().then(() => {
            console.log('Audio playback started successfully');
        });
    }
}
