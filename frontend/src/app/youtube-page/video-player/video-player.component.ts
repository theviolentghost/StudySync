import { Component, AfterViewInit, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { YoutubeService } from '../youtube.service';

@Component({
  selector: 'app-video-player',
  imports: [RouterModule, CommonModule],
  standalone: true,
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css'
})
export class VideoPlayerComponent {
  videos:Number[] = [];
  isSubscribed = false;

  constructor(private router: Router,
    private youtubeService: YoutubeService
  ){
    for(let i = 0; i < 25; i++){
      this.videos[i] = i;
    }
  }

  ngAfterViewInit() {
    this.savePlayerWidth();
  }

  @HostListener('window:resize')
  onResize() {
    this.savePlayerWidth();
  }

  public savePlayerWidth(): void{
    let container = document.getElementById('video_player');
    this.youtubeService.videoPlayerWidth = container.offsetWidth;
  }

  public toggleIsSubscribed(): void{
    this.isSubscribed = !this.isSubscribed;
  }

  public navigateToChannel(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['channel-view'] 
        } 
    }], { skipLocationChange: true });
  }

}
