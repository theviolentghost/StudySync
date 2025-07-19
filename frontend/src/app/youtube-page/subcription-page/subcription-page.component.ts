import { Component, OnInit, OnDestroy, AfterViewInit, ViewChildren, QueryList, ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { YoutubeService } from '../youtube.service';
import { SubscriptionUploads, SubscriptionData, YouTubeChannel } from '../youtube-channel-search-results.model';
import { YoutubeSubscriptionService } from '../youtube-subscription.service';
import { PlaylistVideo } from '../youtube-playlist-results.model';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-subcription-page',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './subcription-page.component.html',
  styleUrl: './subcription-page.component.css'
})
export class SubcriptionPageComponent {

  sortedUploads: PlaylistVideo[] = [];
  subscriptionsSub;
  subscriptions:SubscriptionData[];
  allChannelUploadsSub;
  allChannelUploads: SubscriptionUploads[];


  onScreenObserver: IntersectionObserver;

  constructor(private router: Router,
    private youtubeService: YoutubeService,
    private youtubeSubsciptionService: YoutubeSubscriptionService,
  ){
    this.onScreenObserver = new IntersectionObserver(this.handleIntersect.bind(this), {
      threshold: 0.1,
    });
  }

  ngOnInit(){
    window.scrollTo(0, 0);
    this.subscriptionsSub = this.youtubeSubsciptionService.channelDataList$.subscribe(channels => {
      if(!channels) return;
      this.subscriptions = this.youtubeSubsciptionService.allSubscriptions;
      for(let i = 0; i < channels.length; i++){
        if(channels[i].initialized) continue;
        this.initializeChannelUploads(channels[i]);
      }
    });

    this.allChannelUploadsSub = this.youtubeSubsciptionService.channelUploadsList$.subscribe(allChannelUploads => {
      if(!allChannelUploads) return;
      this.allChannelUploads = allChannelUploads;
      this.sortedUploads = [];

      for(let channel = 0; channel < this.allChannelUploads.length; channel++){
        for(let video = 0; video < allChannelUploads[channel].uploads.length; video++){
          this.sortedUploads.push(allChannelUploads[channel].uploads[video]);
        }
      } 
      this.sortedUploads.sort((a, b) => new Date(b.contentDetails.videoPublishedAt).getTime() - new Date(a.contentDetails.videoPublishedAt).getTime());
    });
  }

  @ViewChildren('videoItem', { read: ElementRef })
  videoElements!: QueryList<ElementRef>;
  ngAfterViewInit() {
    this.observeAll();

    this.videoElements.changes.subscribe(() => {
      this.observeAll();
    });
  }

  observeAll() {
    this.videoElements.forEach(video => {
      this.onScreenObserver.observe(video.nativeElement);
    });
  }

  handleIntersect(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      const videoElement = entry.target as HTMLElement;
      const thumbnail = videoElement.querySelector('.thumbnail') as HTMLElement;

      thumbnail.dataset['backgroundImage'] = thumbnail.style.backgroundImage;;
      const originalUrl = thumbnail.getAttribute('background-url');

      if (entry.isIntersecting) {
        thumbnail.style.backgroundImage = `url(${originalUrl})`;
        let playlistId = videoElement.getAttribute('playlist-id');

        if(this.youtubeSubsciptionService.isLastLoadedUpload(playlistId, videoElement.getAttribute('video-id'))){
          this.youtubeSubsciptionService.loadMoreUploads(videoElement.getAttribute('playlist-id'));
        }
      } else {
        thumbnail.style.backgroundImage = 'none';
      }
    });
  }

  ngOnDestroy(){
    this.subscriptionsSub.unsubscribe();
    this.onScreenObserver.disconnect();
  }

  navigateToPlayer(videoId: string): void {
    this.youtubeService.navigateToPlayer(videoId);
  }

  navigateToChannel(channelId: string): void {
    this.youtubeService.navigateToChannel(channelId);
  }

  initializeChannelUploads(channel: SubscriptionData): void{
    //this.subscriptions[this.subscriptions.indexOf(channel)].initialized = true;
    this.youtubeSubsciptionService.initializeChannelUploads(channel);
  }

  timeAgo(isoTime: string): string{
    return this.youtubeService.timeAgo(isoTime);
  }

}
