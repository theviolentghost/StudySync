import { Component} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { YoutubeService } from '../youtube.service';
import { PlaylistVideo } from '../youtube-playlist-results.model';
import { WatchHistoryService } from '../watch-history.service';


@Component({
  selector: 'app-video-select',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './video-select.component.html',
  styleUrl: './video-select.component.css'
})
export class VideoSelectComponent {
  videos:Number[] = [];

  constructor(private router: Router,
    private youtubeService: YoutubeService,
    private watchHistoryService: WatchHistoryService
  ){
    for(let i = 0; i < 25; i++){
      this.videos[i] = i;
    }
  }

  playNewVideo(video: PlaylistVideo){
    this.youtubeService.playNewVideo(video);
  }

  public navigateToPlayer(): void {
    this.youtubeService.navigateToPlayer();
  }

  public navigateToChannel(): void {
    this.youtubeService.navigateToChannel('');
  }

  getVideoProgressPercent(videoId: string): number{
    return this.watchHistoryService.getVideoProgress(videoId) * 100;
  }

  wasWatched(videoId: string): boolean{
    return this.watchHistoryService.wasWatched(videoId);
  }
}
