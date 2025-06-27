import { Injectable } from '@angular/core';
import { set, get } from 'idb-keyval';
import { lastValueFrom } from 'rxjs';
import { parseBlob } from 'music-metadata-browser';
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../src/app/auth.service';

export enum DownloadQuality {
    "Q0" = '0', // high
    "Q1" = '1',
    "Q2" = '2',
    "Q3" = '3',
    "Q4" = '4',
    "Q5" = '5',
    "Q6" = '6',
    "Q7" = '7',
    "Q8" = '8',
    "Q9" = '9', //low

}

export interface Song_Data {
    original_song_name: string;
    original_artist_name: string;
    song_name: string; // modifiable
    downloaded: boolean;
    download_blob?: Blob | null; // the actual audio blob, if downloaded
    download_options?: { 
        quality: DownloadQuality,
        bit_rate: string // set to specifrics laters
    } | null; 
    video_duration?: number; // the duration of the video in seconds, if available
    lyrics?: Song_Lyrics,
    id: Song_Identifier; // the where this song was downloaded
}

export interface Song_Identifier {
    video_id: string; // the video ID from which this song was downloaded
    source: 'youtube' | 'soundcloud' | 'other';
}

export interface Song_Lyrics {
    // nothing for now
}

export interface Song_Playlist {
    list: Song_Identifier[];
    name: string; 
    // add more later
}

@Injectable({
  providedIn: 'root'
})
export class MusicMediaService {

    constructor(private Auth: AuthService, private http: HttpClient) { }

    async download_audio(video_id: string, download_options: {quality: DownloadQuality, bit_rate: string}): Promise<void> {
        try {
            this.listen_to_progress(video_id);
            const blob = await lastValueFrom(
                this.http.post(
                    `${this.Auth.backendURL}/audio/download/${video_id}`,
                    download_options,
                    { responseType: 'blob' }
                )
            );
            console.log('Audio blob downloaded:', blob);

            this.get_song_artwork_from_embed(blob)
            
            this.save_song_to_indexDB(video_id, {
                original_song_name: '', 
                original_artist_name: '', 
                song_name: '', 
                downloaded: true,
                download_blob: blob,
                download_options: download_options,
                id: { video_id: video_id, source: 'youtube' },
                video_duration: undefined, 
                lyrics: undefined 
            });
        } catch (error) {
            console.error('Error downloading audio blob:', error);
        }
    }

    async listen_to_progress(video_id: string) {
        console.log('Listening to progress for video ID:', video_id);
        const eventSource = new EventSource(`${this.Auth.backendURL}/audio/progress/${video_id}`);
        eventSource.onmessage = (event) => {
            const progress = JSON.parse(event.data);
            // Update your progress bar/UI here
            console.log('Progress:', progress);
        };
        eventSource.onerror = (err) => {
            eventSource.close();
        };
    }

    async save_song_to_indexDB(key: string, data: Song_Data): Promise<void> {
        try {
            await set(key, data);
            console.log('Song saved to IndexedDB with key:', key);
        } catch (error) {
            console.error('Error saving song to IndexedDB:', error);
        }
    }

    async get_song_from_indexDB(key: string): Promise<Song_Data | null> {
        try {
            const song_data = await get<Song_Data>(key);
            if (song_data) {
                console.log('Song retrieved from IndexedDB:', song_data);
                return song_data;
            } else {
                console.log('No song found in IndexedDB for key:', key);
                return null;
            }
        } catch (error) {
            console.error('Error retrieving song from IndexedDB:', error);
            return null;
        }
    }

    async get_audio_source_from_indexDB(key: string): Promise<string | null> {
        const song_data = await this.get_song_from_indexDB(key);
        if (song_data && song_data.downloaded && song_data.download_blob) {
            return URL.createObjectURL(song_data.download_blob);
        }
        return ((await lastValueFrom(
                this.http.get(
                    `${this.Auth.backendURL}/audio/stream/${key}`,
                )
            )) as any)?.url || null;
    }

    async get_song_artwork(song: Song_Data): Promise<string | null> {
        if (song.downloaded && song.download_blob) {
            return this.get_song_artwork_from_embed(song.download_blob);
        }

        return null;
        // If the song is not downloaded, we can try to fetch it from the server
        // try {
        //     const response = await lastValueFrom(
        //         this.http.get(`${this.Auth.backendURL}/audio/artwork/${song.id.video_id}`, { responseType: 'blob' })
        //     );
        //     return this.get_song_artwortk_from_embed(response);
        // } catch (error) {
        //     console.error('Error fetching song artwork:', error);
        //     return null;
        // }
    }

    async get_song_artwork_from_embed(blob: Blob): Promise<string | null> {
        try {
            const metadata = await parseBlob(blob);
            console.log('Extracted metadata:', metadata);
            if (metadata.common?.picture && metadata.common.picture.length > 0) {
                const picture = metadata.common.picture[0];
                console.log('Extracted artwork:', picture);
                return `data:${picture.format};base64,${btoa(String.fromCharCode(...new Uint8Array(picture.data)))}`;
            }
            return null;
        } catch (error) {
            console.error('Error extracting artwork from embed:', error);
            return null;
        }
    }

    async get_song_data(key: string): Promise<Song_Data | null> {
        const song_data = await this.get_song_from_indexDB(key);
        if (song_data) {
            return song_data;
        } else {
            console.warn(`No song data found for key: ${key}`);
            return null;
        }
    }

    async get_playlist_from_indexDB(playlist_id: string): Promise<Song_Playlist> {
        const playlist: Song_Playlist = {// temp
            list: [
                { video_id: 'J2X5mJ3HDYE', source: 'youtube' },
                { video_id: '6cZk0EAbe28', source: 'youtube' },
                { video_id: 'X7NK0yFoVfM', source: 'youtube' }
            ],
            name: 'My Playlist'
        }

        return playlist;
    }
}
