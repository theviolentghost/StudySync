import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MusicMediaService, Song_Search_Result } from '../../music.media.service';
import { MusicPlayerService } from '../../music.player.service';

@Component({
  selector: 'media-search',
  imports: [FormsModule, CommonModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent {
    search_query: string = '';
    search_history: string[] = []; //list of previous queries
    // search_results: Song_Search_Result = {
    //     artists: { total: 0, results: [] },
    //     videos: { total: 0, results: [] }
    // };
    // Example TypeScript temp data for search_results
search_results: Song_Search_Result = {
    artists: {
        total: 2,
        results: [
            {
                snippet: {
                    title: "Lo-Fi Girl",
                    thumbnails: {
                        default: { url: "https://i.imgur.com/lofigirl.jpg" }
                    }
                }
            },
            {
                snippet: {
                    title: "Chillhop Music",
                    thumbnails: {
                        default: { url: "https://i.imgur.com/chillhop.jpg" }
                    }
                }
            }
        ]
    },
    videos: {
        total: 2,
        results: [
            {
                kind: "youtube#searchResult",
                etag: "etag1",
                id: {
                    kind: "youtube#video",
                    videoId: "n61ULEU7CO0"
                },
                snippet: {
                    publishedAt: "2021-01-01T00:00:00Z",
                    channelId: "UCSJ4gkVC6NrvII8umztf0Ow",
                    title: "Best of lofi hip hop 2021 ✨ [beats to relax/study to]",
                    description: "A collection of the best lofi hip hop beats.",
                    thumbnails: {
                        default: { url: "https://i.imgur.com/lofi1.jpg" },
                        medium: { url: "https://i.imgur.com/lofi1m.jpg" },
                        high: { url: "https://i.imgur.com/lofi1h.jpg" }
                    },
                    channelTitle: "Lo-Fi Girl",
                    liveBroadcastContent: "none",
                    publishTime: "2021-01-01T00:00:00Z"
                }
            },
            {
                kind: "youtube#searchResult",
                etag: "etag2",
                id: {
                    kind: "youtube#video",
                    videoId: "9bJODxRcARk"
                },
                snippet: {
                    publishedAt: "2024-01-27T12:00:11Z",
                    channelId: "UCujiOLiVbYSGAVfty8ezInQ",
                    title: "Yung Filly - Grey (Lyrics)",
                    description: "Yung Filly - Grey Please Donate Any Amount You Can Here: ...",
                    thumbnails: {
                        default: { url: "https://i.imgur.com/chillhop2.jpg" },
                        medium: { url: "https://i.imgur.com/chillhop2m.jpg" },
                        high: { url: "https://i.imgur.com/chillhop2h.jpg" }
                    },
                    channelTitle: "Bulldog Lyrics UK",
                    liveBroadcastContent: "none",
                    publishTime: "2024-01-27T12:00:11Z"
                }
            }
        ]
    }
};

    constructor(private media: MusicMediaService, private player: MusicPlayerService) {}

    clear_input(): void {
        this.search_query = '';
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
        if (this.search_query.trim() === '') return; 
        console.log(`Searching for: ${query}`);

        this.search_results = await this.media.search(query);
        console.log('Search results:', this.search_results);

        this.search_history.push(this.search_query);
    }

    async play_video(video: any): Promise<void> {
        console.log(video)
        // save video to indexDB for 'recently played'
        const video_id = video.snippet?.videoId || video.id?.videoId;
        if (!video_id) return;
        console.log(`Playing video with ID: ${video_id}`);

        await this.media.save_song_to_indexDB(video_id, {
            original_song_name: video.snippet?.title || '',
            original_artist_name: video.snippet?.channelTitle || '',
            song_name: video.snippet?.title || '',
            downloaded: false,
            download_audio_blob: null,
            download_artwork_blob: null,
            download_options: null,
            id: {
                video_id: video_id,
                source: 'youtube',
            },
            liked: false,
        });

        this.player.load_and_play_track(video_id);
    }
}
