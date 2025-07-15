import { Component, AfterViewInit, HostListener, OnDestroy} from '@angular/core';
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
      this.videos[i] = i;//recomended blank fill
    }
  }

  ngOnInit() {
    window.scroll(0, 0);
  }

  ngAfterViewInit() {
    this.savePlayerWidth();
    this.savePlayerScroll();
  }

  ngOnDestroy(){
    this.youtubeService.minimizePlayer();
  }

  @HostListener('window:resize')
  onResize() {
    this.savePlayerWidth();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event) {
    this.savePlayerScroll();
  }

  public savePlayerWidth(): void{
    let container = document.getElementById('video_player');
    this.youtubeService.videoPlayerWidth = container.offsetWidth;
  }

  public savePlayerScroll(): void{
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    this.youtubeService.videoPlayerY = scrollY;
  }

  public toggleIsSubscribed(): void{
    this.isSubscribed = !this.isSubscribed;
  }

  public navigateToChannel(): void {
    this.youtubeService.navigateToChannel('');
  }

}
