import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MusicMediaService, Song_Data, Song_Identifier, Song_Search_Result, Song_Source} from '../../music.media.service';
import { MusicPlayerService } from '../../music.player.service';
import { HotActionService } from '../../hot.action.service';

@Component({
  selector: 'media-search',
  imports: [FormsModule, CommonModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements AfterViewInit {
    @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;

    search_source: Song_Source = 'spotify'; // default search source
    search_query: string = '';
    searched: boolean = false; // whether the user has performed a search
    search_history: string[] = []; //list of previous queries
    search_results: Song_Search_Result = {
        artists: { total: 0, results: [] },
        videos: { total: 0, results: [] }
    };
    song_data_cache: Map<string, Song_Data | null> = new Map(); // bare_song_key to Song_Data mapping for quick playback
    search_recommendations: any[] = []; 

    source_dropdown_open: boolean = false;
    source_dropdown_options: {source: Song_Source, color: string}[] = [{source: 'spotify', color: "#1cd760"}, {source: 'youtube', color: "#ff0033"}];

    toggle_source_dropdown(): void {
        this.source_dropdown_open = !this.source_dropdown_open;
    }
    select_source(source: Song_Source): void {
        this.source_dropdown_open = false;
        if(this.search_source === source) return;
        this.search_source = source;
        this.search_results = {};
    }

    get artist_results(): any[] {
        const artists = this.search_results?.artists;
        if (!artists) return [];
        // Spotify-style
        if ('items' in artists) return artists.items;
        // YouTube-style
        if ('results' in artists) return artists.results;
        return [];
    }

    debounce_input_timeout: any = null;
    debounce_input_time: number = 400; 
    on_search_input_change(): void {
        if (this.debounce_input_timeout) {
            clearTimeout(this.debounce_input_timeout);
        }
        this.debounce_input_timeout = setTimeout(() => {
            this.get_search_recommendations(this.search_query);
        }, this.debounce_input_time);
    }

    async get_search_recommendations(query: string): Promise<void> {
        if (query.trim() === '') {
            this.search_recommendations = [];
            return;
        }
        try {
            const recommendations = await this.media.get_search_recommendations(query);
            console.log('Search recommendations:', recommendations);
            this.search_recommendations = recommendations;
        } catch (error) {
            console.error('Error fetching search recommendations:', error);
            this.search_recommendations = [];
        }
    }
                

    ms_to_time(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    constructor(private media: MusicMediaService, private player: MusicPlayerService, private hot_action: HotActionService) {}

    ngAfterViewInit(): void {
        // Auto-focus the search input when component loads
        if (this.searchInput) {
            this.searchInput.nativeElement.focus();
        }
    }

    clear_input(): void {
        this.search_query = '';
        this.search_recommendations = [];
        // Keep focus on input after clearing
        if (this.searchInput) {
            this.searchInput.nativeElement.focus();
        }
    }

    left_quick_action_click(): void {
        if(this.search_history.length === 0) {
            // Perform search action
            this.search(this.search_query);
        }
        else {
            // Go back to previous search
            if (this.search_history.length > 0) {
                this.search_query = this.search_history.pop() || '';
            }
        }
    }

    async search(query: string = this.search_query): Promise<void> {
        if (query.trim() === '') return; 

        this.search_query = query.trim();
        this.search_recommendations = []; // Clear recommendations on new search
        // get rid of search focus
        if (this.searchInput) {
            this.searchInput.nativeElement.blur();
        }
        console.log(`Searching for: ${query}:`, this.search_source);

        this.song_data_cache.clear();
        this.search_results = await this.media.search(query, this.search_source);
        this.searched = true; 
        console.log('Search results:', this.search_results);

        this.search_history.push(query);
    }

    async youtube_play(video: any): Promise<void> {
        this.player.song_changed.emit();
        const cache = this.song_data_cache.get(this.media.bare_song_key({source: 'youtube', video_id: video.snippet?.videoId || video.id?.videoId}));
        let track_data: Song_Data | null = cache || await this.hot_action.youtube_track_data(video);
        if(!track_data) return;

        this.media.get_watch_playlist(track_data.id.video_id).then(async (playlist) => {
            if (playlist && playlist.songs && playlist.songs.length > 0) {
                await this.player.load_playlist(playlist, false, false);
                this.player.load_song_data_array_into_playlist_cache(playlist.song_data || []);
            } else {
                console.warn('No tracks found in the watch playlist for:', track_data?.id.video_id);
            }
        }).catch((error) => {
            console.error('Error fetching watch playlist:', error);
        });

        this.player.open_player.emit();

        this.player.update_media_session(track_data, track_data.id.video_id);

        await this.player.load_and_play_track(this.media.song_key(track_data.id), track_data);
        if(!cache) {
            track_data = await this.media.get_song_from_indexDB(this.media.song_key(track_data.id)); // Ensure player has the latest song data
            if(!track_data) return;
            this.player.song_data = track_data;
            this.media.save_song_to_indexDB(this.media.song_key(track_data.id), track_data);
        }
    }

    async spotify_play(video: any): Promise<void> {
        this.player.song_changed.emit(); 
        this.player.update_media_session({
            original_song_name: video.name || '',
            original_artists: video.artists.map((artist: any) => ({ name: artist.name, id: artist.id, source: 'spotify' })) || [],
            song_name: video.name || '',
            downloaded: false,
            download_audio_blob: null,
            download_artwork_blob: null,
            download_options: null,
            id: {
                video_id: '', // null, faster loading
                source_id: '', // Use video.id or video.uri for Spotify
                source: 'spotify',
            },
            url: {
                audio: null,
                artwork: {
                    low: video.album?.images?.[2]?.url || null,
                    high: video.album?.images?.[0]?.url || null,
                },
            },
            colors: {
                primary: null,
                common: null,
            },
            video_duration: video.duration_ms,
            liked: false
        }, '');

        this.player.open_player.emit();

        const cache = this.song_data_cache.get(this.media.bare_song_key({source: 'spotify', source_id: video.id || video.uri || '', video_id: ''}));
        let track_data: Song_Data | null = cache || await this.hot_action.spotify_track_data(video);
        if(!track_data) return;

        this.media.get_watch_playlist(track_data.id.video_id).then(async (playlist) => {
            if (playlist && playlist.songs && playlist.songs.length > 0) {
                await this.player.load_playlist(playlist, false, false);
                this.player.load_song_data_array_into_playlist_cache(playlist.song_data || []);
            } else {
                console.warn('No tracks found in the watch playlist for:', track_data?.id.video_id);
            }
        }).catch((error) => {
            console.error('Error fetching watch playlist:', error);
        });

        await this.player.load_and_play_track(this.media.song_key(track_data.id), track_data);
        if(!cache) {
            track_data = await this.media.get_song_from_indexDB(this.media.song_key(track_data.id)); // Ensure player has the latest song data
            if(!track_data) return;
            this.player.song_data = track_data; 
            this.media.save_song_to_indexDB(this.media.song_key(track_data.id), track_data);
        }
    }

    async open_hot_action(video: any, source: Song_Source): Promise<void> {
        this.hot_action.open_hot_action(video, source);
    }

    is_song_in_collection(video: any, source: Song_Source): boolean {
        if (!video || !source) return false;

        let identifier: Song_Identifier | null = this.get_video_identifier(video, source);
        if (!identifier) return false;

        const bare_song_key = this.media.bare_song_key(identifier);
        const in_collection: boolean = this.media.is_song_in_collection(bare_song_key, true);
        if (in_collection) this.add_to_cache(bare_song_key, video, source);
        return in_collection;
    }

    get_song_data_in_collection(video: any, source: Song_Source): Song_Data | null {
        if (!video || !source) return null;
        let identifier: Song_Identifier | null = this.get_video_identifier(video, source);
        if (!identifier) return null;
        const bare_song_key = this.media.bare_song_key(identifier);
        if (this.song_data_cache.has(bare_song_key)) {
            return this.song_data_cache.get(bare_song_key) || null; // Return cached song data or null if not found
        }
        return null; // Not cached
    }

    get_video_identifier(video: any, source: Song_Source): Song_Identifier | null {
        switch(source) {
            case 'youtube': return { video_id: video.snippet?.videoId || video.id?.videoId, source: 'youtube' };
            case 'spotify': return { video_id: '', source_id:  video.id  || video.uri  || '', source }
            default: return null; // Unsupported source
        }
    }

    async add_to_cache(bare_song_key: string, video: any, source: Song_Source): Promise<void> {
        if (this.song_data_cache.has(bare_song_key)) return; // Already cached
        this.song_data_cache.set(bare_song_key, null); // Initialize with null to avoid duplicate requests

        let identifier: Song_Identifier | null = null;
        switch (source) {
            case 'youtube':
                identifier = await this.hot_action.youtube_track_identifier(video);
                break;
            case 'spotify':
                identifier = await this.hot_action.spotify_track_identifier(video);
                break;
            default:
                console.error(`Unsupported source: ${source}`);
                return; // Unsupported source
        }
        if (!identifier) {
            console.error('Failed to get identifier for video:', video);
            return; 
        }

        const song_data: Song_Data | null = await this.media.get_song_from_indexDB(this.media.song_key(identifier));
        if(!song_data) {
            console.error('Failed to get song data from indexDB for identifier:', identifier);
            return; 
        }

        this.song_data_cache.set(bare_song_key, song_data);
    }

    get current_song_identifier(): Song_Identifier | null {
        return this.player.song_data ? this.player.song_data.id : null;
    }

    get_bare_song_key(identifier: Song_Identifier | null | undefined): string {
        if (!identifier) return '';
        return this.media.bare_song_key(identifier);
    }

    source_options: Map<Song_Source, string> = new Map([
        ['spotify', "#1cd760"],
        ['youtube', "#ff0033"],
        ['musi', "#ff8843"],
        ['musix', "#ff8843"],
    ]);

    get_search_primary_color(): string {
        // const source_color = this.source_options.get(this.search_source);
        const source_color = "";
        return source_color || 'var(--color-primary)'; // Default color if not found
    }
}