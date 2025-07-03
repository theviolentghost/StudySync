import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MusicMediaService, Song_Data, DownloadQuality, Song_Playlist } from '../../music.media.service';
import { MusicPlayerService } from '../../music.player.service';

@Component({
  selector: 'media-player',
  imports: [CommonModule],
  templateUrl: './media.player.component.html',
  styleUrl: './media.player.component.css'
})
export class MediaPlayerComponent implements AfterViewInit {
    visibility_status: 'visible' | 'reduced' | 'hidden' = 'hidden';
    buffered_percent = 0;

    get current_song_data(): Song_Data | null {
        return this.player.song_data;
    }
    get current_playlist_data(): Song_Playlist | null {
        return this.player.playlist;
    }
    // get audio_current_time(): number {
    //     return this.player.current_time;
    // }
    // get audio_duration(): number {
    //     return this.player.duration;
    // }
    audio_current_time = 0;
    audio_duration = 0;

    constructor(private media: MusicMediaService, private player: MusicPlayerService) {}

    get player_status(): 'loading' | 'playing' | 'paused' | 'stopped' {
        const status = this.player.player_status;
        if(status === 'loading') {
            this.visibility_status = 'visible';
        }
        return status;
    }

    async test() {
        // const playlist = await this.media.get_playlist_from_indexDB('playlist_1');
        // if(!playlist) return;

        // this.player.load_playlist(playlist);
        // this.media.download_audio('xS3jjiy2uOg', {quality: DownloadQuality.Q0, bit_rate: '128K'});
    }

    ngAfterViewInit() {
        const audio = document.getElementById('audio') as HTMLAudioElement;
        audio.ontimeupdate = () => this.audio_current_time = audio.currentTime;
        audio.onloadedmetadata = () => this.audio_duration = audio.duration;
        audio.addEventListener('progress', () => {
            if (audio.buffered.length > 0 && audio.duration > 0) {
                const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                this.buffered_percent = (bufferedEnd / audio.duration) * 100;
            }
        });

        this.player.audio_source_element = audio;
        this.player.thumbnail_source_element = document.getElementById('thumbnail') as HTMLImageElement;
    }

    on_seek(event: Event) {
        this.player.seek_to(Number((event.target as HTMLInputElement).value));
    }

    toggle_visibility(): void {
        if (this.visibility_status === 'visible') {
            this.visibility_status = 'reduced';
        } else if (this.visibility_status === 'reduced') {
            this.visibility_status = 'visible';
        }
    }
    toggle_like(): void {
        if(!this.current_song_data) return;
        this.current_song_data.liked = !this.current_song_data?.liked;
    }
    toggle_shuffle(): void {
        this.player.shuffle = !this.player.shuffle;
    }
    get shuffle(): boolean {
        return this.player.shuffle;
    }
    toggle_play(): void {
        this.player.toggle_play();
       //this.player_status = this.player.is_playing ? 'playing' : 'paused';
    }
    previous(): void {
        this.player.skip_to_previous();
        // this.player_status = 'playing'; // Assuming the player starts playing the previous track
    }
    next(): void {
        this.player.skip_to_next();
        // this.player_status = 'playing'; // Assuming the player starts playing the next track
    }
    async get_song_artwork(song: Song_Data | null): Promise<string | null> {
        if (!song) return null;
        return await this.media.get_song_artwork(song) || '';
    }
}
