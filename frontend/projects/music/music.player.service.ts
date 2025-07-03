import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MusicMediaService, Song_Identifier, Song_Data, Song_Playlist } from './music.media.service';

export interface Song_Queue {
    queue: Song_Identifier[];
}

@Injectable({
  providedIn: 'root'
})
export class MusicPlayerService {
    // private song_blob_cache: Map<string, Blob> = new Map();

    private current_song: Song_Identifier | null = null; // Current song being played
    private current_song_data: Song_Data | null = null; // Current song data

    private play_next_queue: Song_Queue = {queue:[]};
    private playlist_queue: Song_Queue = {queue:[]};
    private history_stack: Song_Queue = {queue:[]};
    private current_playlist: Song_Playlist | null = null;

    private audio_element: HTMLAudioElement | null = null;
    public thumbnail_element: HTMLImageElement | null = null;
    get player_status(): 'loading' | 'playing' | 'paused' | 'stopped' {
        if (!this.audio_element) return 'stopped';
        if (this.audio_element.paused) return 'paused';
        if (this.audio_element.readyState < 2) return 'loading'; // Not enough data to play
        return 'playing';
    }

    set shuffle(value: boolean) {
        this._shuffle = value;
        if (value) this.shuffle_playlist();
    }
    get shuffle(): boolean {
        return this._shuffle;
    }
    get playlist(): Song_Playlist | null {
        return this.current_playlist;
    }
    get song_data(): Song_Data | null {
        return this.current_song_data;
    }
    get current_time(): number {
        return this.audio_element ? this.audio_element.currentTime : 0; 
    }
    get duration(): number {
        return this.audio_element ? this.audio_element.duration : 0; 
    }

    private _shuffle: boolean = false;
    private _repeat: number = 0; // how many times to repeat the current track (0 = no repeat, 1 = repeat once, etc.)
    // private _crossfade_duration: number = 2; // default crossfade duration in seconds

    set audio_source_element(element: HTMLAudioElement) {
        this.audio_element = element;
        console.log("Audio element set:", element);
        this.intialize_audio_enviroment();
    }
    set thumbnail_source_element(element: HTMLImageElement) {
        this.thumbnail_element = element;
    }

    constructor(private media: MusicMediaService) { }

    public load_playlist(playlist: Song_Playlist, keep_hsitroy?: boolean, play_imediately: boolean = true): void {
        this.current_playlist = playlist;
        this.playlist_queue.queue = [...playlist.list];
        if(!keep_hsitroy) this.history_stack.queue = []; // Clear history stack when loading a new playlist

        if(this._shuffle) this.shuffle_playlist();

        // Only skip to next if we don't have a current song
        if (!this.current_song || play_imediately) {
            this.skip_to_next(); // Load the first track in the playlist
        }
    }

    private async load_track(track_key: string): Promise<void> {
        if (!this.audio_element) throw new Error("Audio element is not set.");

        const source_url = await this.media.get_audio_source_from_indexDB(track_key);
        if (!source_url) throw new Error(`Track with key ${track_key} not found.`);

        this.audio_element.src = source_url;
        this.audio_element.load();

        const song_data = await this.media.get_song_data(track_key);
        this.current_song_data = song_data;
        this.update_media_session(song_data, track_key);
        
        console.log(`Loaded track: ${track_key}`);
    } 

    // Preload next track for smooth transitions
    private async preload_next_track(track_key: string): Promise<void> {
        
    }

    private async intialize_audio_enviroment(): Promise<void> {
        if(!this.audio_element) throw new Error("Audio element is not set.");

        this.setup_audio_listeners();
        this.setup_media_session();
    }
    
