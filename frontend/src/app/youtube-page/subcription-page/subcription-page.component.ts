import { Component, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { YoutubeService } from '../youtube.service';
import { SubscriptionData, YouTubeChannel } from '../youtube-channel-search-results.model';
import { YoutubeSubscriptionService } from '../youtube-subscription.service';

@Component({
  selector: 'app-subcription-page',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './subcription-page.component.html',
  styleUrl: './subcription-page.component.css'
})
export class SubcriptionPageComponent {

  videos:Number[] = [];
  subscriptionsSub;
  public subscriptions:SubscriptionData[] = [];

  constructor(private router: Router,
    private youtubeService: YoutubeService,
    private youtubeSubsciptionService: YoutubeSubscriptionService,
  ){
    for(let i = 0; i < 30; i++){
      this.videos[i] = i;
    }
  }

  ngOnInit(){
    window.scrollTo(0, 0);
    this.subscriptionsSub = this.youtubeSubsciptionService.channelDataList$.subscribe(channels => {
      this.subscriptions = channels;
    });
  }

  ngOnDestroy(){
    this.subscriptionsSub.unsubscribe();
  }

  public navigateToPlayer(): void {
    this.youtubeService.navigateToPlayer('');
  }

  public navigateToChannel(channelId: string): void {
    this.youtubeService.navigateToChannel(channelId);
  }

}
