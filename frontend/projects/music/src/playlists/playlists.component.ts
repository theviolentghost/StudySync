import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MusicMediaService, Song_Data, Song_Identifier, Song_Playlist, Song_Playlist_Identifier } from '../../music.media.service';

@Component({
  selector: 'app-playlists',
  imports: [CommonModule],
  templateUrl: './playlists.component.html',
  styleUrl: './playlists.component.css'
})
export class PlaylistsComponent {
    videos: Song_Data[] = []; //loaded videos from playlist
    playlist_identifiers: Song_Playlist_Identifier[] = [];
    default_playlist_identifiers: Song_Playlist_Identifier[] = []
    selected_playlist: Song_Playlist | null = null;
    selected_playlist_videos: Song_Data[] = [];

    constructor(private media: MusicMediaService) {
        this.load_playlists();
    }

    async load_playlists(): Promise<void> {
        const all_playlist_identifiers = await this.media.get_all_playlist_identifiers_from_indexDB();
        this.default_playlist_identifiers = all_playlist_identifiers.filter(p => p?.default === true);
        this.playlist_identifiers = all_playlist_identifiers.filter(p => !p?.default);
    }

    async save_playlists(): Promise<void> {
        await this.media.save_playlist_identifiers_to_indexDB([...this.default_playlist_identifiers, ...this.playlist_identifiers]);
    }

    async create_playlist(): Promise<void> {
        
    }

    async select_playlist(playlist: Song_Playlist_Identifier): Promise<void> {

    }
}