    private setup_media_session(): void {
        if ('mediaSession' in navigator && this.audio_element) {
            // Set up media session handlers
            navigator.mediaSession.setActionHandler('play', () => {
                this.play();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                this.pause();
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                this.skip_to_next();
            });

            navigator.mediaSession.setActionHandler('previoustrack', () => {
                this.skip_to_previous();
            });

            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime && this.audio_element) {
                    this.audio_element.currentTime = details.seekTime;
                }
            });
        }
    }

    // Update media session metadata
    private async update_media_session(song: Song_Data | null, track_key: string): Promise<void> {
        const artwork = song ? await this.media.get_song_artwork(song) || "" : `/audio/artwork/${track_key}`;
        if ('mediaSession' in navigator && navigator.mediaSession && song) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song?.song_name,
                artist: song?.original_artist_name,
                // album: song.album,
                artwork: [
                    { src: artwork, sizes: '512x512', type: 'image/png' }
                ]
            });
        }

        if(!this.thumbnail_element) throw new Error("Thumbnail element is not set.");
        this.thumbnail_element.src = artwork;
    }

    // Audio event listeners
    private setup_audio_listeners(): void {
        if (!this.audio_element) return;

        // this.audio_element.addEventListener('loadedmetadata', () => {
        //     this.update_player_state({ 
        //         duration: this.audio_element?.duration || 0 
        //     });
        // });

        // this.audio_element.addEventListener('timeupdate', () => {
        //     this.update_player_state({ 
        //         current_time: this.audio_element?.currentTime || 0 
        //     });
        // });

        // this.audio_element.addEventListener('play', () => {
        //     this.update_player_state({ is_playing: true });
        // });

        // this.audio_element.addEventListener('pause', () => {
        //     this.update_player_state({ is_playing: false });
        // });

        this.audio_element.addEventListener('ended', () => {
            this.handle_track_ended();
        });
    }

    private handle_track_ended(): void {
        this.skip_to_next();
    }

    async play(): Promise<void> {
        if (!this.audio_element) throw new Error("Audio element is not set.");
        await this.audio_element.play();
    }

    async pause(): Promise<void> {
        if (!this.audio_element) throw new Error("Audio element is not set.");
        this.audio_element.pause();
    }

    toggle_play(): void {
        if (!this.audio_element) throw new Error("Audio element is not set.");
        if (this.audio_element.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    async crossfade_to_next(fade_duration: number = 2): Promise<void> {
        
    }

    async load_and_play_track(track_key: string): Promise<void> {
        if (!this.audio_element) throw new Error("Audio element is not set.");
        
        this.current_song = { video_id: track_key, source: 'youtube' };
        await this.load_track(track_key);
        await this.play();
    }

    async skip_to_next(): Promise<void> {
        if(this._repeat) {
            // If repeat is enabled, just replay the current track
            this._repeat--;
            if (this.audio_element) {
                this.audio_element.currentTime = 0; 
                await this.play();
                return;
            }
        }

        // Add current song to history BEFORE moving to next
        if(this.current_song) {
            this.history_stack.queue.push(this.current_song);
            // Limit history size
            if (this.history_stack.queue.length > 100) {
                this.history_stack.queue.shift();
            }
        }

        // Check play_next_queue first (priority)
        let next_song: Song_Identifier | null = null;
        if (this.play_next_queue.queue.length > 0) {
            next_song = this.play_next_queue.queue.shift()!;
        } else if (this.playlist_queue.queue.length > 0) {
            next_song = this.playlist_queue.queue.shift()!;
        }

        if (next_song) {
            this.pause();
            if(this.thumbnail_element) this.thumbnail_element.src = "";
            this.current_song = next_song; 
            await this.load_track(next_song.video_id);
            await this.play();
            return;
        }

        // If no more songs, reload playlist
        if(this.current_playlist) {
            console.log("No next track available, reloading current playlist...");
            this.load_playlist(this.current_playlist, true, true); // Keep history
            console.log(this.current_playlist);

        } else {
            throw new Error("No next track available and no current playlist loaded.");
        }
    }

    async skip_to_previous(): Promise<void> {
        // If more than 5 seconds in, restart current song
        if (this.audio_element && this.audio_element.currentTime > 5) {
            this.audio_element.currentTime = 0;
            return;
        }

        // Get previous song from history
        const previous_song = this.history_stack.queue.pop();
        
        if (previous_song) {
            this.pause();
            if(this.thumbnail_element) this.thumbnail_element.src = "";
            // Put current song back at front of playlist queue for future navigation
            if (this.current_song) {
                this.playlist_queue.queue.unshift(this.current_song);
            }
            
            // Update current song and play
            this.current_song = previous_song;
            this._repeat = 0; // Reset repeat 
            
            await this.load_track(previous_song.video_id);
            await this.play();
        } else {
            // No history, just restart current song
            if (this.audio_element) {
                this.audio_element.currentTime = 0;
            }
        }
    }

    set_volume(volume: number): void {
        if (this.audio_element) {
            this.audio_element.volume = Math.max(0, Math.min(1, volume));
        }
    }

    seek_to(time: number): void {
        if (this.audio_element) {
            this.audio_element.currentTime = time;
        }
    }

    shuffle_playlist(): void {
        if (this.playlist_queue.queue.length > 0) {
            this.playlist_queue.queue.sort(() => Math.random() - 0.5);
        }
    }

    // Add helper method to check queue state
    get_queue_state() {
        return {
            current_song: this.current_song,
            playlist_queue_length: this.playlist_queue.queue.length,
            play_next_queue_length: this.play_next_queue.queue.length,
            history_length: this.history_stack.queue.length,
            has_next: this.play_next_queue.queue.length > 0 || this.playlist_queue.queue.length > 0,
            has_previous: this.history_stack.queue.length > 0
        };
    }
}
