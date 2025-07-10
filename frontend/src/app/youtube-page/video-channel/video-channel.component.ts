import { Component, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { YoutubeService } from '../youtube.service';
import { YouTubeChannel } from '../youtube-channel-search-results.model';

@Component({
  selector: 'app-video-channel',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './video-channel.component.html',
  styleUrl: './video-channel.component.css'
})
export class VideoChannelComponent {

  videos:Number[] = [];
  isSubscribed = false;

  channelSub;
  currentChannel: YouTubeChannel;

  constructor(private router: Router,
    private youtubeService: YoutubeService
  ){
    for(let i = 0; i < 25; i++){
      this.videos[i] = i;
    }
  }

  ngOnInit() {
    this.channelSub = this.youtubeService.channel$.subscribe(channel => {
      this.currentChannel = channel;
      console.log(channel);
    });
  }

  ngOnDestroy() {
    this.channelSub.unsubscribe();
  }

  public toggleIsSubscribed(): void{
    this.isSubscribed = !this.isSubscribed;
  }

  public navigateToPlayer(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['player'] 
        } 
    }], { skipLocationChange: true });
  }
}
