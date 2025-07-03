import { Injectable } from '@angular/core';
import { set, get } from 'idb-keyval';
import { lastValueFrom } from 'rxjs';

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
    download_audio_blob?: Blob | null; // the actual audio blob, if downloaded
    download_artwork_blob?: Blob | null; // the artwork blob, if available
    download_options?: { 
        quality: DownloadQuality,
        bit_rate: string // set to specifrics laters
    } | null; 
    video_duration?: number; // the duration of the video in seconds, if available
    lyrics?: Song_Lyrics,
    id: Song_Identifier; // the where this song was downloaded
    liked?: boolean; // whether the song is liked by the user
}

export interface Song_Identifier {
    video_id: string; // the video ID from which this song was downloaded
    source: 'youtube' | 'soundcloud' | 'other';
}

export interface Song_Lyrics {
    // nothing for now
}

export interface Song_Playlist_Identifier {
    id: string; 
    name: string; 
    track_count?: number;
    default?: boolean;
}

export interface Song_Playlist {
    list: Song_Identifier[];
    name: string; 
    default?: boolean; // whether this is a default playlist
}

export interface Song_Search_Result {
    artists?: { total: number, results: any[], next_page_token?: string },
    videos?: { total: number, results: any[], next_page_token?: string }
}

@Injectable({
  providedIn: 'root'
})
export class MusicMediaService {

    constructor(private Auth: AuthService, private http: HttpClient) { }

    async download_audio(video_id: string, download_options: {quality: DownloadQuality, bit_rate: string}): Promise<void> {
        try {
            this.listen_to_progress(video_id);
            const [audio_blob, artwork_blob] = await Promise.all([
                lastValueFrom(
                    this.http.post(
                        `${this.Auth.backendURL}/audio/download/${video_id}`,
                        { ...download_options },
                        { responseType: 'blob' }
                    )
                ),
                lastValueFrom(
                    this.http.get(
                        `${this.Auth.backendURL}/audio/artwork/${video_id}`,
                        { responseType: 'blob' }
                    )
                )
            ]);
            console.log('Audio blob downloaded:', audio_blob);
            console.log('Artwork blob downloaded:', artwork_blob);
            
            this.save_song_to_indexDB(video_id, {
                original_song_name: '', 
                original_artist_name: '', 
                song_name: '', 
                downloaded: true,
                download_audio_blob: audio_blob,
                download_artwork_blob: artwork_blob,
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
        if (song_data && song_data.downloaded && song_data.download_audio_blob) {
            return URL.createObjectURL(song_data.download_audio_blob);
        }
        return ((await lastValueFrom(
                this.http.get(
                    `${this.Auth.backendURL}/audio/stream/${key}`,
                )
            )) as any)?.url || null;
    }

    async get_song_artwork(song: Song_Data): Promise<string | null> {
        if (song.downloaded && song.download_artwork_blob) {
            return URL.createObjectURL(song.download_artwork_blob);
        }

        // return null;
        // If the song is not downloaded, we can try to fetch it from the server
        try {
            const response = await lastValueFrom(
                this.http.get(`${this.Auth.backendURL}/audio/artwork/${song.id.video_id}`, { responseType: 'blob' })
            );
            return response ? URL.createObjectURL(response) : null;
        } catch (error) {
            console.error('Error fetching song artwork:', error);
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

    async get_playlist_from_indexDB(playlist_identifier: Song_Playlist_Identifier): Promise<Song_Playlist> {
        try {
            const playlist = await get(`#playlist_${playlist_identifier.id}`);
            if (playlist) {
                console.log('Playlist retrieved from IndexedDB:', playlist_identifier);
                return playlist;
            } else {
                console.warn(`No playlist found in IndexedDB for identifier: ${playlist_identifier.id}`);
                return { list: [], name: playlist_identifier.name, default: false };
            }
        } catch (error) {
            console.error('Error retrieving playlist from IndexedDB:', error);
            return { list: [], name: playlist_identifier.name, default: false };
        }
    }

    async save_playlist_to_indexDB(playlist_identifier: Song_Playlist_Identifier, playlist: Song_Playlist): Promise<void> {
        try {
            await set(`#playlist_${playlist_identifier.id}`, playlist);
            console.log('Playlist saved to IndexedDB:', playlist_identifier);
        } catch (error) {
            console.error('Error saving playlist to IndexedDB:', error);
        }
    }

    readonly DEFAULT_PLAYLISTS: Song_Playlist_Identifier[] = [
        {
            id: '#favorites',
            name: 'Favorites',
            default: true
        },
        {
            id: '#downloads',
            name: 'Downloads',
            default: true
        },
        {
            id: '#recently_played',
            name: 'Recently Played',
            default: true
        },
        {
            id: '#recently_added',
            name: 'Recently Added',
            default: true
        },
    ];
    async get_all_playlist_identifiers_from_indexDB(): Promise<Song_Playlist_Identifier[]> {
        try {
            const playlists: Song_Playlist_Identifier[] = await get('#playlists') || [];
            if (playlists.length > 0) {
                console.log('Playlists retrieved from IndexedDB:', playlists);
                return playlists;
            }
            console.log('No playlists found in IndexedDB.');
            return this.DEFAULT_PLAYLISTS;
        } catch (error) {
            console.error('Error retrieving playlists from IndexedDB:', error);
            return this.DEFAULT_PLAYLISTS;
        }
    }

    async save_playlist_identifiers_to_indexDB(playlists: Song_Playlist_Identifier[]): Promise<void> {
        try {
            await set('#playlists', playlists);
            console.log('Playlists saved to IndexedDB:', playlists);
        } catch (error) {
            console.error('Error saving playlists to IndexedDB:', error);
        }
    }

    async search(query: string): Promise<Song_Search_Result> {
        try {
            const response = await lastValueFrom(
                this.http.get(`${this.Auth.backendURL}/music/search`, { params: { q: query } })
            );
            return response as Song_Search_Result; 
        } catch (error) {
            console.error('Error during search:', error);
            return {};
        }
    }
}
