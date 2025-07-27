import { Component} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { YoutubeService } from '../youtube.service';


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
    private youtubeService: YoutubeService
  ){
    for(let i = 0; i < 25; i++){
      this.videos[i] = i;
    }
  }

  playNewVideo(videoId: string){
    this.youtubeService.playNewVideo(videoId);
  }

  public navigateToPlayer(): void {
    this.youtubeService.navigateToPlayer();
  }

  public navigateToChannel(): void {
    this.youtubeService.navigateToChannel('');
  }
}
